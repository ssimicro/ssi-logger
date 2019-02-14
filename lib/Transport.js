"use strict";

class Transport {
    constructor(options) {}
    log(event) {}
    end(optDone) {
        if (optDone) {
            optDone();
        }
    }
}

module.exports = Transport;
