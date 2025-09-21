const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config');
const { connectDatabase } = require('./config/database');
const urlRoutes = require('./routes/urlRoutes');
const { errorHandler, notFoundHandler, requestLogger } = require('./middleware/errorHandler');
const { generalLimiter, createUrlLimiter, redirectLimiter } = require('./middleware/rateLimiter');


const app = express();


app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

/**
 * CORS configuration
 */
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true,
  optionsSuccessStatus: 200
}));

/**
 * Body parsing middleware
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Logging middleware
 */
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(requestLogger);

/**
 * Rate limiting
 */
app.use(generalLimiter);

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: require('../package.json').version
  });
});

/**
 * API documentation endpoint
 */
app.get('/api/docs', (req, res) => {
  res.json({
    name: 'URL Shortener Microservice',
    version: require('../package.json').version,
    description: 'A production-ready URL shortener service',
    endpoints: {
      'POST /shorturls': {
        description: 'Create a short URL',
        body: {
          url: 'string (required) - Full URL with protocol',
          validity: 'number (optional) - Validity in minutes, default 30',
          shortcode: 'string (optional) - Custom shortcode (4-20 chars, alphanumeric)'
        },
        responses: {
          201: { shortLink: 'string', expiry: 'ISO8601 timestamp' },
          400: { message: 'string' },
          409: { message: 'string' },
          500: { message: 'string' }
        }
      },
      'GET /:shortcode': {
        description: 'Redirect to original URL',
        responses: {
          302: 'Redirect to original URL',
          404: { message: 'shortcode not found' },
          410: { message: 'link expired' },
          500: { message: 'string' }
        }
      },
      'GET /shorturls/:shortcode': {
        description: 'Get statistics for a shortcode',
        query: {
          page: 'number (optional) - Page number, default 1',
          limit: 'number (optional) - Items per page, default 50, max 1000'
        },
        responses: {
          200: {
            shortcode: 'string',
            originalUrl: 'string',
            createdAt: 'Date',
            expiry: 'Date',
            totalClicks: 'number',
            clicks: 'array'
          },
          404: { message: 'shortcode not found' },
          500: { message: 'string' }
        }
      }
    }
  });
});

/**
 * Apply specific rate limiters to routes
 */
app.use('/shorturls', createUrlLimiter);
app.use('/:shortcode', redirectLimiter);

/**
 * Mount routes
 */
app.use('/', urlRoutes);

/**
 * 404 handler
 */
app.use(notFoundHandler);

/**
 * Global error handler
 */
app.use(errorHandler);

/**
 * Start server
 */
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    
    // Start HTTP server
    const server = app.listen(config.port, () => {
      console.log(`[Server] URL Shortener service running on port ${config.port}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`[Server] Hostname: ${config.hostname}`);
      console.log(`[Server] Health check: ${config.hostname}/health`);
      console.log(`[Server] API docs: ${config.hostname}/api/docs`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`[Server] Received ${signal}, shutting down gracefully...`);
      
      server.close(() => {
        console.log('[Server] HTTP server closed');
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        console.error('[Server] Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('[Server] Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;