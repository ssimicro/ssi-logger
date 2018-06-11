
"use strict";

const _ = require('lodash');
const StreamTransport = require('./stream');

class ConsoleTransport extends StreamTransport {
    constructor(options) {
        super({
            color: (options.color !== false),                                       // default to true
            timestamp: (options.timestamp === true),                                // default to false
            stream: (options.stderr === true ? process.stderr : process.stdout),    // default to stdout
        });
    }
}

module.exports = ConsoleTransport;