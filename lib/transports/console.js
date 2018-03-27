
"use strict";

var _ = require('lodash');
var streamTransport = require('./stream');

module.exports = function consoleTransport(options) {
    return streamTransport({
        color: (options.color !== false),                                       // default to true
        timestamp: (options.timestamp === true),                                // default to false
        stream: (options.stderr === true ? process.stderr : process.stdout),    // default to stdout
    });
};
