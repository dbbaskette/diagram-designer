export interface AppConfig {
  api: {
    baseUrl: string;
    metricsEndpoint: string;
    healthEndpoint: string;
  };
  development: {
    enableMockData: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

export const loadConfig = (): AppConfig => {
  // Determine if we're in development or production
  const isDevelopment = import.meta.env.DEV || import.meta.env.NODE_ENV === 'development';

  // Default configuration
  const defaultConfig: AppConfig = {
    api: {
      // Use localhost for development, relative URLs for production (Cloud Foundry)
      baseUrl: import.meta.env.VITE_API_URL || (isDevelopment ? 'http://localhost:3001' : '/api'),
      metricsEndpoint: '/metrics',
      healthEndpoint: '/health',
    },
    development: {
      enableMockData: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true',
      logLevel: (import.meta.env.VITE_LOG_LEVEL as AppConfig['development']['logLevel']) || 'info',
    },
  };

  return defaultConfig;
};

export const appConfig = loadConfig();

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = appConfig.api.baseUrl.endsWith('/')
    ? appConfig.api.baseUrl.slice(0, -1)
    : appConfig.api.baseUrl;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

// Helper function for metrics proxy
export const buildMetricsUrl = (targetUrl: string, nodeName?: string): string => {
  const encodedUrl = encodeURIComponent(targetUrl);
  const nodeParam = nodeName ? `&node=${encodeURIComponent(nodeName)}` : '';
  return buildApiUrl(`${appConfig.api.metricsEndpoint}?url=${encodedUrl}${nodeParam}`);
};

// Logging helper that respects log level
export const log = {
  debug: (...args: any[]) => {
    if (appConfig.development.logLevel === 'debug') {
      console.log('[DEBUG]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (['debug', 'info'].includes(appConfig.development.logLevel)) {
      console.info('[INFO]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (['debug', 'info', 'warn'].includes(appConfig.development.logLevel)) {
      console.warn('[WARN]', ...args);
    }
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
};