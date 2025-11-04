import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import MongoStore from "rate-limit-mongo";
import dotenvFlow, { config } from "dotenv-flow";

dotenvFlow.config();
console.log(process.env.NODE_ENV );

const securityMiddlewares = (app) => {
    //middlware pour sécuriser les headers HTTP
    // app.use(helmet());

    // middleware pour autoriser les requetes cross-origin
    app.use(cors());

    app.use((req, res, next) => {
       if (req.path.startsWith("/api-docs")) {
            return helmet({
                contentSecurityPolicy: false, // Désactive CSP pour Swagger uniquement
            })(req, res, next);
        }
        helmet()(req, res, next);
  });
};

const createLimiter = (min, max) => {
    if (process.env.NODE_ENV === "test") {
        return (req, res, next) => next();
    }

    return rateLimit({
        store: new MongoStore({
            uri: process.env.MONGO_URI,
            expireTimeMs: min * 60 * 1000,
            collectionName: "requestLimits",
        }),
        windowMs: min * 60 * 1000,
        max: max,
        message: "Request limit exceeded. Please wait before trying again",
    });
};

export { securityMiddlewares, createLimiter };
