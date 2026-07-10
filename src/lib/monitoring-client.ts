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
  metadata?: Record<string, any>;
}

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
      errorCode: (error as any).code
    });
  }

  /**
   * Middleware for Express.js
   */
  expressMiddleware() {
    const self = this;
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();

      // Capture the original send function
      const originalSend = res.send;

      res.send = async function (this: any, data: any) {
        const responseTime = Date.now() - startTime;
        const statusCode = res.statusCode;
        const method = req.method;
        const endpoint = req.path;
        const userId = req.user?.id;

        // Send to monitoring
        try {
          await self.logRequest(endpoint, method, statusCode, responseTime, userId);
        } catch (error) {
          console.error('Failed to log request:', error);
        }

        // Call original send
        return originalSend.call(this, data);
      };

      next();
    };
  }

  /**
   * Error handler for Express.js
   */
  expressErrorHandler() {
    const self = this;
    return async (err: Error, req: any, res: any, next: any) => {
      const responseTime = Date.now() - req.startTime;

      try {
        await self.logException(err, {
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
