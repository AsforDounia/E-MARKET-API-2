import { expect } from 'chai';
import request from 'supertest';
import app from '../../server.js';
import { User, TokenBlacklist } from '../../models/Index.js';

describe('Auth Integration Tests', () => {
    beforeEach(async function() {
        this.timeout(5000);
        await User.deleteMany({});
        await TokenBlacklist.deleteMany({});
    });

    describe('POST /api/v2/auth/register', () => {
        it('should register a new user successfully', async () => {
            const res = await request(app)
                .post('/api/v2/auth/register')
                .send({
                    fullname: 'Test User',
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(res.status).to.equal(201);
            expect(res.body).to.have.property('token');
            expect(res.body.user).to.have.property('email', 'test@example.com');
            expect(res.body.user).to.have.property('fullname', 'Test User');
            expect(res.body.user).to.have.property('role', 'admin'); // First user should be admin
        });

        it('should return error if email already exists', async () => {
            // Register first user
            await request(app)
                .post('/api/v2/auth/register')
                .send({
                    fullname: 'Test User',
                    email: 'duplicate@example.com',
                    password: 'password123'
                });

            // Try to register with same email
            const res = await request(app)
                .post('/api/v2/auth/register')
                .send({
                    fullname: 'Another User',
                    email: 'duplicate@example.com',
                    password: 'password456'
                });

            expect(res.status).to.equal(400);
            expect(res.body).to.have.property('message', 'Email already in use');
        });

        it('should assign user role to second user', async () => {
            // Register first user (will be admin)
            await request(app)
                .post('/api/v2/auth/register')
                .send({
                    fullname: 'Admin User',
                    email: 'admin@example.com',
                    password: 'password123'
                });

            // Register second user (should be user role)
            const res = await request(app)
                .post('/api/v2/auth/register')
                .send({
                    fullname: 'Regular User',
                    email: 'user@example.com',
                    password: 'password123'
                });

            expect(res.status).to.equal(201);
            expect(res.body.user).to.have.property('role', 'user');
        });
    });

    describe('POST /api/v2/auth/login', () => {
        beforeEach(async () => {
            // Create a test user
            await request(app).post('/api/v2/auth/register').send({
                fullname: 'Test User',
                email: 'test@example.com',
                password: 'password123'
            });
        });

        it('should login with valid credentials', async () => {
            const res = await request(app)
                .post('/api/v2/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(res.status).to.equal(200);
            expect(res.body).to.have.property('token');
            expect(res.body.user).to.have.property('email', 'test@example.com');
        });

        it('should return error with invalid email', async () => {
            const res = await request(app)
                .post('/api/v2/auth/login')
                .send({
                    email: 'wrong@example.com',
                    password: 'password123'
                });

            expect(res.status).to.equal(401);
            expect(res.body).to.have.property('message', 'Invalid email or password');
        });

        it('should return error with invalid password', async () => {
            const res = await request(app)
                .post('/api/v2/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'wrongpassword'
                });

            expect(res.status).to.equal(401);
            expect(res.body).to.have.property('message', 'Invalid email or password');
        });

        it('should return error if email or password missing', async () => {
            const res = await request(app)
                .post('/api/v2/auth/login')
                .send({
                    email: 'test@example.com'
                });

            expect(res.status).to.equal(400);
            expect(res.body).to.have.property('message');
        });
    });

    describe('POST /api/v2/auth/logout', () => {
        it('should logout user successfully', async () => {
            // Register and login to get token
            const registerRes = await request(app)
                .post('/api/v2/auth/register')
                .send({
                    fullname: 'Test User',
                    email: 'test@example.com',
                    password: 'password123'
                });

            const token = registerRes.body.token;

            // Logout with token
            const res = await request(app)
                .post('/api/v2/auth/logout')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).to.equal(200);
            expect(res.body).to.have.property('message', 'Logged out successfully');
        });

        it('should return error if no token provided', async () => {
            const res = await request(app)
                .post('/api/v2/auth/logout');

            expect(res.status).to.equal(401);
            expect(res.body).to.have.property('message', 'No token provided');
        });
    });
});