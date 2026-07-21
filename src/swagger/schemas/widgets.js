module.exports = {
  "TextFieldWidget": {
    "type": "object",
    "properties": {
      "id": {
        "type": "integer",
        "example": 1
      },
      "id_widget": {
        "type": "string",
        "example": "text_field1"
      },
      "label": {
        "type": "string",
        "example": "الاسم الكامل"
      },
      "is_required": {
        "type": "boolean",
        "example": true
      },
      "input_type": {
        "type": "string",
        "enum": [
          "text",
          "string",
          "int",
          "phoneNumber",
          "email"
        ]
      },
      "regex": {
        "type": "string",
        "nullable": true
      },
      "max_length": {
        "type": "integer",
        "nullable": true
      },
      "min_length": {
        "type": "integer",
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
  "TextDropdownOption": {
    "type": "object",
    "required": [
      "key",
      "value"
    ],
    "properties": {
      "key": {
        "type": "string",
        "example": "DAM"
      },
      "value": {
        "type": "string",
        "example": "دمشق"
      }
    }
  },
  "TextDropdownWidget": {
    "type": "object",
    "properties": {
      "id": {
        "type": "integer",
        "example": 1
      },
      "id_widget": {
        "type": "string",
        "example": "dropdown1"
      },
      "label": {
        "type": "string",
        "example": "محافظة الولادة"
      },
      "is_required": {
        "type": "boolean",
        "example": true
      },
      "options": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/TextDropdownOption"
        }
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
  "RadioGroupOption": {
    "type": "object",
    "required": [
      "key",
      "value"
    ],
    "properties": {
      "key": {
        "type": "string",
        "example": "single"
      },
      "value": {
        "type": "string",
        "example": "عازب/ة"
      }
    }
  },
  "RadioGroupWidget": {
    "type": "object",
    "properties": {
      "id": {
        "type": "integer",
        "example": 1
      },
      "id_widget": {
        "type": "string",
        "example": "radio_group1"
      },
      "label": {
        "type": "string",
        "example": "الحالة الاجتماعية"
      },
      "is_required": {
        "type": "boolean",
        "example": true
      },
      "options": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/RadioGroupOption"
        }
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
  "CheckListOption": {
    "type": "object",
    "required": [
      "key",
      "value"
    ],
    "properties": {
      "key": {
        "type": "string",
        "example": "cycle_1"
      },
      "value": {
        "type": "string",
        "example": "أساسي"
      }
    }
  },
  "CheckListWidget": {
    "type": "object",
    "properties": {
      "id": {
        "type": "integer",
        "example": 1
      },
      "id_widget": {
        "type": "string",
        "example": "check_list1"
      },
      "label": {
        "type": "string",
        "example": "حلقات التعليم للتدريس"
      },
      "is_required": {
        "type": "boolean",
        "example": false
      },
      "min_selected": {
        "type": "integer",
        "example": 1
      },
      "max_selected": {
        "type": "integer",
        "example": 2
      },
      "options": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/CheckListOption"
        }
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
  "DatePickerWidget": {
    "type": "object",
    "properties": {
      "id": {
        "type": "integer",
        "example": 1
      },
      "id_widget": {
        "type": "string",
        "example": "date_picker1"
      },
      "label": {
        "type": "string",
        "example": "تاريخ الولادة"
      },
      "is_required": {
        "type": "boolean",
        "example": true
      },
      "min_date": {
        "type": "string",
        "format": "date",
        "example": "1940-01-01"
      },
      "max_date": {
        "type": "string",
        "format": "date",
        "example": "2026-06-04"
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
  "FilePickerWidget": {
    "type": "object",
    "properties": {
      "id": {
        "type": "integer",
        "example": 1
      },
      "id_widget": {
        "type": "string",
        "example": "file_picker1"
      },
      "label": {
        "type": "string",
        "example": "وثائق الهوية الشخصية"
      },
      "is_required": {
        "type": "boolean",
        "example": true
      },
      "max_size_mb": {
        "type": "integer",
        "example": 5
      },
      "allowed_extensions": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "example": [
          "pdf",
          "png",
          "jpg"
        ]
      },
      "allow_multiple": {
        "type": "boolean",
        "example": true
      },
      "type_doc_id": {
        "type": "integer",
        "example": 1,
        "description": "معرّف نوع الوثيقة من type_docs"
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
  "FilePickerCreateInput": {
    "type": "object",
    "required": [
      "label",
      "max_size_mb",
      "allowed_extensions",
      "typeDoc_id"
    ],
    "properties": {
      "label": {
        "type": "string",
        "example": "وثائق الهوية الشخصية"
      },
      "is_required": {
        "type": "boolean",
        "example": true
      },
      "max_size_mb": {
        "type": "integer",
        "example": 5
      },
      "allowed_extensions": {
        "type": "array",
        "minItems": 1,
        "items": {
          "type": "string"
        },
        "example": [
          "pdf",
          "png",
          "jpg"
        ]
      },
      "allow_multiple": {
        "type": "boolean",
        "example": true
      },
      "typeDoc_id": {
        "type": "integer",
        "minimum": 1,
        "example": 1,
        "description": "alias مقبول — يُخزَّن كـ type_doc_id في الاستجابة"
      }
    }
  }
}
