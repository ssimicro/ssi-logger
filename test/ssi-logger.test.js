
"use strict";

var _ = require('lodash');
var expect = require('expect.js');
var fs = require('fs');
var log = require('../');
var os = require('os');
var path = require('path');
var filterObject = require('../lib/filterObject.js');

const optDescribe = (process.env.TESTALL === 'YES' ? describe : describe.skip);
const optIt = (process.env.TESTALL === 'YES' ? it : it.skip);

describe('ssi-logger', function() {
    var level = 'INFO';
    var message = 'Test Message';
    var complex = {
        count: 5,
        price: 12.34,
        greeting: "Hello, World",
        shortGreeting: 'Hi'
    };
    var arr = [ { name: 'Tom' }, { name: 'Phil' } ];
    var arr_logformat = '0.name=Tom 1.name=Phil';

    var ip_message = 'IP Whitelist Reject';
    var ip_address = '8.8.8.8';
    var ip_expect = ip_message + ' ip_address=' + ip_address;

    describe('logging', function () {
    
        it('should emit log events', function (done) {

            process.on('log', function testf(obj) {
                process.removeListener('log', testf);
                expect(obj).to.have.key('version');
                expect(obj).to.have.key('created');
                expect(obj.host).to.be(os.hostname());
                expect(obj.data).to.be.an(Array);
                expect(obj.level).to.be(level);
                expect(obj.message).to.be(message);
                done();
            });

            log(level, message);
        });

        it('should emit log events with data[] containing log args', function (done) {

            process.on('log', function testf(obj) {
                process.removeListener('log', testf);
                expect(obj).to.have.key('version');
                expect(obj).to.have.key('created');
                expect(obj.host).to.be(os.hostname());
                expect(obj.level).to.be(level);
                expect(obj.message).to.be(message+' hello=world 1234');
                expect(obj.data).to.be.an(Array);
                expect(obj.data[0]).to.be(message);
                expect(obj.data[1]).to.eql({hello: "world"});
                expect(obj.data[2]).to.be(1234);
               done();
            });

            log(level, message, {hello: "world"}, 1234);
        });

        it('should treat level ERR as synonym for ERROR', function (done) {
            process.on('log', function testf(obj) {
                process.removeListener('log', testf);
                expect(obj).to.have.key('version');
                expect(obj).to.have.key('created');
                expect(obj.host).to.be(os.hostname());
                expect(obj.data).to.be.an(Array);
                expect(obj.level).to.be('ERROR');
                expect(obj.message).to.be(message);
                done();
            });

            log('ERR', message);
        });

        it('should treat level WARNING as synonym for WARN', function (done) {
            process.on('log', function testf(obj) {
                process.removeListener('log', testf);
                expect(obj).to.have.key('version');
                expect(obj).to.have.key('created');
                expect(obj.host).to.be(os.hostname());
                expect(obj.data).to.be.an(Array);
                expect(obj.level).to.be('WARN');
                expect(obj.message).to.be(message);
                done();
            });

            log('WARNING', message);
        });
    });

    describe('convience', function () {

        it('should provide log.info()', function (done) {
            process.on('log', function testf(obj) {
                process.removeListener('log', testf);
                expect(obj.level).to.be('INFO');
                expect(obj.message).to.be(message);
                done();
            });

            log.info(message);
        });

        it('should provide log.debug()', function (done) {
            process.on('log', function testf(obj) {
                process.removeListener('log', testf);
                expect(obj.level).to.be('DEBUG');
                expect(obj.message).to.be(message);
                done();
            });

            log.debug(message);
        });

        it('should provide log.warn()', function (done) {
            process.on('log', function testf(obj) {
                process.removeListener('log', testf);
                expect(obj.level).to.be('WARN');
                expect(obj.message).to.be(message);
                done();
            });

            log.warn(message);
        });

        it('should provide log.error()', function (done) {
            process.on('log', function testf(obj) {
                process.removeListener('log', testf);
                expect(obj.level).to.be('ERROR');
                expect(obj.message).to.be(message);
                done();
            });

            log.error(message);
        });

    });

    describe('defaults', function () {

        it('should emit log events with defaults', function (done) {

            var mylog = log.defaults({ request_id: '7423927D-6F4E-43FE-846E-C474EA3488A3' }, 'foobar');

            process.on('log', function testfx(obj) {
                process.removeListener('log', testfx);
                expect(obj).to.have.key('version');
                expect(obj).to.have.key('created');
                expect(obj.host).to.be(os.hostname());
                expect(obj.data).to.be.an(Array);
                expect(obj.level).to.be(level);
                expect(obj.message).to.be(message + ' request_id=7423927D-6F4E-43FE-846E-C474EA3488A3 foobar');
                done();
            });

            mylog(level, message);
        });

        it('should emit log events with defaults appended to data[]', function (done) {

            var mylog = log.defaults({ request_id: '7423927D-6F4E-43FE-846E-C474EA3488A3' }, 'foobar');

            process.on('log', function testf(obj) {
                process.removeListener('log', testf);
                expect(obj).to.have.key('version');
                expect(obj).to.have.key('created');
                expect(obj.host).to.be(os.hostname());
                expect(obj.level).to.be(level);
                expect(obj.message).to.be(message+' hello=world 1234 request_id=7423927D-6F4E-43FE-846E-C474EA3488A3 foobar');
                expect(obj.data).to.be.an(Array);
                expect(obj.data[0]).to.be(message);
                expect(obj.data[1]).to.eql({hello: "world"});
                expect(obj.data[2]).to.be(1234);
                expect(obj.data[3]).to.eql({ request_id: '7423927D-6F4E-43FE-846E-C474EA3488A3' });
                expect(obj.data[4]).to.be('foobar');
                done();
            });

            mylog(level, message, {hello: "world"}, 1234);
        });

        it('should emit log events with defaults using the .level() interface', function (done) {

            var mylog = log.defaults({ request_id: '7423927D-6F4E-43FE-846E-C474EA3488A3' }, 'foobar');

            process.on('log', function testfx(obj) {
                process.removeListener('log', testfx);
                expect(obj.level).to.be(level);
                expect(obj.message).to.be(message + ' request_id=7423927D-6F4E-43FE-846E-C474EA3488A3 foobar');
                done();
            });

            mylog[level.toLowerCase()](message);
        });

        it('should work with an object reference', function (done) {

            var meta = {};
            var mylog = log.defaults(meta);

            process.on('log', function testfx(obj) {
                process.removeListener('log', testfx);
                expect(obj.level).to.be(level);
                expect(obj.message).to.be(message + ' foo=bar');
                done();
            });

            meta.foo = 'bar';
            mylog(level, message);
        });

        it('should support multiple levels of nesting', function (done) {

            var level0 = log.defaults({ request_id: '7423927D-6F4E-43FE-846E-C474EA3488A3' });
            var level1 = level0.defaults('foobar');
            var level2 = level1.defaults({ cheese: 'cake' });

            expect(level2).to.have.property('consoleTransport');
            expect(level2.consoleTransport).to.be.a('function');

            process.on('log', function testfx(obj) {
                process.removeListener('log', testfx);
                expect(obj.level).to.be(level);
                expect(obj.message).to.be(message + ' request_id=7423927D-6F4E-43FE-846E-C474EA3488A3 foobar cheese=cake');
                done();
            });

            level2(level, message);
        });

        it('should support multiple levels of nesting appended to data[]', function (done) {

            var level0 = log.defaults({ request_id: '7423927D-6F4E-43FE-846E-C474EA3488A3' });
            var level1 = level0.defaults('foobar');
            var level2 = level1.defaults({ cheese: 'cake' });

            expect(level2).to.have.property('consoleTransport');
            expect(level2.consoleTransport).to.be.a('function');

            process.on('log', function testfx(obj) {
                process.removeListener('log', testfx);
                expect(obj.level).to.be(level);
                expect(obj.message).to.be(message+' hello=world 1234 request_id=7423927D-6F4E-43FE-846E-C474EA3488A3 foobar cheese=cake');
                expect(obj.data).to.be.an(Array);
                expect(obj.data[0]).to.be(message);
                expect(obj.data[1]).to.eql({hello: "world"});
                expect(obj.data[2]).to.be(1234);
                expect(obj.data[3]).to.eql({ request_id: '7423927D-6F4E-43FE-846E-C474EA3488A3' });
                expect(obj.data[4]).to.be('foobar');
                expect(obj.data[5]).to.eql({cheese: "cake"});
                done();
            });

            level2(level, message, {hello: "world"}, 1234);
        });

    });

    describe('formatting', function () {

        it('should concatinate multiple message arguments', function (done) {

            process.on('log', function testf(obj) {
                process.removeListener('log', testf);
                expect(obj.level).to.be(level);
                expect(obj.message).to.be(message);
                done();
            });

            log(level, 'Test', 'Message');
        });

        it('should format complex objects', function (done) {
 
            process.on('log', function testf(obj) {
                process.removeListener('log', testf);
                expect(obj.level).to.be(level);
                expect(obj.message).to.be('count=5 price=12.34 greeting="Hello, World" shortGreeting=Hi');
                done();
            });

            log(level, complex);
        });

        it('should format arrays', function (done) {
 
            process.on('log', function testf(obj) {
                process.removeListener('log', testf);
                expect(obj.level).to.be(level);
                expect(obj.message).to.be(arr_logformat);
                done();
            });

            log(level, arr);
        });

        it('should support varargs like console.log([data], [...])', function (done) {
            process.on('log', function testf(obj) {
                process.removeListener('log', testf);
                expect(obj.level).to.be(level);
                expect(obj.message).to.be(ip_expect);
                done();
            });

            log(level, ip_message, { ip_address: ip_address });
        });

        it('should support printf() style formatting of strings like console.log([data], [...])', function (done) {
            process.on('log', function testf(obj) {
                process.removeListener('log', testf);
                expect(obj.level).to.be(level);
                expect(obj.message).to.be(ip_expect);
                done();
            });

            log(level, ip_message + ' ip_address=%s', ip_address);
        });

        it('should support printf() style formatting of numbers like console.log([data], [...])', function (done) {
            process.on('log', function testf(obj) {
                process.removeListener('log', testf);
                expect(obj.level).to.be(level);
                expect(obj.message).to.be(ip_expect);
                done();
            });

            log(level, ip_message + ' ip_address=%d.%d.%d.%d', 8, 8, 8, 8);
        });

    });
        
    describe('filterObject', function () {
        it('should clone the object', function () {
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
            var clone = filterObject(obj, []);
            expect(clone).not.to.be(obj);
            expect(clone.child).not.to.be(obj.child);
            expect(clone.child.child).not.to.be(obj.child.child);
        });
        it('should clone the object removing circular references', function () {
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
            // Create a circular reference.
            obj.child.child.child = obj.child;

            var clone = filterObject(obj, []);
            expect(clone).not.to.be(obj);
            expect(clone.child).not.to.be('[circular]');
            expect(clone.child.child).not.to.be('[circular]');
            expect(clone.child.child.child).to.be('[circular]');
        });
        it('should clone the object redacting censored keys', function () {
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
            var clone = filterObject(obj, ['bang', /ello/]);
            expect(clone).not.to.be(obj);
            expect(clone.hello).to.be('[redacted]');
            expect(clone.child.child.bang).to.be('[redacted]');
        });
        it('should clone the objects replacing special types and values', function () {
            const basics = {
                "bool": true,
                "int": 123456,
                "decimal": 1234.56,
                "string": "(wave)",
                "array": [ false, 321, 543.21, "beep", [3,2,1], { "foo": "fighters" } ],
            };

            const error = new Error('You goofed!');
            error.extra = "cream pie";
            error.inner = new SyntaxError("I am blind.");
            error.inner.inner = new Error("Where's the kaboom?");
            error.inner.inner.inner = null;

            const specials = {
                "null": null,
                "undefined": undefined,
                "Error": error,
                "Function": function noop() { },
                "Date": new Date('Thu, 10 Aug 2017 13:56:19 -0400'),
                "RegExp": /^[Hh]ello .orld$/i,
                "Infinity": Infinity,
                "NegInfinity": -Infinity,
                "NaN": NaN,
            };

            var clone;

            clone = filterObject(basics, []);
            expect(clone).not.to.be(basics);
            expect(clone).to.eql(basics);

            clone = filterObject(specials, []);
            expect(clone.null).to.be(null);
            expect(clone.undefined).to.be("[undefined]");
            expect(clone.Function).to.be("[function noop]");
            expect(clone.Date).to.be.a(Date);
            expect(clone.RegExp).to.be("/^[Hh]ello .orld$/i");
            expect(clone.Infinity).to.be("[Infinity]");
            expect(clone.NegInfinity).to.be("[-Infinity]");
            expect(clone.NaN).to.be("[NaN]");

            expect(clone.Error).to.eql({
                "name":"Error",
                "message":"You goofed!",
                "extra":"cream pie",
                "inner":{
                    "name":"SyntaxError",
                    "message":"I am blind.",
                    "inner":{
                        "name":"Error",
                        "message":"Where's the kaboom?",
                        "inner":null
                    }
                }
            });
        });
    });

    describe('censorship', function () {

        it('should support censoring sensitive fields in an object', function (done) {
            process.on('log', function testf(obj) {
                process.removeListener('log', testf);
                expect(obj.level).to.be(level);
                expect(obj.message).to.be('cc=[redacted] name=[redacted] rank=7');
                log.censor([]);
                done();
            });

            log.censor([ 'cc', 'name' ]);

            log(level, {
                cc: '1234123412341234',
                name: 'apple sauce',
                rank: 7
            });
        });

        it('should support censoring strings with whitespace', function (done) {
            process.on('log', function testf(obj) {
                process.removeListener('log', testf);
                expect(obj.level).to.be(level);
                expect(obj.message).to.be('Authorization=[redacted] Authorization=[redacted] Authorization=[redacted] headers.Authorization=[redacted]');
                log.censor([]);
                done();
            });

            log.censor([ 'Authorization' ]);

            log(level, 'Authorization="passcode 123456" Authorization="%s"', 'passcode 123456', {
                Authorization: 'passcode 123456'
            }, { headers: { Authorization: 'passcode 123456' } });
        });

        it('should support censoring sensitive fields in a formatted string', function (done) {
            process.on('log', function testf(obj) {
                process.removeListener('log', testf);
                expect(obj.level).to.be(level);
                expect(obj.message).to.be('cc=[redacted] name=[redacted] rank=7');
                log.censor([]);
                done();
            });

            log.censor([ 'cc', 'name' ]);

            log(level, 'cc=%s name="%s" rank=%d', '1234123412341234', 'apple sauce', 7);
        });

        it('should support censoring sensitive fields in a plain string', function (done) {
            process.on('log', function testf(obj) {
                process.removeListener('log', testf);
                expect(obj.level).to.be(level);
                expect(obj.message).to.be('cc=[redacted] name=[redacted] rank=7');
                log.censor([]);
                done();
            });

            log.censor([ 'cc', 'name' ]);

            log(level, 'cc=1234123412341234 name="apple sauce" rank=7');
        });

        it('should support censoring sensitive fields with regular expressions for field names', function (done) {
            process.on('log', function testf(obj) {
                process.removeListener('log', testf);
                expect(obj.level).to.be(level);
                expect(obj.message).to.be('cc=[redacted] name=[redacted] rank=7');
                log.censor([]);
                done();
            });

            log.censor([ /c{2}/, /n..e/ ]);

            log(level, 'cc=1234123412341234 name="apple sauce" rank=7');
        });

        it('should support censoring sensitive fields based on key names (e.g. "ip") and deep key names (e.g. "client.agent").', function (done) {
            process.on('log', function testf(obj) {
                process.removeListener('log', testf);
                expect(obj.level).to.be(level);
                expect(obj.message).to.be('date=[redacted] client.agent=[redacted] client.ip=[redacted] server.ip=[redacted]');
                log.censor([]);
                done();
            });

            log.censor([ "ip", /date/, "client.agent" ]);

            log(level, {"date":"2015-11-19","client":{"agent":"firefox","ip":"10.1.32.1"},"server":{"ip":"192.168.2.222"}});
        });

        it('should work with the example from the README', function (done) {

            var count = 3;

            process.on('log', function testf(obj) {
                expect(obj.level).to.be(level);
                expect(obj.message).to.be('first_name=John last_name=Doe card_number=[redacted] password=[redacted]');
                if (--count === 0) {
                    process.removeListener('log', testf);
                    log.censor([]);
                    done();
                }
            });

            log.censor([ 'card_number', /pass(word)?/ ]);

            var first_name_var = 'John';
            var last_name_var = 'Doe';
            var card_number_var = '1234123412341234';
            var password_var = 'pizza';

            log('INFO', 'first_name=John last_name=Doe card_number=1234123412341234 password=pizza');
            log('INFO', 'first_name=%s last_name=%s card_number=%s password=%s', first_name_var, last_name_var, card_number_var, password_var);
            log('INFO', { first_name: 'John', last_name: 'Doe', card_number: '1234123412341234', password: 'pizza' });

        });
    });

    describe('amqpTransport', function () {
        let options = {
            amqpTransport: {
                exit_ok: false,
            }
        };
        try {
            options = _.defaultsDeep(options, JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ssi-logger.conf')).toString()));
        } catch (err) {
            console.error(err);
        }

        describe('setup', function () {
            it('should return a handler', function (done) {
                expect(log.amqpTransport(options.amqpTransport, (err, publisher) => publisher.end())).to.be.a('function');
                done();
            });
            it('should return a handler when no options argument', function (done) {
                expect(log.amqpTransport((err, publisher) => publisher.end())).to.be.a('function');
                done();
            });
        });
        describe('queue', function () {
            it('should queue log message', function (done) {
                let pub;

                const handler = log.amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.info("Say something clever.");
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    expect(pub).not.to.be(null);
                    expect(pub.queue.length).to.be(1);

                    const payload = pub.queue[0].payload;
                    expect(payload.log_metadata.level).to.be('INFO');
                    expect(payload.log_metadata.facility).to.be('LOCAL0');
                    expect(payload.log_message).to.be("Say something clever.");
                    done();
                });
            });
            it('should filter log messages below INFO', function (done) {
                let pub;

                const handler = log.amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.debug("Say something clever.");
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    expect(pub).not.to.be(null);
                    expect(pub.queue.length).to.be(0);
                    done();
                });
            });
            it('should filter log messages below ERROR', function (done) {
                let pub;

                const handler = log.amqpTransport(_.defaultsDeep({logLevel: 'ERROR'}, options.amqpTransport), (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.warning("Say something clever.");
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    expect(pub).not.to.be(null);
                    expect(pub.queue.length).to.be(0);
                    done();
                });
            });
            it('should not filter log message ERROR or above', function (done) {
                let pub;

                const handler = log.amqpTransport(_.defaultsDeep({logLevel: 'ERROR', facility: 'DAEMON'}, options.amqpTransport), (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.error("Say something clever.");
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    expect(pub).not.to.be(null);
                    expect(pub.queue.length).to.be(1);

                    const payload = pub.queue[0].payload;
                    expect(payload.log_metadata.level).to.be('ERROR');
                    expect(payload.log_metadata.facility).to.be('DAEMON');
                    expect(payload.log_message).to.be("Say something clever.");
                    done();
                });
            });

            it('should not filter log message ERR (ERROR) or above', function (done) {
                let pub;

                const handler = log.amqpTransport(_.defaultsDeep({logLevel: 'ERROR', facility: 'DAEMON'}, options.amqpTransport), (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.err("Say something clever.");
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    expect(pub).not.to.be(null);
                    expect(pub.queue.length).to.be(1);

                    const payload = pub.queue[0].payload;
                    expect(payload.log_metadata.level).to.be('ERROR');
                    expect(payload.log_metadata.facility).to.be('DAEMON');
                    expect(payload.log_message).to.be("Say something clever.");
                    done();
                });
            });

            it('should not filter log message WARNING (WARN) or above', function (done) {
                let pub;

                const handler = log.amqpTransport(_.defaultsDeep({logLevel: 'WARN', facility: 'DAEMON'}, options.amqpTransport), (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.warning("Say something clever.");
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    expect(pub).not.to.be(null);
                    expect(pub.queue.length).to.be(1);

                    const payload = pub.queue[0].payload;
                    expect(payload.log_metadata.level).to.be('WARN');
                    expect(payload.log_metadata.facility).to.be('DAEMON');
                    expect(payload.log_message).to.be("Say something clever.");
                    done();
                });
            });
        });
        describe('payload preparation', function () {
            it('should have null message', function (done) {
                let pub;

                const handler = log.amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.info();
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.log_metadata.level).to.be('INFO');
                    expect(payload.log_metadata.facility).to.be('LOCAL0');
                    expect(payload.log_message).to.be(null);
                    expect(payload).to.only.have.keys('log_message', 'log_metadata');
                    done();
                });
            });
            it('should have simple message', function (done) {
                let pub;

                const handler = log.amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.info("Say something clever.");
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.log_message).to.be("Say something clever.");
                    expect(payload).to.only.have.keys('log_message', 'log_metadata');
                    done();
                });
            });
            it('should have null message and some data', function (done) {
                let pub;

                const handler = log.amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.info({"hello": "world"}, ["foo", "bar"]);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.log_message).to.be(null);
                    expect(payload).to.only.have.keys('log_message', 'log_metadata', 'hello', 'arr0_0', 'arr0_1');
                    expect(payload.hello).to.be("world");
                    expect(payload.arr0_0).to.be('foo');
                    expect(payload.arr0_1).to.be('bar');
                    done();
                });
            });
            it('should have simple message and some data', function (done) {
                let pub;

                const handler = log.amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.info("Say something clever.", {"hello": "world"}, ["foo", "bar"]);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.log_message).to.be("Say something clever.");
                    expect(payload).to.only.have.keys('log_message', 'log_metadata', 'hello', 'arr0_0', 'arr0_1');
                    expect(payload.hello).to.be("world");
                    expect(payload.arr0_0).to.be('foo');
                    expect(payload.arr0_1).to.be('bar');
                    done();
                });
            });
            it('should format printf-style message, remainder as data', function (done) {
                let pub;

                const handler = log.amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.info("Say something clever, %s N=%d.", "Jack", 123, {"hello": "world"}, ["foo", "bar"]);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.log_message).to.be("Say something clever, Jack N=123.");
                    expect(payload).to.only.have.keys('log_message', 'log_metadata', 'hello', 'arr0_0', 'arr0_1');
                    expect(payload.hello).to.be("world");
                    expect(payload.arr0_0).to.be('foo');
                    expect(payload.arr0_1).to.be('bar');
                    done();
                });
            });
            it('should append non-objects to message', function (done) {
                let pub;

                const handler = log.amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.info("Append", "Jack", 123, 543.21, true, new Error('goofed'), {"hello": "world"}, ["foo", "bar"]);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.log_message).to.be("Append Jack 123 543.21 true");
                    expect(payload.hello).to.be("world");
                    expect(payload.arr0_0).to.be('foo');
                    expect(payload.arr0_1).to.be('bar');
                    expect(payload).to.have.key('name');
                    expect(payload.name).to.be('Error');
                    expect(payload).to.have.key('message');
                    expect(payload.message).to.be('goofed');
                    done();
                });
            });
            it('should format message, remainder as data with added defaults', function (done) {
                let pub;

                const mylog = log.defaults({ request_id: '7423927D-6F4E-43FE-846E-C474EA3488A3' }, 'foobar');

                const handler = log.amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    mylog.info("Say something clever, %s N=%d.", "Jack", 123, {"hello": "world"}, ["foo", "bar"]);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.log_message).to.be("Say something clever, Jack N=123. foobar");
                    expect(payload).to.only.have.keys('log_message', 'log_metadata', 'hello', 'arr0_0', 'arr0_1', 'request_id');
                    expect(payload.hello).to.be("world");
                    expect(payload.arr0_0).to.be('foo');
                    expect(payload.arr0_1).to.be('bar');
                    expect(payload.request_id).to.be('7423927D-6F4E-43FE-846E-C474EA3488A3');
                    done();
                });
            });
            it('should handle data with cicular reference', function (done) {
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
                // Create a circular reference.
                obj.child.child.child = obj.child;

                let pub;

                const handler = log.amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.info("Object with circular reference.", obj);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.log_message).to.be("Object with circular reference.");
                    expect(payload).to.have.key('hello');
                    expect(payload.hello).to.be("world");
                    expect(payload).to.have.key('child');
                    expect(payload.child.child.child).to.be("[circular]");
                    done();
                });
            });
            it('should handle data with redacted content', function (done) {
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

                let pub;

                const handler = log.amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.censor(['bang', /ello/]);
                    log.info("Object with circular reference.", obj);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.log_message).to.be("Object with circular reference.");
                    expect(payload).to.have.key('hello');
                    expect(payload.hello).to.be("[redacted]");
                    expect(payload).to.have.key('child');
                    expect(payload.child.child.bang).to.be("[redacted]");

                    log.censor([]);
                    done();
                });
            });
            it('should handle data with special types and values', function (done) {
                const basics = {
                    "bool": true,
                    "int": 123456,
                    "decimal": 1234.56,
                    "string": "(wave)",
                    "array": [ false, 321, 543.21, "beep", [3,2,1], { "foo": "fighters" } ],
                };

                const error = new Error('You goofed!');
                error.extra = "cream pie";
                error.inner = new SyntaxError("I am blind.");
                error.inner.inner = new Error("Where's the kaboom?");
                error.inner.inner.inner = null;

                const specials = {
                    "null": null,
                    "undefined": undefined,
                    "Error": error,
                    "Function": function noop() { },
                    "Date": new Date('Thu, 10 Aug 2017 13:56:19 -0400'),
                    "RegExp": /^[Hh]ello .orld$/i,
                    "Infinity": Infinity,
                    "NegInfinity": -Infinity,
                    "NaN": NaN,
                };

                let pub;

                const handler = log.amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.info("Special types and values.", basics, specials);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.log_metadata.level).to.be('INFO');
                    expect(payload.log_metadata.facility).to.be('LOCAL0');
                    expect(payload.log_message).to.be("Special types and values.");
                    expect(payload).to.have.key('bool');
                    expect(payload).to.have.key('int');
                    expect(payload).to.have.key('decimal');
                    expect(payload).to.have.key('string');
                    expect(payload).to.have.key('array');
                    expect(payload.array).to.eql(basics.array);

                    expect(payload.null).to.be(null);
                    expect(payload.undefined).to.be("[undefined]");
                    expect(payload.Function).to.be("[function noop]");
                    expect(payload.Date.toISOString()).to.be("2017-08-10T17:56:19.000Z");
                    expect(payload.RegExp).to.be("/^[Hh]ello .orld$/i");
                    expect(payload.Infinity).to.be("[Infinity]");
                    expect(payload.NegInfinity).to.be("[-Infinity]");
                    expect(payload.NaN).to.be("[NaN]");

                    expect(payload.Error).to.eql({
                        "name":"Error",
                        "message":"You goofed!",
                        "extra":"cream pie",
                        "inner":{
                            "name":"SyntaxError",
                            "message":"I am blind.",
                            "inner":{
                                "name":"Error",
                                "message":"Where's the kaboom?",
                                "inner":null
                            }
                        }
                    });

                    done();
                });
            });
        });
        optDescribe("AMQP circuit", function () {
            this.timeout(5000);

            const AmqpConsume = require('./AmqpConsume');

            let consumer;

            beforeEach(function (done) {
                consumer = new AmqpConsume(_.defaultsDeep({
                    routingKeys: [ "log.#" ],
                    queueName: '',
                    queueOptions: {
                        exclusive: true,
                        durable: false,
                        autoDelete: true
                    }
                }, options.amqpTransport));
                consumer.connect((err) => {
                    consumer.purge(done);
                });
            });

            afterEach(function (done) {
                consumer.end();
                consumer = null;
                done();
            });

            it('should publish single log message to AMQP', function (done) {
                let pub;

                const handler = log.amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    pub = publisher;
                    log.alert("Circuit Test", {"hello": "world"}, ["foo", "bar"]);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    consumer.consume(function (err, msg, next) {
                        // Ack message regardless of possible error.
                        next(null);

                        expect(err).to.be(null);

                        if (process.env.LOG_LEVEL === 'DEBUG') {
                            console.log(msg);
                        }

                        // What goes around...
                        const payload = msg.content;
                        expect(payload.log_metadata.level).to.be('ALERT');
                        expect(payload.log_metadata.facility).to.be('LOCAL0');
                        expect(payload.log_message).to.be("Circuit Test");
                        expect(payload).to.only.have.keys('log_message', 'log_metadata', 'hello', 'arr0_0', 'arr0_1');
                        expect(payload.hello).to.be("world");
                        expect(payload.arr0_0).to.be('foo');
                        expect(payload.arr0_1).to.be('bar');

                        pub.end();
                        done();
                    });
                });
            });
            it('should publish 3 log messages to AMQP', function (done) {
                let pub;

                const handler = log.amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    pub = publisher;
                    log.notice("Circuit Test 1", {count: 1});
                    log.notice("Circuit Test 2", {count: 2});
                    log.notice("Circuit Test 3", {count: 3});
                });

                process.on('log', function testf(log_event) {
                    handler(log_event);

                    consumer.consume(function (err, msg, next) {
                        // Ack message regardless of possible error.
                        next(null);

                        expect(err).to.be(null);

                        if (process.env.LOG_LEVEL === 'DEBUG') {
                            console.log(msg);
                        }

                        // What goes around...
                        const payload = msg.content;
                        expect(payload.log_metadata.level).to.be('NOTICE');
                        expect(payload.log_metadata.facility).to.be('LOCAL0');
                        expect(payload.log_message).to.be("Circuit Test "+msg.fields.deliveryTag);
                        expect(payload).to.have.key('count');
                        expect(payload.count).to.be(msg.fields.deliveryTag);

                        if (msg.fields.deliveryTag === 3) {
                            process.removeListener('log', testf);
                            pub.end();
                            done();
                        }
                    });
                });
            });
            it('should simulate blocked event, queue log messages until unblocked event', function (done) {
                let pub;

                const handler = log.amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    pub = publisher;

                    pub.conn.on('blocked', function testBlocked() {
                        pub.conn.removeListener('blocked', testBlocked);
                        if (process.env.LOG_LEVEL === 'DEBUG') {
                            console.log('blocked');
                        }
                        expect(pub.queue.length).to.be(0);

                        // 3. Queue next 2 messages.
                        log.notice("Circuit Test 2", {count: 2});
                        log.notice("Circuit Test 3", {count: 3});
                    });

                    pub.conn.on('unblocked', function testUnblocked() {
                        pub.conn.removeListener('unblocked', testUnblocked);
                        if (process.env.LOG_LEVEL === 'DEBUG') {
                            console.log('unblocked');
                        }
                        expect(pub.queue.length).to.be(0);
                   });

                    // 1. First message is published.
                    log.notice("Circuit Test 1", {count: 1});
                });

                let log_count = 0;
                process.on('log', function testf(log_event) {
                    handler(log_event);

                    if (++log_count === 3) {
                        // 4. Unblock and drain queue.
                        expect(pub.queue.length).to.be(2);
                        pub.conn.emit('unblocked');
                    }

                    consumer.consume(function (err, msg, next) {
                        // Ack message regardless of possible error.
                        next(null);

                        expect(err).to.be(null);

                        if (process.env.LOG_LEVEL === 'DEBUG') {
                            console.log(msg);
                        }

                        // What goes around...
                        const payload = msg.content;
                        expect(payload.log_metadata.level).to.be('NOTICE');
                        expect(payload.log_metadata.facility).to.be('LOCAL0');
                        expect(payload).to.have.key('count');
                        expect(payload.count).to.be(msg.fields.deliveryTag);

                        switch (msg.fields.deliveryTag) {
                        case 1:
                            // 2. Block and queue next 2 messages.
                            pub.conn.emit('blocked');
                            break;
                        case 3:
                            // 5. Success
                            process.removeListener('log', testf);
                            pub.end();
                            done();
                        }
                    });
                });
            });
            it('should simulate full write buffer, queue log messages, send drain event', function (done) {
                let pub;

                const handler = log.amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    pub = publisher;

                    pub.chan.on('drain', function testDrain() {
                        pub.chan.removeListener('drain', testDrain);
                        if (process.env.LOG_LEVEL === 'DEBUG') {
                            console.log('drain');
                        }
                        expect(pub.queue.length).to.be(0);
                   });

                    // 1. Simulate full write buffer, force queuing.
                    pub.isFlowing = false;

                    // 2. Queue some messages.
                    log.notice("Circuit Test 1", {count: 1});
                    log.notice("Circuit Test 2", {count: 2});
                    log.notice("Circuit Test 3", {count: 3});
                });

                let log_count = 0;
                process.on('log', function testf(log_event) {
                    handler(log_event);

                    if (++log_count === 3) {
                        // 3. Drain the message queue.
                        expect(pub.queue.length).to.be(3);
                        pub.chan.emit('drain');
                    }

                    consumer.consume(function (err, msg, next) {
                        // Ack message regardless of possible error.
                        next(null);

                        expect(err).to.be(null);

                        if (process.env.LOG_LEVEL === 'DEBUG') {
                            console.log(msg);
                        }

                        // What goes around...
                        const payload = msg.content;
                        expect(payload.log_metadata.level).to.be('NOTICE');
                        expect(payload.log_metadata.facility).to.be('LOCAL0');
                        expect(payload.log_message).to.be("Circuit Test "+msg.fields.deliveryTag);
                        expect(payload).to.have.key('count');
                        expect(payload.count).to.be(msg.fields.deliveryTag);

                        switch (msg.fields.deliveryTag) {
                        case 3:
                            // 4. Success
                            process.removeListener('log', testf);
                            pub.end();
                            done();
                        }
                    });
                });
            });
            it('should publish single log message with circular data object', function (done) {
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
                // Create a circular reference.
                obj.child.child.child = obj.child;

                let pub;

                const handler = log.amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    pub = publisher;
                    log.info("Circuit test with circular data object", obj);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    consumer.consume(function (err, msg, next) {
                        // Ack message regardless of possible error.
                        next(null);

                        expect(err).to.be(null);

                        if (process.env.LOG_LEVEL === 'DEBUG') {
                            console.log(msg);
                        }

                        // What goes around...
                        const payload = msg.content;
                        expect(payload.log_metadata.level).to.be('INFO');
                        expect(payload.log_metadata.facility).to.be('LOCAL0');
                        expect(payload.log_message).to.be("Circuit test with circular data object");
                        expect(payload).to.have.key('hello');
                        expect(payload.hello).to.be("world");
                        expect(payload).to.have.key('child');
                        expect(payload.child.child.child).to.be("[circular]");

                        pub.end();
                        done();
                    });
                });
            });
            it('should publish single log message with redacted data', function (done) {
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

                let pub;

                const handler = log.amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    pub = publisher;
                    log.censor(['bang', /ello/]);
                    log.info("Circuit test with redacted data object", obj);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    consumer.consume(function (err, msg, next) {
                        // Ack message regardless of possible error.
                        next(null);

                        expect(err).to.be(null);

                        if (process.env.LOG_LEVEL === 'DEBUG') {
                            console.log(msg);
                        }

                        // What goes around...
                        const payload = msg.content;
                        expect(payload.log_metadata.level).to.be('INFO');
                        expect(payload.log_metadata.facility).to.be('LOCAL0');
                        expect(payload.log_message).to.be("Circuit test with redacted data object");
                        expect(payload).to.have.key('hello');
                        expect(payload.hello).to.be("[redacted]");
                        expect(payload).to.have.key('child');
                        expect(payload.child.child.bang).to.be("[redacted]");

                        log.censor([]);
                        pub.end();
                        done();
                    });
                });
            });
            it('should publish single log message with assorted data types and values', function (done) {
                const basics = {
                    "bool": true,
                    "int": 123456,
                    "decimal": 1234.56,
                    "string": "(wave)",
                    "array": [ false, 321, 543.21, "beep", [3,2,1], { "foo": "fighters" } ],
                };

                const error = new Error('You goofed!');
                error.extra = "cream pie";
                error.inner = new SyntaxError("I am blind.");
                error.inner.inner = new Error("Where's the kaboom?");
                error.inner.inner.inner = null;

                const specials = {
                    "null": null,
                    "undefined": undefined,
                    "Error": error,
                    "Function": function noop() { },
                    "Date": new Date('Thu, 10 Aug 2017 13:56:19 -0400'),
                    "RegExp": /^[Hh]ello .orld$/i,
                    "Infinity": Infinity,
                    "NegInfinity": -Infinity,
                    "NaN": NaN,
                }

                let pub;

                const handler = log.amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    pub = publisher;
                    log.info("Assorted data types", basics, specials);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    consumer.consume(function (err, msg, next) {
                        // Ack message regardless of possible error.
                        next(null);

                        expect(err).to.be(null);

                        if (process.env.LOG_LEVEL === 'DEBUG') {
                            console.log(JSON.stringify(msg, null, 2));
                        }

                        // What goes around...
                        const payload = msg.content;
                        expect(payload.log_metadata.level).to.be('INFO');
                        expect(payload.log_metadata.facility).to.be('LOCAL0');
                        expect(payload.log_message).to.be("Assorted data types");
                        expect(payload).to.have.key('bool');
                        expect(payload).to.have.key('int');
                        expect(payload).to.have.key('decimal');
                        expect(payload).to.have.key('string');
                        expect(payload).to.have.key('array');
                        expect(payload.array).to.eql(basics.array);

                        expect(payload.null).to.be(null);
                        expect(payload.undefined).to.be("[undefined]");
                        expect(payload.Function).to.be("[function noop]");
                        expect(payload.Date).to.be("2017-08-10T17:56:19.000Z");
                        expect(payload.RegExp).to.be("/^[Hh]ello .orld$/i");
                        expect(payload.Infinity).to.be("[Infinity]");
                        expect(payload.NegInfinity).to.be("[-Infinity]");
                        expect(payload.NaN).to.be("[NaN]");

                        expect(payload.Error).to.eql({
                            "name":"Error",
                            "message":"You goofed!",
                            "extra":"cream pie",
                            "inner":{
                                "name":"SyntaxError",
                                "message":"I am blind.",
                                "inner":{
                                    "name":"Error",
                                    "message":"Where's the kaboom?",
                                    "inner":null
                                }
                            }
                        });

                        pub.end();
                        done();
                    });
                });
            });
            it('should re-queue a message if write buffer is full', function (done) {
                let pub;

                function testf(log_event) {
                    handler(log_event);
                }
                process.on('log', testf);

                consumer.consume(function (err, msg, next) {
                    expect().fail('No message should have been sent.');
                });

                const handler = log.amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    pub = publisher;

                    // Similute full write buffer.
                    pub.chan.publish = function alwaysFull() {
                        return false;
                    };

                    expect(pub.isFlowing).to.be(true);
                    expect(pub.queue.length).to.be(0);

                    log.notice("Circuit Test 1", {count: 1});
                    log.notice("Circuit Test 2", {count: 2});
                    log.notice("Circuit Test 3", {count: 3});

                    // 3 log messages should fail to be sent and remain in queue.
                    expect(pub.queue.length).to.be(3);
                    expect(pub.queue[0].payload).to.have.key('count');
                    expect(pub.queue[0].payload.count).to.be(1);
                    expect(pub.queue[1].payload.count).to.be(2);
                    expect(pub.queue[2].payload.count).to.be(3);

                    process.removeListener('log', testf);
                    pub.end();
                    done();
                });
            });
        });
    })
});
