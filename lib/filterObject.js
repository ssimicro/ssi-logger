
"use strict";

const _ = require('lodash');

function filterObjects(obj, patterns) {
    const objects_seen = [];
    return _.cloneDeepWith(obj, function (value, key, obj, stack) {
        if (value === null) {
            return "[null]";
        } else if (value === undefined) {
            return "[undefined]";
        } else if (value === Infinity) {
            return "[Infinity]";
        } else if (_.isNaN(value)) {
            return "[NaN]";
        } else if (_.isDate(value)) {
            return value.toISOString();
        } else if (_.isError(value)) {
            return `[${value.name} ${value.message}]`;
        } else if (_.isFunction(value)) {
            return `[function ${value.name}]`;
        } else if (_.isRegExp(value)) {
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
    });
}

module.exports = filterObjects;
