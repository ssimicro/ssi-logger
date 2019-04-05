# ssi-logger

Simplified logging for node.js modules.

## Features

* any code running in the `node` instance, including external modules, can append log messages.
* the external modules don't need any configuration knowledge to send messages to the log.
* there is no need to pass around a `syslog` object to every function that needs to log something.
* log messages can be directed anywhere, not just to syslog and console.
* log messages can go to 0, 1, or many destinations (/dev/null, syslog, file, rabbitmq, e-mail, XMPP, etc).
* a log destination can be turned on or off at runtime.
* logged objects are automatically formatted into key=value strings (great for sending messages to [splunk](http://www.splunk.com/)).
* certain fields can be censored to avoid accidentally logging sensitive information.
* formatted log messages are returned by SSi Logger to the caller.
* it accepts multiple arguments and printf-style formats just like `console.log`.
* defaults can be supplied that are included in every message.
* your choice of API: `log(level, message, ...)` or `log.level(message, ...)`

## Theory of Operation

The module provides a `log(level, message, ...)` function which accepts the log level (`INFO`, `NOTICE`, `DEBUG`, etc)
and a log message. The message argument(s) work just like [console.log()](https://nodejs.org/api/console.html#console_console_log_data),
supporting a variable number of arguments plus formatting.

When invoked, the logger will format the log message using [logformat](https://github.com/tcort/logformat)
(for example, a JSON object like `[ { name: 'Tom' }, { name: 'Phil' } ]` becomes `0.name=Tom 1.name=Phil`).
The log level and message are emitted as a `log` event though the `process` event emitter. The main
application will provide an event listener to forward the log message to syslog or any other destination
(RabbitMQ, log file, database, etc). Finally, the logging function returns the formatted log message
which can be displayed/returned to the user if desired.

## Installation

    npm install --save ssi-logger

## Examples

Basic Usage:

    const options = {
        logger: {
            transports: {
                syslog: {facility: "LOG_LOCAL5", level: "DEBUG"},
                console: {timestamp: true},
            }
        }
    };
    
    log.open(options.logger.transports);
    
    log.info('Ready to rock!');


Multiple message arguments:

    log('INFO', 'Hello,', 'World!');
    // emits ---> { level: 'INFO', message: 'Hello, World!' }

[Formatting](http://nodejs.org/api/util.html#util_util_format_format):

    log('INFO', 'CC Charge amount=%d username=%s', 12.85, 'thomasc');
    // emits ---> { level: 'INFO', message: 'CC Charge amount=12.85 username=thomasc' }

Non-string message arguments:

    log('INFO', 'IP Whitelist Accept', { remote_ip: remote_ip });
    // emits ---> { level: 'INFO', message: 'IP Whitelist Accept remote_ip=123.123.123.123' }

With censorship:

    const log = require('ssi-logger');

    const options = {
        logger: {
            censor: [
                'card_number',      // can contain property names
                /pass(word)?/       // and/or regular expressions
            ],
            transports: {
                syslog: {facility: "LOG_LOCAL5", level: "INFO"},
                console: {},
            }
        }
    };

    log.open(options.logger.transports);
    log.censor(options.logger.censor);

    log('INFO', { first_name: 'John', last_name: 'Doe', card_number: '1234123412341234' });
    // emits ---> { level: 'INFO', message: 'first_name=John last_name=Doe card_number=[redacted]' }


Return value:

    if (err) {
        const human_readble_error_string = log('ERROR', err);
        displayError(human_readble_error_string);
        callback(err);
    }

Logging to a file with daily log rotation:

    const FileStreamRotator = require('file-stream-rotator');
    const log = require('ssi-logger');
    const path = require('path');

    const logfile = FileStreamRotator.getStream({
        filename: path.join(__dirname, 'application-%DATE%.log'),
        frequency: 'daily',
        verbose: false,
        date_format: 'YYYY-MM-DD'
    });

    const options = {
        logger: {
            transports: {
                stream: { stream: logfile },
            }
        }
    };

    log.open(options.logger.transports);

    log('INFO', 'This message gets logged to a file');

Setting defaults that are included in every log message:

    const app = express();

    app.use(function loggingConfig(req, res, next) {
        req.log = log.defaults({
            request_id: uuid.v1(),
            client_ip: req.ip
        });
    });

    app.get('/users/:uid', function getRoot(req, res) {
        req.log('INFO', 'User Get', req.params);
        // emits ---> { level: 'INFO', message: 'User Get uid=thomasc request_id=e3aec5a8-12af-11e6-a148-3e1d05defe78 client_ip=127.0.0.1' }

        res.render('user', db.getUser(req.params.uid));
    });

    app.listen(3000);

Convience methods:

    log.info('Hello, World!');
    // emits ---> { level: 'INFO', message: 'Hello, World!' }

    log.alert('/dev/lp0 on fire!');
    // emits ---> { level: 'ALERT', message: '/dev/lp0 on fire!' }

Standard Log Levels (highest to lowest):

    EMERG, ALERT, CRIT, ERROR, WARN, NOTICE, INFO, DEBUG

## Configuration

SSi Logger will look system wide configuration files in several places, reading each and overriding previous value.  The configuration files need not exist as the application can override them (see `log.censor()` and `log.open()` below).  The load order is:

* internal defaults
* `./ssi-logger.conf.defaults` (install directory)
* `/etc/ssi-logger.conf`
* `/etc/ssi-logger.conf.local`
* `/usr/local/etc/ssi-logger.conf`
* `/usr/local/etc/ssi-logger.conf.local`

The general structure of a configuration file is an JSON object containing:

* `censor`: an array of key field names to censor.
* `transports`: a collection of `ssi-logger` transports to give `log.open()`.


## Transports

Log messages are emitted as `log` events. Event listeners should be installed to receive the events and send them over
the appropriate transport. SSi Logger provides a couple of common transports.

Here's a setup example for a project using multiple transports to log messages.  Depending on the value of `level` or `logLevel`, log messages may or may not go to syslog or AMQP.  Here `INFO` means that log messages with levels up to and including `INFO` are logged, i.e. `DEBUG` messages are not logged; likewise up to and including `ERROR`, would exclude `INFO` and `DEBUG`.

    // Logging defaults.
    const options = {
        logger: {
            transports: {
                amqp: {url: "amqp://user:password@example.com/virt_host", facility: "LOG_USER", level: "ERROR"},
                syslog: {facility: "LOG_LOCAL5", level: "INFO"},
                console: {timestamp: true},
            }
        }
    };
    
    ...
    
    // Enable different transports depending on NODE_ENV.
    _.defaultsDeep(options, {
        logger: {
            transports: {
                amqp: {enable: process.env.NODE_ENV === 'production'},
                console: {enable: process.env.NODE_ENV !== 'production'},
                syslog: {enable: process.env.NODE_ENV !== 'production'},
            }
        }
    });
    
    log.open(options.logger.transports);
    
    log.info('Ready to rock!');

This is a very powerful pattern. It allows for many different combinations of actions. For example, one could write
a transport such that a LOG_ALERT message about the database being down will trigger an e-mail to go out to the sysadmin.


## API

### log(level, format, args ...)

**Parameters**

* `level`: log level string, one of `EMERG`, `ALERT`, `CRIT`, `ERROR`, `WARN`, `NOTICE`, `INFO`, `DEBUG`.
* `format`: a log message format string.
* `args`: the `format` string will consume `args` for each % argument in the string.  Remaining arguments are appended to the log message, with objects and arrays beening flattened into key=value pairs.

#### log.emerg(format, args ...)
#### log.alert(format, args ...)
#### log.crit(format, args ...)
#### log.error(format, args ...)
#### log.warn(format, args ...)
#### log.notice(format, args ...)
#### log.info(format, args ...)
#### log.debug(format, args ...)

Convenience functions.

### log.censor()

Returns a list of fields that are presently being censored from all log messages.

Example:

    // get the list of censored fields
    console.log(log.censor());
    // prints --> [ 'card_number', /pass(word)?/ ]


### log.censor(arr)

Sets the list of fields to censor from all log messages.  Any number of fields may be censored.  This is useful when logging request objects to avoid accidentally logging a credit card number, password, or other sensitive information.

**Parameters**

* `arr`: an array which may contain any combination of strings and regular expression objects. The strings and regular expressions are used to match against the log message. To turn off censorship, call this function with an empty array `[]`.

**Example**

    // set the list
    log.censor([ 'card_number', /pass(word)?/ ]);

    log('INFO', 'first_name=John last_name=Doe card_number=1234123412341234 password=pizza');
    log('INFO', 'first_name=%s last_name=%s card_number=%s password=%s', first_name_var, last_name_var, card_number_var, password_var);
    log('INFO', { first_name: 'John', last_name: 'Doe', card_number: '1234123412341234', password: 'pizza' });

    // each one above emits the same thing -->
    // { level: 'INFO', message: 'first_name=John last_name=Doe card_number=[redacted] password=[redacted]' }


### log.close(optDone)

Close the transports like `syslog` and `amqp`.

**Parameters**

* `optDone`: optional callback once all the transports have closed.


### log.open(transportOptions[, userTransports])

**Parameters**

* `transportOptions`: contains one or more transports to configure
   - `amqp`: optional AMQP transport options, see below
   - `console`: optional console transport options, see below
   - `stream`: optional stream transport options, see below
   - `syslog`: optional SysLog transport options, see below
   - `user_transport`: optional options for a `user_transport`

* `userTransports`: an object with one or more user transport functions.  For example:
```
    const Transport = require('log').Transport;

    class TripwireTransport extends Transport {
        log(log_event) {
            options.patterns.forEach((pattern) => {
                if (pattern.test(log_event.message)){
                    console.log("Run for the hills.");
                    process.exit(1);
                }
            });
        }
    };

    log.open({
        console: {enable: process.env.NODE_ENV !== 'production'},
        syslog: {enable: process.env.NODE_ENV === 'production'},
        tripwire: {enable: process.env.NODE_ENV !== 'production'},
    }, {
        tripwire: TripwireTransport,
    });
```

### Log Event

The `log_event` passed to log event transport handlers is an object with the following fields:

`log_event`:
  - `version`: Version number following https://semver.org/ guidelines.  Currently `1.0.0`.
  - `created`: JavaScript Date when the event occurred.
  - `host`: Host name string.
  - `level`: Log level string.
  - `message`: Formatted log message.
  - `data`: An array of the censored log() arguments.


### Available Transports

Here are the available transports.

#### lib/Transport

The base class for pre-defined and user transports.

```
class Transport {
    constructor(options) {}

    // Return true to log the event; otherwise false to ignore.
    filter(event) {}

    log(event) {}

    // Close the transport.  Optional callback when done.
    end(optDone) {}
}
```

**Options**
  - `level`: optional log level where only messages of this level or higher are published (ordered high to low) `EMERG`, `ALERT`, `CRIT`, `ERROR`, `WARN`, `NOTICE`, `INFO`, `DEBUG`; default `DEBUG`.


#### lib/transports/amqp

Log large JSON messages to an AMQP server.  In the event of a connection or channel error, the error stack is saved to `$TMPDIR/$PROCESS_NAME.stack` and attempt to reconnect if so configured.  If  `$TMPDIR` is undefined, the default is `/var/tmp`.

**Parameters**

`amqp`:
  - `enable`: `true` if this transport is enabled; default `true`.
  - `url`: an AMQP url, eg. `amqp://guest:guest@localhost/`,
  - `socketOptions`: optional object of socket options; default `{}`
    * `noDelay` sets `TCP_NODELAY` (booloan).
    * `cert` client certificate (buffer).
    * `key` client key (buffer).
    * `passphrase` - passphrase for private key
    * `ca` - array of CA certificates (array of buffer).
  - `exchangeName`: optional exchange name where to publish log messages; default `logger`
  - `exchangeOptions`: options for the exchange.
    * `durable`: exchange persists across server restarts; default `true`.
    * `autoDelete`: exchange deletes itself when there are no bindings; default `false`.
  - `reconnect`: options for re-connection:
    * `retryTimeout`: how long in seconds to continue attempting re-connections before emitting an `error` event; default 0.
    * `retryDelay`: how long in seconds to wait between re-connection attempts; default 5.
  - `routeKeyPrefix`: prefix for the routing key; default "log".  The routing key format is "prefix.proc_name.facility.level".
  - `level`: optional log level where only messages of this level or higher are published (ordered high to low) `EMERG`, `ALERT`, `CRIT`, `ERROR`, `WARN`, `NOTICE`, `INFO`, `DEBUG`; default `INFO`.
  - `facility`: optional syslog facility name, one of `AUTH`, `CRON`, `DAEMON`, `KERN`, `LOCAL0`, `LOCAL1`, `LOCAL2`, `LOCAL3`, `LOCAL4`, `LOCAL5`, `LOCAL6`, `LOCAL7`, `LPR`, `MAIL`, `NEWS`, `SYSLOG`, `USER`, `UUCP`; default `LOCAL0`.  Note the facility name in the AMQP log message is informational only.
  - `format`: one of `text`, `json`; default `text`.  `text` sends text log message with all the arguments flattened out into message.  `json` formats the message only those % arguments specified, the remaining unused are pased as JSON.
  - `traceLevel`: 0 = disable, 1 = connection, 2 = verbose; default 0.

Example:

    log.open({
        amqp: {
            url: 'amqp://guest:somepassword@example.com/virtual_host',
            exchangeName: 'logger'
       }
    });


#### lib/transports/console

**Parameters**

`console`:
  - `enable`: `true` if this transport is enabled; default `true`.
  - `color`: `true` to enable color coded log messages; defaults `true`.
  - `stderr`: `true` to direct log messages to standard error, otherwise standard output; default `false`.
  - `timestamp`: `true` to prepend ISO 8601 timestamp to all console messages; default `false`.
  - `level`: optional log level where only messages of this level or higher are published (ordered high to low) `EMERG`, `ALERT`, `CRIT`, `ERROR`, `WARN`, `NOTICE`, `INFO`, `DEBUG`; default `DEBUG`.

Logs all messages to the console in the form:

    [LEVEL] message text

or when `options.timestamp` is true:

    2018-03-26T15:07:27Z [LEVEL] message text

Colors can also be disabled at runtime with the `--no-color` command line option.

    log.open({
        console: {colour: true, timestamp: true, stderr: true}
    });


#### lib/transports/stream ###

**Parameters**

`stream`:
  - `enable`: `true` if this transport is enabled; default `true`.
  - `color`: `true` to enable color coded log messages; defaults `true`.
  - `stream`: `Stream` object to write log messages, one per line.
  - `timeout`: `true` to prepend ISO 8601 timestamp to all console messages; default `true`.
  - `level`: optional log level where only messages of this level or higher are published (ordered high to low) `EMERG`, `ALERT`, `CRIT`, `ERROR`, `WARN`, `NOTICE`, `INFO`, `DEBUG`; default `DEBUG`.

Logs all messages to the console in the form:

    [LEVEL] message text

or when `options.timestamp` is true:

    2018-03-26T15:07:27Z [LEVEL] message text

Colors can also be disabled at runtime with the `--no-color` command line option.

    log.open({
        stream: {enable: true, stream: logfile}
    });


#### lib/transports/syslog ###

**Parameters**

`syslog`:
  - `enable`: `true` if this transport is enabled; default `true`.
  - `facility`: one of `LOG_AUTH`, `LOG_CRON`, `LOG_DAEMON`, `LOG_KERN`, `LOG_LOCAL0`, `LOG_LOCAL1`, `LOG_LOCAL2`, `LOG_LOCAL3`, `LOG_LOCAL4`, `LOG_LOCAL5`, `LOG_LOCAL6`, `LOG_LOCAL7`, `LOG_LPR`, `LOG_MAIL`, `LOG_NEWS`, `LOG_SYSLOG`, `LOG_USER`, `LOG_UUCP`; default `LOG_LOCAL0`.
  - `level`: one of (ordered high to low) `EMERG`, `ALERT`, `CRIT`, `ERROR`, `WARN`, `NOTICE`, `INFO`, `DEBUG`; default `INFO`.


Examples:

    // default minimum log level to INFO
    log.open({
        syslog: {facility: 'LOG_LOCAL1'}
    });

    // set minimum log level to ERROR
    log.open({
        syslog: {facility: 'LOG_LOCAL2', level: 'ERROR'}
    });

    // set minimum log level to DEBUG
    log.open({
        syslog: {facility: 'LOG_LOCAL3', level: 'DEBUG'}
    });

### log.defaults(...)

Returns a new curried `log()` function with baked in parameters that are included in all log messages.

Example:

    const mylog = log.defaults({ request_id: '7423927D-6F4E-43FE-846E-C474EA3488A3' }, 'foobar');

    mylog('INFO', 'I love golf!');

    // emits --> { level: 'INFO', message: 'I love golf! request_id=7423927D-6F4E-43FE-846E-C474EA3488A3 foobar' }


## Configuring syslog on Mac OS X

Edit `/etc/syslog.conf`:

    sudo -e /etc/syslog.conf

Add the following line to `/etc/syslog.conf`:

    local5.*                        /var/log/local5.log

Send `syslogd` the HUP signal:

    sudo killall -HUP syslogd

Test with `logger`:

    logger -p local5.info "Test"
    tail /var/log/local5.log

## Configuring rsyslog on Debain

Edit `/etc/rsyslog.conf`:

    sudo -e /etc/rsyslog.conf

Add the following line to `/etc/rsyslog.conf`:

    local5.*                        /var/log/local5.log

Restart `rsyslog`:

    sudo service rsyslog restart

Test with `logger`:

    logger -p local5.info "Test"
    tail /var/log/local5.log


## Developing a custom Transport

Implementing a custom transport involves writing an event listener that receives log events.
At present, the log events are objects that have `level` and `message` properties.

    function smsTransport(evt) {
        // evt = { level: 'EMERG', message: '/dev/lp0 on fire!' }

        switch (evt.level) { // only act on important log messages
            case 'EMERG':
            case 'ALERT':
            case 'CRIT':
                twilloClient.messages.create({
                    from: ssiSmsNumber,
                    to: tcSmsNumber,
                    body: '[' + evt.level + ']' + evt.message
                });
                break;
        }
    }

    process.on('log', smsTransport);

    if (printerOnFire) {
        log('EMERG', '/dev/lp0 on fire!');
    }

## Testing

This only needs to be done once in order to configure the `amqpTransport` tests:

    npm run preinstall
    vi test/ssi-logger.conf             # edit credentials

There is an automated test suite:

    npm test

There are several optional tests that can be run with:

    npm run testall

As well as several manual tests:

    cd test
    node manual-colors-test.js
    node manual-colors-test.js --no-color
    node manual-test.js && tail /var/log/local5.log
    node manual-amqp.js

## License

See [LICENSE.md](https://github.com/ssimicro/ssi-logger/blob/master/LICENSE.md).
