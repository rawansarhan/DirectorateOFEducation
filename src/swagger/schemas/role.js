module.exports = {
  "RoleTemplate": {
    "type": "object",
    "properties": {
      "id": {
        "type": "integer",
        "example": 1
      },
      "name": {
        "type": "string",
        "example": "مدير دائرة"
      },
      "code": {
        "type": "string",
        "example": "DEPARTMENT_DIRECTOR"
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
  "OrgDeptRole": {
    "type": "object",
    "properties": {
      "id": {
        "type": "integer",
        "example": 1
      },
      "role_id": {
        "type": "integer",
        "example": 1
      },
      "organization_id": {
        "type": "integer",
        "example": 1
      },
      "department_id": {
        "type": "integer",
        "example": 2
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
      "camunda_group_key": {
        "type": "string",
        "example": "DEPARTMENT_DIRECTOR__ORG1__DEPT2"
      },
      "role": {
        "$ref": "#/components/schemas/RoleTemplate"
      },
      "organization": {
        "$ref": "#/components/schemas/Organization"
      },
      "department": {
        "$ref": "#/components/schemas/Department"
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
  "RoleCreate": {
    "type": "object",
    "required": [
      "name",
      "code",
      "organization_id",
      "department_id"
    ],
    "properties": {
      "name": {
        "type": "string",
        "example": "مدير دائرة",
        "minLength": 2,
        "maxLength": 100
      },
      "code": {
        "type": "string",
        "example": "DEPARTMENT_DIRECTOR",
        "minLength": 2,
        "maxLength": 100,
        "pattern": "^[A-Z0-9_]+$"
      },
      "organization_id": {
        "type": "integer",
        "example": 1
      },
      "department_id": {
        "type": "integer",
        "example": 2
      },
      "parent_id": {
        "type": "integer",
        "nullable": true,
        "example": null,
        "description": "معرّف الدور الأب من organization_department_roles"
      }
    }
  },
  "RoleUpdate": {
    "type": "object",
    "minProperties": 1,
    "properties": {
      "organization_id": {
        "type": "integer",
        "example": 2
      },
      "department_id": {
        "type": "integer",
        "example": 3
      },
      "parent_id": {
        "type": "integer",
        "nullable": true,
        "example": 5
      }
    }
  },
  "RoleEnvelope": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "example": true
      },
      "message": {
        "type": "string",
        "example": "تم إنشاء الدور بنجاح"
      },
      "data": {
        "$ref": "#/components/schemas/OrgDeptRole"
      }
    }
  },
  "RoleListEnvelope": {
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
          "$ref": "#/components/schemas/OrgDeptRole"
        }
      }
    }
  },
  "RoleDeleteEnvelope": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "example": true
      },
      "message": {
        "type": "string",
        "example": "تم حذف الدور بنجاح"
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
  "RoleByDepartmentItem": {
    "type": "object",
    "properties": {
      "id": {
        "type": "integer",
        "example": 2,
        "description": "معرّف الدور (roles.id)"
      },
      "organization_department_roles_id": {
        "type": "integer",
        "example": 12,
        "description": "معرّف OrgDepRole — مع organization_id و role_id و department_id لـ GET /api/employees/by-org-dept-role"
      },
      "name": {
        "type": "string",
        "example": "مدير المحاسبة"
      },
      "code": {
        "type": "string",
        "example": "ACCOUNTING_MANAGER"
      }
    }
  },
  "RolesByDepartmentEnvelope": {
    "type": "object",
    "description": "استجابة GET /api/role/by-department/{departmentId} — يدعم Caching + Retry limit",
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
          "$ref": "#/components/schemas/RoleByDepartmentItem"
        }
      }
    },
    "example": {
      "success": true,
      "status_code": 200,
      "message": "تم جلب البيانات بنجاح",
      "data": [
        {
          "id": 2,
          "organization_department_roles_id": 12,
          "name": "مدير المحاسبة",
          "code": "ACCOUNTING_MANAGER"
        },
        {
          "id": 4,
          "organization_department_roles_id": 15,
          "name": "موظف معاملات",
          "code": "TRANSACTION_CLERK"
        }
      ]
    }
  }
}
