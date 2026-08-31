const axios = require('axios');
const FormData = require('form-data');

/**
 * POST /api/predict
 *
 * Flow:
 *  1. JWT validated by `protect` middleware (req.userId available)
 *  2. Image received via Multer memoryStorage (req.file)
 *  3. Image forwarded to FastAPI /predict as multipart/form-data
 *  4. FastAPI response preserved and returned to client
 *
 * FastAPI contract (defaults, adjust ML_SERVICE_URL in .env):
 *  - Endpoint : POST /predict
 *  - Field    : "file"  (image/jpeg or image/png)
 *  - Response : { class_name, confidence, heatmap_base64, processing_time_ms }
 */
const predict = async (req, res, next) => {
  try {
    // ── 1. Validate image ──────────────────────────────────────────────────
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image provided. Please upload a fundus image (JPEG or PNG).',
      });
    }

    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    const mlPredictEndpoint = `${mlServiceUrl}/predict`;

    // ── 2. Build multipart/form-data payload ───────────────────────────────
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || 'fundus.jpg',
      contentType: req.file.mimetype,
    });

    // ── 3. Forward to FastAPI ──────────────────────────────────────────────
    let mlResponse;
    try {
      mlResponse = await axios.post(mlPredictEndpoint, form, {
        headers: {
          ...form.getHeaders(),
        },
        // 60-second timeout to account for GPU inference time
        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
    } catch (axiosError) {
      // FastAPI is not reachable — 503 Service Unavailable
      // (502 Bad Gateway is reserved for when FastAPI responds but with an error)
      if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
        return res.status(503).json({
          success: false,
          message:
            'ML service is unavailable. Please ensure the FastAPI service is running on port 8000.',
        });
      }

      if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ECONNABORTED') {
        return res.status(504).json({
          success: false,
          message: 'ML service timed out while processing the image.',
        });
      }

      // FastAPI returned a non-2xx response
      if (axiosError.response) {
        return res.status(502).json({
          success: false,
          message: `ML service returned an error: ${
            axiosError.response.data?.detail ||
            axiosError.response.data?.message ||
            axiosError.response.statusText
          }`,
          mlStatus: axiosError.response.status,
        });
      }

      throw axiosError; // let the generic error handler deal with it
    }

    // ── 4. Return the ML response to the client ────────────────────────────
    // Preserve the FastAPI response shape exactly so the React frontend
    // does not need to change its field references.
    res.status(200).json({
      success: true,
      ...mlResponse.data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { predict };
