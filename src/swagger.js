const swaggerJsDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const path = require('path')
const { type } = require('os')

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
        url: `http://localhost:${process.env.PORT || 4000}`,
        description: 'Local server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        // ==================== REGISTER EMPLOYEE ====================
      RegisterEmployee: {
  type: 'object',
  required: [
    'first_name',
    'last_name',
    'password',
    'email',
    'government_entity',
    'permission_id',
    'phone'
  ],
  properties: {
    first_name: {
      type: 'string',
      example: 'Rawan',
      minLength: 2,
      maxLength: 100
    },
    last_name: {
      type: 'string',
      example: 'Ahmad',
      minLength: 2,
      maxLength: 100
    },
    email: {
      type: 'string',
      example: 'rawan@gmail.com',
      pattern: '^[a-zA-Z0-9._%+-]+@gmail\\.com$'
    },
    password: { type: 'string', example: 'Abc123$' },
    government_entity: {
      type: 'string',
      enum: ['كهرباء', 'ماء', 'صحة', 'تعليم', 'داخلية', 'مالية'],
      example: 'صحة'
    },
    phone: {
      type: 'string',
      example: '0771234567',
      pattern: '^[0-9]{10}$', // فقط 10 أرقام بالضبط
      description: 'رقم الهاتف يجب أن يكون 10 أرقام بالضبط'
    },
    permission_id: {
      type: 'array',
      items: { type: 'integer' },
      example: [1, 5, 7]
    }
  }
},

RegisterEmployeeResponse: {
  type: 'object',
  properties: {
    user: {
      type: 'object',
      properties: {
        id: { type: 'integer', example: 10 },
        first_name: { type: 'string', example: 'Rawan' },
        last_name: { type: 'string', example: 'Ahmad' },
        email: { type: 'string', example: 'rawan@gmail.com' },
        phone: { type: 'string', example: '0954862937' }
      }
    },
    newEmployee: {
      type: 'object',
      properties: {
        user_id: { type: 'integer', example: 10 },
        government_entity: { type: 'string', example: 'صحة' }
      }
    },
    permission: {
      type: 'object',
      properties: {
        user_id: { type: 'integer', example: 10 },
        permission_id: { type: 'integer', example: 7 }
      }
    },
    token: { type: 'string', example: 'jwt.token.here' }
  }
}
,

        // ==================== REGISTER CITIZEN ====================
        RegisterCitizen: {
          type: 'object',
          required: ['first_name', 'last_name', 'password', 'email'],
          properties: {
            first_name: { type: 'string', example: 'Rawan' },
            last_name: { type: 'string', example: 'Ahmad' },
            email: { type: 'string', example: 'Rawan@gmail.com' },
            password: { type: 'string', example: 'Abc123$' },
            phone : {type: 'string' , example:'0954862937' }
          }
        },
        RegisterCitizenResponse: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            first_name: { type: 'string', example: 'Rawan' },
            last_name: { type: 'string', example: 'Ahmad' },
            email: { type: 'string', example: 'Rawan@gmail.com' },
            phone: {type:'string' , example:'0954862729'},
            token: { type: 'string', example: 'jwt.token.here' }
          }
        },

        // ==================== LOGIN ====================
        Login: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', example: 'admin@example.com' },
            password: { type: 'string', example: '123456$%' }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            first_name: { type: 'string', example: 'Super' },
            last_name: { type: 'string', example: 'Admin' },
            email: { type: 'string', example: 'admin@example.com' },
            token: { type: 'string', example: 'jwt.token.here' }
          }
        },

        // ==================== OTP ====================
        SendOtp: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', example: 'ali@gmail.com' }
          }
        },
        VerifyOtp: {
          type: 'object',
          required: ['email', 'otp'],
          properties: {
            email: { type: 'string', example: 'ali@gmail.com' },
            otp: { type: 'string', example: '123456' }
          }
        },

        // ==================== COMPLAINT ====================
        CreateComplaint: {
          type: 'object',
          required: ['description', 'governorate', 'government_entity'],
          properties: {
            description: {
              type: 'string',
              example: 'نعاني من انقطاع المياه منذ يومين بدون سابق إنذار.'
            },
            governorate: { type: 'string', example: 'دمشق' },
            location: { type: 'string', example: 'حي السلام، شارع 5' },
            government_entity: { type: 'string', example: 'ماء' },
            images: {
              type: 'string',
              format: 'binary',
              description:
                'ملفات الصور (يمكن رفع أكثر من ملف باستخدام Choose Files)'
            },
            attachments: {
              type: 'string',
              format: 'binary',
              description:
                'ملفات مرفقة أخرى (PDF, DOCX, ...) يمكن رفع أكثر من ملف'
            }
          }
        },

        ComplaintResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'تم إنشاء الشكوى بنجاح!' },
            complaint: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 101 },
                description: {
                  type: 'string',
                  example: 'نعاني من انقطاع المياه منذ يومين...'
                },
                governorate: { type: 'string', example: 'دمشق' },
                location: { type: 'string', example: 'حي السلام، شارع 5' },
                government_entity: { type: 'string', example: 'ماء' },
                status: { type: 'string', example: 'جديدة' },
                citizen_id: { type: 'integer', example: 12 },
                images: { type: 'array', items: { type: 'string' } },
                attachments: { type: 'array', items: { type: 'string' } },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        ///================ update complaint
        updateComplaint: {
          type: 'object',
          properties: {
            notes: { type: 'string', example: 'اضف الموقع بالتفصيل' },
            status: { type: 'string', example: 'منجزة' }
          }
        }
      }
    }
  },
  apis: [path.join(__dirname, './routes/*.js')]
}

const swaggerSpec = swaggerJsDoc(swaggerOptions)

function setupSwagger (app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
}

module.exports = { swaggerUi, swaggerSpec, setupSwagger }
