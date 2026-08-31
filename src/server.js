// Load environment variables FIRST before any other imports
require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // 1. Connect to MongoDB — exits on failure
  await connectDB();

  // 2. Start HTTP server only after DB is ready
  app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════');
    console.log(`🚀 SIH DR Screening Backend`);
    console.log(`   Server   : http://localhost:${PORT}`);
    console.log(`   Health   : http://localhost:${PORT}/api/health`);
    console.log(`   ML Proxy : http://localhost:${PORT}/api/predict`);
    console.log(`   Env      : ${process.env.NODE_ENV}`);
    console.log('═══════════════════════════════════════════════');
  });
};

// Catch unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  process.exit(1);
});

startServer();
