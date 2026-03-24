type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: number;

  constructor() {
    const envLevel = (process.env.LOG_LEVEL ?? 'info') as LogLevel;
    this.level = LOG_LEVELS[envLevel] ?? LOG_LEVELS.info;
  }

  debug(message: string, data?: Record<string, unknown>): void {
    if (this.level <= LOG_LEVELS.debug) {
      this.log('debug', message, data);
    }
  }

  info(message: string, data?: Record<string, unknown>): void {
    if (this.level <= LOG_LEVELS.info) {
      this.log('info', message, data);
    }
  }

  warn(message: string, data?: Record<string, unknown>): void {
    if (this.level <= LOG_LEVELS.warn) {
      this.log('warn', message, data);
    }
  }

  error(message: string, data?: Record<string, unknown>): void {
    if (this.level <= LOG_LEVELS.error) {
      this.log('error', message, data);
    }
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    if (data) {
      console[level === 'debug' ? 'log' : level](`${prefix} ${message}`, data);
    } else {
      console[level === 'debug' ? 'log' : level](`${prefix} ${message}`);
    }
  }
}

export const logger = new Logger();
