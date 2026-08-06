module.exports = {
  "SubmitTransactionResponse": {
    "allOf": [
      {
        "$ref": "#/components/schemas/ApiSuccessResponse"
      },
      {
        "type": "object",
        "properties": {
          "message": {
            "type": "string",
            "example": "تم تقديم المعاملة بنجاح"
          },
          "data": {
            "allOf": [
              {
                "$ref": "#/components/schemas/TransactionOutput"
              },
              {
                "type": "object",
                "properties": {
                  "idempotency_key": {
                    "type": "string",
                    "format": "uuid",
                    "description": "يُولَّد من السيرفر — لا يُرسل في الطلب"
                  },
                  "idempotent_replay": {
                    "type": "boolean",
                    "example": false,
                    "description": "true عند إعادة نفس نتيجة submit (double-click / retry)"
                  }
                }
              }
            ]
          }
        }
      }
    ],
    "example": {
      "success": true,
      "status_code": 200,
      "message": "تم تقديم المعاملة بنجاح",
      "data": {
        "id": 441,
        "status": "submitted",
        "idempotency_key": "0dbc8ad0-2618-4be2-8080-07e13c862d9b",
        "idempotent_replay": false
      }
    }
  },
  "StageSubmissionPayload": {
    "type": "object",
    "deprecated": true,
    "description": "⚠️ deprecated — استخدم UnifiedFormPayload / SubmitTransactionPayload / CompleteTaskPayload",
    "properties": {
      "schema_version": {
        "type": "string",
        "example": "1.0"
      },
      "expected_version": {
        "type": "integer",
        "example": 1,
        "description": "transaction.version — optimistic concurrency"
      },
      "fields": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/StageSubmissionFieldItem"
        }
      },
      "files": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/StageSubmissionFileItem"
        }
      },
      "templates": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/StageSubmissionTemplateItem"
        }
      },
      "actions": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/StageSubmissionActionItem"
        }
      },
      "variables": {
        "type": "object",
        "example": {
          "action": "submit"
        },
        "description": "مطلوب لمسارات Camunda — مثال approve/reject/submit"
      },
      "note": {
        "type": "string",
        "example": "",
        "description": "ملاحظة اختيارية على المرحلة"
      },
      "notes": {
        "type": "string",
        "deprecated": true,
        "description": "alias قديم لـ note"
      },
      "signature": {
        "$ref": "#/components/schemas/StageSubmissionSignature"
      }
    },
    "example": {
      "form_id": "leave_process_auth",
      "form_name": "الوثائق المطلوبة للمواطن",
      "widgets": [
        {
          "widget_type": "text_field",
          "data": {
            "id": "student_first_name",
            "label": "اسم الطالب",
            "is_required": true
          },
          "value": "روان"
        }
      ],
      "templates": [],
      "note": ""
    }
  },
  "TransactionOutput": {
    "type": "object",
    "properties": {
      "id": {
        "type": "integer",
        "example": 12
      },
      "code": {
        "type": "string",
        "example": "process-5-v1"
      },
      "user_id": {
        "type": "integer",
        "example": 3
      },
      "status": {
        "type": "string",
        "enum": [
          "draft",
          "submitted",
          "in_progress",
          "completed",
          "rejected"
        ],
        "example": "draft"
      },
      "data": {
        "$ref": "#/components/schemas/TransactionDraftFormData"
      },
      "first_name": {
        "type": "string",
        "nullable": true,
        "example": "أحمد"
      },
      "last_name": {
        "type": "string",
        "nullable": true,
        "example": "محمد"
      },
      "father_name": {
        "type": "string",
        "nullable": true,
        "example": "علي"
      },
      "mother_name": {
        "type": "string",
        "nullable": true,
        "example": "فاطمة"
      },
      "national_id": {
        "type": "string",
        "nullable": true,
        "example": "12345678901"
      },
      "version": {
        "type": "integer",
        "example": 1
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
  "TransactionFirstStageContent": {
    "type": "object",
    "description": "محتوى مرحلة التقديم (AUTH) كما سُجّل في transaction.data",
    "properties": {
      "stage_name": {
        "type": "string",
        "nullable": true,
        "example": "تقديم الطلب"
      },
      "form_id": {
        "type": "string",
        "nullable": true,
        "example": "leave_process_auth"
      },
      "form_name": {
        "type": "string",
        "nullable": true,
        "example": "الوثائق المطلوبة للمواطن"
      },
      "decision": {
        "type": "string",
        "nullable": true,
        "example": null
      },
      "note": {
        "type": "string",
        "example": ""
      },
      "rejection_reason": {
        "type": "string",
        "nullable": true,
        "example": null
      },
      "completed_by": {
        "type": "integer",
        "example": 3
      },
      "completed_at": {
        "type": "string",
        "nullable": true,
        "example": "15/01/2026",
        "description": "صيغة dd/mm/yyyy"
      },
      "widgets": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "widget_type": {
              "type": "string",
              "example": "text_field"
            },
            "data": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string",
                  "example": "student_first_name"
                },
                "label": {
                  "type": "string",
                  "example": "اسم الطالب"
                },
                "is_required": {
                  "type": "boolean",
                  "example": true
                }
              }
            },
            "value": {
              "description": "قيمة الحقل كما سُجّلت عند التقديم"
            }
          }
        }
      },
      "templates": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id_template": {
              "type": "integer",
              "nullable": true,
              "example": 1
            },
            "value": {
              "type": "object",
              "example": {
                "student_name": "روان"
              }
            }
          }
        }
      }
    }
  },
  "TransactionFirstStageResponse": {
    "type": "object",
    "properties": {
      "transaction_id": {
        "type": "integer",
        "example": 42
      },
      "stage_code": {
        "type": "string",
        "example": "Activity_0wvfirz"
      },
      "stage_name": {
        "type": "string",
        "example": "تقديم الطلب"
      },
      "auth_type": {
        "type": "string",
        "enum": [
          "AUTH",
          "NOAUTH"
        ],
        "example": "AUTH"
      },
      "completed_by": {
        "type": "integer",
        "example": 3
      },
      "content": {
        "$ref": "#/components/schemas/TransactionFirstStageContent"
      }
    }
  },
  "TransactionFirstStageEnvelope": {
    "allOf": [
      {
        "$ref": "#/components/schemas/ApiSuccessResponse"
      },
      {
        "type": "object",
        "properties": {
          "message": {
            "type": "string",
            "example": "تم جلب محتوى المرحلة الأولى بنجاح"
          },
          "data": {
            "$ref": "#/components/schemas/TransactionFirstStageResponse"
          }
        }
      }
    ],
    "example": {
      "success": true,
      "status_code": 200,
      "message": "تم جلب محتوى المرحلة الأولى بنجاح",
      "data": {
        "transaction_id": 42,
        "stage_code": "Activity_0wvfirz",
        "stage_name": "تقديم الطلب",
        "auth_type": "AUTH",
        "completed_by": 3,
        "content": {
          "stage_name": "تقديم الطلب",
          "form_id": "leave_process_auth",
          "form_name": "الوثائق المطلوبة للمواطن",
          "decision": null,
          "note": "",
          "rejection_reason": null,
          "completed_by": 3,
          "completed_at": "15/01/2026",
          "widgets": [
            {
              "widget_type": "text_field",
              "data": {
                "id": "student_first_name",
                "label": "اسم الطالب",
                "is_required": true
              },
              "value": "روان"
            },
            {
              "widget_type": "text_field",
              "data": {
                "id": "student_father_name",
                "label": "اسم الأب",
                "is_required": true
              },
              "value": "أحمد"
            },
            {
              "widget_type": "file_picker",
              "data": {
                "id": "birth_certificate",
                "label": "شهادة الميلاد",
                "is_required": true
              },
              "value": [
                {
                  "path": "/uploads/1779540194357-birth-cert.pdf",
                  "url": "http://localhost:4000/uploads/1779540194357-birth-cert.pdf"
                }
              ]
            }
          ],
          "templates": [
            {
              "id_template": 1,
              "id_document_instance": 55,
              "generated_pdf_path": "/uploads/final/tx-42-template.pdf",
              "value": {
                "student_name": "روان",
                "father_name": "أحمد"
              }
            }
          ]
        }
      }
    }
  },
  "UserTransactionListItem": {
    "type": "object",
    "properties": {
      "transaction_id": {
        "type": "integer",
        "example": 42
      },
      "id_process": {
        "type": "string",
        "nullable": true,
        "example": "TX-2026-00042"
      },
      "process_definition_name": {
        "type": "string",
        "nullable": true,
        "example": "طلب شهادة ميلاد"
      },
      "stage_name": {
        "type": "string",
        "nullable": true,
        "example": "مراجعة الدائرة"
      },
      "progress_percent": {
        "type": "integer",
        "minimum": 0,
        "maximum": 100,
        "example": 40
      },
      "priority": {
        "type": "integer",
        "example": 1
      },
      "is_complaint": {
        "type": "boolean",
        "example": true,
        "description": "true إذا كانت معاملة العملية شكوى"
      },
      "status": {
        "type": "string",
        "enum": [
          "draft",
          "submitted",
          "in_progress",
          "completed",
          "rejected"
        ],
        "example": "in_progress"
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "example": "2026-05-01T10:00:00.000Z"
      },
      "updated_at": {
        "type": "string",
        "format": "date-time",
        "example": "2026-05-20T14:30:00.000Z"
      }
    },
    "example": {
      "transaction_id": 42,
      "id_process": "TX-2026-00042",
      "process_definition_name": "طلب شهادة ميلاد",
      "stage_name": "مراجعة الدائرة",
      "progress_percent": 40,
      "priority": 1,
      "is_complaint": true,
      "status": "in_progress",
      "created_at": "2026-05-01T10:00:00.000Z",
      "updated_at": "2026-05-20T14:30:00.000Z"
    }
  },
  "UserTransactionCountsResponse": {
    "allOf": [
      {
        "$ref": "#/components/schemas/ApiSuccessResponse"
      },
      {
        "type": "object",
        "properties": {
          "message": {
            "type": "string",
            "example": "تم جلب أعداد معاملاتك بنجاح"
          },
          "data": {
            "type": "object",
            "properties": {
              "completed": {
                "type": "integer",
                "example": 8,
                "description": "عدد المعاملات المكتملة"
              },
              "in_progress": {
                "type": "integer",
                "example": 3,
                "description": "submitted + in_progress (قيد المعالجة + قيد التنفيذ)"
              },
              "total": {
                "type": "integer",
                "example": 11,
                "description": "completed + in_progress"
              }
            }
          }
        }
      }
    ],
    "example": {
      "success": true,
      "status_code": 200,
      "message": "تم جلب أعداد معاملاتك بنجاح",
      "data": {
        "completed": 8,
        "in_progress": 3,
        "total": 11
      }
    }
  },
  "UserTransactionsListResponse": {
    "allOf": [
      {
        "$ref": "#/components/schemas/ApiSuccessResponse"
      },
      {
        "type": "object",
        "properties": {
          "message": {
            "type": "string",
            "example": "تم جلب معاملاتك بنجاح"
          },
          "data": {
            "type": "object",
            "properties": {
              "items": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/UserTransactionListItem"
                }
              },
              "pagination": {
                "type": "object"
              }
            }
          }
        }
      }
    ],
    "example": {
      "success": true,
      "status_code": 200,
      "message": "تم جلب معاملاتك بنجاح",
      "data": {
        "items": [
          {
            "transaction_id": 42,
            "id_process": "TX-2026-00042",
            "process_definition_name": "طلب شهادة ميلاد",
            "stage_name": "مراجعة الدائرة",
            "progress_percent": 40,
            "priority": 1,
            "is_complaint": true,
            "status": "in_progress",
            "created_at": "2026-05-01T10:00:00.000Z",
            "updated_at": "2026-05-20T14:30:00.000Z"
          }
        ],
        "pagination": {
          "page": 1,
          "limit": 10,
          "total": 1,
          "total_pages": 1,
          "has_next": false,
          "has_prev": false
        }
      }
    }
  },
  "TransactionDraftWidgetWithValue": {
    "type": "object",
    "required": [
      "widget_type",
      "data",
      "value"
    ],
    "properties": {
      "widget_type": {
        "type": "string",
        "enum": [
          "text_field",
          "date_picker",
          "dropdown",
          "radio_group",
          "check_list",
          "file_picker"
        ],
        "example": "text_field"
      },
      "data": {
        "type": "object",
        "description": "إعدادات الودجت كما في stage_config",
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
          }
        },
        "additionalProperties": true
      },
      "value": {
        "description": "قيمة المسودة — مطلوب وجود المفتاح لكل ودجت (نص، تاريخ، مفتاح خيار، مصفوفة مفاتيح، مسارات ملفات)",
        "oneOf": [
          {
            "type": "string",
            "nullable": true,
            "example": "0912345678"
          },
          {
            "type": "array",
            "items": {
              "type": "string"
            },
            "example": [
              "id_copy",
              "proof_address"
            ]
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "examples": {
      "text_field": {
        "summary": "text_field",
        "value": {
          "widget_type": "text_field",
          "data": {
            "id": "citizen_phone",
            "label": "رقم الموبايل",
            "is_required": true,
            "input_type": "phone",
            "regex": "^09[0-9]{8}$",
            "max_length": 10,
            "min_length": 10
          },
          "value": "0912345678"
        }
      },
      "date_picker": {
        "summary": "date_picker — مطلق",
        "value": {
          "widget_type": "date_picker",
          "data": {
            "id": "birth_date",
            "label": "تاريخ الميلاد",
            "is_required": true,
            "min_date": "1950-01-01",
            "max_date": "2010-12-31"
          },
          "value": "2000-05-15"
        }
      },
      "date_picker_today": {
        "summary": "date_picker — max=today",
        "value": {
          "widget_type": "date_picker",
          "data": {
            "id": "birth_date",
            "label": "تاريخ الولادة",
            "is_required": true,
            "min_date": "1900-01-01",
            "max_date": "today"
          },
          "value": "2000-05-15"
        }
      },
      "date_picker_relative_months": {
        "summary": "date_picker — قبل 4 أشهر / بعد 7 أشهر",
        "value": {
          "widget_type": "date_picker",
          "data": {
            "id": "window_months",
            "label": "نافذة أشهر حول اليوم",
            "is_required": true,
            "min_date": {
              "type": "relative",
              "years": 0,
              "months": -4,
              "days": 0
            },
            "max_date": {
              "type": "relative",
              "years": 0,
              "months": 7,
              "days": 0
            }
          },
          "value": "2026-06-01"
        }
      },
      "date_picker_relative_years": {
        "summary": "date_picker — عمر ≥ 18",
        "value": {
          "widget_type": "date_picker",
          "data": {
            "id": "adult_birth_date",
            "label": "تاريخ ولادة (عمر ≥ 18)",
            "is_required": true,
            "min_date": {
              "type": "relative",
              "years": -120
            },
            "max_date": {
              "type": "relative",
              "years": -18
            }
          },
          "value": "2000-05-15"
        }
      },
      "date_picker_mixed": {
        "summary": "date_picker — مزيج وحدات + today",
        "value": {
          "widget_type": "date_picker",
          "data": {
            "id": "mixed_units",
            "label": "مزيج سنوات/أشهر/أيام",
            "is_required": false,
            "min_date": {
              "type": "relative",
              "years": -1,
              "months": -2,
              "days": -3
            },
            "max_date": {
              "type": "today"
            }
          },
          "value": "2026-01-10"
        }
      },
      "dropdown": {
        "summary": "dropdown",
        "value": {
          "widget_type": "dropdown",
          "data": {
            "id": "governorate",
            "label": "المحافظة",
            "is_required": true,
            "options": [
              {
                "key": "damascus",
                "value": "دمشق"
              },
              {
                "key": "aleppo",
                "value": "حلب"
              },
              {
                "key": "homs",
                "value": "حمص"
              }
            ]
          },
          "value": "damascus"
        }
      },
      "check_list": {
        "summary": "check_list",
        "value": {
          "widget_type": "check_list",
          "data": {
            "id": "required_documents",
            "label": "الوثائق المطلوبة",
            "is_required": true,
            "min_selected": 1,
            "max_selected": 3,
            "options": [
              {
                "key": "id_copy",
                "value": "صورة الهوية"
              },
              {
                "key": "proof_address",
                "value": "إثبات سكن"
              },
              {
                "key": "photo",
                "value": "صورة شخصية"
              }
            ]
          },
          "value": [
            "id_copy",
            "proof_address"
          ]
        }
      },
      "file_picker": {
        "summary": "file_picker",
        "value": {
          "widget_type": "file_picker",
          "data": {
            "id": "national_id_files",
            "label": "وثائق الهوية الشخصية",
            "is_required": true,
            "max_size_mb": 5,
            "allowed_extensions": [
              "pdf",
              "png",
              "jpg"
            ],
            "allow_multiple": true,
            "type_doc_id": 3
          },
          "value": [
            {
              "path": "/uploads/1781283413699-332269555.pdf",
              "url": "http://localhost:4000/uploads/1781283413699-332269555.pdf",
              "document_id": 3,
              "type_doc_id": 3,
              "original_name": "national_id_files"
            }
          ]
        }
      },
      "radio_group_gateway": {
        "summary": "radio_group (Camunda gateway)",
        "value": {
          "widget_type": "radio_group",
          "data": {
            "id": "gateway",
            "label": "قرار المسار",
            "is_required": true,
            "is_gateway": true,
            "options": [
              {
                "key": "approved",
                "value": "موافق"
              },
              {
                "key": "rejected",
                "value": "مرفوض"
              }
            ]
          },
          "value": "approved"
        }
      }
    }
  },
  "UnifiedFormTemplateWithValue": {
    "type": "object",
    "required": [
      "id",
      "value"
    ],
    "additionalProperties": false,
    "properties": {
      "id": {
        "type": "integer",
        "example": 1,
        "description": "document_templates.id — من stage_config.config_json.template[]"
      },
      "value": {
        "type": "object",
        "additionalProperties": true,
        "example": {
          "employee": "روان سرحان",
          "job": "معلمة",
          "department": "دائرة التربية"
        },
        "description": "قيم حقول PDF — تُخزَّن في document_instance.data_json"
      }
    }
  },
  "UnifiedFormPayload": {
    "type": "object",
    "required": [
      "form_id",
      "form_name",
      "widgets"
    ],
    "additionalProperties": false,
    "description": "القالب الموحّد لـ submit / complete / submit-documents — stage_config.config_json + value لكل widget/template. مرفوض: fields[], files[], variables, employee, template_id, values, stage_name",
    "properties": {
      "form_id": {
        "type": "string",
        "example": "leave_process_auth",
        "description": "يجب أن يطابق stage_config.config_json.form_id"
      },
      "form_name": {
        "type": "string",
        "example": "الوثائق المطلوبة للمواطن",
        "description": "يجب أن يطابق stage_config.config_json.form_name"
      },
      "widgets": {
        "type": "array",
        "minItems": 0,
        "items": {
          "$ref": "#/components/schemas/TransactionDraftWidgetWithValue"
        },
        "description": "نفس config_json.widgets من stage_config/create + value — [] إذا المرحلة templates فقط"
      },
      "templates": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/UnifiedFormTemplateWithValue"
        },
        "default": []
      },
      "note": {
        "type": "string",
        "example": "",
        "description": "ملاحظة اختيارية"
      },
      "expected_version": {
        "type": "integer",
        "example": 1,
        "description": "transaction.version — optimistic concurrency (اختياري)"
      }
    }
  },
  "SubmitTransactionPayload": {
    "allOf": [
      {
        "$ref": "#/components/schemas/UnifiedFormPayload"
      }
    ],
    "description": "POST /transaction/submit/{transactionId} — بدون signature وبدون decision (يُثبت submit على السيرفر). احصل على القالب الفارغ من GET /stage_config/config/{processId}. أنشئ/حدّث المسودة أولاً عبر POST /transaction/updateDraft/{processId}",
    "example": {
      "form_id": "leave_process_auth",
      "form_name": "الوثائق المطلوبة للمواطن",
      "widgets": [
        {
          "widget_type": "text_field",
          "data": {
            "id": "student_first_name",
            "label": "اسم الطالب",
            "is_required": true,
            "input_type": "text",
            "max_length": 100,
            "min_length": 2
          },
          "value": "روان"
        },
        {
          "widget_type": "text_field",
          "data": {
            "id": "student_last_name",
            "label": "الاسم الأخير",
            "is_required": true,
            "input_type": "text",
            "max_length": 100,
            "min_length": 2
          },
          "value": "سرحان"
        },
        {
          "widget_type": "text_field",
          "data": {
            "id": "father_name",
            "label": "اسم الأب",
            "is_required": true,
            "input_type": "text",
            "max_length": 100,
            "min_length": 2
          },
          "value": "أحمد"
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
                "key": "HAM",
                "value": "حماة"
              },
              {
                "key": "ALE",
                "value": "حلب"
              }
            ]
          },
          "value": "DAM"
        },
        {
          "widget_type": "file_picker",
          "data": {
            "id": "national_id_files",
            "label": "وثائق الهوية الشخصية",
            "is_required": true,
            "max_size_mb": 5,
            "allowed_extensions": [
              "pdf",
              "png",
              "jpg"
            ],
            "allow_multiple": true,
            "type_doc_id": 3
          },
          "value": [
            {
              "path": "/uploads/1781283413699-332269555.pdf",
              "url": "http://localhost:4000/uploads/1781283413699-332269555.pdf",
              "type_doc_id": 3,
              "original_name": "national_id_files"
            }
          ]
        }
      ],
      "templates": [],
      "note": ""
    }
  },
  "SubmitTransactionByProcessPayload": {
    "allOf": [
      {
        "$ref": "#/components/schemas/UnifiedFormPayload"
      }
    ],
    "description": "POST /transaction/submit/process/{processId} — تقديم بمعرّف العملية في خطوة واحدة. يحمل نفس الـ form payload (form_id, form_name, widgets, templates, note) بالإضافة إلى حقول الهوية (first_name, last_name, father_name, mother_name, national_id) على جذر الـ body — تُخزَّن في أعمدة المعاملة، بينما يُخزَّن الـ form في data كما هو. مواطن: بدون signature. موظف: أضف signature: { challenge_id, signature }.",
    "properties": {
      "first_name": {
        "type": "string",
        "maxLength": 100,
        "example": "أحمد"
      },
      "last_name": {
        "type": "string",
        "maxLength": 100,
        "example": "محمد"
      },
      "father_name": {
        "type": "string",
        "maxLength": 100,
        "example": "علي"
      },
      "mother_name": {
        "type": "string",
        "maxLength": 100,
        "example": "فاطمة"
      },
      "national_id": {
        "type": "string",
        "maxLength": 50,
        "pattern": "^[0-9]*$",
        "example": "12345678901"
      }
    },
    "example": {
      "first_name": "أحمد",
      "last_name": "محمد",
      "father_name": "علي",
      "mother_name": "فاطمة",
      "national_id": "12345678901",
      "form_id": "leave_process_auth",
      "form_name": "الوثائق المطلوبة للمواطن",
      "widgets": [
        {
          "widget_type": "text_field",
          "data": {
            "id": "student_first_name",
            "label": "اسم الطالب",
            "is_required": true,
            "input_type": "text",
            "max_length": 100,
            "min_length": 2
          },
          "value": "روان"
        }
      ],
      "templates": [],
      "note": ""
    }
  },
  "TransactionDraftFormData": {
    "type": "object",
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
        "items": {
          "$ref": "#/components/schemas/TransactionDraftWidgetWithValue"
        }
      }
    }
  },
  "TransactionDraftUpsertInput": {
    "type": "object",
    "required": [
      "data"
    ],
    "properties": {
      "data": {
        "$ref": "#/components/schemas/TransactionDraftFormData"
      }
    },
    "example": {
      "data": {
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
            },
            "value": "0912345678"
          },
          {
            "widget_type": "date_picker",
            "data": {
              "id": "birth_date",
              "label": "تاريخ الميلاد",
              "is_required": true,
              "min_date": "1950-01-01",
              "max_date": "2010-12-31"
            },
            "value": "2000-05-15"
          },
          {
            "widget_type": "dropdown",
            "data": {
              "id": "governorate",
              "label": "المحافظة",
              "is_required": true,
              "options": [
                {
                  "key": "damascus",
                  "value": "دمشق"
                },
                {
                  "key": "aleppo",
                  "value": "حلب"
                },
                {
                  "key": "homs",
                  "value": "حمص"
                }
              ]
            },
            "value": "damascus"
          },
          {
            "widget_type": "check_list",
            "data": {
              "id": "required_documents",
              "label": "الوثائق المطلوبة",
              "is_required": true,
              "min_selected": 1,
              "max_selected": 3,
              "options": [
                {
                  "key": "id_copy",
                  "value": "صورة الهوية"
                },
                {
                  "key": "proof_address",
                  "value": "إثبات سكن"
                },
                {
                  "key": "photo",
                  "value": "صورة شخصية"
                }
              ]
            },
            "value": [
              "id_copy",
              "proof_address"
            ]
          },
          {
            "widget_type": "file_picker",
            "data": {
              "id": "national_id_files",
              "label": "وثائق الهوية الشخصية",
              "is_required": true,
              "max_size_mb": 5,
              "allowed_extensions": [
                "pdf",
                "png",
                "jpg"
              ],
              "allow_multiple": true,
              "type_doc_id": 1
            },
            "value": [
              "/uploads/id-front.pdf",
              "/uploads/id-back.png"
            ]
          }
        ]
      }
    }
  },
  "TransactionIdentityInput": {
    "type": "object",
    "minProperties": 1,
    "properties": {
      "first_name": {
        "type": "string",
        "nullable": true,
        "example": "أحمد"
      },
      "last_name": {
        "type": "string",
        "nullable": true,
        "example": "محمد"
      },
      "father_name": {
        "type": "string",
        "nullable": true,
        "example": "علي"
      },
      "mother_name": {
        "type": "string",
        "nullable": true,
        "example": "فاطمة"
      },
      "national_id": {
        "type": "string",
        "nullable": true,
        "example": "12345678901"
      }
    },
    "additionalProperties": false,
    "example": {
      "first_name": "أحمد",
      "last_name": "محمد",
      "father_name": "علي",
      "mother_name": "فاطمة",
      "national_id": "12345678901"
    }
  },
  "TransactionDraftUpsertResult": {
    "type": "object",
    "properties": {
      "isNew": {
        "type": "boolean",
        "example": true
      },
      "draft": {
        "$ref": "#/components/schemas/TransactionOutput"
      }
    }
  },
  "TransactionDraftCreateResult": {
    "type": "object",
    "properties": {
      "isNew": {
        "type": "boolean",
        "example": true
      },
      "draft": {
        "$ref": "#/components/schemas/TransactionOutput"
      }
    }
  },
  "TransactionDraftUpdateResult": {
    "type": "object",
    "properties": {
      "isNew": {
        "type": "boolean",
        "example": false
      },
      "draft": {
        "$ref": "#/components/schemas/TransactionOutput"
      }
    }
  },
  "IntegrityChainLink": {
    "type": "object",
    "properties": {
      "signature_order": {
        "type": "integer",
        "example": 1
      },
      "stage_id": {
        "type": "integer",
        "example": 10
      },
      "stage_code": {
        "type": "string",
        "example": "AUTH_STAGE"
      },
      "stage_data_hash": {
        "type": "string"
      },
      "cumulative_hash": {
        "type": "string"
      },
      "link_hash": {
        "type": "string"
      },
      "previous_link_hash": {
        "type": "string",
        "nullable": true
      },
      "digital_signature_id": {
        "type": "integer",
        "example": 4
      },
      "signed_at": {
        "type": "string",
        "format": "date-time"
      }
    }
  },
  "IntegrityChainQrPayload": {
    "type": "object",
    "properties": {
      "v": {
        "type": "integer",
        "example": 1
      },
      "tx": {
        "type": "integer",
        "example": 12
      },
      "genesis": {
        "type": "string"
      },
      "head": {
        "type": "string",
        "nullable": true
      },
      "links": {
        "type": "integer",
        "example": 2
      },
      "verify": {
        "type": "string",
        "example": "http://localhost:4000/api/transaction/12/integrity-chain/verify"
      }
    }
  },
  "IntegrityChainVerifyResult": {
    "type": "object",
    "properties": {
      "transaction_id": {
        "type": "integer",
        "example": 12
      },
      "transaction_status": {
        "type": "string",
        "example": "in_progress"
      },
      "genesis_hash": {
        "type": "string",
        "nullable": true
      },
      "schema_version": {
        "type": "string",
        "example": "1.0"
      },
      "chain_status": {
        "type": "string",
        "enum": [
          "incomplete",
          "valid",
          "forged"
        ],
        "example": "valid"
      },
      "total_links": {
        "type": "integer",
        "example": 2
      },
      "head_hash": {
        "type": "string",
        "nullable": true
      },
      "valid": {
        "type": "boolean",
        "example": true
      },
      "issues": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "verified_at": {
        "type": "string",
        "format": "date-time"
      }
    }
  },
  "IntegrityChainResponse": {
    "type": "object",
    "properties": {
      "transaction_id": {
        "type": "integer",
        "example": 12
      },
      "transaction_status": {
        "type": "string",
        "example": "completed"
      },
      "genesis_hash": {
        "type": "string"
      },
      "schema_version": {
        "type": "string",
        "example": "1.0"
      },
      "chain_status": {
        "type": "string",
        "enum": [
          "incomplete",
          "valid",
          "forged"
        ]
      },
      "total_links": {
        "type": "integer",
        "example": 2
      },
      "head_hash": {
        "type": "string",
        "nullable": true
      },
      "qr_payload": {
        "$ref": "#/components/schemas/IntegrityChainQrPayload"
      },
      "links": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/IntegrityChainLink"
        }
      },
      "last_verification": {
        "$ref": "#/components/schemas/IntegrityChainVerifyResult"
      }
    }
  },
  "CertificateTransactionHistoryData": {
    "type": "object",
    "description": "applicant + stages[] — نفس transaction_history في task details",
    "properties": {
      "applicant": {
        "type": "object",
        "properties": {
          "first_name_employee": {
            "type": "string"
          },
          "father_name_employee": {
            "type": "string"
          },
          "last_name_employee": {
            "type": "string"
          },
          "national_id_employee": {
            "type": "string"
          },
          "phone_number_employee": {
            "type": "string"
          }
        }
      },
      "stages": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "stage_name": {
              "type": "string",
              "nullable": true
            },
            "form_id": {
              "type": "string"
            },
            "form_name": {
              "type": "string"
            },
            "widgets": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/TransactionDraftWidgetWithValue"
              }
            },
            "templates": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/CompleteTaskTemplateResponseItem"
              }
            },
            "note": {
              "type": "string"
            },
            "decision": {
              "type": "string",
              "nullable": true
            },
            "completed_by": {
              "type": "integer",
              "nullable": true
            },
            "completed_at": {
              "type": "string",
              "nullable": true
            },
            "id_document_instance": {
              "type": "integer",
              "nullable": true,
              "description": "يُملأ على مرحلة GENERATE_PDF بعد نجاح التوليد"
            },
            "generated_pdf_path": {
              "type": "string",
              "nullable": true
            },
            "generated_pdf_url": {
              "type": "string",
              "nullable": true
            }
          }
        }
      }
    }
  },
  "CertificateTransactionHistoryBlock": {
    "type": "object",
    "properties": {
      "process_name": {
        "type": "string",
        "nullable": true,
        "example": "توكيل تربوي"
      },
      "priority": {
        "type": "integer",
        "enum": [
          1,
          2,
          3
        ],
        "example": 1
      },
      "data": {
        "$ref": "#/components/schemas/CertificateTransactionHistoryData"
      }
    }
  },
  "CertificateIntegrityChainSummary": {
    "type": "object",
    "properties": {
      "genesis_hash": {
        "type": "string"
      },
      "head_hash": {
        "type": "string",
        "nullable": true
      },
      "chain_status": {
        "type": "string",
        "enum": [
          "incomplete",
          "valid",
          "forged"
        ],
        "example": "valid"
      },
      "total_links": {
        "type": "integer",
        "example": 2
      },
      "qr_payload": {
        "$ref": "#/components/schemas/IntegrityChainQrPayload"
      },
      "verify_url": {
        "type": "string",
        "nullable": true,
        "example": "http://localhost:4000/api/transaction/12/integrity-chain/verify"
      }
    }
  },
  "FinalDocumentRecord": {
    "type": "object",
    "nullable": true,
    "properties": {
      "id": {
        "type": "integer",
        "example": 1
      },
      "file_path": {
        "type": "string",
        "example": "/uploads/final-documents/final-txn-12.pdf"
      },
      "file_url": {
        "type": "string",
        "example": "/uploads/final-documents/final-txn-12.pdf"
      },
      "original_name": {
        "type": "string",
        "example": "certificate-12.pdf"
      },
      "mime_type": {
        "type": "string",
        "example": "application/pdf"
      },
      "file_size_bytes": {
        "type": "integer",
        "nullable": true,
        "example": 245760
      },
      "generated_at": {
        "type": "string",
        "format": "date-time",
        "example": "2026-08-05T18:30:00.000Z"
      },
      "qr_payload_snapshot": {
        "oneOf": [
          {
            "$ref": "#/components/schemas/IntegrityChainQrPayload"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "example": {
      "id": 3,
      "file_path": "/uploads/final-documents/final-txn-12.pdf",
      "file_url": "/uploads/final-documents/final-txn-12.pdf",
      "original_name": "certificate-12.pdf",
      "mime_type": "application/pdf",
      "file_size_bytes": 245760,
      "generated_at": "2026-08-05T18:30:00.000Z",
      "qr_payload_snapshot": {
        "v": 1,
        "tx": 12,
        "genesis": "a1b2c3",
        "head": "d4e5f6",
        "links": 2
      }
    }
  },
  "MyFinalDocumentListItem": {
    "type": "object",
    "description": "وثيقة نهائية لمعاملة يملكها المستخدم المسجّل",
    "properties": {
      "id": {
        "type": "integer",
        "example": 3
      },
      "transaction_id": {
        "type": "integer",
        "example": 12
      },
      "file_path": {
        "type": "string",
        "example": "/uploads/final-documents/final-txn-12.pdf"
      },
      "file_url": {
        "type": "string",
        "example": "/uploads/final-documents/final-txn-12.pdf"
      },
      "original_name": {
        "type": "string",
        "nullable": true,
        "example": "certificate-12.pdf"
      },
      "mime_type": {
        "type": "string",
        "example": "application/pdf"
      },
      "file_size_bytes": {
        "type": "integer",
        "nullable": true,
        "example": 245760
      },
      "generated_at": {
        "type": "string",
        "format": "date-time",
        "example": "2026-08-05T18:30:00.000Z"
      },
      "transaction": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "example": 12
          },
          "id_process": {
            "type": "integer",
            "nullable": true,
            "example": 4
          },
          "code": {
            "type": "string",
            "nullable": true,
            "example": "LEAVE_PROCESS_01"
          },
          "status": {
            "type": "string",
            "nullable": true,
            "example": "completed"
          }
        }
      }
    }
  },
  "MyFinalDocumentsResponse": {
    "type": "object",
    "description": "قائمة الوثائق النهائية لمعاملات المستخدم مع ترقيم صفحات",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/MyFinalDocumentListItem"
        }
      },
      "pagination": {
        "type": "object",
        "properties": {
          "page": {
            "type": "integer",
            "example": 1
          },
          "limit": {
            "type": "integer",
            "example": 20
          },
          "total": {
            "type": "integer",
            "example": 2
          },
          "total_pages": {
            "type": "integer",
            "example": 1
          },
          "has_next": {
            "type": "boolean",
            "example": false
          },
          "has_prev": {
            "type": "boolean",
            "example": false
          }
        }
      }
    },
    "example": {
      "items": [
        {
          "id": 3,
          "transaction_id": 12,
          "file_path": "/uploads/final-documents/final-txn-12.pdf",
          "file_url": "/uploads/final-documents/final-txn-12.pdf",
          "original_name": "certificate-12.pdf",
          "mime_type": "application/pdf",
          "file_size_bytes": 245760,
          "generated_at": "2026-08-05T18:30:00.000Z",
          "transaction": {
            "id": 12,
            "id_process": 4,
            "code": "LEAVE_PROCESS_01",
            "status": "completed"
          }
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 1,
        "total_pages": 1,
        "has_next": false,
        "has_prev": false
      }
    }
  },
  "CertificateSigner": {
    "type": "object",
    "description": "موقّع واحد من سلسلة التواقيع — مرحلة + هوية الموقّع",
    "properties": {
      "signature_order": {
        "type": "integer",
        "example": 1
      },
      "stage_code": {
        "type": "string",
        "nullable": true,
        "example": "Activity_review"
      },
      "stage_name": {
        "type": "string",
        "nullable": true,
        "example": "مراجعة الموظف"
      },
      "signed_at": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "user_id": {
        "type": "integer",
        "nullable": true,
        "example": 8
      },
      "first_name": {
        "type": "string",
        "nullable": true,
        "example": "سامر"
      },
      "last_name": {
        "type": "string",
        "nullable": true,
        "example": "الأحمد"
      },
      "father_name": {
        "type": "string",
        "nullable": true,
        "example": "خالد"
      },
      "mother_name": {
        "type": "string",
        "nullable": true,
        "example": "هدى"
      },
      "national_id": {
        "type": "string",
        "nullable": true,
        "example": "04259204010"
      }
    }
  },
  "CertificateBundleResponse": {
    "type": "object",
    "description": "بيانات الشهادة للطباعة — للفرونت لبناء PDF + QR",
    "properties": {
      "transaction_id": {
        "type": "integer",
        "example": 12
      },
      "status": {
        "type": "string",
        "example": "completed"
      },
      "process_name": {
        "type": "string",
        "nullable": true,
        "example": "معاملة إجازة"
      },
      "process_priority": {
        "type": "integer",
        "enum": [
          1,
          2,
          3
        ],
        "example": 1
      },
      "submitted_at": {
        "type": "string",
        "example": "12/06/2026"
      },
      "completed_at": {
        "type": "string",
        "example": "18/06/2026"
      },
      "signers": {
        "type": "array",
        "description": "سلسلة التواقيع مرتبة — من وقّع كل مرحلة مع بيانات هويته",
        "items": {
          "$ref": "#/components/schemas/CertificateSigner"
        }
      },
      "transaction_history": {
        "$ref": "#/components/schemas/CertificateTransactionHistoryBlock"
      },
      "integrity_chain": {
        "$ref": "#/components/schemas/CertificateIntegrityChainSummary"
      },
      "final_document": {
        "$ref": "#/components/schemas/FinalDocumentRecord"
      }
    }
  },
  "IntegrityChainVerifyRequest": {
    "type": "object",
    "properties": {
      "head_hash": {
        "type": "string",
        "description": "اختياري — head hash من QR للمقارنة"
      },
      "genesis_hash": {
        "type": "string",
        "description": "اختياري — genesis hash من QR للمقارنة"
      }
    }
  }
}
