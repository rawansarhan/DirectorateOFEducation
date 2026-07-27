'use strict'

const swaggerJsDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')

const tags = require('./tags')
const schemas = require('./schemas')
const examples = require('./examples')
const { API_PUBLIC_URL, PORT } = require('../core/config/env')

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
        url: API_PUBLIC_URL,
        description: API_PUBLIC_URL.includes('localhost')
          ? 'Local server'
          : 'Public server'
      },
      {
        url: `http://localhost:${PORT}`,
        description: 'Local fallback'
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
