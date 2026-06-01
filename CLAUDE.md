# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run tests (copies test/ssi-logger.conf.example to test/ssi-logger.conf if missing, then lints + tests)
npm test

# Run all tests including those gated by TESTALL=YES
npm run testall

# Lint only
npx jshint *.js lib

# Run a single test file
npx mocha -R spec test/ssi-logger.test.js
```

Before tests run, `test/ssi-logger.conf` must exist — `npm test` creates it automatically from the example file.

## Architecture

`ssi-logger.js` is the entire public API. It exports a `log(level, message, ...)` function plus helpers (`log.open`, `log.close`, `log.censor`, `log.defaults`, convenience level methods like `log.info()`).

**Event-based dispatch**: `log()` emits a `log` event on `process`. Transports are event listeners attached via `log.open(options)`. This means any code in the process — including third-party modules — can call `log()` without configuration, as long as the host application called `log.open()`.

**Transport lifecycle**:
- `log.open(options, user_transports)` — **async**. Closes any active transports, then instantiates and registers new ones based on the options object. Each key in `options` that matches a known transport name and has `enable: true` is activated. Transports are instantiated synchronously (so all transports and the `log` listener are live the moment `open()` returns), then each transport's `open()` is awaited for async setup. Callers needing setup complete (e.g. an established AMQP connection) before proceeding should `await log.open(...)`; not awaiting is safe — messages logged meanwhile are buffered by the transport.
- `log.close(optDone)` — removes the `log` event listener and calls `end()` on each active transport.
- Built-in transports: `console`, `syslog`, `amqp`, `stream` (in `lib/transports/`).
- Custom transports: pass a map of `{ name: TransportClass }` as the second argument to `log.open()`.

**Transport base class** (`lib/Transport.js`):
- `open()` — async hook for setup that must happen after construction (e.g. opening a network connection). The default is a no-op; `log.open()` awaits it. The `amqp` transport overrides it to establish its connection (this replaced a former `deasync` synchronous connect in the constructor).
- `filter(event)` — returns `true` if the event's level is at or above the transport's configured level.
- `chunkify(event)` — splits long messages into chunks ≤ `chunkSize`, appending `eid=<id>` to each chunk so they can be reassembled. Subclasses call this via the dispatcher; they don't need to invoke it directly.
- `log(event)` — override in subclasses to deliver a single (already chunked) event.
- `end(optDone)` — override for async teardown (e.g. draining a queue).

**Message formatting**: Arguments are formatted with [logformat](https://github.com/tcort/logformat), which converts objects to `key=value` pairs — well-suited for Splunk ingestion.

**Censorship**: `log.censor(['field', /regex/])` redacts values in both objects (before formatting) and the final formatted string (after formatting).

**`log.defaults(...args)`** — returns a new logger function that always appends the given args. Useful for per-request loggers (e.g. attaching `request_id` to every message in an Express middleware).

**Configuration files**: Loaded in order at `require` time from `./ssi-logger.conf.defaults`, `/etc/ssi-logger.conf`, `/etc/ssi-logger.conf.local`, `/usr/local/etc/ssi-logger.conf`, `/usr/local/etc/ssi-logger.conf.local`. Each file is merged over previous values via `_.merge`.

**Log levels** (highest → lowest): `EMERG`, `ALERT`, `CRIT`, `ERROR`, `WARN`, `NOTICE`, `INFO`, `DEBUG`. Defined in `lib/logLevelNames.js`. `ERR` is aliased to `ERROR`, `WARNING` to `WARN`.

## Linting

jshint is configured inline in `package.json` (`jshintConfig`). ES6, `"use strict"` required in every file, no unused variables, no bitwise operators.
