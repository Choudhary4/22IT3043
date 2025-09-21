
const errorHandler = (err, req, res, next) => {
  console.error('[ErrorHandler] Unhandled error:', err);

  
  let status = 500;
  let message = 'Internal server error';

 
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation error';
    
  
    if (err.errors) {
      const errors = Object.keys(err.errors).map(key => ({
        field: key,
        message: err.errors[key].message
      }));
      return res.status(status).json({
        message,
        errors
      });
    }
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid data format';
  } else if (err.code === 11000) {
    status = 409;
    message = 'Duplicate entry';
  } else if (err.statusCode) {
    status = err.statusCode;
    message = err.message;
  }

  res.status(status).json({ message });
};


const notFoundHandler = (req, res) => {
  res.status(404).json({
    message: 'Route not found'
  });
};


const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[Request] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
};

module.exports = {
  errorHandler,
  notFoundHandler,
  requestLogger
};