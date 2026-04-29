import request from 'supertest';
import app from '../app.js';
import { User } from '../src/models/user.model.js';

describe('Admin API', () => {
  let admin, adminToken, user, userToken;

  beforeEach(async () => {
    admin = await User.create({ 
        phoneNumber: '9999999999', 
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin' 
    });
    adminToken = admin.generateAccessToken();

    user = await User.create({ 
        phoneNumber: '8888888888', 
        firstName: 'Normal',
        lastName: 'User',
        role: 'customer' 
    });
    userToken = user.generateAccessToken();
  });

  it('should allow admin to access dashboard', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  it('should deny non-admin access to dashboard', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.statusCode).toEqual(403);
  });
});
