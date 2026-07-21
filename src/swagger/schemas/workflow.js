module.exports = {
  "CompleteTaskPayload": {
    "allOf": [
      {
        "$ref": "#/components/schemas/UnifiedFormPayload"
      },
      {
        "type": "object",
        "required": [
          "decision"
        ],
        "properties": {
          "decision": {
            "type": "string",
            "enum": [
              "approve",
              "reject",
              "rejected"
            ],
            "example": "approve",
            "description": "قرار التوقيع USB — approve / reject"
          },
          "rejection_reason": {
            "type": "string",
            "example": null,
            "nullable": true,
            "description": "اختياري — سبب الرفض (يُفضَّل استخدام note)"
          },
          "note": {
            "type": "string",
            "example": "المستندات غير مكتملة",
            "description": "مطلوب عند decision = reject — يُرسل كإشعار لصاحب المعاملة"
          },
          "signature": {
            "$ref": "#/components/schemas/StageSubmissionSignature"
          },
          "assignments": {
            "type": "array",
            "description": "مطلوب إذا is_assignment=true — [{ organization_id, department_id, role_id }]. يُطابق OrgDeptRole نشط.",
            "items": {
              "type": "object",
              "required": [
                "organization_id",
                "department_id",
                "role_id"
              ],
              "properties": {
                "organization_id": {
                  "type": "integer",
                  "example": 1
                },
                "department_id": {
                  "type": "integer",
                  "example": 2
                },
                "role_id": {
                  "type": "integer",
                  "example": 3
                }
              }
            }
          }
        },
        "description": "POST /workflow/tasks/{taskId}/complete — config_json + value. مسار Camunda gateway من radio_group (is_gateway) داخل widgets — لا variables. idempotency_key يُولَّد من السيرفر ولا يُرسل في الطلب. assignments[] اختياري/إلزامي حسب is_assignment لاختيار الوجهة التالية."
      }
    ],
    "example": {
      "form_id": "leave_process_review",
      "form_name": "التشيك على المعلومات المدخلة",
      "widgets": [
        {
          "widget_type": "radio_group",
          "data": {
            "id": "decision",
            "label": "قرار الطلب",
            "is_required": true,
            "is_gateway": true,
            "options": [
              {
                "key": "الطلب مرفوض",
                "value": "الطلب مرفوض"
              },
              {
                "key": "الطلب مقبول",
                "value": "الطلب مقبول"
              }
            ]
          },
          "value": "الطلب مقبول"
        }
      ],
      "templates": [],
      "decision": "approve",
      "note": "",
      "signature": {
        "challenge_id": "3ad67615-8c89-4a5e-a758-217e9d85b6e6",
        "signature": "Bj7trXvyM9jfruXKttly27VY1xsVuqtKgcjfLf7fZrohjBGX0MwIFtYRMQ3nP5WHtbx0EFadm9rXy/RQqVw2Dg=="
      },
      "assignments": [
        {
          "organization_id": 1,
          "department_id": 2,
          "role_id": 3
        }
      ]
    }
  },
  "DocumentSubmitSigningChallengePayload": {
    "type": "object",
    "required": [
      "pin"
    ],
    "additionalProperties": false,
    "properties": {
      "pin": {
        "type": "string",
        "minLength": 6,
        "maxLength": 6,
        "pattern": "^[0-9]{6}$",
        "example": "123456",
        "description": "رمز PIN للموظف — decision ثابت approve على السيرفر"
      }
    },
    "example": {
      "pin": "123456"
    }
  },
  "DocumentSubmitCompletePayload": {
    "allOf": [
      {
        "$ref": "#/components/schemas/UnifiedFormPayload"
      },
      {
        "type": "object",
        "required": [
          "decision",
          "signature"
        ],
        "properties": {
          "decision": {
            "type": "string",
            "enum": [
              "approve"
            ],
            "example": "approve"
          },
          "signature": {
            "$ref": "#/components/schemas/StageSubmissionSignature"
          }
        },
        "description": "POST /workflow/tasks/{taskId}/submit-documents/complete — config_json + value + signature"
      }
    ],
    "example": {
      "form_id": "leave_process_sign_secondary",
      "form_name": "توقيع مدير دائرة الثانوي",
      "widgets": [],
      "templates": [],
      "decision": "approve",
      "note": "",
      "signature": {
        "challenge_id": "3ad67615-8c89-4a5e-a758-217e9d85b6e6",
        "signature": "Bj7trXvyM9jfruXKttly27VY1xsVuqtKgcjfLf7fZrohjBGX0MwIFtYRMQ3nP5WHtbx0EFadm9rXy/RQqVw2Dg=="
      }
    }
  },
  "CompleteTaskActionItem": {
    "type": "object",
    "required": [
      "name"
    ],
    "properties": {
      "name": {
        "type": "string",
        "example": "SEND_EMAIL"
      },
      "payload": {
        "type": "object"
      },
      "result": {
        "type": "object",
        "example": {
          "status": "queued"
        },
        "description": "اختياري — نتيجة متوقعة أو placeholder قبل التنفيذ"
      }
    }
  },
  "CompleteTaskTemplateResponseItem": {
    "type": "object",
    "properties": {
      "id": {
        "type": "integer",
        "example": 1
      },
      "id_template": {
        "type": "integer",
        "example": 1
      },
      "id_document_instance": {
        "type": "integer",
        "example": 5
      },
      "value": {
        "type": "object",
        "example": {
          "employee": "روان سرحان",
          "job": "معلمة"
        }
      },
      "generated_pdf_path": {
        "type": "string",
        "nullable": true,
        "example": "/uploads/generated-3-tpl1-inst5-123.pdf"
      },
      "path": {
        "type": "string",
        "nullable": true,
        "example": "/uploads/templates/form.pdf",
        "description": "مسار ملف القالب الأصلي"
      }
    }
  },
  "CompleteTaskData": {
    "type": "object",
    "description": "بيانات استجابة إكمال المهمة — mirrors الطلب (widgets + templates)",
    "properties": {
      "stage_name": {
        "type": "string",
        "example": "التشيك على المعلومات المدخلة"
      },
      "form_id": {
        "type": "string",
        "example": "leave_process_review"
      },
      "form_name": {
        "type": "string",
        "example": "التشيك على المعلومات المدخلة"
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
      "variables": {
        "type": "object",
        "properties": {
          "value": {
            "type": "string",
            "example": "approved",
            "description": "قيمة radio_group gateway — تُرسل لـ Camunda كـ ${value}"
          }
        }
      },
      "gateway_value": {
        "type": "string",
        "example": "approved",
        "description": "alias لـ variables.value"
      },
      "decision": {
        "type": "string",
        "example": "approve",
        "description": "قرار التوقيع USB"
      },
      "note": {
        "type": "string",
        "example": ""
      },
      "signature": {
        "$ref": "#/components/schemas/StageSubmissionSignature"
      },
      "idempotency_key": {
        "type": "string",
        "format": "uuid"
      },
      "idempotent_replay": {
        "type": "boolean",
        "example": false
      },
      "workflow_status": {
        "type": "string",
        "enum": [
          "running",
          "completed",
          "rejected"
        ],
        "example": "running"
      },
      "rejection_reason": {
        "type": "string",
        "nullable": true
      }
    },
    "example": {
      "stage_name": "التشيك على المعلومات المدخلة",
      "form_id": "leave_process_review",
      "form_name": "التشيك على المعلومات المدخلة",
      "widgets": [
        {
          "widget_type": "radio_group",
          "data": {
            "id": "gateway",
            "label": "قرار المسار",
            "is_gateway": true
          },
          "value": "approved"
        }
      ],
      "templates": [
        {
          "id": 1,
          "id_template": 1,
          "id_document_instance": 5,
          "value": {
            "employee": "روان سرحان"
          },
          "generated_pdf_path": "/uploads/generated-3-tpl1-inst5-123.pdf"
        }
      ],
      "variables": {
        "value": "approved"
      },
      "gateway_value": "approved",
      "decision": "approve",
      "note": "",
      "idempotency_key": "0dbc8ad0-2618-4be2-8080-07e13c862d9b",
      "idempotent_replay": false,
      "workflow_status": "running"
    }
  },
  "WorkflowTasksListResponse": {
    "allOf": [
      {
        "$ref": "#/components/schemas/ApiSuccessResponse"
      },
      {
        "type": "object",
        "properties": {
          "message": {
            "type": "string",
            "example": "تم جلب المهام بنجاح"
          },
          "data": {
            "type": "object",
            "properties": {
              "items": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/EmployeeTaskListItem"
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
      "message": "تم جلب المهام بنجاح",
      "data": {
        "items": [
          {
            "transaction_id": 1,
            "transaction_number": "STUTR-2026-001",
            "type": "طلبات الإجازة للموظف",
            "type_code": "STU_TR",
            "applicant_name": "أحمد علي محمد",
            "department": "دائرة مكتب المدير",
            "date": "12/06/2026",
            "progress_percent": 14,
            "status": "pending_pickup",
            "status_label": "بانتظار الاستلام",
            "task_id": "978bbc76-6650-11f1-ade6-2e8996ed1457",
            "task_name": "التشيك على المعلومات المدخلة",
            "process_name": "Leave Process",
            "process_priority": 1
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
  "EmployeeTaskListItem": {
    "type": "object",
    "description": "عنصر مهمة موظف — يُستخدم في GET /workflow/tasks و in-progress و pending-pickup و completed/by-department و rejected/by-department",
    "properties": {
      "transaction_id": {
        "type": "integer",
        "example": 1
      },
      "transaction_number": {
        "type": "string",
        "nullable": true,
        "example": "STUTR-2026-001"
      },
      "type": {
        "type": "string",
        "nullable": true,
        "example": "طلبات الإجازة للموظف",
        "description": "اسم نوع المعاملة"
      },
      "type_code": {
        "type": "string",
        "nullable": true,
        "example": "STU_TR"
      },
      "applicant_name": {
        "type": "string",
        "nullable": true,
        "example": "أحمد علي محمد"
      },
      "department": {
        "type": "string",
        "nullable": true,
        "example": "دائرة مكتب المدير"
      },
      "date": {
        "type": "string",
        "example": "12/06/2026",
        "description": "تاريخ إنشاء الطلب (يوم/شهر/سنة)"
      },
      "progress_percent": {
        "type": "integer",
        "minimum": 0,
        "maximum": 100,
        "example": 14
      },
      "status": {
        "type": "string",
        "enum": [
          "pending_pickup",
          "in_progress",
          "completed",
          "rejected"
        ],
        "example": "pending_pickup"
      },
      "status_label": {
        "type": "string",
        "example": "بانتظار الاستلام"
      },
      "task_id": {
        "type": "string",
        "nullable": true,
        "example": "978bbc76-6650-11f1-ade6-2e8996ed1457",
        "description": "معرّف مهمة Camunda — null للمعاملات المنجزة/المرفوضة"
      },
      "task_name": {
        "type": "string",
        "nullable": true,
        "example": "التشيك على المعلومات المدخلة",
        "description": "اسم المرحلة الحالية"
      },
      "process_name": {
        "type": "string",
        "nullable": true,
        "example": "Leave Process",
        "description": "اسم تعريف العملية (process_definitions.name)"
      },
      "process_priority": {
        "type": "integer",
        "enum": [
          1,
          2,
          3
        ],
        "example": 1,
        "description": "1=عالي، 2=متوسط، 3=منخفض"
      }
    }
  },
  "WorkflowTaskStatsResponse": {
    "allOf": [
      {
        "$ref": "#/components/schemas/ApiSuccessResponse"
      },
      {
        "type": "object",
        "properties": {
          "message": {
            "type": "string",
            "example": "تم جلب عدد المعاملات المنجزة لآخر شهر بنجاح"
          },
          "data": {
            "type": "object",
            "properties": {
              "count": {
                "type": "integer",
                "example": 12
              },
              "department_ids": {
                "type": "array",
                "items": {
                  "type": "integer"
                },
                "example": [
                  1,
                  2
                ]
              },
              "period": {
                "type": "object",
                "properties": {
                  "from_date": {
                    "type": "string",
                    "format": "date",
                    "example": "2026-04-25"
                  },
                  "to_date": {
                    "type": "string",
                    "format": "date",
                    "example": "2026-05-25"
                  },
                  "label": {
                    "type": "string",
                    "example": "last_month"
                  }
                }
              }
            }
          }
        }
      }
    ],
    "example": {
      "success": true,
      "status_code": 200,
      "message": "تم جلب عدد المعاملات المنجزة لآخر شهر بنجاح",
      "data": {
        "count": 12,
        "department_ids": [
          1,
          2
        ],
        "period": {
          "from_date": "2026-04-25",
          "to_date": "2026-05-25",
          "label": "last_month"
        }
      }
    }
  },
  "WorkflowActiveStatsResponse": {
    "allOf": [
      {
        "$ref": "#/components/schemas/ApiSuccessResponse"
      },
      {
        "type": "object",
        "properties": {
          "message": {
            "type": "string",
            "example": "تم جلب عدد المعاملات النشطة بنجاح"
          },
          "data": {
            "type": "object",
            "properties": {
              "count": {
                "type": "integer",
                "example": 8
              },
              "in_progress_count": {
                "type": "integer",
                "example": 3
              },
              "pending_pickup_count": {
                "type": "integer",
                "example": 5
              },
              "department_ids": {
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
          }
        }
      }
    ],
    "example": {
      "success": true,
      "status_code": 200,
      "message": "تم جلب عدد المعاملات النشطة بنجاح",
      "data": {
        "count": 8,
        "in_progress_count": 3,
        "pending_pickup_count": 5,
        "department_ids": [
          1,
          2
        ]
      }
    }
  },
  "TaskDetailsResponse": {
    "allOf": [
      {
        "$ref": "#/components/schemas/ApiSuccessResponse"
      },
      {
        "type": "object",
        "properties": {
          "message": {
            "type": "string",
            "example": "تم جلب تفاصيل المهمة بنجاح"
          },
          "data": {
            "type": "object",
            "properties": {
              "process_definition_name": {
                "type": "string",
                "example": "Leave Process"
              },
              "id_task": {
                "type": "string",
                "example": "978bbc76-6650-11f1-ade6-2e8996ed1457",
                "description": "معرّف مهمة Camunda — يُستخدم في POST /tasks/{taskId}/complete و signing-challenge"
              },
              "name_task": {
                "type": "string",
                "example": "التشيك على المعلومات المدخلة"
              },
              "applicant": {
                "type": "object",
                "properties": {
                  "first_name": {
                    "type": "string",
                    "example": "أحمد"
                  },
                  "father_name": {
                    "type": "string",
                    "example": "علي"
                  },
                  "last_name": {
                    "type": "string",
                    "example": "محمد"
                  },
                  "national_id": {
                    "type": "string",
                    "example": "12345678901"
                  },
                  "phone_number": {
                    "type": "string",
                    "example": "0954263536"
                  }
                }
              },
              "submitted_at": {
                "type": "string",
                "example": "12/06/2026",
                "description": "تاريخ تقديم/إنشاء المعاملة (يوم/شهر/سنة)"
              },
              "transaction_history": {
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
                    "example": 1,
                    "description": "1=عالي، 2=متوسط، 3=منخفض"
                  },
                  "data": {
                    "type": "object",
                    "description": "transaction_history — applicant + stages[] (كل stage: form_id, widgets+value, templates, note, completed_by/at)",
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
                            "completed_by": {
                              "type": "integer"
                            },
                            "completed_at": {
                              "type": "string",
                              "format": "date-time"
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              "currentStage": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "integer",
                    "example": 2
                  },
                  "name": {
                    "type": "string",
                    "example": "التشيك على المعلومات المدخلة"
                  },
                  "config": {
                    "type": "object",
                    "description": "stage_config.config_json للمرحلة الحالية"
                  }
                }
              },
              "assignments": {
                "type": "object",
                "nullable": true,
                "description": "نفس هيكل config_json.assignments من stageConfig + value. null إذا المرحلة لا تحتوي assignments. يظهر بعد currentStage في GET/pickup.",
                "properties": {
                  "widget_type": {
                    "type": "string",
                    "example": "dropdown"
                  },
                  "data": {
                    "type": "object",
                    "properties": {
                      "id": {
                        "type": "string",
                        "example": "OrgDepRole"
                      },
                      "label": {
                        "type": "string",
                        "example": "تعيين الوجهة التالية للمسار"
                      },
                      "is_required": {
                        "type": "boolean",
                        "example": true
                      },
                      "options": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "properties": {
                            "key": {
                              "type": "string",
                              "example": "ROLE__ORG1__DEPT2"
                            },
                            "value": {
                              "type": "string",
                              "example": "تقنية المعلومات"
                            }
                          }
                        }
                      }
                    }
                  },
                  "value": {
                    "type": "string",
                    "example": "",
                    "description": "فارغ في GET/pickup حتى يختار الموظف؛ عند complete يُرسل المفتاح المختار"
                  }
                }
              },
              "task_lock": {
                "type": "object",
                "description": "حالة قفل الاستلام — GET عرض فقط؛ POST pickup لإنشاء القفل",
                "properties": {
                  "is_locked": {
                    "type": "boolean",
                    "example": false
                  },
                  "locked_by_me": {
                    "type": "boolean",
                    "example": false
                  },
                  "locked_by_user_id": {
                    "type": "integer",
                    "nullable": true,
                    "example": null
                  },
                  "locked_at": {
                    "type": "string",
                    "nullable": true,
                    "example": "18/06/2026",
                    "description": "تاريخ الاستلام (يوم/شهر/سنة)"
                  },
                  "can_pickup": {
                    "type": "boolean",
                    "example": true
                  },
                  "can_release": {
                    "type": "boolean",
                    "example": false
                  }
                }
              }
            }
          }
        }
      }
    ],
    "example": {
      "success": true,
      "status_code": 200,
      "message": "تم جلب تفاصيل المهمة بنجاح",
      "data": {
        "process_definition_name": "Leave Process",
        "id_task": "978bbc76-6650-11f1-ade6-2e8996ed1457",
        "name_task": "التشيك على المعلومات المدخلة",
        "applicant": {
          "first_name": "أحمد",
          "father_name": "علي",
          "last_name": "محمد",
          "national_id": "12345678901",
          "phone_number": "0954263536"
        },
        "submitted_at": "12/06/2026",
        "transaction_history": {
          "process_name": "توكيل تربوي",
          "priority": 1,
          "data": {
            "applicant": {
              "first_name_employee": "روان",
              "father_name_employee": "أحمد",
              "last_name_employee": "سرحان",
              "national_id_employee": "",
              "phone_number_employee": "0954263536"
            },
            "stages": [
              {
                "form_id": "leave_process_auth",
                "form_name": "الوثائق المطلوبة للمواطن",
                "widgets": [
                  {
                    "widget_type": "text_field",
                    "data": {
                      "id": "student_first_name",
                      "label": "اسم الطالب"
                    },
                    "value": "روان"
                  }
                ],
                "templates": [],
                "note": "",
                "completed_by": 5,
                "completed_at": "2026-06-12T10:00:00.000Z"
              }
            ]
          }
        },
        "currentStage": {
          "id": 2,
          "name": "التشيك على المعلومات المدخلة",
          "config": {
            "form_id": "leave_process_review",
            "form_name": "التشيك على المعلومات المدخلة",
            "widgets": [],
            "assignments": {
              "widget_type": "dropdown",
              "data": {
                "id": "OrgDepRole",
                "label": "تعيين الوجهة التالية للمسار",
                "is_required": true,
                "options": [
                  {
                    "key": "ROLE__ORG1__DEPT2",
                    "value": "تقنية المعلومات"
                  },
                  {
                    "key": "ROLE__ORG1__DEPT3",
                    "value": "التربية"
                  }
                ]
              }
            }
          }
        },
        "assignments": {
          "widget_type": "dropdown",
          "data": {
            "id": "OrgDepRole",
            "label": "تعيين الوجهة التالية للمسار",
            "is_required": true,
            "options": [
              {
                "key": "ROLE__ORG1__DEPT2",
                "value": "تقنية المعلومات"
              },
              {
                "key": "ROLE__ORG1__DEPT3",
                "value": "التربية"
              }
            ]
          },
          "value": ""
        },
        "task_lock": {
          "is_locked": false,
          "locked_by_me": false,
          "locked_by_user_id": null,
          "locked_at": null,
          "can_pickup": true,
          "can_release": false
        }
      }
    }
  },
  "SigningChallengeData": {
    "type": "object",
    "properties": {
      "signing_id": {
        "type": "string",
        "format": "uuid"
      },
      "challenge_id": {
        "type": "string",
        "format": "uuid"
      },
      "task_id": {
        "type": "string"
      },
      "transaction_id": {
        "type": "integer"
      },
      "stage_code": {
        "type": "string"
      },
      "key_fingerprint": {
        "type": "string"
      },
      "message": {
        "type": "string",
        "description": "النص الذي يُوقَّع بـ USB private key"
      },
      "payload_hash": {
        "type": "string"
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
  },
  "CompleteTaskResponse": {
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
        "example": "تم إكمال المهمة بنجاح"
      },
      "data": {
        "$ref": "#/components/schemas/CompleteTaskData"
      }
    },
    "example": {
      "success": true,
      "status_code": 200,
      "message": "تم إكمال المهمة بنجاح",
      "data": {
        "stage_name": "التشيك على المعلومات المدخلة",
        "form_id": "leave_process_review",
        "form_name": "التشيك على المعلومات المدخلة",
        "widgets": [
          {
            "widget_type": "radio_group",
            "data": {
              "id": "decision",
              "label": "قرار الطلب",
              "is_gateway": true
            },
            "value": "الطلب مقبول"
          }
        ],
        "templates": [],
        "variables": {
          "value": "الطلب مقبول"
        },
        "gateway_value": "الطلب مقبول",
        "decision": "approve",
        "note": "",
        "idempotency_key": "0dbc8ad0-2618-4be2-8080-07e13c862d9b",
        "idempotent_replay": false,
        "workflow_status": "running"
      }
    }
  },
  "SigningChallengePayload": {
    "type": "object",
    "required": [
      "pin",
      "decision"
    ],
    "additionalProperties": false,
    "properties": {
      "pin": {
        "type": "string",
        "example": "123456",
        "description": "رمز PIN للموظف"
      },
      "decision": {
        "type": "string",
        "enum": [
          "approve",
          "reject",
          "rejected"
        ],
        "example": "approve",
        "description": "قرار الموظف للتوقيع — يُقارَن عند complete (approve / reject)"
      }
    },
    "example": {
      "pin": "123456",
      "decision": "approve"
    }
  },
  "CompleteTaskRejectExample": {
    "summary": "رفض معاملة مع توقيع USB",
    "value": {
      "form_id": "leave_process_review",
      "form_name": "مراجعة المدير",
      "widgets": [
        {
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
          "value": "rejected"
        }
      ],
      "templates": [],
      "decision": "reject",
      "note": "المستندات غير مكتملة",
      "signature": {
        "challenge_id": "3ad67615-8c89-4a5e-a758-217e9d85b6e6",
        "signature": "Bj7trXvyM9jfruXKttly27VY1xsVuqtKgcjfLf7fZrohjBGX0MwIFtYRMQ3nP5WHtbx0EFadm9rXy/RQqVw2Dg=="
      }
    }
  },
  "SigningChallengeResponse": {
    "allOf": [
      {
        "$ref": "#/components/schemas/ApiSuccessResponse"
      },
      {
        "type": "object",
        "properties": {
          "message": {
            "type": "string",
            "example": "تم إنشاء تحدي التوقيع بنجاح"
          },
          "data": {
            "$ref": "#/components/schemas/SigningChallengeData"
          }
        }
      }
    ],
    "example": {
      "success": true,
      "status_code": 200,
      "message": "تم إنشاء تحدي التوقيع بنجاح",
      "data": {
        "signing_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "challenge_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "task_id": "a1b2c3d4",
        "transaction_id": 441,
        "stage_code": "MANAGER_REVIEW",
        "key_fingerprint": "SHA256:abc...",
        "message": "TX-SIGN|...",
        "expires_at": "2026-05-25T12:05:00.000Z",
        "expires_in_seconds": 300
      }
    }
  },
  "AuthProcessItem": {
    "type": "object",
    "properties": {
      "process_id": {
        "type": "integer",
        "example": 1
      },
      "name": {
        "type": "string",
        "example": "Leave Request"
      },
      "code": {
        "type": "string",
        "example": "LEAVE_001"
      },
      "priority": {
        "type": "integer",
        "example": 1
      },
      "auth_stage": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "example": 10
          },
          "name": {
            "type": "string",
            "example": "Submit Request"
          },
          "code": {
            "type": "string",
            "example": "SUBMIT_LEAVE"
          },
          "type": {
            "type": "string",
            "example": "USER_TASK"
          },
          "auth_type": {
            "type": "string",
            "example": "AUTH"
          }
        }
      }
    },
    "example": {
      "process_id": 1,
      "name": "Leave Request",
      "code": "LEAVE_001",
      "priority": 1,
      "auth_stage": {
        "id": 10,
        "name": "Submit Request",
        "code": "SUBMIT_LEAVE",
        "type": "USER_TASK",
        "auth_type": "AUTH"
      }
    }
  },
  "AuthProcessListResponse": {
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
        "example": "تم جلب عمليات AUTH بنجاح"
      },
      "data": {
        "type": "object",
        "properties": {
          "items": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/AuthProcessItem"
            }
          },
          "from_cache": {
            "type": "boolean",
            "example": false
          }
        }
      }
    },
    "example": {
      "success": true,
      "status_code": 200,
      "message": "تم جلب عمليات AUTH بنجاح",
      "data": {
        "items": [
          {
            "process_id": 1,
            "name": "Leave Request",
            "code": "LEAVE_001",
            "priority": 1,
            "auth_stage": {
              "id": 10,
              "name": "Submit Request",
              "code": "SUBMIT_LEAVE",
              "type": "USER_TASK",
              "auth_type": "AUTH"
            }
          }
        ],
        "from_cache": false
      }
    }
  }
}
