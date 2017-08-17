
"use strict";

const _ = require('lodash');

function filterObjects(obj, patterns) {
    const objects_seen = [];

    function clone(value, key, obj, stack) {
        if (value === undefined) {
            // Explicitly undefined value for key.
            return "[undefined]";
        } else if (value === -Infinity) {
            // JSON.stringify() replaces this by null.
            return "[-Infinity]";
        } else if (value === Infinity) {
            // JSON.stringify() replaces this by null.
            return "[Infinity]";
        } else if (_.isNaN(value)) {
            // JSON.stringify() replaces this by null.
            return "[NaN]";
        } else if (_.isError(value)) {
            // Create a copy of the error exposing non-enumerable keys
            // of interest plus any added extras.
            const errCopy = {};
            ['name', 'message', 'description', 'number', 'fileName', 'lineNumber', 'columnNumber'].forEach((key) => {
                if (value[key] !== undefined) {
                    errCopy[key] = value[key]
                }
            });
            _.keys(value).forEach((key) => {
                errCopy[key] = _.cloneDeepWith(value[key], clone);
            });

            return errCopy;
        } else if (_.isFunction(value)) {
            // JSON.stringify() replaces this by [Function] without a name.
            return `[function ${value.name}]`;
        } else if (_.isRegExp(value)) {
            // JSON.stringify() replaces this by {}.
            return `/${value.source}/`;
        } else if (_.isObjectLike(value)) {
             if (objects_seen.indexOf(value) !== -1) {
                return "[circular]";
            }
            objects_seen.push(value);
        } else {
            if (_.some(patterns, (pat) => (pat instanceof RegExp && pat.test(key)) || pat === key)) {
                return "[redacted]";
            }
        }
        return undefined;
    }

    return _.cloneDeepWith(obj, clone);
}

module.exports = filterObjects;
