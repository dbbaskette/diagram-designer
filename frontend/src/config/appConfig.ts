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
  // Default configuration
  const defaultConfig: AppConfig = {
    api: {
      baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
      metricsEndpoint: '/api/metrics',
      healthEndpoint: '/api/health',
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
export const buildMetricsUrl = (targetUrl: string): string => {
  const encodedUrl = encodeURIComponent(targetUrl);
  return buildApiUrl(`${appConfig.api.metricsEndpoint}?url=${encodedUrl}`);
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