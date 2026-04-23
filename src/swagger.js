const swaggerJsDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const path = require('path')

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
    tags: [
      { name: 'Calculation', description: 'العمليات الحسابية (calculations)' },
      { name: 'Field', description: 'إدارة الحقول (Fields)' },
      { name: 'File', description: 'إدارة الملفات (Files)' },
      {
        name: 'ProcessDefinition',
        description: 'تعريف العمليات (Process Definitions)'
      },
      { name: 'Tasks', description: 'إدارة المهام (Workflow Tasks)' },
      { name: 'StageConfig', description: 'إعدادات المراحل (Stage Configuration)' }
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
        // ===================== Calculation ==========================
        CalculationCreate: {
          type: 'object',
          required: ['name', 'formula', 'result_field'],
          properties: {
            name: {
              type: 'string',
              example: 'حساب الرسوم',
              minLength: 2,
              maxLength: 100
            },
            formula: { type: 'string', example: 'amount * 0.05 + fixed_fee' },
            result_field: { type: 'string', example: 'total_amount' }
          }
        },

        CalculationUpdate: {
          type: 'object',
          minProperties: 1,
          properties: {
            name: { type: 'string', example: 'حساب الرسوم (محدث)' },
            formula: { type: 'string', example: 'amount * 0.06 + fixed_fee' },
            result_field: { type: 'string', example: 'total_amount' },
            version: { type: 'integer', example: 2 }
          }
        },

        Calculation: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'حساب الرسوم' },
            formula: { type: 'string', example: 'amount * 0.05 + fixed_fee' },
            result_field: {
              type: 'string',
              example: 'total_amount',
              nullable: true
            },
            version: { type: 'integer', example: 1 },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        CalculationEnvelope: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'تم انشاء العملية الحسابية بنجاح !'
            },
            data: { $ref: '#/components/schemas/Calculation' }
          }
        },

        CalculationListEnvelope: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'عرض كل العمليات الحسابية بنجاح !'
            },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Calculation' }
            }
          }
        },

        // ======================== Field ===============================

        FieldCreate: {
          type: 'object',
          required: ['field_name', 'field_type'],
          properties: {
            field_name: {
              type: 'string',
              example: 'student_name'
            },
            field_type: {
              type: 'string',
              enum: ['string', 'number', 'text', 'date', 'boolean'],
              example: 'string'
            },
            list_json: {
              type: 'array',
              items: { type: 'string' },
              example: ['Option1', 'Option2']
            }
          }
        },

        FieldUpdate: {
          type: 'object',
          minProperties: 1,
          properties: {
            field_name: { type: 'string', example: 'student_name_updated' },
            field_type: {
              type: 'string',
              enum: ['string', 'number', 'text', 'date', 'boolean']
            },
            list_json: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },

        Field: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            field_name: { type: 'string', example: 'student_name' },
            field_type: { type: 'string', example: 'string' },
            list_json: {
              type: 'array',
              items: { type: 'string' },
              nullable: true
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        FieldEnvelope: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'تم انشاء الحقل بنجاح !' },
            data: { $ref: '#/components/schemas/Field' }
          }
        },

        FieldListEnvelope: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'عرض كل الحقول بنجاح !' },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Field' }
            }
          }
        },
        // ======================== File ===============================

        FileCreate: {
          type: 'object',
          required: ['file_name', 'file_type', 'type_file'],
          properties: {
            file_name: {
              type: 'string',
              example: 'هوية شخصية'
            },
            file_type: {
              type: 'string',
              enum: ['pdf', 'docx', 'jpg', 'png'],
              example: 'pdf'
            },
            type_file: {
              type: 'string',
              enum: ['اضبارة', 'وثائق للمواطن', 'كتاب وزاري'],
              example: 'وثائق للمواطن'
            }
          }
        },

        FileUpdate: {
          type: 'object',
          minProperties: 1,
          properties: {
            file_name: {
              type: 'string',
              example: 'هوية شخصية محدثة'
            },
            file_type: {
              type: 'string',
              enum: ['pdf', 'docx', 'jpg', 'png']
            },
            type: {
              type: 'string',
              enum: ['اضبارة', 'وثائق للمواطن', 'كتاب وزاري']
            }
          }
        },

        File: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            file_name: { type: 'string', example: 'هوية شخصية' },
            file_type: { type: 'string', example: 'pdf' },
            type: { type: 'string', example: 'وثائق للمواطن' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        FileEnvelope: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'تم انشاء الملف بنجاح !' },
            data: { $ref: '#/components/schemas/File' }
          }
        },

        FileListEnvelope: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'عرض كل الملفات بنجاح !' },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/File' }
            }
          }
        },

        //=========================================  ProcessDefinition=================================

        ProcessDefinitionCreate: {
          type: 'object',
          required: ['name', 'type_trans_id'],
          properties: {
            name: {
              type: 'string',
              example: 'معاملة نقل طالب'
            },
            code: {
              type: 'string',
              example: 'student_transfer'
            },
            type_trans_id: {
              type: 'integer',
              example: 1
            },
            organization_id: {
              type: 'integer',
              example: 1
            }
          }
        },

        ProcessDefinition: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'معاملة نقل طالب' },
            code: { type: 'string', example: 'student_transfer' },
            camunda_process_key: { type: 'string', nullable: true },
            camunda_deployment_id: { type: 'string', nullable: true },
            version: { type: 'integer', example: 1 },
            status: { type: 'string', example: 'draft' },
            is_latest: { type: 'boolean', example: true },
            bpmn_file_path: { type: 'string', nullable: true },
            bpmn_xml: { type: 'string', nullable: true },
            is_active: { type: 'boolean', example: true },
            organization_id: { type: 'integer', nullable: true },
            type_trans_id: { type: 'integer', example: 1 },
            priority: { type: 'integer', example: 1 },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        ProcessDefinitionEnvelope: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'تم إنشاء تعريف المعاملة بنجاح'
            },
            data: {
              $ref: '#/components/schemas/ProcessDefinition'
            }
          }
        },
  //====================================== Task ======================================================

        Task: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '123' },
            name: { type: 'string', example: 'موافقة المدير' },
            definitionKey: { type: 'string', example: 'manager_approval' },
            created: { type: 'string', format: 'date-time' }
          }
        },

        Stage: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 10 },
            name: { type: 'string', example: 'مرحلة الموافقة' },
            type: { type: 'string', example: 'APPROVAL' },
            code: { type: 'string', example: 'manager_approval' }
          }
        },

        TaskForm: {
          type: 'object',
          properties: {
            fields: {
              type: 'array',
              items: {
                type: 'object',
                example: { field_id: 1, required: true }
              }
            },
            files: {
              type: 'array',
              items: {
                type: 'object',
                example: { file_id: 2, required: true }
              }
            },
            ui: {
              type: 'array',
              items: { type: 'object' }
            },
            rules: {
              type: 'array',
              items: { type: 'object' }
            }
          }
        },

        MyTasksResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  task: { $ref: '#/components/schemas/Task' },
                  stage: { $ref: '#/components/schemas/Stage' },
                  process_instance_id: { type: 'integer' }
                }
              }
            },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' }
          }
        },

        CompleteTaskRequest: {
          type: 'object',
          required: ['action'],
          properties: {
            action: {
              type: 'string',
              enum: ['approve', 'reject', 'return'],
              example: 'approve'
            },
            fields: {
              type: 'object',
              example: {
                field_1: 'value',
                field_2: 123
              }
            },
            files: {
              type: 'array',
              items: {
                type: 'object',
                example: {
                  file_id: 1,
                  url: 'https://file-url'
                }
              }
            },
            signature: {
              type: 'string',
              example: 'encrypted_signature_here'
            }
          }
        },
        // ========================    
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
