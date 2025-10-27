import { expect } from "chai";
import request from "supertest";
import mongoose from "mongoose";
import app from "../../server.js";
import Coupon from "../../models/Coupon.js";
import User from "../../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Helper function to generate token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id || user.id, role: user.role },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "7d" }
  );
};

describe("Coupon Controller - Integration Tests", () => {
  let sellerToken, adminToken;
  let sellerId, adminId;
  let couponId;

  before(async function () {
    // Nettoyer la base de données
    await Coupon.deleteMany({});
    await User.deleteMany({});
  });

  beforeEach(async () => {
    await Coupon.deleteMany({});
    await User.deleteMany({});

    // Hash password for both users
    const hashedPassword = await bcrypt.hash("Password123!", 10);

    // Create seller directly in database
    const seller = await User.create({
      fullname: "Test Seller",
      email: "seller@test.com",
      password: hashedPassword,
      role: "seller",
    });

    sellerId = seller._id;
    sellerToken = generateToken(seller);

    // Create admin directly in database
    const admin = await User.create({
      fullname: "Test Admin",
      email: "admin@test.com",
      password: hashedPassword,
      role: "admin",
    });

    adminId = admin._id;
    adminToken = generateToken(admin);
  });

  after(async function () {
    try {
      await Coupon.deleteMany({});
      await User.deleteMany({});

      console.log("Database cleaned after tests");
    } catch (error) {
      console.error("Error in after hook:", error.message);
    }
  });

  describe("POST /api/v2/coupons", () => {
    it("should create a coupon successfully", async () => {
      const response = await request(app)
        .post("/api/v2/coupons")
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({
          code: "SAVE20",
          type: "percentage",
          value: 20,
          minAmount: 100,
          maxDiscount: 50,
          expiresAt: new Date("2025-12-31"),
          usageLimit: 100,
        });

      expect(response.status).to.equal(201);
      expect(response.body.message).to.equal("Coupon created succesfuly");
      expect(response.body.data.code).to.equal("SAVE20");
      expect(response.body.data.type).to.equal("percentage");
      couponId = response.body.data._id;
    });

    it("should fail if not authenticated", async () => {
      const response = await request(app)
        .post("/api/v2/coupons")
        .send({
          code: "SAVE20",
          type: "percentage",
          value: 20,
          minAmount: 100,
          maxDiscount: 50,
          expiresAt: new Date("2025-12-31"),
        });

      expect(response.status).to.equal(401);
    });

    // it("should fail with missing required fields", async () => {
    //   const response = await request(app)
    //     .post("/api/v2/coupons")
    //     .set("Authorization", `Bearer ${sellerToken}`)
    //     .send({ code: "SAVE20" });

    //   expect(response.status).to.equal(400);
    //   expect(response.body.message).to.include("required");
    // });

    it("should fail with missing required fields", async () => {
      const response = await request(app)
        .post("/api/v2/coupons")
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({ code: "SAVE20" }); // Manque type, value, expiresAt

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal("Validation failed");
      // Vérifier qu'il y a des erreurs pour les champs manquants
      expect(response.body.errors).to.have.property("type");
      expect(response.body.errors).to.have.property("value");
      expect(response.body.errors).to.have.property("expiresAt");
    });

    it("should fail with duplicate coupon code", async () => {
      await Coupon.create({
        code: "DUPLICATE",
        type: "percentage",
        value: 10,
        minAmount: 50,
        maxDiscount: 20,
        expiresAt: new Date("2025-12-31"),
        createdBy: sellerId,
      });

      const response = await request(app)
        .post("/api/v2/coupons")
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({
          code: "DUPLICATE",
          type: "percentage",
          value: 15,
          minAmount: 50,
          maxDiscount: 20,
          expiresAt: new Date("2025-12-31"),
        });

      expect(response.status).to.equal(400);
      expect(response.body.message).to.equal(
        "A coupon with this code already exists"
      );
    });

    it("should fail with invalid percentage value", async () => {
      const response = await request(app)
        .post("/api/v2/coupons")
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({
          code: "INVALID",
          type: "percentage",
          value: 150,
          minAmount: 50,
          maxDiscount: 20,
          expiresAt: new Date("2025-12-31"),
        });

      expect(response.status).to.equal(400);
      expect(response.body.message).to.include("between 1 and 99");
    });

    it("should convert coupon code to uppercase", async () => {
      const response = await request(app)
        .post("/api/v2/coupons")
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({
          code: "lowercase20",
          type: "percentage",
          value: 20,
          minAmount: 50,
          maxDiscount: 30,
          expiresAt: new Date("2025-12-31"),
        });

      expect(response.status).to.equal(201);
      expect(response.body.data.code).to.equal("LOWERCASE20");
    });

    it("should trim whitespace from coupon code", async () => {
      const response = await request(app)
        .post("/api/v2/coupons")
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({
          code: "  TRIMME  ",
          type: "percentage",
          value: 15,
          minAmount: 50,
          maxDiscount: 25,
          expiresAt: new Date("2025-12-31"),
        });

      expect(response.status).to.equal(201);
      expect(response.body.data.code).to.equal("TRIMME");
    });
  });

  describe("GET /api/v2/coupons/seller", () => {
    beforeEach(async () => {
      await Coupon.create([
        {
          code: "SELLER1",
          type: "percentage",
          value: 10,
          minAmount: 50,
          maxDiscount: 20,
          expiresAt: new Date("2025-12-31"),
          createdBy: sellerId,
        },
        {
          code: "SELLER2",
          type: "fixed",
          value: 15,
          minAmount: 100,
          maxDiscount: 15,
          expiresAt: new Date("2025-12-31"),
          createdBy: sellerId,
        },
      ]);
    });

    it("should return seller coupons", async () => {
      const response = await request(app)
        .get("/api/v2/coupons/seller")
        .set("Authorization", `Bearer ${sellerToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.lengthOf(2);
    });

    it("should fail if not authenticated", async () => {
      const response = await request(app).get("/api/v2/coupons/seller");

      expect(response.status).to.equal(401);
    });

    it("should return empty array when seller has no coupons", async () => {
      const hashedPassword = await bcrypt.hash("Password123!", 10);
      const newSeller = await User.create({
        fullname: "New Seller",
        email: "newseller@test.com",
        password: hashedPassword,
        role: "seller",
      });
      const newSellerToken = generateToken(newSeller);

      const response = await request(app)
        .get("/api/v2/coupons/seller")
        .set("Authorization", `Bearer ${newSellerToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.message).to.equal(
        "No coupons found for this seller"
      );
      expect(response.body.data).to.deep.equal([]);
    });
  });

  describe("GET /api/v2/coupons", () => {
    beforeEach(async () => {
      await Coupon.create([
        {
          code: "COUPON1",
          type: "percentage",
          value: 10,
          minAmount: 50,
          maxDiscount: 20,
          expiresAt: new Date("2025-12-31"),
          isActive: true,
          createdBy: sellerId,
        },
        {
          code: "COUPON2",
          type: "fixed",
          value: 25,
          minAmount: 100,
          maxDiscount: 25,
          expiresAt: new Date("2025-12-31"),
          isActive: false,
          createdBy: sellerId,
        },
      ]);
    });

    it("should return all coupons with pagination", async () => {
      const response = await request(app)
        .get("/api/v2/coupons?page=1&limit=10")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.coupons).to.have.lengthOf(2);
      expect(response.body.currentPage).to.equal(1);
    });

    it("should filter by type", async () => {
      const response = await request(app)
        .get("/api/v2/coupons?type=percentage")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.coupons).to.have.lengthOf(1);
      expect(response.body.coupons[0].type).to.equal("percentage");
    });

    it("should filter by isActive", async () => {
      const response = await request(app)
        .get("/api/v2/coupons?isActive=true")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.coupons).to.have.lengthOf(1);
      expect(response.body.coupons[0].isActive).to.be.true;
    });

    it("should handle pagination with no results", async () => {
      const response = await request(app)
        .get("/api/v2/coupons?page=100&limit=10")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.coupons).to.have.lengthOf(0);
    });
  });

  describe("GET /api/v2/coupons/:id", () => {
    beforeEach(async () => {
      const coupon = await Coupon.create({
        code: "TESTCOUPON",
        type: "percentage",
        value: 15,
        minAmount: 75,
        maxDiscount: 30,
        expiresAt: new Date("2025-12-31"),
        createdBy: sellerId,
      });
      couponId = coupon._id;
    });

    it("should return coupon for seller owner", async () => {
      const response = await request(app)
        .get(`/api/v2/coupons/${couponId}`)
        .set("Authorization", `Bearer ${sellerToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.code).to.equal("TESTCOUPON");
    });

    it("should return coupon for admin", async () => {
      const response = await request(app)
        .get(`/api/v2/coupons/${couponId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.data.code).to.equal("TESTCOUPON");
    });

    it("should fail if coupon not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/v2/coupons/${fakeId}`)
        .set("Authorization", `Bearer ${sellerToken}`);

      expect(response.status).to.equal(404);
      expect(response.body.message).to.equal("Coupon not found");
    });

    it("should prevent seller from accessing another seller coupon", async () => {
      const hashedPassword = await bcrypt.hash("Password123!", 10);
      const anotherSeller = await User.create({
        fullname: "Another Seller",
        email: "another@test.com",
        password: hashedPassword,
        role: "seller",
      });

      const anotherCoupon = await Coupon.create({
        code: "OTHERSELLER",
        type: "percentage",
        value: 10,
        minAmount: 50,
        maxDiscount: 20,
        expiresAt: new Date("2025-12-31"),
        createdBy: anotherSeller._id,
      });

      const response = await request(app)
        .get(`/api/v2/coupons/${anotherCoupon._id}`)
        .set("Authorization", `Bearer ${sellerToken}`);

      expect(response.status).to.equal(404);
    });
  });

  describe("PUT /api/v2/coupons/:id", () => {
    beforeEach(async () => {
      const coupon = await Coupon.create({
        code: "UPDATEME",
        type: "percentage",
        value: 10,
        minAmount: 50,
        maxDiscount: 20,
        expiresAt: new Date("2025-12-31"),
        createdBy: sellerId,
      });
      couponId = coupon._id;
    });

    it("should update coupon successfully", async () => {
      const response = await request(app)
        .put(`/api/v2/coupons/${couponId}`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({ value: 25 });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.value).to.equal(25);
    });

    it("should allow admin to update any coupon", async () => {
      const response = await request(app)
        .put(`/api/v2/coupons/${couponId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ value: 30 });

      expect(response.status).to.equal(200);
      expect(response.body.data.value).to.equal(30);
    });

    it("should fail if not owner or admin", async () => {
      const hashedPassword = await bcrypt.hash("Password123!", 10);
      const otherSeller = await User.create({
        fullname: "Other Seller",
        email: "other@test.com",
        password: hashedPassword,
        role: "seller",
      });
      const otherSellerToken = generateToken(otherSeller);

      const response = await request(app)
        .put(`/api/v2/coupons/${couponId}`)
        .set("Authorization", `Bearer ${otherSellerToken}`)
        .send({ value: 25 });

      expect(response.body.success).to.equal(false);
      expect(response.body.message).to.equal("Coupon not found");
    });

    it("should fail if coupon not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/v2/coupons/${fakeId}`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({ value: 25 });

      expect(response.status).to.equal(404);
      expect(response.body.message).to.equal("Coupon not found");
    });

    it("should update only provided fields", async () => {
      const response = await request(app)
        .put(`/api/v2/coupons/${couponId}`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({ isActive: false });

      expect(response.status).to.equal(200);
      expect(response.body.data.isActive).to.be.false;
      expect(response.body.data.value).to.equal(10);
      expect(response.body.data.code).to.equal("UPDATEME");
    });
  });

  describe("DELETE /api/v2/coupons/:id", () => {
    beforeEach(async () => {
      const coupon = await Coupon.create({
        code: "DELETEME",
        type: "percentage",
        value: 10,
        minAmount: 50,
        maxDiscount: 20,
        expiresAt: new Date("2025-12-31"),
        createdBy: sellerId,
      });
      couponId = coupon._id;
    });

    it("should delete coupon successfully", async () => {
      const response = await request(app)
        .delete(`/api/v2/coupons/${couponId}`)
        .set("Authorization", `Bearer ${sellerToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal("Coupon deleted successfully");

      const deletedCoupon = await Coupon.findById(couponId);
      expect(deletedCoupon).to.be.null;
    });

    it("should allow admin to delete any coupon", async () => {
      const response = await request(app)
        .delete(`/api/v2/coupons/${couponId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
    });

    it("should fail if not owner or admin", async () => {
      const hashedPassword = await bcrypt.hash("Password123!", 10);
      const otherSeller = await User.create({
        fullname: "Other Seller",
        email: "other@test.com",
        password: hashedPassword,
        role: "seller",
      });
      const otherSellerToken = generateToken(otherSeller);

      const response = await request(app)
        .delete(`/api/v2/coupons/${couponId}`)
        .set("Authorization", `Bearer ${otherSellerToken}`);

      expect(response.body.success).to.equal(false);
      expect(response.body.message).to.equal("Coupon not found");
    });

    it("should fail if coupon not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/v2/coupons/${fakeId}`)
        .set("Authorization", `Bearer ${sellerToken}`);

      expect(response.status).to.equal(404);
      expect(response.body.message).to.equal("Coupon not found");
    });
  });
});
