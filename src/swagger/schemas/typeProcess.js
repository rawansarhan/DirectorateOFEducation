module.exports = {
  "TypeProcess": {
    "type": "object",
    "properties": {
      "id": {
        "type": "integer",
        "example": 1
      },
      "name": {
        "type": "string",
        "example": "تحويل طالب"
      },
      "code": {
        "type": "string",
        "example": "STU_TR",
        "description": "رمز نوع المعاملة — يُستخدم في id_process"
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
  "TypeProcessCreate": {
    "type": "object",
    "required": [
      "name",
      "code"
    ],
    "properties": {
      "name": {
        "type": "string",
        "example": "تحويل طالب"
      },
      "code": {
        "type": "string",
        "example": "STU_TR",
        "description": "2-20 حرف (A-Z, 0-9, _) — يُحوَّل تلقائياً لأحرف كبيرة"
      }
    }
  },
  "TypeProcessUpdate": {
    "type": "object",
    "minProperties": 1,
    "properties": {
      "is_active": {
        "type": "boolean",
        "example": true
      }
    }
  },
  "TypeProcessEnvelope": {
    "type": "object",
    "properties": {
      "message": {
        "type": "string",
        "example": "تم إنشاء نوع العملية بنجاح !"
      },
      "data": {
        "$ref": "#/components/schemas/TypeProcess"
      }
    }
  },
  "TypeProcessListEnvelope": {
    "type": "object",
    "properties": {
      "message": {
        "type": "string",
        "example": "عرض كل أنواع العمليات بنجاح !"
      },
      "data": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/TypeProcess"
        }
      }
    }
  }
}
