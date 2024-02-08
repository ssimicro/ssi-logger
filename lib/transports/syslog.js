
"use strict";

const _ = require('lodash');
const nodeSyslog = new require('@ssimicro/postmodern-syslog');
const Transport = require('../Transport');
const util = require('util');

class SyslogTransport extends Transport {
    constructor(options) {
        super(options || {});

        // Accept the facility name without a LOG_ prefix.
        if (options.facility && !options.facility.startsWith('LOG_')) {
            options.facility = 'LOG_' + options.facility;
        }

        // options.facility is text as in "LOG_LOCAL5", if such a property of
        // syslog exists, use it else use a default
        this.facility = nodeSyslog[options.facility] || nodeSyslog.LOG_LOCAL0;

        nodeSyslog.open(process.title, nodeSyslog.LOG_PID | nodeSyslog.LOG_ODELAY, this.facility); // jshint ignore:line

        // Add log level aliases.
        nodeSyslog.LOG_WARN = nodeSyslog.LOG_WARNING;
        nodeSyslog.LOG_ERROR = nodeSyslog.LOG_ERR;

        // input log level mask is allowed to be nodeSyslog.LOG_LEVEL, 'LOG_LEVEL', or simply 'LEVEL'
        // convert all input to nodeSyslog.LOG_LEVEL values
        if (options.level && _.isString(options.level)) {
            if (options.level.indexOf('LOG_') === -1) { // 'LEVEL' form to 'LOG_LEVEL'
                options.level = 'LOG_' + options.level;
            }
            options.level = nodeSyslog[options.level]; // 'LOG_LEVEL' form to nodeSyslog.LOG_LEVEL
        }

        // options.level sets the upTo log level mask.
        // for legacy compatibility, mask === true is LOG_DEBUG
        // if no mask is provided, default to LOG_INFO
        this.mask = (options.level === true) ? nodeSyslog.LOG_DEBUG : options.level || nodeSyslog.LOG_INFO;

        // set an upTo mask, all log messages up to this level get logged.
        nodeSyslog.setMask(this.mask, true);
    }

    log(event) {
        nodeSyslog.log(nodeSyslog['LOG_'+event.level], event.message);
    }

    end(optDone) {
        nodeSyslog.close();
        if (optDone) {
            optDone();
        }
    }
}

module.exports = SyslogTransport;
