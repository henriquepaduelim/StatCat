/**
 * Conditional logger that only logs in development mode
 * Prevents console pollution in production
 */

const isDevelopment = import.meta.env.MODE === 'development';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  error: (...args: unknown[]) => {
    if (isDevelopment) {
      console.error(...args);
    }
  },
  
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
};

// For production error tracking, you can integrate services like Sentry here
export const logError = (error: Error, context?: Record<string, unknown>) => {
  if (isDevelopment) {
    console.error('Error:', error, 'Context:', context);
  } else {
    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // Example: Sentry.captureException(error, { extra: context });
  }
};
