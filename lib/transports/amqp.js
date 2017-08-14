
"use strict";

const _ = require('lodash');
const AmqpPublish = require('./AmqpPublish');
const amqp = require('amqplib/callback_api');
const EventEmitter = require('events');
const path = require('path');
const util = require('util');

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

module.exports = function amqpTransport(options, optDone) {
    options = _.defaultsDeep({}, options, {
        logLevel: 'INFO',
        facility: 'LOCAL0'
    });

    const log_level_filter = log_level_names.indexOf(options.logLevel);
    const publisher = new AmqpPublish(options);
    publisher.connect(optDone);
            
    return function amqpLogEventClosure(log_event) {
        if (log_level_names.indexOf(log_event.level) < log_level_filter) {
            return;
        }
        
        const proc_name = path.basename(process.title);
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

        publisher.publish(amq_msg);
    };
};
