/**
 * tests/health.test.js
 *
 * Tests the /api/health and /api/health/ml endpoints.
 * Uses supertest so no real server needs to be listening.
 * MongoDB is NOT connected during these tests.
 */

// Set env vars before requiring the app
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.MONGO_URI = 'mongodb://localhost:27017/sih_test';
process.env.JWT_SECRET = 'test_secret';
process.env.ML_SERVICE_URL = 'http://localhost:8000';
process.env.FRONTEND_URL = 'http://localhost:5173';

const request = require('supertest');
const axios = require('axios');
const app = require('../src/app');

// Mock axios so tests never hit the real FastAPI service
jest.mock('axios');

describe('Health Endpoints', () => {
  // ── GET /api/health ─────────────────────────────────────────────────────
  describe('GET /api/health', () => {
    it('should return 200 with success true and message', async () => {
      const res = await request(app).get('/api/health');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Backend is running');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  // ── GET /api/health/ml ──────────────────────────────────────────────────
  describe('GET /api/health/ml', () => {
    it('should return 200 when FastAPI is healthy', async () => {
      axios.get.mockResolvedValueOnce({
        data: { status: 'ok' },
        status: 200,
      });

      const res = await request(app).get('/api/health/ml');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.mlService).toBe('healthy');
    });

    it('should return 503 when FastAPI is unreachable (ECONNREFUSED)', async () => {
      const connError = new Error('connect ECONNREFUSED 127.0.0.1:8000');
      connError.code = 'ECONNREFUSED';
      axios.get.mockRejectedValueOnce(connError);

      const res = await request(app).get('/api/health/ml');

      expect(res.statusCode).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.mlService).toBe('unavailable');
    });

    it('should return 503 when FastAPI times out', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded');
      timeoutError.code = 'ETIMEDOUT';
      axios.get.mockRejectedValueOnce(timeoutError);

      const res = await request(app).get('/api/health/ml');

      expect(res.statusCode).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.mlService).toBe('unavailable');
    });
  });

  // ── 404 for unknown routes ──────────────────────────────────────────────
  describe('Unknown route', () => {
    it('should return 404 for non-existent routes', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
