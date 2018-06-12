
// Since checking the system log and console output requires a lot of acrobatics,
// we skip that and just have the developer run this script and manually
// check the console and syslog.

"use strict";

const _ = require('lodash');
const fs = require('fs');
const log = require('../');
const path = require('path');

var options = {
    "transports": {
        "amqp": {
            "enable": true,
            "level": "DEBUG",
        },
        "console": {
            "enable": true,
            "timestamp": true,
            "stderr": true
        },
        "syslog": {
            "enable": true,
            "level": "DEBUG",
            "facility": "LOG_LOCAL5",
        }
    }
};

try {
    _.defaultsDeep(options, JSON.parse(fs.readFileSync(path.join(__dirname, 'ssi-logger.conf')).toString()));
} catch (err) {
    console.error(err);
}

log.configureTransports(options.transports);

log.info('This should go to all the log transports.');

log.close();
