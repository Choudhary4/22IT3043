const rateLimit = require('express-rate-limit');
const config = require('../config');


const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
});


const createUrlLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 10, 
  message: {
    message: 'Too many URL creation requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
});


const redirectLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 100,
  message: {
    message: 'Too many redirect requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
});

module.exports = {
  generalLimiter,
  createUrlLimiter,
  redirectLimiter
};