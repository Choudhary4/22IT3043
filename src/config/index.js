require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017/urlshortener',
  hostname: process.env.HOSTNAME || 'http://localhost:3000',
  
  
  logging: {
    authUrl: process.env.LOG_AUTH_URL,
    logsUrl: process.env.LOGS_URL,
    accessCode: process.env.LOG_ACCESS_CODE,
    clientId: process.env.LOG_CLIENT_ID,
    clientSecret: process.env.LOG_CLIENT_SECRET,
    email: process.env.LOG_EMAIL,
    name: process.env.LOG_NAME,
    rollNo: process.env.LOG_ROLLNO
  },

 
  shortcode: {
    defaultLength: 6,
    minCustomLength: 4,
    maxCustomLength: 20,
    maxRetries: 5,
    base62Chars: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  },

 
  defaultValidityMinutes: 30,

  
  rateLimit: {
    windowMs: 15 * 60 * 1000, 
    max: 100 
  }
};

module.exports = config;