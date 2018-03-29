
"use strict";

const _ = require('lodash');
const amqp = require('amqplib/callback_api');
const log = require('../../');
const EventEmitter = require('events');
const fs = require('fs');
const moment = require('moment');
const os = require('os');
const path = require('path');
const semver = require('semver');
const util = require('util');
const uuid = require('uuid');

class Producer extends EventEmitter {
    constructor(options) {
        super();

        this.options = _.defaultsDeep({}, options, {
            socketOptions: {},
            url: 'amqp://guest:guest@localhost/',
            exchangeName: 'logger',
            exchangeOptions: {
                internal: false,
                durable: true,
                autoDelete: false
            },
            reconnect: {
                retryTimeout: 0,        // in seconds
                retryDelay: 5,          // in seconds
            },
        });

        this.conn = null;
        this.chan = null;

        this.queue = [];
        this.isFlowing = false;
        this.reconnectStopAfter = null;
        this.reconnectCount = 0;
    }

    bail(err) {
        this.end();
        try {
            // Try to save the error locally.
            const proc_name = path.basename(process.title);
            const tmpdir = process.env.TMPDIR || '/var/tmp';
            fs.appendFileSync(path.join(tmpdir, `${proc_name}.stack`), `${moment().toISOString()} ${err.stack}\n`);
        } catch (e) {
            console.error(err.stack);
        }
        this.reconnect(err, this.bail.bind(this));
    }

    closed(err) {
        // ampqlib fires connection error event then connection close event,
        // but on graceful close no error event nor err object is reported.
        if (this.options.level === 'DEBUG') {
            console.error('AMQP TRANSPORT connection closed event', {err: err});
        }
        this.end();
        if (err) {
            this.reconnect(err, this.closed.bind(this));
        }
    }

    connect(callback) {
        // Wrap connect() callback in _.once() to prevent multiple invocations...
        // https://github.com/squaremo/amqp.node/issues/354
        amqp.connect(this.options.url, this.options.socketOptions, _.once((err, conn) => {
            if (err) {
                if (this.options.level === 'DEBUG') {
                    console.error('AMQP TRANSPORT connection error', {err: err});
                }
                return callback(err);
            }
            this.conn = conn;

            this.conn.on('error', _.once((err) => this.bail.bind(this)));
            this.conn.on('close', this.closed.bind(this));

            this.conn.on('blocked', (reason) => {
                if (this.options.level === 'DEBUG') {
                    console.error("AMQP TRANSPORT blocked");
                }
                this.isFlowing = false;
            });
            this.conn.on('unblocked', () => {
                if (this.options.level === 'DEBUG') {
                    console.error("AMQP TRANSPORT unblocked");
                }
                this.isFlowing = true;
                try {
                    this.drainQueue();
                } catch (err) {
                    this.bail(err);
                }
            });

            this.conn.createChannel((err, chan) => {
                if (err) {
                    this.end();
                    return callback(err);
                }
                this.chan = chan;

                this.chan.on('error', _.once((err) => this.bail.bind(this)));

                // Intentionally no channel close event; it is for clean-up.
                // A deleted exchange or publishing error will cause a channel
                // error.  A closed connection, ie. Force Close in RabbitMQ,
                // will generate a channel close, but no error object, followed
                // by connection close event with an error/reason.

                this.chan.assertExchange(this.options.exchangeName, 'topic', this.options.exchangeOptions, (err, ok) => {
                    if (err) {
                        this.end();
                        return callback(err);
                    }

                    this.reconnectStopAfter = null;
                    this.reconnectTimer = null;
                    this.reconnectCount = 0;
                    this.isFlowing = true;

                    if (this.options.level === 'DEBUG') {
                        console.error("AMQP TRANSPORT ready");
                    }

                    // Publish any early logged messages.
                    this.drainQueue();
                    callback(null);
                });
            });
        }));
    }

    end() {
        if (this.options.level === 'DEBUG') {
            console.error("AMQP ending connection");
        }
        this.isFlowing = false;

        if (this.chan) {
            // Drain the queue before closing the connection.  Note that
            // we could have a server disconnect during this time, in
            // which case we need to reconnect to complete the draining.
            try {
                this.drainQueue();
            } catch (err) {
                return this.reconnect(err, this.reconnect.bind(this), this.end.bind(this));
            }
        }

        if (this.conn) {
            const conn = this.conn;
            this.conn = null;
            conn.removeListener('error', this.bail);
            conn.removeListener('close', this.closed);
            if (this.chan) {
                const chan = this.chan;
                this.chan = null;
                chan.removeListener('error', this.bail);
                chan.close((err) => {
                    conn.close();
                });
                return;
            }
            conn.close();
        }
    }

    reconnect(err, reconnectError, reconnectSuccess) {
        if (err) {
            if (this.reconnectStopAfter === null) {
                this.reconnectStopAfter = moment().add(this.options.reconnect.retryTimeout, 'seconds');
                if (this.options.level === 'DEBUG') {
                    console.error('AMQP TRANSPORT reconnectStopAfter %s', this.reconnectStopAfter.toISOString());
                }
            }
            if (moment().isBefore(this.reconnectStopAfter)) {
                if (!this.reconnectTimer) {
                    this.reconnectCount++;
                    if (this.options.level === 'DEBUG') {
                        console.error('AMQP TRANSPORT reconnecting after error', {err: err});
                    }
                    this.reconnectTimer = setTimeout(() => {
                        this.connect((err) => {
                            this.reconnectTimer = null;
                            if (err) {
                                err.attempts = this.reconnectCount;
                                reconnectError(err);
                            } else if (reconnectSuccess) {
                                reconnectSuccess();
                            }
                        });
                    }, this.options.reconnect.retryDelay * 1000);
                }
            } else {
                if (this.reconnectTimer) {
                    clearTimeout(this.reconnectTimer);
                }
                if (this.options.level === 'DEBUG') {
                    console.error('AMQP TRANSPORT error', {err: err});
                }
                this.emit('error', err);
            }
        }
    }

    drainQueue() {
        if (this.options.level === 'DEBUG') {
            console.error("AMQP TRANSPORT draining", {queued: this.queue.length});
        }
        let buffer_has_room = true;
        while (this.queue.length > 0 && buffer_has_room) {
            let amq_msg = this.queue.shift();
            // On buffer full, the last message passed to amqplib will have
            // been buffered by amqplib, no need to put it back in our queue.
            buffer_has_room = this.chan.publish(
                this.options.exchangeName,
                amq_msg.routingKey,
                new Buffer(JSON.stringify(amq_msg.payload), 'utf8'),
                _.defaultsDeep({}, amq_msg.publishOptions, {
                    persistent: true,
                    messageId: uuid.v1(),
                    correlationId: uuid.v1(),
                    contentType: 'text/plain',
                    contentEncoding: 'utf8',
                })
            );
        }
        if (this.queue.length > 0) {
            if (this.options.level === 'DEBUG') {
                console.error('AQMP TRANSPORT write buffer full, wait for drain');
            }
            this.chan.once('drain', this.drainQueue.bind(this));
        }
    }
}

module.exports = function amqpTransport(options, optDone) {
    if (_.isFunction(options)) {
        optDone = options;
        options = {};
    }

    _.defaultsDeep(options, {
        level: 'INFO',
        facility: 'LOCAL0',
        routeKeyPrefix: 'log',
    });

    const producer = new Producer(options);
    producer.connect((err) => {
        if (optDone) {
            // Used mostly for testing.
            return optDone(err, producer);
        }
        if (err) {
            console.err(err);
            process.exit(1);
        }
    });

    const proc_name = path.basename(process.title);
    const log_level_filter = log.level_names.indexOf(options.level);

    return function amqpLogEventClosure(log_event) {
        if (log.level_names.indexOf(log_event.level) < log_level_filter) {
            return;
        }

        // Modules that depend on an older version of ssi-logger will
        // pass an older log event object missing extra fields.
        if (_.isNil(log_event.created)) {
            log_event.created = new Date();
        }
        if (_.isNil(log_event.host)) {
            log_event.host = os.hostname();
        }
        if (_.isNil(log_event.data)) {
            log_event.data = [];
        }

        const iso_date_time = log_event.created.toISOString();

        const amq_msg = {
            payload: log_event.message,
            publishOptions: {
                timestamp: Math.round(log_event.created.getTime() / 1000),  // Unix epoch seconds.
                headers: {
                    "Host": log_event.host,
                    "Process": proc_name,
                    "Level": log_event.level,
                    "Facility": options.facility,
                    "Created": iso_date_time,
                    "Node-Env": process.env.NODE_ENV ? process.env.NODE_ENV : 'development',
                },
            },
            routingKey: `${options.routeKeyPrefix}.${proc_name}.${options.facility}.${log_event.level}`,
        };

        producer.queue.push(amq_msg);
        if (producer.isFlowing) {
            producer.drainQueue();
        }
    };
};
