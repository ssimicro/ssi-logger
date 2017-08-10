
"use strict";

const _ = require('lodash');
const AmqpAgent = require('./AmqpAgent');
const moment = require('moment');
const uuid = require('uuid');

class AmqpPublish extends AmqpAgent {
    constructor(options) {
        super(options);
        this.queue = [];
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

            // Publish any early logged messages.
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

    drainQueue() {
        if (this.options.logLevel === 'DEBUG') {
            console.log("AMQP TRANSPORT", {queued: this.queue.length});
        }
        this.queue = _.reduce(this.queue, (acc, amq_msg) => {
            const options = _.defaultsDeep({}, amq_msg.publishOptions, this.publishOptions);
            const sent = this.chan.publish(
                this.options.exchangeName, amq_msg.routingKey,
                this.encodeMessage(options.contentType, options.contentEncoding, amq_msg.payload),
                options
            );
            if (!sent) {
                if (this.options.logLevel === 'DEBUG') {
                    console.log("AMQP TRANSPORT write buffer full, wait for drain");
                }
                acc.push(amq_msg);
            }
            return acc;
        }, []);
    }
}

module.exports = AmqpPublish;
