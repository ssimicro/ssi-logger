"use strict";

const log = require('../');

process.on('log', log.consoleTransport(true, true));
process.on('log', log.amqpTransport({logLevel: 'DEBUG'}));

log.info("Hello world, %s", "Jack", { hello: 'world', count: 123 }, ["foo", "bar"]);

log.info("Other world, %s", "Smityh", { hello: 'woot', count: 124 }, ["bar", "bat"]);

setTimeout(function () {
    for (var i = 0; i < 100; i++) {
        log.debug({count: i});
    }
}, 2000);
