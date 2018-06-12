
"use strict";

var _ = require('lodash');
var os = require('os');
var util = require('util');
var logformat = require('logformat');
var filterObject = require('./lib/filterObject.js');

var level_names = [
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

function log(level, message) {
    // Censor objects.
    const args = _.map(arguments.length > 1 ? _.tail(arguments) : [], function (arg) {
        return filterObject(arg, module.exports.censor());
    });

    // Map level synonyms.
    switch (level) {
    case 'ERR': level = 'ERROR'; break;
    case 'WARNING': level = 'WARN'; break;
    }

    message = util.format.apply(null, _.map(args, logformat));

    // Censor any key=value pairs appearing in the formatted message.
    module.exports.censor().forEach(function (key) {
        var safeKey; // string that can be safely inserted into a regex.

        // when the key is a regexp and it contains a group, we need to offset where we find the value
        var offset = 0;

        if (key instanceof RegExp) {  // if key is already a RegExp, extract the source pattern.
            safeKey = key.source;
            offset = (key.source.match(/\(/g) || []).length;
        } else { // else it's a string, escape regex operators that may be present.
            safeKey = key.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
        }

        // create a regex that matches key=val and key="val"
        var re = new RegExp("(" + safeKey + ")" + "=([^\"][^\\s]+|\"[^\"]*\")", "g");

        //replace each character of the value with an 'X' to censor it.
        message = message.replace(re, function (match, key) {
            return key + '=[redacted]';
        });
    });

    // Note that os.hostname() appears to only return FQDN when
    // the machine has a proper DNS A record.

    process.emit('log', {
        version: '1.0.0',
        created: new Date(),
        host: os.hostname(),
        level: level,
        message: message,
        data: args
    });

    return message;
}

function censor(list) {
    module.exports.censorList = module.exports.censorList || [];

    if (Array.isArray(list)) {
        module.exports.censorList = _.uniq(list);
    }

    return module.exports.censorList;
}

function defaults() {
    var defaultMessages = Array.prototype.slice.call(arguments);
    var defaultLog = function (level, message) {
        return module.exports.apply(null, _.union(Array.prototype.slice.call(arguments), defaultMessages));
    };
    _.extend(defaultLog, module.exports);
    defaultLog.defaults = function () {
        return defaults.apply(null, _.union(defaultMessages, Array.prototype.slice.call(arguments)));
    };
    addConvenienceFunctions(defaultLog);
    return defaultLog;
}

var activeConfig = {};
const activeTransports = {};

function dispatcher(event) {
    Object.keys(activeTransports).forEach((transport) => activeTransports[transport].log(event));
}

function close() {
    process.removeListener('log', dispatcher);
    Object.keys(activeTransports).forEach((transport) => {
        activeTransports[transport].end();
        delete activeTransports[transport];
    });
}

// Install a transport if options contains a property with a name
// that matches a known transport and has `enable` set to `true`.
function open(options, user_transports) {
    close();
    activeConfig = options;
    _.merge(transports, user_transports);
    _.forEach(options, (args, transport) => {
        if (_.isObject(args) && _.get(args, 'enable', true) === true && _.has(transports, transport)) {
            activeTransports[transport] = new transports[transport](args);
        }
    });
    process.on('log', dispatcher);
}

function transformLogEvent(log_event) {
    return [
        function legacyToVersion1_0_0(log_event) {
            // Does it look like a legacy event?
            if (_.isObject(log_event) && _.has(log_event, 'level') && _.has(log_event, 'message') && !_.has(log_event, 'version')) {
                _.defaultsDeep(log_event, {
                    version: '1.0.0',
                    host: os.hostname(),
                    created: new Date(),
                    data: [],
                });
            }
            return log_event;
        },
    ].reduce((result, transform) => transform(result), log_event);
}

// Public API
module.exports = log;
module.exports.censor = censor;
module.exports.close = close;
module.exports.defaults = defaults;
module.exports.open = open;
module.exports.transformLogEvent = transformLogEvent;

module.exports.level_names = level_names;
module.exports.activeTransports = activeTransports;
module.exports.Transport = require('./lib/Transport');  // Expose for user transports.

function addConvenienceFunctions(logger) {
    // Emulate the logger.level() API of winston so we can use our logger implementation as a drop in replacement
    logger.log = function () { logger.apply(null, Array.prototype.slice.call(arguments)); };
    _.forEach(level_names, function (level) {
        logger[level.toLowerCase()] = function () { logger.apply(null, _.union([level], Array.prototype.slice.call(arguments))); };
    });
}

addConvenienceFunctions(module.exports);

const transports = {
   amqp: require('./lib/transports/amqp'),
   console: require('./lib/transports/console'),
   stream: require('./lib/transports/stream'),
   syslog: require('./lib/transports/syslog'),
};
