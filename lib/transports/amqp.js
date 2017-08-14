
"use strict";

const _ = require('lodash');
const amqp = require('amqplib/callback_api');
const path = require('path');
const util = require('util');
const uuid = require('uuid');

const log_level_names = [
    'SILLY',
    'DEBUG',
    'VERBOSE',
    'INFO',
    'NOTICE',
    'WARN',
    'WARNING',
    'ERROR',
    'ERR',
    'CRIT',
    'ALERT',
    'EMERG',
];

function bail(err, callback) {
    console.error(err.stack);
    if (callback) {
        callback(err);
    } else {
        process.exit(1);
    }
}

module.exports = function amqpTransport(options, optDone) {
    options = _.defaultsDeep({}, options, {
        url: 'amqp://ssi_dev:ssi_dev@omicron.ssimicro.com/'+process.env.USER,
        logLevel: 'INFO',
        facility: 'LOCAL0',
        socketOptions: {},
        exchangeName: 'logger',
        exchangeOptions: {
            internal: false,
            durable: true,
            autoDelete: false
        }
    });
    
    const publisher = {
        queue: [],
        conn: null,
        chan: null,
        isFlowing: false,

        end: () => {
            publisher.isFlowing = false;
            if (publisher.conn) {
                if (publisher.chan) {
                    publisher.chan.close((err) => {
                        publisher.conn.close();
                        publisher.conn = null;
                        publisher.chan = null;
                    });
                    return;
                }
                publisher.conn.close();
                publisher.conn = null;
                publisher.chan = null;
            }
        }
    };

    function drainQueue() {
        if (options.logLevel === 'DEBUG') {
            console.log("AMQP TRANSPORT", {queued: publisher.queue.length});
        }
        while (publisher.queue.length > 0) {
            let amq_msg = publisher.queue.shift();
            let sent = publisher.chan.publish(
                options.exchangeName,
                amq_msg.routingKey,
                new Buffer(JSON.stringify(amq_msg.payload), 'utf8'),
                    _.defaultsDeep({}, amq_msg.publishOptions, {
                        persistent: true,
                        messageId: uuid.v1(),
                        correlationId: uuid.v1(),
                        contentType: 'application/json',
                        contentEncoding: 'utf8',
                    }
                )
            );
            if (!sent) {
                if (options.logLevel === 'DEBUG') {
                    console.log("AMQP TRANSPORT write buffer full, wait for drain");
                }
                break;
            }
        }
    }

    const proc_name = path.basename(process.title);
    const log_level_filter = log_level_names.indexOf(options.logLevel);

    amqp.connect(options.url, options.socketOptions, (err, conn) => {
        if (err) {
            return bail(new Error('AMQP_TRANSPORT_CONNECT_FAIL'), optDone);
        }
        publisher.conn = conn;

        conn.on('error', (err) => {
            bail(err);
        });

        conn.on('blocked', (reason) => {
            if (options.logLevel === 'DEBUG') {
                console.log("AMQP TRANSPORT blocked");
            }
            publisher.isFlowing = false;
        });

        conn.on('unblocked', () => {
            if (options.logLevel === 'DEBUG') {
                console.log("AMQP TRANSPORT unblocked");
            }
            publisher.isFlowing = true;
            drainQueue();
        });

        conn.createChannel((err, chan) => {
            if (err) {
                return bail(new Error('AMQP_TRANSPORT_CHANNEL_FAIL'), optDone);
            }
            publisher.chan = chan;

            chan.on('error', (err) => {
                bail(new Error('AMQP_TRANSPORT_EVENT_CHANNEL_ERROR'));
            });

            chan.assertExchange(options.exchangeName, 'topic', options.exchangeOptions, (err, ok) => {
                if (err) {
                    return bail(new Error('AMQP_TRANSPORT_ASSERT_EXCHANGE_FAIL'), optDone);
                }

                chan.on('drain', () => {
                    if (options.logLevel === 'DEBUG') {
                        console.log("AMQP TRANSPORT drain");
                    }
                    drainQueue();
                });

                // Publish any early logged messages.
                publisher.isFlowing = true;
                chan.emit('drain');

                if (optDone) {
                    optDone(null, publisher);
                }
            });
        });
    });

    return function amqpLogEventClosure(log_event) {
        if (log_level_names.indexOf(log_event.level) < log_level_filter) {
            return;
        }

        const iso_date_time = log_event.created.toISOString();

        const amq_msg = {
            payload: {
                log_message: null,
                log_metadata: {
                    ver: "1.0.0",
                    host: log_event.host,
                    process: proc_name,
                    level: log_event.level,
                    facility: options.facility,
                    created: iso_date_time,
                },
            },
            publishOptions: {
                timestamp: log_event.created.getTime() /1000|0, // Unix epoch seconds.
                headers: {
                    "Host": log_event.host,
                    "Process": proc_name,
                    "Level": log_event.level,
                    "Facility": options.facility,
                    "Created": iso_date_time,
                    "Node-Env": process.env.NODE_ENV ? process.env.NODE_ENV : 'development',
                },
            },
            routingKey: `log.${proc_name}.${options.facility}.${log_event.level}`,
        };

        let args_used = 0;
        if (_.isString(log_event.data[0])) {
            // Reformat log message to only apply % format arguments.
            args_used = (log_event.data[0].match(/%\w/g) || []).length + 1;
            amq_msg.payload.log_message = util.format.apply(null, log_event.data.slice(0, args_used));
        }

        // The remaining unused arguments to pass as JSON.
        amq_msg.payload.log_data = log_event.data.slice(args_used);

        publisher.queue.push(amq_msg);
        if (publisher.isFlowing && publisher.chan !== null) {
            publisher.chan.emit('drain');
        }
    };
};
