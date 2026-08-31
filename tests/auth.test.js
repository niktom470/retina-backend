/**
 * tests/auth.test.js
 *
 * Tests the /api/auth routes: register, login, and /me.
 * Mongoose is mocked using jest.mock so no real MongoDB is needed.
 */

process.env.NODE_ENV = 'test';
process.env.PORT = '5002';
process.env.MONGO_URI = 'mongodb://localhost:27017/sih_test';
process.env.JWT_SECRET = 'test_jwt_secret_for_unit_tests';
process.env.JWT_EXPIRES_IN = '1d';
process.env.ML_SERVICE_URL = 'http://localhost:8000';
process.env.FRONTEND_URL = 'http://localhost:5173';

const request = require('supertest');
const app = require('../src/app');

// ── Mock the User model ───────────────────────────────────────────────────────
jest.mock('../src/models/User');
const User = require('../src/models/User');

// ── Mock generateToken ────────────────────────────────────────────────────────
jest.mock('../src/utils/generateToken', () => jest.fn(() => 'mock.jwt.token'));

describe('Auth Endpoints', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── POST /api/auth/register ─────────────────────────────────────────────
  describe('POST /api/auth/register', () => {
    it('should register a new user and return 201 with token', async () => {
      User.findOne.mockResolvedValue(null); // no existing user

      const mockUser = {
        _id: 'user123',
        name: 'Dr. Sharma',
        email: 'doctor@example.com',
      };
      User.create.mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Dr. Sharma', email: 'doctor@example.com', password: 'password123' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Registration successful');
      expect(res.body.token).toBe('mock.jwt.token');
      expect(res.body.user.email).toBe('doctor@example.com');
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'doctor@example.com' }); // missing name and password

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when password is too short', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Dr. Test', email: 'test@sih.com', password: '123' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 409 when email already exists', async () => {
      User.findOne.mockResolvedValue({ _id: 'existingUser', email: 'doctor@example.com' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Dr. Sharma', email: 'doctor@example.com', password: 'password123' });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  // ── POST /api/auth/login ────────────────────────────────────────────────
  describe('POST /api/auth/login', () => {
    it('should log in successfully and return a token', async () => {
      const mockUser = {
        _id: 'user123',
        name: 'Dr. Sharma',
        email: 'doctor@example.com',
        matchPassword: jest.fn().mockResolvedValue(true),
      };
      // Simulate .select('+password') chaining
      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'doctor@example.com', password: 'password123' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBe('mock.jwt.token');
    });

    it('should return 400 when email or password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'doctor@example.com' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 when user is not found', async () => {
      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 when password does not match', async () => {
      const mockUser = {
        _id: 'user123',
        name: 'Dr. Sharma',
        email: 'doctor@example.com',
        matchPassword: jest.fn().mockResolvedValue(false),
      };
      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'doctor@example.com', password: 'wrongpassword' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ── GET /api/auth/me ────────────────────────────────────────────────────
  describe('GET /api/auth/me', () => {
    it('should return 401 when no token is provided', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 when an invalid token is provided', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 with user data for a valid token', async () => {
      // Sign a real JWT using the test secret so the middleware accepts it
      const jwt = require('jsonwebtoken');
      const validToken = jwt.sign({ id: 'user123' }, process.env.JWT_SECRET, {
        expiresIn: '1d',
      });

      const mockUser = {
        _id: 'user123',
        name: 'Dr. Sharma',
        email: 'doctor@example.com',
        createdAt: new Date().toISOString(),
      };
      User.findById.mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe('doctor@example.com');
    });
  });
});
