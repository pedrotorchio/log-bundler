"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeDiffToNowInMs = exports.makeTimer = void 0;
function makeTimer() {
    return process.hrtime();
}
exports.makeTimer = makeTimer;
function timeDiffToNowInMs(previousCounter) {
    var NS_PER_SEC = 1e9;
    var NS_TO_MS = 1e6;
    var diff = process.hrtime(previousCounter);
    return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS;
}
exports.timeDiffToNowInMs = timeDiffToNowInMs;
