
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
            "traceLevel": 2,
        },
        "console": {
            "chunkSize": 42,
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

log.open(options.transports, {}, (err) => {
    if (err){
        console.error("log.open transport failed ", err);
        process.exit(1);
    }
    log.info('This should go to all the log transports.');
    log.warn('This log message should be split into several lines in the console transport (it should be one message in the other transports).');

    log.close();
});
