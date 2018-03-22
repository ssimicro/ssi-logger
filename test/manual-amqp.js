"use strict";

const _ = require('lodash');
const fs = require('fs');
const log = require('../');
const path = require('path');

process.on('log', log.consoleTransport(true, true));
//process.on('log', log.amqpTransport({logLevel: 'DEBUG'}));
//process.on('log', log.amqpTransport());

var options = {};
try {
    options = _.defaultsDeep(options, JSON.parse(fs.readFileSync(path.join(__dirname, 'ssi-logger.conf')).toString()));
} catch (err) {
    console.error(err);
}

process.on('log', log.amqpTransport(options.amqpTransport, (err, amqplog) => {
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
- go RabbitMQ (developers) -> Connections
- find your IP and click
- bottom of IP Connection page, click Force Close button
- check /var/tmp/node.stack
`
    );

}, 5000);
