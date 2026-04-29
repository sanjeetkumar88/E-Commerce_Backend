import request from 'supertest';
import app from '../app.js';
import { User } from '../src/models/user.model.js';

describe('User Address API', () => {
  let user, accessToken;

  beforeEach(async () => {
    user = await User.create({ phoneNumber: '9876543210', firstName: 'Address', lastName: 'User' });
    accessToken = user.generateAccessToken();
  });

  it('should add a new address', async () => {
    const res = await request(app)
      .post('/api/v1/addresses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        firstName: 'John',
        lastName: 'Doe',
        addressLine1: 'Flat 101, Sunny Enclave',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110001',
        country: 'India',
        type: 'home'
      });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
  });
});
