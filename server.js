const { app, connectDB } = require('./src/app');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const https = require('https');
const http = require('http');
const fs = require('fs');

// Connect to database
connectDB();

// Start server
const PORT = config.port;
let server;

// Check if HTTPS is enabled and certificates are available
const useHttps = process.env.USE_HTTPS === 'true';
const sslKeyPath = process.env.SSL_KEY_PATH;
const sslCertPath = process.env.SSL_CERT_PATH || process.env.SSL_FULLCHAIN_PATH;

if (useHttps && sslKeyPath && sslCertPath) {
  try {
    // Check if certificate files exist
    if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
      const options = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath)
      };
      
      server = https.createServer(options, app);
      logger.info(`SSL certificates loaded from ${sslCertPath}`);
    } else {
      logger.warn('SSL enabled but certificate files not found. Falling back to HTTP.');
      logger.warn(`Key path: ${sslKeyPath}`);
      logger.warn(`Cert path: ${sslCertPath}`);
      server = http.createServer(app);
    }
  } catch (error) {
    logger.error('Error loading SSL certificates. Falling back to HTTP.', { error: error.message });
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
}

server.listen(PORT, () => {
  const protocol = useHttps && server instanceof https.Server ? 'HTTPS' : 'HTTP';
  logger.info(`Server running in ${config.nodeEnv} mode on ${protocol} port ${PORT}`);
  if (config.baseUrl) {
    logger.info(`Server accessible at: ${config.baseUrl}`);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Promise Rejection', { error: err.message, stack: err.stack });
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

