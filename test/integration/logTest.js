import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import { faker } from "@faker-js/faker";
import logger from "../../middlewares/logger.js";
import fs from "fs";
import path from "path";

describe("Logger Integration Tests", () => {
  const logDir = "logs";

  // ==================== LOG FILES CREATION ====================
  describe("Log Files Creation", () => {
    it("should create log directory", () => {
      expect(fs.existsSync(logDir)).to.be.true;
    });

    it("should create app log file when logging info", (done) => {
      logger.info(`TEST-INFO-${faker.string.uuid()}`);

      setTimeout(() => {
        const files = fs.readdirSync(logDir);
        const appLogFile = files.find((file) => file.startsWith("app-"));
        expect(appLogFile).to.exist;
        done();
      }, 100);
    });

    it("should create error log file when logging errors", (done) => {
      logger.error(`TEST-ERROR-${faker.string.uuid()}`);

      setTimeout(() => {
        const files = fs.readdirSync(logDir);
        const errorLogFile = files.find((file) => file.startsWith("error-"));
        expect(errorLogFile).to.exist;
        done();
      }, 100);
    });
  });

  // ==================== LOGGING FUNCTIONALITY ====================
  describe("Logging Functionality", () => {
    it("should write to log files without errors", () => {
      expect(() => logger.info("Integration test log")).to.not.throw();
      expect(() => logger.warn("Integration test warning")).to.not.throw();
      expect(() => logger.error("Integration test error")).to.not.throw();
    });

    it("should log with metadata without errors", () => {
      expect(() =>
        logger.info("Test with metadata", {
          userId: faker.database.mongodbObjectId(),
          action: "test",
        })
      ).to.not.throw();
    });

    it("should log errors with stack traces without errors", () => {
      const error = new Error("Test error");
      expect(() =>
        logger.error("Error occurred", {
          error: error.message,
          stack: error.stack,
        })
      ).to.not.throw();
    });
  });

  // ==================== REAL-WORLD SCENARIOS ====================
  describe("Real-world Scenarios", () => {
    it("should log HTTP requests", () => {
      expect(() =>
        logger.info("HTTP Request", {
          method: "GET",
          url: "/api/products",
          statusCode: 200,
        })
      ).to.not.throw();
    });

    it("should log authentication events", () => {
      expect(() =>
        logger.info("User login", {
          userId: faker.database.mongodbObjectId(),
          success: true,
        })
      ).to.not.throw();
    });

    it("should log business events", () => {
      expect(() =>
        logger.info("Order created", {
          orderId: faker.database.mongodbObjectId(),
          total: 100.50,
        })
      ).to.not.throw();
    });
  });

  // ==================== FILE OPERATIONS ====================
  describe("File Operations", () => {
    it("should be able to read log files", () => {
      const files = fs.readdirSync(logDir);
      const appLogFile = files.find((file) => file.startsWith("app-"));
      
      if (appLogFile) {
        const logPath = path.join(logDir, appLogFile);
        expect(() => fs.readFileSync(logPath, "utf-8")).to.not.throw();
      }
    });

    it("should have log files with content", () => {
      const files = fs.readdirSync(logDir);
      const appLogFile = files.find((file) => file.startsWith("app-"));
      
      if (appLogFile) {
        const logPath = path.join(logDir, appLogFile);
        const content = fs.readFileSync(logPath, "utf-8");
        expect(content.length).to.be.greaterThan(0);
      }
    });

    it("should have error log files with content", () => {
      const files = fs.readdirSync(logDir);
      const errorLogFile = files.find((file) => file.startsWith("error-"));
      
      if (errorLogFile) {
        const logPath = path.join(logDir, errorLogFile);
        const content = fs.readFileSync(logPath, "utf-8");
        expect(content.length).to.be.greaterThan(0);
      }
    });
  });
});

