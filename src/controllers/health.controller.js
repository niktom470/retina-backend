const axios = require('axios');

// ─── GET /api/health ──────────────────────────────────────────────────────────
const getHealth = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend is running',
    timestamp: new Date().toISOString(),
  });
};

// ─── GET /api/health/ml ───────────────────────────────────────────────────────
const getMlHealth = async (req, res) => {
  const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';

  try {
    const response = await axios.get(`${mlServiceUrl}/health`, {
      timeout: 5000,
    });

    res.status(200).json({
      success: true,
      mlService: 'healthy',
      mlResponse: response.data,
    });
  } catch (error) {
    let reason = error.message;
    if (error.code === 'ECONNREFUSED') {
      reason = 'Connection refused — is the FastAPI service running?';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      reason = 'ML service did not respond within 5 seconds.';
    }

    res.status(503).json({
      success: false,
      mlService: 'unavailable',
      reason,
    });
  }
};

module.exports = { getHealth, getMlHealth };
