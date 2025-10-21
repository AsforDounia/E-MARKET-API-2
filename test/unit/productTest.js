import { expect } from "chai";
import sinon from "sinon";
import * as productController from "../../controllers/productController.js";
import { Product, ProductImage, ProductCategory } from "../../models/Index.js";

describe("Product Test - createProduct", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {
        title: "Test Product",
        price: 99.99,
        description: "test description",
        stock: 10,
        categoryIds: []
      },
      user: { _id: "seller123", role: "seller" },
      files: [] 
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

  it("should create a product successfully", async () => {
    const fakeProduct = {
      _id: "prod123",
      title: req.body.title,
      price: req.body.price,
      description: req.body.description,
      stock: req.body.stock,
      seller: req.user._id,
      validationStatus: "pending",
      isVisible: true,
      save: sinon.stub().resolvesThis()
    };

    sinon.stub(Product, "create").resolves(fakeProduct);
    sinon.stub(ProductImage, "insertMany").resolves([]);
    sinon.stub(ProductCategory, "insertMany").resolves([]);

    await productController.createProduct(req, res, next);

    expect(Product.create.calledOnce).to.be.true;
    expect(res.status.calledWith(201)).to.be.true;
    expect(res.json.calledOnce).to.be.true;
  });
});
