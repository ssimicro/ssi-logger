"use strict";

const _ = require('lodash');
const logLevelNames = require('./logLevelNames');
const uuid = require('uuid');

const MIN_CHUNK_SIZE = 8;

class Transport {
    constructor(options) {
        this.logLevelIndex = logLevelNames.indexOf(options.level || 'INFO');
        this.chunkSize = Math.max(MIN_CHUNK_SIZE, options.chunkSize || 8192);
    }
    filter(event) {
        return this.logLevelIndex <= logLevelNames.indexOf(event.level);
    }
    chunkify(event) {
        // ensure we have an event id (eid).
        // older logger versions may emit logs without this critical value
        event.eid = event.eid || uuid.v4().substring(0, 8);

        if (event.message.length <= this.chunkSize) {
            return [event]; // short circuit, no chunking needed
        }

        const messages = [];
        let message = '';
        const tail = `eid=${event.eid}`;

        // select all non-whitespace, preserving key="value with whitepsace" as one unit
        event.message.match(/([^\s]+="[^"]*"|[^\s]+)/g).forEach((fragment) => {

            // split into a new message if the next fragment would put us over the chunk size
            //
            // if message.length is 0 and we'd be over the chunk size, put this fragment into it's own message.
            // this effectively prioritizes keeping the fragment together over potential truncation.
            if (fragment.length + message.length + 1 + tail.length > this.chunkSize && message.length !== 0) {
                messages.push(`${message}${tail}`);
                message = '';
            }
            message += `${fragment} `;
        });

        if (message !== '') {
            messages.push(`${message}${tail}`);
        }

        // shallow clone the event for each chunk and insert the appropriate message
        return messages.map((message) => {
            const clone = _.omit(event, 'message');
            clone.message = message;
            return clone;
        });

    }
    log(event) {}
    end(optDone) {
        if (optDone) {
            optDone();
        }
    }
}

module.exports = Transport;
