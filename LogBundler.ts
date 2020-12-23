import { makeTimer, timeDiffToNowInMs } from './precisionCounter';
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
export type TLogLevelFn = (message: string, data?: any) => ILogger;
export interface ILogger {
  readonly error: TLogLevelFn;
  readonly warn: TLogLevelFn;
  readonly info: TLogLevelFn;
}
export default class LogBundler {
  private timer: [number, number];
  private cumulativeData: TLogLevelsLogEntryDictionary = {
    info: {},
    warn: {},
    error: {}
  };
  private logger: ILogger;
  verbose: boolean = false;
  environment: string = 'development';

  constructor(options: LogBundlerConstructorOptions) {
    const { requestId, verbose = false, environment = 'development', logger } = options;

    if (!logger) this.logger = new ConsoleLogger();
    else this.logger = logger;

    this.timer = makeTimer();
    this.verbose = verbose;
    this.environment = environment;
    if (requestId) {
      this.addData('request-id', requestId, "info");
    }
  }

  get env(): string {
    return process.env.NODE_ENV ?? this.environment;
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
    if (this.verbose) transformedLevel = `verbose-${level}`;
    const data = this.toJSON(transformedLevel);

    if (['dev', 'development'].includes(this.env)) {
      // if development, always log full log contents
      const logContent = JSON.stringify(data, null, 2);
      this.logger[level](`${this.env} full ${level}:`, logContent);
    } else if (this.env === 'test') {
      // if test, omit logs
    } else {
      // if not development or test, most likely some sort of production environment, 
      // log details are based on 'verbose' property
      this.logger[level](`Full request data (level ${transformedLevel})`, data);
    }
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
  error(message: string, data?: any): ILogger {
    console.group(message);
    console.error(data);
    console.groupEnd();
    return this;
  }
  warn(message: string, data?: any): ILogger {
    console.group(message);
    console.warn(data);
    console.groupEnd();
    return this;
  }
  info(message: string, data?: any): ILogger {
    console.group(message);
    console.info(data);
    console.groupEnd();
    return this;
  }
}