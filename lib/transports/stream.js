
"use strict";

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

module.exports = function streamTransport(options) {
    if (_.includes(process.argv, '--no-color')) {
        options.color = false;
    }
    options.color = (options.color === true); // default to false
    options.timestamp = (options.timestamp !== false); // default to true

    if (_.has(options.stream, 'on') && _.isFunction(options.stream.on)) {
        options.stream.on('finish', function () {
            // when stream has finished, set to null so we can avoid writing to a finished stream
            options.stream = null;
        });
    }

    return function streamTransportClosure(obj) {

        var message = '';

        // Modules that depend on an older version of ssi-logger will
        // pass an older log event object without the .created field.
        if (_.isNil(obj.created)) {
            obj.created = new Date();
        }

        // if timestamps are enabled, prepend a timestamp (ISO8601 format)
        message += (options.timestamp === true) ? '[' + obj.created.toISOString() + '] ' : '';

        // append the level tag (e.g. '[INFO]')
        message += '[' + obj.level + ']';

        // append the message text
        message += ' ' + obj.message + '\n';

        // apply colour if there is a theme for that level and colour is enabled
        if (_.has(theme, obj.level) && options.color === true) {
            message = chalk[theme[obj.level]](message);
        }

        if (options.stream !== null && options.stream !== undefined) {
            options.stream.write(message);
        }
    };
};
