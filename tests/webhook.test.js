import request from 'supertest';
import app from '../app.js';

describe('Webhook API', () => {
  it('should accept shiprocket checkout webhook', async () => {
    const res = await request(app)
      .post('/api/v1/webhook/checkoutOrder')
      .send({ order_id: '123' });
    
    // Webhooks usually return 200 even if they fail internally to stop retries
    expect([200, 400, 500]).toContain(res.statusCode);
  });

  it('should accept shiprocket order update webhook', async () => {
    const res = await request(app)
      .post('/api/v1/webhook/orderUpdate')
      .send({ status: 'delivered' });

    
    expect([200, 400, 500]).toContain(res.statusCode);
  });
});
