"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var precisionCounter_1 = require("./precisionCounter");
var LogBundler = /** @class */ (function () {
    function LogBundler(options) {
        this.cumulativeData = {
            info: {},
            warn: {},
            error: {}
        };
        this.verbose = false;
        this.environment = 'development';
        var requestId = options.requestId, _a = options.verbose, verbose = _a === void 0 ? false : _a, _b = options.environment, environment = _b === void 0 ? 'development' : _b, logger = options.logger;
        if (!logger)
            this.logger = new ConsoleLogger();
        else
            this.logger = logger;
        this.timer = precisionCounter_1.makeTimer();
        this.verbose = verbose;
        this.environment = environment;
        if (requestId) {
            this.addData('request-id', requestId, "info");
        }
    }
    Object.defineProperty(LogBundler.prototype, "env", {
        get: function () {
            var _a;
            return (_a = process.env.NODE_ENV) !== null && _a !== void 0 ? _a : this.environment;
        },
        enumerable: false,
        configurable: true
    });
    LogBundler.prototype.addData = function (key, value, level) {
        if (level === void 0) { level = 'info'; }
        var existing = this.cumulativeData[level][key];
        if (!!existing) {
            existing.add(value);
        }
        else {
            this.cumulativeData[level][key] = new LoggerEntry(value);
        }
        return this;
    };
    LogBundler.prototype.toJSON = function (level) {
        var _this = this;
        var objectify = function (carry, entry) {
            var key = entry[0], value = entry[1];
            carry[key] = value.content;
            return carry;
        };
        var getContentFromLogs = function (dictionary) {
            var entries = Object.entries(dictionary);
            var content = entries.reduce(objectify, {});
            return content;
        };
        var timerNow = precisionCounter_1.timeDiffToNowInMs(this.timer);
        var selectedLevels = [];
        switch (level) {
            case 'info':
                selectedLevels = ['info'];
                break;
            case 'warn':
                selectedLevels = ['info', 'warn'];
                break;
            case 'error':
            default:
                selectedLevels = ['info', 'warn', 'error'];
                break;
        }
        var logData = selectedLevels.reduce(function (carry, lvl) {
            var lvlData = _this.cumulativeData[lvl];
            return __assign(__assign({}, carry), lvlData);
        }, {
            "status": new LoggerEntry(level),
            "time-elapsed-ms": new LoggerEntry(timerNow)
        });
        var content = getContentFromLogs(logData);
        return content;
    };
    LogBundler.prototype.dump = function (level) {
        if (level === void 0) { level = 'info'; }
        var transformedLevel = level;
        if (this.verbose)
            transformedLevel = "verbose-" + level;
        var data = this.toJSON(transformedLevel);
        if (['dev', 'development'].includes(this.env)) {
            // if development, always log full log contents
            var logContent = JSON.stringify(data, null, 2);
            this.logger[level](this.env + " full " + level + ":", logContent);
        }
        else if (this.env === 'test') {
            // if test, omit logs
        }
        else {
            // if not development or test, most likely some sort of production environment, 
            // log details are based on 'verbose' property
            this.logger[level]("Full request data (level " + transformedLevel + ")", data);
        }
    };
    return LogBundler;
}());
exports.default = LogBundler;
var LoggerEntry = /** @class */ (function () {
    function LoggerEntry(content) {
        this.content = content;
        this.isMultiple = false;
    }
    LoggerEntry.prototype.add = function (value) {
        if (!this.isMultiple) {
            this.isMultiple = true;
            this.content = [this.content];
        }
        this.content.push(value);
    };
    LoggerEntry.prototype.toJSON = function () {
        return this.content;
    };
    LoggerEntry.prototype.toString = function () {
        return this.content;
    };
    return LoggerEntry;
}());
var ConsoleLogger = /** @class */ (function () {
    function ConsoleLogger() {
    }
    ConsoleLogger.prototype.error = function (message, data) {
        console.group(message);
        console.error(data);
        console.groupEnd();
        return this;
    };
    ConsoleLogger.prototype.warn = function (message, data) {
        console.group(message);
        console.warn(data);
        console.groupEnd();
        return this;
    };
    ConsoleLogger.prototype.info = function (message, data) {
        console.group(message);
        console.info(data);
        console.groupEnd();
        return this;
    };
    return ConsoleLogger;
}());
