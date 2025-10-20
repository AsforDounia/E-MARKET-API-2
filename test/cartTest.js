import request from "supertest";
import { expect } from "chai";
import sinon from "sinon";
import "sinon-mongoose";
import app from "../src/app.js";
import Product from "../src/models/Product.js";
import Cart from "../src/models/Cart.js";
import CartItem from "../src/models/CartItem.js";

describe("addToCart Unit Tests", () => {
  const userId = "user123";
  let productId;

  beforeEach(() => {
    productId = "prod123";
  });

  afterEach(() => {
    sinon.restore(); // reset all mocks after each test
  });

  //test unitaire de l'ajout d'un produit dans un nouveau panier
  it("should add product to a new cart successfully", async () => {
    sinon
      .mock(Product)
      .expects("findById")
      .withArgs(productId)
      .resolves({ _id: productId, price: 50, stock: 10 });

    sinon.mock(Cart).expects("findOne").withArgs({ userId }).resolves(null);

    sinon
      .mock(Cart)
      .expects("create")
      .withArgs({ userId })
      .resolves({
        _id: "cart123",
        userId,
        toObject: () => ({ _id: "cart123" }),
      });

    sinon
      .mock(CartItem)
      .expects("findOne")
      .withArgs({ cartId: "cart123", productId })
      .resolves(null);

    sinon
      .mock(CartItem)
      .expects("create")
      .withArgs({ cartId: "cart123", productId, quantity: 2 })
      .resolves({});

    sinon
      .mock(CartItem)
      .expects("find")
      .withArgs({ cartId: "cart123" })
      .returns({
        populate: sinon
          .stub()
          .resolves([{ productId: { price: 50 }, quantity: 2 }]),
      });

    const res = await request(app)
      .post("/api/cart/add")
      .send({ productId, quantity: 2 })
      .set("user-id", userId);

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property(
      "message",
      "Product added to cart successfully"
    );
    expect(res.body.cart.items[0]).to.have.property("quantity", 2);

    sinon.verify();
  });

//test unitaire: mettre à jours la quantité d'un produit existe deja dans le panier
  it("should update quantity if product already in cart", async () => {
    sinon
      .mock(Product)
      .expects("findById")
      .withArgs(productId)
      .resolves({ _id: productId, price: 50, stock: 10 });

    sinon
      .mock(Cart)
      .expects("findOne")
      .withArgs({ userId })
      .resolves({
        _id: "cart123",
        userId,
        toObject: () => ({ _id: "cart123" }),
      });

    sinon
      .mock(CartItem)
      .expects("findOne")
      .withArgs({ cartId: "cart123", productId })
      .resolves({ _id: "item123", quantity: 1 });

    const updateOneStub = sinon.stub(CartItem, "updateOne").resolves({});

    sinon
      .mock(CartItem)
      .expects("find")
      .withArgs({ cartId: "cart123" })
      .returns({
        populate: sinon
          .stub()
          .resolves([{ productId: { price: 50 }, quantity: 3 }]),
      });

    const res = await request(app)
      .post("/api/cart/add")
      .send({ productId, quantity: 2 })
      .set("user-id", userId);

    expect(res.status).to.equal(200);
    expect(res.body.cart.items[0]).to.have.property("quantity", 3);

    sinon.assert.calledOnce(updateOneStub);
    sinon.verify();
  });

  //test unitaire: return 404 si le produit s'existe pas 
  it("should return 404 if product does not exist", async () => {
    sinon.mock(Product).expects("findById").withArgs(productId).resolves(null);

    const res = await request(app)
      .post("/api/cart/add")
      .send({ productId, quantity: 2 })
      .set("user-id", userId);

    expect(res.status).to.equal(404);
    expect(res.body).to.have.property("message", "Product not found");

    sinon.verify();
  });

  //test unitaire: return 400 si la quantité du produit dans le stock est insuffisante
  it("should return 400 if stock is insufficient", async () => {
    sinon
      .mock(Product)
      .expects("findById")
      .withArgs(productId)
      .resolves({ _id: productId, price: 50, stock: 1 });

    const res = await request(app)
      .post("/api/cart/add")
      .send({ productId, quantity: 5 })
      .set("user-id", userId);

    expect(res.status).to.equal(400);
    expect(res.body).to.have.property("message", "Insufficient stock");

    sinon.verify();
  });
//test unitaire: return 500 pour les erreus innatendues du serveur
  it("should handle unexpected errors gracefully", async () => {
    sinon
      .mock(Product)
      .expects("findById")
      .withArgs(productId)
      .throws(new Error("Internal server error"));

    const res = await request(app)
      .post("/api/cart/add")
      .send({ productId, quantity: 2 })
      .set("user-id", userId);

    expect(res.status).to.equal(500);
    expect(res.body).to.have.property("message", "Internal server error");

    sinon.verify();
  });
});
