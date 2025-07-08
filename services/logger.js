const winston = require('winston');
const config = require('../loaders/config'); // Adjust path if needed

const { transports, format } = winston;

// Custom log format
const print = format.printf(({ level, message, timestamp, stack }) => {
  const baseLog = `${timestamp} ${level.toUpperCase()}: ${message}`;
  return stack ? `${baseLog}\n${stack}` : baseLog;
});

// Use log level from config or fallback to 'info'
const logLevelConsole = config.logLevel || 'info';

const logger = winston.createLogger({
  level: logLevelConsole,
  format: format.combine(
    format.errors({ stack: true }),             // Capture error stack traces
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Add timestamps
    print
  ),
  transports: [
    new transports.Console()
  ]
});

// Stream interface for morgan logging
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

module.exports = logger;
