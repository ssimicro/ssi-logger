
"use strict";

var _ = require('lodash');
var util = require('util');
var logformat = require('logformat');

module.exports = function SSiLogger(level, message) {

    if (arguments.length > 1) {
        message = util.format.apply(null, _.map(_.rest(arguments), logformat));
    }

    // perform censorship
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

    process.emit('log', {
        level: level,
        message: message
    });

    return message;
};

// Various transports...
module.exports.consoleTransport = require('./lib/transports/console');
module.exports.streamTransport = require('./lib/transports/stream');
module.exports.syslogTransport = require('./lib/transports/syslog');

// Public API
module.exports.censor = function censor(list) {
    module.exports.censorList = module.exports.censorList || [];

    if (Array.isArray(list)) {
        module.exports.censorList = _.uniq(list);
    }

    return module.exports.censorList;
};

module.exports.defaults = function defaults() {
    var curried = Array.prototype.slice.call(arguments);
    return function curriedDefaults() {
        return module.exports.apply(curried, _.union(Array.prototype.slice.call(arguments), curried));
    };
};
