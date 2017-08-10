
"use strict";

var expect = require('expect.js');
var log = require('../');

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
                expect(obj.level).to.be(level);
                expect(obj.message).to.be(message);
                done();
            });

            log(level, message);
        });

        it('should emit log events with data[] containing log args', function (done) {

            process.on('log', function testf(obj) {
                process.removeListener('log', testf);
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
        
    describe('__censorObject', function () {
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
            var clone = log.__censorObject(obj, []);
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

            var clone = log.__censorObject(obj, []);
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
            var clone = log.__censorObject(obj, ['bang', /ello/]);
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
            const specials = {
                "null": null,
                "undefined": undefined,
                "Error": new Error('You goofed!'),
                "SyntaxError": new SyntaxError("I am blind."),
                "Function": function noop() { },
                "Date": new Date('Thu, 10 Aug 2017 13:56:19 -0400'),
                "RegExp": /^[Hh]ello .orld$/,
                "Infinity": Infinity,
                "NaN": NaN,
            };

            var clone;

            clone = log.__censorObject(basics, []);
            expect(clone).not.to.be(basics);
            expect(clone).to.eql(basics);

            clone = log.__censorObject(specials, []);
            expect(clone.null).to.be("[null]");
            expect(clone.undefined).to.be("[undefined]");
            expect(clone.Error).to.be("[Error You goofed!]");
            expect(clone.SyntaxError).to.be("[SyntaxError I am blind.]");
            expect(clone.Function).to.be("[function noop]");
            expect(clone.Date).to.be("2017-08-10T17:56:19.000Z");
            expect(clone.RegExp).to.be("/^[Hh]ello .orld$/");
            expect(clone.Infinity).to.be("[Infinity]");
            expect(clone.NaN).to.be("[NaN]");
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
        describe('setup', function () {
            it('should return a handler', function (done) {
                expect(log.amqpTransport({}, (err, amqpAgent) => amqpAgent.end())).to.be.a('function');
                done();
            });
        });
        describe('queue', function () {
            it('should queue log message', function (done) {
                let pub;

                const handler = log.amqpTransport({}, (err, publisher) => {
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
                    expect(payload.level).to.be('INFO');
                    expect(payload.facility).to.be('LOCAL0');
                    expect(payload.message).to.be("Say something clever.");
                    expect(payload.data.length).to.be(0);
                    done();
                });
            });
            it('should filter log messages below INFO', function (done) {
                let pub;

                const handler = log.amqpTransport({}, (err, publisher) => {
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

                const handler = log.amqpTransport({logLevel: 'ERROR'}, (err, publisher) => {
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

                const handler = log.amqpTransport({logLevel: 'ERROR', facility: 'DAEMON'}, (err, publisher) => {
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
                    expect(payload.level).to.be('ERROR');
                    expect(payload.facility).to.be('DAEMON');
                    expect(payload.message).to.be("Say something clever.");
                    expect(payload.data.length).to.be(0);
                    done();
                });
            });
        });
        describe('payload preparation', function () {
            it('should have null message and empty data[]', function (done) {
                let pub;

                const handler = log.amqpTransport({}, (err, publisher) => {
                    publisher.end();
                    pub = publisher;
                    log.info();
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.level).to.be('INFO');
                    expect(payload.facility).to.be('LOCAL0');
                    expect(payload.message).to.be(null);
                    expect(payload.data.length).to.be(0);
                    done();
                });
            });
            it('should have simple message and empty data[]', function (done) {
                let pub;

                const handler = log.amqpTransport({}, (err, publisher) => {
                    publisher.end();
                    pub = publisher;
                    log.info("Say something clever.");
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.message).to.be("Say something clever.");
                    expect(payload.data.length).to.be(0);
                    done();
                });
            });
            it('should have null message and some data[]', function (done) {
                let pub;

                const handler = log.amqpTransport({}, (err, publisher) => {
                    publisher.end();
                    pub = publisher;
                    log.info({"hello": "world"}, ["foo", "bar"]);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.message).to.be(null);
                    expect(payload.data.length).to.be(2);
                    expect(payload.data[0]).to.eql({"hello": "world"});
                    expect(payload.data[1]).to.eql(["foo", "bar"]);
                    done();
                });
            });
            it('should have simple message and some data[]', function (done) {
                let pub;

                const handler = log.amqpTransport({}, (err, publisher) => {
                    publisher.end();
                    pub = publisher;
                    log.info("Say something clever.", {"hello": "world"}, ["foo", "bar"]);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.message).to.be("Say something clever.");
                    expect(payload.data.length).to.be(2);
                    expect(payload.data[0]).to.eql({"hello": "world"});
                    expect(payload.data[1]).to.eql(["foo", "bar"]);
                    done();
                });
            });
            it('should format printf-style message, remainder as data[]', function (done) {
                let pub;

                const handler = log.amqpTransport({}, (err, publisher) => {
                    publisher.end();
                    pub = publisher;
                    log.info("Say something clever, %s N=%d.", "Jack", 123, {"hello": "world"}, ["foo", "bar"]);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.message).to.be("Say something clever, Jack N=123.");
                    expect(payload.data.length).to.be(2);
                    expect(payload.data[0]).to.eql({"hello": "world"});
                    expect(payload.data[1]).to.eql(["foo", "bar"]);
                    done();
                });
            });
            it('should format message, remainder as data[] with appended defaults', function (done) {
                let pub;

                const mylog = log.defaults({ request_id: '7423927D-6F4E-43FE-846E-C474EA3488A3' }, 'foobar');

                const handler = log.amqpTransport({}, (err, publisher) => {
                    publisher.end();
                    pub = publisher;
                    mylog.info("Say something clever, %s N=%d.", "Jack", 123, {"hello": "world"}, ["foo", "bar"]);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.message).to.be("Say something clever, Jack N=123.");
                    expect(payload.data.length).to.be(4);
                    expect(payload.data[0]).to.eql({"hello": "world"});
                    expect(payload.data[1]).to.eql(["foo", "bar"]);
                    expect(payload.data[2]).to.eql({ request_id: '7423927D-6F4E-43FE-846E-C474EA3488A3' });
                    expect(payload.data[3]).to.be('foobar');
                    done();
                });
            });
            it('should handle data[] with cicular reference', function (done) {
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

                const handler = log.amqpTransport({}, (err, publisher) => {
                    publisher.end();
                    pub = publisher;
                    log.info("Object with circular reference.", obj);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.message).to.be("Object with circular reference.");
                    expect(payload.data.length).to.be(1);
                    expect(payload.data[0].hello).to.be("world");
                    expect(payload.data[0].child.child.child).to.be("[circular]");
                    done();
                });
            });
            it('should handle data[] with redacted content', function (done) {
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

                const handler = log.amqpTransport({}, (err, publisher) => {
                    publisher.end();
                    pub = publisher;
                    log.censor(['bang', /ello/]);
                    log.info("Object with circular reference.", obj);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.message).to.be("Object with circular reference.");
                    expect(payload.data.length).to.be(1);
                    expect(payload.data[0].hello).to.be("[redacted]");
                    expect(payload.data[0].child.child.bang).to.be("[redacted]");

                    log.censor([]);
                    done();
                });
            });
            it('should handle data[] with special types and values', function (done) {
                const basics = {
                    "bool": true,
                    "int": 123456,
                    "decimal": 1234.56,
                    "string": "(wave)",
                    "array": [ false, 321, 543.21, "beep", [3,2,1], { "foo": "fighters" } ],
                };
                const specials = {
                    "null": null,
                    "undefined": undefined,
                    "Error": new Error('You goofed!'),
                    "SyntaxError": new SyntaxError("I am blind."),
                    "Function": function noop() { },
                    "Date": new Date('Thu, 10 Aug 2017 13:56:19 -0400'),
                    "RegExp": /^[Hh]ello .orld$/,
                    "Infinity": Infinity,
                    "NaN": NaN,
                };

                let pub;

                const handler = log.amqpTransport({}, (err, publisher) => {
                    publisher.end();
                    pub = publisher;
                    log.info("Special types and values.", basics, specials);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.level).to.be('INFO');
                    expect(payload.facility).to.be('LOCAL0');
                    expect(payload.message).to.be("Special types and values.");
                    expect(payload.data.length).to.be(2);
                    expect(payload.data[0]).to.eql(basics);

                    expect(payload.data[1].null).to.be("[null]");
                    expect(payload.data[1].undefined).to.be("[undefined]");
                    expect(payload.data[1].Error).to.be("[Error You goofed!]");
                    expect(payload.data[1].SyntaxError).to.be("[SyntaxError I am blind.]");
                    expect(payload.data[1].Function).to.be("[function noop]");
                    expect(payload.data[1].Date).to.be("2017-08-10T17:56:19.000Z");
                    expect(payload.data[1].RegExp).to.be("/^[Hh]ello .orld$/");
                    expect(payload.data[1].Infinity).to.be("[Infinity]");
                    expect(payload.data[1].NaN).to.be("[NaN]");

                    done();
                });
            });
        });
        optDescribe("AMQP circuit", function () {
            const AmqpConsume = require('./AmqpConsume');

            let consumer;

            beforeEach(function (done) {
                consumer = new AmqpConsume({
                    routingKeys: [ "log.#" ],
                    queueName: '',
                    queueOptions: {
                        exclusive: true,
                        durable: false,
                        autoDelete: true
                    },
                });
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

                const handler = log.amqpTransport({}, (err, publisher) => {
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
                        expect(payload.level).to.be('ALERT');
                        expect(payload.facility).to.be('LOCAL0');
                        expect(payload.message).to.be("Circuit Test");
                        expect(payload.data.length).to.be(2);
                        expect(payload.data[0]).to.eql({"hello": "world"});
                        expect(payload.data[1]).to.eql(["foo", "bar"]);

                        pub.end();
                        done();
                    });
                });
            });
            it('should publish 3 log messages to AMQP', function (done) {
                let pub;

                const handler = log.amqpTransport({}, (err, publisher) => {
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
                        expect(payload.level).to.be('NOTICE');
                        expect(payload.facility).to.be('LOCAL0');
                        expect(payload.message).to.be("Circuit Test "+msg.fields.deliveryTag);
                        expect(payload.data.length).to.be(1);
                        expect(payload.data[0]).to.eql({"count": msg.fields.deliveryTag});

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

                const handler = log.amqpTransport({}, (err, publisher) => {
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
                        expect(payload.level).to.be('NOTICE');
                        expect(payload.facility).to.be('LOCAL0');
                        expect(payload.message).to.be("Circuit Test "+msg.fields.deliveryTag);
                        expect(payload.data.length).to.be(1);
                        expect(payload.data[0]).to.eql({"count": msg.fields.deliveryTag});

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

                const handler = log.amqpTransport({}, (err, publisher) => {
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
                        expect(payload.level).to.be('NOTICE');
                        expect(payload.facility).to.be('LOCAL0');
                        expect(payload.message).to.be("Circuit Test "+msg.fields.deliveryTag);
                        expect(payload.data.length).to.be(1);
                        expect(payload.data[0]).to.eql({"count": msg.fields.deliveryTag});

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

                const handler = log.amqpTransport({}, (err, publisher) => {
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
                        expect(payload.level).to.be('INFO');
                        expect(payload.facility).to.be('LOCAL0');
                        expect(payload.message).to.be("Circuit test with circular data object");
                        expect(payload.data.length).to.be(1);
                        expect(payload.data[0].hello).to.be("world");
                        expect(payload.data[0].child.child.child).to.be("[circular]");

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

                const handler = log.amqpTransport({}, (err, publisher) => {
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
                        expect(payload.level).to.be('INFO');
                        expect(payload.facility).to.be('LOCAL0');
                        expect(payload.message).to.be("Circuit test with redacted data object");
                        expect(payload.data.length).to.be(1);
                        expect(payload.data[0].hello).to.be("[redacted]");
                        expect(payload.data[0].child.child.bang).to.be("[redacted]");

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
                const specials = {
                    "null": null,
                    "undefined": undefined,
                    "Error": new Error('You goofed!'),
                    "SyntaxError": new SyntaxError("I am blind."),
                    "Function": function noop() { },
                    "Date": new Date('Thu, 10 Aug 2017 13:56:19 -0400'),
                    "RegExp": /^[Hh]ello .orld$/,
                    "Infinity": Infinity,
                    "NaN": NaN,
                }

                let pub;

                const handler = log.amqpTransport({}, (err, publisher) => {
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
                        expect(payload.level).to.be('INFO');
                        expect(payload.facility).to.be('LOCAL0');
                        expect(payload.message).to.be("Assorted data types");
                        expect(payload.data.length).to.be(2);
                        expect(payload.data[0]).to.eql(basics);

                        expect(payload.data[1].null).to.be("[null]");
                        expect(payload.data[1].undefined).to.be("[undefined]");
                        expect(payload.data[1].Error).to.be("[Error You goofed!]");
                        expect(payload.data[1].SyntaxError).to.be("[SyntaxError I am blind.]");
                        expect(payload.data[1].Function).to.be("[function noop]");
                        expect(payload.data[1].Date).to.be("2017-08-10T17:56:19.000Z");
                        expect(payload.data[1].RegExp).to.be("/^[Hh]ello .orld$/");
                        expect(payload.data[1].Infinity).to.be("[Infinity]");
                        expect(payload.data[1].NaN).to.be("[NaN]");

                        pub.end();
                        done();
                    });
                });
            });
        });
    })
});
