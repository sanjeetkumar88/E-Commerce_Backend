import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import dotenv from 'dotenv';

dotenv.config();

// Ensure required env vars for tests
process.env.ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '1h';
process.env.REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'testsecret';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'testrefreshsecret';

let mongoServer;

export const connectDB = async () => {
    mongoServer = await MongoMemoryReplSet.create({
        replSet: { count: 1, storageEngine: 'wiredTiger' }
    });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
};

export const closeDB = async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
};

export const clearDB = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany();
    }
};

beforeAll(async () => {
    await connectDB();
});

afterEach(async () => {
    await clearDB();
});

afterAll(async () => {
    await closeDB();
});

// Mock external services
jest.mock('../src/utils/cloudinary.js', () => ({
    uploadBufferToCloudinary: jest.fn().mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        public_id: 'sample'
    })
}));
