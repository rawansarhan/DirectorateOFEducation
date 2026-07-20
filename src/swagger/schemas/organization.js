module.exports = {
  "Organization": {
    "type": "object",
    "properties": {
      "id": {
        "type": "integer",
        "example": 1
      },
      "name": {
        "type": "string",
        "example": "مديرية التربية - دمشق"
      },
      "parent_id": {
        "type": "integer",
        "nullable": true,
        "example": null
      },
      "location_id": {
        "type": "integer",
        "nullable": true,
        "example": 1
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
  "OrganizationCreate": {
    "type": "object",
    "required": [
      "name"
    ],
    "properties": {
      "name": {
        "type": "string",
        "example": "مديرية التربية - دمشق",
        "minLength": 2,
        "maxLength": 150
      },
      "parent_id": {
        "type": "integer",
        "nullable": true,
        "example": null
      },
      "location_id": {
        "type": "integer",
        "nullable": true,
        "example": 1
      }
    }
  },
  "OrganizationUpdate": {
    "type": "object",
    "minProperties": 1,
    "properties": {
      "name": {
        "type": "string",
        "example": "مديرية التربية - دمشق (محدث)",
        "minLength": 2,
        "maxLength": 150
      },
      "parent_id": {
        "type": "integer",
        "nullable": true,
        "example": 2
      },
      "location_id": {
        "type": "integer",
        "nullable": true,
        "example": 3
      }
    }
  },
  "OrganizationEnvelope": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "example": true
      },
      "message": {
        "type": "string",
        "example": "تم إنشاء المؤسسة بنجاح"
      },
      "data": {
        "$ref": "#/components/schemas/Organization"
      }
    }
  },
  "OrganizationListEnvelope": {
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
          "$ref": "#/components/schemas/Organization"
        }
      }
    }
  },
  "OrganizationDeleteEnvelope": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "example": true
      },
      "message": {
        "type": "string",
        "example": "تم حذف المؤسسة بنجاح"
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
  }
}
