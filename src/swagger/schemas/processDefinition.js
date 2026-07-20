module.exports = {
  "ProcessDefinitionCreateForm": {
    "type": "object",
    "required": [
      "file",
      "name",
      "priority",
      "start_date"
    ],
    "properties": {
      "file": {
        "type": "string",
        "format": "binary",
        "description": "ملف BPMN"
      },
      "name": {
        "type": "string",
        "example": "Leave Process"
      },
      "is_complaint": {
        "type": "boolean",
        "default": false,
        "description": "true → type_trans_id = null (معاملة شكوى)"
      },
      "type_trans_id": {
        "type": "integer",
        "nullable": true,
        "example": 2,
        "description": "مطلوب عند is_complaint = false"
      },
      "organization_id": {
        "type": "integer",
        "example": 10
      },
      "priority": {
        "type": "integer",
        "example": 1
      },
      "start_date": {
        "type": "string",
        "pattern": "^\\d{1,2}-\\d{1,2}$",
        "example": "03-15",
        "description": "بداية نافذة التفعيل السنوية (شهر-يوم MM-DD). تتكرر كل سنة — لا حاجة لإرسال السنة."
      },
      "end_date": {
        "type": "string",
        "pattern": "^\\d{1,2}-\\d{1,2}$",
        "nullable": true,
        "example": "06-30",
        "description": "نهاية النافذة السنوية (شهر-يوم). اختياري. يمكن أن تكون بعد start_date في نفس السنة (03-15→06-30) أو عابرة للسنة (11-01→02-15)."
      }
    }
  },
  "ProcessDefinitionCreateData": {
    "type": "object",
    "properties": {
      "process": {
        "type": "object",
        "description": "code يُولَّد تلقائياً: process-{id}-v{version}",
        "properties": {
          "id": {
            "type": "integer",
            "example": 12
          },
          "name": {
            "type": "string",
            "example": "Leave Process"
          },
          "code": {
            "type": "string",
            "example": "process-12-v1",
            "readOnly": true
          },
          "version": {
            "type": "integer",
            "example": 1
          },
          "status": {
            "type": "string",
            "example": "deployed"
          },
          "camunda_process_key": {
            "type": "string",
            "example": "Process_1"
          },
          "is_complaint": {
            "type": "boolean",
            "example": false
          },
          "type_trans_id": {
            "type": "integer",
            "nullable": true,
            "example": 2
          },
          "organization_id": {
            "type": "integer",
            "nullable": true,
            "example": 10
          },
          "priority": {
            "type": "integer",
            "example": 1
          },
          "start_date": {
            "type": "string",
            "format": "date-time"
          },
          "end_date": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          }
        }
      },
      "stages": {
        "type": "array",
        "items": {
          "type": "object"
        },
        "description": "المراحل المُولَّدة من Camunda"
      }
    }
  },
  "ProcessDefinitionCreateSuccessResponse": {
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
        "example": "تم إنشاء العملية بنجاح"
      },
      "data": {
        "$ref": "#/components/schemas/ProcessDefinitionCreateData"
      }
    },
    "example": {
      "success": true,
      "status_code": 200,
      "message": "تم إنشاء العملية بنجاح",
      "data": {
        "process": {
          "id": 12,
          "name": "Leave Process",
          "code": "process-12-v1",
          "version": 1,
          "status": "deployed",
          "camunda_process_key": "Process_1",
          "is_complaint": false,
          "type_trans_id": 2,
          "organization_id": 10,
          "priority": 1
        },
        "stages": []
      }
    }
  },
  "DocumentTemplateWidgetTextField": {
    "type": "object",
    "description": "ودجت حقل نص — text_field",
    "required": [
      "widget_type",
      "data"
    ],
    "properties": {
      "widget_type": {
        "type": "string",
        "enum": [
          "text_field"
        ],
        "example": "text_field"
      },
      "data": {
        "type": "object",
        "required": [
          "id",
          "label",
          "input_type"
        ],
        "properties": {
          "id": {
            "type": "string",
            "example": "citizen_phone"
          },
          "label": {
            "type": "string",
            "example": "رقم الموبايل"
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
              "phone",
              "phoneNumber",
              "email"
            ],
            "example": "phone"
          },
          "regex": {
            "type": "string",
            "example": "^09[0-9]{8}$"
          },
          "max_length": {
            "type": "integer",
            "example": 10
          },
          "min_length": {
            "type": "integer",
            "example": 10
          }
        }
      }
    },
    "example": {
      "widget_type": "text_field",
      "data": {
        "id": "citizen_phone",
        "label": "رقم الموبايل",
        "is_required": true,
        "input_type": "phone",
        "regex": "^09[0-9]{8}$",
        "max_length": 10,
        "min_length": 10
      }
    }
  },
  "DocumentTemplateWidgetDatePicker": {
    "type": "object",
    "description": "ودجت تاريخ — date_picker",
    "required": [
      "widget_type",
      "data"
    ],
    "properties": {
      "widget_type": {
        "type": "string",
        "enum": [
          "date_picker"
        ],
        "example": "date_picker"
      },
      "data": {
        "type": "object",
        "required": [
          "id",
          "label",
          "min_date",
          "max_date"
        ],
        "properties": {
          "id": {
            "type": "string",
            "example": "birth_date"
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
          }
        }
      }
    },
    "example": {
      "widget_type": "date_picker",
      "data": {
        "id": "birth_date",
        "label": "تاريخ الولادة",
        "is_required": true,
        "min_date": "1940-01-01",
        "max_date": "2026-06-04"
      }
    }
  },
  "DocumentTemplateWidgetDropdown": {
    "type": "object",
    "description": "ودجت قائمة منسدلة — dropdown",
    "required": [
      "widget_type",
      "data"
    ],
    "properties": {
      "widget_type": {
        "type": "string",
        "enum": [
          "dropdown"
        ],
        "example": "dropdown"
      },
      "data": {
        "type": "object",
        "required": [
          "id",
          "label",
          "options"
        ],
        "properties": {
          "id": {
            "type": "string",
            "example": "birth_governorate"
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
            "example": [
              {
                "key": "DAM",
                "value": "دمشق"
              },
              {
                "key": "ALE",
                "value": "حلب"
              }
            ]
          }
        }
      }
    },
    "example": {
      "widget_type": "dropdown",
      "data": {
        "id": "birth_governorate",
        "label": "محافظة الولادة",
        "is_required": true,
        "options": [
          {
            "key": "DAM",
            "value": "دمشق"
          },
          {
            "key": "ALE",
            "value": "حلب"
          }
        ]
      }
    }
  },
  "DocumentTemplateWidgetCheckList": {
    "type": "object",
    "description": "ودجت قائمة اختيار متعدد — check_list",
    "required": [
      "widget_type",
      "data"
    ],
    "properties": {
      "widget_type": {
        "type": "string",
        "enum": [
          "check_list"
        ],
        "example": "check_list"
      },
      "data": {
        "type": "object",
        "required": [
          "id",
          "label",
          "min_selected",
          "max_selected",
          "options"
        ],
        "properties": {
          "id": {
            "type": "string",
            "example": "preferred_cycles"
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
            }
          }
        }
      }
    },
    "example": {
      "widget_type": "check_list",
      "data": {
        "id": "preferred_cycles",
        "label": "حلقات التعليم للتدريس",
        "is_required": false,
        "min_selected": 1,
        "max_selected": 2,
        "options": [
          {
            "key": "cycle_1",
            "value": "أساسي"
          },
          {
            "key": "cycle_2",
            "value": "أساسي"
          },
          {
            "key": "secondary",
            "value": "التعليم الثانوي"
          }
        ]
      }
    }
  },
  "DocumentTemplateConfigJson": {
    "type": "object",
    "description": "إعدادات استمارة القالب — يُرسل في PUT /api/document-templates/{id} كـ application/json",
    "required": [
      "form_id",
      "form_name",
      "widgets"
    ],
    "properties": {
      "form_id": {
        "type": "string",
        "example": "civil_transaction_55"
      },
      "form_name": {
        "type": "string",
        "example": "استمارة معاملة المواطن"
      },
      "widgets": {
        "type": "array",
        "description": "text_field | date_picker | dropdown | check_list",
        "items": {
          "oneOf": [
            {
              "$ref": "#/components/schemas/DocumentTemplateWidgetTextField"
            },
            {
              "$ref": "#/components/schemas/DocumentTemplateWidgetDatePicker"
            },
            {
              "$ref": "#/components/schemas/DocumentTemplateWidgetDropdown"
            },
            {
              "$ref": "#/components/schemas/DocumentTemplateWidgetCheckList"
            }
          ]
        }
      }
    },
    "example": {
      "form_id": "civil_transaction_55",
      "form_name": "استمارة معاملة المواطن",
      "widgets": [
        {
          "widget_type": "text_field",
          "data": {
            "id": "citizen_phone",
            "label": "رقم الموبايل",
            "is_required": true,
            "input_type": "phone",
            "regex": "^09[0-9]{8}$",
            "max_length": 10,
            "min_length": 10
          }
        },
        {
          "widget_type": "date_picker",
          "data": {
            "id": "birth_date",
            "label": "تاريخ الولادة",
            "is_required": true,
            "min_date": "1940-01-01",
            "max_date": "2026-06-04"
          }
        },
        {
          "widget_type": "dropdown",
          "data": {
            "id": "birth_governorate",
            "label": "محافظة الولادة",
            "is_required": true,
            "options": [
              {
                "key": "DAM",
                "value": "دمشق"
              },
              {
                "key": "ALE",
                "value": "حلب"
              }
            ]
          }
        },
        {
          "widget_type": "check_list",
          "data": {
            "id": "preferred_cycles",
            "label": "حلقات التعليم للتدريس",
            "is_required": false,
            "min_selected": 1,
            "max_selected": 2,
            "options": [
              {
                "key": "cycle_1",
                "value": "أساسي"
              },
              {
                "key": "cycle_2",
                "value": "أساسي"
              },
              {
                "key": "secondary",
                "value": "التعليم الثانوي"
              }
            ]
          }
        }
      ]
    }
  },
  "DocumentTemplateCreateSuccessResponse": {
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
        "example": "تم إنشاء قالب الوثيقة بنجاح"
      },
      "data": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "example": 1
          },
          "name": {
            "type": "string",
            "example": "استمارة معاملة المواطن"
          },
          "file_path": {
            "type": "string",
            "example": "/uploads/1779540194357-518796726.pdf"
          },
          "type_doc_id": {
            "type": "integer",
            "example": 1
          },
          "type_doc": {
            "type": "object",
            "properties": {
              "id": {
                "type": "integer",
                "example": 1
              },
              "name": {
                "type": "string",
                "example": "هوية شخصية"
              }
            }
          },
          "config_json": {
            "oneOf": [
              {
                "$ref": "#/components/schemas/DocumentTemplateConfigJson"
              },
              {
                "type": "null"
              }
            ],
            "example": null
          },
          "engine_type": {
            "type": "string",
            "example": "ACROFORM"
          },
          "version": {
            "type": "integer",
            "example": 1
          },
          "is_latest": {
            "type": "boolean",
            "example": true
          },
          "is_active": {
            "type": "boolean",
            "example": true
          }
        }
      }
    }
  },
  "DocumentTemplateErrorResponse": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean",
        "example": false
      },
      "status_code": {
        "type": "integer",
        "example": 400
      },
      "message": {
        "type": "string",
        "example": "regex غير صالح للودجت citizen_phone"
      },
      "error": {
        "type": "string",
        "example": "VALIDATION_ERROR"
      },
      "data": {
        "type": "null",
        "example": null
      }
    }
  }
}
