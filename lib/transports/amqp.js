
"use strict";

const _ = require('lodash');
const AmqpProducer = require('../AmqpProducer');
const deasync = require('deasync');
const EventEmitter = require('events');
const log = require('../../');
const path = require('path');
const semver = require('semver');
const Transport = require('../Transport');
const util = require('util');

class AmqpTransport extends Transport{
    constructor(options) {
        super(options || {});

        this.options = _.defaultsDeep(options, {
            level: 'INFO',
            facility: 'LOCAL0',
            routeKeyPrefix: 'log',
            format: 'text',
            onConnectError: (err) => {
                console.error(err);
                process.exit(1);
            },
        });

        this.proc_name = path.basename(process.title);
        this.node_env = process.env.NODE_ENV ? process.env.NODE_ENV : 'development';

        this.amqp = new AmqpProducer(options);

        // Wait for the connection to complete.
        try {
            deasync(this.amqp.connect.bind(this.amqp))();
        } catch (err) {
            options.onConnectError(err);
        }
    }

    log(log_event) {
        if (log.level_names.indexOf(log_event.level) < this.logLevelFilter) {
            return;
        }

        // Modules that depend on an older version of ssi-logger will
        // pass an older log event object missing extra fields.
        log_event = log.transformLogEvent(log_event);

        const headers = {
            "Version": "1.0.0",
            "Host": log_event.host,
            "Process": this.proc_name,
            "Level": log_event.level,
            "Facility": this.options.facility,
            "Created": log_event.created.toISOString(),
            "Node-Env": this.node_env,
        };

        // Default format is text/plain.
        const amq_msg = {
            payload: `${headers.Created} ${headers.Host} ${headers.Process}[${process.pid}]: ${log_event.message}`,
            publishOptions: {
                timestamp: Math.round(log_event.created.getTime() / 1000),  // Unix epoch seconds.
                headers: headers,
            },
            routingKey: `${this.options.routeKeyPrefix}.${this.proc_name}.${this.options.facility}.${log_event.level}`,
        };

        if (this.options.format === 'json') {
            AmqpTransport.logEventToJsonPayload(log_event, headers, amq_msg);
        }

        this.amqp.publish(amq_msg);
    }

    end(optDone) {
        this.amqp.end(optDone);
    }

    // Walk the object tree converting arrays into objects.  Splunk does
    // not support JSON arrays in the search terms, but it does support
    // JSON dot object paths so instead of log_details[0].array[3]=beep we
    // can use log_details.0.array.3=beep.
    //
    // While similar to filterObject(), we only care about converting arrays
    // to plain Objects; filterObject() will have dealt with circular
    // references and redaction so no need to repeat.
    //
    static convertArraysToObjects(obj) {
        return _.reduce(obj, (acc, value, key) => {
            if (_.isDate(value)) {
                // Don't let the Date object hit the general Object case below.
                acc[key] = value;
            } else if (_.isArray(value)) {
                acc[key] = value.reduce((acc, value, key) => {
                    acc[key] = _.isObject(value) ? AmqpTransport.convertArraysToObjects(value) : value;
                    return acc;
                }, {});
            } else if (_.isObjectLike(value)) {
                acc[key] = AmqpTransport.convertArraysToObjects(value);
            } else {
                acc[key] = value;
            }
            return acc;
        }, {});
    }

    static logEventToJsonPayload(log_event, headers, amq_msg) {
        amq_msg.payload = {
            log_message: null,
            log_details: [],
        };
        let args_used = 0;
        if (semver.valid(log_event.version) && semver.satisfies(log_event.version, '^1.0.0')) {
            if (_.isString(log_event.data[0])) {
                // Reformat log message to only apply % format arguments.
                args_used = (log_event.data[0].match(/%\w/g) || []).length + 1;
                amq_msg.payload.log_message = util.format.apply(null, log_event.data.slice(0, args_used));
            } else if (_.isObject(log_event.data[0]) && _.has(log_event.data[0], 'name') && _.has(log_event.data[0], 'message')) {
                // Error clone, move the message field to be the log_message.
                amq_msg.payload.log_message = log_event.data[0].message;
                amq_msg.payload.log_name = log_event.data[0].name;
                log_event.data.shift();
            }
        } else {
            // Older ssi-logger does not supply the log() arguments in
            // the event object, so no means to reformat the message;
            // use the supplied message.
            amq_msg.payload.log_message = log_event.message;
        }

        // Pass the remaining unused arguments, converting arrays into
        // objects so that Splunk can simply treat array indices as labels
        // in a JSON object path.
        amq_msg.payload.log_details = AmqpTransport.convertArraysToObjects(log_event.data.slice(args_used));

        // Consumers like Splunk don't save the headers with the message.
        amq_msg.payload.log_metadata = headers;
    }
}

module.exports = AmqpTransport;
