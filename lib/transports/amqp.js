
"use strict";

const _ = require('lodash');
const amqp = require('amqplib/callback_api');
const log = require('../../');
const fs = require('fs');
const path = require('path');
const util = require('util');
const uuid = require('uuid');

module.exports = function amqpTransport(options, optDone) {
    if (_.isFunction(options)) {
        optDone = options;
        options = {};
    }

    options = _.defaultsDeep({}, options, {
        url: 'amqp://guest:guest@localhost/',
        logLevel: 'INFO',
        facility: 'LOCAL0',
        socketOptions: {},
        exchangeName: 'logger',
        exchangeOptions: {
            internal: false,
            durable: true,
            autoDelete: false
        },
        exit_ok: true,
    });

    const proc_name = path.basename(process.title);
    const log_level_filter = log.level_names.indexOf(options.logLevel);

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

    function bail(err) {
        publisher.end();
        try {
            // Save why the connection or channel was closed.
            fs.writeFileSync(path.join('/var/tmp', `${proc_name}.stack`), `${err.stack}\n`);
        } catch (e) {
            console.error(err.stack);
        }
        if (options.exit_ok) {
            process.exit(1);
        } else {
            process.emit('error', err);
        }
    }

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
                    console.log("AMQP TRANSPORT write buffer full, re-queue until drain event");
                }
                publisher.queue.unshift(amq_msg);
                break;
            }
        }
    }

    amqp.connect(options.url, options.socketOptions, (err, conn) => {
        if (err) {
            if (optDone) {
                return optDone(err);
            }
            console.error(err);
            process.exit(1);
        }
        publisher.conn = conn;

        conn.on('error', bail);

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
                if (optDone) {
                    return optDone(err);
                }
                console.error(err);
                process.exit(1);
            }
            publisher.chan = chan;

            chan.on('error', bail);

            chan.assertExchange(options.exchangeName, 'topic', options.exchangeOptions, (err, ok) => {
                if (err) {
                    if (optDone) {
                        return optDone(err);
                    }
                    console.error(err);
                    process.exit(1);
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
        if (log.level_names.indexOf(log_event.level) < log_level_filter) {
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
        let arr_count = 0;
        const keys_seen = {};
        log_event.data.slice(args_used).forEach((obj) => {
            if (_.isArray(obj)) {
                // Prefix array elements with an name, like "arr0_".
                _.keys(obj).forEach((key) => {
                    amq_msg.payload[`arr${arr_count}_${key}`] = obj[key];
                });
                arr_count++;
            } else if (_.isObject(obj)) {
                // Move object's key-value into the payload.
                _.keys(obj).forEach((key) => {
                    if (_.has(keys_seen, key)) {
                        // Add numbered suffix to key to avoid collisions.
                        amq_msg.payload[`${key}_${++keys_seen[key]}`] = obj[key];
                    } else {
                        amq_msg.payload[key] = obj[key];
                        keys_seen[key] = 0;
                    }
                });
            } else {
                // Append strings, numbers, booleans, etc to the message.
                amq_msg.payload.log_message += ' '+obj;
           }
        });

        publisher.queue.push(amq_msg);
        if (publisher.isFlowing && publisher.chan !== null) {
            publisher.chan.emit('drain');
        }
    };
};
