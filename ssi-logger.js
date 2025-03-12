"use strict";

const _ = require('lodash');
const fs = require('fs');
const os = require('os');
const util = require('util');
const logformat = require('logformat');
const filterObject = require('./lib/filterObject.js');
const path = require('path');
const uuid = require('uuid');
const async = require('async');

// System wide configuration files in search/override order.
const conf_files = [
    './ssi-logger.conf.defaults',
    '/etc/ssi-logger.conf',
    '/etc/ssi-logger.conf.local',
    '/usr/local/etc/ssi-logger.conf',
    '/usr/local/etc/ssi-logger.conf.local',
];

function loadConf(files) {
    module.exports.options = {
        messageMaxLength: 8192,
        censor: [],
        transports: {
            amqp: {
                url: 'amqp://guest:guest@localhost/',
                enable: false,
            },
            console: {
                enable: process.env.NODE_ENV !== 'production'
            },
            syslog: {
                enable: process.env.NODE_ENV !== 'production'
            },
        },
    };
    _.forEach(files, (filepath) => {
        filepath = path.resolve(__dirname, filepath.split("/").join(path.sep));
        try {
            const conf = JSON.parse(fs.readFileSync(filepath).toString());
            _.merge(module.exports.options, conf);
        } catch (e) {
            // Ignore file not found error, but report others
            // like configuration file syntax errors.
            if (e.code === 'ENOENT') {
                return;
            }
            console.error({file: filepath, err: e});
            console.error(e.stack);
            process.exit(1);
        }
    });
}

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

    message = util.format.apply(null, _.map(args, logformat)).substring(0, module.exports.options.messageMaxLength);

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
        version: '1.1.0',
        created: new Date(),
        host: os.hostname(),
        level: level,
        message: message,
        data: args,
        eid: uuid.v4().substring(0, 8),
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

const activeTransports = {};

function dispatcher(event) {
    Object.keys(activeTransports)
        .filter((transport) => activeTransports[transport].filter(event))
        .forEach((transport) => activeTransports[transport].chunkify(event).forEach((chunk) => activeTransports[transport].log(chunk)));
}

function close(optDone) {
    process.removeListener('log', dispatcher);
    let closed = 0;
    const transports = Object.keys(activeTransports);

    // ensure optDone is called when there are no transports
    if (transports.length === 0 && typeof optDone === 'function') {
        return optDone();
    }

    transports.forEach((transport) => {
        activeTransports[transport].end(() => {
            if (transports.length <= ++closed) {
                if (optDone) {
                    optDone();
                }
            }
        });
        delete activeTransports[transport];
    });

}

// Install a transport if options contains a property with a name
// that matches a known transport and has `enable` set to `true`.
function open(options, user_transports, callback) {
    close();
    options = _.defaultsDeep(options, module.exports.options.transports);
    const mergedTransports = _.merge({}, transports, user_transports);
    _.forEach(options, (args, transport) => {
        if (_.isObject(args) && _.get(args, 'enable', true) === true && _.has(mergedTransports, transport)) {
            activeTransports[transport] = new mergedTransports[transport](args);
        }
    });
    process.on('log', dispatcher);

    async.eachSeries(Object.keys(activeTransports), (transport) => {
        activeTransports[transport].open(callback);
    }, (err) => {
        if (err) {
            options.onConnectError(err);
        }
    });
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
module.exports.loadConf = loadConf;                     // For testing.
module.exports.open = open;
module.exports.transformLogEvent = transformLogEvent;

module.exports.levelNames = require('./lib/logLevelNames');
module.exports.activeTransports = activeTransports;
module.exports.Transport = require('./lib/Transport');  // Expose for user transports.

function addConvenienceFunctions(logger) {
    // Emulate the logger.level() API of winston so we can use our logger implementation as a drop in replacement
    logger.log = function () { logger.apply(null, Array.prototype.slice.call(arguments)); };
    _.forEach(log.levelNames, function (level) {
        logger[level.toLowerCase()] = function () {
            return logger.apply(null, _.union([level], Array.prototype.slice.call(arguments)));
        };
    });
}

loadConf(conf_files);
censor(module.exports.options.censor);
addConvenienceFunctions(module.exports);

const transports = {
   amqp: require('./lib/transports/amqp'),
   console: require('./lib/transports/console'),
   stream: require('./lib/transports/stream'),
   syslog: require('./lib/transports/syslog'),
};
