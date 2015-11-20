
"use strict";

var _ = require('lodash');
var util = require('util');
var logformat = require('logformat');

module.exports = function SSiLogger(level, message) {

    if (arguments.length > 1) {
        message = util.format.apply(null, _.map(_.rest(arguments), logformat));
    }

    process.emit('log', {
        level: level,
        message: message
    });

    return message;
};

// Various transports...
module.exports.consoleTransport = require('./lib/transports/console');
module.exports.syslogTransport = require('./lib/transports/syslog');
