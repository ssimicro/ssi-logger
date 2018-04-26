
"use strict";

var _ = require('lodash');
var expect = require('expect.js');
var fs = require('fs');
var log = require('../');
var os = require('os');
var path = require('path');
var filterObject = require('../lib/filterObject.js');
var amqpTransport = require('../lib/transports/amqp.js');

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

            expect(level2).to.have.property('configureTransports');
            expect(level2.configureTransports).to.be.a('function');

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

            expect(level2).to.have.property('configureTransports');
            expect(level2.configureTransports).to.be.a('function');

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

    describe('transformLogEvent', function () {
        it("should pass through version 1.0.0 log event unchanged", (done) => {
            const event_in = {
                version: "1.0.0",
                level: "INFO",
                message: "pass through",
                created: new Date(),
                host: os.hostname(),
                data: [ "abc" ],
            };
            expect(log.transformLogEvent(event_in)).to.eql(event_in);
            done();
        });
        it("should add extra fields to legacy pre-1.0.0 log event", (done) => {
            const event_in = {
                level: "INFO",
                message: "legacy event message",
            };
            const event_out = log.transformLogEvent(event_in);
            expect(event_out).to.have.key('created');
            expect(event_out.created).to.a(Date);
            expect(_.omit(event_out, ['created'])).to.eql({
                version: "1.0.0",
                level: "INFO",
                message: "legacy event message",
                host: os.hostname(),
                data: [],
            });
            done();
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

    describe("convertArraysToObjects", function () {
        it("should clone an array into an object", (done) => {
            expect(amqpTransport.convertArraysToObjects([])).to.eql({});
            expect(amqpTransport.convertArraysToObjects(["hello", "world", "sniff"])).to.eql({0: "hello", 1: "world", 2: "sniff"});
            done();
        });
        it("should clone an object", (done) => {
            expect(amqpTransport.convertArraysToObjects({})).to.eql({});
            expect(amqpTransport.convertArraysToObjects({hello: "world"})).to.eql({hello: "world"});
            done();
        });
        it("should not modify the original object", (done) => {
            const array = ["hello", "world", "sniff"];
            const obj = amqpTransport.convertArraysToObjects(array);
            expect(obj).not.to.be(array);
            expect(obj).to.eql({0: "hello", 1: "world", 2: "sniff"});
            done();
        });
        it("should clone an object converting arrays into objects", (done) => {
            const array = ["hello", {
                level: 1,
                naughty: true,
                hello: "world",
                array1: [ 1, { array2: [ "foo", "bar" ], bat: "flying mouse"}, 3]
            }, "ugh"];
            expect(amqpTransport.convertArraysToObjects(array)).to.eql({
                0: "hello",
                1: {
                    level: 1,
                    naughty: true,
                    hello: "world",
                    array1: {
                        0: 1,
                        1: {
                            array2: {
                                0: "foo",
                                1: "bar",
                            },
                            bat: "flying mouse",
                        },
                        2: 3
                    }
                },
                2: "ugh"
            });
            done();
        });
        it("should convert Date object into ISO 8601 date string", (done) => {
            const obj = amqpTransport.convertArraysToObjects({date: new Date("23 April 2018 11:43")});
            expect(obj.date).to.be.a(Date);
            expect(obj.date).to.eql(new Date("2018-04-23T15:43:00.000Z"));
            done();
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

    describe('amqpTransport payload preparation', function () {
        let options = {
            amqpTransport: {
                format: 'text',
            }
        };
        try {
            options = _.defaultsDeep(options, JSON.parse(fs.readFileSync(path.join(__dirname, 'ssi-logger.conf')).toString()));
        } catch (err) {
            console.error(err);
        }

        beforeEach((done) => {
            log.censor([]);
            done();
        });

        describe('payload preparation format=text', function () {
            it('should have null message', function (done) {
                let pub;

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.info();
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const hdr = pub.queue[0].publishOptions.headers;
                    expect(pub.queue[0].payload).to.be(`${hdr.Created} ${hdr.Host} ${hdr.Process}[${process.pid}]: `);
                    done();
                });
            });
            it('should have simple message', function (done) {
                let pub;

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.info("Say something clever.");
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const hdr = pub.queue[0].publishOptions.headers;
                    expect(pub.queue[0].payload).to.be(`${hdr.Created} ${hdr.Host} ${hdr.Process}[${process.pid}]: Say something clever.`);
                    done();
                });
            });
            it('should have null message and some data', function (done) {
                let pub;

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.info({"hello": "world"}, ["foo", "bar"]);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const hdr = pub.queue[0].publishOptions.headers;
                    expect(pub.queue[0].payload).to.be(`${hdr.Created} ${hdr.Host} ${hdr.Process}[${process.pid}]: hello=world 0=foo 1=bar`);
                    done();
                });
            });
            it('should take an Error like first argument as the log message and name', function (done) {
                let pub;

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.info({name: 'ERROR_NAME', message: 'an error message'});
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const hdr = pub.queue[0].publishOptions.headers;
                    expect(pub.queue[0].payload).to.be(`${hdr.Created} ${hdr.Host} ${hdr.Process}[${process.pid}]: name=ERROR_NAME message="an error message"`);
                    done();
                });
            });
            it('should have simple message and some data', function (done) {
                let pub;

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.info("Say something clever.", {"hello": "world"}, ["foo", "bar"]);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const hdr = pub.queue[0].publishOptions.headers;
                    expect(pub.queue[0].payload).to.be(`${hdr.Created} ${hdr.Host} ${hdr.Process}[${process.pid}]: Say something clever. hello=world 0=foo 1=bar`);
                    done();
                });
            });
            it('should format printf-style message, remainder as data', function (done) {
                let pub;

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.info("Say something clever, %s N=%d.", "Jack", 123, {"hello": "world"}, ["foo", "bar"]);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const hdr = pub.queue[0].publishOptions.headers;
                    expect(pub.queue[0].payload).to.be(`${hdr.Created} ${hdr.Host} ${hdr.Process}[${process.pid}]: Say something clever, Jack N=123. hello=world 0=foo 1=bar`);
                    done();
                });
            });
            it('should append non-objects to message', function (done) {
                let pub;

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.info("Append", "Jack", 123, 543.21, true, new Error('goofed'), {"hello": "world"}, ["foo", "bar"]);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const hdr = pub.queue[0].publishOptions.headers;
                    expect(pub.queue[0].payload).to.be(`${hdr.Created} ${hdr.Host} ${hdr.Process}[${process.pid}]: Append Jack 123 543.21 true name=Error message=goofed hello=world 0=foo 1=bar`);
                    done();
                });
            });
            it('should format message, remainder as data with added defaults', function (done) {
                let pub;

                const mylog = log.defaults({ request_id: '7423927D-6F4E-43FE-846E-C474EA3488A3' }, 'foobar');

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    mylog.info("Say something clever, %s N=%d.", "Jack", 123, {"hello": "world"}, ["foo", "bar"]);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const hdr = pub.queue[0].publishOptions.headers;
                    expect(pub.queue[0].payload).to.be(`${hdr.Created} ${hdr.Host} ${hdr.Process}[${process.pid}]: Say something clever, Jack N=123. hello=world 0=foo 1=bar request_id=7423927D-6F4E-43FE-846E-C474EA3488A3 foobar`);
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

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.info("Object with circular reference.", obj);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const hdr = pub.queue[0].publishOptions.headers;
                    expect(pub.queue[0].payload).to.be(`${hdr.Created} ${hdr.Host} ${hdr.Process}[${process.pid}]: Object with circular reference. hello=world child.world=peace child.child.bang=war child.child.child=[circular]`);
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

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.censor(['bang', /ello/]);
                    log.info("Object with circular reference.", obj);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const hdr = pub.queue[0].publishOptions.headers;
                    expect(pub.queue[0].payload).to.be(`${hdr.Created} ${hdr.Host} ${hdr.Process}[${process.pid}]: Object with circular reference. hello=[redacted] child.world=peace child.child.bang=[redacted] child.child.child=null`);
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

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.info("Special types and values.", basics, specials);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const hdr = pub.queue[0].publishOptions.headers;
                    expect(pub.queue[0].payload).to.be(`${hdr.Created} ${hdr.Host} ${hdr.Process}[${process.pid}]: Special types and values. bool=true int=123456 decimal=1234.56 string=(wave) array.0=false array.1=321 array.2=543.21 array.3=beep array.4.0=3 array.4.1=2 array.4.2=1 array.5.foo=fighters null=null undefined=[undefined] Error.name=Error Error.message="You goofed!" Error.extra="cream pie" Error.inner.name=SyntaxError Error.inner.message="I am blind." Error.inner.inner.name=Error Error.inner.inner.message="Where\'s the kaboom?" Error.inner.inner.inner=null Function="[function noop]" Date=2017-08-10T13:56:19-04:00 RegExp="/^[Hh]ello .orld$/i" Infinity=[Infinity] NegInfinity=[-Infinity] NaN=[NaN]`);
                    done();
                });
            });
        });
        describe('payload preparation format=json', function () {
            before((done) => {
                options.amqpTransport.format = 'json';
                done();
            });

            after((done) => {
                options.amqpTransport.format = 'text';
                done();
            });

            it('should have null message', function (done) {
                let pub;

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.info();
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.log_message).to.be(null);
                    expect(payload).to.have.key('log_metadata');
                    expect(payload.log_metadata.Level).to.be('INFO');
                    expect(payload.log_metadata.Facility).to.be('LOCAL0');
                    done();
                });
            });
            it('should have simple message', function (done) {
                let pub;

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.info("Say something clever.");
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload).to.have.keys('log_metadata', 'log_details');
                    expect(payload.log_metadata.Level).to.be('INFO');
                    expect(payload.log_metadata.Facility).to.be('LOCAL0');
                    expect(payload.log_message).to.be("Say something clever.");
                    done();
                });
            });
            it('should have null message and some data', function (done) {
                let pub;

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
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
                    expect(payload).to.have.keys('log_metadata', 'log_details');
                    expect(payload.log_metadata.Level).to.be('INFO');
                    expect(payload.log_metadata.Facility).to.be('LOCAL0');
                    expect(payload.log_details[0]).to.eql({"hello": "world"});
                    expect(payload.log_details[1]).to.eql({"0": "foo", "1": "bar"});
                    done();
                });
            });
            it('should take an Error like first argument as the log message and name', function (done) {
                let pub;

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.info({name: 'ERROR_NAME', message: 'an error message'});
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.log_message).to.be('an error message');
                    expect(payload).to.have.keys('log_name', 'log_metadata');
                    expect(payload.log_name).to.be('ERROR_NAME');
                    expect(payload.log_metadata.Level).to.be('INFO');
                    expect(payload.log_metadata.Facility).to.be('LOCAL0');
                    done();
                });
            });
            it('should have simple message and some data', function (done) {
                let pub;

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
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
                    expect(payload).to.have.keys('log_metadata', 'log_details');
                    expect(payload.log_metadata.Level).to.be('INFO');
                    expect(payload.log_metadata.Facility).to.be('LOCAL0');
                    expect(payload.log_details[0]).to.eql({"hello": "world"});
                    expect(payload.log_details[1]).to.eql({"0": "foo", "1": "bar"});
                    done();
                });
            });
            it('should format printf-style message, remainder as data', function (done) {
                let pub;

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
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
                    expect(payload).to.have.keys('log_metadata', 'log_details');
                    expect(payload.log_metadata.Level).to.be('INFO');
                    expect(payload.log_metadata.Facility).to.be('LOCAL0');
                    expect(payload.log_details[0]).to.eql({"hello": "world"});
                    expect(payload.log_details[1]).to.eql({"0": "foo", "1": "bar"});
                    done();
                });
            });
            it('should format message, remainder as data with added defaults', function (done) {
                let pub;

                const mylog = log.defaults({ request_id: '7423927D-6F4E-43FE-846E-C474EA3488A3' }, 'foobar');

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    mylog.info("Say something clever, %s N=%d.", "Jack", 123, {"hello": "world"}, ["foo", "bar"]);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.log_message).to.be("Say something clever, Jack N=123.");
                    expect(payload).to.have.keys('log_metadata', 'log_details');
                    expect(payload.log_metadata.Level).to.be('INFO');
                    expect(payload.log_metadata.Facility).to.be('LOCAL0');
                    expect(payload.log_details[0]).to.eql({"hello": "world"});
                    expect(payload.log_details[1]).to.eql({"0": "foo", "1": "bar"});
                    expect(payload.log_details[2]).to.eql({request_id: '7423927D-6F4E-43FE-846E-C474EA3488A3'});
                    expect(payload.log_details[3]).to.be("foobar");
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

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
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
                    expect(payload).to.have.keys('log_metadata', 'log_details');
                    expect(payload.log_metadata.Level).to.be('INFO');
                    expect(payload.log_metadata.Facility).to.be('LOCAL0');
                    expect(payload.log_details[0].child.child.child).to.be("[circular]");
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

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.censor(['bang', /ello/]);
                    log.info("Object with redacted content.", obj);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.log_message).to.be("Object with redacted content.");
                    expect(payload).to.have.keys('log_metadata', 'log_details');
                    expect(payload.log_metadata.Level).to.be('INFO');
                    expect(payload.log_metadata.Facility).to.be('LOCAL0');
                    expect(payload.log_details[0].hello).to.be("[redacted]");
                    expect(payload.log_details[0].child.child.bang).to.be("[redacted]");
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

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    publisher.end();
                    pub = publisher;
                    log.info("Special types and values.", basics, specials);
                });

                process.on('log', function testf(log_event) {
                    process.removeListener('log', testf);
                    handler(log_event);

                    const payload = pub.queue[0].payload;
                    expect(payload.log_message).to.be("Special types and values.");
                    expect(payload).to.have.keys('log_metadata', 'log_details');
                    expect(payload.log_metadata.Level).to.be('INFO');
                    expect(payload.log_metadata.Facility).to.be('LOCAL0');

                    expect(payload.log_details[0]).to.eql({
                        bool: true,
                        int: 123456,
                        decimal: 1234.56,
                        string: "(wave)",
                        array: {
                            "0": false,
                            "1": 321,
                            "2": 543.21,
                            "3": "beep",
                            "4": {"0": 3, "1": 2, "2": 1},
                            "5": { "foo": "fighters" },
                        },
                    });

                    expect(payload.log_details[1]).to.eql({
                        "null": null,
                        "undefined": "[undefined]",
                        "Error": {
                          "extra": "cream pie",
                          "inner": {
                            "inner": {
                              "inner": null,
                              "message": "Where's the kaboom?",
                              "name": "Error",
                            },
                            "message": "I am blind.",
                            "name": "SyntaxError",
                          },
                          "message": "You goofed!",
                          "name": "Error",
                        },
                        "Function": "[function noop]",
                        "Date": new Date("2017-08-10T17:56:19.000Z"),
                        "RegExp": "/^[Hh]ello .orld$/i",
                        "Infinity": "[Infinity]",
                        "NegInfinity": "[-Infinity]",
                        "NaN": "[NaN]",
                    });

                    done();
                });
            });
        });
    });
    optDescribe('amqpTransport', function () {
        let options = {
            amqpTransport: {
                format: 'text',
            }
        };
        try {
            options = _.defaultsDeep(options, JSON.parse(fs.readFileSync(path.join(__dirname, 'ssi-logger.conf')).toString()));
        } catch (err) {
            console.error(err);
        }

        describe('connect', function () {
            this.timeout(5000);

            it('should fail for invalid credentials', function (done) {
                amqpTransport({
                    url: 'amqp://unknown_username:bad_password@amqp.ssimicro.com'
                }, (err, publisher) => {
                    expect(err).not.to.be(null);
                    expect(err).to.be.an(Error);
                    done();
                });
            });
            it('should return a handler', function (done) {
                expect(amqpTransport(options.amqpTransport, (err, publisher) => publisher.end())).to.be.a('function');
                done();
            });
            it('should return a handler when no options argument', function (done) {
                expect(amqpTransport((err, publisher) => publisher.end())).to.be.a('function');
                done();
            });
            it('should not reconnect on error when reconnect.retryTimeout = 0', function (done) {
                amqpTransport(_.defaultsDeep({reconnect: {retryTimeout: 0}}, options.amqpTransport), (err, producer) => {
                    expect(err).to.be(null);

                    producer.on('error', (err) => {
                        expect(err).not.be(null);
                        expect(producer.conn).to.be(null);
                        done();
                    });

                    producer.bail(new Error('error triggered by test'));
                });
            });
            it('should reconnect on error when reconnect.retryTimeout > 0', function (done) {
                amqpTransport(_.defaultsDeep({reconnect: {retryTimeout: 2, retryDelay: 0}}, options.amqpTransport), (err, producer) => {
                    expect(err).to.be(null);
                    const conn_before = producer.conn;
                    producer.bail(new Error('error triggered by test'));

                    setTimeout(() => {
                        expect(producer.conn).not.to.be(null);
                        expect(producer.conn).not.to.be(conn_before);
                        producer.end();
                        done();
                    }, 2000);
                });
            });
            it('should not reconnect on graceful close when reconnect.retryTimeout = 0', function (done) {
                amqpTransport(_.defaultsDeep({reconnect: {retryTimeout: 0}}, options.amqpTransport), (err, producer) => {
                    expect(err).to.be(null);
                    producer.closed();
                    expect(producer.conn).to.be(null);
                    done();
                });
            });
            it('should not reconnect on graceful close when reconnect.retryTimeout > 0', function (done) {
                amqpTransport(_.defaultsDeep({reconnect: {retryTimeout: 2, retryDelay: 0}}, options.amqpTransport), (err, producer) => {
                    expect(err).to.be(null);
                    producer.closed();
                    expect(producer.conn).to.be(null);
                    done();
                });
            });
            it('should reconnect on closed error when reconnect.retryTimeout > 0', function (done) {
                amqpTransport(_.defaultsDeep({reconnect: {retryTimeout: 2, retryDelay: 0}}, options.amqpTransport), (err, producer) => {
                    expect(err).to.be(null);
                    const conn_before = producer.conn;

                    producer.closed(new Error('error triggered by test'));

                    setTimeout(() => {
                        expect(producer.conn).not.to.be(null);
                        expect(producer.conn).not.to.be(conn_before);
                        producer.end();
                        done();
                    }, 2000);
                });
            });
            it('should retry reconnection until reconnect.retryTimeout reached', function (done) {
                amqpTransport({
                    url: 'amqp://unknown_username:bad_password@amqp.ssimicro.com',
                    reconnect: {
                        retryTimeout: 2,
                        retryDelay: 1,
                    }
                }, (err, producer) => {
                    expect(err).not.to.be(null);

                    producer.once('error', (err) => {
                        expect(err.attempts).to.be(2);
                        producer.end();
                        done();
                    });

                    producer.bail(new Error('error triggered by test'));
                });
            });
        });

        describe('queue', function () {
            it('should queue log message', function (done) {
                let pub;

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
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

                    const hdr = pub.queue[0].publishOptions.headers;
                    expect(hdr.Level).to.be('INFO');
                    expect(hdr.Facility).to.be('LOCAL0');
                    expect(pub.queue[0].payload).to.be(`${hdr.Created} ${hdr.Host} ${hdr.Process}[${process.pid}]: Say something clever.`);
                    done();
                });
            });
            it('should filter log messages below INFO', function (done) {
                let pub;

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
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

                const handler = amqpTransport(_.defaultsDeep({level: 'ERROR'}, options.amqpTransport), (err, publisher) => {
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

                const handler = amqpTransport(_.defaultsDeep({level: 'ERROR', facility: 'DAEMON'}, options.amqpTransport), (err, publisher) => {
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

                    const hdr = pub.queue[0].publishOptions.headers;
                    expect(hdr.Level).to.be('ERROR');
                    expect(hdr.Facility).to.be('DAEMON');
                    expect(pub.queue[0].payload).to.be(`${hdr.Created} ${hdr.Host} ${hdr.Process}[${process.pid}]: Say something clever.`);
                    done();
                });
            });

            it('should not filter log message ERR (ERROR) or above', function (done) {
                let pub;

                const handler = amqpTransport(_.defaultsDeep({level: 'ERROR', facility: 'DAEMON'}, options.amqpTransport), (err, publisher) => {
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

                    const hdr = pub.queue[0].publishOptions.headers;
                    expect(hdr.Level).to.be('ERROR');
                    expect(hdr.Facility).to.be('DAEMON');
                    expect(pub.queue[0].payload).to.be(`${hdr.Created} ${hdr.Host} ${hdr.Process}[${process.pid}]: Say something clever.`);
                    done();
                });
            });

            it('should not filter log message WARNING (WARN) or above', function (done) {
                let pub;

                const handler = amqpTransport(_.defaultsDeep({level: 'WARN', facility: 'DAEMON'}, options.amqpTransport), (err, publisher) => {
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

                    const hdr = pub.queue[0].publishOptions.headers;
                    expect(hdr.Level).to.be('WARN');
                    expect(hdr.Facility).to.be('DAEMON');
                    expect(pub.queue[0].payload).to.be(`${hdr.Created} ${hdr.Host} ${hdr.Process}[${process.pid}]: Say something clever.`);
                    done();
                });
            });
        });
        describe("AMQP circuit", function () {
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

            it('should queue 3 messages', function (done) {
                const handler = amqpTransport(options.amqpTransport, (err, producer) => {
                    expect(err).to.be(null);
                    producer.end();

                    let log_count = 0;
                    process.on('log', function testf(log_event) {
                        handler(log_event);
                        if (++log_count === 3) {
                            process.removeListener('log', testf);
                            expect(producer.queue.length).to.be(3);
                            done();
                        }
                    });

                    // Disable drain.
                    producer.isFlowing = false;

                    log.info("heaven");
                    log.info("world");
                    log.info("hell");
                });
            });
            it('should publish single log message to AMQP', function (done) {
                let pub;

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
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
                        expect(msg.fields.routingKey).to.be('log.node.LOCAL0.ALERT');
                        expect(msg.properties.contentType).to.be('text/plain');
                        expect(msg.properties.contentEncoding).to.be('utf8');
                        expect(msg.properties.headers.Level).to.be('ALERT');
                        expect(msg.properties.headers.Facility).to.be('LOCAL0');
                        const hdr = msg.properties.headers;
                        expect(msg.content).to.be(`"${hdr.Created} ${hdr.Host} ${hdr.Process}[${process.pid}]: Circuit Test hello=world 0=foo 1=bar"`);
                        pub.end();
                        done();
                    });
                });
            });
            it('should publish 3 log messages to AMQP', function (done) {
                let pub;

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
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
                        expect(msg.properties.contentType).to.be('text/plain');
                        expect(msg.properties.contentEncoding).to.be('utf8');
                        expect(msg.properties.headers.Level).to.be('NOTICE');
                        expect(msg.properties.headers.Facility).to.be('LOCAL0');

                        const hdr = msg.properties.headers;
                        expect(msg.content).to.be(`"${hdr.Created} ${hdr.Host} ${hdr.Process}[${process.pid}]: Circuit Test ${msg.fields.deliveryTag} count=${msg.fields.deliveryTag}"`);

                        if (msg.fields.deliveryTag === 3) {
                            process.removeListener('log', testf);
                            pub.end();
                            done();
                        }
                    });
                });
            });
            it('should queue messages after a blocked event until an unblocked event', function (done) {
                const handler = amqpTransport(options.amqpTransport, (err, producer) => {
                    expect(err).to.be(null);

                    process.on('log', function testf(log_event) {
                        handler(log_event);

                        consumer.consume(function (err, msg, next) {
                            next(null);
                            if (msg.fields.deliveryTag === 3) {
                                process.removeListener('log', testf);
                                producer.end();
                                done();
                            }
                        });
                    });

                    producer.conn.emit('blocked');
                    expect(producer.queue.length).to.be(0);

                    log.info("message 1");
                    log.info("message 2");
                    log.info("message 3");

                    expect(producer.queue.length).to.be(3);
                    producer.conn.emit('unblocked');
                });
            });
            it('should simulate blocked event, queue log messages until unblocked event', function (done) {
                let pub;

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
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
                        expect(msg.properties.headers.Level).to.be('NOTICE');
                        expect(msg.properties.headers.Facility).to.be('LOCAL0');

                        const hdr = msg.properties.headers;
                        expect(msg.content).to.be(`"${hdr.Created} ${hdr.Host} ${hdr.Process}[${process.pid}]: Circuit Test ${msg.fields.deliveryTag} count=${msg.fields.deliveryTag}"`);

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
            it('should simulate full write buffer, queue log messages, then manual drain', function (done) {
                let pub;

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
                    expect(err).to.be(null);
                    pub = publisher;

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
                        pub.drainQueue();
                    }

                    consumer.consume(function (err, msg, next) {
                        // Ack message regardless of possible error.
                        next(null);

                        expect(err).to.be(null);

                        if (process.env.LOG_LEVEL === 'DEBUG') {
                            console.log(msg);
                        }

                        // What goes around...
                        expect(msg.properties.headers.Level).to.be('NOTICE');
                        expect(msg.properties.headers.Facility).to.be('LOCAL0');

                        const hdr = msg.properties.headers;
                        expect(msg.content).to.be(`"${hdr.Created} ${hdr.Host} ${hdr.Process}[${process.pid}]: Circuit Test ${msg.fields.deliveryTag} count=${msg.fields.deliveryTag}"`);

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

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
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
                        expect(msg.properties.headers.Level).to.be('INFO');
                        expect(msg.properties.headers.Facility).to.be('LOCAL0');

                        const hdr = msg.properties.headers;
                        expect(msg.content).to.be(`"${hdr.Created} ${hdr.Host} ${hdr.Process}[${process.pid}]: Circuit test with circular data object hello=world child.world=peace child.child.bang=war child.child.child=[circular]"`);

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

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
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
                        expect(msg.properties.headers.Level).to.be('INFO');
                        expect(msg.properties.headers.Facility).to.be('LOCAL0');

                        const hdr = msg.properties.headers;
                        expect(msg.content).to.be(`"${hdr.Created} ${hdr.Host} ${hdr.Process}[${process.pid}]: Circuit test with redacted data object hello=[redacted] child.world=peace child.child.bang=[redacted] child.child.child=null"`);

                        log.censor([]);
                        pub.end();
                        done();
                    });
                });
            });
            it('should publish single log message with assorted data types and values format=text', function (done) {
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

                const handler = amqpTransport(options.amqpTransport, (err, publisher) => {
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
                        expect(msg.properties.headers.Level).to.be('INFO');
                        expect(msg.properties.headers.Facility).to.be('LOCAL0');

                        const hdr = msg.properties.headers;
                        expect(msg.content).to.be(`"${hdr.Created} ${hdr.Host} ${hdr.Process}[${process.pid}]: Assorted data types bool=true int=123456 decimal=1234.56 string=(wave) array.0=false array.1=321 array.2=543.21 array.3=beep array.4.0=3 array.4.1=2 array.4.2=1 array.5.foo=fighters null=null undefined=[undefined] Error.name=Error Error.message=\\"You goofed!\\" Error.extra=\\"cream pie\\" Error.inner.name=SyntaxError Error.inner.message=\\"I am blind.\\" Error.inner.inner.name=Error Error.inner.inner.message=\\"Where\'s the kaboom?\\" Error.inner.inner.inner=null Function=\\"[function noop]\\" Date=2017-08-10T13:56:19-04:00 RegExp=\\"/^[Hh]ello .orld$/i\\" Infinity=[Infinity] NegInfinity=[-Infinity] NaN=[NaN]"`);

                        pub.end();
                        done();
                    });
                });
            });
            it('should publish single log message with assorted data types and values format=json', function (done) {
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

                const handler = amqpTransport(_.defaultsDeep({format: "json"}, options.amqpTransport), (err, publisher) => {
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
                        expect(msg.properties.headers.Level).to.be('INFO');
                        expect(msg.properties.headers.Facility).to.be('LOCAL0');
                        expect(msg.content.log_message).to.be('Assorted data types');
                        expect(msg.content.log_details[0].array[3]).to.be('beep');

                        pub.end();
                        done();
                    });
                });
            });
            it('should continue sending messages after an error and reconnect', function (done) {
                const handler = amqpTransport(_.defaultsDeep({reconnect: {retryTimeout: 2, retryDelay: 0}}, options.amqpTransport), (err, producer) => {
                    expect(err).to.be(null);
                    const conn_before = producer.conn;

                    process.on('log', function testf(log_event) {
                        handler(log_event);

                        consumer.consume(function (err, msg, next) {
                            next(null);
                            if (msg.fields.deliveryTag === 3) {
                                process.removeListener('log', testf);
                                expect(producer.conn).not.to.be(null);
                                expect(producer.conn).not.to.be(conn_before);
                                producer.end();
                                done();
                            }
                        });
                    });

                    log.info("message 1");

                    producer.bail(new Error('error triggered by test'));

                    log.info("message 2");
                    log.info("message 3");
                });
            });
            it('should continue sending messages after a closed error and reconnect', function (done) {
                const handler = amqpTransport(_.defaultsDeep({reconnect: {retryTimeout: 2, retryDelay: 0}}, options.amqpTransport), (err, producer) => {
                    expect(err).to.be(null);
                    const conn_before = producer.conn;

                    process.on('log', function testf(log_event) {
                        handler(log_event);

                        consumer.consume(function (err, msg, next) {
                            next(null);
                            if (msg.fields.deliveryTag === 3) {
                                process.removeListener('log', testf);
                                expect(producer.conn).not.to.be(null);
                                expect(producer.conn).not.to.be(conn_before);
                                producer.end();
                                done();
                            }
                        });
                    });

                    log.info("message 1");

                    producer.closed(new Error('error triggered by test'));

                    log.info("message 2");
                    log.info("message 3");
                });
            });
            it('should reconnect if necessary when flushing queue', function (done) {
                const handler = amqpTransport(_.defaultsDeep({reconnect: {retryTimeout: 2, retryDelay: 0}}, options.amqpTransport), (err, producer) => {
                    expect(err).to.be(null);
                    const conn_before = producer.conn;

                    process.on('log', function testf(log_event) {
                        handler(log_event);

                        consumer.consume(function (err, msg, next) {
                            next(null);

                            // Nuking producer.chan.publish throws an error, loosing a message.
                            if (msg.fields.deliveryTag === 2) {
                                process.removeListener('log', testf);
                                expect(producer.conn).to.be(null);
                                done();
                            }
                        });
                    });

                    // Queue some messages.
                    producer.conn.emit('blocked');
                    log.info("message 1");
                    log.info("message 2");
                    log.info("message 3");

                    // Simulate reconnect during flush, looses first message.
                    producer.chan.publish = null;

                    // Flush and close.
                    producer.end();
                });
            });
        });
    })
});
