
// Since checking the system log and console output requires a lot of acrobatics,
// we skip that and just have the developer run this script and manually
// check the console and syslog.

"use strict";

var log = require('../');

var options = {
    syslog: {facility: "LOG_LOCAL5", level: "DEBUG"},
    console: {timestamp: true},
};

log.configureTransports(options);

log('INFO', 'This should go to the console and syslog.');

process.on('exit', function () {
    log('INFO', 'exit event listener');
});
