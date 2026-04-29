import request from 'supertest';
import app from '../app.js';
import { User } from '../src/models/user.model.js';

describe('Authentication API', () => {
  const testUser = {
    phoneNumber: '9876543210',
    firstName: 'Test',
    lastName: 'User'
  };

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.phoneNumber).toBe(testUser.phoneNumber);
      
      const user = await User.findOne({ phoneNumber: testUser.phoneNumber });
      expect(user).toBeDefined();
    });

    it('should return 400 for duplicate phone number', async () => {
      await User.create(testUser);
      
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);
      
      expect(res.statusCode).toEqual(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with registered phone', async () => {
      await User.create(testUser);
      
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ phoneNumber: testUser.phoneNumber });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.header['set-cookie']).toBeDefined();
    });

    it('should login and auto-register unregistered phone', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ phoneNumber: '9999999999' });
      
      expect(res.statusCode).toEqual(200);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return user profile when authenticated', async () => {
      const user = await User.create(testUser);
      const accessToken = user.generateAccessToken();
      
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.phoneNumber).toBe(testUser.phoneNumber);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.statusCode).toEqual(401);
    });
  });
});
