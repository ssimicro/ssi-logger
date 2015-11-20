
"use strict";

var moment = require('moment');
var chalk = require('chalk');
var _ = require('lodash');

var theme = {
    EMERG: 'magenta',
    ALERT: 'magenta',
    CRIT: 'magenta',
    CRITICAL: 'magenta',
    ERR: 'red',
    ERROR: 'red',
    WARN: 'yellow',
    WARNING: 'yellow',
    NOTICE: 'yellow',
    INFO: 'green',
    DEBUG: 'blue'
};

module.exports = function consoleTransport(color, timestamp) {
    if (_.contains(process.argv, '--no-color')) {
        color = false;
    }
    color = (color !== false); // default to true
    timestamp = (timestamp === true); // default to false

    return function consoleTransportClosure(obj) {

        var message = '';

        // if timestamps are enabled, prepend a timestamp (ISO8601 format)
        message += (timestamp === true) ? '[' + moment().format() + '] ' : '';

        // append the level tag (e.g. '[INFO]')
        message += '[' + obj.level + ']';

        // append the message text
        message += ' ' + obj.message;

        // apply colour if there is a theme for that level and colour is enabled
        if (_.has(theme, obj.level) && color === true) {
            message = chalk[theme[obj.level]](message);
        }

        console.log(message);
    };
};
