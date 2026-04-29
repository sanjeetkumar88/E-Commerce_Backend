import request from 'supertest';
import app from '../app.js';
import { Product } from '../src/models/product.model.js';
import { Category } from '../src/models/category.model.js';
import { ProductVariant } from '../src/models/productVarient.model.js';

describe('Product API', () => {
  let category, product;

  beforeEach(async () => {
    category = await Category.create({
      name: 'Test Category',
      handle: 'test-category'
    });

    product = await Product.create({
      name: 'Test Product',
      handle: 'test-product',
      categoryId: category._id,
      isActive: true,
      status: 'active'
    });

    await ProductVariant.create({
      productId: product._id,
      sku: 'TEST-SKU',
      price: 100,
      stockQuantity: 10,
      isActive: true,
      isDefault: true
    });
  });

  describe('GET /api/v1/products', () => {
    it('should list products', async () => {
      const res = await request(app).get('/api/v1/products');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.collections).toHaveLength(1);
    });

    it('should search products by name', async () => {
      const res = await request(app).get('/api/v1/products?search=Test');
      expect(res.body.data.collections).toHaveLength(1);
    });
  });

  describe('GET /api/v1/products/:identifier', () => {
    it('should return product details by handle', async () => {
      const res = await request(app).get('/api/v1/products/test-product');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.name).toBe('Test Product');
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app).get('/api/v1/products/wrong-handle');
      expect(res.statusCode).toEqual(404);
    });
  });
});
