
"use strict";

var _ = require('lodash');
var util = require('util');
var logformat = require('logformat');
var minimatch = require("minimatch");

module.exports = (function SSiLogger(state) {

    state = _.defaults({}, state, {
        namespace: '',
        show: (process.env.DEBUG || '*').split(/[\s,]+/).filter(function (ns) { return ns[0] !== '-'; }),
        hide: (process.env.DEBUG || '*').split(/[\s,]+/).filter(function (ns) { return ns[0] === '-'; }).map(function (ns) { return ns.substr(1); }),
        defaults: [],
        censorList: [],
        transports: {
            consoleTransport: './lib/transports/console',
            streamTransport: './lib/transports/stream',
            syslogTransport: './lib/transports/syslog',
        }
    });

    var log = function (level, message) {
        if (arguments.length === 1) {
            var newState = _.clone(state);
            newState.namespace = arguments[0];
            return new SSiLogger(newState);
        }

        if (arguments.length > 1) {
            message = util.format.apply(null, _.map(_.tail(arguments).concat(state.defaults), logformat));
        }

        // perform censorship
        log.censor().forEach(function (key) {
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

        // if messages from this namespace should be shown, emit the log message
        if ( (function shouldShow() {
            if (_.find(state.hide, function (val) { return minimatch(state.namespace === '' ? '*' : state.namespace, val); })) {
                return false;
            } else if (_.find(state.show, function (val) { return minimatch(state.namespace === '' ? '*' : state.namespace, val); })) {
                return true;
            } else {
                return false;
            }
        })() ) {
            process.emit('log', _.omitBy({
                namespace: state.namespace,
                level: level,
                message: message
            }, function (val, key) { return key === 'namespace' && !val; }));
        }

        return message;
    };

    // Emulate the logger.level() API of winston so we can use our logger implementation as a drop in replacement
    _.forEach(['EMERG', 'ALERT', 'CRIT', 'ERR', 'ERROR', 'WARNING', 'WARN', 'NOTICE', 'INFO', 'VERBOSE', 'DEBUG', 'SILLY'], function (level) {
        log[level.toLowerCase()] = function () { log.apply(null, _.union([level], Array.prototype.slice.call(arguments))); };
    });

    // expose various transports
    _.each(state.transports, function (module, name) {
        log[name] = require(module);
    });

    log.censor = function (list) {
        if (Array.isArray(list)) {
            state.censorList = _.uniq(list);
        }
        return state.censorList;
    };

    log.defaults = function (defaults) {
        var newState = _.clone(state);
        newState.defaults = _.union(state.defaults, Array.prototype.slice.call(arguments));
        return new SSiLogger(newState);
    };

    return log;
})();
