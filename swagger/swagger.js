import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Base configuration
const baseDefinition = {
  openapi: '3.0.0',
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    }
  ]
};

// V1 API Documentation
const v1Options = {
  definition: {
    ...baseDefinition,
    info: {
      title: 'E-Market API V1',
      version: '1.0.0',
      description: 'API documentation for E-Market platform - Version 1'
    }
  },
  apis: ['./routes/api/v1/*.js']
};

// V2 API Documentation
const v2Options = {
  definition: {
    ...baseDefinition,
    info: {
      title: 'E-Market API V2',
      version: '2.0.0',
      description: 'API documentation for E-Market platform - Version 2'
    }
  },
  apis: ['./routes/api/v2/*.js']
};

const specsV1 = swaggerJSDoc(v1Options);
const specsV2 = swaggerJSDoc(v2Options);

// Swagger UI options with multiple URLs
const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    urls: [
      {
        url: '/api-docs/v1/swagger.json',
        name: 'V1 - Stable'
      },
      {
        url: '/api-docs/v2/swagger.json',
        name: 'V2 - Latest'
      }
    ],
    'urls.primaryName': 'V2 - Latest' // Set default version
  }
};

export { swaggerUi, specsV1, specsV2, swaggerOptions };