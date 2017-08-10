
"use strict";

const _ = require('lodash');
const amqp = require('amqplib/callback_api');
const EventEmitter = require('events');
const SError = require('@ssi/error');
const url = require('url');

class AmqpAgent extends EventEmitter {
    constructor(options) {
        super();

        if (_.isEmpty(options.url) && process.env.NODE_ENV === 'production') {
            console.error('Config is missing production AMQP URL');
            process.exit(1);
        }

        this.options = _.defaultsDeep({}, options, {
            url: 'amqp://ssi_dev:ssi_dev@omicron.ssimicro.com/'+process.env.USER,
            socketOptions: {},
            exchangeName: 'amq.topic',  // Use RabbitMQ pre-installed topic exchange.
            exchangeOptions: {
                internal: false,
                durable: true,
                autoDelete: false
            }
        });
        this.conn = null;
        this.chan = null;        
        this.isFlowing = true;
    }

    bail(err, callback) {
        console.error(err);
        this.end();
        if (callback) {
            callback(err);
        }
    }

    connect(callback) {
        amqp.connect(this.options.url, this.options.socketOptions, (err, conn) => {
            this.conn = conn;
            if (err) {
                return this.bail(new SError(err, 'AMQP_TRANSPORT_CONNECT_FAIL', 'connection error'), callback);
            }

            const explodedUrl = url.parse(this.options.url);
            explodedUrl.auth = (explodedUrl.auth || '').split(':')[0] + ':**redacted**';
            const safeUrl = url.format(explodedUrl);

            this.conn.on('error', (err) => {
                this.bail(new SError(err, 'AMQP_TRANSPORT_EVENT_CONNECT_ERROR', 'connect error event'));
                this.emit('error', err);
            });

            this.conn.on('close', (reason) => {
                if (this.options.logLevel === 'DEBUG') {
                    console.log("AMQP TRANSPORT connection closed");
                }
                this.isFlowing = false;
                this.emit('close', err);
            });

            this.conn.on('blocked', (reason) => {
                if (this.options.logLevel === 'DEBUG') {
                    console.log("AMQP TRANSPORT blocked");
                }
                this.isFlowing = false;
            });

            this.conn.on('unblocked', () => {
                if (this.options.logLevel === 'DEBUG') {
                    console.log("AMQP TRANSPORT unblocked");
                }
                this.isFlowing = true;
                this.drainQueue();
            });

            this.conn.createChannel((err, chan) => {
                if (err) {
                    return this.bail(new SError(err, 'AMQP_TRANSPORT_CHANNEL_FAIL', 'channel failure'), callback);
                }

                chan.on('error', (err) => {
                    this.chan = null;
                    this.bail(new SError(err, 'AMQP_TRANSPORT_EVENT_CHANNEL_ERROR', 'channel error event'));
                    this.emit('error', err);
                });

                chan.on('close', (reason) => {
                    if (this.options.logLevel === 'DEBUG') {
                        console.log("AMQP TRANSPORT channel closed");
                    }
                });
                
                chan.on('drain', () => {
                    if (this.options.logLevel === 'DEBUG') {
                        console.log("AMQP TRANSPORT drain");
                    }
                    this.drainQueue();
                });
                                
                chan.assertExchange(this.options.exchangeName, 'topic', this.options.exchangeOptions, (err, ok) => {
                    if (err) {
                        return this.bail(new SError(err, 'AMQP_TRANSPORT_ASSERT_EXCHANGE_FAIL', 'exchange assertion failed'), callback);
                    }
                    
                    this.chan = chan;
                    callback(null, this);
                });
            });
        });
    }

    encodeMessage(contentType, contentEncoding, payload) {
        if (contentType === 'application/json' || contentType === 'text/json') {
            return new Buffer(JSON.stringify(payload), contentEncoding);
        } else if (payload instanceof Buffer) {
            return payload;
        } else {
            return new Buffer(payload, contentEncoding);
        }
    }

    decodeMessage(contentType, contentEncoding, payload) {
        if (contentType === 'application/json' || contentType === 'text/json') {
            return JSON.parse(payload.toString('utf8'));
        } else if (contentType === 'application/octet-stream') {
            return payload; // binary data, user is expecting a buffer
        } else {
            return payload.toString('utf8'); // some kind of text
        }
    }

    end() {
        if (this.conn) {
            const conn = this.conn;
            this.conn = null;
            if (this.chan) {
                const chan = this.chan;
                this.chan = null;
                chan.close((err) => {
                    conn.close();
                });
                return;
            }
            this.chan = null;
            conn.close();
        }
    }
}

module.exports = AmqpAgent;
