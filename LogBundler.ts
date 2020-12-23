
import logger from 'json-log';
import { makeTimer, timeDiffToNowInMs } from './precisionCounter';
export type TSingleRequestLogger = {
  requestId?: string
};
export type TLogLevel = 'info' | 'warn' | 'error' | 'verbose';
export type TLogEntryTuple<TLogType> = [string, TLogType];
export type TLogEntryDictionary<TLogType> = { [key: string]: TLogType };
export type TLogLevelsLogEntryDictionary<TLogType = LoggerEntry> = { [level in TLogLevel]?: TLogEntryDictionary<TLogType> };
export default class LogBundler {
  private timer: [number, number];
  private cumulativeData: TLogLevelsLogEntryDictionary = {
    info: {},
    warn: {},
    error: {}
  };
  constructor(options: TSingleRequestLogger = {}) {
    const { requestId } = options;
    this.timer = makeTimer();
    if (requestId) {
      this.addData('request-id', requestId, "info");
    }
  }

  addData(key: string, value: any, level: string = 'info') {
    const existing = this.cumulativeData[level][key];
    if (!!existing) {
      existing.add(value);
    } else {
      this.cumulativeData[level][key] = new LoggerEntry(value);
    }
    return this;
  }
  toJSON(level: string): TLogEntryDictionary<any> {

    const objectify = (carry: TLogEntryDictionary<LoggerEntry>, entry: [string, LoggerEntry]) => {
      const [key, value] = entry;
      carry[key] = value.content;
      return carry;
    };
    const getContentFromLogs = (dictionary: TLogEntryDictionary<LoggerEntry>) => {
      const entries = Object.entries(dictionary);
      const content = entries.reduce(objectify, {});
      return content;
    };
    const timerNow = timeDiffToNowInMs(this.timer);

    let selectedLevels: string[] = [];
    switch (level) {
      case 'info': selectedLevels = ['info']; break;
      case 'warn': selectedLevels = ['info', 'warn']; break;
      case 'error': default: selectedLevels = ['info', 'warn', 'error']; break;
    }
    const logData = selectedLevels.reduce((carry, lvl) => {
      const lvlData = this.cumulativeData[lvl];
      return {
        ...carry,
        ...lvlData
      };
    }, {
      "status": new LoggerEntry(level),
      "time-elapsed-ms": new LoggerEntry(timerNow)
    });

    const content = getContentFromLogs(logData);
    return content;
  }
  dump(level: TLogLevel = 'info') {
    let transformedLevel: string = level;
    if (getEnv().VERBOSE) transformedLevel = `verbose-${level}`;
    const data = this.toJSON(transformedLevel);

    if (getEnv().NODE_ENV === 'production') {
      logger[level](`Full request data (level ${transformedLevel})`, data);
    } else if (getEnv().NODE_ENV === 'test') {

    } else {
      const logContent = JSON.stringify(data, null, 2);
      console.log(`--- ${transformedLevel}`, logContent);
    }
  }
}

class LoggerEntry {
  public isMultiple: boolean = false;
  constructor(public content: any) { }
  add(value: any) {
    if (!this.isMultiple) {
      this.isMultiple = true;
      this.content = [this.content];
    }
    (this.content as any[]).push(value);
  }
  toJSON() {
    return this.content;
  }
  toString() {
    return this.content;
  }
}