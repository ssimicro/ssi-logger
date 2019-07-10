"use strict";

const _ = require('lodash');
const amqp = require('amqplib/callback_api');
const EventEmitter = require('events');
const fs = require('fs');
const log = require('../');
const logformat = require('logformat');
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
        this.tmpdir = process.env.TMPDIR || '/var/tmp';
        this.stack_file = path.join(this.tmpdir, `${this.proc_name}.stack`);
    }

    save_stack(err, message) {
        try {
            // Try to save the error locally.
            fs.appendFileSync(this.stack_file, `${moment().toISOString()} ${this.proc_name}[${process.pid}] ${message}\n${err ? logformat(err)+"\n"+err.stack+"\n": ''}`);
        } catch (e) {
            console.error(message);
            if (err) {
                console.error(err.stack);
            }
        }
    }

    bail(err) {
        this.close();
        this.save_stack(err, "AMQP LOG TRANSPORT error event");
        this.reconnect();
    }

    closed(err) {
        // ampqlib fires connection error event then connection close event,
        // but on graceful close no error event nor err object is reported.
        if (err || this.options.traceLevel > 0) {
            this.save_stack(err, "AMQP LOG TRANSPORT connection closed event");
        }
        this.reconnect();
    }

    closed_channel() {
        // If application did not initiate end()/close(), then turn off tap.
        this.isFlowing = false;

        // Channel close handshake _completed_; or when _connection_ closes
        // (on error?).  API does not pass any indication of which type, so
        // we can't manage channel clean-up (assume library does/did it).

        // A closed connection, ie. Force Close in RabbitMQ, will generate a
        // channel close, but no error object, followed by connection close
        // event with an error/reason.
        this.save_stack(null, "AMQP LOG TRANSPORT channel closed event");
    }

    connect(callback) {
        // Wrap connect() callback in _.once() to prevent multiple invocations...
        // https://github.com/squaremo/amqp.node/issues/354
        amqp.connect(this.options.url, this.options.socketOptions, _.once((err, conn) => {
            if (err) {
                this.save_stack(err, 'AMQP LOG TRANSPORT connection error');
                return callback(err);
            }
            this.conn = conn;

            this.conn.on('error', _.once((err) => this.bail.bind(this)));
            this.conn.on('close', this.closed.bind(this));

            this.conn.on('blocked', (reason) => {
                if (this.options.traceLevel > 0) {
                    this.save_stack(null, "AMQP LOG TRANSPORT blocked");
                }
                this.isFlowing = false;
            });
            this.conn.on('unblocked', () => {
                if (this.options.traceLevel > 0) {
                    this.save_stack(null, "AMQP LOG TRANSPORT unblocked");
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

                // A deleted exchange or publishing error will cause a channel
                // error.  A closed connection, ie. Force Close in RabbitMQ,
                // will generate a channel close, but no error object, followed
                // by connection close event with an error/reason.
                this.chan.on('close', this.closed_channel.bind(this));

                this.chan.assertExchange(this.options.exchangeName, 'topic', this.options.exchangeOptions, (err, ok) => {
                    if (err) {
                        this.end();
                        return callback(err);
                    }

                    // Naughty dive into amqplib to get our port number.
                    this.localPort = this.conn.connection.stream.localPort;
                    this.localAddress = this.conn.connection.stream.localAddress;

                    this.reconnectStopAfter = null;
                    this.reconnectTimer = null;
                    this.reconnectCount = 0;
                    this.isFlowing = true;

                    if (this.options.traceLevel > 0) {
                        this.save_stack(null, "AMQP LOG TRANSPORT ready port="+this.localPort);
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
    end(optDone) {
        if (this.options.traceLevel > 0) {
            this.save_stack(null, "AMQP LOG TRANSPORT ending connection");
        }

        this.isFlowing = false;

        if (this.chan && this.queue.length > 0) {
            // No error recovery while flushing the queue, move to close.
            this.drainQueue((err) => {
                if (err) {
                    this.save_stack(err, "AMQP LOG TRANSPORT drained");
                    return this.close(optDone);
                }
                this.chan.waitForConfirms(this.close.bind(this, optDone));
            });
            return;
        }
        this.close(optDone);
    }

    // Immediately close connection.
    close(optDone) {
        if (this.options.traceLevel > 0) {
            this.save_stack(null, "AMQP LOG TRANSPORT closing");
        }
        this.isFlowing = false;
        if (this.conn) {
            const conn = this.conn;
            this.conn = null;
            conn.removeAllListeners('error');
            conn.removeAllListeners('close');
            if (this.chan) {
                const chan = this.chan;
                this.chan = null;
                chan.removeAllListeners('error');
                chan.removeAllListeners('close');
                try {
                    chan.close((errIgnore) => {
                        if (this.options.traceLevel > 0) {
                            this.save_stack(errIgnore, "AMQP LOG TRANSPORT close channel");
                        }
                        conn.close((errIgnore) => {
                            if (this.options.traceLevel > 0) {
                                this.save_stack(errIgnore, "AMQP LOG TRANSPORT close connection");
                            }
                            if (optDone) {
                                optDone();
                            }
                        });
                    });
                    return;
                } catch (e) {
                    // T4294 Capture and ignore possible already closed channel.
                    // Fallthough to connection close so as not hang.
                    if (this.options.traceLevel > 0) {
                        this.save_stack(e, "AMQP LOG TRANSPORT close try/catch, already closed");
                    }
                }
            }
            conn.close((errIgnore) => {
                if (optDone) {
                    optDone();
                }
            });
            return;
        }
        if (optDone) {
            optDone();
        }
    }

    reconnect() {
        if (this.reconnectStopAfter === null) {
            this.reconnectStopAfter = moment().add(this.options.reconnect.retryTimeout, 'seconds');
            if (this.options.traceLevel > 1) {
                this.save_stack(null, 'AMQP LOG TRANSPORT reconnectStopAfter '+this.reconnectStopAfter.toISOString());
            }
        }
        if (moment().isBefore(this.reconnectStopAfter)) {
            if (!this.reconnectTimer) {
                this.reconnectCount++;
                if (this.options.traceLevel > 1) {
                    this.save_stack(null, 'AMQP LOG TRANSPORT reconnecting ...');
                }
                this.reconnectTimer = setTimeout(() => {
                    this.connect((err) => {
                        this.reconnectTimer = null;
                        if (err) {
                            err.attempts = this.reconnectCount;
                            this.save_stack(err, 'AMQP LOG TRANSPORT reconnect error');
                            // Attempt to connect again until success or timeout.
                            this.bail(err);
                        }
                    });
                }, this.options.reconnect.retryDelay * 1000);
            }
        } else {
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
            }
            let err;
            if (this.options.reconnect.retryTimeout > 0) {
                err = new Error("AMQP LOG TRANSPORT reconnect timeout");
                err.attempts = this.reconnectCount;
            } else {
                err = new Error("AMQP LOG TRANSPORT reconnect disabled");
                err.attempts = 0;
            }
            err.reconnect = this.options.reconnect;
            this.save_stack(err, "");
            process.emit("log_amqp_transport_gone", err);
        }
    }

    drainQueue(optDone) {
        if (this.options.traceLevel > 1) {
            this.save_stack(null, "AMQP LOG TRANSPORT draining, length " + this.queue.length);
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
            if (this.options.traceLevel > 0) {
                this.save_stack(null, 'AMQP LOG TRANSPORT write buffer full, wait for drain event');
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
        } else if (optDone) {
            optDone();
        }
    }
}

module.exports = AmqpProducer;
