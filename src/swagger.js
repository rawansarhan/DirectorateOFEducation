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
        url: process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`,
        description: process.env.API_PUBLIC_URL ? 'Public server' : 'Local server'
      }
    ],
    tags: [
      { name: 'Auth', description: 'المصادقة وإدارة الحسابات (Authentication)' },
      { name: 'Calculation', description: 'العمليات الحسابية (calculations)' },
      { name: 'Field', description: 'إدارة الحقول (Fields)' },
      { name: 'File', description: 'إدارة الملفات (Files)' },
      { name: 'Tasks', description: 'إدارة المهام (Workflow Tasks)' },
      {
        name: 'TypeProcess',
        description: 'أنواع العمليات (Type Process)'
      },
      {
        name: 'Organization',
        description: 'إدارة المؤسسات (Organizations)'
      },
      {
        name: 'Department',
        description: 'إدارة الأقسام (Departments)'
      },
      {
        name: 'Role',
        description: 'إدارة الأدوار وربطها بالمؤسسات والأقسام (Roles)'
      },
      {
        name: 'Location',
        description: 'إدارة المواقع الجغرافية (Locations)'
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
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            userName: { type: 'string', example: 'john_doe' },
            email: { type: 'string', example: 'john@gmail.com' },
            phone_number: { type: 'string', example: '0954263526' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        LoginRequest: {
          type: 'object',
          required: ['userName', 'password'],
          properties: {
            userName: { type: 'string', example: 'testUser' },
            password: { type: 'string', example: 'Test123' }
          }
        },

        RegisterEmployeeRequest: {
          type: 'object',
          required: [
            'userName',
            'email',
            'password',
            'phone_number',
            'organization_id',
            'department_id',
            'role_id'
          ],
          properties: {
            userName: { type: 'string', example: 'john_doe' },
            email: { type: 'string', example: 'john@gmail.com' },
            phone_number: { type: 'string', example: '0954263536' },
            password: { type: 'string', example: 'pass1234' },
            organization_id: {
              type: 'integer',
              example: 1,
              description: 'معرف المؤسسة'
            },
            department_id: {
              type: 'integer',
              example: 5,
              description: 'معرف آخر قسم في الهرمية (مثل: شعبة التدقيق داخل قسم المحاسبة)'
            },
            role_id: {
              type: 'integer',
              example: 2,
              description: 'معرف الدور (Role)'
            }
          }
        },

        RegisterEmployeeResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                userName: { type: 'string', example: 'john_doe' },
                password: { type: 'string', example: '123456' },
                message: {
                  type: 'string',
                  example: 'تم إنشاء حساب الموظف بنجاح. سلّم بيانات الدخول للموظف.'
                }
              }
            }
          }
        },

        RegisterCitizenRequest: {
          type: 'object',
          required: ['userName', 'email', 'password', 'phone_number'],
          properties: {
            userName: { type: 'string', example: 'citizen_1' },
            email: { type: 'string', example: 'citizen@gmail.com' },
            phone_number: { type: 'string', example: '0954263536' },
            password: { type: 'string', example: '123456' }
          }
        },

        AuthResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...'
            },
            user: { $ref: '#/components/schemas/User' },
            roles: {
              type: 'array',
              items: { type: 'integer' },
              example: [1, 2]
            }
          }
        },

        // ======================== OTP ==========================

        OtpSendResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                session_id: {
                  type: 'string',
                  format: 'uuid',
                  example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
                },
                message: {
                  type: 'string',
                  example: 'تم إرسال رمز التحقق على رقم الموبايل. أدخله خلال دقيقتين.'
                }
              }
            }
          }
        },

        VerifyOtpRequest: {
          type: 'object',
          required: ['session_id', 'otp'],
          properties: {
            session_id: {
              type: 'string',
              format: 'uuid',
              example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
            },
            otp: {
              type: 'string',
              minLength: 6,
              maxLength: 6,
              pattern: '^[0-9]{6}$',
              example: '482931'
            }
          }
        },

        VerifyRegisterOtpResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...'
                },
                user: { $ref: '#/components/schemas/User' },
                message: {
                  type: 'string',
                  example: 'تم تفعيل الحساب بنجاح'
                }
              }
            }
          }
        },

        VerifyLoginOtpResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...'
                },
                user: { $ref: '#/components/schemas/User' },
                roles: {
                  type: 'array',
                  items: { type: 'integer' },
                  example: [1, 2]
                }
              }
            }
          }
        },
        // ===================== Calculation ==========================
        // CalculationCreate: {
        //   type: 'object',
        //   required: ['name', 'formula', 'result_field'],
        //   properties: {
        //     name: {
        //       type: 'string',
        //       example: 'حساب الرسوم',
        //       minLength: 2,
        //       maxLength: 100
        //     },
        //     formula: { type: 'string', example: 'amount * 0.05 + fixed_fee' },
        //     result_field: { type: 'string', example: 'total_amount' }
        //   }
        // },

        // CalculationUpdate: {
        //   type: 'object',
        //   minProperties: 1,
        //   properties: {
        //     name: { type: 'string', example: 'حساب الرسوم (محدث)' },
        //     formula: { type: 'string', example: 'amount * 0.06 + fixed_fee' },
        //     result_field: { type: 'string', example: 'total_amount' },
        //     version: { type: 'integer', example: 2 }
        //   }
        // },

        // Calculation: {
        //   type: 'object',
        //   properties: {
        //     id: { type: 'integer', example: 1 },
        //     name: { type: 'string', example: 'حساب الرسوم' },
        //     formula: { type: 'string', example: 'amount * 0.05 + fixed_fee' },
        //     result_field: {
        //       type: 'string',
        //       example: 'total_amount',
        //       nullable: true
        //     },
        //     version: { type: 'integer', example: 1 },
        //     created_at: { type: 'string', format: 'date-time' },
        //     updated_at: { type: 'string', format: 'date-time' }
        //   }
        // },

        // CalculationEnvelope: {
        //   type: 'object',
        //   properties: {
        //     message: {
        //       type: 'string',
        //       example: 'تم انشاء العملية الحسابية بنجاح !'
        //     },
        //     data: { $ref: '#/components/schemas/Calculation' }
        //   }
        // },

        // CalculationListEnvelope: {
        //   type: 'object',
        //   properties: {
        //     message: {
        //       type: 'string',
        //       example: 'عرض كل العمليات الحسابية بنجاح !'
        //     },
        //     data: {
        //       type: 'array',
        //       items: { $ref: '#/components/schemas/Calculation' }
        //     }
        //   }
        // },

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
            type: {
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
            type: { type: 'string', example: 'pdf' },
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
        // ======================== type Process ==========================
        TypeProcess: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'تحويل طالب' },
            is_active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        TypeProcessCreate: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'تحويل طالب' }
          }
        },

        TypeProcessUpdate: {
          type: 'object',
          minProperties: 1,
          properties: {
            is_active: { type: 'boolean', example: true }
          }
        },

        TypeProcessEnvelope: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'تم إنشاء نوع العملية بنجاح !'
            },
            data: { $ref: '#/components/schemas/TypeProcess' }
          }
        },

        TypeProcessListEnvelope: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'عرض كل أنواع العمليات بنجاح !'
            },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/TypeProcess' }
            }
          }
        },

        // ======================== Organization ==========================
        Organization: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'مديرية التربية - دمشق' },
            parent_id: { type: 'integer', nullable: true, example: null },
            location_id: { type: 'integer', nullable: true, example: 1 },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        OrganizationCreate: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              example: 'مديرية التربية - دمشق',
              minLength: 2,
              maxLength: 150
            },
            parent_id: {
              type: 'integer',
              nullable: true,
              example: null
            },
            location_id: {
              type: 'integer',
              nullable: true,
              example: 1
            }
          }
        },

        OrganizationUpdate: {
          type: 'object',
          minProperties: 1,
          properties: {
            name: {
              type: 'string',
              example: 'مديرية التربية - دمشق (محدث)',
              minLength: 2,
              maxLength: 150
            },
            parent_id: {
              type: 'integer',
              nullable: true,
              example: 2
            },
            location_id: {
              type: 'integer',
              nullable: true,
              example: 3
            }
          }
        },

        OrganizationEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'تم إنشاء المؤسسة بنجاح'
            },
            data: { $ref: '#/components/schemas/Organization' }
          }
        },

        OrganizationListEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'تم جلب البيانات بنجاح'
            },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Organization' }
            }
          }
        },

        OrganizationDeleteEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'تم حذف المؤسسة بنجاح'
            },
            data: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 }
              }
            }
          }
        },

        // ======================== Department ==========================
        Department: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'قسم الشؤون الإدارية' },
            organization_id: { type: 'integer', example: 1 },
            parent_id: { type: 'integer', nullable: true, example: null },
            is_active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        DepartmentCreate: {
          type: 'object',
          required: ['name', 'organization_id'],
          properties: {
            name: {
              type: 'string',
              example: 'قسم الشؤون الإدارية',
              minLength: 2,
              maxLength: 150
            },
            organization_id: {
              type: 'integer',
              example: 1
            },
            parent_id: {
              type: 'integer',
              nullable: true,
              example: null
            }
          }
        },

        DepartmentUpdate: {
          type: 'object',
          minProperties: 1,
          properties: {
            name: {
              type: 'string',
              example: 'قسم الشؤون الإدارية (محدث)',
              minLength: 2,
              maxLength: 150
            },
            organization_id: {
              type: 'integer',
              example: 2
            },
            parent_id: {
              type: 'integer',
              nullable: true,
              example: 3
            }
          }
        },

        DepartmentEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'تم إنشاء القسم بنجاح'
            },
            data: { $ref: '#/components/schemas/Department' }
          }
        },

        DepartmentListEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'تم جلب البيانات بنجاح'
            },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Department' }
            }
          }
        },

        DepartmentDeleteEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'تم حذف القسم بنجاح'
            },
            data: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 }
              }
            }
          }
        },

        DepartmentLeaf: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 3 },
            name: {
              type: 'string',
              example: 'قسم المحاسبة\\شعبة التدقيق'
            }
          }
        },

        DepartmentLeavesEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'تم جلب البيانات بنجاح'
            },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/DepartmentLeaf' }
            }
          }
        },

        // ======================== Role ==========================
        RoleTemplate: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'مدير دائرة' },
            code: { type: 'string', example: 'DEPARTMENT_DIRECTOR' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        OrgDeptRole: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            role_id: { type: 'integer', example: 1 },
            organization_id: { type: 'integer', example: 1 },
            department_id: { type: 'integer', example: 2 },
            parent_id: { type: 'integer', nullable: true, example: null },
            is_active: { type: 'boolean', example: true },
            camunda_group_key: {
              type: 'string',
              example: 'DEPARTMENT_DIRECTOR__ORG1__DEPT2'
            },
            role: { $ref: '#/components/schemas/RoleTemplate' },
            organization: { $ref: '#/components/schemas/Organization' },
            department: { $ref: '#/components/schemas/Department' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        RoleCreate: {
          type: 'object',
          required: ['name', 'code', 'organization_id', 'department_id'],
          properties: {
            name: {
              type: 'string',
              example: 'مدير دائرة',
              minLength: 2,
              maxLength: 100
            },
            code: {
              type: 'string',
              example: 'DEPARTMENT_DIRECTOR',
              minLength: 2,
              maxLength: 100,
              pattern: '^[A-Z0-9_]+$'
            },
            organization_id: {
              type: 'integer',
              example: 1
            },
            department_id: {
              type: 'integer',
              example: 2
            },
            parent_id: {
              type: 'integer',
              nullable: true,
              example: null,
              description: 'معرّف الدور الأب من organization_department_roles'
            }
          }
        },

        RoleUpdate: {
          type: 'object',
          minProperties: 1,
          properties: {
            organization_id: {
              type: 'integer',
              example: 2
            },
            department_id: {
              type: 'integer',
              example: 3
            },
            parent_id: {
              type: 'integer',
              nullable: true,
              example: 5
            }
          }
        },

        RoleEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'تم إنشاء الدور بنجاح'
            },
            data: { $ref: '#/components/schemas/OrgDeptRole' }
          }
        },

        RoleListEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'تم جلب البيانات بنجاح'
            },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/OrgDeptRole' }
            }
          }
        },

        RoleDeleteEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'تم حذف الدور بنجاح'
            },
            data: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 }
              }
            }
          }
        },

        RoleByDepartmentItem: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 2 },
            name: { type: 'string', example: 'مدير المحاسبة' },
            code: { type: 'string', example: 'ACCOUNTING_MANAGER' }
          }
        },

        RolesByDepartmentEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'تم جلب البيانات بنجاح'
            },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/RoleByDepartmentItem' }
            }
          }
        },

        // ======================== Location ==========================
        TypeLocation: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'محافظة' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        Location: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'ريف دمشق' },
            typeLocation_id: { type: 'integer', example: 1 },
            parent_id: { type: 'integer', nullable: true, example: null },
            type_location: { $ref: '#/components/schemas/TypeLocation' },
            parent: {
              allOf: [{ $ref: '#/components/schemas/Location' }],
              nullable: true
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        LocationListEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'تم جلب البيانات بنجاح'
            },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Location' }
            }
          }
        }
      }
    }
  },
  apis: ['./src/modules/**/routes/*.js']
}

const swaggerSpec = swaggerJsDoc(swaggerOptions)

function setupSwagger (app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
}

module.exports = { swaggerUi, swaggerSpec, setupSwagger }
