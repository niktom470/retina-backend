const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the MONGO_URI environment variable.
 * Non-fatal: the server starts even if MongoDB is unavailable.
 * Auth routes will be degraded; the ML proxy route is unaffected.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,  // fail fast instead of hanging
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`⚠️  MongoDB unavailable: ${error.message}`);
    console.warn('   Server will start without DB — auth routes degraded.');
    // Do NOT exit; allow the ML proxy to function independently
  }
};

module.exports = connectDB;
