import { expect } from 'chai';
import sinon from 'sinon';
import Coupon from '../../models/Coupon.js';
import cacheInvalidation from '../../services/cacheInvalidation.js';
import { 
    createCoupon, 
    getCouponsSeller, 
    getAllCoupons, 
    getCouponById, 
    updateCoupon, 
    deleteCoupon 
} from '../../controllers/couponController.js';

describe('Coupon Controller - Unit Tests', () => {
    let mockReq, mockRes, mockNext;
    let couponFindOneStub, couponCreateStub, couponFindStub;
    let couponCountDocumentsStub, couponFindOneAndUpdateStub;
    let couponFindOneAndDeleteStub, cacheInvalidationStub;

    beforeEach(() => {
        mockReq = {
            body: {},
            params: {},
            query: {},
            user: null
        };
        mockRes = {
            status: sinon.stub().returnsThis(),
            json: sinon.stub().returnsThis()
        };
        mockNext = sinon.stub();

        // Stub all Coupon model methods
        couponFindOneStub = sinon.stub(Coupon, 'findOne');
        couponCreateStub = sinon.stub(Coupon, 'create');
        couponFindStub = sinon.stub(Coupon, 'find');
        couponCountDocumentsStub = sinon.stub(Coupon, 'countDocuments');
        couponFindOneAndUpdateStub = sinon.stub(Coupon, 'findOneAndUpdate');
        couponFindOneAndDeleteStub = sinon.stub(Coupon, 'findOneAndDelete');
        cacheInvalidationStub = sinon.stub(cacheInvalidation, 'invalidateCoupons');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('createCoupon', () => {
        it('should throw error if user is not a seller', async () => {
            mockReq.user = { _id: 'user123', role: 'buyer' };

            await createCoupon(mockReq, mockRes, mockNext);

            expect(mockNext.calledOnce).to.be.true;
            const error = mockNext.firstCall.args[0];
            expect(error.message).to.equal('Only sellers can create coupons');
            expect(error.statusCode).to.equal(403);
        });

        it('should throw error if required fields are missing', async () => {
            mockReq.user = { _id: 'seller123', role: 'seller' };
            mockReq.body = { code: 'TEST' };

            await createCoupon(mockReq, mockRes, mockNext);

            expect(mockNext.calledOnce).to.be.true;
            const error = mockNext.firstCall.args[0];
            expect(error.message).to.include('required');
            expect(error.statusCode).to.equal(400);
        });

        it('should throw error if coupon type is invalid', async () => {
            mockReq.user = { _id: 'seller123', role: 'seller' };
            mockReq.body = {
                code: 'TEST',
                type: 'invalid',
                value: 10,
                minAmount: 50,
                maxDiscount: 100,
                expiresAt: '2025-12-31'
            };

            await createCoupon(mockReq, mockRes, mockNext);

            expect(mockNext.calledOnce).to.be.true;
            const error = mockNext.firstCall.args[0];
            expect(error.message).to.equal("Invalid coupon type. Must be 'percentage' or 'fixed'");
            expect(error.statusCode).to.equal(400);
        });

        it('should throw error if coupon code already exists', async () => {
            mockReq.user = { _id: 'seller123', role: 'seller' };
            mockReq.body = {
                code: 'TEST',
                type: 'percentage',
                value: 10,
                minAmount: 50,
                maxDiscount: 100,
                expiresAt: '2025-12-31'
            };

            couponFindOneStub.resolves({ code: 'TEST' });

            await createCoupon(mockReq, mockRes, mockNext);

            expect(mockNext.calledOnce).to.be.true;
            const error = mockNext.firstCall.args[0];
            expect(error.message).to.equal('A coupon with this code already exists');
            expect(error.statusCode).to.equal(400);
        });

        it('should throw error if percentage value is out of range', async () => {
            mockReq.user = { _id: 'seller123', role: 'seller' };
            mockReq.body = {
                code: 'TEST',
                type: 'percentage',
                value: 100,
                minAmount: 50,
                maxDiscount: 100,
                expiresAt: '2025-12-31'
            };

            couponFindOneStub.resolves(null);

            await createCoupon(mockReq, mockRes, mockNext);

            expect(mockNext.calledOnce).to.be.true;
            const error = mockNext.firstCall.args[0];
            expect(error.message).to.equal('For percentage type, the value must be between 1 and 99.');
            expect(error.statusCode).to.equal(400);
        });

        it('should create coupon successfully', async () => {
            mockReq.user = { _id: 'seller123', role: 'seller' };
            mockReq.body = {
                code: 'test20',
                type: 'percentage',
                value: 20,
                minAmount: 50,
                maxDiscount: 100,
                expiresAt: '2025-12-31',
                usageLimit: 100
            };

            const mockCoupon = {
                _id: 'coupon123',
                code: 'TEST20',
                type: 'percentage',
                value: 20,
                minAmount: 50,
                maxDiscount: 100,
                createdBy: 'seller123'
            };

            couponFindOneStub.resolves(null);
            couponCreateStub.resolves(mockCoupon);
            cacheInvalidationStub.resolves();

            await createCoupon(mockReq, mockRes, mockNext);

            expect(couponCreateStub.calledOnce).to.be.true;
            expect(cacheInvalidationStub.calledOnce).to.be.true;
            expect(mockRes.status.calledWith(201)).to.be.true;
            expect(mockRes.json.calledOnce).to.be.true;
            const response = mockRes.json.firstCall.args[0];
            expect(response.message).to.equal('Coupon created succesfuly');
            expect(response.data).to.deep.equal(mockCoupon);
        });
    });

    describe('getCouponsSeller', () => {
        it('should throw error if user is not seller or admin', async () => {
            mockReq.user = { _id: 'buyer123', role: 'buyer' };

            await getCouponsSeller(mockReq, mockRes, mockNext);

            expect(mockNext.calledOnce).to.be.true;
            const error = mockNext.firstCall.args[0];
            expect(error.message).to.equal('Only sellers or admins can create coupons');
            expect(error.statusCode).to.equal(403);
        });

        it('should return empty array if no coupons found', async () => {
            mockReq.user = { _id: 'seller123', role: 'seller' };
            couponFindStub.resolves([]);

            await getCouponsSeller(mockReq, mockRes, mockNext);

            expect(mockRes.status.calledWith(200)).to.be.true;
            const response = mockRes.json.firstCall.args[0];
            expect(response.success).to.be.true;
            expect(response.message).to.equal('No coupons found for this seller');
            expect(response.data).to.deep.equal([]);
        });

        it('should return seller coupons successfully', async () => {
            mockReq.user = { _id: 'seller123', role: 'seller' };
            const mockCoupons = [
                { _id: 'coupon1', code: 'TEST1' },
                { _id: 'coupon2', code: 'TEST2' }
            ];
            couponFindStub.resolves(mockCoupons);

            await getCouponsSeller(mockReq, mockRes, mockNext);

            expect(couponFindStub.calledWith({ createdBy: 'seller123' })).to.be.true;
            expect(mockRes.status.calledWith(200)).to.be.true;
            const response = mockRes.json.firstCall.args[0];
            expect(response.success).to.be.true;
            expect(response.data).to.deep.equal(mockCoupons);
        });
    });

    describe('getAllCoupons', () => {
        it('should return all coupons with pagination', async () => {
            mockReq.query = { page: '1', limit: '15' };
            const mockCoupons = [{ _id: 'coupon1' }];

            const skipStub = sinon.stub().returnsThis();
            const limitStub = sinon.stub().resolves(mockCoupons);
            couponFindStub.returns({ skip: skipStub, limit: limitStub });
            couponCountDocumentsStub.resolves(25);

            await getAllCoupons(mockReq, mockRes, mockNext);

            expect(mockRes.status.calledWith(200)).to.be.true;
            const response = mockRes.json.firstCall.args[0];
            expect(response.success).to.be.true;
            expect(response.currentPage).to.equal(1);
            expect(response.totalPages).to.equal(2);
            expect(response.totalCoupon).to.equal(25);
        });

        it('should filter coupons by type and isActive', async () => {
            mockReq.query = { type: 'percentage', isActive: 'true' };
            const mockCoupons = [{ _id: 'coupon1', type: 'percentage' }];

            const skipStub = sinon.stub().returnsThis();
            const limitStub = sinon.stub().resolves(mockCoupons);
            couponFindStub.returns({ skip: skipStub, limit: limitStub });
            couponCountDocumentsStub.resolves(10);

            await getAllCoupons(mockReq, mockRes, mockNext);

            expect(couponFindStub.firstCall.args[0]).to.deep.include({
                type: 'percentage',
                isActive: 'true'
            });
        });
    });

    describe('getCouponById', () => {
        it('should throw error if user is not seller or admin', async () => {
            mockReq.user = { _id: 'buyer123', role: 'buyer' };

            await getCouponById(mockReq, mockRes, mockNext);

            expect(mockNext.calledOnce).to.be.true;
            const error = mockNext.firstCall.args[0];
            expect(error.message).to.equal('Only sellers or admins can access coupons');
            expect(error.statusCode).to.equal(403);
        });

        it('should throw error if coupon not found', async () => {
            mockReq.user = { _id: 'seller123', role: 'seller' };
            mockReq.params = { id: 'coupon123' };
            couponFindOneStub.resolves(null);

            await getCouponById(mockReq, mockRes, mockNext);

            expect(mockNext.calledOnce).to.be.true;
            const error = mockNext.firstCall.args[0];
            expect(error.message).to.equal('Coupon not found');
            expect(error.statusCode).to.equal(404);
        });

        it('should return coupon for seller', async () => {
            mockReq.user = { _id: 'seller123', role: 'seller' };
            mockReq.params = { id: 'coupon123' };
            const mockCoupon = { _id: 'coupon123', code: 'TEST' };
            couponFindOneStub.resolves(mockCoupon);

            await getCouponById(mockReq, mockRes, mockNext);

            expect(couponFindOneStub.calledWith({
                _id: 'coupon123',
                createdBy: 'seller123'
            })).to.be.true;
            const response = mockRes.json.firstCall.args[0];
            expect(response.data).to.deep.equal(mockCoupon);
        });

        it('should return any coupon for admin', async () => {
            mockReq.user = { _id: 'admin123', role: 'admin' };
            mockReq.params = { id: 'coupon123' };
            const mockCoupon = { _id: 'coupon123', code: 'TEST' };
            couponFindOneStub.resolves(mockCoupon);

            await getCouponById(mockReq, mockRes, mockNext);

            expect(couponFindOneStub.calledWith({ _id: 'coupon123' })).to.be.true;
        });
    });

    describe('updateCoupon', () => {
        it('should throw error if user is not seller or admin', async () => {
            mockReq.user = { _id: 'buyer123', role: 'buyer' };

            await updateCoupon(mockReq, mockRes, mockNext);

            expect(mockNext.calledOnce).to.be.true;
            const error = mockNext.firstCall.args[0];
            expect(error.message).to.equal('Only sellers or admins can update coupons');
            expect(error.statusCode).to.equal(403);
        });

        it('should throw error if coupon not found', async () => {
            mockReq.user = { _id: 'seller123', role: 'seller' };
            mockReq.params = { id: 'coupon123' };
            mockReq.body = { value: 30 };
            couponFindOneAndUpdateStub.resolves(null);

            await updateCoupon(mockReq, mockRes, mockNext);

            expect(mockNext.calledOnce).to.be.true;
            const error = mockNext.firstCall.args[0];
            expect(error.message).to.equal('Coupon not found');
            expect(error.statusCode).to.equal(404);
        });

        it('should update coupon successfully', async () => {
            mockReq.user = { _id: 'seller123', role: 'seller' };
            mockReq.params = { id: 'coupon123' };
            mockReq.body = { value: 30 };
            const updatedCoupon = { _id: 'coupon123', value: 30 };
            couponFindOneAndUpdateStub.resolves(updatedCoupon);
            cacheInvalidationStub.resolves();

            await updateCoupon(mockReq, mockRes, mockNext);

            expect(cacheInvalidationStub.calledOnce).to.be.true;
            const response = mockRes.json.firstCall.args[0];
            expect(response.message).to.equal('Coupon updated successfully');
            expect(response.data).to.deep.equal(updatedCoupon);
        });
    });

    describe('deleteCoupon', () => {
        it('should throw error if user is not seller or admin', async () => {
            mockReq.user = { _id: 'buyer123', role: 'buyer' };

            await deleteCoupon(mockReq, mockRes, mockNext);

            expect(mockNext.calledOnce).to.be.true;
            const error = mockNext.firstCall.args[0];
            expect(error.message).to.equal('Only sellers or admins can delete a coupons');
            expect(error.statusCode).to.equal(403);
        });

        it('should throw error if coupon not found', async () => {
            mockReq.user = { _id: 'seller123', role: 'seller' };
            mockReq.params = { id: 'coupon123' };
            couponFindOneAndDeleteStub.resolves(null);

            await deleteCoupon(mockReq, mockRes, mockNext);

            expect(mockNext.calledOnce).to.be.true;
            const error = mockNext.firstCall.args[0];
            expect(error.message).to.equal('Coupon not found');
            expect(error.statusCode).to.equal(404);
        });

        it('should delete coupon successfully', async () => {
            mockReq.user = { _id: 'seller123', role: 'seller' };
            mockReq.params = { id: 'coupon123' };
            couponFindOneAndDeleteStub.resolves({ _id: 'coupon123' });
            cacheInvalidationStub.resolves();

            await deleteCoupon(mockReq, mockRes, mockNext);

            expect(cacheInvalidationStub.calledOnce).to.be.true;
            const response = mockRes.json.firstCall.args[0];
            expect(response.success).to.be.true;
            expect(response.message).to.equal('Coupon deleted successfully');
        });
    });
});