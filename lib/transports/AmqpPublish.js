
"use strict";

const _ = require('lodash');
const AmqpAgent = require('./AmqpAgent');
const moment = require('moment');
const uuid = require('uuid');

class AmqpPublish extends AmqpAgent {
    constructor(options) {
        super(options);
        this.queue = [];
        this.isFlowing = false;
    }

    get publishOptions() {
        return {
            messageId: uuid.v1(),
            correlationId: uuid.v1(),
            timestamp: moment().unix(),
            persistent: true,
            contentType: 'application/json',
            contentEncoding: 'utf8',
        };
    }

    connect(optDone) {
        super.connect((err, agent) => {
            if (err) {
                if (optDone) {
                    optDone(err);
                }
                return;
            }

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

            this.chan.on('drain', () => {
                if (this.options.logLevel === 'DEBUG') {
                    console.log("AMQP TRANSPORT drain");
                }
                this.drainQueue();
            });

            // Publish any early logged messages.
            this.isFlowing = true;
            this.chan.emit('drain');

            if (optDone) {
                optDone(null, this);
            }
        });
    }

    publish(amq_msg) {
        this.queue.push(amq_msg);
        if (this.isFlowing && this.chan !== null) {
            this.chan.emit('drain');
        }
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

    drainQueue() {
        if (this.options.logLevel === 'DEBUG') {
            console.log("AMQP TRANSPORT", {queued: this.queue.length});
        }
        while (this.queue.length > 0) {
            let amq_msg = this.queue.shift();
            let options = _.defaultsDeep({}, amq_msg.publishOptions, this.publishOptions);
            let sent = this.chan.publish(
                this.options.exchangeName, amq_msg.routingKey,
                this.encodeMessage(options.contentType, options.contentEncoding, amq_msg.payload),
                options
            );
            if (!sent) {
                if (this.options.logLevel === 'DEBUG') {
                    console.log("AMQP TRANSPORT write buffer full, wait for drain");
                }
                break;
            }
        }
    }
}

module.exports = AmqpPublish;
