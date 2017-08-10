
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
                    return this.bail(new SError(err, 'AMQP_CONSUME_ASSERT_QUEUE_FAIL', 'queue assertion error'), optDone);
                }

                if (this.options.queueName === null) {
                    // Remember randomly assigned queue name.
                    this.options.queueName = ok.queue;
                }

                // Add binding for each routing key.
                let keyi = 0;
                const applyBindings = (err) => {
                    if (err) {
                        err = new SError(err, 'AMQP_CONSUME_BINDING_FAIL', 'binding failure');
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

    consume(callback) {
        if (!this.chan) {
            return callback(new SError('AMQP_CONSUME_CHANNEL_ERROR', 'no channel'));
        }
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
}

module.exports = AmqpConsume;
