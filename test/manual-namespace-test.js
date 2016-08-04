"use strict";

process.env.DEBUG = process.env.DEBUG || 'billing:*,-billing:lineitems';

var log = require('../');
process.on('log', log.consoleTransport());

var accountsLogger = log('billing:accounts');
var invoicesLogger = log('billing:invoices');
var lineitemsLogger = log('billing:lineitems');

console.log('When DEBUG is not set, this should print "Hello, accounts." and "Hello, invoices."');

log('INFO', 'Hello, World!');

accountsLogger('INFO', 'Hello, accounts.');
lineitemsLogger('INFO', 'Hello, lineitems.');
invoicesLogger('INFO', 'Hello, invoices.');
