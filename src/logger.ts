/**
 * Simple logging utility for the MCP server
 * Logs to stderr to avoid interfering with MCP protocol on stdout
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private static level: LogLevel = LogLevel.INFO;

  static setLevel(level: LogLevel): void {
    this.level = level;
  }

  static debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      this.log('DEBUG', message, ...args);
    }
  }

  static info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      this.log('INFO', message, ...args);
    }
  }

  static warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      this.log('WARN', message, ...args);
    }
  }

  static error(message: string, error?: any, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      this.log('ERROR', message, error, ...args);
    }
  }

  private static log(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;

    if (args.length > 0) {
      console.error(formattedMessage, ...args);
    } else {
      console.error(formattedMessage);
    }
  }
}
