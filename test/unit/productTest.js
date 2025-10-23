import { expect } from "chai";
import sinon from "sinon";
import * as productController from "../../controllers/productController.js";
import { Product, ProductImage, ProductCategory, Category } from "../../models/Index.js";

describe("Product Unit Tests", () => {
  let req, res, next;

  beforeEach(() => {
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub().returnsThis(),
    };
    next = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  // ==================== CREATE PRODUCT ====================
  describe("createProduct", () => {
    beforeEach(() => {
      req = {
        body: {
          title: "Test Product",
          price: 99.99,
          description: "test description",
          stock: 10,
          categoryIds: [],
        },
        user: { _id: "seller123", role: "seller" },
        files: [],
      };
    });

    it("should create a product successfully", async () => {
      const fakeProduct = {
        _id: "prod123",
        title: req.body.title,
        price: req.body.price,
        description: req.body.description,
        stock: req.body.stock,
        sellerId: req.user._id,
        validationStatus: "pending",
        isVisible: true,
        imageUrls: [],
        save: sinon.stub().resolvesThis(),
      };

      sinon.stub(Product, "create").resolves(fakeProduct);
      sinon.stub(ProductImage, "insertMany").resolves([]);
      sinon.stub(ProductCategory, "insertMany").resolves([]);

      await productController.createProduct(req, res, next);

      expect(Product.create.calledOnce).to.be.true;
      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response).to.have.property("success", true);
      expect(response.data).to.have.property("title", "Test Product");
    });

    it("should return error if required fields are missing", async () => {
      req.body = { description: "No title or price" };

      await productController.createProduct(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.have.property("statusCode", 400);
    });
  });

  // ==================== GET ALL PRODUCTS ====================
  describe("getAllProducts", () => {
    beforeEach(() => {
      req = { query: {} };
    });

    it("should get all products successfully", async () => {
      const fakeProducts = [
        { 
          _id: "507f1f77bcf86cd799439011", 
          title: "Prod 1", 
          price: 50, 
          stock: 10,
          imageUrls: [],
          createdAt: new Date(),
          description: "Test desc 1"
        },
        { 
          _id: "507f1f77bcf86cd799439012", 
          title: "Prod 2", 
          price: 100,
          stock: 5,
          imageUrls: [],
          createdAt: new Date(),
          description: "Test desc 2"
        },
      ];

      const queryChain = {
        sort: sinon.stub().returnsThis(),
        skip: sinon.stub().returnsThis(),
        limit: sinon.stub().resolves(fakeProducts),
      };

      sinon.stub(Product, "find").returns(queryChain);
      sinon.stub(Product, "countDocuments").resolves(2);
      
      const productCategoryQueryChain = {
        populate: sinon.stub().resolves([])
      };
      sinon.stub(ProductCategory, "find").returns(productCategoryQueryChain);

      await productController.getAllProducts(req, res, next);

      expect(Product.find.calledOnce).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response).to.have.property("success", true);
      expect(response.data).to.have.property("products");
      expect(response.data.products).to.have.lengthOf(2);
    });

    it("should filter by search query", async () => {
      req.query = { search: "Test" };

      const fakeProducts = [
        { 
          _id: "507f1f77bcf86cd799439011", 
          title: "Test Product",
          price: 50,
          stock: 10,
          imageUrls: [],
          createdAt: new Date(),
          description: "Test desc"
        }
      ];

      const queryChain = {
        sort: sinon.stub().returnsThis(),
        skip: sinon.stub().returnsThis(),
        limit: sinon.stub().resolves(fakeProducts),
      };

      const findStub = sinon.stub(Product, "find").returns(queryChain);
      sinon.stub(Product, "countDocuments").resolves(1);
      
      const productCategoryQueryChain = {
        populate: sinon.stub().resolves([])
      };
      sinon.stub(ProductCategory, "find").returns(productCategoryQueryChain);

      await productController.getAllProducts(req, res, next);

      expect(findStub.calledOnce).to.be.true;
      const filter = findStub.firstCall.args[0];
      expect(filter).to.have.property("$or");
      expect(res.status.calledWith(200)).to.be.true;
    });

    it("should filter by price range", async () => {
      req.query = { minPrice: "20", maxPrice: "100" };

      const fakeProducts = [
        { 
          _id: "507f1f77bcf86cd799439011", 
          title: "Product in range",
          price: 50,
          stock: 10,
          imageUrls: [],
          createdAt: new Date(),
          description: "Test desc"
        }
      ];

      const queryChain = {
        sort: sinon.stub().returnsThis(),
        skip: sinon.stub().returnsThis(),
        limit: sinon.stub().resolves(fakeProducts),
      };

      const findStub = sinon.stub(Product, "find").returns(queryChain);
      sinon.stub(Product, "countDocuments").resolves(1);
      
      const productCategoryQueryChain = {
        populate: sinon.stub().resolves([])
      };
      sinon.stub(ProductCategory, "find").returns(productCategoryQueryChain);

      await productController.getAllProducts(req, res, next);

      expect(findStub.calledOnce).to.be.true;
      const filter = findStub.firstCall.args[0];
      expect(filter).to.have.property("price");
      expect(filter.price).to.have.property("$gte", 20);
      expect(filter.price).to.have.property("$lte", 100);
    });

    it("should filter by inStock status", async () => {
      req.query = { inStock: "true" };

      const fakeProducts = [
        { 
          _id: "507f1f77bcf86cd799439011", 
          title: "In stock product",
          price: 50,
          stock: 10,
          imageUrls: [],
          createdAt: new Date(),
          description: "Test desc"
        }
      ];

      const queryChain = {
        sort: sinon.stub().returnsThis(),
        skip: sinon.stub().returnsThis(),
        limit: sinon.stub().resolves(fakeProducts),
      };

      const findStub = sinon.stub(Product, "find").returns(queryChain);
      sinon.stub(Product, "countDocuments").resolves(1);
      
      const productCategoryQueryChain = {
        populate: sinon.stub().resolves([])
      };
      sinon.stub(ProductCategory, "find").returns(productCategoryQueryChain);

      await productController.getAllProducts(req, res, next);

      expect(findStub.calledOnce).to.be.true;
      const filter = findStub.firstCall.args[0];
      expect(filter).to.have.property("stock");
      expect(filter.stock).to.have.property("$gt", 0);
    });
  });

  // ==================== GET PRODUCT BY ID ====================
  describe("getProductById", () => {
    beforeEach(() => {
      req = { params: { id: "507f1f77bcf86cd799439011" } };
    });

    it("should return product by ID", async () => {
      const fakeProduct = { 
        _id: req.params.id, 
        title: "Test Product",
        description: "Test description",
        price: 99.99,
        stock: 10,
        imageUrls: []
      };

      sinon.stub(Product, "findById").resolves(fakeProduct);
      
      const productCategoryQueryChain = {
        populate: sinon.stub().resolves([
          { category: { _id: "cat1", name: "Category 1" } }
        ])
      };
      sinon.stub(ProductCategory, "find").returns(productCategoryQueryChain);

      await productController.getProductById(req, res, next);

      expect(Product.findById.calledWith(req.params.id)).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response).to.have.property("success", true);
      expect(response.data).to.have.property("product");
      expect(response.data.product).to.have.property("title", "Test Product");
      expect(response.data.product).to.have.property("categories");
    });

    it("should return error for invalid ID", async () => {
      req.params.id = "invalid-id";

      await productController.getProductById(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.have.property("statusCode", 400);
      expect(error.message).to.include("Invalid");
    });

    it("should return 404 for non-existent product", async () => {
      sinon.stub(Product, "findById").resolves(null);

      await productController.getProductById(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.have.property("statusCode", 404);
      expect(error.message).to.include("not found");
    });
  });
});