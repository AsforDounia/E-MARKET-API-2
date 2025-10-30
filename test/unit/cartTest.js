import { expect } from "chai";
import sinon from "sinon";
import {
  addToCart,
  getCart,
  removeFromCart,
  updateCartItem,
  clearCart,
} from "../../controllers/cartController.js";
import { Product, Cart, CartItem } from "../../models/Index.js";
import { AppError } from "../../middlewares/errorHandler.js";
import mongoose from "mongoose";

describe("Cart Controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { id: "user123" },
      body: {},
      params: {},
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

  describe("addToCart", () => {
    const mockProduct = {
      _id: "product123",
      title: "Test Product",
      price: 100,
      stock: 10,
    };

    const mockCart = {
      _id: "cart123",
      userId: "user123",
      toObject: () => ({ _id: "cart123", userId: "user123" }),
    };

    beforeEach(() => {
      req.body = { productId: "product123", quantity: 2 };
    });

    it("should add a new product to cart successfully", async () => {
      sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
      sinon.stub(Product, "findById").resolves(mockProduct);
      sinon.stub(Cart, "findOne").resolves(mockCart);
      sinon.stub(CartItem, "findOne").resolves(null);
      sinon
        .stub(CartItem, "create")
        .resolves({ productId: "product123", quantity: 2 });

      const populateStub = sinon
        .stub()
        .resolves([{ productId: mockProduct, quantity: 2 }]);
      sinon.stub(CartItem, "find").returns({ populate: populateStub });

      await addToCart(req, res, next);

      expect(Product.findById.calledWith("product123")).to.be.true;
      expect(
        CartItem.create.calledWith({
          cartId: "cart123",
          productId: "product123",
          quantity: 2,
        })
      ).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const jsonCall = res.json.firstCall.args[0];
      expect(jsonCall.status).to.equal("success");
      expect(jsonCall.message).to.equal("Product added to cart successfully");
      // expect(jsonCall.data.cart.totalAmount).to.equal(200);
    });

    it("should update quantity if product already exists in cart", async () => {
      sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
      sinon.stub(Product, "findById").resolves(mockProduct);
      sinon.stub(Cart, "findOne").resolves(mockCart);
      sinon
        .stub(CartItem, "findOne")
        .resolves({ productId: "product123", quantity: 1 });
      sinon.stub(CartItem, "updateOne").resolves({ modifiedCount: 1 });

      const populateStub = sinon
        .stub()
        .resolves([{ productId: mockProduct, quantity: 3 }]);
      sinon.stub(CartItem, "find").returns({ populate: populateStub });

      await addToCart(req, res, next);

      expect(
        CartItem.updateOne.calledWith(
          { cartId: "cart123", productId: "product123" },
          { $inc: { quantity: 2 } }
        )
      ).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
    });

    it("should create new cart if cart does not exist", async () => {
      sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
      sinon.stub(Product, "findById").resolves(mockProduct);
      sinon.stub(Cart, "findOne").resolves(null);
      sinon.stub(Cart, "create").resolves(mockCart);
      sinon.stub(CartItem, "findOne").resolves(null);
      sinon.stub(CartItem, "create").resolves({});

      const populateStub = sinon
        .stub()
        .resolves([{ productId: mockProduct, quantity: 2 }]);
      sinon.stub(CartItem, "find").returns({ populate: populateStub });

      await addToCart(req, res, next);

      expect(Cart.create.calledWith({ userId: "user123" })).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
    });

    it("should throw error if product ID is invalid", async () => {
      sinon.stub(mongoose.Types.ObjectId, "isValid").returns(false);

      await addToCart(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.be.instanceOf(AppError);
      expect(error.message).to.equal("Invalid product ID");
      expect(error.statusCode).to.equal(400);
    });

    it("should throw error if product not found", async () => {
      sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
      sinon.stub(Product, "findById").resolves(null);

      await addToCart(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.be.instanceOf(AppError);
      expect(error.message).to.equal("Product not found");
      expect(error.statusCode).to.equal(404);
    });

    it("should throw error if insufficient stock", async () => {
      sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
      req.body.quantity = 15;
      sinon.stub(Product, "findById").resolves(mockProduct);

      await addToCart(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.be.instanceOf(AppError);
      expect(error.message).to.equal("Insufficient stock");
      expect(error.statusCode).to.equal(400);
    });
  });

  describe("getCart", () => {
    it("should return empty cart if cart does not exist", async () => {
      sinon.stub(Cart, "findOne").resolves(null);

      await getCart(req, res, next);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const jsonCall = res.json.firstCall.args[0];
      expect(jsonCall.status).to.equal("success");
      expect(jsonCall.message).to.equal("Cart is empty");
      expect(jsonCall.data.cart.items).to.be.an("array").that.is.empty;
      expect(jsonCall.data.cart.totalAmount).to.equal(0);
    });

    it("should return cart with items successfully", async () => {
      const mockCart = {
        _id: "cart123",
        userId: "user123",
        toObject: () => ({ _id: "cart123", userId: "user123" }),
      };
      const mockItems = [
        { productId: { price: 100, title: "Product 1" }, quantity: 2 },
        { productId: { price: 50, title: "Product 2" }, quantity: 1 },
      ];

      sinon.stub(Cart, "findOne").resolves(mockCart);
      const populateStub = sinon.stub().resolves(mockItems);
      sinon.stub(CartItem, "find").returns({ populate: populateStub });

      await getCart(req, res, next);

      expect(res.status.calledWith(200)).to.be.true;

      const jsonCall = res.json.firstCall.args[0];
      expect(jsonCall.status).to.equal("success");
      expect(jsonCall.message).to.equal("Cart retrieved successfully");
      expect(jsonCall.data.cart.items).to.deep.equal(mockItems);
      expect(jsonCall.data.cart.totalAmount).to.equal(250);
    });

    it("should handle errors", async () => {
      const error = new Error("Database error");
      sinon.stub(Cart, "findOne").rejects(error);

      await getCart(req, res, next);

      expect(next.calledWith(error)).to.be.true;
    });
  });

  describe("removeFromCart", () => {
    it("should remove a product from cart", async () => {
      const productId = new mongoose.Types.ObjectId();
      const cartId = new mongoose.Types.ObjectId();
      req.params = { productId: productId.toString() };

      const mockCart = {
        _id: cartId,
        userId: "user123",
        toObject: () => ({ _id: cartId, userId: "user123" }),
      };

      sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
      sinon.stub(Cart, "findOne").resolves(mockCart);
      sinon.stub(CartItem, "deleteOne").resolves({ deletedCount: 1 });
      sinon.stub(CartItem, "find").returns({
        populate: sinon.stub().resolves([]),
      });

      await removeFromCart(req, res, next);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.firstCall.args[0].message).to.equal(
        "Product removed from cart successfully"
      );
    });

    it("should return an error if productId is invalid", async () => {
      req.params = { productId: "invalid" };

      sinon.stub(mongoose.Types.ObjectId, "isValid").returns(false);

      await removeFromCart(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error.message).to.equal("Invalid product ID");
    });

    it("should return an error if cart doesn't exist", async () => {
      const productId = new mongoose.Types.ObjectId();
      req.params = { productId: productId.toString() };

      sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
      sinon.stub(Cart, "findOne").resolves(null);

      await removeFromCart(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error.message).to.equal("Cart not found");
      expect(error.statusCode).to.equal(404);
    });

    it("should return an error if product is not in cart", async () => {
      const productId = new mongoose.Types.ObjectId();
      const cartId = new mongoose.Types.ObjectId();
      req.params = { productId: productId.toString() };

      const mockCart = {
        _id: cartId,
        userId: "user123",
      };

      sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
      sinon.stub(Cart, "findOne").resolves(mockCart);
      sinon.stub(CartItem, "deleteOne").resolves({ deletedCount: 0 });

      await removeFromCart(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error.message).to.equal("Product not found in cart");
      expect(error.statusCode).to.equal(404);
    });
  });

  describe("updateCartItem", () => {
    it("should update item quantity", async () => {
      const productId = new mongoose.Types.ObjectId();
      const cartId = new mongoose.Types.ObjectId();
      req.params = { productId: productId.toString() };
      req.body = { quantity: 5 };

      const mockCart = {
        _id: cartId,
        userId: "user123",
        toObject: () => ({ _id: cartId, userId: "user123" }),
      };

      const mockProduct = {
        _id: productId,
        stock: 10,
      };

      sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
      sinon.stub(Cart, "findOne").resolves(mockCart);
      sinon.stub(Product, "findById").resolves(mockProduct);
      sinon.stub(CartItem, "updateOne").resolves({ matchedCount: 1 });
      sinon.stub(CartItem, "find").returns({
        populate: sinon.stub().resolves([]),
      });

      await updateCartItem(req, res, next);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.firstCall.args[0].message).to.equal(
        "Cart item updated successfully"
      );
    });

    it("should return an error if productId is invalid", async () => {
      req.params = { productId: "invalid" };
      req.body = { quantity: 5 };

      sinon.stub(mongoose.Types.ObjectId, "isValid").returns(false);

      await updateCartItem(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error.message).to.equal("Invalid product ID");
    });

    it("should return an error if cart doesn't exist", async () => {
      const productId = new mongoose.Types.ObjectId();
      req.params = { productId: productId.toString() };
      req.body = { quantity: 5 };

      sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
      sinon.stub(Cart, "findOne").resolves(null);

      await updateCartItem(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error.message).to.equal("Cart not found");
    });

    it("should return an error if stock is insufficient", async () => {
      const productId = new mongoose.Types.ObjectId();
      const cartId = new mongoose.Types.ObjectId();
      req.params = { productId: productId.toString() };
      req.body = { quantity: 20 };

      const mockCart = {
        _id: cartId,
        userId: "user123",
      };

      const mockProduct = {
        _id: productId,
        stock: 5,
      };

      sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
      sinon.stub(Cart, "findOne").resolves(mockCart);
      sinon.stub(Product, "findById").resolves(mockProduct);

      await updateCartItem(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error.message).to.equal("Insufficient stock");
    });

    it("should return an error if product is not in cart", async () => {
      const productId = new mongoose.Types.ObjectId();
      const cartId = new mongoose.Types.ObjectId();
      req.params = { productId: productId.toString() };
      req.body = { quantity: 5 };

      const mockCart = {
        _id: cartId,
        userId: "user123",
      };

      const mockProduct = {
        _id: productId,
        stock: 10,
      };

      sinon.stub(mongoose.Types.ObjectId, "isValid").returns(true);
      sinon.stub(Cart, "findOne").resolves(mockCart);
      sinon.stub(Product, "findById").resolves(mockProduct);
      sinon.stub(CartItem, "updateOne").resolves({ matchedCount: 0 });

      await updateCartItem(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error.message).to.equal("Product not found in cart");
    });
  });

  describe("clearCart", () => {
    it("should clear the cart", async () => {
      const cartId = new mongoose.Types.ObjectId();
      const mockCart = {
        _id: cartId,
        userId: "user123",
      };

      sinon.stub(Cart, "findOne").resolves(mockCart);
      sinon.stub(CartItem, "deleteMany").resolves({ deletedCount: 3 });

      await clearCart(req, res, next);

      expect(CartItem.deleteMany.calledWith({ cartId: cartId })).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.firstCall.args[0].message).to.equal(
        "Cart cleared successfully"
      );
    });

    it("should return an error if cart doesn't exist", async () => {
      sinon.stub(Cart, "findOne").resolves(null);

      await clearCart(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error.message).to.equal("Cart not found");
      expect(error.statusCode).to.equal(404);
    });
  });
});
