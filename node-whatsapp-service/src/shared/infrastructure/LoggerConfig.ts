export interface LoggerConfig {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  enableColors: boolean;
  enableTimestamps: boolean;
  enableContext: boolean;
  maxContextDepth: number;
}

export const defaultLoggerConfig: LoggerConfig = {
  level: process.env.LOG_LEVEL as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' || 'INFO',
  enableColors: process.env.LOG_COLORS !== 'false',
  enableTimestamps: process.env.LOG_TIMESTAMPS !== 'false',
  enableContext: process.env.LOG_CONTEXT !== 'false',
  maxContextDepth: parseInt(process.env.LOG_MAX_CONTEXT_DEPTH || '3')
};

export const getLoggerConfig = (): LoggerConfig => {
  return { ...defaultLoggerConfig };
};
