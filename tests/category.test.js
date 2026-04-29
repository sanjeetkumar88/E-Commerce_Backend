import request from 'supertest';
import app from '../app.js';
import { Category } from '../src/models/category.model.js';

describe('Category API', () => {
  describe('GET /api/v1/categories/tree', () => {
    it('should return a nested category tree', async () => {
      const parent = await Category.create({ name: 'Parent', handle: 'parent' });
      await Category.create({ name: 'Child', handle: 'child', parentId: parent._id });
      
      const res = await request(app).get('/api/v1/categories/tree');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].children).toHaveLength(1);
    });
  });

  describe('GET /api/v1/categories/:categoryhandle', () => {
    it('should return products by category handle', async () => {
      await Category.create({ name: 'Furniture', handle: 'furniture' });
      
      const res = await request(app).get('/api/v1/categories/furniture');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
    });
  });
});
