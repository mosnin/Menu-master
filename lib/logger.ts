/**
 * Structured logger for Deal Desk.
 *
 * - JSON output in production (for Vercel log drains / structured search).
 * - Human-readable output in development.
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

const isProduction = process.env.NODE_ENV === 'production';

function formatDev(entry: LogEntry): string {
  const { level, message, timestamp, ...rest } = entry;
  const ctx = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';
  return `${timestamp} [${level.toUpperCase()}] ${message}${ctx}`;
}

function emit(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
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

export const logger = {
  info(message: string, context?: Record<string, unknown>) {
    emit('info', message, context);
  },
  warn(message: string, context?: Record<string, unknown>) {
    emit('warn', message, context);
  },
  error(message: string, context?: Record<string, unknown>) {
    emit('error', message, context);
  },
};
