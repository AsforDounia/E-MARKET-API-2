import { expect } from "chai";
import sinon from "sinon";
import request from "supertest";
// import mongoose from "mongoose";
import app from "../../server.js";
import Coupon from "../../models/Coupon.js";
import cacheInvalidation from "../../services/cacheInvalidation.js";
import { AppError } from "../../middlewares/errorHandler.js";
import {
  createCoupon,
  getCouponsSeller,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
} from "../../controllers/couponController.js";

describe("Coupon Controller - Unit Tests", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: null,
    };
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    next = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("createCoupon", () => {
    const validCouponData = {
      code: "TEST20",
      type: "percentage",
      value: 20,
      minAmount: 50,
      maxDiscount: 100,
      expiresAt: "2025-12-31",
      usageLimit: 100,
    };

    it("should throw error if user is not a seller", async () => {
      req.user = { _id: "user123", role: "buyer" };
      req.body = validCouponData;

      await createCoupon(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.be.instanceOf(AppError);
      expect(error.message).to.equal("Only sellers can create coupons");
      expect(error.statusCode).to.equal(403);
    });

    it("should throw error if required fields are missing", async () => {
      req.user = { _id: "seller123", role: "seller" };
      req.body = { code: "TEST" };

      await createCoupon(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.be.instanceOf(AppError);
      expect(error.message).to.include("required");
      expect(error.statusCode).to.equal(400);
    });

    it("should throw error if coupon type is invalid", async () => {
      req.user = { _id: "seller123", role: "seller" };
      req.body = {
        code: "TEST",
        type: "invalid",
        value: 10,
        minAmount: 50,
        maxDiscount: 100,
        expiresAt: "2025-12-31",
      };

      await createCoupon(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.be.instanceOf(AppError);
      expect(error.message).to.equal(
        "Invalid coupon type. Must be 'percentage' or 'fixed'"
      );
      expect(error.statusCode).to.equal(400);
    });

    it("should throw error if coupon code already exists", async () => {
      req.user = { _id: "seller123", role: "seller" };
      req.body = validCouponData;

      sinon.stub(Coupon, "findOne").resolves({ code: "TEST20" });

      await createCoupon(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.be.instanceOf(AppError);
      expect(error.message).to.equal("A coupon with this code already exists");
      expect(error.statusCode).to.equal(400);
    });

    it("should throw error if percentage value is out of range", async () => {
      req.user = { _id: "seller123", role: "seller" };
      req.body = {
        code: "TEST",
        type: "percentage",
        value: 100,
        minAmount: 50,
        maxDiscount: 100,
        expiresAt: "2025-12-31",
      };

      sinon.stub(Coupon, "findOne").resolves(null);

      await createCoupon(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.be.instanceOf(AppError);
      expect(error.message).to.equal(
        "For percentage type, the value must be between 1 and 99."
      );
      expect(error.statusCode).to.equal(400);
    });

    it("should create coupon successfully", async () => {
      req.user = { _id: "seller123", role: "seller" };
      req.body = { ...validCouponData, code: "test20" };

      const mockCoupon = {
        _id: "coupon123",
        code: "TEST20",
        type: "percentage",
        value: 20,
        minAmount: 50,
        maxDiscount: 100,
        createdBy: "seller123",
      };

      sinon.stub(Coupon, "findOne").resolves(null);
      sinon.stub(Coupon, "create").resolves(mockCoupon);
      sinon.stub(cacheInvalidation, "invalidateCoupons").resolves();

      await createCoupon(req, res, next);

      expect(Coupon.create.calledOnce).to.be.true;
      expect(cacheInvalidation.invalidateCoupons.calledOnce).to.be.true;
      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const jsonCall = res.json.firstCall.args[0];
      expect(jsonCall.message).to.equal("Coupon created succesfuly");
      expect(jsonCall.data).to.deep.equal(mockCoupon);
    });

    it("should handle database errors", async () => {
      req.user = { _id: "seller123", role: "seller" };
      req.body = validCouponData;

      const dbError = new Error("Database connection failed");
      sinon.stub(Coupon, "findOne").rejects(dbError);

      await createCoupon(req, res, next);

      expect(next.calledWith(dbError)).to.be.true;
    });
  });

  describe("getCouponsSeller", () => {
    it("should throw error if user is not seller or admin", async () => {
      req.user = { _id: "buyer123", role: "buyer" };

      await getCouponsSeller(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.be.instanceOf(AppError);
      expect(error.message).to.equal(
        "Only sellers or admins can create coupons"
      );
      expect(error.statusCode).to.equal(403);
    });

    it("should return empty array if no coupons found", async () => {
      req.user = { _id: "seller123", role: "seller" };
      sinon.stub(Coupon, "find").resolves([]);

      await getCouponsSeller(req, res, next);

      expect(res.status.calledWith(200)).to.be.true;
      const jsonCall = res.json.firstCall.args[0];
      expect(jsonCall.success).to.be.true;
      expect(jsonCall.message).to.equal("No coupons found for this seller");
      expect(jsonCall.data).to.deep.equal([]);
    });

    it("should return seller coupons successfully", async () => {
      req.user = { _id: "seller123", role: "seller" };
      const mockCoupons = [
        { _id: "coupon1", code: "TEST1" },
        { _id: "coupon2", code: "TEST2" },
      ];
      sinon.stub(Coupon, "find").resolves(mockCoupons);

      await getCouponsSeller(req, res, next);

      expect(Coupon.find.calledWith({ createdBy: "seller123" })).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      const jsonCall = res.json.firstCall.args[0];
      expect(jsonCall.success).to.be.true;
      expect(jsonCall.data).to.deep.equal(mockCoupons);
    });

    it("should handle database errors", async () => {
      req.user = { _id: "seller123", role: "seller" };
      const dbError = new Error("Database error");
      sinon.stub(Coupon, "find").rejects(dbError);

      await getCouponsSeller(req, res, next);

      expect(next.calledWith(dbError)).to.be.true;
    });
  });

  describe("getAllCoupons", () => {
    it("should return all coupons with default pagination", async () => {
      req.query = {};
      const mockCoupons = [{ _id: "coupon1" }];

      const skipStub = sinon.stub().returnsThis();
      const limitStub = sinon.stub().resolves(mockCoupons);
      sinon.stub(Coupon, "find").returns({ skip: skipStub, limit: limitStub });
      sinon.stub(Coupon, "countDocuments").resolves(25);

      await getAllCoupons(req, res, next);

      expect(res.status.calledWith(200)).to.be.true;
      const jsonCall = res.json.firstCall.args[0];
      expect(jsonCall.success).to.be.true;
      expect(jsonCall.currentPage).to.equal(1);
      expect(jsonCall.totalPages).to.equal(2);
      expect(jsonCall.totalCoupon).to.equal(25);
    });

    it("should return coupons with custom pagination", async () => {
      req.query = { page: "2", limit: "10" };
      const mockCoupons = [{ _id: "coupon1" }];

      const skipStub = sinon.stub().returnsThis();
      const limitStub = sinon.stub().resolves(mockCoupons);
      sinon.stub(Coupon, "find").returns({ skip: skipStub, limit: limitStub });
      sinon.stub(Coupon, "countDocuments").resolves(25);

      await getAllCoupons(req, res, next);

      expect(skipStub.calledWith(10)).to.be.true;
      expect(limitStub.calledWith(10)).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
    });

    it("should filter coupons by type", async () => {
      req.query = { type: "percentage" };
      const mockCoupons = [{ _id: "coupon1", type: "percentage" }];

      const skipStub = sinon.stub().returnsThis();
      const limitStub = sinon.stub().resolves(mockCoupons);
      sinon.stub(Coupon, "find").returns({ skip: skipStub, limit: limitStub });
      sinon.stub(Coupon, "countDocuments").resolves(10);

      await getAllCoupons(req, res, next);

      expect(Coupon.find.firstCall.args[0]).to.deep.include({
        type: "percentage",
      });
    });

    it("should filter coupons by isActive", async () => {
      req.query = { isActive: "true" };
      const mockCoupons = [{ _id: "coupon1", isActive: true }];

      const skipStub = sinon.stub().returnsThis();
      const limitStub = sinon.stub().resolves(mockCoupons);
      sinon.stub(Coupon, "find").returns({ skip: skipStub, limit: limitStub });
      sinon.stub(Coupon, "countDocuments").resolves(5);

      await getAllCoupons(req, res, next);

      expect(Coupon.find.firstCall.args[0]).to.deep.include({
        isActive: "true",
      });
    });

    it("should handle database errors", async () => {
      req.query = {};
      const dbError = new Error("Database error");
      sinon.stub(Coupon, "find").throws(dbError);

      await getAllCoupons(req, res, next);

      expect(next.calledWith(dbError)).to.be.true;
    });
  });

  describe("getCouponById", () => {
    it("should throw error if user is not seller or admin", async () => {
      req.user = { _id: "buyer123", role: "buyer" };
      req.params = { id: "coupon123" };

      await getCouponById(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.be.instanceOf(AppError);
      F;
      expect(error.message).to.equal(
        "Only sellers or admins can access coupons"
      );
      expect(error.statusCode).to.equal(403);
    });

    it("should throw error if coupon not found", async () => {
      req.user = { _id: "seller123", role: "seller" };
      req.params = { id: "coupon123" };
      sinon.stub(Coupon, "findOne").resolves(null);

      await getCouponById(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.be.instanceOf(AppError);
      expect(error.message).to.equal("Coupon not found");
      expect(error.statusCode).to.equal(404);
    });

    it("should return coupon for seller owner", async () => {
      req.user = { _id: "seller123", role: "seller" };
      req.params = { id: "coupon123" };
      const mockCoupon = {
        _id: "coupon123",
        code: "TEST",
        createdBy: "seller123",
      };
      sinon.stub(Coupon, "findOne").resolves(mockCoupon);

      await getCouponById(req, res, next);

      expect(
        Coupon.findOne.calledWith({
          _id: "coupon123",
          createdBy: "seller123",
        })
      ).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      const jsonCall = res.json.firstCall.args[0];
      expect(jsonCall.data).to.deep.equal(mockCoupon);
    });

    it("should return any coupon for admin", async () => {
      req.user = { _id: "admin123", role: "admin" };
      req.params = { id: "coupon123" };
      const mockCoupon = { _id: "coupon123", code: "TEST" };
      sinon.stub(Coupon, "findOne").resolves(mockCoupon);

      await getCouponById(req, res, next);

      expect(Coupon.findOne.calledWith({ _id: "coupon123" })).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
    });

    it("should handle database errors", async () => {
      req.user = { _id: "seller123", role: "seller" };
      req.params = { id: "coupon123" };
      const dbError = new Error("Database error");
      sinon.stub(Coupon, "findOne").rejects(dbError);

      await getCouponById(req, res, next);

      expect(next.calledWith(dbError)).to.be.true;
    });
  });

  describe("updateCoupon", () => {
    it("should throw error if user is not seller or admin", async () => {
      req.user = { _id: "buyer123", role: "buyer" };
      req.params = { id: "coupon123" };
      req.body = { value: 30 };

      await updateCoupon(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.be.instanceOf(AppError);
      expect(error.message).to.equal(
        "Only sellers or admins can update coupons"
      );
      expect(error.statusCode).to.equal(403);
    });

    it("should throw error if coupon not found", async () => {
      req.user = { _id: "seller123", role: "seller" };
      req.params = { id: "coupon123" };
      req.body = { value: 30 };
      sinon.stub(Coupon, "findOneAndUpdate").resolves(null);

      await updateCoupon(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.be.instanceOf(AppError);
      expect(error.message).to.equal("Coupon not found");
      expect(error.statusCode).to.equal(404);
    });

    it("should update coupon successfully for seller", async () => {
      req.user = { _id: "seller123", role: "seller" };
      req.params = { id: "coupon123" };
      req.body = { value: 30 };
      const updatedCoupon = { _id: "coupon123", value: 30 };
      sinon.stub(Coupon, "findOneAndUpdate").resolves(updatedCoupon);
      sinon.stub(cacheInvalidation, "invalidateCoupons").resolves();

      await updateCoupon(req, res, next);

      expect(
        Coupon.findOneAndUpdate.calledWith(
          { _id: "coupon123", createdBy: "seller123" },
          { value: 30 },
          { new: true, runValidators: true }
        )
      ).to.be.true;
      expect(cacheInvalidation.invalidateCoupons.calledOnce).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      const jsonCall = res.json.firstCall.args[0];
      expect(jsonCall.message).to.equal("Coupon updated successfully");
      expect(jsonCall.data).to.deep.equal(updatedCoupon);
    });

    it("should allow admin to update any coupon", async () => {
      req.user = { _id: "admin123", role: "admin" };
      req.params = { id: "coupon123" };
      req.body = { value: 30 };
      const updatedCoupon = { _id: "coupon123", value: 30 };
      sinon.stub(Coupon, "findOneAndUpdate").resolves(updatedCoupon);
      sinon.stub(cacheInvalidation, "invalidateCoupons").resolves();

      await updateCoupon(req, res, next);

      expect(
        Coupon.findOneAndUpdate.calledWith(
          { _id: "coupon123" },
          { value: 30 },
          { new: true, runValidators: true }
        )
      ).to.be.true;
    });

    it("should handle database errors", async () => {
      req.user = { _id: "seller123", role: "seller" };
      req.params = { id: "coupon123" };
      req.body = { value: 30 };
      const dbError = new Error("Database error");
      sinon.stub(Coupon, "findOneAndUpdate").rejects(dbError);

      await updateCoupon(req, res, next);

      expect(next.calledWith(dbError)).to.be.true;
    });
  });

  describe("deleteCoupon", () => {
    it("should throw error if user is not seller or admin", async () => {
      req.user = { _id: "buyer123", role: "buyer" };
      req.params = { id: "coupon123" };

      await deleteCoupon(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.be.instanceOf(AppError);
      expect(error.message).to.equal(
        "Only sellers or admins can delete a coupons"
      );
      expect(error.statusCode).to.equal(403);
    });

    it("should throw error if coupon not found", async () => {
      req.user = { _id: "seller123", role: "seller" };
      req.params = { id: "coupon123" };
      sinon.stub(Coupon, "findOneAndDelete").resolves(null);

      await deleteCoupon(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.be.instanceOf(AppError);
      expect(error.message).to.equal("Coupon not found");
      expect(error.statusCode).to.equal(404);
    });

    it("should delete coupon successfully", async () => {
      req.user = { _id: "seller123", role: "seller" };
      req.params = { id: "coupon123" };
      sinon.stub(Coupon, "findOneAndDelete").resolves({ _id: "coupon123" });
      sinon.stub(cacheInvalidation, "invalidateCoupons").resolves();

      await deleteCoupon(req, res, next);

      expect(
        Coupon.findOneAndDelete.calledWith({
          _id: "coupon123",
          createdBy: "seller123",
        })
      ).to.be.true;
      expect(cacheInvalidation.invalidateCoupons.calledOnce).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      const jsonCall = res.json.firstCall.args[0];
      expect(jsonCall.success).to.be.true;
      expect(jsonCall.message).to.equal("Coupon deleted successfully");
    });

    it("should allow admin to delete any coupon", async () => {
      req.user = { _id: "admin123", role: "admin" };
      req.params = { id: "coupon123" };
      sinon.stub(Coupon, "findOneAndDelete").resolves({ _id: "coupon123" });
      sinon.stub(cacheInvalidation, "invalidateCoupons").resolves();

      await deleteCoupon(req, res, next);

      expect(Coupon.findOneAndDelete.calledWith({ _id: "coupon123" })).to.be
        .true;
    });

    it("should handle database errors", async () => {
      req.user = { _id: "seller123", role: "seller" };
      req.params = { id: "coupon123" };
      const dbError = new Error("Database error");
      sinon.stub(Coupon, "findOneAndDelete").rejects(dbError);

      await deleteCoupon(req, res, next);

      expect(next.calledWith(dbError)).to.be.true;
    });
  });
});
