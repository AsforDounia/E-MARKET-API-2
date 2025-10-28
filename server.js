import express from "express";
import connectDB from "./config/database.js";
import logger from "./middlewares/logger.js";
import notFound from "./middlewares/notFound.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { swaggerUi, specsV1, specsV2, swaggerOptions } from "./swagger/swagger.js";
import {securityMiddlewares} from "./middlewares/security.js";
import redis from './config/redis.js';

// API Versioning
import v1Routes from './routes/api/v1/index.js';
import v2Routes from './routes/api/v2/index.js';


const app = express();

// Connexion à MongoDB
if (process.env.NODE_ENV !== "test") {
  connectDB();
}

//aplication de tous les middlwares de securité (helemt,rate-limit,cors)
securityMiddlewares(app);

// Middleware pour parser JSON
app.use(express.json());
// app.use(logger);

// Test route
app.get("/", (req, res) => {
  res.send("E-Market API is running!");
});

// API Versioning
app.use('/api/v1', v1Routes);
app.use('/api/v2', v2Routes);

// Swagger documentation
app.get('/api-docs/v1/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(specsV1);
});

app.get('/api-docs/v2/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(specsV2);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specsV1, swaggerOptions));


// Main API docs with dropdown selector (V1 as default)
// Permet d'accéder aux fichiers uploadés
app.use("/uploads", express.static("uploads"));

app.use(notFound);
app.use(errorHandler);

// Test Redis connection
redis.ping().then(() => {
    console.log('Redis ping successful');
}).catch(err => {
    console.error('Redis ping failed:', err.message);
});


logger.info("Serveur démarré sur le port 3000");
logger.warn("Attention : mémoire presque pleine !");
logger.error("Erreur critique !");

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
