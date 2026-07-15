import pino from 'pino';

function getDevTransport(): pino.TransportSingleOptions | undefined {
  if (process.env.NODE_ENV !== 'development') {
    return undefined;
  }

  try {
    require.resolve('pino-pretty');
    return {
      target: 'pino-pretty',
      options: { colorize: true },
    };
  } catch {
    return undefined;
  }
}

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(getDevTransport()
    ? {
        transport: getDevTransport(),
      }
    : {}),
});

export default logger;
