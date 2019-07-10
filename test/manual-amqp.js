"use strict";

const _ = require('lodash');
const fs = require('fs');
const log = require('../');
const path = require('path');

var options = {
    "transports": {
        "amqp": {
            "enable": true,
            "level": "INFO",
            "traceLevel": 2,
        },
        "console": {
            "enable": true,
            "timestamp": true,
            "stderr": true
        },
        "syslog": {
            "enable": true
        }
    }
};

try {
    options = _.defaultsDeep(options, JSON.parse(fs.readFileSync(path.join(__dirname, 'ssi-logger.conf')).toString()));
} catch (err) {
    console.error(err);
}

process.title = "manual_amqp";
log.open(options.transports);
log.debug(options);

process.on("log_amqp_transport_gone", (err) => {
    console.error("log amqp transport closed", err);
    process.exit(1);
});

if (_.has(log.activeTransports, "amqp")) {
    log.debug({
        localAddress: log.activeTransports.amqp.producer.localAddress,
        localPort: log.activeTransports.amqp.producer.localPort
    });
}

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

const mylog = log.defaults({ request_id: '7423927D-6F4E-43FE-846E-C474EA3488A3' }, 'foobar');

mylog.info("Hello world, %s", "Jack", { hello: 'world', count: 123, deep: obj }, 1234, ["foo", "bar"], false, new Error('daffy'), {hello: 'bye'}, ['x','y','z']);

log.info("Other world, %s", "Smityh", { hello: 'woot', count: 124 }, true, ["bar", "bat"], "slippery", 321);
log.error(new Error("daffy was here"), 987, "bob", obj);

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
