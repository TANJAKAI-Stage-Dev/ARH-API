import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API RH Automatisée',
      version: '1.0.0',
      description: 'Documentation Swagger du système RH automatisé',
    },
  },
  apis: ['./src/routes/*.ts'],
  components: {
      securitySchemes:{
        bearerAuth:{
          type:"http",
          scheme:"bearer",
          bearerFormat: "JWT",
        },
      },
  },
  security:[
    {
      bearerAuth: [],
    },
  ],
};

const swaggerSpec = swaggerJsDoc(options);

export const swaggerDocs = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
