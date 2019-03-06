"use strict";

const _ = require('lodash');
const logLevelNames = require('./logLevelNames');

class Transport {
    constructor(options) {
        this.logLevelIndex = logLevelNames.indexOf(options.level || 'INFO');
    }
    filter(event) {
        return this.logLevelIndex <= logLevelNames.indexOf(event.level);
    }
    log(event) {}
    end(optDone) {
        if (optDone) {
            optDone();
        }
    }
}

module.exports = Transport;
