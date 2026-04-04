/**
 * Structured logger for Deal Desk.
 *
 * - JSON output in production (for Vercel log drains / structured search).
 * - Human-readable output in development.
 * - `child()` creates a scoped logger with persistent context fields.
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  /** Create a child logger with persistent context fields. */
  child(context: Record<string, unknown>): Logger;
}

const isProduction = process.env.NODE_ENV === 'production';

function formatDev(entry: LogEntry): string {
  const { level, message, timestamp, ...rest } = entry;
  const ctx = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';
  return `${timestamp} [${level.toUpperCase()}] ${message}${ctx}`;
}

function emit(
  level: LogLevel,
  message: string,
  baseContext: Record<string, unknown>,
  extra?: Record<string, unknown>,
) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...baseContext,
    ...extra,
  };

  const output = isProduction ? JSON.stringify(entry) : formatDev(entry);

  switch (level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

function createLogger(baseContext: Record<string, unknown> = {}): Logger {
  return {
    info(message: string, context?: Record<string, unknown>) {
      emit('info', message, baseContext, context);
    },
    warn(message: string, context?: Record<string, unknown>) {
      emit('warn', message, baseContext, context);
    },
    error(message: string, context?: Record<string, unknown>) {
      emit('error', message, baseContext, context);
    },
    child(context: Record<string, unknown>): Logger {
      return createLogger({ ...baseContext, ...context });
    },
  };
}

export const logger = createLogger();
