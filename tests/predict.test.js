/**
 * tests/predict.test.js
 *
 * Tests the POST /api/predict endpoint.
 * axios is mocked so no real FastAPI service is needed.
 * JWT is signed with the test secret so the auth middleware passes.
 */

process.env.NODE_ENV = 'test';
process.env.PORT = '5003';
process.env.MONGO_URI = 'mongodb://localhost:27017/sih_test';
process.env.JWT_SECRET = 'test_jwt_secret_for_unit_tests';
process.env.JWT_EXPIRES_IN = '1d';
process.env.ML_SERVICE_URL = 'http://localhost:8000';
process.env.FRONTEND_URL = 'http://localhost:5173';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const app = require('../src/app');

// Mock axios to control FastAPI responses
jest.mock('axios');

// ── Helper: generate a valid Bearer token ─────────────────────────────────────
const getValidToken = () =>
  jwt.sign({ id: 'user123' }, process.env.JWT_SECRET, { expiresIn: '1d' });

// ── Sample ML response matching expected FastAPI output ───────────────────────
const MOCK_ML_RESPONSE = {
  class_name: 'Moderate NPDR',
  confidence: 0.923,
  heatmap_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  processing_time_ms: 1234,
};

describe('Predict Endpoint — POST /api/predict', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── Authentication guard ──────────────────────────────────────────────────
  describe('Authentication', () => {
    it('should return 401 when no Authorization header is present', async () => {
      const res = await request(app)
        .post('/api/predict')
        .attach('file', Buffer.from('fake-image-data'), {
          filename: 'fundus.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 for an invalid token', async () => {
      const res = await request(app)
        .post('/api/predict')
        .set('Authorization', 'Bearer this.is.not.valid')
        .attach('file', Buffer.from('fake-image-data'), {
          filename: 'fundus.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 for an expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 'user123' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' } // already expired
      );

      const res = await request(app)
        .post('/api/predict')
        .set('Authorization', `Bearer ${expiredToken}`)
        .attach('file', Buffer.from('fake-image-data'), {
          filename: 'fundus.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/expired/i);
    });
  });

  // ── Image validation ──────────────────────────────────────────────────────
  describe('Image Validation', () => {
    it('should return 400 when no image file is attached', async () => {
      const token = getValidToken();

      const res = await request(app)
        .post('/api/predict')
        .set('Authorization', `Bearer ${token}`)
        // no .attach() — no file

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/no image/i);
    });

    it('should return 400 for an unsupported file type (e.g. gif)', async () => {
      const token = getValidToken();

      const res = await request(app)
        .post('/api/predict')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake-gif-data'), {
          filename: 'image.gif',
          contentType: 'image/gif',
        });

      expect(res.statusCode).toBe(400);
    });
  });

  // ── Successful prediction ─────────────────────────────────────────────────
  describe('Successful Prediction', () => {
    it('should forward image to FastAPI and return ML response (JPEG)', async () => {
      const token = getValidToken();

      axios.post.mockResolvedValueOnce({ data: MOCK_ML_RESPONSE });

      const res = await request(app)
        .post('/api/predict')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake-jpeg-data'), {
          filename: 'fundus.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.class_name).toBe('Moderate NPDR');
      expect(res.body.confidence).toBe(0.923);
      expect(res.body.heatmap_base64).toBeDefined();
      expect(res.body.processing_time_ms).toBe(1234);
    });

    it('should forward image to FastAPI and return ML response (PNG)', async () => {
      const token = getValidToken();

      axios.post.mockResolvedValueOnce({ data: MOCK_ML_RESPONSE });

      const res = await request(app)
        .post('/api/predict')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake-png-data'), {
          filename: 'fundus.png',
          contentType: 'image/png',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.class_name).toBeDefined();
    });

    it('should call the FastAPI /predict endpoint exactly once', async () => {
      const token = getValidToken();

      axios.post.mockResolvedValueOnce({ data: MOCK_ML_RESPONSE });

      await request(app)
        .post('/api/predict')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake-jpeg-data'), {
          filename: 'fundus.jpg',
          contentType: 'image/jpeg',
        });

      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(axios.post.mock.calls[0][0]).toContain('/predict');
    });
  });

  // ── ML service error handling ─────────────────────────────────────────────
  describe('ML Service Errors', () => {
    it('should return 503 when FastAPI is not reachable (ECONNREFUSED)', async () => {
      const token = getValidToken();

      const connError = new Error('connect ECONNREFUSED 127.0.0.1:8000');
      connError.code = 'ECONNREFUSED';
      axios.post.mockRejectedValueOnce(connError);

      const res = await request(app)
        .post('/api/predict')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake-jpeg-data'), {
          filename: 'fundus.jpg',
          contentType: 'image/jpeg',
        });

      // 503 Service Unavailable — FastAPI is unreachable
      // 502 Bad Gateway is reserved for when FastAPI responds but with an error
      expect(res.statusCode).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/ML service is unavailable/i);
    });

    it('should return 504 when FastAPI times out', async () => {
      const token = getValidToken();

      const timeoutError = new Error('timeout of 60000ms exceeded');
      timeoutError.code = 'ECONNABORTED';
      axios.post.mockRejectedValueOnce(timeoutError);

      const res = await request(app)
        .post('/api/predict')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake-jpeg-data'), {
          filename: 'fundus.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.statusCode).toBe(504);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/timed out/i);
    });

    it('should return 502 when FastAPI returns a 5xx error', async () => {
      const token = getValidToken();

      const serverError = new Error('Request failed with status code 500');
      serverError.response = {
        status: 500,
        statusText: 'Internal Server Error',
        data: { detail: 'Model inference failed' },
      };
      axios.post.mockRejectedValueOnce(serverError);

      const res = await request(app)
        .post('/api/predict')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake-jpeg-data'), {
          filename: 'fundus.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.statusCode).toBe(502);
      expect(res.body.success).toBe(false);
    });
  });
});
