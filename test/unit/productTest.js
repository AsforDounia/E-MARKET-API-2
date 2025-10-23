import { expect } from "chai";
import sinon from "sinon";
import { faker } from "@faker-js/faker";
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
          title: faker.commerce.productName(),
          price: parseFloat(faker.commerce.price({ min: 10, max: 1000 })),
          description: faker.commerce.productDescription(),
          stock: faker.number.int({ min: 1, max: 100 }),
          categoryIds: [],
        },
        user: { 
          _id: faker.database.mongodbObjectId(), 
          role: "seller" 
        },
        files: [],
      };
    });

    it("should create a product successfully", async () => {
      const fakeProduct = {
        _id: faker.database.mongodbObjectId(),
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
      expect(response.data).to.have.property("title", req.body.title);
    });

    it("should return error if required fields are missing", async () => {
      req.body = { description: faker.commerce.productDescription() };

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
          _id: faker.database.mongodbObjectId(), 
          title: faker.commerce.productName(), 
          price: parseFloat(faker.commerce.price({ min: 10, max: 100 })), 
          stock: faker.number.int({ min: 1, max: 50 }),
          imageUrls: [],
          createdAt: faker.date.recent(),
          description: faker.commerce.productDescription()
        },
        { 
          _id: faker.database.mongodbObjectId(), 
          title: faker.commerce.productName(), 
          price: parseFloat(faker.commerce.price({ min: 100, max: 200 })),
          stock: faker.number.int({ min: 1, max: 30 }),
          imageUrls: [],
          createdAt: faker.date.recent(),
          description: faker.commerce.productDescription()
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
      const searchTerm = faker.commerce.productAdjective();
      req.query = { search: searchTerm };

      const fakeProducts = [
        { 
          _id: faker.database.mongodbObjectId(), 
          title: `${searchTerm} ${faker.commerce.product()}`,
          price: parseFloat(faker.commerce.price()),
          stock: faker.number.int({ min: 1, max: 50 }),
          imageUrls: [],
          createdAt: faker.date.recent(),
          description: faker.commerce.productDescription()
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
      const minPrice = faker.number.int({ min: 10, max: 50 });
      const maxPrice = faker.number.int({ min: 51, max: 150 });
      req.query = { minPrice: minPrice.toString(), maxPrice: maxPrice.toString() };

      const fakeProducts = [
        { 
          _id: faker.database.mongodbObjectId(), 
          title: faker.commerce.productName(),
          price: faker.number.int({ min: minPrice, max: maxPrice }),
          stock: faker.number.int({ min: 1, max: 50 }),
          imageUrls: [],
          createdAt: faker.date.recent(),
          description: faker.commerce.productDescription()
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
      expect(filter.price).to.have.property("$gte", minPrice);
      expect(filter.price).to.have.property("$lte", maxPrice);
    });

    it("should filter by inStock status", async () => {
      req.query = { inStock: "true" };

      const fakeProducts = [
        { 
          _id: faker.database.mongodbObjectId(), 
          title: faker.commerce.productName(),
          price: parseFloat(faker.commerce.price()),
          stock: faker.number.int({ min: 1, max: 50 }),
          imageUrls: [],
          createdAt: faker.date.recent(),
          description: faker.commerce.productDescription()
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
    let productId;

    beforeEach(() => {
      productId = faker.database.mongodbObjectId();
      req = { params: { id: productId } };
    });

    it("should return product by ID", async () => {
      const fakeProduct = { 
        _id: productId, 
        title: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        price: parseFloat(faker.commerce.price()),
        stock: faker.number.int({ min: 1, max: 100 }),
        imageUrls: []
      };

      sinon.stub(Product, "findById").resolves(fakeProduct);
      
      const productCategoryQueryChain = {
        populate: sinon.stub().resolves([
          { category: { 
            _id: faker.database.mongodbObjectId(), 
            name: faker.commerce.department() 
          } }
        ])
      };
      sinon.stub(ProductCategory, "find").returns(productCategoryQueryChain);

      await productController.getProductById(req, res, next);

      expect(Product.findById.calledWith(productId)).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response).to.have.property("success", true);
      expect(response.data).to.have.property("product");
      expect(response.data.product).to.have.property("title", fakeProduct.title);
      expect(response.data.product).to.have.property("categories");
    });

    it("should return error for invalid ID", async () => {
      req.params.id = faker.string.alphanumeric(10); // ID invalide

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