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
      { name: 'TextField', description: 'إدارة حقول النص (Text Field Widgets)' },
      { name: 'TextDropdown', description: 'إدارة القوائم المنسدلة (Text Dropdown Widgets)' },
      { name: 'RadioGroup', description: 'إدارة مجموعات الاختيار (Radio Group Widgets)' },
      { name: 'CheckList', description: 'إدارة قوائم الاختيار المتعدد (Check List Widgets)' },
      { name: 'DatePicker', description: 'إدارة منتقيات التاريخ (Date Picker Widgets)' },
      { name: 'FilePicker', description: 'إدارة منتقيات الملفات (File Picker Widgets)' },
      { name: 'Tasks', description: 'إدارة المهام (Workflow Tasks)' },
      { name: 'Workflow', description: 'إدارة سير العمل مع Camunda (Workflow Tasks)' },
      { name: 'Transaction', description: 'المعاملات — مسودات، تقديم، وسلسلة التواقيع (Transactions)' },
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
            'first_name',
            'last_name',
            'father_name',
            'mother_name',
            'national_id',
            'userName',
            'email',
            'phone_number',
            'password',
            'pin',
            'confirm_pin',
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
            password: {
              type: 'string',
              minLength: 6,
              example: 'Test123',
              description: 'كلمة مرور الموظف — مطلوبة لتسجيل الدخول (الخطوة 1)'
            },
            pin: {
              type: 'string',
              minLength: 6,
              maxLength: 6,
              pattern: '^\\d{6}$',
              example: '123456',
              description: 'رمز PIN (6 أرقام) — يُستخدم لتشفير المفتاح الخاص وفتح قفل التطبيق'
            },
            confirm_pin: {
              type: 'string',
              minLength: 6,
              maxLength: 6,
              pattern: '^\\d{6}$',
              example: '123456',
              description: 'تأكيد رمز PIN — يجب أن يطابق pin'
            },
            private_key: {
              type: 'string',
              description: 'مفتاح Ed25519 الخاص (PEM) — اختياري؛ إن لم يُرسل يُولَّد تلقائياً'
            },
            public_key: {
              type: 'string',
              description: 'مفتاح Ed25519 العام — PEM (يُولَّد في المتصفح ويُرسل للسيرفر)'
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
            }
          },
          example: {
            first_name: 'أحمد',
            last_name: 'الحسن',
            father_name: 'محمد',
            mother_name: 'فاطمة',
            national_id: '01234567890',
            userName: 'john_doe',
            email: 'john@gmail.com',
            phone_number: '0912345678',
            password: 'Test123',
            pin: '123456',
            confirm_pin: '123456',
            organization_id: 1,
            department_id: 5,
            role_id: 2,
            public_key: 'MCowBQYDK2VwAyEA6dCIpX6BrmT8IzG85cIziBnFc2tY/8aBbvmJuTKc9/g='
          }
        },

        RegisterEmployeeData: {
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
              example: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456'
            },
            public_key: { type: 'string' },
            organization_department_roles_id: { type: 'integer', example: 3 }
          }
        },

        RegisterEmployeeResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            status_code: { type: 'integer', example: 200 },
            message: { type: 'string', example: 'تم تسجيل الموظف بنجاح' },
            data: { $ref: '#/components/schemas/RegisterEmployeeData' }
          }
        },

        EmployeeVerifyPasswordRequest: {
          type: 'object',
          required: ['userName', 'password'],
          properties: {
            userName: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
              example: 'john_doe',
              description: 'اسم مستخدم الموظف'
            },
            password: {
              type: 'string',
              minLength: 6,
              example: 'Test123',
              description: 'كلمة مرور الموظف (الخطوة 1 من تسجيل الدخول)'
            }
          },
          example: {
            userName: 'john_doe',
            password: 'Test123'
          }
        },

        EmployeeVerifyPasswordResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            status_code: { type: 'integer', example: 200 },
            message: {
              type: 'string',
              example: 'تم التحقق من كلمة مرور الموظف بنجاح'
            },
            data: {
              type: 'object',
              properties: {
                pin_session_id: {
                  type: 'string',
                  format: 'uuid',
                  example: '550e8400-e29b-41d4-a716-446655440000'
                },
                key_fingerprint: {
                  type: 'string',
                  example: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456'
                },
                expires_at: {
                  type: 'string',
                  format: 'date-time',
                  example: '2026-06-05T12:05:00.000Z'
                },
                expires_in_seconds: { type: 'integer', example: 300 },
                message: {
                  type: 'string',
                  example: 'تم التحقق من كلمة المرور. استخدم challenge + private key لإكمال تسجيل الدخول.'
                }
              }
            }
          }
        },

        EmployeeChallengeRequest: {
          type: 'object',
          required: ['pin_session_id'],
          properties: {
            pin_session_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000'
            }
          }
        },

        EmployeeChallengeResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                challenge_id: { type: 'string', format: 'uuid' },
                pin_session_id: { type: 'string', format: 'uuid' },
                key_fingerprint: { type: 'string' },
                message: {
                  type: 'string',
                  description: 'النص الذي يُوقَّع بالمفتاح الخاص من الفلاشة'
                },
                expires_at: { type: 'string', format: 'date-time' },
                expires_in_seconds: { type: 'integer', example: 300 }
              }
            }
          }
        },

        EmployeeVerifySignatureRequest: {
          type: 'object',
          required: ['challenge_id', 'signature'],
          properties: {
            challenge_id: {
              type: 'string',
              format: 'uuid',
              example: '660e8400-e29b-41d4-a716-446655440001'
            },
            signature: {
              type: 'string',
              minLength: 20,
              example: 'base64-signature-from-private-key',
              description: 'توقيع base64 لنص challenge باستخدام private key من USB'
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

        ResendOtpRequest: {
          type: 'object',
          required: ['session_id'],
          properties: {
            session_id: {
              type: 'string',
              format: 'uuid',
              example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
              description: 'معرّف الجلسة المُرجَع من /register/citizen أو /login'
            }
          },
          example: {
            session_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
          }
        },

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

        TextFieldWidget: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            id_widget: { type: 'string', example: 'text_field1' },
            label: { type: 'string', example: 'الاسم الكامل' },
            is_required: { type: 'boolean', example: true },
            input_type: {
              type: 'string',
              enum: ['text', 'string', 'int', 'phoneNumber', 'email']
            },
            regex: { type: 'string', nullable: true },
            max_length: { type: 'integer', nullable: true },
            min_length: { type: 'integer', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        TextDropdownOption: {
          type: 'object',
          required: ['key', 'value'],
          properties: {
            key: { type: 'string', example: 'DAM' },
            value: { type: 'string', example: 'دمشق' }
          }
        },

        TextDropdownWidget: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            id_widget: { type: 'string', example: 'dropdown1' },
            label: { type: 'string', example: 'محافظة الولادة' },
            is_required: { type: 'boolean', example: true },
            options: {
              type: 'array',
              items: { $ref: '#/components/schemas/TextDropdownOption' }
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        RadioGroupOption: {
          type: 'object',
          required: ['key', 'value'],
          properties: {
            key: { type: 'string', example: 'single' },
            value: { type: 'string', example: 'عازب/ة' }
          }
        },

        RadioGroupWidget: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            id_widget: { type: 'string', example: 'radio_group1' },
            label: { type: 'string', example: 'الحالة الاجتماعية' },
            is_required: { type: 'boolean', example: true },
            options: {
              type: 'array',
              items: { $ref: '#/components/schemas/RadioGroupOption' }
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        CheckListOption: {
          type: 'object',
          required: ['key', 'value'],
          properties: {
            key: { type: 'string', example: 'cycle_1' },
            value: { type: 'string', example: 'أساسي' }
          }
        },

        CheckListWidget: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            id_widget: { type: 'string', example: 'check_list1' },
            label: { type: 'string', example: 'حلقات التعليم للتدريس' },
            is_required: { type: 'boolean', example: false },
            min_selected: { type: 'integer', example: 1 },
            max_selected: { type: 'integer', example: 2 },
            options: {
              type: 'array',
              items: { $ref: '#/components/schemas/CheckListOption' }
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        DatePickerWidget: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            id_widget: { type: 'string', example: 'date_picker1' },
            label: { type: 'string', example: 'تاريخ الولادة' },
            is_required: { type: 'boolean', example: true },
            min_date: { type: 'string', format: 'date', example: '1940-01-01' },
            max_date: { type: 'string', format: 'date', example: '2026-06-04' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        FilePickerWidget: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            id_widget: { type: 'string', example: 'file_picker1' },
            label: { type: 'string', example: 'وثائق الهوية الشخصية' },
            is_required: { type: 'boolean', example: true },
            max_size_mb: { type: 'integer', example: 5 },
            allowed_extensions: {
              type: 'array',
              items: { type: 'string' },
              example: ['pdf', 'png', 'jpg']
            },
            allow_multiple: { type: 'boolean', example: true },
            type_doc_id: {
              type: 'integer',
              example: 1,
              description: 'معرّف نوع الوثيقة من type_docs'
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        FilePickerCreateInput: {
          type: 'object',
          required: ['label', 'max_size_mb', 'allowed_extensions', 'typeDoc_id'],
          properties: {
            label: { type: 'string', example: 'وثائق الهوية الشخصية' },
            is_required: { type: 'boolean', example: true },
            max_size_mb: { type: 'integer', example: 5 },
            allowed_extensions: {
              type: 'array',
              minItems: 1,
              items: { type: 'string' },
              example: ['pdf', 'png', 'jpg']
            },
            allow_multiple: { type: 'boolean', example: true },
            typeDoc_id: {
              type: 'integer',
              minimum: 1,
              example: 1,
              description: 'alias مقبول — يُخزَّن كـ type_doc_id في الاستجابة'
            }
          }
        },

        // ======================== type Process ==========================
        TypeProcess: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'تحويل طالب' },
            code: {
              type: 'string',
              example: 'STU_TR',
              description: 'رمز نوع المعاملة — يُستخدم في id_process'
            },
            is_active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        TypeProcessCreate: {
          type: 'object',
          required: ['name', 'code'],
          properties: {
            name: { type: 'string', example: 'تحويل طالب' },
            code: {
              type: 'string',
              example: 'STU_TR',
              description: '2-20 حرف (A-Z, 0-9, _) — يُحوَّل تلقائياً لأحرف كبيرة'
            }
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
          required: ['key', 'path', 'type_doc_id'],
          properties: {
            key: {
              type: 'string',
              example: 'national_id_files',
              description: 'مطابق لـ file_picker.data.id من stage_config'
            },
            path: {
              type: 'string',
              example: '/uploads/1779550000000-id.pdf'
            },
            type_doc_id: {
              type: 'integer',
              example: 1,
              description: 'نفس type_doc_id المعرّف في file_picker داخل stage_config'
            },
            type_Doc_id: {
              type: 'integer',
              deprecated: true,
              description: 'alias لـ type_doc_id'
            },
            original_name: { type: 'string', example: 'id.pdf' },
            mime_type: { type: 'string', example: 'application/pdf' }
          },
          example: {
            key: 'national_id_files',
            path: '/uploads/a.pdf',
            type_doc_id: 1
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
          required: ['success', 'status_code', 'message', 'data'],
          properties: {
            success: { type: 'boolean', example: true },
            status_code: { type: 'integer', example: 200 },
            message: { type: 'string', example: 'تمت العملية بنجاح' },
            data: { type: 'object', nullable: true }
          },
          example: {
            success: true,
            status_code: 200,
            message: 'تمت العملية بنجاح',
            data: {}
          }
        },

        ApiErrorResponse: {
          type: 'object',
          required: ['success', 'status_code', 'message', 'error', 'data'],
          description:
            'شكل خطأ موحّد لجميع endpoints. ' +
            'status_code يعكس HTTP الفعلي (400, 401, 403, 404, 409, 422, 429, 500, …) — ليس 400 دائماً. ' +
            'message: رسالة واضحة بالعربية. error: رمز الخطأ. data: دائماً null',
          properties: {
            success: { type: 'boolean', example: false },
            status_code: {
              type: 'integer',
              example: 400,
              description: 'HTTP status الفعلي — مثال: 400 تحقق، 404 غير موجود، 409 تعارض'
            },
            message: {
              type: 'string',
              example: 'decision مطلوب (approve / reject) عند إكمال مهمة تتطلب توقيعاً'
            },
            error: { type: 'string', example: 'VALIDATION_ERROR' },
            data: { type: 'object', nullable: true, example: null }
          },
          example: {
            success: false,
            status_code: 400,
            message: 'decision مطلوب (approve / reject) عند إكمال مهمة تتطلب توقيعاً',
            error: 'VALIDATION_ERROR',
            data: null
          }
        },

        WorkflowValidationErrorExample: {
          summary: 'خطأ تحقق من البيانات',
          value: {
            success: false,
            status_code: 400,
            message: 'rejection_reason مطلوب عند decision = reject',
            error: 'VALIDATION_ERROR',
            data: null
          }
        },

        WorkflowTaskLockErrorExample: {
          summary: 'المهمة غير مقفلة لديك',
          value: {
            success: false,
            status_code: 409,
            message: 'يجب فتح تفاصيل المهمة أولاً (GET /tasks/{taskId}) للحصول على قفل المهمة.',
            error: 'TASK_LOCK_REQUIRED',
            data: null
          }
        },

        WorkflowTaskNotFoundErrorExample: {
          summary: 'المهمة غير موجودة',
          value: {
            success: false,
            status_code: 404,
            message: 'المهمة غير موجودة أو لم تعد نشطة في Camunda',
            error: 'TASK_NOT_FOUND',
            data: null
          }
        },

        StageSubmissionSignature: {
          type: 'object',
          required: ['challenge_id', 'signature'],
          description:
            'توقيع USB — challenge_id من POST /tasks/{taskId}/signing-challenge أو submit-documents/signing-challenge',
          properties: {
            challenge_id: {
              type: 'string',
              format: 'uuid',
              example: '3ad67615-8c89-4a5e-a758-217e9d85b6e6',
              description: 'من signing-challenge بعد التحقق من PIN (alias: signing_id)'
            },
            signing_id: {
              type: 'string',
              format: 'uuid',
              description: 'alias لـ challenge_id من signing-challenge'
            },
            signature: {
              type: 'string',
              minLength: 16,
              example:
                'Bj7trXvyM9jfruXKttly27VY1xsVuqtKgcjfLf7fZrohjBGX0MwIFtYRMQ3nP5WHtbx0EFadm9rXy/RQqVw2Dg==',
              description: 'base64 Ed25519 — وقّع حقل message من signing-challenge'
            }
          },
          example: {
            challenge_id: '3ad67615-8c89-4a5e-a758-217e9d85b6e6',
            signature:
              'Bj7trXvyM9jfruXKttly27VY1xsVuqtKgcjfLf7fZrohjBGX0MwIFtYRMQ3nP5WHtbx0EFadm9rXy/RQqVw2Dg=='
          }
        },

        SubmitTransactionResponse: {
          allOf: [
            { $ref: '#/components/schemas/ApiSuccessResponse' },
            {
              type: 'object',
              properties: {
                message: { type: 'string', example: 'تم تقديم المعاملة بنجاح' },
                data: {
                  allOf: [
                    { $ref: '#/components/schemas/TransactionOutput' },
                    {
                      type: 'object',
                      properties: {
                        idempotency_key: {
                          type: 'string',
                          format: 'uuid',
                          description: 'يُولَّد من السيرفر — لا يُرسل في الطلب'
                        },
                        idempotent_replay: {
                          type: 'boolean',
                          example: false,
                          description: 'true عند إعادة نفس نتيجة submit (double-click / retry)'
                        }
                      }
                    }
                  ]
                }
              }
            }
          ],
          example: {
            success: true,
            status_code: 200,
            message: 'تم تقديم المعاملة بنجاح',
            data: {
              id: 441,
              status: 'submitted',
              idempotency_key: '0dbc8ad0-2618-4be2-8080-07e13c862d9b',
              idempotent_replay: false
            }
          }
        },

        StageSubmissionPayload: {
          type: 'object',
          deprecated: true,
          description: '⚠️ deprecated — استخدم UnifiedFormPayload / SubmitTransactionPayload / CompleteTaskPayload',
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
            note: {
              type: 'string',
              example: '',
              description: 'ملاحظة اختيارية على المرحلة'
            },
            notes: {
              type: 'string',
              deprecated: true,
              description: 'alias قديم لـ note'
            },
            signature: {
              $ref: '#/components/schemas/StageSubmissionSignature'
            }
          },
          example: {
            form_id: 'leave_process_auth',
            form_name: 'الوثائق المطلوبة للمواطن',
            widgets: [
              {
                widget_type: 'text_field',
                data: { id: 'student_first_name', label: 'اسم الطالب', is_required: true },
                value: 'روان'
              }
            ],
            templates: [],
            note: ''
          }
        },

        TransactionOutput: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 12 },
            code: { type: 'string', example: 'process-5-v1' },
            user_id: { type: 'integer', example: 3 },
            status: {
              type: 'string',
              enum: ['draft', 'submitted', 'in_progress', 'completed', 'rejected', 'cancelled'],
              example: 'draft'
            },
            data: { $ref: '#/components/schemas/TransactionDraftFormData' },
            first_name: { type: 'string', nullable: true, example: 'أحمد' },
            last_name: { type: 'string', nullable: true, example: 'محمد' },
            father_name: { type: 'string', nullable: true, example: 'علي' },
            mother_name: { type: 'string', nullable: true, example: 'فاطمة' },
            national_id: { type: 'string', nullable: true, example: '12345678901' },
            version: { type: 'integer', example: 1 },
            is_active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        UserTransactionListItem: {
          type: 'object',
          properties: {
            transaction_id: { type: 'integer', example: 42 },
            id_process: { type: 'string', nullable: true, example: 'TX-2026-00042' },
            process_definition_name: { type: 'string', nullable: true, example: 'طلب شهادة ميلاد' },
            stage_name: { type: 'string', nullable: true, example: 'مراجعة الدائرة' },
            progress_percent: { type: 'integer', minimum: 0, maximum: 100, example: 40 },
            priority: { type: 'integer', example: 1 },
            status: {
              type: 'string',
              enum: ['draft', 'submitted', 'in_progress', 'completed', 'rejected', 'cancelled'],
              example: 'in_progress'
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        UserTransactionCountsResponse: {
          allOf: [
            { $ref: '#/components/schemas/ApiSuccessResponse' },
            {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  example: 'تم جلب أعداد معاملاتك بنجاح'
                },
                data: {
                  type: 'object',
                  properties: {
                    completed: {
                      type: 'integer',
                      example: 8,
                      description: 'عدد المعاملات المكتملة'
                    },
                    in_progress: {
                      type: 'integer',
                      example: 3,
                      description: 'submitted + in_progress (قيد المعالجة + قيد التنفيذ)'
                    },
                    total: {
                      type: 'integer',
                      example: 11,
                      description: 'completed + in_progress'
                    }
                  }
                }
              }
            }
          ],
          example: {
            success: true,
            status_code: 200,
            message: 'تم جلب أعداد معاملاتك بنجاح',
            data: {
              completed: 8,
              in_progress: 3,
              total: 11
            }
          }
        },

        UserTransactionsListResponse: {
          allOf: [
            { $ref: '#/components/schemas/ApiSuccessResponse' },
            {
              type: 'object',
              properties: {
                message: { type: 'string', example: 'تم جلب معاملاتك بنجاح' },
                data: {
                  type: 'object',
                  properties: {
                    items: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/UserTransactionListItem' }
                    },
                    pagination: { type: 'object' }
                  }
                }
              }
            }
          ],
          example: {
            success: true,
            status_code: 200,
            message: 'تم جلب معاملاتك بنجاح',
            data: {
              items: [
                {
                  transaction_id: 42,
                  id_process: 'TX-2026-00042',
                  process_definition_name: 'طلب شهادة ميلاد',
                  stage_name: 'مراجعة الدائرة',
                  progress_percent: 40,
                  priority: 1,
                  status: 'in_progress',
                  created_at: '2026-05-01T10:00:00.000Z',
                  updated_at: '2026-05-20T14:30:00.000Z'
                }
              ],
              pagination: {
                page: 1,
                limit: 10,
                total: 1,
                total_pages: 1,
                has_next: false,
                has_prev: false
              }
            }
          }
        },

        TransactionDraftWidgetWithValue: {
          type: 'object',
          required: ['widget_type', 'data', 'value'],
          properties: {
            widget_type: {
              type: 'string',
              enum: ['text_field', 'date_picker', 'dropdown', 'radio_group', 'check_list', 'file_picker'],
              example: 'text_field'
            },
            data: {
              type: 'object',
              description: 'إعدادات الودجت كما في stage_config',
              properties: {
                id: { type: 'string', example: 'citizen_phone' },
                label: { type: 'string', example: 'رقم الموبايل' },
                is_required: { type: 'boolean', example: true }
              },
              additionalProperties: true
            },
            value: {
              description: 'قيمة المسودة — مطلوب وجود المفتاح لكل ودجت (نص، تاريخ، مفتاح خيار، مصفوفة مفاتيح، مسارات ملفات)',
              oneOf: [
                { type: 'string', nullable: true, example: '0912345678' },
                {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['id_copy', 'proof_address']
                },
                { type: 'null' }
              ]
            }
          },
          examples: {
            text_field: {
              summary: 'text_field',
              value: {
                widget_type: 'text_field',
                data: {
                  id: 'citizen_phone',
                  label: 'رقم الموبايل',
                  is_required: true,
                  input_type: 'phone',
                  regex: '^09[0-9]{8}$',
                  max_length: 10,
                  min_length: 10
                },
                value: '0912345678'
              }
            },
            date_picker: {
              summary: 'date_picker',
              value: {
                widget_type: 'date_picker',
                data: {
                  id: 'birth_date',
                  label: 'تاريخ الميلاد',
                  is_required: true,
                  min_date: '1950-01-01',
                  max_date: '2010-12-31'
                },
                value: '2000-05-15'
              }
            },
            dropdown: {
              summary: 'dropdown',
              value: {
                widget_type: 'dropdown',
                data: {
                  id: 'governorate',
                  label: 'المحافظة',
                  is_required: true,
                  options: [
                    { key: 'damascus', value: 'دمشق' },
                    { key: 'aleppo', value: 'حلب' },
                    { key: 'homs', value: 'حمص' }
                  ]
                },
                value: 'damascus'
              }
            },
            check_list: {
              summary: 'check_list',
              value: {
                widget_type: 'check_list',
                data: {
                  id: 'required_documents',
                  label: 'الوثائق المطلوبة',
                  is_required: true,
                  min_selected: 1,
                  max_selected: 3,
                  options: [
                    { key: 'id_copy', value: 'صورة الهوية' },
                    { key: 'proof_address', value: 'إثبات سكن' },
                    { key: 'photo', value: 'صورة شخصية' }
                  ]
                },
                value: ['id_copy', 'proof_address']
              }
            },
            file_picker: {
              summary: 'file_picker',
              value: {
                widget_type: 'file_picker',
                data: {
                  id: 'national_id_files',
                  label: 'وثائق الهوية الشخصية',
                  is_required: true,
                  max_size_mb: 5,
                  allowed_extensions: ['pdf', 'png', 'jpg'],
                  allow_multiple: true,
                  type_doc_id: 3
                },
                value: [
                  {
                    path: '/uploads/1781283413699-332269555.pdf',
                    url: 'http://localhost:4000/uploads/1781283413699-332269555.pdf',
                    document_id: 3,
                    type_doc_id: 3,
                    original_name: 'national_id_files'
                  }
                ]
              }
            },
            radio_group_gateway: {
              summary: 'radio_group (Camunda gateway)',
              value: {
                widget_type: 'radio_group',
                data: {
                  id: 'gateway',
                  label: 'قرار المسار',
                  is_required: true,
                  is_gateway: true,
                  options: [
                    { key: 'approved', value: 'موافق' },
                    { key: 'rejected', value: 'مرفوض' }
                  ]
                },
                value: 'approved'
              }
            }
          }
        },

        UnifiedFormTemplateWithValue: {
          type: 'object',
          required: ['id', 'value'],
          additionalProperties: false,
          properties: {
            id: {
              type: 'integer',
              example: 1,
              description: 'document_templates.id — من stage_config.config_json.template[]'
            },
            value: {
              type: 'object',
              additionalProperties: true,
              example: {
                employee: 'روان سرحان',
                job: 'معلمة',
                department: 'دائرة التربية'
              },
              description: 'قيم حقول PDF — تُخزَّن في document_instance.data_json'
            }
          }
        },

        UnifiedFormPayload: {
          type: 'object',
          required: ['form_id', 'form_name', 'widgets'],
          additionalProperties: false,
          description:
            'القالب الموحّد لـ submit / complete / submit-documents — stage_config.config_json + value لكل widget/template. ' +
            'مرفوض: fields[], files[], variables, employee, template_id, values, stage_name',
          properties: {
            form_id: {
              type: 'string',
              example: 'leave_process_auth',
              description: 'يجب أن يطابق stage_config.config_json.form_id'
            },
            form_name: {
              type: 'string',
              example: 'الوثائق المطلوبة للمواطن',
              description: 'يجب أن يطابق stage_config.config_json.form_name'
            },
            widgets: {
              type: 'array',
              minItems: 0,
              items: { $ref: '#/components/schemas/TransactionDraftWidgetWithValue' },
              description:
                'نفس config_json.widgets من stage_config/create + value — [] إذا المرحلة templates فقط'
            },
            templates: {
              type: 'array',
              items: { $ref: '#/components/schemas/UnifiedFormTemplateWithValue' },
              default: []
            },
            note: {
              type: 'string',
              example: '',
              description: 'ملاحظة اختيارية'
            },
            expected_version: {
              type: 'integer',
              example: 1,
              description: 'transaction.version — optimistic concurrency (اختياري)'
            }
          }
        },

        SubmitTransactionPayload: {
          allOf: [{ $ref: '#/components/schemas/UnifiedFormPayload' }],
          description:
            'POST /transaction/submit/{transactionId} — بدون signature وبدون decision (يُثبت submit على السيرفر). ' +
            'احصل على القالب الفارغ من GET /stage_config/config/{processId}. ' +
            'أنشئ/حدّث المسودة أولاً عبر POST /transaction/updateDraft/{processId}',
          example: {
            form_id: 'leave_process_auth',
            form_name: 'الوثائق المطلوبة للمواطن',
            widgets: [
              {
                widget_type: 'text_field',
                data: {
                  id: 'student_first_name',
                  label: 'اسم الطالب',
                  is_required: true,
                  input_type: 'text',
                  max_length: 100,
                  min_length: 2
                },
                value: 'روان'
              },
              {
                widget_type: 'text_field',
                data: {
                  id: 'student_last_name',
                  label: 'الاسم الأخير',
                  is_required: true,
                  input_type: 'text',
                  max_length: 100,
                  min_length: 2
                },
                value: 'سرحان'
              },
              {
                widget_type: 'text_field',
                data: {
                  id: 'father_name',
                  label: 'اسم الأب',
                  is_required: true,
                  input_type: 'text',
                  max_length: 100,
                  min_length: 2
                },
                value: 'أحمد'
              },
              {
                widget_type: 'dropdown',
                data: {
                  id: 'birth_governorate',
                  label: 'محافظة الولادة',
                  is_required: true,
                  options: [
                    { key: 'DAM', value: 'دمشق' },
                    { key: 'HAM', value: 'حماة' },
                    { key: 'ALE', value: 'حلب' }
                  ]
                },
                value: 'DAM'
              },
              {
                widget_type: 'file_picker',
                data: {
                  id: 'national_id_files',
                  label: 'وثائق الهوية الشخصية',
                  is_required: true,
                  max_size_mb: 5,
                  allowed_extensions: ['pdf', 'png', 'jpg'],
                  allow_multiple: true,
                  type_doc_id: 3
                },
                value: [
                  {
                    path: '/uploads/1781283413699-332269555.pdf',
                    url: 'http://localhost:4000/uploads/1781283413699-332269555.pdf',
                    type_doc_id: 3,
                    original_name: 'national_id_files'
                  }
                ]
              }
            ],
            templates: [],
            note: ''
          }
        },

        TransactionDraftFormData: {
          type: 'object',
          required: ['form_id', 'form_name', 'widgets'],
          properties: {
            form_id: { type: 'string', example: 'civil_transaction_55' },
            form_name: { type: 'string', example: 'استمارة معاملة المواطن' },
            widgets: {
              type: 'array',
              items: { $ref: '#/components/schemas/TransactionDraftWidgetWithValue' }
            }
          }
        },

        TransactionDraftUpsertInput: {
          type: 'object',
          required: ['data'],
          properties: {
            data: { $ref: '#/components/schemas/TransactionDraftFormData' }
          },
          example: {
            data: {
              form_id: 'civil_transaction_55',
              form_name: 'استمارة معاملة المواطن',
              widgets: [
                {
                  widget_type: 'text_field',
                  data: {
                    id: 'citizen_phone',
                    label: 'رقم الموبايل',
                    is_required: true,
                    input_type: 'phone',
                    regex: '^09[0-9]{8}$',
                    max_length: 10,
                    min_length: 10
                  },
                  value: '0912345678'
                },
                {
                  widget_type: 'date_picker',
                  data: {
                    id: 'birth_date',
                    label: 'تاريخ الميلاد',
                    is_required: true,
                    min_date: '1950-01-01',
                    max_date: '2010-12-31'
                  },
                  value: '2000-05-15'
                },
                {
                  widget_type: 'dropdown',
                  data: {
                    id: 'governorate',
                    label: 'المحافظة',
                    is_required: true,
                    options: [
                      { key: 'damascus', value: 'دمشق' },
                      { key: 'aleppo', value: 'حلب' },
                      { key: 'homs', value: 'حمص' }
                    ]
                  },
                  value: 'damascus'
                },
                {
                  widget_type: 'check_list',
                  data: {
                    id: 'required_documents',
                    label: 'الوثائق المطلوبة',
                    is_required: true,
                    min_selected: 1,
                    max_selected: 3,
                    options: [
                      { key: 'id_copy', value: 'صورة الهوية' },
                      { key: 'proof_address', value: 'إثبات سكن' },
                      { key: 'photo', value: 'صورة شخصية' }
                    ]
                  },
                  value: ['id_copy', 'proof_address']
                },
                {
                  widget_type: 'file_picker',
                  data: {
                    id: 'national_id_files',
                    label: 'وثائق الهوية الشخصية',
                    is_required: true,
                    max_size_mb: 5,
                    allowed_extensions: ['pdf', 'png', 'jpg'],
                    allow_multiple: true,
                    type_doc_id: 1
                  },
                  value: ['/uploads/id-front.pdf', '/uploads/id-back.png']
                }
              ]
            }
          }
        },

        TransactionIdentityInput: {
          type: 'object',
          minProperties: 1,
          properties: {
            first_name: { type: 'string', nullable: true, example: 'أحمد' },
            last_name: { type: 'string', nullable: true, example: 'محمد' },
            father_name: { type: 'string', nullable: true, example: 'علي' },
            mother_name: { type: 'string', nullable: true, example: 'فاطمة' },
            national_id: { type: 'string', nullable: true, example: '12345678901' }
          },
          additionalProperties: false,
          example: {
            first_name: 'أحمد',
            last_name: 'محمد',
            father_name: 'علي',
            mother_name: 'فاطمة',
            national_id: '12345678901'
          }
        },

        TransactionDraftUpsertResult: {
          type: 'object',
          properties: {
            isNew: { type: 'boolean', example: true },
            draft: { $ref: '#/components/schemas/TransactionOutput' }
          }
        },

        TransactionDraftCreateResult: {
          type: 'object',
          properties: {
            isNew: { type: 'boolean', example: true },
            draft: { $ref: '#/components/schemas/TransactionOutput' }
          }
        },

        TransactionDraftUpdateResult: {
          type: 'object',
          properties: {
            isNew: { type: 'boolean', example: false },
            draft: { $ref: '#/components/schemas/TransactionOutput' }
          }
        },

        IntegrityChainLink: {
          type: 'object',
          properties: {
            signature_order: { type: 'integer', example: 1 },
            stage_id: { type: 'integer', example: 10 },
            stage_code: { type: 'string', example: 'AUTH_STAGE' },
            stage_data_hash: { type: 'string' },
            cumulative_hash: { type: 'string' },
            link_hash: { type: 'string' },
            previous_link_hash: { type: 'string', nullable: true },
            digital_signature_id: { type: 'integer', example: 4 },
            signed_at: { type: 'string', format: 'date-time' }
          }
        },

        IntegrityChainQrPayload: {
          type: 'object',
          properties: {
            v: { type: 'integer', example: 1 },
            tx: { type: 'integer', example: 12 },
            genesis: { type: 'string' },
            head: { type: 'string', nullable: true },
            links: { type: 'integer', example: 2 },
            verify: { type: 'string', example: 'http://localhost:4000/api/transaction/12/integrity-chain/verify' }
          }
        },

        IntegrityChainVerifyResult: {
          type: 'object',
          properties: {
            transaction_id: { type: 'integer', example: 12 },
            transaction_status: { type: 'string', example: 'in_progress' },
            genesis_hash: { type: 'string', nullable: true },
            schema_version: { type: 'string', example: '1.0' },
            chain_status: {
              type: 'string',
              enum: ['incomplete', 'valid', 'forged'],
              example: 'valid'
            },
            total_links: { type: 'integer', example: 2 },
            head_hash: { type: 'string', nullable: true },
            valid: { type: 'boolean', example: true },
            issues: {
              type: 'array',
              items: { type: 'string' }
            },
            verified_at: { type: 'string', format: 'date-time' }
          }
        },

        IntegrityChainResponse: {
          type: 'object',
          properties: {
            transaction_id: { type: 'integer', example: 12 },
            transaction_status: { type: 'string', example: 'completed' },
            genesis_hash: { type: 'string' },
            schema_version: { type: 'string', example: '1.0' },
            chain_status: {
              type: 'string',
              enum: ['incomplete', 'valid', 'forged']
            },
            total_links: { type: 'integer', example: 2 },
            head_hash: { type: 'string', nullable: true },
            qr_payload: { $ref: '#/components/schemas/IntegrityChainQrPayload' },
            links: {
              type: 'array',
              items: { $ref: '#/components/schemas/IntegrityChainLink' }
            },
            last_verification: { $ref: '#/components/schemas/IntegrityChainVerifyResult' }
          }
        },

        CompleteTaskPayload: {
          allOf: [
            { $ref: '#/components/schemas/UnifiedFormPayload' },
            {
              type: 'object',
              required: ['decision'],
              properties: {
                decision: {
                  type: 'string',
                  enum: ['approve', 'reject', 'rejected'],
                  example: 'approve',
                  description: 'قرار التوقيع USB — approve / reject'
                },
                rejection_reason: {
                  type: 'string',
                  example: 'المستندات غير مكتملة',
                  description: 'مطلوب عند decision = reject'
                },
                signature: {
                  $ref: '#/components/schemas/StageSubmissionSignature'
                }
              },
              description:
                'POST /workflow/tasks/{taskId}/complete — config_json + value. ' +
                'مسار Camunda gateway من radio_group (is_gateway) داخل widgets — لا variables. ' +
                'idempotency_key يُولَّد من السيرفر ولا يُرسل في الطلب.'
            }
          ],
          example: {
            form_id: 'leave_process_review',
            form_name: 'التشيك على المعلومات المدخلة',
            widgets: [
              {
                widget_type: 'radio_group',
                data: {
                  id: 'decision',
                  label: 'قرار الطلب',
                  is_required: true,
                  is_gateway: true,
                  options: [
                    { key: 'الطلب مرفوض', value: 'الطلب مرفوض' },
                    { key: 'الطلب مقبول', value: 'الطلب مقبول' }
                  ]
                },
                value: 'الطلب مقبول'
              }
            ],
            templates: [],
            decision: 'approve',
            note: '',
            signature: {
              challenge_id: '3ad67615-8c89-4a5e-a758-217e9d85b6e6',
              signature:
                'Bj7trXvyM9jfruXKttly27VY1xsVuqtKgcjfLf7fZrohjBGX0MwIFtYRMQ3nP5WHtbx0EFadm9rXy/RQqVw2Dg=='
            }
          }
        },

        DocumentSubmitSigningChallengePayload: {
          type: 'object',
          required: ['pin'],
          additionalProperties: false,
          properties: {
            pin: {
              type: 'string',
              minLength: 6,
              maxLength: 6,
              pattern: '^[0-9]{6}$',
              example: '123456',
              description: 'رمز PIN للموظف — decision ثابت approve على السيرفر'
            }
          },
          example: { pin: '123456' }
        },

        DocumentSubmitCompletePayload: {
          allOf: [
            { $ref: '#/components/schemas/UnifiedFormPayload' },
            {
              type: 'object',
              required: ['decision', 'signature'],
              properties: {
                decision: {
                  type: 'string',
                  enum: ['approve'],
                  example: 'approve'
                },
                signature: {
                  $ref: '#/components/schemas/StageSubmissionSignature'
                }
              },
              description:
                'POST /workflow/tasks/{taskId}/submit-documents/complete — config_json + value + signature'
            }
          ],
          example: {
            form_id: 'leave_process_sign_secondary',
            form_name: 'توقيع مدير دائرة الثانوي',
            widgets: [],
            templates: [],
            decision: 'approve',
            note: '',
            signature: {
              challenge_id: '3ad67615-8c89-4a5e-a758-217e9d85b6e6',
              signature:
                'Bj7trXvyM9jfruXKttly27VY1xsVuqtKgcjfLf7fZrohjBGX0MwIFtYRMQ3nP5WHtbx0EFadm9rXy/RQqVw2Dg=='
            }
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
          properties: {
            id: { type: 'integer', example: 1 },
            id_template: { type: 'integer', example: 1 },
            id_document_instance: { type: 'integer', example: 5 },
            value: {
              type: 'object',
              example: { employee: 'روان سرحان', job: 'معلمة' }
            },
            generated_pdf_path: {
              type: 'string',
              nullable: true,
              example: '/uploads/generated-3-tpl1-inst5-123.pdf'
            },
            path: {
              type: 'string',
              nullable: true,
              example: '/uploads/templates/form.pdf',
              description: 'مسار ملف القالب الأصلي'
            }
          }
        },

        CompleteTaskData: {
          type: 'object',
          description: 'بيانات استجابة إكمال المهمة — mirrors الطلب (widgets + templates)',
          properties: {
            stage_name: { type: 'string', example: 'التشيك على المعلومات المدخلة' },
            form_id: { type: 'string', example: 'leave_process_review' },
            form_name: { type: 'string', example: 'التشيك على المعلومات المدخلة' },
            widgets: {
              type: 'array',
              items: { $ref: '#/components/schemas/TransactionDraftWidgetWithValue' }
            },
            templates: {
              type: 'array',
              items: { $ref: '#/components/schemas/CompleteTaskTemplateResponseItem' }
            },
            variables: {
              type: 'object',
              properties: {
                value: {
                  type: 'string',
                  example: 'approved',
                  description: 'قيمة radio_group gateway — تُرسل لـ Camunda كـ ${value}'
                }
              }
            },
            gateway_value: {
              type: 'string',
              example: 'approved',
              description: 'alias لـ variables.value'
            },
            decision: {
              type: 'string',
              example: 'approve',
              description: 'قرار التوقيع USB'
            },
            note: { type: 'string', example: '' },
            signature: { $ref: '#/components/schemas/StageSubmissionSignature' },
            idempotency_key: { type: 'string', format: 'uuid' },
            idempotent_replay: { type: 'boolean', example: false },
            workflow_status: {
              type: 'string',
              enum: ['running', 'completed', 'rejected'],
              example: 'running'
            },
            rejection_reason: { type: 'string', nullable: true }
          },
          example: {
            stage_name: 'التشيك على المعلومات المدخلة',
            form_id: 'leave_process_review',
            form_name: 'التشيك على المعلومات المدخلة',
            widgets: [
              {
                widget_type: 'radio_group',
                data: { id: 'gateway', label: 'قرار المسار', is_gateway: true },
                value: 'approved'
              }
            ],
            templates: [
              {
                id: 1,
                id_template: 1,
                id_document_instance: 5,
                value: { employee: 'روان سرحان' },
                generated_pdf_path: '/uploads/generated-3-tpl1-inst5-123.pdf'
              }
            ],
            variables: { value: 'approved' },
            gateway_value: 'approved',
            decision: 'approve',
            note: '',
            idempotency_key: '0dbc8ad0-2618-4be2-8080-07e13c862d9b',
            idempotent_replay: false,
            workflow_status: 'running'
          }
        },

        WorkflowTasksListResponse: {
          allOf: [
            { $ref: '#/components/schemas/ApiSuccessResponse' },
            {
              type: 'object',
              properties: {
                message: { type: 'string', example: 'تم جلب المهام بنجاح' },
                data: {
                  type: 'object',
                  properties: {
                    items: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/EmployeeTaskListItem' }
                    },
                    pagination: { type: 'object' }
                  }
                }
              }
            }
          ],
          example: {
            success: true,
            status_code: 200,
            message: 'تم جلب المهام بنجاح',
            data: {
              items: [
                {
                  transaction_id: 1,
                  transaction_number: 'STUTR-2026-001',
                  type: 'طلبات الإجازة للموظف',
                  type_code: 'STU_TR',
                  applicant_name: 'أحمد علي محمد',
                  department: 'دائرة مكتب المدير',
                  date: '12/06/2026',
                  progress_percent: 14,
                  status: 'pending_pickup',
                  status_label: 'بانتظار الاستلام',
                  task_id: '978bbc76-6650-11f1-ade6-2e8996ed1457',
                  task_name: 'التشيك على المعلومات المدخلة',
                  process_name: 'Leave Process',
                  process_priority: 1
                }
              ],
              pagination: {
                page: 1,
                limit: 10,
                total: 1,
                total_pages: 1,
                has_next: false,
                has_prev: false
              }
            }
          }
        },

        EmployeeTaskListItem: {
          type: 'object',
          description:
            'عنصر مهمة موظف — يُستخدم في GET /workflow/tasks و in-progress و pending-pickup و completed/by-department و rejected/by-department',
          properties: {
            transaction_id: { type: 'integer', example: 1 },
            transaction_number: {
              type: 'string',
              nullable: true,
              example: 'STUTR-2026-001'
            },
            type: {
              type: 'string',
              nullable: true,
              example: 'طلبات الإجازة للموظف',
              description: 'اسم نوع المعاملة'
            },
            type_code: {
              type: 'string',
              nullable: true,
              example: 'STU_TR'
            },
            applicant_name: {
              type: 'string',
              nullable: true,
              example: 'أحمد علي محمد'
            },
            department: {
              type: 'string',
              nullable: true,
              example: 'دائرة مكتب المدير'
            },
            date: {
              type: 'string',
              example: '12/06/2026',
              description: 'تاريخ إنشاء الطلب (يوم/شهر/سنة)'
            },
            progress_percent: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              example: 14
            },
            status: {
              type: 'string',
              enum: ['pending_pickup', 'in_progress', 'completed', 'rejected'],
              example: 'pending_pickup'
            },
            status_label: {
              type: 'string',
              example: 'بانتظار الاستلام'
            },
            task_id: {
              type: 'string',
              nullable: true,
              example: '978bbc76-6650-11f1-ade6-2e8996ed1457',
              description: 'معرّف مهمة Camunda — null للمعاملات المنجزة/المرفوضة'
            },
            task_name: {
              type: 'string',
              nullable: true,
              example: 'التشيك على المعلومات المدخلة',
              description: 'اسم المرحلة الحالية'
            },
            process_name: {
              type: 'string',
              nullable: true,
              example: 'Leave Process',
              description: 'اسم تعريف العملية (process_definitions.name)'
            },
            process_priority: {
              type: 'integer',
              enum: [1, 2, 3],
              example: 1,
              description: '1=عالي، 2=متوسط، 3=منخفض'
            }
          }
        },

        WorkflowTaskStatsResponse: {
          allOf: [
            { $ref: '#/components/schemas/ApiSuccessResponse' },
            {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  example: 'تم جلب عدد المعاملات المنجزة لآخر شهر بنجاح'
                },
                data: {
                  type: 'object',
                  properties: {
                    count: { type: 'integer', example: 12 },
                    department_ids: {
                      type: 'array',
                      items: { type: 'integer' },
                      example: [1, 2]
                    },
                    period: {
                      type: 'object',
                      properties: {
                        from_date: { type: 'string', format: 'date', example: '2026-04-25' },
                        to_date: { type: 'string', format: 'date', example: '2026-05-25' },
                        label: { type: 'string', example: 'last_month' }
                      }
                    }
                  }
                }
              }
            }
          ],
          example: {
            success: true,
            status_code: 200,
            message: 'تم جلب عدد المعاملات المنجزة لآخر شهر بنجاح',
            data: {
              count: 12,
              department_ids: [1, 2],
              period: {
                from_date: '2026-04-25',
                to_date: '2026-05-25',
                label: 'last_month'
              }
            }
          }
        },

        WorkflowActiveStatsResponse: {
          allOf: [
            { $ref: '#/components/schemas/ApiSuccessResponse' },
            {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  example: 'تم جلب عدد المعاملات النشطة بنجاح'
                },
                data: {
                  type: 'object',
                  properties: {
                    count: { type: 'integer', example: 8 },
                    in_progress_count: { type: 'integer', example: 3 },
                    pending_pickup_count: { type: 'integer', example: 5 },
                    department_ids: {
                      type: 'array',
                      items: { type: 'integer' },
                      example: [1, 2]
                    }
                  }
                }
              }
            }
          ],
          example: {
            success: true,
            status_code: 200,
            message: 'تم جلب عدد المعاملات النشطة بنجاح',
            data: {
              count: 8,
              in_progress_count: 3,
              pending_pickup_count: 5,
              department_ids: [1, 2]
            }
          }
        },

        TaskDetailsResponse: {
          allOf: [
            { $ref: '#/components/schemas/ApiSuccessResponse' },
            {
              type: 'object',
              properties: {
                message: { type: 'string', example: 'تم جلب تفاصيل المهمة بنجاح' },
                data: {
                  type: 'object',
                  properties: {
                    process_definition_name: { type: 'string', example: 'Leave Process' },
                    id_task: {
                      type: 'string',
                      example: '978bbc76-6650-11f1-ade6-2e8996ed1457',
                      description:
                        'معرّف مهمة Camunda — يُستخدم في POST /tasks/{taskId}/complete و signing-challenge'
                    },
                    name_task: { type: 'string', example: 'التشيك على المعلومات المدخلة' },
                    applicant: {
                      type: 'object',
                      properties: {
                        first_name: { type: 'string', example: 'أحمد' },
                        father_name: { type: 'string', example: 'علي' },
                        last_name: { type: 'string', example: 'محمد' },
                        national_id: { type: 'string', example: '12345678901' },
                        phone_number: { type: 'string', example: '0954263536' }
                      }
                    },
                    submitted_at: {
                      type: 'string',
                      example: '12/06/2026',
                      description: 'تاريخ تقديم/إنشاء المعاملة (يوم/شهر/سنة)'
                    },
                    transaction_history: {
                      type: 'object',
                      properties: {
                        id_process: { type: 'string', nullable: true, example: 'STUTR-2026-001' },
                        priority: {
                          type: 'integer',
                          enum: [1, 2, 3],
                          example: 1,
                          description: '1=عالي، 2=متوسط، 3=منخفض'
                        },
                        data: {
                          type: 'object',
                          description:
                            'transaction_history — applicant + stages[] (كل stage: form_id, widgets+value, templates, note, completed_by/at)',
                          properties: {
                            applicant: {
                              type: 'object',
                              properties: {
                                first_name_employee: { type: 'string' },
                                father_name_employee: { type: 'string' },
                                last_name_employee: { type: 'string' },
                                national_id_employee: { type: 'string' },
                                phone_number_employee: { type: 'string' }
                              }
                            },
                            stages: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  form_id: { type: 'string' },
                                  form_name: { type: 'string' },
                                  widgets: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/TransactionDraftWidgetWithValue' }
                                  },
                                  templates: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/CompleteTaskTemplateResponseItem' }
                                  },
                                  note: { type: 'string' },
                                  completed_by: { type: 'integer' },
                                  completed_at: { type: 'string', format: 'date-time' }
                                }
                              }
                            }
                          }
                        }
                      }
                    },
                    currentStage: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer', example: 2 },
                        name: { type: 'string', example: 'التشيك على المعلومات المدخلة' },
                        config: { type: 'object', description: 'stage_config.config_json للمرحلة الحالية' }
                      }
                    }
                  }
                }
              }
            }
          ],
          example: {
            success: true,
            status_code: 200,
            message: 'تم جلب تفاصيل المهمة بنجاح',
            data: {
              process_definition_name: 'Leave Process',
              id_task: '978bbc76-6650-11f1-ade6-2e8996ed1457',
              name_task: 'التشيك على المعلومات المدخلة',
              applicant: {
                first_name: 'أحمد',
                father_name: 'علي',
                last_name: 'محمد',
                national_id: '12345678901',
                phone_number: '0954263536'
              },
              submitted_at: '12/06/2026',
              transaction_history: {
                id_process: 'STUTR-2026-001',
                priority: 1,
                data: {
                  applicant: {
                    first_name_employee: 'روان',
                    father_name_employee: 'أحمد',
                    last_name_employee: 'سرحان',
                    national_id_employee: '',
                    phone_number_employee: '0954263536'
                  },
                  stages: [
                    {
                      form_id: 'leave_process_auth',
                      form_name: 'الوثائق المطلوبة للمواطن',
                      widgets: [
                        {
                          widget_type: 'text_field',
                          data: { id: 'student_first_name', label: 'اسم الطالب' },
                          value: 'روان'
                        }
                      ],
                      templates: [],
                      note: '',
                      completed_by: 5,
                      completed_at: '2026-06-12T10:00:00.000Z'
                    }
                  ]
                }
              },
              currentStage: {
                id: 2,
                name: 'التشيك على المعلومات المدخلة',
                config: {
                  form_id: 'leave_process_review',
                  form_name: 'التشيك على المعلومات المدخلة',
                  widgets: []
                }
              }
            }
          }
        },

        SigningChallengeData: {
          type: 'object',
          properties: {
            signing_id: { type: 'string', format: 'uuid' },
            challenge_id: { type: 'string', format: 'uuid' },
            task_id: { type: 'string' },
            transaction_id: { type: 'integer' },
            stage_code: { type: 'string' },
            key_fingerprint: { type: 'string' },
            message: {
              type: 'string',
              description: 'النص الذي يُوقَّع بـ USB private key'
            },
            payload_hash: { type: 'string' },
            expires_at: { type: 'string', format: 'date-time' },
            expires_in_seconds: { type: 'integer', example: 300 }
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
              stage_name: 'التشيك على المعلومات المدخلة',
              form_id: 'leave_process_review',
              form_name: 'التشيك على المعلومات المدخلة',
              widgets: [
                {
                  widget_type: 'radio_group',
                  data: { id: 'decision', label: 'قرار الطلب', is_gateway: true },
                  value: 'الطلب مقبول'
                }
              ],
              templates: [],
              variables: { value: 'الطلب مقبول' },
              gateway_value: 'الطلب مقبول',
              decision: 'approve',
              note: '',
              idempotency_key: '0dbc8ad0-2618-4be2-8080-07e13c862d9b',
              idempotent_replay: false,
              workflow_status: 'running'
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
              enum: ['approve', 'reject', 'rejected'],
              example: 'approve',
              description: 'قرار الموظف للتوقيع — يُقارَن عند complete (approve / reject)'
            }
          },
          example: {
            pin: '123456',
            decision: 'reject'
          }
        },

        CompleteTaskRejectExample: {
          summary: 'رفض معاملة مع توقيع USB',
          value: {
            form_id: 'leave_process_review',
            form_name: 'مراجعة المدير',
            widgets: [
              {
                widget_type: 'radio_group',
                data: {
                  id: 'gateway',
                  label: 'قرار المسار',
                  is_required: true,
                  is_gateway: true,
                  options: [
                    { key: 'approved', value: 'موافق' },
                    { key: 'rejected', value: 'مرفوض' }
                  ]
                },
                value: 'rejected'
              }
            ],
            templates: [],
            decision: 'reject',
            rejection_reason: 'المستندات غير مكتملة',
            note: '',
            signature: {
              challenge_id: '3ad67615-8c89-4a5e-a758-217e9d85b6e6',
              signature:
                'Bj7trXvyM9jfruXKttly27VY1xsVuqtKgcjfLf7fZrohjBGX0MwIFtYRMQ3nP5WHtbx0EFadm9rXy/RQqVw2Dg=='
            }
          }
        },

        SigningChallengeResponse: {
          allOf: [
            { $ref: '#/components/schemas/ApiSuccessResponse' },
            {
              type: 'object',
              properties: {
                message: { type: 'string', example: 'تم إنشاء تحدي التوقيع بنجاح' },
                data: { $ref: '#/components/schemas/SigningChallengeData' }
              }
            }
          ],
          example: {
            success: true,
            status_code: 200,
            message: 'تم إنشاء تحدي التوقيع بنجاح',
            data: {
              signing_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
              challenge_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
              task_id: 'a1b2c3d4',
              transaction_id: 441,
              stage_code: 'MANAGER_REVIEW',
              key_fingerprint: 'SHA256:abc...',
              message: 'TX-SIGN|...',
              expires_at: '2026-05-25T12:05:00.000Z',
              expires_in_seconds: 300
            }
          }
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
              pattern: '^\\d{1,2}-\\d{1,2}$',
              example: '03-15',
              description: 'بداية نافذة التفعيل السنوية (شهر-يوم MM-DD). تتكرر كل سنة — لا حاجة لإرسال السنة.'
            },
            end_date: {
              type: 'string',
              pattern: '^\\d{1,2}-\\d{1,2}$',
              nullable: true,
              example: '06-30',
              description: 'نهاية النافذة السنوية (شهر-يوم). اختياري. يمكن أن تكون بعد start_date في نفس السنة (03-15→06-30) أو عابرة للسنة (11-01→02-15).'
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
        },

        DocumentTemplateWidgetTextField: {
          type: 'object',
          description: 'ودجت حقل نص — text_field',
          required: ['widget_type', 'data'],
          properties: {
            widget_type: { type: 'string', enum: ['text_field'], example: 'text_field' },
            data: {
              type: 'object',
              required: ['id', 'label', 'input_type'],
              properties: {
                id: { type: 'string', example: 'citizen_phone' },
                label: { type: 'string', example: 'رقم الموبايل' },
                is_required: { type: 'boolean', example: true },
                input_type: {
                  type: 'string',
                  enum: ['text', 'string', 'int', 'phone', 'phoneNumber', 'email'],
                  example: 'phone'
                },
                regex: { type: 'string', example: '^09[0-9]{8}$' },
                max_length: { type: 'integer', example: 10 },
                min_length: { type: 'integer', example: 10 }
              }
            }
          },
          example: {
            widget_type: 'text_field',
            data: {
              id: 'citizen_phone',
              label: 'رقم الموبايل',
              is_required: true,
              input_type: 'phone',
              regex: '^09[0-9]{8}$',
              max_length: 10,
              min_length: 10
            }
          }
        },

        DocumentTemplateWidgetDatePicker: {
          type: 'object',
          description: 'ودجت تاريخ — date_picker',
          required: ['widget_type', 'data'],
          properties: {
            widget_type: { type: 'string', enum: ['date_picker'], example: 'date_picker' },
            data: {
              type: 'object',
              required: ['id', 'label', 'min_date', 'max_date'],
              properties: {
                id: { type: 'string', example: 'birth_date' },
                label: { type: 'string', example: 'تاريخ الولادة' },
                is_required: { type: 'boolean', example: true },
                min_date: { type: 'string', format: 'date', example: '1940-01-01' },
                max_date: { type: 'string', format: 'date', example: '2026-06-04' }
              }
            }
          },
          example: {
            widget_type: 'date_picker',
            data: {
              id: 'birth_date',
              label: 'تاريخ الولادة',
              is_required: true,
              min_date: '1940-01-01',
              max_date: '2026-06-04'
            }
          }
        },

        DocumentTemplateWidgetDropdown: {
          type: 'object',
          description: 'ودجت قائمة منسدلة — dropdown',
          required: ['widget_type', 'data'],
          properties: {
            widget_type: { type: 'string', enum: ['dropdown'], example: 'dropdown' },
            data: {
              type: 'object',
              required: ['id', 'label', 'options'],
              properties: {
                id: { type: 'string', example: 'birth_governorate' },
                label: { type: 'string', example: 'محافظة الولادة' },
                is_required: { type: 'boolean', example: true },
                options: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['key', 'value'],
                    properties: {
                      key: { type: 'string', example: 'DAM' },
                      value: { type: 'string', example: 'دمشق' }
                    }
                  },
                  example: [
                    { key: 'DAM', value: 'دمشق' },
                    { key: 'ALE', value: 'حلب' }
                  ]
                }
              }
            }
          },
          example: {
            widget_type: 'dropdown',
            data: {
              id: 'birth_governorate',
              label: 'محافظة الولادة',
              is_required: true,
              options: [
                { key: 'DAM', value: 'دمشق' },
                { key: 'ALE', value: 'حلب' }
              ]
            }
          }
        },

        DocumentTemplateConfigJson: {
          type: 'object',
          description: 'إعدادات استمارة القالب — يُرسل في multipart/form-data كنص JSON في الحقل config_json',
          required: ['form_id', 'form_name', 'widgets'],
          properties: {
            form_id: { type: 'string', example: 'civil_transaction_55' },
            form_name: { type: 'string', example: 'استمارة معاملة المواطن' },
            widgets: {
              type: 'array',
              description: 'text_field | date_picker | dropdown | radio_group | check_list | file_picker',
              items: {
                oneOf: [
                  { $ref: '#/components/schemas/DocumentTemplateWidgetTextField' },
                  { $ref: '#/components/schemas/DocumentTemplateWidgetDatePicker' },
                  { $ref: '#/components/schemas/DocumentTemplateWidgetDropdown' }
                ]
              }
            }
          },
          example: {
            form_id: 'civil_transaction_55',
            form_name: 'استمارة معاملة المواطن',
            widgets: [
              {
                widget_type: 'text_field',
                data: {
                  id: 'citizen_phone',
                  label: 'رقم الموبايل',
                  is_required: true,
                  input_type: 'phone',
                  regex: '^09[0-9]{8}$',
                  max_length: 10,
                  min_length: 10
                }
              },
              {
                widget_type: 'date_picker',
                data: {
                  id: 'birth_date',
                  label: 'تاريخ الولادة',
                  is_required: true,
                  min_date: '1940-01-01',
                  max_date: '2026-06-04'
                }
              },
              {
                widget_type: 'dropdown',
                data: {
                  id: 'birth_governorate',
                  label: 'محافظة الولادة',
                  is_required: true,
                  options: [
                    { key: 'DAM', value: 'دمشق' },
                    { key: 'ALE', value: 'حلب' }
                  ]
                }
              }
            ]
          }
        },

        DocumentTemplateCreateSuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            status_code: { type: 'integer', example: 200 },
            message: { type: 'string', example: 'تم إنشاء قالب الوثيقة بنجاح' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                name: { type: 'string', example: 'استمارة معاملة المواطن' },
                file_path: { type: 'string', example: '/uploads/1779540194357-518796726.pdf' },
                type_doc_id: { type: 'integer', example: 1 },
                type_doc: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer', example: 1 },
                    name: { type: 'string', example: 'هوية شخصية' }
                  }
                },
                config_json: { $ref: '#/components/schemas/DocumentTemplateConfigJson' },
                engine_type: { type: 'string', example: 'ACROFORM' },
                version: { type: 'integer', example: 1 },
                is_latest: { type: 'boolean', example: true },
                is_active: { type: 'boolean', example: true }
              }
            }
          }
        },

        DocumentTemplateErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            status_code: { type: 'integer', example: 400 },
            message: { type: 'string', example: 'regex غير صالح للودجت citizen_phone' },
            error: { type: 'string', example: 'VALIDATION_ERROR' },
            data: { type: 'null', example: null }
          }
        }
      },

      examples: {
        LeaveProcessAuthSubmit: {
          summary: 'POST /transaction/submit — مرحلة AUTH (leave_process_auth)',
          description: 'نفس config_json من stage_config/create + value لكل widget',
          value: {
            form_id: 'leave_process_auth',
            form_name: 'الوثائق المطلوبة للمواطن',
            widgets: [
              {
                widget_type: 'text_field',
                data: {
                  id: 'student_first_name',
                  label: 'اسم الطالب',
                  is_required: true,
                  input_type: 'text',
                  max_length: 100,
                  min_length: 2
                },
                value: 'روان'
              },
              {
                widget_type: 'text_field',
                data: {
                  id: 'student_last_name',
                  label: 'الاسم الأخير',
                  is_required: true,
                  input_type: 'text',
                  max_length: 100,
                  min_length: 2
                },
                value: 'سرحان'
              },
              {
                widget_type: 'text_field',
                data: {
                  id: 'father_name',
                  label: 'اسم الأب',
                  is_required: true,
                  input_type: 'text',
                  max_length: 100,
                  min_length: 2
                },
                value: 'أحمد'
              },
              {
                widget_type: 'dropdown',
                data: {
                  id: 'birth_governorate',
                  label: 'محافظة الولادة',
                  is_required: true,
                  options: [
                    { key: 'DAM', value: 'دمشق' },
                    { key: 'HAM', value: 'حماة' },
                    { key: 'ALE', value: 'حلب' }
                  ]
                },
                value: 'DAM'
              },
              {
                widget_type: 'file_picker',
                data: {
                  id: 'national_id_files',
                  label: 'وثائق الهوية الشخصية',
                  is_required: true,
                  max_size_mb: 5,
                  allowed_extensions: ['pdf', 'png', 'jpg'],
                  allow_multiple: true,
                  type_doc_id: 3
                },
                value: [
                  {
                    path: '/uploads/1781283413699-332269555.pdf',
                    url: 'http://localhost:4000/uploads/1781283413699-332269555.pdf',
                    type_doc_id: 3,
                    original_name: 'national_id_files'
                  }
                ]
              }
            ],
            templates: [],
            note: ''
          }
        },

        LeaveProcessReviewComplete: {
          summary: 'POST /tasks/{taskId}/complete — مراجعة (leave_process_review)',
          value: {
            form_id: 'leave_process_review',
            form_name: 'التشيك على المعلومات المدخلة',
            widgets: [
              {
                widget_type: 'radio_group',
                data: {
                  id: 'decision',
                  label: 'قرار الطلب',
                  is_required: true,
                  is_gateway: true,
                  options: [
                    { key: 'الطلب مرفوض', value: 'الطلب مرفوض' },
                    { key: 'الطلب مقبول', value: 'الطلب مقبول' }
                  ]
                },
                value: 'الطلب مقبول'
              }
            ],
            templates: [],
            decision: 'approve',
            note: '',
            signature: {
              challenge_id: '3ad67615-8c89-4a5e-a758-217e9d85b6e6',
              signature:
                'Bj7trXvyM9jfruXKttly27VY1xsVuqtKgcjfLf7fZrohjBGX0MwIFtYRMQ3nP5WHtbx0EFadm9rXy/RQqVw2Dg=='
            }
          }
        },

        LeaveProcessSignEduManagerComplete: {
          summary: 'POST /tasks/{taskId}/complete — توقيع مدير التربية + PDF',
          value: {
            form_id: 'leave_process_sign_edu_manager',
            form_name: 'توقيع مدير التربية',
            widgets: [],
            templates: [
              {
                id: 1,
                value: {
                  'manager-name': 'اسم مدير التربية',
                  employee: 'روان سرحان',
                  job: 'معلمة',
                  department: 'دائرة التربية'
                }
              }
            ],
            decision: 'approve',
            note: '',
            signature: {
              challenge_id: '3ad67615-8c89-4a5e-a758-217e9d85b6e6',
              signature:
                'Bj7trXvyM9jfruXKttly27VY1xsVuqtKgcjfLf7fZrohjBGX0MwIFtYRMQ3nP5WHtbx0EFadm9rXy/RQqVw2Dg=='
            }
          }
        },

        LeaveProcessSignSecondaryComplete: {
          summary: 'POST /tasks/{taskId}/submit-documents/complete — توقيع الثانوي',
          value: {
            form_id: 'leave_process_sign_secondary',
            form_name: 'توقيع مدير دائرة الثانوي',
            widgets: [],
            templates: [],
            decision: 'approve',
            note: '',
            signature: {
              challenge_id: '3ad67615-8c89-4a5e-a758-217e9d85b6e6',
              signature:
                'Bj7trXvyM9jfruXKttly27VY1xsVuqtKgcjfLf7fZrohjBGX0MwIFtYRMQ3nP5WHtbx0EFadm9rXy/RQqVw2Dg=='
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
