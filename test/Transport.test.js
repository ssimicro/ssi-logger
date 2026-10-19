'use strict';

const Transport = require('../lib/Transport');
const expect = require('expect.js');

describe('Transport', function () {
    describe('.map(event)', function () {
        it('should preserve newlines when stripNewlines is false', function () {
            const tp = new Transport({ stripNewlines: false });
            expect(tp.map({ message: 'foo\r\nbar\r\nbaz\r\n' })).to.eql({ message: 'foo\r\nbar\r\nbaz\r\n' });
        });
        it('should replace one or more newlines with a single space when stripNewlines is true', function () {
            const tp = new Transport({ stripNewlines: true });
            expect(tp.map({ message: 'foo\r\nbar\r\nbaz\r\n' })).to.eql({ message: 'foo bar baz ' });
        });
        it('should handle any combination of one or more \\r and \\n', function () {
            const tp = new Transport({ stripNewlines: true });
            expect(tp.map({ message: 'foo\n\nbar\nbaz\r' })).to.eql({ message: 'foo bar baz ' });
        });
    });
    describe('.chunkify(event)', function () {
        it('should preserve messages that are less than or equal to chunkSize', function () {
            const tp = new Transport({ chunkSize: 16 });

            [
                { message: 'Hello, World!', eid: 'testcase' },
                { message: 'Hi, name="TC"!', eid: 'testcase' },
            ].forEach((event) => expect(tp.chunkify(event)).to.eql([event]));
        });
        it('should chunk messages that are more than chunkSize', function () {
            const tp = new Transport({ chunkSize: 8 });

            expect(tp.chunkify({ message: 'Hello, World!', eid: 'testcase' })).to.eql([
                { message: 'Hello, eid=testcase', eid: 'testcase' },
                { message: 'World! eid=testcase', eid: 'testcase' }
            ]);

            expect(tp.chunkify({ message: 'Hi, name="T Cort"', eid: 'testcase' })).to.eql([
                { message: 'Hi, eid=testcase', eid: 'testcase' },
                { message: 'name="T Cort" eid=testcase', eid: 'testcase' }
            ]);

            // favour keeping the message intact over splitting value between two chunks
            // in theory, this may result in truncation
            // in practice, the underlying transport will only truncate if the message exceed chunkSize which is at least 480 characters in syslog.
            expect(tp.chunkify({ message: '0123456789abcdef', eid: 'testcase' })).to.eql([
                { message: '0123456789abcdef eid=testcase', eid: 'testcase' },
            ]);
        });
    });
});
