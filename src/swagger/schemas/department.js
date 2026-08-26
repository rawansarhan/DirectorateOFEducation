module.exports = {
  "Department": {
    "type": "object",
    "properties": {
      "id": {
        "type": "integer",
        "example": 1
      },
      "name": {
        "type": "string",
        "example": "قسم الشؤون الإدارية"
      },
      "organization_id": {
        "type": "integer",
        "example": 1
      },
      "parent_id": {
        "type": "integer",
        "nullable": true,
        "example": null
      },
      "is_active": {
        "type": "boolean",
        "example": true
      },
      "created_at": {
        "type": "string",
        "format": "date-time"
      },
      "updated_at": {
        "type": "string",
        "format": "date-time"
      }
    }
  },
  "DepartmentCreate": {
    "type": "object",
    "required": [
      "name",
      "organization_id"
    ],
    "properties": {
      "name": {
        "type": "string",
        "example": "قسم الشؤون الإدارية",
        "minLength": 2,
        "maxLength": 150
      },
      "organization_id": {
        "type": "integer",
        "example": 1
      },
      "parent_id": {
        "type": "integer",
        "nullable": true,
        "example": null
      }
    }
  },
  "DepartmentUpdate": {
    "type": "object",
    "minProperties": 1,
    "properties": {
      "name": {
        "type": "string",
        "example": "قسم الشؤون الإدارية (محدث)",
        "minLength": 2,
        "maxLength": 150
      },
      "organization_id": {
        "type": "integer",
        "example": 2
      },
      "parent_id": {
        "type": "integer",
        "nullable": true,
        "example": 3
      }
    }
  },
  "DepartmentEnvelope": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "example": true
      },
      "message": {
        "type": "string",
        "example": "تم إنشاء القسم بنجاح"
      },
      "data": {
        "$ref": "#/components/schemas/Department"
      }
    }
  },
  "DepartmentListEnvelope": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "example": true
      },
      "message": {
        "type": "string",
        "example": "تم جلب البيانات بنجاح"
      },
      "data": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/Department"
        }
      }
    }
  },
  "DepartmentDeleteEnvelope": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "example": true
      },
      "message": {
        "type": "string",
        "example": "تم حذف القسم بنجاح"
      },
      "data": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "example": 1
          }
        }
      }
    }
  },
  "DepartmentLeaf": {
    "type": "object",
    "properties": {
      "id": {
        "type": "integer",
        "example": 3
      },
      "name": {
        "type": "string",
        "example": "قسم المحاسبة\\شعبة التدقيق"
      }
    }
  },
  "DepartmentLeavesEnvelope": {
    "type": "object",
    "description": "استجابة GET /api/department/by-organization/{organizationId}/leaves — يدعم Caching + Retry limit",
    "required": [
      "success",
      "status_code",
      "message",
      "data"
    ],
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
        "example": "تم جلب البيانات بنجاح"
      },
      "data": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/DepartmentLeaf"
        }
      }
    },
    "example": {
      "success": true,
      "status_code": 200,
      "message": "تم جلب البيانات بنجاح",
      "data": [
        {
          "id": 3,
          "name": "قسم المحاسبة\\شعبة التدقيق"
        },
        {
          "id": 8,
          "name": "قسم الموارد البشرية\\شعبة التوظيف"
        }
      ]
    }
  },
  "DepartmentAccessibleScopeData": {
    "type": "object",
    "description": "نطاق الدوائر المتاحة للمستخدم — يُبنى من organization_department_roles في user_role_assignments ثم كل الأبناء/الأحفاد عبر parent_id. النتيجة تُخزَّن في Redis (TTL = API_CACHE_TTL_SECONDS).",
    "properties": {
      "root_org_dept_role_ids": {
        "type": "array",
        "description": "معرّفات organization_department_roles الجذرية للمستخدم (تعييناته النشطة)",
        "items": {
          "type": "integer"
        },
        "example": [
          12,
          45
        ]
      },
      "org_dept_role_ids": {
        "type": "array",
        "description": "كل معرّفات ODR في الشجرة (جذر + أبناء + أحفاد)",
        "items": {
          "type": "integer"
        },
        "example": [
          12,
          13,
          14,
          45,
          46
        ]
      },
      "department_ids": {
        "type": "array",
        "description": "معرّفات الدوائر الفريدة ضمن النطاق (نشطة فقط)",
        "items": {
          "type": "integer"
        },
        "example": [
          3,
          7,
          8,
          15
        ]
      },
      "departments": {
        "type": "array",
        "description": "تفاصيل الدوائر ضمن النطاق",
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "integer",
              "example": 3
            },
            "name": {
              "type": "string",
              "example": "دائرة الشؤون الإدارية"
            },
            "organization_id": {
              "type": "integer",
              "example": 1
            },
            "parent_id": {
              "type": "integer",
              "nullable": true,
              "example": null
            },
            "is_active": {
              "type": "boolean",
              "example": true
            }
          }
        },
        "example": [
          {
            "id": 3,
            "name": "دائرة الشؤون الإدارية",
            "organization_id": 1,
            "parent_id": null,
            "is_active": true
          },
          {
            "id": 7,
            "name": "شعبة الموارد البشرية",
            "organization_id": 1,
            "parent_id": 3,
            "is_active": true
          },
          {
            "id": 8,
            "name": "شعبة الأرشيف",
            "organization_id": 1,
            "parent_id": 3,
            "is_active": true
          },
          {
            "id": 15,
            "name": "دائرة المالية",
            "organization_id": 1,
            "parent_id": null,
            "is_active": true
          }
        ]
      }
    }
  },
  "DepartmentAccessibleScopeEnvelope": {
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
        "example": "تم جلب دوائر نطاق المستخدم بنجاح"
      },
      "data": {
        "$ref": "#/components/schemas/DepartmentAccessibleScopeData"
      }
    },
    "example": {
      "success": true,
      "status_code": 200,
      "message": "تم جلب دوائر نطاق المستخدم بنجاح",
      "data": {
        "root_org_dept_role_ids": [
          12,
          45
        ],
        "org_dept_role_ids": [
          12,
          13,
          14,
          45,
          46
        ],
        "department_ids": [
          3,
          7,
          8,
          15
        ],
        "departments": [
          {
            "id": 3,
            "name": "دائرة الشؤون الإدارية",
            "organization_id": 1,
            "parent_id": null,
            "is_active": true
          },
          {
            "id": 7,
            "name": "شعبة الموارد البشرية",
            "organization_id": 1,
            "parent_id": 3,
            "is_active": true
          },
          {
            "id": 8,
            "name": "شعبة الأرشيف",
            "organization_id": 1,
            "parent_id": 3,
            "is_active": true
          },
          {
            "id": 15,
            "name": "دائرة المالية",
            "organization_id": 1,
            "parent_id": null,
            "is_active": true
          }
        ]
      }
    }
  },
  "DepartmentEmployeeByDepartmentsItem": {
    "type": "object",
    "description": "صف واحد لكل تعيين موظف في دائرة (organization_department_role)",
    "properties": {
      "assignment_id": {
        "type": "integer",
        "example": 101
      },
      "employee_id": {
        "type": "integer",
        "example": 22
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
      "organization_department_roles_id": {
        "type": "integer",
        "example": 12
      },
      "department": {
        "type": "object",
        "nullable": true,
        "properties": {
          "id": {
            "type": "integer",
            "example": 7
          },
          "name": {
            "type": "string",
            "example": "شعبة الموارد البشرية"
          }
        }
      },
      "role": {
        "type": "object",
        "nullable": true,
        "properties": {
          "id": {
            "type": "integer",
            "example": 4
          },
          "name": {
            "type": "string",
            "example": "موظف معاملات"
          },
          "code": {
            "type": "string",
            "example": "TRANSACTION_CLERK"
          }
        }
      },
      "tasks": {
        "type": "object",
        "properties": {
          "in_progress": {
            "type": "integer",
            "example": 2,
            "description": "مهام قيد التنفيذ (assigned)"
          },
          "pending_pickup": {
            "type": "integer",
            "example": 6,
            "description": "مهام بانتظار الالتقاط في الدائرة"
          },
          "active_total": {
            "type": "integer",
            "example": 8,
            "description": "in_progress + pending_pickup للموظف"
          },
          "completed": {
            "type": "integer",
            "example": 34,
            "description": "مراحل مكتملة للموظف في هذا ODR"
          }
        }
      },
      "workload_percent": {
        "type": "integer",
        "minimum": 0,
        "maximum": 100,
        "example": 45,
        "description": "نسبة عبء العمل (0–100)"
      },
      "status": {
        "type": "string",
        "enum": [
          "inactive",
          "low_active",
          "active",
          "overloaded"
        ],
        "example": "active"
      },
      "status_label": {
        "type": "string",
        "enum": [
          "غير نشط",
          "قليل النشاط",
          "نشط",
          "مثقل"
        ],
        "example": "نشط"
      }
    }
  },
  "DepartmentEmployeesByDepartmentsEnvelope": {
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
        "example": "تم جلب موظفي الدوائر بنجاح"
      },
      "data": {
        "type": "object",
        "properties": {
          "items": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/DepartmentEmployeeByDepartmentsItem"
            }
          },
          "pagination": {
            "type": "object",
            "properties": {
              "limit": {
                "type": "integer",
                "example": 3
              },
              "cursor": {
                "type": "string",
                "nullable": true,
                "example": null
              },
              "next_cursor": {
                "type": "string",
                "nullable": true,
                "example": "eyJrIjoiZGVwdF9lbXAiLCJpZCI6MTAxfQ=="
              },
              "has_next": {
                "type": "boolean",
                "example": true
              },
              "has_prev": {
                "type": "boolean",
                "example": false
              }
            }
          }
        }
      }
    },
    "example": {
      "success": true,
      "status_code": 200,
      "message": "تم جلب موظفي الدوائر بنجاح",
      "data": {
        "items": [
          {
            "assignment_id": 101,
            "employee_id": 22,
            "first_name": "أحمد",
            "last_name": "الحسن",
            "father_name": "محمد",
            "mother_name": "فاطمة",
            "national_id": "01234567890",
            "organization_department_roles_id": 12,
            "department": {
              "id": 7,
              "name": "شعبة الموارد البشرية"
            },
            "role": {
              "id": 4,
              "name": "موظف معاملات",
              "code": "TRANSACTION_CLERK"
            },
            "tasks": {
              "in_progress": 2,
              "pending_pickup": 6,
              "active_total": 8,
              "completed": 34
            },
            "workload_percent": 45,
            "status": "active",
            "status_label": "نشط"
          },
          {
            "assignment_id": 102,
            "employee_id": 23,
            "first_name": "سارة",
            "last_name": "يعقوب",
            "father_name": "خالد",
            "mother_name": "لينا",
            "national_id": "09876543210",
            "organization_department_roles_id": 12,
            "department": {
              "id": 7,
              "name": "شعبة الموارد البشرية"
            },
            "role": {
              "id": 4,
              "name": "موظف معاملات",
              "code": "TRANSACTION_CLERK"
            },
            "tasks": {
              "in_progress": 0,
              "pending_pickup": 0,
              "active_total": 0,
              "completed": 12
            },
            "workload_percent": 0,
            "status": "inactive",
            "status_label": "غير نشط"
          },
          {
            "assignment_id": 115,
            "employee_id": 31,
            "first_name": "عمر",
            "last_name": "الدرويش",
            "father_name": "يوسف",
            "mother_name": "هناء",
            "national_id": "01122334455",
            "organization_department_roles_id": 14,
            "department": {
              "id": 8,
              "name": "شعبة الأرشيف"
            },
            "role": {
              "id": 5,
              "name": "مراجع",
              "code": "REVIEWER"
            },
            "tasks": {
              "in_progress": 5,
              "pending_pickup": 3,
              "active_total": 8,
              "completed": 67
            },
            "workload_percent": 72,
            "status": "overloaded",
            "status_label": "مثقل"
          }
        ],
        "pagination": {
          "limit": 3,
          "cursor": null,
          "next_cursor": "eyJrIjoiZGVwdF9lbXAiLCJpZCI6MTE1fQ==",
          "has_next": true,
          "has_prev": false
        }
      }
    }
  },
  "EmployeesByOrgDeptRoleUser": {
    "type": "object",
    "properties": {
      "id": {
        "type": "integer",
        "example": 22
      },
      "userName": {
        "type": "string",
        "example": "ahmad.h"
      },
      "email": {
        "type": "string",
        "example": "ahmad@example.com"
      },
      "phone_number": {
        "type": "string",
        "example": "0912345678"
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
      "is_active": {
        "type": "boolean",
        "example": true
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "example": "2026-01-10T08:00:00.000Z"
      },
      "updated_at": {
        "type": "string",
        "format": "date-time",
        "example": "2026-06-01T12:30:00.000Z"
      }
    }
  },
  "EmployeesByOrgDeptRoleItem": {
    "type": "object",
    "properties": {
      "assignment_id": {
        "type": "integer",
        "example": 101
      },
      "organization_department_roles_id": {
        "type": "integer",
        "example": 12
      },
      "priority": {
        "type": "integer",
        "example": 1
      },
      "is_active": {
        "type": "boolean",
        "example": true
      },
      "user": {
        "$ref": "#/components/schemas/EmployeesByOrgDeptRoleUser"
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "example": "2026-02-01T09:00:00.000Z"
      },
      "updated_at": {
        "type": "string",
        "format": "date-time",
        "example": "2026-02-01T09:00:00.000Z"
      }
    }
  },
  "EmployeesByOrgDeptRoleEnvelope": {
    "type": "object",
    "description": "استجابة GET /api/employees/by-org-dept-role?organization_id&role_id&department_id — يدعم Caching + Retry limit",
    "required": [
      "success",
      "status_code",
      "message",
      "data"
    ],
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
        "example": "تم جلب المستخدمين حسب دور المؤسسة/القسم بنجاح"
      },
      "data": {
        "type": "object",
        "properties": {
          "organization_id": {
            "type": "integer",
            "example": 1
          },
          "role_id": {
            "type": "integer",
            "example": 4
          },
          "department_id": {
            "type": "integer",
            "example": 7
          },
          "organization_department_roles_id": {
            "type": "integer",
            "example": 12
          },
          "total": {
            "type": "integer",
            "example": 2
          },
          "items": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/EmployeesByOrgDeptRoleItem"
            }
          }
        }
      }
    },
    "example": {
      "success": true,
      "status_code": 200,
      "message": "تم جلب المستخدمين حسب دور المؤسسة/القسم بنجاح",
      "data": {
        "organization_id": 1,
        "role_id": 4,
        "department_id": 7,
        "organization_department_roles_id": 12,
        "total": 2,
        "items": [
          {
            "assignment_id": 101,
            "organization_department_roles_id": 12,
            "priority": 1,
            "is_active": true,
            "user": {
              "id": 22,
              "userName": "ahmad.h",
              "email": "ahmad@example.com",
              "phone_number": "0912345678",
              "first_name": "أحمد",
              "last_name": "الحسن",
              "father_name": "محمد",
              "mother_name": "فاطمة",
              "national_id": "01234567890",
              "is_active": true,
              "created_at": "2026-01-10T08:00:00.000Z",
              "updated_at": "2026-06-01T12:30:00.000Z"
            },
            "created_at": "2026-02-01T09:00:00.000Z",
            "updated_at": "2026-02-01T09:00:00.000Z"
          },
          {
            "assignment_id": 102,
            "organization_department_roles_id": 12,
            "priority": 2,
            "is_active": true,
            "user": {
              "id": 23,
              "userName": "sara.y",
              "email": "sara@example.com",
              "phone_number": "0987654321",
              "first_name": "سارة",
              "last_name": "يعقوب",
              "father_name": "خالد",
              "mother_name": "لينا",
              "national_id": "09876543210",
              "is_active": true,
              "created_at": "2026-01-15T10:00:00.000Z",
              "updated_at": "2026-05-20T11:00:00.000Z"
            },
            "created_at": "2026-02-05T10:00:00.000Z",
            "updated_at": "2026-02-05T10:00:00.000Z"
          }
        ]
      }
    }
  },
  "ProcessDefinitionStatsItem": {
    "type": "object",
    "properties": {
      "process_definition_id": {
        "type": "integer",
        "example": 5
      },
      "process_name": {
        "type": "string",
        "example": "طلب إجازة سنوية"
      },
      "process_code": {
        "type": "string",
        "example": "LEAVE_ANNUAL_V1"
      },
      "transaction_type_name": {
        "type": "string",
        "nullable": true,
        "example": "إجازة"
      },
      "transaction_type_code": {
        "type": "string",
        "nullable": true,
        "example": "LEAVE"
      },
      "is_active": {
        "type": "boolean",
        "example": true
      },
      "approval_status": {
        "type": "string",
        "example": "APPROVED",
        "description": "مثل APPROVED أو PENDING"
      },
      "transactions": {
        "type": "object",
        "description": "أعداد المعاملات حسب الحالة (تُحسب طازجة كل طلب)",
        "properties": {
          "pending_pickup": {
            "type": "integer",
            "example": 4
          },
          "in_progress": {
            "type": "integer",
            "example": 12
          },
          "completed": {
            "type": "integer",
            "example": 156
          },
          "rejected": {
            "type": "integer",
            "example": 3
          }
        }
      },
      "departments": {
        "type": "array",
        "description": "الدوائر المرتبطة عبر stage_assignments → organization_department_roles",
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "integer",
              "example": 7
            },
            "name": {
              "type": "string",
              "example": "شعبة الموارد البشرية"
            }
          }
        }
      }
    }
  },
  "ProcessDefinitionStatsEnvelope": {
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
        "example": "تم جلب إحصائيات العمليات بنجاح"
      },
      "data": {
        "type": "object",
        "properties": {
          "items": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ProcessDefinitionStatsItem"
            }
          },
          "period": {
            "type": "object",
            "description": "نطاق التاريخ المطبّق على عدّ المعاملات (null = بدون فلتر)",
            "properties": {
              "from_date": {
                "type": "string",
                "format": "date",
                "nullable": true,
                "example": "2026-01-01"
              },
              "to_date": {
                "type": "string",
                "format": "date",
                "nullable": true,
                "example": "2026-01-31"
              }
            }
          },
          "pagination": {
            "type": "object",
            "properties": {
              "limit": {
                "type": "integer",
                "example": 20
              },
              "cursor": {
                "type": "string",
                "nullable": true,
                "example": null
              },
              "next_cursor": {
                "type": "string",
                "nullable": true,
                "example": "eyJrIjoicHJvY2Vzc19zdGF0cyIsImlkIjo4fQ=="
              },
              "has_next": {
                "type": "boolean",
                "example": true
              },
              "has_prev": {
                "type": "boolean",
                "example": false
              }
            }
          }
        }
      }
    },
    "example": {
      "success": true,
      "status_code": 200,
      "message": "تم جلب إحصائيات العمليات بنجاح",
      "data": {
        "items": [
          {
            "process_definition_id": 5,
            "process_name": "طلب إجازة سنوية",
            "process_code": "LEAVE_ANNUAL_V1",
            "transaction_type_name": "إجازة",
            "transaction_type_code": "LEAVE",
            "is_active": true,
            "approval_status": "APPROVED",
            "transactions": {
              "pending_pickup": 4,
              "in_progress": 12,
              "completed": 156,
              "rejected": 3
            },
            "departments": [
              {
                "id": 7,
                "name": "شعبة الموارد البشرية"
              },
              {
                "id": 3,
                "name": "دائرة الشؤون الإدارية"
              }
            ]
          },
          {
            "process_definition_id": 8,
            "process_name": "طلب شهادة حسن سيرة",
            "process_code": "GOOD_CONDUCT_V2",
            "transaction_type_name": "شهادة",
            "transaction_type_code": "CERTIFICATE",
            "is_active": true,
            "approval_status": "APPROVED",
            "transactions": {
              "pending_pickup": 0,
              "in_progress": 5,
              "completed": 89,
              "rejected": 1
            },
            "departments": [
              {
                "id": 15,
                "name": "دائرة المالية"
              },
              {
                "id": 8,
                "name": "شعبة الأرشيف"
              }
            ]
          }
        ],
        "period": {
          "from_date": "2026-01-01",
          "to_date": "2026-01-31"
        },
        "pagination": {
          "limit": 20,
          "cursor": null,
          "next_cursor": "eyJrIjoicHJvY2Vzc19zdGF0cyIsImlkIjo4fQ==",
          "has_next": true,
          "has_prev": false
        }
      }
    }
  }
}
