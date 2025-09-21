const mongoose = require('mongoose');
const config = require('../config');


const connectDatabase = async () => {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(config.mongoUrl, options);
    console.log('[Database] Connected to MongoDB successfully');
    
   
    mongoose.connection.on('error', (error) => {
      console.error('[Database] MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[Database] MongoDB reconnected');
    });

    
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('[Database] MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('[Database] Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = { connectDatabase };