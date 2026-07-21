'use strict'

const swaggerJsDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')

const tags = require('./tags')
const schemas = require('./schemas')
const examples = require('./examples')

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NetApp API',
      version: '1.0.0',
      description: 'API documentation for Grass project'
    },
    servers: [
      {
        url: '/',
        description: 'Same origin (current host) — يتجنّب مشاكل CORS عند التجربة'
      },
      {
        url: process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`,
        description: process.env.API_PUBLIC_URL ? 'Public server' : 'Local server'
      }
    ],
    tags,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas,
      examples
    }
  },
  apis: ['./src/modules/**/routes/*.js']
}

const swaggerSpec = swaggerJsDoc(swaggerOptions)

function setupSwagger (app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
}

module.exports = { swaggerUi, swaggerSpec, setupSwagger }
