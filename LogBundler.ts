import { JsonValue } from 'type-fest';
import now from 'performance-now';

export type LogBundlerConstructorOptions = {
  requestId?: string,
  verbose?: boolean,
  environment?: string,
  logger?: ILogger
};
export type TLogLevel = 'info' | 'warn' | 'error' | 'verbose';
export type TLogEntryTuple<TLogType> = [string, TLogType];
export type TLogEntryDictionary<TLogType> = { [key: string]: TLogType };
export type TLogLevelsLogEntryDictionary<TLogType = LoggerEntry> = { [level in TLogLevel]?: TLogEntryDictionary<TLogType> };
export type TLogLevelFn = (message: string, data?: any) => any;
export interface ILogger {
  readonly error: TLogLevelFn;
  readonly warn: TLogLevelFn;
  readonly info: TLogLevelFn;
}
const isDev = (env: string) => ['development', 'dev'].includes(env);
const isTest = (env: string) => ['test', 'testing'].includes(env);
export default class LogBundler {
  private timer: number;
  private lastTimestamp: number;
  private cumulativeData: TLogLevelsLogEntryDictionary = {
    info: {},
    warn: {},
    error: {}
  };
  private logger: ILogger;
  verbose: boolean = false;
  environment: string;


  constructor(options: LogBundlerConstructorOptions = {}) {
    const { requestId, verbose = false, environment, logger } = options;

    this.timer = now();
    this.lastTimestamp = this.timer;
    this.verbose = verbose;
    this.environment = environment ?? process.env.NODE_ENV ?? 'development';

    // logger will only be injectable if env is production, otherwise it will use a basic console logger
    // if there's no injected logger it will also use native basic console logger
    if (!logger) this.logger = new ConsoleLogger(isDev(this.environment));
    else this.logger = isDev(this.environment) ? new ConsoleLogger(true) : logger;

    if (requestId) {
      this.addData('request-id', requestId, "info");
    }
  }

  addData(key: string, value: any, level: TLogLevel = 'info') {
    const existing = this.cumulativeData[level]![key];
    if (!!existing) {
      existing.add(value);
    } else {
      this.cumulativeData[level]![key] = new LoggerEntry(value);
    }
    return this;
  }
  addTimestamp(key: string) {
    const nowTime = now();
    const diff = (baseTime: number) => (nowTime - baseTime).toFixed(2);
    const saveNowTime = () => this.lastTimestamp = nowTime;

    this.addData(`Timestamp: ${key}`, `${diff(this.lastTimestamp)}ms since last timestamp, ${diff(this.timer)}ms since start`, 'info');
    saveNowTime();
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
    const timerNow = now() - this.timer;

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
    if (this.verbose) transformedLevel = `verbose-${level}`;
    const data = this.toJSON(transformedLevel);

    if (isDev(this.environment)) {
      // if development, always log full log contents
      const logContent = LogBundler.stringify(data);
      this.logger[level](`${this.environment} full ${level}:`, logContent);
    } else if (!isTest(this.environment)) {
      // if not development or test, most likely some sort of production environment, 
      // log details are based on 'verbose' property
      this.logger[level](`production ${this.verbose ? 'verbose' : 'compact'} ${level}`, data);
    }
  }

  static stringify(data: JsonValue): string {
    return JSON.stringify(data, null, 2);
  }
}

export class LoggerEntry {
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

export class ConsoleLogger implements ILogger {
  private console = {
    group: console.group ?? ((data: string) => console.log(`-- -- start ${data}`)),
    groupEnd: console.groupEnd ?? ((data: string) => console.log(`-- -- end ${data}`)),
    error: console.error ?? ((data: string) => console.log('-- error\n', data)),
    warn: console.warn ?? ((data: string) => console.log('-- warn\n', data)),
    info: console.info ?? ((data: string) => console.log('-- info\n', data))
  };

  constructor(private group: boolean) { }

  error(message: string, data?: any): ILogger {
    if (this.group) this.console.group(message);
    this.console.error(data);
    if (this.group) this.console.groupEnd();
    return this;
  }
  warn(message: string, data?: any): ILogger {
    if (this.group) this.console.group(message);
    this.console.warn(data);
    if (this.group) this.console.groupEnd();
    return this;
  }
  info(message: string, data?: any): ILogger {
    if (this.group) this.console.group(message);
    this.console.info(data);
    if (this.group) this.console.groupEnd();
    return this;
  }
}