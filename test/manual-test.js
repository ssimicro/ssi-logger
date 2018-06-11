
// Since checking the system log and console output requires a lot of acrobatics,
// we skip that and just have the developer run this script and manually
// check the console and syslog.

"use strict";

var log = require('../');

var options = {
    "transports": {
        "amqp": {
            "enable": true,
//            "url": 'amqp://unknown_username:bad_password@amqp.ssimicro.com',
            "url": "amqp://ssi_dev:ssi_dev@omicron.ssimicro.com/achowe",
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

log.configureTransports(options.transports);

log.info('This should go to all the log transports.');

log.close();
