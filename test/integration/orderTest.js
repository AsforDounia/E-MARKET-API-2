import { expect } from "chai";
import request from "supertest";
import mongoose from "mongoose";
import { Types } from "mongoose";
import app from "../../server.js";
import dotenv from "dotenv";
import {
  Order,
  OrderItem,
  Cart,
  CartItem,
  Product,
  Coupon,
  User,
  UserCoupon,
} from "../../models/Index.js";
import cacheInvalidation from "../../services/cacheInvalidation.js";

dotenv.config();

describe("Order Controller - Integration Tests", () => {
  let authToken;
  let userId;
  let adminToken;
  let adminId;
  let productId;
  let cartId;
  let orderId;
  let couponId;

  beforeEach(async function () {
    // this.timeout(10000);
    await User.deleteMany({});
    await Product.deleteMany({});
    await Cart.deleteMany({});
    await CartItem.deleteMany({});
    await Order.deleteMany({});
    await OrderItem.deleteMany({});
    await Coupon.deleteMany({});

    // Création d'un utilisateur normal et authentification
    const userResponse = await request(app).post("/api/v2/auth/register").send({
      fullname: "Test User",
      email: "testuser@example.com",
      password: "Password123!",
      role: "user",
    });
    // console.log("REGISTER RESPONSE:", userResponse.body);
    authToken = userResponse.body.token;
    userId = userResponse.body.user.id;

    // Création d'un admin et authentification
    const adminResponse = await request(app)
      .post("/api/v2/auth/register")
      .send({
        fullname: "Admin User",
        email: "admin@example.com",
        password: "Admin123!",
        role: "admin",
      });

    // console.log("RES ADMIN", adminResponse.body);
    adminToken = adminResponse.body.token;
    adminId = adminResponse.body.user.id;

    // Création d'un produit
    const product = await Product.create({
      title: "Test Product",
      description: "Test Description",
      price: 100,
      stock: 20,
      category: "Electronics",
      sellerId: adminId,
      imageUrls: ["https://example.com/image.jpg"],
    });
    productId = product._id;

    // Création d'un panier avec des articles
    const cart = await Cart.create({ userId });
    cartId = cart._id;

    await CartItem.create({
      cartId,
      productId,
      quantity: 2,
    });
  });

  // ==================== Tests pour POST /api/v2/orders (createOrder) ====================
  describe("POST /api/v2/orders", () => {
    it("should create an order successfully", async () => {
      const response = await request(app)
        .post("/api/v2/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).to.equal(201);
      expect(response.body.status).to.equal("success");
      expect(response.body.message).to.equal("Order created successfully");
      expect(response.body.data.order).to.have.property("subtotal", 200);
      expect(response.body.data.order).to.have.property("discount", 0);
      expect(response.body.data.order).to.have.property("total", 200);

      // Vérifier que le panier est vidé
      const cartItems = await CartItem.find({ cartId });
      expect(cartItems).to.have.lengthOf(0);

      // Vérifier que le stock du produit est réduit
      const product = await Product.findById(productId);
      expect(product.stock).to.equal(18);
    });

    it("should create an order with percentage coupon", async () => {
      // Créer un coupon
      const coupon = await Coupon.create({
        code: "SAVE20",
        type: "percentage",
        value: 20,
        isActive: true,
        createdBy: adminId,
        usedBy: [],
        minAmount: 0,
      });

      const response = await request(app)
        .post("/api/v2/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          couponCodes: ["SAVE20"],
        });

      expect(response.body.status).to.equal("success");
      expect(response.body.message).to.equal("Order created successfully");
      expect(response.body.data.order.discount).to.equal(40);
      expect(response.body.data.order.total).to.equal(160);

      // Vérifier que le coupon est marqué comme utilisé
      const userCoupon = await UserCoupon.findOne({
        user: userId,
        coupon: coupon._id,
      });
      // console.log("UUUUUUUUUUUUUUU", userCoupon);
      expect(userCoupon).to.not.be.null;
    });

    it("should create an order with fixed amount coupon", async () => {
      await Coupon.create({
        code: "FIXED50",
        type: "fixed",
        value: 50,
        isActive: true,
        createdBy: userId,
        usedBy: [],
        minAmount: 0,
      });

      const response = await request(app)
        .post("/api/v2/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          couponCodes: ["FIXED50"],
        });

      expect(response.body.status).to.equal("success");
      expect(response.body.message).to.equal("Order created successfully");
      expect(response.body.data.order.discount).to.equal(50);
      expect(response.body.data.order.total).to.equal(150);
    });

    it("should return 404 if cart is not found", async () => {
      await Cart.deleteMany({ userId });

      const response = await request(app)
        .post("/api/v2/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).to.equal(404);
      expect(response.body.message).to.equal("Cart not found");
    });

    it("should return 400 if cart is empty", async () => {
      await CartItem.deleteMany({ cartId });

      const response = await request(app)
        .post("/api/v2/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).to.equal(400);
      expect(response.body.message).to.equal("Cart is empty");
    });

    it("should return 400 if product stock is insufficient", async () => {
      await Product.updateOne({ _id: productId }, { stock: 1 });

      const response = await request(app)
        .post("/api/v2/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).to.equal(400);
      expect(response.body.message).to.include("Insufficient stock");
    });

    it("should return 400 if product is deleted", async () => {
      await Product.updateOne({ _id: productId }, { deletedAt: new Date() });

      const response = await request(app)
        .post("/api/v2/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).to.equal(400);
      expect(response.body.message).to.include("Product no longer available");
    });

    it("should return 400 if coupon is invalid", async () => {
      const response = await request(app)
        .post("/api/v2/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          couponCodes: ["INVALID"],
        });

      expect(response.body.success).to.equal(false);
      expect(response.body.message).to.equal("Invalid coupon: INVALID");
    });

    it("should return 400 if coupon is expired", async () => {
      await Coupon.create({
        code: "EXPIRED",
        type: "percentage",
        value: 20,
        isActive: true,
        createdBy: adminId,
        expiresAt: new Date("2020-01-01"),
        usedBy: [],
        minAmount: 0,
      });

      const response = await request(app)
        .post("/api/v2/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          couponCodes: ["EXPIRED"],
        });

      expect(response.body.success).to.equal(false);
      expect(response.body.message).to.equal("Coupon expired: EXPIRED");
    });

    it("should return 400 if coupon already used", async () => {
      const coupon = await Coupon.create({
        code: "USED",
        type: "percentage",
        value: 20,
        isActive: true,
        createdBy: adminId,
        usedBy: [userId],
        minAmount: 0,
      });

      await UserCoupon.create({
        user: userId,
        coupon: coupon._id,
      });

      const response = await request(app)
        .post("/api/v2/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          couponCodes: ["USED"],
        });

      expect(response.status).to.equal(400);
      expect(response.body.message).to.equal("Coupon already used: USED");
    });

    it("should return 400 if minimum amount not met", async () => {
      await Coupon.create({
        code: "HIGH",
        type: "percentage",
        value: 20,
        isActive: true,
        createdBy: adminId,
        usedBy: [],
        minAmount: 500,
      });

      const response = await request(app)
        .post("/api/v2/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          couponCodes: ["HIGH"],
        });

      expect(response.status).to.equal(400);
      expect(response.body.message).to.include("Minimum amount");
    });

    it("should return 400 if coupon usage limit reached", async () => {
      const coupon = await Coupon.create({
        code: "LIMITED",
        type: "percentage",
        value: 20,
        isActive: true,
        createdBy: adminId,
        usageLimit: 2,
        minAmount: 0,
      });

      await UserCoupon.create([
        { user: new mongoose.Types.ObjectId(), coupon: coupon._id },
        { user: new mongoose.Types.ObjectId(), coupon: coupon._id },
      ]);

      const response = await request(app)
        .post("/api/v2/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          couponCodes: ["LIMITED"],
        });

      expect(response.status).to.equal(400);
      expect(response.body.message).to.equal(
        "Coupon usage limit reached: LIMITED"
      );
    });

    it("should return 401 if not authenticated", async () => {
      const response = await request(app).post("/api/v2/orders").send({});

      expect(response.status).to.equal(401);
      expect(response.body.message).to.equal("Invalid token.");
    });
  });

  // ==================== Tests pour GET /api/v2/orders (getOrders) ====================
  describe("GET /api/v2/orders", () => {
    beforeEach(async () => {
      // Créer quelques commandes pour les tests
      const order1 = await Order.create({
        userId: new Types.ObjectId(userId),
        subtotal: 200,
        discount: 0,
        total: 200,
        status: "pending",
        createdAt: new Date("2024-01-01T10:00:00Z"),
      });

      await OrderItem.create({
        orderId: order1._id,
        productId,
        sellerId: adminId,
        productTitle: "Test Product",
        quantity: 2,
        priceAtOrder: 100,
      });

      const order2 = await Order.create({
        userId: new Types.ObjectId(userId),
        subtotal: 150,
        discount: 10,
        total: 140,
        status: "paid",
        createdAt: new Date("2024-01-02T10:00:00Z"),
      });

      await OrderItem.create({
        orderId: order2._id,
        productId,
        sellerId: adminId,
        productTitle: "Test Product",
        quantity: 1,
        priceAtOrder: 150,
      });
    });

    it("should retrieve all user orders", async () => {
      const response = await request(app)
        .get("/api/v2/orders")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.body.status).to.equal("success");
      expect(response.body.data.orders).to.be.an("array").with.lengthOf(2);
      expect(response.body.data.orders[0]).to.have.property("total");
    });

    it("should return empty array if no orders exist", async () => {
      await cacheInvalidation.invalidateOrders();
      await Order.deleteMany({});
      const response = await request(app)
        .get("/api/v2/orders")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.data.orders).to.be.an("array").that.is.empty;
    });

    it("should return orders sorted by creation date (newest first)", async () => {
      const response = await request(app)
        .get("/api/v2/orders")
        .set("Authorization", `Bearer ${authToken}`);

      // console.log("kkkkkkkkkkkkkkkkkkkkkkk", response.body.data.orders);
      expect(response.status).to.equal(200);
      const orders = response.body.data.orders;
      console.log(
        "Returned orders:",
        orders.map((o) => o.createdAt)
      );
      expect(new Date(orders[0].createdAt).getTime()).to.be.gte(
        new Date(orders[1].createdAt).getTime()
      );
    });

    it("should return 401 if not authenticated", async () => {
      const response = await request(app).get("/api/v2/orders");

      // console.log("5555555555555555555555555", response.body);
      expect(response.body.status).to.equal(401);
      expect(response.body.message).to.equal("Invalid token.");
    });
  });

  // ==================== Tests pour GET /api/v2/orders/:id (getOrderById) ====================
  describe("GET /api/v2/orders/:id", () => {
    beforeEach(async () => {
      const order = await Order.create({
        userId,
        subtotal: 200,
        discount: 0,
        total: 200,
        status: "pending",
      });
      orderId = order._id;

      await OrderItem.create({
        orderId,
        productId,
        sellerId: adminId,
        productTitle: "Test Product",
        quantity: 2,
        priceAtOrder: 100,
      });
    });

    it("should retrieve order by ID with items", async () => {
      const response = await request(app)
        .get(`/api/v2/orders/${orderId}`)
        .set("Authorization", `Bearer ${authToken}`);

      // expect(response.status).to.equal(200);
      expect(response.body.status).to.equal("success");
      expect(response.body.data.order).to.have.property("_id");
      expect(response.body.data.order).to.have.property("items");
      expect(response.body.data.order.items).to.be.an("array").with.lengthOf(1);
    });

    it("should return 400 if order ID is invalid", async () => {
      const response = await request(app)
        .get("/api/v2/orders/invalid-id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).to.equal(400);
      expect(response.body.message).to.equal("Invalid order ID");
    });

    it("should return 404 if order does not exist", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/v2/orders/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.body.success).to.equal(false);
      expect(response.body.message).to.equal("Order not found");
    });

    it("should return 401 if not authenticated", async () => {
      const response = await request(app).get(`/api/v2/orders/${orderId}`);

      expect(response.body.status).to.equal(401);
      expect(response.body.message).to.equal("Invalid token.");
    });
  });

  // ==================== Tests pour put /api/v2/orders/:id/status (updateOrderStatus) ====================
  describe("PUT /api/v2/orders/:id", () => {
    beforeEach(async () => {
      const order = await Order.create({
        userId,
        subtotal: 200,
        discount: 0,
        total: 200,
        status: "pending",
      });
      orderId = order._id;
    });

    it("should update order status to shipped", async () => {
      const response = await request(app)
        .put(`/api/v2/orders/${orderId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "shipped" });

      expect(response.status).to.equal(200);
      expect(response.body.status).to.equal("success");
      expect(response.body.data.order.status).to.equal("shipped");
    });

    it("should update order status to paid", async () => {
      const response = await request(app)
        .put(`/api/v2/orders/${orderId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "paid" });

      expect(response.body.status).to.equal("success");
      expect(response.body.data.order.status).to.equal("paid");
    });

    it("should update order status to delivered", async () => {
      // D'abord mettre à shipped
      await Order.updateOne({ _id: orderId }, { status: "shipped" });

      const response = await request(app)
        .put(`/api/v2/orders/${orderId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "delivered" });

      expect(response.status).to.equal(200);
      expect(response.body.data.order.status).to.equal("delivered");
    });

    it("should return 400 if status is invalid", async () => {
      const response = await request(app)
        .put(`/api/v2/orders/${orderId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "invalid-status" });

      // console.log("ffffffffffffffffffffffff", response.body);
      expect(response.body.success).to.equal(false);
      expect(response.body.message).to.equal("Validation failed");
    });

    it("should return 400 if order is cancelled", async () => {
      await Order.updateOne({ _id: orderId }, { status: "cancelled" });

      const response = await request(app)
        .put(`/api/v2/orders/${orderId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "shipped" });

      expect(response.status).to.equal(400);
      expect(response.body.message).to.include("Cannot update cancelled order");
    });

    it("should return 400 if order is delivered", async () => {
      await Order.updateOne({ _id: orderId }, { status: "delivered" });

      const response = await request(app)
        .put(`/api/v2/orders/${orderId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "shipped" });

      expect(response.status).to.equal(400);
      expect(response.body.message).to.include("Cannot update delivered order");
    });

    it("should return 404 if order does not exist", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .put(`/api/v2/orders/${fakeId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "shipped" });

      expect(response.status).to.equal(404);
      expect(response.body.message).to.equal("Order not found");
    });

    it("should return 401 if not authenticated", async () => {
      const response = await request(app)
        .put(`/api/v2/orders/${orderId}`)
        .send({ status: "shipped" });

      expect(response.body.status).to.equal(401);
      expect(response.body.message).to.equal("Invalid token.");
    });
  });

  // ==================== Tests pour DELETE /api/v2/orders/:id (cancelOrder) ====================
  describe("DELETE /api/v2/orders/:id", () => {
    beforeEach(async () => {
      const order = await Order.create({
        userId,
        subtotal: 200,
        discount: 0,
        total: 200,
        status: "pending",
      });
      orderId = order._id;

      await OrderItem.create({
        orderId,
        productId,
        sellerId: adminId,
        productTitle: "Test Product",
        quantity: 2,
        priceAtOrder: 100,
      });
    });

    it("should cancel order successfully", async () => {
      const productBefore = await Product.findById(productId);
      const stockBefore = productBefore.stock;

      const response = await request(app)
        .delete(`/api/v2/orders/${orderId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.status).to.equal("success");
      expect(response.body.data.order.status).to.equal("cancelled");

      // Vérifier que le stock est restauré
      const productAfter = await Product.findById(productId);
      expect(productAfter.stock).to.equal(stockBefore + 2);
    });

    it("should allow admin to cancel any order", async () => {
      const response = await request(app)
        .delete(`/api/v2/orders/${orderId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.body.status).to.equal("success");
      expect(response.body.message).to.equal("Order cancelled successfully");
      expect(response.body.data.order.status).to.equal("cancelled");
    });

    it("should return 403 if user tries to cancel another user order", async () => {
      // Créer un autre utilisateur
      const otherUserResponse = await request(app)
        .post("/api/v2/auth/register")
        .send({
          name: "Other User",
          email: "other@example.com",
          password: "Password123!",
          role: "user",
        });

      const otherToken = otherUserResponse.body.token;

      const response = await request(app)
        .delete(`/api/v2/orders/${orderId}`)
        .set("Authorization", `Bearer ${otherToken}`);

      expect(response.body.status).to.equal(401);
      expect(response.body.message).to.include("Invalid token.");
    });

    it("should return 400 if order is already cancelled", async () => {
      await Order.updateOne({ _id: orderId }, { status: "cancelled" });

      const response = await request(app)
        .delete(`/api/v2/orders/${orderId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).to.equal(400);
      expect(response.body.message).to.equal("Order already cancelled");
    });

    it("should return 400 if order is not pending", async () => {
      await Order.updateOne({ _id: orderId }, { status: "shipped" });

      const response = await request(app)
        .delete(`/api/v2/orders/${orderId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).to.equal(400);
      expect(response.body.message).to.equal(
        "Only pending orders can be cancelled"
      );
    });

    it("should return 404 if order does not exist", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/v2/orders/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).to.equal(404);
      expect(response.body.message).to.equal("Order not found");
    });

    it("should return 400 if order ID is invalid", async () => {
      const response = await request(app)
        .delete("/api/v2/orders/invalid-id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).to.equal(400);
      expect(response.body.message).to.equal("Invalid order ID");
    });

    it("should return 401 if not authenticated", async () => {
      const response = await request(app).delete(`/api/v2/orders/${orderId}`);

      expect(response.body.status).to.equal(401);
      expect(response.body.message).to.equal("Invalid token.");
    });
  });
});
