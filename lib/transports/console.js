
"use strict";

var streamTransport = require('./stream');

module.exports = function consoleTransport(color, timestamp, stderr) {
    color = (color !== false); // default to true
    stderr = (stderr === true); // default to false
    timestamp = (timestamp === true); // default to false
    return streamTransport((stderr?process.stdout:process.stderr), color, timestamp);
};
