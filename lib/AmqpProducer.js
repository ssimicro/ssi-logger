"use strict";

const _ = require('lodash');
const amqp = require('amqplib/callback_api');
const EventEmitter = require('events');
const fs = require('fs');
const log = require('../');
const moment = require('moment');
const path = require('path');
const uuid = require('uuid');

class AmqpProducer extends EventEmitter {
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

        this.contentType = this.options.format === 'json' ? 'application/json' : 'text/plain';

        this.proc_name = path.basename(process.title);
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
            console.error('AMQP TRANSPORT connection closed event', err || '');
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
                this.drainQueue();
            });

            // Enable publisher-confirms.  We publish messages asynchronously
            // and ignore confirmations (ampqlib is careful to ignore undefined
            // or null callbacks to publish()) until we end(), at which point
            // we wait for remaining messages to be published and confirmed.
            this.conn.createConfirmChannel((err, chan) => {
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

                    this.drainQueue(callback);
                });
            });
        }));
    }

    // Flush and close connection.  Hold the connection until the queue
    // is drained and the remaining messages confirmed.  If an error
    // occurs during this time, do not attempt to correct, just proceed
    // to close the connection.
    //
    end() {
        if (this.options.level === 'DEBUG') {
            console.error("AMQP TRANSPORT ending connection");
        }
        this.isFlowing = false;

        if (this.chan && this.queue.length > 0) {
            // No error recovery while flushing the queue, move to close.
            this.drainQueue((err) => {
                if (this.options.level === 'DEBUG') {
                    console.error("AMQP TRANSPORT drained");
                }
                if (err) {
                    return this.close();
                }
                this.chan.waitForConfirms(this.close.bind(this));
            });
            return;
        }

        this.close();
    }

    // Immediately close connection.
    close() {
        if (this.options.level === 'DEBUG') {
            console.error("AMQP TRANSPORT closing");
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

    reconnect(err, reconnectError) {
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
                        console.error('AMQP TRANSPORT reconnecting after error', err || '');
                    }
                    this.reconnectTimer = setTimeout(() => {
                        this.connect((err) => {
                            if (this.options.level === 'DEBUG') {
                                console.error('AMQP TRANSPORT reconnect callback');
                            }
                            this.reconnectTimer = null;
                            if (err) {
                                err.attempts = this.reconnectCount;
                                reconnectError(err);
                            }
                        });
                    }, this.options.reconnect.retryDelay * 1000);
                }
            } else {
                if (this.reconnectTimer) {
                    clearTimeout(this.reconnectTimer);
                }
                if (this.options.level === 'DEBUG') {
                    console.error('AMQP TRANSPORT error',  err || '');
                }
                this.emit('error', err);
            }
        }
    }

    drainQueue(optDone) {
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
                new Buffer(_.isString(amq_msg.payload) ? amq_msg.payload : JSON.stringify(amq_msg.payload), 'utf8'),
                _.defaultsDeep({}, amq_msg.publishOptions, {
                    persistent: true,
                    messageId: uuid.v1(),
                    correlationId: uuid.v1(),
                    contentType: this.contentType,
                    contentEncoding: 'utf8',
                })
            );
        }
        if (this.queue.length > 0) {
            if (this.options.level === 'DEBUG') {
                console.error('AQMP TRANSPORT write buffer full, wait for drain');
            }
            this.chan.once('drain', this.drainQueue.bind(this, optDone));
        } else if (optDone) {
            optDone();
        }
    }

    publish(msg, optDone) {
        this.queue.push(msg);
        if (this.isFlowing) {
            this.drainQueue(optDone);
        }
    }
}

module.exports = AmqpProducer;
