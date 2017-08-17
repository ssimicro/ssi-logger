"use strict";

const log = require('../');

process.on('log', log.consoleTransport(true, true));
//process.on('log', log.amqpTransport({logLevel: 'DEBUG'}));
//process.on('log', log.amqpTransport());

process.on('log', log.amqpTransport({
    "url": "amqp://ssi_dev:ssi_dev@omicron.ssimicro.com/omicron",
}, (err, amqplog) => {
    if (err) {
        process.exit(1);
    }
    console.log('connected');
}));

const obj = {
    hello: "world",
    child: {
        world: "peace",
        child: {
            bang: "war",
            child: null
        }
    }
};


log.info("Hello world, %s", "Jack", { hello: 'world', count: 123, deep: obj }, ["foo", "bar"], {hello: 'bye'}, ['x','y','z']);

log.info("Other world, %s", "Smityh", { hello: 'woot', count: 124 }, true, ["bar", "bat"], "slippery", 321);

setTimeout(function () {
    for (var i = 0; i < 100; i++) {
        log.debug({count: i});
    }

    log.info("an error type", new Error("goofy"), new SyntaxError('obtuse'));

    console.log(`
Test 'close' event handler:
- go RabbitMQ (dev) -> Connection
- find your IP and click
- bottom of IP Connection page, click Force Close button
- check /var/tmp/node.stack
`
    );

}, 5000);
