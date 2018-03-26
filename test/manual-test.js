
// Since checking the system log and console output requires a lot of acrobatics,
// we skip that and just have the developer run this script and manually
// check the console and syslog.

"use strict";

var log = require('../');

var options = {
    syslog: {enable: true, facility: "LOG_LOCAL5", mask: true},
    console: {enable: true, timestamp: true},
};

log.configureTransports(options);

log('INFO', 'This should go to the console and syslog.');

process.on('exit', function () {
    log('INFO', 'exit event listener');
});
