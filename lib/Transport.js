"use strict";

const log = require('../');

class Transport {
    constructor(options) {
        this.logLevelFilter = log.level_names.indexOf(options.level || 'DEBUG');
    }
    log(event) {}
    end(optDone) {
        if (optDone) {
            optDone();
        }
    }
}

module.exports = Transport;
