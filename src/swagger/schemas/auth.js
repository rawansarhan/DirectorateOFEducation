module.exports = {
  "User": {
    "type": "object",
    "properties": {
      "id": {
        "type": "integer",
        "example": 1
      },
      "userName": {
        "type": "string",
        "example": "john_doe"
      },
      "email": {
        "type": "string",
        "example": "john@gmail.com"
      },
      "phone_number": {
        "type": "string",
        "example": "0954263526"
      },
      "created_at": {
        "type": "string",
        "format": "date-time"
      },
      "updated_at": {
        "type": "string",
        "format": "date-time"
      },
      "has_app_pin": {
        "type": "boolean",
        "description": "true إذا كان للمستخدم pin_hash على السيرفر (أنشأ PIN مسبقاً)",
        "example": true
      }
    }
  },
  "LoginRequest": {
    "type": "object",
    "required": [
      "userName",
      "password"
    ],
    "properties": {
      "userName": {
        "type": "string",
        "example": "testUser"
      },
      "password": {
        "type": "string",
        "example": "Test123"
      }
    }
  },
  "RegisterEmployeeRequest": {
    "type": "object",
    "required": [
      "first_name",
      "last_name",
      "father_name",
      "mother_name",
      "national_id",
      "userName",
      "email",
      "phone_number",
      "password",
      "pin",
      "confirm_pin",
      "organization_id",
      "department_id",
      "role_id",
      "public_key"
    ],
    "properties": {
      "first_name": {
        "type": "string",
        "minLength": 2,
        "maxLength": 50,
        "example": "أحمد"
      },
      "last_name": {
        "type": "string",
        "minLength": 2,
        "maxLength": 50,
        "example": "الحسن"
      },
      "father_name": {
        "type": "string",
        "minLength": 2,
        "maxLength": 50,
        "example": "محمد"
      },
      "mother_name": {
        "type": "string",
        "minLength": 2,
        "maxLength": 50,
        "example": "فاطمة"
      },
      "national_id": {
        "type": "string",
        "minLength": 11,
        "maxLength": 11,
        "pattern": "^\\d{11}$",
        "example": "01234567890",
        "description": "11 رقماً — فريد في النظام"
      },
      "userName": {
        "type": "string",
        "minLength": 3,
        "maxLength": 50,
        "pattern": "^\\S+$",
        "example": "john_doe",
        "description": "بدون مسافات"
      },
      "email": {
        "type": "string",
        "format": "email",
        "example": "john@gmail.com"
      },
      "phone_number": {
        "type": "string",
        "pattern": "^09\\d{8}$",
        "example": "0912345678",
        "description": "10 أرقام تبدأ بـ 09"
      },
      "password": {
        "type": "string",
        "minLength": 8,
        "pattern": "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$",
        "example": "Test123!",
        "description": "كلمة مرور الموظف — 8 أحرف على الأقل، وتتضمن أحرفاً وأرقاماً ورموزاً"
      },
      "pin": {
        "type": "string",
        "minLength": 6,
        "maxLength": 6,
        "pattern": "^\\d{6}$",
        "example": "123456",
        "description": "رمز PIN (6 أرقام) — يُستخدم لتشفير المفتاح الخاص وفتح قفل التطبيق"
      },
      "confirm_pin": {
        "type": "string",
        "minLength": 6,
        "maxLength": 6,
        "pattern": "^\\d{6}$",
        "example": "123456",
        "description": "تأكيد رمز PIN — يجب أن يطابق pin"
      },
      "private_key": {
        "type": "string",
        "description": "مفتاح Ed25519 الخاص (PEM) — اختياري؛ إن لم يُرسل يُولَّد تلقائياً"
      },
      "public_key": {
        "type": "string",
        "description": "مفتاح Ed25519 العام — PEM (يُولَّد في المتصفح ويُرسل للسيرفر)"
      },
      "organization_id": {
        "type": "integer",
        "minimum": 1,
        "example": 1,
        "description": "معرف المؤسسة"
      },
      "department_id": {
        "type": "integer",
        "minimum": 1,
        "example": 5,
        "description": "معرف آخر قسم في الهرمية (مثل: شعبة التدقيق داخل قسم المحاسبة)"
      },
      "role_id": {
        "type": "integer",
        "minimum": 1,
        "example": 2,
        "description": "معرف الدور (Role)"
      }
    },
    "example": {
      "first_name": "أحمد",
      "last_name": "الحسن",
      "father_name": "محمد",
      "mother_name": "فاطمة",
      "national_id": "01234567890",
      "userName": "john_doe",
      "email": "john@gmail.com",
      "phone_number": "0912345678",
      "password": "Test123",
      "pin": "123456",
      "confirm_pin": "123456",
      "organization_id": 1,
      "department_id": 5,
      "role_id": 2,
      "public_key": "MCowBQYDK2VwAyEA6dCIpX6BrmT8IzG85cIziBnFc2tY/8aBbvmJuTKc9/g="
    }
  },
  "RegisterEmployeeData": {
    "type": "object",
    "properties": {
      "userName": {
        "type": "string",
        "example": "john_doe"
      },
      "first_name": {
        "type": "string",
        "example": "أحمد"
      },
      "last_name": {
        "type": "string",
        "example": "الحسن"
      },
      "father_name": {
        "type": "string",
        "example": "محمد"
      },
      "mother_name": {
        "type": "string",
        "example": "فاطمة"
      },
      "national_id": {
        "type": "string",
        "example": "01234567890"
      },
      "key_fingerprint": {
        "type": "string",
        "example": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
      },
      "public_key": {
        "type": "string"
      },
      "organization_department_roles_id": {
        "type": "integer",
        "example": 3
      }
    }
  },
  "RegisterEmployeeResponse": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "example": true
      },
      "status_code": {
        "type": "integer",
        "example": 200
      },
      "message": {
        "type": "string",
        "example": "تم تسجيل الموظف بنجاح"
      },
      "data": {
        "$ref": "#/components/schemas/RegisterEmployeeData"
      }
    }
  },
  "EmployeeVerifyPasswordRequest": {
    "type": "object",
    "required": [
      "userName",
      "password"
    ],
    "properties": {
      "userName": {
        "type": "string",
        "minLength": 3,
        "maxLength": 50,
        "example": "john_doe",
        "description": "اسم مستخدم الموظف"
      },
      "password": {
        "type": "string",
        "minLength": 6,
        "example": "Test123",
        "description": "كلمة مرور الموظف (الخطوة 1 من تسجيل الدخول)"
      }
    },
    "example": {
      "userName": "john_doe",
      "password": "Test123"
    }
  },
  "EmployeeVerifyPasswordResponse": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "example": true
      },
      "status_code": {
        "type": "integer",
        "example": 200
      },
      "message": {
        "type": "string",
        "example": "تم التحقق من كلمة مرور الموظف بنجاح"
      },
      "data": {
        "type": "object",
        "properties": {
          "pin_session_id": {
            "type": "string",
            "format": "uuid",
            "example": "550e8400-e29b-41d4-a716-446655440000"
          },
          "key_fingerprint": {
            "type": "string",
            "example": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
          },
          "expires_at": {
            "type": "string",
            "format": "date-time",
            "example": "2026-06-05T12:05:00.000Z"
          },
          "expires_in_seconds": {
            "type": "integer",
            "example": 300
          },
          "message": {
            "type": "string",
            "example": "تم التحقق من كلمة المرور. استخدم challenge + private key لإكمال تسجيل الدخول."
          }
        }
      }
    }
  },
  "EmployeeChallengeRequest": {
    "type": "object",
    "required": [
      "pin_session_id"
    ],
    "properties": {
      "pin_session_id": {
        "type": "string",
        "format": "uuid",
        "example": "550e8400-e29b-41d4-a716-446655440000"
      }
    }
  },
  "EmployeeChallengeResponse": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "example": true
      },
      "data": {
        "type": "object",
        "properties": {
          "challenge_id": {
            "type": "string",
            "format": "uuid"
          },
          "pin_session_id": {
            "type": "string",
            "format": "uuid"
          },
          "key_fingerprint": {
            "type": "string"
          },
          "message": {
            "type": "string",
            "description": "النص الذي يُوقَّع بالمفتاح الخاص من الفلاشة"
          },
          "expires_at": {
            "type": "string",
            "format": "date-time"
          },
          "expires_in_seconds": {
            "type": "integer",
            "example": 300
          }
        }
      }
    }
  },
  "EmployeeVerifySignatureRequest": {
    "type": "object",
    "required": [
      "challenge_id",
      "signature"
    ],
    "properties": {
      "challenge_id": {
        "type": "string",
        "format": "uuid",
        "example": "660e8400-e29b-41d4-a716-446655440001"
      },
      "signature": {
        "type": "string",
        "minLength": 20,
        "example": "base64-signature-from-private-key",
        "description": "توقيع base64 لنص challenge باستخدام private key من USB"
      }
    }
  },
  "RegisterCitizenRequest": {
    "type": "object",
    "required": [
      "userName",
      "email",
      "password",
      "phone_number"
    ],
    "properties": {
      "userName": {
        "type": "string",
        "example": "citizen_1"
      },
      "email": {
        "type": "string",
        "example": "citizen@gmail.com"
      },
      "phone_number": {
        "type": "string",
        "example": "0954263536"
      },
      "password": {
        "type": "string",
        "example": "123456"
      }
    }
  },
  "AuthResponse": {
    "type": "object",
    "properties": {
      "token": {
        "type": "string",
        "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
      },
      "user": {
        "$ref": "#/components/schemas/User"
      },
      "roles": {
        "type": "array",
        "items": {
          "type": "integer"
        },
        "example": [
          1,
          2
        ]
      }
    }
  },
  "ResendOtpRequest": {
    "type": "object",
    "required": [
      "session_id"
    ],
    "properties": {
      "session_id": {
        "type": "string",
        "format": "uuid",
        "example": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "description": "معرّف الجلسة المُرجَع من /register/citizen أو /login"
      }
    },
    "example": {
      "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    }
  },
  "OtpSendResponse": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "example": true
      },
      "data": {
        "type": "object",
        "properties": {
          "session_id": {
            "type": "string",
            "format": "uuid",
            "example": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
          },
          "message": {
            "type": "string",
            "example": "تم إرسال رمز التحقق على رقم الموبايل. أدخله خلال دقيقتين."
          }
        }
      }
    }
  },
  "VerifyOtpRequest": {
    "type": "object",
    "required": [
      "session_id",
      "otp"
    ],
    "properties": {
      "session_id": {
        "type": "string",
        "format": "uuid",
        "example": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
      },
      "otp": {
        "type": "string",
        "minLength": 6,
        "maxLength": 6,
        "pattern": "^[0-9]{6}$",
        "example": "482931"
      }
    }
  },
  "VerifyRegisterOtpResponse": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "example": true
      },
      "data": {
        "type": "object",
        "properties": {
          "token": {
            "type": "string",
            "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
          },
          "user": {
            "$ref": "#/components/schemas/User"
          },
          "message": {
            "type": "string",
            "example": "تم تفعيل الحساب بنجاح"
          }
        }
      }
    }
  },
  "VerifyLoginOtpResponse": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "example": true
      },
      "status_code": {
        "type": "integer",
        "example": 200
      },
      "message": {
        "type": "string",
        "example": "تم تأكيد رمز الدخول بنجاح"
      },
      "data": {
        "type": "object",
        "properties": {
          "user": {
            "$ref": "#/components/schemas/User"
          },
          "roles": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "organization_department_roles_id": {
                  "type": "integer",
                  "example": 3
                },
                "role_id": {
                  "type": "integer",
                  "example": 4
                },
                "role_name": {
                  "type": "string",
                  "example": "مدير مكتب المدير"
                },
                "department_id": {
                  "type": "integer",
                  "example": 12
                },
                "department_name": {
                  "type": "string",
                  "example": "دائرة مكتب المدير"
                },
                "organization_id": {
                  "type": "integer",
                  "example": 1
                },
                "organization_name": {
                  "type": "string",
                  "example": "مديرية التربية"
                }
              }
            }
          },
          "token": {
            "type": "string",
            "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
          },
          "refreshToken": {
            "type": "string",
            "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
          },
          "has_app_pin": {
            "type": "boolean",
            "description": "true إذا كان الحساب أنشأ PIN على السيرفر (من users.pin_hash)",
            "example": true
          }
        }
      }
    }
  }
}
