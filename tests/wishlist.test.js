import request from 'supertest';
import app from '../app.js';
import { User } from '../src/models/user.model.js';
import { Product } from '../src/models/product.model.js';
import { Category } from '../src/models/category.model.js';
import { ProductVariant } from '../src/models/productVarient.model.js';

describe('Wishlist API', () => {
  let user, accessToken, product, category, variant;

  beforeEach(async () => {
    user = await User.create({ phoneNumber: '9876543210', firstName: 'Wishlist', lastName: 'User' });
    accessToken = user.generateAccessToken();

    category = await Category.create({ name: 'Fashion', handle: 'fashion' });
    product = await Product.create({
      name: 'Dress',
      handle: 'dress',
      categoryId: category._id,
      status: 'active'
    });

    variant = await ProductVariant.create({
      productId: product._id,
      sku: 'D-123',
      price: 500,
      stockQuantity: 20,
      isActive: true,
      isDefault: true
    });
  });

  it('should add an item to the wishlist', async () => {
    const res = await request(app)
      .post('/api/v1/wishlist')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ productId: product._id, variantId: variant._id });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  it('should get the user wishlist', async () => {
    const res = await request(app)
      .get('/api/v1/wishlist')
      .set('Authorization', `Bearer ${accessToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toBeDefined();
  });
});
