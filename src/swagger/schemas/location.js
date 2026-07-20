module.exports = {
  "TypeLocation": {
    "type": "object",
    "properties": {
      "id": {
        "type": "integer",
        "example": 1
      },
      "name": {
        "type": "string",
        "example": "محافظة"
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
  "Location": {
    "type": "object",
    "properties": {
      "id": {
        "type": "integer",
        "example": 1
      },
      "name": {
        "type": "string",
        "example": "ريف دمشق"
      },
      "typeLocation_id": {
        "type": "integer",
        "example": 1
      },
      "parent_id": {
        "type": "integer",
        "nullable": true,
        "example": null
      },
      "type_location": {
        "$ref": "#/components/schemas/TypeLocation"
      },
      "parent": {
        "allOf": [
          {
            "$ref": "#/components/schemas/Location"
          }
        ],
        "nullable": true
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
  "LocationListEnvelope": {
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
          "$ref": "#/components/schemas/Location"
        }
      }
    }
  },
  "LocationCreate": {
    "type": "object",
    "required": [
      "name",
      "typeLocation_id"
    ],
    "properties": {
      "name": {
        "type": "string",
        "example": "ريف دمشق"
      },
      "typeLocation_id": {
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
  "LocationEnvelope": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "example": true
      },
      "message": {
        "type": "string",
        "example": "تم إنشاء الموقع بنجاح"
      },
      "data": {
        "$ref": "#/components/schemas/Location"
      }
    }
  }
}
