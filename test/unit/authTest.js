import { expect } from 'chai';
import sinon from 'sinon';
import jwt from 'jsonwebtoken';
import * as authController from '../../controllers/authController.js';
import { User, TokenBlacklist } from '../../models/Index.js';

describe('Auth Controller - Unit Tests', () => {
    let req, res, next;

    beforeEach(() => {
        req = { body: {}, headers: {} };
        res = {
            status: sinon.stub().returnsThis(),
            json: sinon.stub().returnsThis()
        };
        next = sinon.stub();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('register', () => {
        it('should register a new user successfully', async () => {
            req.body = { fullname: 'Test User', email: 'test@test.com', password: 'password123' };
            
            sinon.stub(User, 'findOne').resolves(null);
            sinon.stub(User, 'countDocuments').resolves(1);
            sinon.stub(User, 'create').resolves({
                _id: '123',
                fullname: 'Test User',
                email: 'test@test.com',
                role: 'user'
            });
            sinon.stub(jwt, 'sign').returns('fake-token');

            await authController.register(req, res, next);

            expect(res.status.calledWith(201)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
            expect(res.json.firstCall.args[0]).to.have.property('token');
            expect(res.json.firstCall.args[0]).to.have.property('user');
        });

        it('should return error if email already exists', async () => {
            req.body = { fullname: 'Test User', email: 'existing@test.com', password: 'password123' };
            
            sinon.stub(User, 'findOne').resolves({ email: 'existing@test.com' });

            await authController.register(req, res, next);

            expect(next.calledOnce).to.be.true;
            expect(next.firstCall.args[0].message).to.equal('Email already in use');
        });

        it('should assign admin role to first user', async () => {
            req.body = { fullname: 'First User', email: 'first@test.com', password: 'password123' };
            
            sinon.stub(User, 'findOne').resolves(null);
            sinon.stub(User, 'countDocuments').resolves(0);
            const createStub = sinon.stub(User, 'create').resolves({
                _id: '123',
                fullname: 'First User',
                email: 'first@test.com',
                role: 'admin'
            });
            sinon.stub(jwt, 'sign').returns('fake-token');

            await authController.register(req, res, next);

            expect(createStub.firstCall.args[0].role).to.equal('admin');
        });
    });

    describe('login', () => {
        it('should login user with valid credentials', async () => {
            req.body = { email: 'test@test.com', password: 'password123' };
            
            const mockUser = {
                _id: '123',
                fullname: 'Test User',
                email: 'test@test.com',
                role: 'user',
                comparePassword: sinon.stub().resolves(true)
            };
            
            sinon.stub(User, 'findOne').resolves(mockUser);
            sinon.stub(jwt, 'sign').returns('fake-token');

            await authController.login(req, res, next);

            expect(res.json.calledOnce).to.be.true;
            expect(res.json.firstCall.args[0]).to.have.property('token');
            expect(res.json.firstCall.args[0]).to.have.property('user');
        });

        it('should return error with invalid email', async () => {
            req.body = { email: 'wrong@test.com', password: 'password123' };
            
            sinon.stub(User, 'findOne').resolves(null);

            await authController.login(req, res, next);

            expect(next.calledOnce).to.be.true;
            expect(next.firstCall.args[0].message).to.equal('Invalid email or password');
        });

        it('should return error with invalid password', async () => {
            req.body = { email: 'test@test.com', password: 'wrongpassword' };
            
            const mockUser = {
                _id: '123',
                email: 'test@test.com',
                comparePassword: sinon.stub().resolves(false)
            };
            
            sinon.stub(User, 'findOne').resolves(mockUser);

            await authController.login(req, res, next);

            expect(next.calledOnce).to.be.true;
            expect(next.firstCall.args[0].message).to.equal('Invalid email or password');
        });

        it('should return error if email or password missing', async () => {
            req.body = { email: 'test@test.com' };

            await authController.login(req, res, next);

            expect(next.calledOnce).to.be.true;
            expect(next.firstCall.args[0].message).to.equal('Email and password are required');
        });
    });

    describe('logout', () => {
        it('should logout user successfully', async () => {
            req.headers.authorization = 'Bearer fake-token';
            
            sinon.stub(jwt, 'verify').returns({ id: '123', exp: Date.now() / 1000 + 3600 });
            sinon.stub(TokenBlacklist, 'create').resolves({});

            await authController.logout(req, res, next);

            expect(res.json.calledOnce).to.be.true;
            expect(res.json.firstCall.args[0].message).to.equal('Logged out successfully');
        });

        it('should return error if no token provided', async () => {
            await authController.logout(req, res, next);

            expect(next.calledOnce).to.be.true;
            expect(next.firstCall.args[0].message).to.equal('No token provided');
        });
    });
});
