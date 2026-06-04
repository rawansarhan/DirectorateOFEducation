const swaggerJsDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const path = require('path')
const { API_PUBLIC_URL } = require('./core/config/env')

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
        url: API_PUBLIC_URL,
        description: 'API server'
      }
    ],
    tags: [
      { name: 'Auth', description: 'المصادقة وإدارة الحسابات (Authentication)' },
      { name: 'Calculation', description: 'العمليات الحسابية (calculations)' },
      { name: 'Field', description: 'إدارة الحقول (Fields)' },
      { name: 'File', description: 'إدارة الملفات (Files)' },
      { name: 'Tasks', description: 'إدارة المهام (Workflow Tasks)' },
      { name: 'Workflow', description: 'إدارة سير العمل مع Camunda (Workflow Tasks)' },
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
      },
      {
        name: 'Complaint',
        description: 'معاملات الشكوى (Complaints)'
      },
      {
        name: 'Transaction',
        description: 'المعاملات والمسودات (Transactions)'
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
            'first_name',
            'last_name',
            'father_name',
            'mother_name',
            'national_id',
            'userName',
            'email',
            'phone_number',
            'pin',
            'organization_id',
            'department_id',
            'role_id',
            'public_key'
          ],
          properties: {
            first_name: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              example: 'أحمد'
            },
            last_name: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              example: 'الحسن'
            },
            father_name: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              example: 'محمد'
            },
            mother_name: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              example: 'فاطمة'
            },
            national_id: {
              type: 'string',
              minLength: 11,
              maxLength: 11,
              pattern: '^\\d{11}$',
              example: '01234567890',
              description: '11 رقماً — فريد في النظام'
            },
            userName: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
              pattern: '^\\S+$',
              example: 'john_doe',
              description: 'بدون مسافات'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@gmail.com'
            },
            phone_number: {
              type: 'string',
              pattern: '^09\\d{8}$',
              example: '0912345678',
              description: '10 أرقام تبدأ بـ 09'
            },
            pin: {
              type: 'string',
              minLength: 6,
              maxLength: 6,
              pattern: '^\\d{6}$',
              example: '123456',
              description: 'رمز PIN مكون من 6 أرقام'
            },
            organization_id: {
              type: 'integer',
              minimum: 1,
              example: 1,
              description: 'معرف المؤسسة'
            },
            department_id: {
              type: 'integer',
              minimum: 1,
              example: 5,
              description: 'معرف آخر قسم في الهرمية (مثل: شعبة التدقيق داخل قسم المحاسبة)'
            },
            role_id: {
              type: 'integer',
              minimum: 1,
              example: 2,
              description: 'معرف الدور (Role)'
            },
            public_key: {
              type: 'string',
              minLength: 40,
              example: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA...\n-----END PUBLIC KEY-----',
              description: 'مفتاح Ed25519 العام يُولَّد في المتصفح (PEM أو base64 SPKI)'
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
                first_name: { type: 'string', example: 'أحمد' },
                last_name: { type: 'string', example: 'الحسن' },
                father_name: { type: 'string', example: 'محمد' },
                mother_name: { type: 'string', example: 'فاطمة' },
                national_id: { type: 'string', example: '01234567890' },
                key_fingerprint: {
                  type: 'string',
                  example: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
                  description: 'SHA-256 fingerprint للمفتاح العام'
                },
                organization_department_roles_id: {
                  type: 'integer',
                  example: 3
                },
                message: {
                  type: 'string',
                  example: 'تم إنشاء حساب الموظف بنجاح. private_key يبقى في المتصفح/USB ولا يُخزَّن على السيرفر.'
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
        },

        // ======================== Stage Submission (SDUI) ==========================
        StageSubmissionFieldItem: {
          type: 'object',
          required: ['key', 'value'],
          properties: {
            key: {
              type: 'string',
              example: 'citizen_full_name',
              description: 'مطابق لـ widget.key من SDUI'
            },
            value: {
              description: 'قيمة الحقل',
              example: 'أحمد محمد علي'
            }
          }
        },

        StageSubmissionFileItem: {
          type: 'object',
          required: ['key', 'path'],
          properties: {
            key: {
              type: 'string',
              example: 'national_id_file',
              description: 'مطابق لـ widget.key من SDUI'
            },
            path: {
              type: 'string',
              example: '/uploads/1779550000000-id.pdf'
            },
            original_name: { type: 'string', example: 'id.pdf' },
            mime_type: { type: 'string', example: 'application/pdf' }
          }
        },

        StageSubmissionTemplateItem: {
          type: 'object',
          required: ['template_id', 'values'],
          properties: {
            template_id: { type: 'integer', example: 1 },
            values: {
              type: 'object',
              example: { full_name: 'أحمد محمد علي' }
            }
          }
        },

        StageSubmissionActionItem: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'SEND_EMAIL' },
            payload: { type: 'object' }
          }
        },

        ApiSuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            status_code: { type: 'integer', example: 200 },
            message: { type: 'string', example: 'Operation completed successfully' },
            data: { type: 'object', nullable: true }
          }
        },

        ApiErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            status_code: { type: 'integer', example: 400 },
            message: { type: 'string', example: 'Validation error' },
            error: { type: 'string', example: 'Validation error' },
            data: { type: 'object', nullable: true, example: null }
          },
          example: {
            success: false,
            status_code: 400,
            message: 'ملف BPMN مطلوب !',
            error: 'ملف BPMN مطلوب !',
            data: null
          }
        },

        StageSubmissionSignature: {
          type: 'object',
          required: ['challenge_id', 'signature'],
          description: 'توقيع USB لإكمال مهمة workflow — challenge_id من POST /tasks/{taskId}/signing-challenge',
          properties: {
            challenge_id: {
              type: 'string',
              format: 'uuid',
              description: 'من signing-challenge بعد التحقق من PIN'
            },
            signature: {
              type: 'string',
              description: 'base64 Ed25519 signature — وقّع حقل message من signing-challenge'
            }
          }
        },

        StageSubmissionPayload: {
          type: 'object',
          description: 'قالب request ثابت لكل المعاملات — الفرونت يرسل نفس الشكل دائماً',
          properties: {
            schema_version: {
              type: 'string',
              example: '1.0'
            },
            expected_version: {
              type: 'integer',
              example: 1,
              description: 'transaction.version — optimistic concurrency'
            },
            fields: {
              type: 'array',
              items: { $ref: '#/components/schemas/StageSubmissionFieldItem' }
            },
            files: {
              type: 'array',
              items: { $ref: '#/components/schemas/StageSubmissionFileItem' }
            },
            templates: {
              type: 'array',
              items: { $ref: '#/components/schemas/StageSubmissionTemplateItem' }
            },
            actions: {
              type: 'array',
              items: { $ref: '#/components/schemas/StageSubmissionActionItem' }
            },
            variables: {
              type: 'object',
              example: { action: 'submit' },
              description: 'مطلوب لمسارات Camunda — مثال approve/reject/submit'
            },
            notes: {
              type: 'string',
              example: 'ملاحظات اختيارية',
              maxLength: 10000
            },
            signature: {
              $ref: '#/components/schemas/StageSubmissionSignature'
            }
          },
          example: {
            schema_version: '1.0',
            expected_version: 1,
            fields: [
              { key: 'citizen_full_name', value: 'أحمد محمد علي' },
              { key: 'citizen_phone', value: '0912345678' }
            ],
            files: [
              { key: 'national_id_file', path: '/uploads/id.pdf' }
            ],
            templates: [
              { template_id: 1, values: { full_name: 'أحمد محمد علي' } }
            ],
            variables: { action: 'submit' }
          }
        },

        CompleteTaskPayload: {
          type: 'object',
          required: ['variables'],
          description: 'Payload لإكمال مهمة workflow',
          properties: {
            stage_name: {
              type: 'string',
              example: 'مرحلة الموافقة',
              description: 'اسم المرحلة الحالية — اختياري، يُتحقق منه إذا أُرسل'
            },
            fields: {
              type: 'array',
              items: { $ref: '#/components/schemas/StageSubmissionFieldItem' }
            },
            files: {
              type: 'array',
              items: { $ref: '#/components/schemas/StageSubmissionFileItem' }
            },
            templates: {
              type: 'array',
              items: { $ref: '#/components/schemas/StageSubmissionTemplateItem' }
            },
            actions: {
              type: 'array',
              items: { $ref: '#/components/schemas/CompleteTaskActionItem' }
            },
            variables: {
              type: 'object',
              required: ['decision'],
              properties: {
                decision: {
                  type: 'string',
                  example: 'over_50',
                  description: 'متغير Camunda للـ gateway — يطابق BPMN مثل ${decision == "over_50"}'
                }
              },
              additionalProperties: false
            },
            decision: {
              type: 'string',
              example: 'approve',
              description: 'قرار التوقيع USB (approve / reject) — مستقل عن variables.decision'
            },
            signature: {
              $ref: '#/components/schemas/StageSubmissionSignature'
            },
            expected_version: {
              type: 'integer',
              example: 1,
              description: 'transaction.version — optimistic concurrency (اختياري)'
            },
            idempotency_key: {
              type: 'string',
              format: 'uuid',
              example: '0dbc8ad0-2618-4be2-8080-07e13c862d9b',
              description: 'اختياري — مفتاح منع تكرار الطلب (يُسجَّل بعد نجاح التوقيع). نفس المفتاح + نفس المستخدم + نفس task = نفس النتيجة'
            },
            notes: {
              type: 'string',
              example: 'ملاحظات اختيارية',
              maxLength: 10000
            }
          },
          example: {
            stage_name: 'التشيك على العمر',
            fields: [
              { key: 'citizen_name', value: 'روان سرحان' }
            ],
            files: [
              { key: 'criminal_record', path: '/uploads/a.pdf' }
            ],
            templates: [
              { template_id: 1, values: { full_name: 'روان' } }
            ],
            variables: {
              decision: 'over_50'
            },
            decision: 'approve',
            signature: {
              challenge_id: '53fb4988-4a82-4e48-8326-fe463f1e3820',
              signature: 'Zki6/aI4DlyawrBtQ5fMipuAmE+plNa4o955RmwoOdjGBesSRK3DufMyyiG3VApD3rf5AtJSDaBrFs6MW7ZYBw=='
            },
            idempotency_key: '0dbc8ad0-2618-4be2-8080-07e13c862d9b'
          }
        },

        CompleteTaskActionItem: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'SEND_EMAIL' },
            payload: { type: 'object' },
            result: {
              type: 'object',
              example: { status: 'queued' },
              description: 'اختياري — نتيجة متوقعة أو placeholder قبل التنفيذ'
            }
          }
        },

        CompleteTaskTemplateResponseItem: {
          type: 'object',
          required: ['template_id', 'values', 'path'],
          properties: {
            template_id: { type: 'integer', example: 1 },
            values: {
              type: 'object',
              example: { full_name: 'روان' }
            },
            path: {
              type: 'string',
              nullable: true,
              example: '/uploads/templates/form.pdf',
              description: 'مسار ملف القالب من document_templates'
            }
          }
        },

        CompleteTaskData: {
          type: 'object',
          description: 'بيانات استجابة إكمال المهمة — بدون actions',
          properties: {
            stage_name: { type: 'string', example: 'مرحلة الموافقة' },
            fields: {
              type: 'array',
              items: { $ref: '#/components/schemas/StageSubmissionFieldItem' }
            },
            files: {
              type: 'array',
              items: { $ref: '#/components/schemas/StageSubmissionFileItem' }
            },
            templates: {
              type: 'array',
              items: { $ref: '#/components/schemas/CompleteTaskTemplateResponseItem' }
            },
            variables: {
              type: 'object',
              required: ['decision'],
              properties: {
                decision: { type: 'string', example: 'over_50' }
              },
              additionalProperties: false
            },
            decision: {
              type: 'string',
              nullable: true,
              example: 'approve',
              description: 'قرار التوقيع — ليس مسار Camunda'
            },
            signature: {
              $ref: '#/components/schemas/StageSubmissionSignature'
            },
            idempotency_key: {
              type: 'string',
              format: 'uuid',
              example: '0dbc8ad0-2618-4be2-8080-07e13c862d9b'
            },
            idempotent_replay: {
              type: 'boolean',
              example: false
            }
          },
          example: {
            stage_name: 'مرحلة الموافقة',
            fields: [
              { key: 'citizen_name', value: 'روان سرحان' }
            ],
            files: [
              { key: 'criminal_record', path: '/uploads/a.pdf' }
            ],
            templates: [
              {
                template_id: 1,
                values: { full_name: 'روان' },
                path: '/uploads/templates/form.pdf'
              }
            ],
            variables: {
              decision: 'over_50'
            },
            signature: {
              challenge_id: '592d2a9d-fb20-4c69-bac4-8b3001313991',
              signature: 'Zki6/aI4DlyawrBtQ5fMipuAmE+plNa4o955RmwoOdjGBesSRK3DufMyyiG3VApD3rf5AtJSDaBrFs6MW7ZYBw=='
            },
            idempotency_key: '0dbc8ad0-2618-4be2-8080-07e13c862d9b',
            idempotent_replay: false
          }
        },

        CompleteTaskResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            status_code: { type: 'integer', example: 200 },
            message: { type: 'string', example: 'تم إكمال المهمة بنجاح' },
            data: { $ref: '#/components/schemas/CompleteTaskData' }
          },
          example: {
            success: true,
            status_code: 200,
            message: 'تم إكمال المهمة بنجاح',
            data: {
              stage_name: 'مرحلة الموافقة',
              fields: [
                { key: 'citizen_name', value: 'روان سرحان' }
              ],
              files: [
                { key: 'criminal_record', path: '/uploads/a.pdf' }
              ],
              templates: [
                {
                  template_id: 1,
                  values: { full_name: 'روان' },
                  path: '/uploads/templates/form.pdf'
                }
              ],
              variables: {
                action: 'اذا كان العمر اقل من خمسين'
              },
              signature: {
                challenge_id: '592d2a9d-fb20-4c69-bac4-8b3001313991',
                signature: 'Zki6/aI4DlyawrBtQ5fMipuAmE+plNa4o955RmwoOdjGBesSRK3DufMyyiG3VApD3rf5AtJSDaBrFs6MW7ZYBw=='
              },
              idempotency_key: '0dbc8ad0-2618-4be2-8080-07e13c862d9b',
              idempotent_replay: false
            }
          }
        },

        SigningChallengePayload: {
          type: 'object',
          required: ['pin', 'decision'],
          additionalProperties: false,
          properties: {
            pin: {
              type: 'string',
              example: '123456',
              description: 'رمز PIN للموظف'
            },
            decision: {
              type: 'string',
              example: 'approve',
              description: 'قرار الموظف للتوقيع — يُقارَن عند complete (approve / reject ...)'
            }
          },
          example: {
            pin: '123456',
            decision: 'approve'
          }
        },

        SigningChallengeResponse: {
          allOf: [
            { $ref: '#/components/schemas/ApiSuccessResponse' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    challenge_id: { type: 'string', format: 'uuid' },
                    task_id: { type: 'string' },
                    key_fingerprint: { type: 'string' },
                    message: {
                      type: 'string',
                      description: 'النص الذي يُوقَّع بـ USB private key'
                    },
                    expires_at: { type: 'string', format: 'date-time' },
                    expires_in_seconds: { type: 'integer', example: 300 }
                  }
                }
              }
            }
          ]
        },

        AuthProcessItem: {
          type: 'object',
          properties: {
            process_id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Leave Request' },
            code: { type: 'string', example: 'LEAVE_001' },
            priority: { type: 'integer', example: 1 },
            auth_stage: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 10 },
                name: { type: 'string', example: 'Submit Request' },
                code: { type: 'string', example: 'SUBMIT_LEAVE' },
                type: { type: 'string', example: 'USER_TASK' },
                auth_type: { type: 'string', example: 'AUTH' }
              }
            }
          },
          example: {
            process_id: 1,
            name: 'Leave Request',
            code: 'LEAVE_001',
            priority: 1,
            auth_stage: {
              id: 10,
              name: 'Submit Request',
              code: 'SUBMIT_LEAVE',
              type: 'USER_TASK',
              auth_type: 'AUTH'
            }
          }
        },

        AuthProcessListResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            status_code: { type: 'integer', example: 200 },
            message: {
              type: 'string',
              example: 'تم جلب عمليات AUTH بنجاح'
            },
            data: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/AuthProcessItem' }
                },
                from_cache: {
                  type: 'boolean',
                  example: false
                }
              }
            }
          },
          example: {
            success: true,
            status_code: 200,
            message: 'تم جلب عمليات AUTH بنجاح',
            data: {
              items: [
                {
                  process_id: 1,
                  name: 'Leave Request',
                  code: 'LEAVE_001',
                  priority: 1,
                  auth_stage: {
                    id: 10,
                    name: 'Submit Request',
                    code: 'SUBMIT_LEAVE',
                    type: 'USER_TASK',
                    auth_type: 'AUTH'
                  }
                }
              ],
              from_cache: false
            }
          }
        },

        ProcessDefinitionCreateForm: {
          type: 'object',
          required: ['file', 'name', 'priority', 'start_date'],
          properties: {
            file: { type: 'string', format: 'binary', description: 'ملف BPMN' },
            name: { type: 'string', example: 'Leave Process' },
            is_complaint: {
              type: 'boolean',
              default: false,
              description: 'true → type_trans_id = null (معاملة شكوى)'
            },
            type_trans_id: {
              type: 'integer',
              nullable: true,
              example: 2,
              description: 'مطلوب عند is_complaint = false'
            },
            organization_id: { type: 'integer', example: 10 },
            priority: { type: 'integer', example: 1 },
            start_date: {
              type: 'string',
              format: 'date',
              example: '2026-01-01',
              description: 'تاريخ البداية — يُقبل تاريخ اليوم أو أي تاريخ سابق؛ العملية تصبح active بعد الموافقة إذا start_date ≤ اليوم'
            },
            end_date: {
              type: 'string',
              format: 'date',
              nullable: true,
              example: '2026-06-30',
              description: 'تاريخ النهاية اختياري — يجب أن يكون أكبر من start_date (يُقبل تاريخ سابق إذا كان بعد start_date)'
            }
          }
        },

        ProcessDefinitionCreateData: {
          type: 'object',
          properties: {
            process: {
              type: 'object',
              description: 'code يُولَّد تلقائياً: process-{id}-v{version}',
              properties: {
                id: { type: 'integer', example: 12 },
                name: { type: 'string', example: 'Leave Process' },
                code: { type: 'string', example: 'process-12-v1', readOnly: true },
                version: { type: 'integer', example: 1 },
                status: { type: 'string', example: 'deployed' },
                camunda_process_key: { type: 'string', example: 'Process_1' },
                is_complaint: { type: 'boolean', example: false },
                type_trans_id: { type: 'integer', nullable: true, example: 2 },
                organization_id: { type: 'integer', nullable: true, example: 10 },
                priority: { type: 'integer', example: 1 },
                start_date: { type: 'string', format: 'date-time' },
                end_date: { type: 'string', format: 'date-time', nullable: true }
              }
            },
            stages: {
              type: 'array',
              items: { type: 'object' },
              description: 'المراحل المُولَّدة من Camunda'
            }
          }
        },

        ProcessDefinitionCreateSuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            status_code: { type: 'integer', example: 200 },
            message: { type: 'string', example: 'تم إنشاء العملية بنجاح' },
            data: { $ref: '#/components/schemas/ProcessDefinitionCreateData' }
          },
          example: {
            success: true,
            status_code: 200,
            message: 'تم إنشاء العملية بنجاح',
            data: {
              process: {
                id: 12,
                name: 'Leave Process',
                code: 'process-12-v1',
                version: 1,
                status: 'deployed',
                camunda_process_key: 'Process_1',
                is_complaint: false,
                type_trans_id: 2,
                organization_id: 10,
                priority: 1
              },
              stages: []
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
