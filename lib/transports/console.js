
"use strict";

var streamTransport = require('./stream');

module.exports = function consoleTransport(color, timestamp) {
    color = (color !== false); // default to true
    timestamp = (timestamp === true); // default to false
    return streamTransport(process.stdout, color, timestamp);
};
