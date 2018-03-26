
"use strict";

var _ = require('lodash');
var streamTransport = require('./stream');

module.exports = function consoleTransport(color, timestamp, stderr) {
    if (arguments.length === 1 && _.isObject(color)) {
        stderr = color.stderr;
        timestamp = color.timestamp;
        color = color.color;
    }
    color = (color !== false); // default to true
    stderr = (stderr === true); // default to false
    timestamp = (timestamp === true); // default to false
    return streamTransport((stderr?process.stderr:process.stdout), color, timestamp);
};
