export type {
  LogBundlerConstructorOptions,
  TLogLevel,
  TLogEntryTuple,
  TLogEntryDictionary,
  TLogLevelsLogEntryDictionary,
  TLogLevelFn,
  ILogger,
  LoggerEntry,
  ConsoleLogger
} from './LogBundler';

export {
  default as LogBundler,
} from './LogBundler';

export {
  makeTimer,
  timeDiffToNowInMs
} from './precisionCounter';