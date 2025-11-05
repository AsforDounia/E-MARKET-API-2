import { expect } from "chai";
import sinon from "sinon";
import mongoose from "mongoose";
import { Types } from "mongoose";
import {
    createOrder,
    getOrders,
    getOrderById,
    updateOrderStatus,
    cancelOrder,
} from "../../controllers/orderController.js";
import { Order, OrderItem, Cart, CartItem, Product, Coupon, OrderCoupon } from "../../models/Index.js";
import { AppError } from "../../middlewares/errorHandler.js";
import notificationService from "../../services/notificationService.js";
import cacheInvalidation from "../../services/cacheInvalidation.js";

describe("Order Controller", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: { id: new mongoose.Types.ObjectId().toString(), role: "user" },
            body: {},
            params: {},
        };
        res = {
            status: sinon.stub().returnsThis(),
            json: sinon.stub().returnsThis(),
        };
        next = sinon.stub();
    });

    afterEach(() => {
        sinon.restore();
    });

    // ==================== Tests pour createOrder ====================
    describe("createOrder", () => {
        let sessionMock, transactionStub;

        beforeEach(() => {
            sessionMock = {
                startTransaction: sinon.stub(),
                commitTransaction: sinon.stub(),
                abortTransaction: sinon.stub(),
                endSession: sinon.stub(),
            };

            transactionStub = sinon.stub().callsFake(async (callback) => {
                return await callback();
            });

            sessionMock.withTransaction = transactionStub;
            sinon.stub(mongoose, "startSession").resolves(sessionMock);
        });

        it("should create an order successfully", async () => {
            const cartMock = {
                _id: "cart123",
                userId: new mongoose.Types.ObjectId().toString(),
            };
            const productMock = {
                _id: "prod123",
                title: "Test Product",
                description: "desc1",
                price: 100,
                stock: 10,
                sellerId: "seller123",
                imageUrls: [],
                deletedAt: null,
            };
            const cartItemsMock = [
                {
                    productId: productMock,
                    quantity: 2,
                    cartId: "cart123",
                },
            ];
            const orderMock = [
                {
                    _id: "order123",
                    userId: new mongoose.Types.ObjectId().toString(),
                    subtotal: 200,
                    discount: 0,
                    total: 200,
                },
            ];

            sinon.stub(Cart, "findOne").resolves(cartMock);
            const populateStub = sinon.stub().resolves(cartItemsMock);
            sinon.stub(CartItem, "find").returns({ populate: populateStub });
            sinon.stub(Order, "create").resolves(orderMock);
            sinon.stub(OrderItem, "create").resolves([{}]);
            sinon.stub(Product, "updateOne").resolves({});
            sinon.stub(CartItem, "deleteMany").resolves({});

            await createOrder(req, res, next);

            expect(res.status.calledWith(201)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
            expect(res.json.firstCall.args[0]).to.have.property("success", true);
            expect(res.json.firstCall.args[0].data.order).to.have.property("total", 200);
        });

        it("should return an error if cart is not found", async () => {
            sinon.stub(Cart, "findOne").resolves(null);

            await createOrder(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error).to.be.instanceOf(AppError);
            expect(error.message).to.equal("Cart not found");
            expect(error.statusCode).to.equal(404);
        });

        it("should return an error if cart is empty", async () => {
            const cartMock = {
                _id: "cart123",
                userId: new mongoose.Types.ObjectId().toString(),
            };

            sinon.stub(Cart, "findOne").resolves(cartMock);
            const populateStub = sinon.stub().resolves([]);
            sinon.stub(CartItem, "find").returns({ populate: populateStub });

            await createOrder(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.equal("Cart is empty");
        });

        it("should return an error if product stock is insufficient", async () => {
            const cartMock = {
                _id: "cart123",
                userId: new mongoose.Types.ObjectId().toString(),
            };
            const productMock = {
                _id: "prod123",
                title: "Test Product",
                price: 100,
                stock: 1,
                deletedAt: null,
            };
            const cartItemsMock = [
                {
                    productId: productMock,
                    quantity: 5,
                },
            ];

            sinon.stub(Cart, "findOne").resolves(cartMock);
            const populateStub = sinon.stub().resolves(cartItemsMock);
            sinon.stub(CartItem, "find").returns({ populate: populateStub });

            await createOrder(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.include("Insufficient stock");
        });

        it("should return an error if product is deleted", async () => {
            const cartMock = {
                _id: "cart123",
                userId: new mongoose.Types.ObjectId().toString(),
            };
            const productMock = {
                _id: "prod123",
                title: "Deleted Product",
                price: 100,
                stock: 10,
                deletedAt: new Date(),
            };
            const cartItemsMock = [
                {
                    productId: productMock,
                    quantity: 2,
                },
            ];

            sinon.stub(Cart, "findOne").resolves(cartMock);
            const populateStub = sinon.stub().resolves(cartItemsMock);
            sinon.stub(CartItem, "find").returns({ populate: populateStub });

            await createOrder(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.include("Product no longer available");
        });

        // Tests pour les coupons
        it("should apply a percentage coupon successfully", async () => {
            req.body.couponCodes = ["SAVE20"];

            const cartMock = {
                _id: "cart123",
                userId: new mongoose.Types.ObjectId().toString(),
            };
            const productMock = {
                _id: "prod123",
                title: "Test Product",
                price: 100,
                stock: 10,
                sellerId: "seller123",
                deletedAt: null,
            };
            const cartItemsMock = [
                {
                    productId: productMock,
                    quantity: 2,
                },
            ];
            const couponMock = {
                _id: "coupon123",
                code: "SAVE20",
                type: "percentage",
                value: 20,
                isActive: true,
                minAmount: 0,
            };
            const orderMock = [
                {
                    _id: "order123",
                    userId: new mongoose.Types.ObjectId().toString(),
                    subtotal: 200,
                    discount: 40,
                    total: 160,
                },
            ];

            sinon.stub(Cart, "findOne").resolves(cartMock);
            const populateStub = sinon.stub().resolves(cartItemsMock);
            sinon.stub(CartItem, "find").returns({ populate: populateStub });
            const sessionStub = sinon.stub().resolves(couponMock);
            sinon.stub(Coupon, "findOne").returns({ session: sessionStub });
            sinon.stub(Order, "create").resolves(orderMock);
            sinon.stub(OrderItem, "create").resolves([{}]);
            sinon.stub(Product, "updateOne").resolves({});
            sinon.stub(CartItem, "deleteMany").resolves({});
            
            // Mock UserCoupon and OrderCoupon
            const { UserCoupon, OrderCoupon } = await import("../../models/Index.js");
            const userCouponSessionStub = sinon.stub().resolves(null);
            sinon.stub(UserCoupon, "findOne").returns({ session: userCouponSessionStub });
            const countSessionStub = sinon.stub().resolves(0);
            sinon.stub(UserCoupon, "countDocuments").returns({ session: countSessionStub });
            sinon.stub(UserCoupon, "create").resolves({});
            sinon.stub(OrderCoupon, "insertMany").resolves({});

            await createOrder(req, res, next);

            expect(res.status.calledWith(201)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
            expect(res.json.firstCall.args[0]).to.have.property("success", true);
        });

        it("should apply fixed amount coupon correctly", async () => {
            req.body.couponCodes = ["FIXED50"];

            const cartMock = {
                _id: "cart123",
                userId: new mongoose.Types.ObjectId().toString(),
            };
            const productMock = {
                _id: "prod123",
                title: "Test Product",
                price: 100,
                stock: 10,
                sellerId: "seller123",
                deletedAt: null,
            };
            const cartItemsMock = [
                {
                    productId: productMock,
                    quantity: 2,
                },
            ];
            const couponMock = {
                _id: "coupon123",
                code: "FIXED50",
                type: "fixed",
                value: 50,
                isActive: true,
                minAmount: 0,
            };
            const orderMock = [
                {
                    _id: "order123",
                    userId: new mongoose.Types.ObjectId().toString(),
                    subtotal: 200,
                    discount: 50,
                    total: 150,
                },
            ];

            sinon.stub(Cart, "findOne").resolves(cartMock);
            const populateStub = sinon.stub().resolves(cartItemsMock);
            sinon.stub(CartItem, "find").returns({ populate: populateStub });
            const sessionStub = sinon.stub().resolves(couponMock);
            sinon.stub(Coupon, "findOne").returns({ session: sessionStub });
            sinon.stub(Order, "create").resolves(orderMock);
            sinon.stub(OrderItem, "create").resolves([{}]);
            sinon.stub(Product, "updateOne").resolves({});
            sinon.stub(CartItem, "deleteMany").resolves({});
            
            // Mock UserCoupon and OrderCoupon
            const { UserCoupon, OrderCoupon } = await import("../../models/Index.js");
            const userCouponSessionStub = sinon.stub().resolves(null);
            sinon.stub(UserCoupon, "findOne").returns({ session: userCouponSessionStub });
            const countSessionStub = sinon.stub().resolves(0);
            sinon.stub(UserCoupon, "countDocuments").returns({ session: countSessionStub });
            sinon.stub(UserCoupon, "create").resolves({});
            sinon.stub(OrderCoupon, "insertMany").resolves({});

            await createOrder(req, res, next);

            expect(res.status.calledWith(201)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
            expect(res.json.firstCall.args[0]).to.have.property("success", true);
        });

        it("should return an error if coupon is invalid", async () => {
            req.body.couponCodes = ["INVALID"];

            const cartMock = { _id: "cart123", userId: "user123" };
            const productMock = {
                _id: "prod123",
                price: 100,
                stock: 10,
                deletedAt: null,
            };
            const cartItemsMock = [{ productId: productMock, quantity: 2 }];

            sinon.stub(Cart, "findOne").resolves(cartMock);
            const populateStub = sinon.stub().resolves(cartItemsMock);
            sinon.stub(CartItem, "find").returns({ populate: populateStub });
            const sessionStub = sinon.stub().resolves(null);
            sinon.stub(Coupon, "findOne").returns({ session: sessionStub });

            await createOrder(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.include("Invalid coupon: INVALID");
        });

        it("should return an error if coupon is expired", async () => {
            req.body.couponCodes = ["EXPIRED"];

            const cartMock = { _id: "cart123", userId: "user123" };
            const productMock = {
                _id: "prod123",
                price: 100,
                stock: 10,
                deletedAt: null,
            };
            const cartItemsMock = [{ productId: productMock, quantity: 2 }];
            const couponMock = {
                code: "EXPIRED",
                isActive: true,
                expiresAt: new Date("2020-01-01"),
            };

            sinon.stub(Cart, "findOne").resolves(cartMock);
            const populateStub = sinon.stub().resolves(cartItemsMock);
            sinon.stub(CartItem, "find").returns({ populate: populateStub });
            const sessionStub = sinon.stub().resolves(couponMock);
            sinon.stub(Coupon, "findOne").returns({ session: sessionStub });

            await createOrder(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.include("Coupon expired: EXPIRED");
        });

        it("should return an error if coupon has already been used", async () => {
            const userId = new mongoose.Types.ObjectId();
            req.body.couponCodes = ["USED"];
            req.user.id = userId.toString();

            const cartMock = {
                _id: "cart123",
                userId,
            };
            const productMock = {
                _id: "prod123",
                price: 100,
                stock: 10,
                deletedAt: null,
            };
            const cartItemsMock = [{ productId: productMock, quantity: 2 }];
            const couponMock = {
                _id: "coupon123",
                code: "USED",
                isActive: true,
            };

            sinon.stub(Cart, "findOne").resolves(cartMock);
            const populateStub = sinon.stub().resolves(cartItemsMock);
            sinon.stub(CartItem, "find").returns({ populate: populateStub });
            const sessionStub = sinon.stub().resolves(couponMock);
            sinon.stub(Coupon, "findOne").returns({ session: sessionStub });
            
            // Mock UserCoupon to simulate already used
            const { UserCoupon } = await import("../../models/Index.js");
            const userCouponSessionStub = sinon.stub().resolves({ user: userId, coupon: "coupon123" });
            sinon.stub(UserCoupon, "findOne").returns({ session: userCouponSessionStub });

            await createOrder(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.include("Coupon already used: USED");
        });

        it("should return an error if minimum coupon amount is not met", async () => {
            req.body.couponCodes = ["SAVE50"];

            const cartMock = {
                _id: "cart123",
                userId: new mongoose.Types.ObjectId().toString(),
            };
            const productMock = {
                _id: "prod123",
                price: 50,
                stock: 10,
                deletedAt: null,
            };
            const cartItemsMock = [{ productId: productMock, quantity: 1 }];
            const couponMock = {
                code: "SAVE50",
                isActive: true,
                minAmount: 100,
            };

            sinon.stub(Cart, "findOne").resolves(cartMock);
            const populateStub = sinon.stub().resolves(cartItemsMock);
            sinon.stub(CartItem, "find").returns({ populate: populateStub });
            const sessionStub = sinon.stub().resolves(couponMock);
            sinon.stub(Coupon, "findOne").returns({ session: sessionStub });
            
            // Mock UserCoupon
            const { UserCoupon } = await import("../../models/Index.js");
            const userCouponSessionStub = sinon.stub().resolves(null);
            sinon.stub(UserCoupon, "findOne").returns({ session: userCouponSessionStub });
            sinon.stub(UserCoupon, "countDocuments").resolves(0);

            await createOrder(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.include("Minimum amount 100 required for coupon: SAVE50");
        });

        it("should return an error if coupon usage limit is reached", async () => {
            req.body.couponCodes = ["LIMITED"];

            const cartMock = { _id: "cart123", userId: "user123" };
            const productMock = {
                _id: "prod123",
                price: 100,
                stock: 10,
                deletedAt: null,
            };
            const cartItemsMock = [{ productId: productMock, quantity: 2 }];
            const couponMock = {
                _id: "coupon123",
                code: "LIMITED",
                isActive: true,
                usageLimit: 3,
                minAmount: 0,
            };

            sinon.stub(Cart, "findOne").resolves(cartMock);
            const populateStub = sinon.stub().resolves(cartItemsMock);
            sinon.stub(CartItem, "find").returns({ populate: populateStub });
            const sessionStub = sinon.stub().resolves(couponMock);
            sinon.stub(Coupon, "findOne").returns({ session: sessionStub });
            
            // Mock UserCoupon
            const { UserCoupon } = await import("../../models/Index.js");
            const userCouponSessionStub = sinon.stub().resolves(null);
            sinon.stub(UserCoupon, "findOne").returns({ session: userCouponSessionStub });
            const countSessionStub = sinon.stub().resolves(3); // Usage limit reached
            sinon.stub(UserCoupon, "countDocuments").returns({ session: countSessionStub });

            await createOrder(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.include("Coupon usage limit reached: LIMITED");
        });
    });

    // ==================== Tests pour getOrders ====================
    describe("getOrders", () => {
        it("should retrieve all user orders successfully", async () => {
            const userId = new mongoose.Types.ObjectId().toString();
            req.user.id = userId;
            req.query = { page: 1, limit: 10 };

            const ordersMock = [
                {
                    _id: "order1",
                    userId,
                    subtotal: 200,
                    discount: 0,
                    total: 200,
                    status: "pending",
                    createdAt: new Date("2024-01-02T10:00:00Z"),
                    toObject: function() { return this; }
                },
                {
                    _id: "order2",
                    userId,
                    subtotal: 150,
                    discount: 10,
                    total: 140,
                    status: "paid",
                    createdAt: new Date("2024-01-01T10:00:00Z"),
                    toObject: function() { return this; }
                }
            ];

            sinon.stub(Order, "find").returns({
                sort: sinon.stub().returnsThis(),
                skip: sinon.stub().returnsThis(),
                limit: sinon.stub().resolves(ordersMock)
            });
            sinon.stub(Order, "countDocuments").resolves(2);
            
            // Mock OrderCoupon
            const populateStub = sinon.stub().resolves([]);
            sinon.stub(OrderCoupon, "find").returns({ populate: populateStub });

            await getOrders(req, res, next);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
            expect(res.json.firstCall.args[0].success).to.equal(true);
            expect(res.json.firstCall.args[0].message).to.equal('Orders retrieved successfully');
            expect(res.json.firstCall.args[0].data.orders).to.be.an("array");
            expect(res.json.firstCall.args[0].metadata.total).to.equal(2);
        });

        it("should return empty array if no orders found", async () => {
            req.user.id = new mongoose.Types.ObjectId().toString();
            req.query = { page: 1, limit: 10 };

            sinon.stub(Order, "find").returns({
                sort: sinon.stub().returnsThis(),
                skip: sinon.stub().returnsThis(),
                limit: sinon.stub().resolves([])
            });
            sinon.stub(Order, "countDocuments").resolves(0);

            await getOrders(req, res, next);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.firstCall.args[0].data.orders).to.be.an("array");
            expect(res.json.firstCall.args[0].data.orders.length).to.equal(0);
            expect(res.json.firstCall.args[0].metadata.total).to.equal(0);
        });

        it("should handle errors gracefully", async () => {
            req.user.id = new mongoose.Types.ObjectId().toString();
            req.query = { page: 1, limit: 10 };

            sinon.stub(Order, "find").throws(new Error("Database error"));

            await getOrders(req, res, next);

            expect(next.calledOnce).to.be.true;
            expect(next.firstCall.args[0].message).to.equal("Database error");
        });

        it("should filter orders by status", async () => {
            const userId = new mongoose.Types.ObjectId().toString();
            req.user.id = userId;
            req.query = { page: 1, limit: 10, status: "pending" };

            const ordersMock = [
                {
                    _id: "order1",
                    userId,
                    status: "pending",
                    toObject: function() { return this; }
                }
            ];

            const findStub = sinon.stub(Order, "find");
            findStub.returns({
                sort: sinon.stub().returnsThis(),
                skip: sinon.stub().returnsThis(),
                limit: sinon.stub().resolves(ordersMock)
            });
            sinon.stub(Order, "countDocuments").resolves(1);
            
            const populateStub = sinon.stub().resolves([]);
            sinon.stub(OrderCoupon, "find").returns({ populate: populateStub });

            await getOrders(req, res, next);

            expect(findStub.calledWith({ userId, status: "pending" })).to.be.true;
            expect(res.status.calledWith(200)).to.be.true;
        });

        it("should handle pagination correctly", async () => {
            req.user.id = new mongoose.Types.ObjectId().toString();
            req.query = { page: 2, limit: 5 };

            const ordersMock = [
                {
                    _id: "order1",
                    toObject: function() { return this; }
                }
            ];

            const skipStub = sinon.stub().returnsThis();
            const limitStub = sinon.stub().resolves(ordersMock);

            sinon.stub(Order, "find").returns({
                sort: sinon.stub().returnsThis(),
                skip: skipStub,
                limit: limitStub
            });
            sinon.stub(Order, "countDocuments").resolves(10);
            
            const populateStub = sinon.stub().resolves([]);
            sinon.stub(OrderCoupon, "find").returns({ populate: populateStub });

            await getOrders(req, res, next);

            expect(skipStub.calledWith(5)).to.be.true;
            expect(limitStub.calledWith(5)).to.be.true;
            expect(res.json.firstCall.args[0].metadata.currentPage).to.equal(2);
            expect(res.json.firstCall.args[0].metadata.pageSize).to.equal(5);
            expect(res.json.firstCall.args[0].metadata.hasNextPage).to.equal(false);
            expect(res.json.firstCall.args[0].metadata.hasPreviousPage).to.equal(true);
        });

        it("should return orders sorted by creation date (newest first)", async () => {
            req.user.id = new mongoose.Types.ObjectId().toString();
            req.query = { page: 1, limit: 10 };

            const sortStub = sinon.stub().returnsThis();
            
            sinon.stub(Order, "find").returns({
                sort: sortStub,
                skip: sinon.stub().returnsThis(),
                limit: sinon.stub().resolves([])
            });
            sinon.stub(Order, "countDocuments").resolves(0);

            await getOrders(req, res, next);

            expect(sortStub.calledWith({ createdAt: -1 })).to.be.true;
        });

        it("should populate order coupons for each order", async () => {
            const userId = new mongoose.Types.ObjectId().toString();
            req.user.id = userId;
            req.query = { page: 1, limit: 10 };

            const ordersMock = [
                {
                    _id: "order1",
                    userId,
                    total: 200,
                    toObject: function() { return this; }
                }
            ];

            sinon.stub(Order, "find").returns({
                sort: sinon.stub().returnsThis(),
                skip: sinon.stub().returnsThis(),
                limit: sinon.stub().resolves(ordersMock)
            });
            sinon.stub(Order, "countDocuments").resolves(1);
            
            const couponsMock = [{ couponId: { code: "SAVE20" } }];
            const populateStub = sinon.stub().resolves(couponsMock);
            sinon.stub(OrderCoupon, "find").returns({ populate: populateStub });

            await getOrders(req, res, next);

            expect(res.json.firstCall.args[0].data.orders[0]).to.have.property("coupons");
            expect(res.json.firstCall.args[0].data.orders[0].coupons).to.deep.equal(couponsMock);
        });
    });
    // ==================== Tests pour getOrderById ====================
    describe("getOrderById", () => {
        it("should retrieve order by ID successfully", async () => {
            req.params.id = "507f1f77bcf86cd799439011";
            req.user.id = "user123";

            const orderMock = {
                _id: "507f1f77bcf86cd799439011",
                userId: "user123",
                total: 200,
                toObject: sinon.stub().returns({
                    _id: "507f1f77bcf86cd799439011",
                    userId: "user123",
                    total: 200,
                }),
            };
            const itemsMock = [{ productId: { title: "Product 1", imageUrls: [] }, quantity: 2 }];

            sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
            sinon.stub(Order, "findById").resolves(orderMock);
            const populateStub = sinon.stub().resolves(itemsMock);
            sinon.stub(OrderItem, "find").returns({ populate: populateStub });
            
            // Mock OrderCoupon
            const { OrderCoupon } = await import("../../models/Index.js");
            const populateCouponStub = sinon.stub().resolves([]);
            sinon.stub(OrderCoupon, "find").returns({ populate: populateCouponStub });

            await getOrderById(req, res, next);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.firstCall.args[0].data.order).to.have.property("items");
            expect(res.json.firstCall.args[0].success).to.equal(true);
        });

        it("should return error if order ID is invalid", async () => {
            req.params.id = "invalid-id";

            sinon.stub(mongoose.Types.ObjectId, "isValid").returns(false);

            await getOrderById(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.equal("Invalid order ID");
            expect(error.statusCode).to.equal(400);
        });

        it("should return error if order does not exist", async () => {
            req.params.id = "507f1f77bcf86cd799439011";

            sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
            sinon.stub(Order, "findById").resolves(null);

            await getOrderById(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.equal("Order not found");
            expect(error.statusCode).to.equal(404);
        });
    });

    // ==================== Tests pour updateOrderStatus ====================
    describe("updateOrderStatus", () => {
        it("should update order status successfully", async () => {
            req.params.id = "507f1f77bcf86cd799439011";
            req.body.status = "shipped";
            req.user.role = "admin";

            const orderMock = {
                _id: "507f1f77bcf86cd799439011",
                userId: "user123",
                status: "pending",
                save: sinon.stub().resolves(),
            };

            sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
            sinon.stub(Order, "findById").resolves(orderMock);
            sinon.stub(notificationService, "emitOrderUpdated").returns();
            sinon.stub(cacheInvalidation, "invalidateUserOrders").resolves();

            await updateOrderStatus(req, res, next);

            expect(orderMock.status).to.equal("shipped");
            expect(orderMock.save.calledOnce).to.be.true;
            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.firstCall.args[0].success).to.equal(true);
        });

        it("should return error if status is invalid", async () => {
            req.params.id = "507f1f77bcf86cd799439011";
            req.body.status = "invalid-status";

            sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);

            await updateOrderStatus(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.equal("Invalid status");
            expect(error.statusCode).to.equal(400);
        });

        it("should return error if order is cancelled", async () => {
            req.params.id = "507f1f77bcf86cd799439011";
            req.body.status = "shipped";
            req.user.role = "admin";

            const orderMock = {
                status: "cancelled",
            };

            sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
            sinon.stub(Order, "findById").resolves(orderMock);

            await updateOrderStatus(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.include("Cannot update cancelled order");
        });

        it("should return error if order is already delivered", async () => {
            req.params.id = "507f1f77bcf86cd799439011";
            req.body.status = "shipped";
            req.user.role = "admin";

            const orderMock = {
                status: "delivered",
            };

            sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
            sinon.stub(Order, "findById").resolves(orderMock);

            await updateOrderStatus(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.include("Cannot update delivered order");
        });

        it("should update to paid status successfully", async () => {
            req.params.id = "507f1f77bcf86cd799439011";
            req.body.status = "paid";
            req.user.role = "admin";

            const orderMock = {
                _id: "507f1f77bcf86cd799439011",
                userId: "user123",
                status: "pending",
                save: sinon.stub().resolves(),
            };

            sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
            sinon.stub(Order, "findById").resolves(orderMock);
            sinon.stub(notificationService, "emitOrderUpdated").returns();
            sinon.stub(cacheInvalidation, "invalidateUserOrders").resolves();

            await updateOrderStatus(req, res, next);

            expect(orderMock.status).to.equal("paid");
            expect(res.status.calledWith(200)).to.be.true;
        });

        it("should update to delivered status successfully", async () => {
            req.params.id = "507f1f77bcf86cd799439011";
            req.body.status = "delivered";
            req.user.role = "admin";

            const orderMock = {
                _id: "507f1f77bcf86cd799439011",
                userId: "user123",
                status: "shipped",
                save: sinon.stub().resolves(),
            };

            sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
            sinon.stub(Order, "findById").resolves(orderMock);
            sinon.stub(notificationService, "emitOrderUpdated").returns();
            sinon.stub(cacheInvalidation, "invalidateUserOrders").resolves();

            await updateOrderStatus(req, res, next);

            expect(orderMock.status).to.equal("delivered");
            expect(res.status.calledWith(200)).to.be.true;
        });
    });

    // ==================== Tests pour cancelOrder ====================

    describe("cancelOrder", () => {
        let req, res, next, sessionMock;

        beforeEach(() => {
            req = { params: {}, user: {} };
            res = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub().returnsThis(),
            };
            next = sinon.stub();

            sessionMock = {
                startTransaction: sinon.stub(),
                commitTransaction: sinon.stub().resolves(),
                abortTransaction: sinon.stub().resolves(),
                endSession: sinon.stub(),
                withTransaction: sinon.stub().callsFake(async (callback) => {
                    return await callback();
                }),
            };

            sinon.stub(mongoose, "startSession").resolves(sessionMock);
        });

        afterEach(() => {
            sinon.restore();
        });

        it("should cancel order successfully", async () => {
            req.params.id = "507f1f77bcf86cd799439011";
            req.user.id = new mongoose.Types.ObjectId().toString();
            req.user.role = "user";

            const orderMock = {
                _id: req.params.id,
                userId: req.user.id,
                status: "pending",
                save: sinon.stub().resolves(),
            };
            const orderItemsMock = [{ productId: "prod123", quantity: 2 }];

            sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
            const orderSessionStub = sinon.stub().resolves(orderMock);
            sinon.stub(Order, "findOne").returns({ session: orderSessionStub });
            const orderItemSessionStub = sinon.stub().resolves(orderItemsMock);
            sinon.stub(OrderItem, "find").returns({ session: orderItemSessionStub });
            
            // Mock OrderCoupon and UserCoupon
            const { OrderCoupon, UserCoupon } = await import("../../models/Index.js");
            const orderCouponSessionStub = sinon.stub().resolves([]);
            sinon.stub(OrderCoupon, "find").returns({ session: orderCouponSessionStub });
            sinon.stub(UserCoupon, "deleteOne").resolves({});
            
            // Mock Order.findById for final response
            const finalOrderMock = { ...orderMock, status: "cancelled" };
            sinon.stub(Order, "findById").resolves(finalOrderMock);

            const productUpdateStub = sinon.stub(Product, "updateOne").resolves({});
            sinon.stub(notificationService, "emitOrderUpdated").returns();
            sinon.stub(cacheInvalidation, "invalidateUserOrders").resolves();

            await cancelOrder(req, res, next);

            expect(orderMock.status).to.equal("cancelled");
            expect(productUpdateStub.callCount).to.equal(1);
            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
            expect(res.json.firstCall.args[0].success).to.equal(true);
        });

        it("should restore product stock when cancelling order", async () => {
            req.params.id = "507f1f77bcf86cd799439011";
            req.user.id = new mongoose.Types.ObjectId().toString();
            req.user.role = "user";

            const orderMock = {
                userId: req.user.id,
                status: "pending",
                save: sinon.stub().resolves(),
            };
            const orderItemsMock = [
                { productId: "prod123", quantity: 2 },
                { productId: "prod456", quantity: 3 },
            ];

            sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
            const orderSessionStub = sinon.stub().resolves(orderMock);
            sinon.stub(Order, "findOne").returns({ session: orderSessionStub });
            const orderItemSessionStub = sinon.stub().resolves(orderItemsMock);
            sinon.stub(OrderItem, "find").returns({ session: orderItemSessionStub });
            
            // Mock OrderCoupon and UserCoupon
            const { OrderCoupon, UserCoupon } = await import("../../models/Index.js");
            const orderCouponSessionStub = sinon.stub().resolves([]);
            sinon.stub(OrderCoupon, "find").returns({ session: orderCouponSessionStub });
            sinon.stub(UserCoupon, "deleteOne").resolves({});
            
            // Mock Order.findById for final response
            sinon.stub(Order, "findById").resolves(orderMock);
            
            const productUpdateStub = sinon.stub(Product, "updateOne").resolves({});
            sinon.stub(notificationService, "emitOrderUpdated").returns();
            sinon.stub(cacheInvalidation, "invalidateUserOrders").resolves();

            await cancelOrder(req, res, next);

            expect(productUpdateStub.callCount).to.equal(2);
            expect(productUpdateStub.firstCall.args[1]).to.deep.include({
                $inc: { stock: 2 },
            });
            expect(productUpdateStub.secondCall.args[1]).to.deep.include({
                $inc: { stock: 3 },
            });
        });

        it("should abort transaction on error", async () => {
            req.params.id = "507f1f77bcf86cd799439011";
            req.user.id = "user123";
            req.user.role = "user";
            
            sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
            sinon.stub(Order, "findOne").throws(new Error("Database error"));

            await cancelOrder(req, res, next);

            expect(next.calledOnce).to.be.true;
            expect(next.firstCall.args[0].message).to.equal("Database error");
        });

        it("should end session after completion", async () => {
            req.params.id = "507f1f77bcf86cd799439011";
            ((req.user.id = new mongoose.Types.ObjectId().toString()), (req.user.role = "user"));

            const orderMock = {
                userId: "user123",
                status: "pending",
                save: sinon.stub().resolves(),
            };
            const orderItemsMock = [{ productId: "prod123", quantity: 2 }];

            sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
            sinon.stub(Order, "findOne").returns({ session: () => Promise.resolve(orderMock) });
            sinon
                .stub(OrderItem, "find")
                .returns({ session: () => Promise.resolve(orderItemsMock) });
            sinon.stub(Product, "updateOne").resolves({});

            await cancelOrder(req, res, next);

            expect(sessionMock.endSession.calledOnce).to.be.true;
        });

        it("should return error if order ID is invalid", async () => {
            req.params.id = "invalid-id";
            req.user.id = "user123";
            req.user.role = "user";
            
            sinon.stub(mongoose.Types.ObjectId, "isValid").returns(false);

            await cancelOrder(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.equal("Invalid order ID");
            expect(error.statusCode).to.equal(400);
        });

        it("should return error if order does not exist", async () => {
            req.params.id = "507f1f77bcf86cd799439011";
            req.user.id = "user123";
            req.user.role = "user";

            sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
            const orderSessionStub = sinon.stub().resolves(null);
            sinon.stub(Order, "findOne").returns({ session: orderSessionStub });

            await cancelOrder(req, res, next);

            expect(next.calledOnce).to.be.true;
            expect(next.firstCall.args[0].message).to.equal("Order not found");
        });

        it("should return error if user is not authorized", async () => {
            req.params.id = "507f1f77bcf86cd799439011";
            req.user.id = "otherUser";
            req.user.role = "user";

            const orderMock = { userId: "user123", status: "pending" };

            sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
            const orderSessionStub = sinon.stub().resolves(orderMock);
            sinon.stub(Order, "findOne").returns({ session: orderSessionStub });

            await cancelOrder(req, res, next);

            expect(next.calledOnce).to.be.true;
            const error = next.firstCall.args[0];
            expect(error.message).to.include("not allowed");
            expect(error.statusCode).to.equal(403);
        });

        it("should allow admin to cancel another user order", async () => {
            req.params.id = "507f1f77bcf86cd799439011";
            req.user.id = "admin123";
            req.user.role = "admin";

            const orderMock = {
                userId: new mongoose.Types.ObjectId().toString(),
                status: "pending",
                save: sinon.stub().resolves(),
            };
            const orderItemsMock = [{ productId: "prod123", quantity: 2 }];

            sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
            const orderSessionStub = sinon.stub().resolves(orderMock);
            sinon.stub(Order, "findOne").returns({ session: orderSessionStub });
            const orderItemSessionStub = sinon.stub().resolves(orderItemsMock);
            sinon.stub(OrderItem, "find").returns({ session: orderItemSessionStub });
            
            // Mock OrderCoupon and UserCoupon
            const { OrderCoupon, UserCoupon } = await import("../../models/Index.js");
            const orderCouponSessionStub = sinon.stub().resolves([]);
            sinon.stub(OrderCoupon, "find").returns({ session: orderCouponSessionStub });
            sinon.stub(UserCoupon, "deleteOne").resolves({});
            
            // Mock Order.findById for final response
            const finalOrderMock = { ...orderMock, status: "cancelled" };
            sinon.stub(Order, "findById").resolves(finalOrderMock);
            
            sinon.stub(Product, "updateOne").resolves({});
            sinon.stub(notificationService, "emitOrderUpdated").returns();
            sinon.stub(cacheInvalidation, "invalidateUserOrders").resolves();

            await cancelOrder(req, res, next);

            expect(orderMock.status).to.equal("cancelled");
            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
        });
    });
});
