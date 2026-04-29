import request from 'supertest';
import app from '../app.js';
import { User } from '../src/models/user.model.js';

describe('Order API', () => {
  let user, accessToken;

  beforeEach(async () => {
    user = await User.create({ phoneNumber: '9876543210', firstName: 'Order', lastName: 'User' });
    accessToken = user.generateAccessToken();
  });

  it('should get user orders', async () => {
    const res = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${accessToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.orders)).toBe(true);
  });

  it('should return 401 for orders without token', async () => {
    const res = await request(app).get('/api/v1/orders');
    expect(res.statusCode).toEqual(401);
  });
});
