
"use strict";

const _ = require('lodash');
const chalk = require('chalk');
const Transport = require('../Transport');

const theme = {
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

class StreamTransport extends Transport {
    constructor(options) {
        super(options);

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

        this.options = options;
    }

    log(obj) {
        var message = '';

        // Modules that depend on an older version of ssi-logger will
        // pass an older log event object without the .created field.
        if (_.isNil(obj.created)) {
            obj.created = new Date();
        }

        // if timestamps are enabled, prepend a timestamp (ISO8601 format)
        message += (this.options.timestamp === true) ? '[' + obj.created.toISOString() + '] ' : '';

        // append the level tag (e.g. '[INFO]')
        message += '[' + obj.level + ']';

        // append the message text
        message += ' ' + obj.message + '\n';

        // apply colour if there is a theme for that level and colour is enabled
        if (_.has(theme, obj.level) && this.options.color === true) {
            message = chalk[theme[obj.level]](message);
        }

        if (this.options.stream !== null && this.options.stream !== undefined) {
            this.options.stream.write(message);
        }
    }
}

module.exports = StreamTransport;
