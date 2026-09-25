/**
 * VerifiedBizLink Monitoring Client
 * Use this in your apps to send logs to the centralized monitoring system
 *
 * Usage:
 * const monitor = new MonitoringClient('vbz_your_api_key', 'your-app-name');
 * monitor.error('Something went wrong', { userId: '123' });
 */

interface LogOptions {
  userId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTimeMs?: number;
  errorCode?: string;
  errorStack?: string;
  metadata?: Record<string, unknown>;
}

// Minimal structural types, so this file does not depend on @types/express.
interface ExpressLikeRequest {
  method: string;
  path: string;
  user?: { id?: string };
  startTime?: number;
}
interface ExpressLikeResponse {
  statusCode: number;
  send: (body?: unknown) => unknown;
}
type ExpressNext = (err?: unknown) => void;

export class MonitoringClient {
  private apiKey: string;
  private appName: string;
  private endpoint: string;
  private environment: string;

  constructor(
    apiKey: string,
    appName: string,
    environment: string = 'production',
    endpoint: string = 'https://verifiedbizlink.co.za/api/logs/ingest'
  ) {
    if (!apiKey) {
      throw new Error('API key is required for MonitoringClient');
    }
    if (!appName) {
      throw new Error('App name is required for MonitoringClient');
    }

    this.apiKey = apiKey;
    this.appName = appName;
    this.environment = environment;
    this.endpoint = endpoint;
  }

  /**
   * Send a log to the monitoring system
   */
  private async sendLog(
    logLevel: string,
    message: string,
    options: LogOptions = {}
  ): Promise<Response> {
    const payload = {
      appName: this.appName,
      environment: this.environment,
      logLevel,
      message,
      userId: options.userId,
      endpoint: options.endpoint,
      method: options.method,
      statusCode: options.statusCode,
      responseTimeMs: options.responseTimeMs,
      errorCode: options.errorCode,
      errorStack: options.errorStack,
      metadata: options.metadata || {}
    };

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error(`Failed to send log: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error('Failed to send log to monitoring system:', error);
      throw error;
    }
  }

  /**
   * Log an info message
   */
  async info(message: string, options?: LogOptions): Promise<Response> {
    return this.sendLog('INFO', message, options);
  }

  /**
   * Log a warning
   */
  async warn(message: string, options?: LogOptions): Promise<Response> {
    return this.sendLog('WARN', message, options);
  }

  /**
   * Log an error
   */
  async error(message: string, options?: LogOptions): Promise<Response> {
    return this.sendLog('ERROR', message, options);
  }

  /**
   * Log a fatal error
   */
  async fatal(message: string, options?: LogOptions): Promise<Response> {
    return this.sendLog('FATAL', message, options);
  }

  /**
   * Log a debug message
   */
  async debug(message: string, options?: LogOptions): Promise<Response> {
    return this.sendLog('DEBUG', message, options);
  }

  /**
   * Log an HTTP request/response
   */
  async logRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTimeMs: number,
    userId?: string,
    errorMessage?: string
  ): Promise<Response> {
    const logLevel = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';

    return this.sendLog(logLevel, errorMessage || `${method} ${endpoint} - ${statusCode}`, {
      endpoint,
      method,
      statusCode,
      responseTimeMs,
      userId
    });
  }

  /**
   * Log an exception
   */
  async logException(
    error: Error,
    context?: LogOptions
  ): Promise<Response> {
    return this.sendLog('ERROR', error.message, {
      ...context,
      errorStack: error.stack,
      errorCode: (error as Error & { code?: string }).code
    });
  }

  /**
   * Middleware for Express.js
   */
  expressMiddleware() {
    const logRequest = this.logRequest.bind(this);
    return (req: ExpressLikeRequest, res: ExpressLikeResponse, next: ExpressNext) => {
      const startTime = Date.now();
      // Read by expressErrorHandler, which previously got undefined here and
      // reported NaN response times.
      req.startTime = startTime;

      // Capture the original send function
      const originalSend = res.send;

      // Synchronous on purpose. This used to be async and await the log call
      // first, which held every response until monitoring answered and made
      // res.send() return a Promise instead of the response Express expects.
      res.send = function (this: unknown, data?: unknown) {
        const responseTime = Date.now() - startTime;
        logRequest(req.path, req.method, res.statusCode, responseTime, req.user?.id)
          .catch((error) => console.error('Failed to log request:', error));
        return originalSend.call(this, data);
      };

      next();
    };
  }

  /**
   * Error handler for Express.js
   */
  expressErrorHandler() {
    return async (err: Error, req: ExpressLikeRequest, _res: ExpressLikeResponse, next: ExpressNext) => {
      const responseTime = req.startTime ? Date.now() - req.startTime : undefined;

      try {
        await this.logException(err, {
          endpoint: req.path,
          method: req.method,
          statusCode: 500,
          responseTimeMs: responseTime,
          userId: req.user?.id
        });
      } catch (error) {
        console.error('Failed to log error:', error);
      }

      // Continue with error handling
      next(err);
    };
  }
}

/**
 * Global instance (optional)
 */
let globalMonitor: MonitoringClient | null = null;

export function initMonitoring(
  apiKey: string,
  appName: string,
  environment?: string
): MonitoringClient {
  globalMonitor = new MonitoringClient(apiKey, appName, environment);
  return globalMonitor;
}

export function getMonitoring(): MonitoringClient {
  if (!globalMonitor) {
    throw new Error('Monitoring client not initialized. Call initMonitoring() first.');
  }
  return globalMonitor;
}

export default MonitoringClient;
