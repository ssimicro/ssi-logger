
"use strict";

const _ = require('lodash');
const AmqpAgent = require('../lib/transports/AmqpAgent');

class AmqpConsume extends AmqpAgent {
    constructor(options) {
        super(_.defaultsDeep({}, options, {
            routingKeys: [],
            queueName: "logger",
            queueOptions: {
                exclusive: false,
                durable: true,
                autoDelete: false
            },
            consumeOptions: {
                noAck: false,
            },
        }));
    }

    connect(optDone) {
        super.connect((err) => {
            this.chan.assertQueue(this.options.queueName, this.options.queueOptions, (err, ok) => {
                if (err) {
                    return this.bail(new Error('AMQP_CONSUME_ASSERT_QUEUE_FAIL'), optDone);
                }

                if (this.options.queueName === null) {
                    // Remember randomly assigned queue name.
                    this.options.queueName = ok.queue;
                }

                // Add binding for each routing key.
                let keyi = 0;
                const applyBindings = (err) => {
                    if (err) {
                        err = new Error('AMQP_CONSUME_BINDING_FAIL');
                        err.routingKey = this.options.routingKeys[keyi];
                        return this.bail(err, optDone);
                    }
                    if (keyi < this.options.routingKeys.length) {
                        this.chan.bindQueue(ok.queue, this.options.exchangeName, this.options.routingKeys[keyi], {}, applyBindings);
                        keyi++;
                        return;
                    }
                    if (optDone) {
                        optDone(err, this);
                    }
                };

                applyBindings();
            });
        });
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

    consume(callback) {
        this.chan.consume(this.options.queueName, (msg) => {
            if (msg === null) {
                // Consumer cancelled by RabbitMQ.
                return;
            }
            msg.content = this.decodeMessage(
                msg.properties.contentType || 'application/json',
                msg.properties.contentEncoding || 'utf8', msg.content
            );
            callback(null, msg, (err) => {
                if (this.options.consumeOptions.noAck === false) {
                    // when acks are enabled, ack or nack
                    if (err) {
                        this.chan.nack(msg, false, false); // reject and discard message
                        return;
                    }
                    this.chan.ack(msg);
                }
            });
        }, this.options.consumeOptions);
    }

    purge(callback) {
        this.chan.purgeQueue(this.options.queueName, callback);
    }
}

module.exports = AmqpConsume;
