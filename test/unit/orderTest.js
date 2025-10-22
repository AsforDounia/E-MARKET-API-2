// import { expect } from Chai;
// import Sinon from "sinon";
// import { createOrder, getOrders, getOrderById, updateOrderStatus, cancelOrder} from "../../controllers/orderController";
// import Order from "../../models/Order";

// describe("Order Controller", () => {
//     let req, res, next;

//     beforeEach(()=>{
//         req = {
//             user: { id: "user123" },
//             body: {},
//             params: {},
//         };
//         res = {
//             status: sinon.stub().returnsThis(),
//             json: sinon.stub(),
//         };
//         next = sinon.stub();
//     });

//     afterEach(() => {
//         sinon.restore();
//     });

//     describe("getOrders", () =>{
        
//     })
// })

import { expect } from 'chai';
import sinon from 'sinon';
import mongoose from 'mongoose';
import { createOrder, getOrders, getOrderById, updateOrderStatus, cancelOrder } from '../../controllers/orderController.js';
import { Order, OrderItem, Cart, CartItem, Product, Coupon } from '../../models/Index.js';
import { AppError } from '../../middlewares/errorHandler.js';

describe('Order Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: { id: 'user123', role: 'user' },
            body: {},
            params: {}
        };
        res = {
            status: sinon.stub().returnsThis(),
            json: sinon.stub().returnsThis()
        };
        next = sinon.stub();
    });

    afterEach(() => {
        sinon.restore();
    });

    // ==================== Tests pour createOrder ====================
    describe('createOrder', () => {
        let sessionMock, transactionStub;

        beforeEach(() => {
            sessionMock = {
                startTransaction: sinon.stub(),
                commitTransaction: sinon.stub(),
                abortTransaction: sinon.stub(),
                endSession: sinon.stub()
            };
            
            transactionStub = sinon.stub().callsFake(async (callback) => {
                return await callback();
            });
            
            sessionMock.withTransaction = transactionStub;
            sinon.stub(mongoose, 'startSession').resolves(sessionMock);
        });

        it('should create an order successfully', async () => {
            const cartMock = { _id: 'cart123', userId: 'user123' };
            const productMock = {
                _id: 'prod123',
                title: 'Test Product',
                description: "desc1",
                price: 100,
                stock: 10,
                sellerId: 'seller123',
                imageUrls: [],
                deletedAt: null
            };
            const cartItemsMock = [{
                productId: productMock,
                quantity: 2,
                cartId: 'cart123'
            }];
            const orderMock = [{
                _id: 'order123',
                userId: 'user123',
                subtotal: 200,
                discount: 0,
                total: 200
            }];

            sinon.stub(Cart, 'findOne').resolves(cartMock);
            const populateStub = sinon.stub().resolves(cartItemsMock);
            sinon.stub(CartItem, 'find').returns({ populate: populateStub });
            sinon.stub(Order, 'create').resolves(orderMock);
            sinon.stub(OrderItem, 'create').resolves([{}]);
            sinon.stub(Product, 'updateOne').resolves({});
            sinon.stub(CartItem, 'deleteMany').resolves({});

            await createOrder(req, res, next);

            expect(res.status.calledWith(201)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
            expect(res.json.firstCall.args[0]).to.have.property('status', 'success');
            expect(res.json.firstCall.args[0].data.order).to.have.property('total', 200);
        });

        it('should return an error if cart is not found', async () => {
            sinon.stub(Cart, 'findOne').resolves(null);

            await createOrder(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error).to.be.instanceOf(AppError);
            expect(error.message).to.equal('Cart not found');
            expect(error.statusCode).to.equal(404);
        });

        it('should return an error if cart is empty', async () => {
            const cartMock = { _id: 'cart123', userId: 'user123' };
            
            sinon.stub(Cart, 'findOne').resolves(cartMock);
            const populateStub = sinon.stub().resolves([]);
            sinon.stub(CartItem, 'find').returns({ populate: populateStub });

            await createOrder(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.equal('Cart is empty');
        });

        it('should return an error if product stock is insufficient', async () => {
            const cartMock = { _id: 'cart123', userId: 'user123' };
            const productMock = {
                _id: 'prod123',
                title: 'Test Product',
                price: 100,
                stock: 1,
                deletedAt: null
            };
            const cartItemsMock = [{
                productId: productMock,
                quantity: 5
            }];

            sinon.stub(Cart, 'findOne').resolves(cartMock);
            const populateStub = sinon.stub().resolves(cartItemsMock);
            sinon.stub(CartItem, 'find').returns({ populate: populateStub });

            await createOrder(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.include('Insufficient stock');
        });

        it('should return an error if product is deleted', async () => {
            const cartMock = { _id: 'cart123', userId: 'user123' };
            const productMock = {
                _id: 'prod123',
                title: 'Deleted Product',
                price: 100,
                stock: 10,
                deletedAt: new Date()
            };
            const cartItemsMock = [{
                productId: productMock,
                quantity: 2
            }];

            sinon.stub(Cart, 'findOne').resolves(cartMock);
            const populateStub = sinon.stub().resolves(cartItemsMock);
            sinon.stub(CartItem, 'find').returns({ populate: populateStub });

            await createOrder(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.include('Product no longer available');
        });

        // Tests pour les coupons
        it('should apply a percentage coupon successfully', async () => {
            req.body.couponCode = 'SAVE20';
            
            const cartMock = { _id: 'cart123', userId: 'user123' };
            const productMock = {
                _id: 'prod123',
                title: 'Test Product',
                price: 100,
                stock: 10,
                sellerId: 'seller123',
                deletedAt: null
            };
            const cartItemsMock = [{
                productId: productMock,
                quantity: 2
            }];
            const couponMock = {
                _id: 'coupon123',
                code: 'SAVE20',
                type: 'percentage',
                value: 20,
                isActive: true,
                usedBy: [],
                minAmount: 0
            };
            const orderMock = [{
                _id: 'order123',
                userId: 'user123',
                subtotal: 200,
                discount: 40,
                total: 160
            }];

            sinon.stub(Cart, 'findOne').resolves(cartMock);
            const populateStub = sinon.stub().resolves(cartItemsMock);
            sinon.stub(CartItem, 'find').returns({ populate: populateStub });
            sinon.stub(Coupon, 'findOne').resolves(couponMock);
            sinon.stub(Coupon, 'updateOne').resolves({});
            sinon.stub(Order, 'create').resolves(orderMock);
            sinon.stub(OrderItem, 'create').resolves([{}]);
            sinon.stub(Product, 'updateOne').resolves({});
            sinon.stub(CartItem, 'deleteMany').resolves({});

            await createOrder(req, res, next);

            expect(res.status.calledWith(201)).to.be.true;
            expect(Coupon.updateOne.calledOnce).to.be.true;
        });

        it('should apply fixed amount coupon correctly', async () => {
            req.body.couponCode = 'FIXED50';
            
            const cartMock = { _id: 'cart123', userId: 'user123' };
            const productMock = {
                _id: 'prod123',
                title: 'Test Product',
                price: 100,
                stock: 10,
                sellerId: 'seller123',
                deletedAt: null
            };
            const cartItemsMock = [{
                productId: productMock,
                quantity: 2
            }];
            const couponMock = {
                _id: 'coupon123',
                code: 'FIXED50',
                type: 'fixed',
                value: 50,
                isActive: true,
                usedBy: [],
                minAmount: 0
            };
            const orderMock = [{
                _id: 'order123',
                userId: 'user123',
                subtotal: 200,
                discount: 50,
                total: 150
            }];

            sinon.stub(Cart, 'findOne').resolves(cartMock);
            const populateStub = sinon.stub().resolves(cartItemsMock);
            sinon.stub(CartItem, 'find').returns({ populate: populateStub });
            sinon.stub(Coupon, 'findOne').resolves(couponMock);
            sinon.stub(Coupon, 'updateOne').resolves({});
            sinon.stub(Order, 'create').resolves(orderMock);
            sinon.stub(OrderItem, 'create').resolves([{}]);
            sinon.stub(Product, 'updateOne').resolves({});
            sinon.stub(CartItem, 'deleteMany').resolves({});

            await createOrder(req, res, next);

            expect(res.status.calledWith(201)).to.be.true;
            expect(Coupon.updateOne.calledOnce).to.be.true;
        });

        it('should return an error if coupon is invalid', async () => {
            req.body.couponCode = 'INVALID';
            
            const cartMock = { _id: 'cart123', userId: 'user123' };
            const productMock = {
                _id: 'prod123',
                price: 100,
                stock: 10,
                deletedAt: null
            };
            const cartItemsMock = [{ productId: productMock, quantity: 2 }];

            sinon.stub(Cart, 'findOne').resolves(cartMock);
            const populateStub = sinon.stub().resolves(cartItemsMock);
            sinon.stub(CartItem, 'find').returns({ populate: populateStub });
            sinon.stub(Coupon, 'findOne').resolves(null);

            await createOrder(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.equal('Invalid coupon');
        });

        it('should return an error if coupon is expired', async () => {
            req.body.couponCode = 'EXPIRED';
            
            const cartMock = { _id: 'cart123', userId: 'user123' };
            const productMock = {
                _id: 'prod123',
                price: 100,
                stock: 10,
                deletedAt: null
            };
            const cartItemsMock = [{ productId: productMock, quantity: 2 }];
            const couponMock = {
                code: 'EXPIRED',
                isActive: true,
                expiresAt: new Date('2020-01-01'),
                usedBy: []
            };

            sinon.stub(Cart, 'findOne').resolves(cartMock);
            const populateStub = sinon.stub().resolves(cartItemsMock);
            sinon.stub(CartItem, 'find').returns({ populate: populateStub });
            sinon.stub(Coupon, 'findOne').resolves(couponMock);

            await createOrder(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.equal('Coupon expired');
        });

        it('should return an error if coupon has already been used', async () => {
            req.body.couponCode = 'USED';
            
            const cartMock = { _id: 'cart123', userId: 'user123' };
            const productMock = {
                _id: 'prod123',
                price: 100,
                stock: 10,
                deletedAt: null
            };
            const cartItemsMock = [{ productId: productMock, quantity: 2 }];
            const couponMock = {
                code: 'USED',
                isActive: true,
                usedBy: ['user123']
            };

            sinon.stub(Cart, 'findOne').resolves(cartMock);
            const populateStub = sinon.stub().resolves(cartItemsMock);
            sinon.stub(CartItem, 'find').returns({ populate: populateStub });
            sinon.stub(Coupon, 'findOne').resolves(couponMock);

            await createOrder(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.equal('Coupon already used');
        });

        it('should return an error if minimum coupon amount is not met', async () => {
            req.body.couponCode = 'SAVE50';
            
            const cartMock = { _id: 'cart123', userId: 'user123' };
            const productMock = {
                _id: 'prod123',
                price: 50,
                stock: 10,
                deletedAt: null
            };
            const cartItemsMock = [{ productId: productMock, quantity: 1 }];
            const couponMock = {
                code: 'SAVE50',
                isActive: true,
                usedBy: [],
                minAmount: 100
            };

            sinon.stub(Cart, 'findOne').resolves(cartMock);
            const populateStub = sinon.stub().resolves(cartItemsMock);
            sinon.stub(CartItem, 'find').returns({ populate: populateStub });
            sinon.stub(Coupon, 'findOne').resolves(couponMock);

            await createOrder(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.include('Minimum amount');
        });

        it('should return an error if coupon usage limit is reached', async () => {
            req.body.couponCode = 'LIMITED';
            
            const cartMock = { _id: 'cart123', userId: 'user123' };
            const productMock = {
                _id: 'prod123',
                price: 100,
                stock: 10,
                deletedAt: null
            };
            const cartItemsMock = [{ productId: productMock, quantity: 2 }];
            const couponMock = {
                code: 'LIMITED',
                isActive: true,
                usedBy: ['user1', 'user2', 'user3'],
                usageLimit: 3,
                minAmount: 0
            };

            sinon.stub(Cart, 'findOne').resolves(cartMock);
            const populateStub = sinon.stub().resolves(cartItemsMock);
            sinon.stub(CartItem, 'find').returns({ populate: populateStub });
            sinon.stub(Coupon, 'findOne').resolves(couponMock);

            await createOrder(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.equal('Coupon usage limit reached');
        });
    });

    // ==================== Tests pour getOrders ====================
    describe('getOrders', () => {
        it('should retrieve all user orders successfully', async () => {
            const ordersMock = [
                { _id: 'order1', userId: 'user123', total: 200 },
                { _id: 'order2', userId: 'user123', total: 150 }
            ];

            const sortStub = sinon.stub().resolves(ordersMock);
            sinon.stub(Order, 'find').returns({ sort: sortStub });

            await getOrders(req, res, next);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
            expect(res.json.firstCall.args[0].data.orders).to.have.lengthOf(2);
            expect(res.json.firstCall.args[0].status).to.equal('success');
        });

        it('should return empty array if no orders found', async () => {
            const sortStub = sinon.stub().resolves([]);
            sinon.stub(Order, 'find').returns({ sort: sortStub });

            await getOrders(req, res, next);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.firstCall.args[0].data.orders).to.be.an('array').that.is.empty;
        });

        it('should handle errors', async () => {
            const error = new Error('Database connection error');
            sinon.stub(Order, 'find').throws(error);

            await getOrders(req, res, next);

            expect(next.calledWith(error)).to.be.true;
        });
    });

    // ==================== Tests pour getOrderById ====================
    describe('getOrderById', () => {
        it('should retrieve order by ID successfully', async () => {
            req.params.id = '507f1f77bcf86cd799439011';
            
            const orderMock = {
                _id: '507f1f77bcf86cd799439011',
                userId: 'user123',
                total: 200,
                toObject: sinon.stub().returns({
                    _id: '507f1f77bcf86cd799439011',
                    userId: 'user123',
                    total: 200
                })
            };
            const itemsMock = [
                { productId: { title: 'Product 1', imageUrls: [] }, quantity: 2 }
            ];

            sinon.stub(mongoose.Types.ObjectId, 'isValid').returns(true);
            sinon.stub(Order, 'findById').resolves(orderMock);
            const populateStub = sinon.stub().resolves(itemsMock);
            sinon.stub(OrderItem, 'find').returns({ populate: populateStub });

            await getOrderById(req, res, next);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.firstCall.args[0].data.order).to.have.property('items');
            expect(res.json.firstCall.args[0].status).to.equal('success');
        });

        it('should return error if order ID is invalid', async () => {
            req.params.id = 'invalid-id';
            
            sinon.stub(mongoose.Types.ObjectId, 'isValid').returns(false);

            await getOrderById(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.equal('Invalid order ID');
            expect(error.statusCode).to.equal(400);
        });

        it('should return error if order does not exist', async () => {
            req.params.id = '507f1f77bcf86cd799439011';
            
            sinon.stub(mongoose.Types.ObjectId, 'isValid').returns(true);
            sinon.stub(Order, 'findById').resolves(null);

            await getOrderById(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.equal('Order not found');
            expect(error.statusCode).to.equal(404);
        });
    });

    // ==================== Tests pour updateOrderStatus ====================
    describe('updateOrderStatus', () => {
        it('should update order status successfully', async () => {
            req.params.id = '507f1f77bcf86cd799439011';
            req.body.status = 'shipped';
            
            const orderMock = {
                _id: '507f1f77bcf86cd799439011',
                status: 'pending',
                save: sinon.stub().resolves()
            };

            sinon.stub(mongoose.Types.ObjectId, 'isValid').returns(true);
            sinon.stub(Order, 'findById').resolves(orderMock);

            await updateOrderStatus(req, res, next);

            expect(orderMock.status).to.equal('shipped');
            expect(orderMock.save.calledOnce).to.be.true;
            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.firstCall.args[0].status).to.equal('success');
        });

        it('should return error if status is invalid', async () => {
            req.params.id = '507f1f77bcf86cd799439011';
            req.body.status = 'invalid-status';
            
            sinon.stub(mongoose.Types.ObjectId, 'isValid').returns(true);

            await updateOrderStatus(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.equal('Invalid status');
            expect(error.statusCode).to.equal(400);
        });

        it('should return error if order is cancelled', async () => {
            req.params.id = '507f1f77bcf86cd799439011';
            req.body.status = 'shipped';
            
            const orderMock = {
                status: 'cancelled'
            };

            sinon.stub(mongoose.Types.ObjectId, 'isValid').returns(true);
            sinon.stub(Order, 'findById').resolves(orderMock);

            await updateOrderStatus(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.include('Cannot update cancelled order');
        });

        it('should return error if order is already delivered', async () => {
            req.params.id = '507f1f77bcf86cd799439011';
            req.body.status = 'shipped';
            
            const orderMock = {
                status: 'delivered'
            };

            sinon.stub(mongoose.Types.ObjectId, 'isValid').returns(true);
            sinon.stub(Order, 'findById').resolves(orderMock);

            await updateOrderStatus(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.include('Cannot update delivered order');
        });

        it('should update to paid status successfully', async () => {
            req.params.id = '507f1f77bcf86cd799439011';
            req.body.status = 'paid';
            
            const orderMock = {
                _id: '507f1f77bcf86cd799439011',
                status: 'pending',
                save: sinon.stub().resolves()
            };

            sinon.stub(mongoose.Types.ObjectId, 'isValid').returns(true);
            sinon.stub(Order, 'findById').resolves(orderMock);

            await updateOrderStatus(req, res, next);

            expect(orderMock.status).to.equal('paid');
            expect(res.status.calledWith(200)).to.be.true;
        });

        it('should update to delivered status successfully', async () => {
            req.params.id = '507f1f77bcf86cd799439011';
            req.body.status = 'delivered';
            
            const orderMock = {
                _id: '507f1f77bcf86cd799439011',
                status: 'shipped',
                save: sinon.stub().resolves()
            };

            sinon.stub(mongoose.Types.ObjectId, 'isValid').returns(true);
            sinon.stub(Order, 'findById').resolves(orderMock);

            await updateOrderStatus(req, res, next);

            expect(orderMock.status).to.equal('delivered');
            expect(res.status.calledWith(200)).to.be.true;
        });
    });

    // ==================== Tests pour cancelOrder ====================
    describe('cancelOrder', () => {
        let sessionMock;

        beforeEach(() => {
            sessionMock = {
                startTransaction: sinon.stub(),
                commitTransaction: sinon.stub().resolves(),
                abortTransaction: sinon.stub().resolves(),
                endSession: sinon.stub()
            };
            
            sinon.stub(mongoose, 'startSession').resolves(sessionMock);
        });

        it('should cancel order successfully', async () => {
            req.params.id = '507f1f77bcf86cd799439011';
            
            const orderMock = {
                _id: '507f1f77bcf86cd799439011',
                userId: 'user123',
                status: 'pending',
                save: sinon.stub().resolves()
            };
            const orderItemsMock = [
                { productId: 'prod123', quantity: 2 }
            ];

            sinon.stub(mongoose.Types.ObjectId, 'isValid').returns(true);
            const sessionStub = sinon.stub().resolves(orderMock);
            sinon.stub(Order, 'findOne').returns({ session: sessionStub });
            const itemsSessionStub = sinon.stub().resolves(orderItemsMock);
            sinon.stub(OrderItem, 'find').returns({ session: itemsSessionStub });
            sinon.stub(Product, 'updateOne').resolves({});

            await cancelOrder(req, res, next);

            expect(orderMock.status).to.equal('cancelled');
            expect(res.status.calledWith(200)).to.be.true;
        });

        it('should restore product stock when cancelling order', async () => {
            req.params.id = '507f1f77bcf86cd799439011';
            
            const orderMock = {
                userId: 'user123',
                status: 'pending',
                save: sinon.stub().resolves()
            };
            const orderItemsMock = [
                { productId: 'prod123', quantity: 2 },
                { productId: 'prod456', quantity: 3 }
            ];

            sinon.stub(mongoose.Types.ObjectId, 'isValid').returns(true);
            const sessionStub = sinon.stub().resolves(orderMock);
            sinon.stub(Order, 'findOne').returns({ session: sessionStub });
            const itemsSessionStub = sinon.stub().resolves(orderItemsMock);
            sinon.stub(OrderItem, 'find').returns({ session: itemsSessionStub });
            const productUpdateStub = sinon.stub(Product, 'updateOne').resolves({});

            await cancelOrder(req, res, next);

            expect(productUpdateStub.callCount).to.equal(2);
            expect(productUpdateStub.firstCall.args[1]).to.deep.include({ $inc: { stock: 2 } });
            expect(productUpdateStub.secondCall.args[1]).to.deep.include({ $inc: { stock: 3 } });
            expect(res.status.calledWith(200)).to.be.true;
        });

        it('should abort transaction on error', async () => {
            req.params.id = '507f1f77bcf86cd799439011';
            
            const error = new Error('Database error');
            sinon.stub(mongoose.Types.ObjectId, 'isValid').returns(true);
            const sessionStub = sinon.stub().throws(error);
            sinon.stub(Order, 'findOne').returns({ session: sessionStub });

            await cancelOrder(req, res, next);

            expect(sessionMock.abortTransaction.calledOnce).to.be.true;
            expect(next.calledOnce).to.be.true;
            expect(next.firstCall.args[0]).to.equal(error);
        });

        it('should end session after completion', async () => {
            req.params.id = '507f1f77bcf86cd799439011';
            
            const orderMock = {
                userId: 'user123',
                status: 'pending',
                save: sinon.stub().resolves()
            };
            const orderItemsMock = [{ productId: 'prod123', quantity: 2 }];

            sinon.stub(mongoose.Types.ObjectId, 'isValid').returns(true);
            const sessionStub = sinon.stub().resolves(orderMock);
            sinon.stub(Order, 'findOne').returns({ session: sessionStub });
            const itemsSessionStub = sinon.stub().resolves(orderItemsMock);
            sinon.stub(OrderItem, 'find').returns({ session: itemsSessionStub });
            sinon.stub(Product, 'updateOne').resolves({});

            await cancelOrder(req, res, next);

            expect(sessionMock.endSession.calledOnce).to.be.true;
        });

        it('should return error if order ID is invalid', async () => {
            req.params.id = 'invalid-id';
            
            sinon.stub(mongoose.Types.ObjectId, 'isValid').returns(false);

            await cancelOrder(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.equal('Invalid order ID');
            expect(error.statusCode).to.equal(400);
        });
    });
});

        //     expect(orderMock.status).to.equal('cancelled');
        //     expect(sessionMock.commitTransaction.calledOnce).to.be.true;
        //     expect(res.status.calledWith(200)).to.be.true;
        //     expect(res.json.firstCall.args[0].status).to.equal('success');
        // });

        // it('should return error if order does not exist', async () => {
        //     req.params.id = '507f1f77bcf86cd799439011';
            
        //     sinon.stub(mongoose.Types.ObjectId, 'isValid').returns(true);
        //     const sessionStub = sinon.stub().resolves(null);
        //     sinon.stub(Order, 'findOne').returns({ session: sessionStub });

        //     await cancelOrder(req, res, next);

        //     expect(next.calledOnce).to.be.true;
        //     expect(sessionMock.abortTransaction.calledOnce).to.be.true;
        //     const error = next.firstCall.args[0];
        //     expect(error.message).to.equal('Order not found');
        // });

        // it('should return error if user is not authorized', async () => {
        //     req.params.id = '507f1f77bcf86cd799439011';
        //     req.user.id = 'otherUser';
        //     req.user.role = 'user';
            
        //     const orderMock = {
        //         userId: 'user123',
        //         status: 'pending'
        //     };

        //     sinon.stub(mongoose.Types.ObjectId, 'isValid').returns(true);
        //     const sessionStub = sinon.stub().resolves(orderMock);
        //     sinon.stub(Order, 'findOne').returns({ session: sessionStub });

        //     await cancelOrder(req, res, next);

        //     expect(next.calledOnce).to.be.true;
        //     const error = next.firstCall.args[0];
        //     expect(error.message).to.include('not allowed');
        //     expect(error.statusCode).to.equal(403);
        // });

        // it('should return error if order is already cancelled', async () => {
        //     req.params.id = '507f1f77bcf86cd799439011';
            
        //     const orderMock = {
        //         userId: 'user123',
        //         status: 'cancelled'
        //     };

        //     sinon.stub(mongoose.Types.ObjectId, 'isValid').returns(true);
        //     const sessionStub = sinon.stub().resolves(orderMock);
        //     sinon.stub(Order, 'findOne').returns({ session: sessionStub });

        //     await cancelOrder(req, res, next);

        //     expect(next.calledOnce).to.be.true;
        //     const error = next.firstCall.args[0];
        //     expect(error.message).to.equal('Order already cancelled');
        //     expect(error.statusCode).to.equal(400);
        // });

        // it('should return error if order is not pending', async () => {
        //     req.params.id = '507f1f77bcf86cd799439011';
            
        //     const orderMock = {
        //         userId: 'user123',
        //         status: 'shipped'
        //     };

        //     sinon.stub(mongoose.Types.ObjectId, 'isValid').returns(true);
        //     const sessionStub = sinon.stub().resolves(orderMock);
        //     sinon.stub(Order, 'findOne').returns({ session: sessionStub });

        //     await cancelOrder(req, res, next);

        //     expect(next.calledOnce).to.be.true;
        //     const error = next.firstCall.args[0];
        //     expect(error.message).to.equal('Only pending orders can be cancelled');
        //     expect(error.statusCode).to.equal(400);
        // });

        // it('should allow admin to cancel another user order', async () => {
        //     req.params.id = '507f1f77bcf86cd799439011';
        //     req.user.id = 'admin123';
        //     req.user.role = 'admin';
            
        //     const orderMock = {
        //         userId: 'user123',
        //         status: 'pending',
        //         save: sinon.stub().resolves()
        //     };
        //     const orderItemsMock = [{ productId: 'prod123', quantity: 2 }];

        //     sinon.stub(mongoose.Types.ObjectId, 'isValid').returns(true);
        //     const sessionStub = sinon.stub().resolves(orderMock);
        //     sinon.stub(Order, 'findOne').returns({ session: sessionStub });
        //     const itemsSessionStub = sinon.stub().resolves(orderItemsMock);
        //     sinon.stub(OrderItem, 'find').returns({ session: itemsSessionStub });
        //     sinon.stub(Product, 'updateOne').resolves({});

        //     await cancelOrder(req, res, next);