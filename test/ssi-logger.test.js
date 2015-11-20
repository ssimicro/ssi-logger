
"use strict";

var expect = require('expect.js');
var log = require('../');

describe('@ssi/logger', function() {
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

    it('should emit log events', function (done) {

        process.on('log', function testf(obj) {
            expect(obj.level).to.be(level);
            expect(obj.message).to.be(message);
            process.removeListener('log', testf);
            done();
        });

        log(level, message);
    });

    it('should concatinate multiple message arguments', function (done) {

        process.on('log', function testf(obj) {
            expect(obj.level).to.be(level);
            expect(obj.message).to.be(message);
            process.removeListener('log', testf);
            done();
        });

        log(level, 'Test', 'Message');
    });

    it('should format complex objects', function (done) {
 
        process.on('log', function testf(obj) {
            expect(obj.level).to.be(level);
            expect(obj.message).to.be('count=5 price=12.34 greeting="Hello, World" shortGreeting=Hi');
            process.removeListener('log', testf);
            done();
        });

        log(level, complex);
    });

    it('should format arrays', function (done) {
 
        process.on('log', function testf(obj) {
            expect(obj.level).to.be(level);
            expect(obj.message).to.be(arr_logformat);
            process.removeListener('log', testf);
            done();
        });

        log(level, arr);
    });

    it('should support varargs like console.log([data], [...])', function (done) {
        process.on('log', function testf(obj) {
            expect(obj.level).to.be(level);
            expect(obj.message).to.be(ip_expect);
            process.removeListener('log', testf);
            done();
        });

        log(level, ip_message, { ip_address: ip_address });
    });

    it('should support printf() style formatting of strings like console.log([data], [...])', function (done) {
        process.on('log', function testf(obj) {
            expect(obj.level).to.be(level);
            expect(obj.message).to.be(ip_expect);
            process.removeListener('log', testf);
            done();
        });

        log(level, ip_message + ' ip_address=%s', ip_address);
    });

    it('should support printf() style formatting of numbers like console.log([data], [...])', function (done) {
        process.on('log', function testf(obj) {
            expect(obj.level).to.be(level);
            expect(obj.message).to.be(ip_expect);
            process.removeListener('log', testf);
            done();
        });

        log(level, ip_message + ' ip_address=%d.%d.%d.%d', 8, 8, 8, 8);
    });

});
