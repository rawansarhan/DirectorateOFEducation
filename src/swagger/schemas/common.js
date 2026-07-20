module.exports = {
  "StageSubmissionFieldItem": {
    "type": "object",
    "required": [
      "key",
      "value"
    ],
    "properties": {
      "key": {
        "type": "string",
        "example": "citizen_full_name",
        "description": "مطابق لـ widget.key من SDUI"
      },
      "value": {
        "description": "قيمة الحقل",
        "example": "أحمد محمد علي"
      }
    }
  },
  "StageSubmissionFileItem": {
    "type": "object",
    "required": [
      "key",
      "path",
      "type_doc_id"
    ],
    "properties": {
      "key": {
        "type": "string",
        "example": "national_id_files",
        "description": "مطابق لـ file_picker.data.id من stage_config"
      },
      "path": {
        "type": "string",
        "example": "/uploads/1779550000000-id.pdf"
      },
      "type_doc_id": {
        "type": "integer",
        "example": 1,
        "description": "نفس type_doc_id المعرّف في file_picker داخل stage_config"
      },
      "type_Doc_id": {
        "type": "integer",
        "deprecated": true,
        "description": "alias لـ type_doc_id"
      },
      "original_name": {
        "type": "string",
        "example": "id.pdf"
      },
      "mime_type": {
        "type": "string",
        "example": "application/pdf"
      }
    },
    "example": {
      "key": "national_id_files",
      "path": "/uploads/a.pdf",
      "type_doc_id": 1
    }
  },
  "StageSubmissionTemplateItem": {
    "type": "object",
    "required": [
      "template_id",
      "values"
    ],
    "properties": {
      "template_id": {
        "type": "integer",
        "example": 1
      },
      "values": {
        "type": "object",
        "example": {
          "full_name": "أحمد محمد علي"
        }
      }
    }
  },
  "StageSubmissionActionItem": {
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
      }
    }
  },
  "ApiSuccessResponse": {
    "type": "object",
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
        "example": "تمت العملية بنجاح"
      },
      "data": {
        "type": "object",
        "nullable": true
      }
    },
    "example": {
      "success": true,
      "status_code": 200,
      "message": "تمت العملية بنجاح",
      "data": {}
    }
  },
  "ApiErrorResponse": {
    "type": "object",
    "required": [
      "success",
      "status_code",
      "message",
      "error",
      "data"
    ],
    "description": "شكل خطأ موحّد لجميع endpoints. status_code يعكس HTTP الفعلي (400, 401, 403, 404, 409, 422, 429, 500, …) — ليس 400 دائماً. message: رسالة واضحة بالعربية. error: رمز الخطأ. data: دائماً null",
    "properties": {
      "success": {
        "type": "boolean",
        "example": false
      },
      "status_code": {
        "type": "integer",
        "example": 400,
        "description": "HTTP status الفعلي — مثال: 400 تحقق، 404 غير موجود، 409 تعارض"
      },
      "message": {
        "type": "string",
        "example": "decision مطلوب (approve / reject) عند إكمال مهمة تتطلب توقيعاً"
      },
      "error": {
        "type": "string",
        "example": "VALIDATION_ERROR"
      },
      "data": {
        "type": "object",
        "nullable": true,
        "example": null
      }
    },
    "example": {
      "success": false,
      "status_code": 400,
      "message": "decision مطلوب (approve / reject) عند إكمال مهمة تتطلب توقيعاً",
      "error": "VALIDATION_ERROR",
      "data": null
    }
  },
  "WorkflowValidationErrorExample": {
    "summary": "خطأ تحقق من البيانات",
    "value": {
      "success": false,
      "status_code": 400,
      "message": "note مطلوب عند decision = reject",
      "error": "VALIDATION_ERROR",
      "data": null
    }
  },
  "WorkflowTaskLockErrorExample": {
    "summary": "المعاملة غير مستلمة",
    "value": {
      "success": false,
      "status_code": 409,
      "message": "يجب استلام المعاملة أولاً عبر POST /api/workflow/tasks/{taskId}/pickup.",
      "error": "TASK_LOCK_REQUIRED",
      "data": null
    }
  },
  "WorkflowTaskNotFoundErrorExample": {
    "summary": "المهمة غير موجودة",
    "value": {
      "success": false,
      "status_code": 404,
      "message": "المهمة غير موجودة أو لم تعد نشطة في Camunda",
      "error": "TASK_NOT_FOUND",
      "data": null
    }
  },
  "StageSubmissionSignature": {
    "type": "object",
    "required": [
      "challenge_id",
      "signature"
    ],
    "description": "توقيع USB — challenge_id من POST /tasks/{taskId}/signing-challenge أو submit-documents/signing-challenge",
    "properties": {
      "challenge_id": {
        "type": "string",
        "format": "uuid",
        "example": "3ad67615-8c89-4a5e-a758-217e9d85b6e6",
        "description": "من signing-challenge بعد التحقق من PIN (alias: signing_id)"
      },
      "signing_id": {
        "type": "string",
        "format": "uuid",
        "description": "alias لـ challenge_id من signing-challenge"
      },
      "signature": {
        "type": "string",
        "minLength": 16,
        "example": "Bj7trXvyM9jfruXKttly27VY1xsVuqtKgcjfLf7fZrohjBGX0MwIFtYRMQ3nP5WHtbx0EFadm9rXy/RQqVw2Dg==",
        "description": "base64 Ed25519 — وقّع حقل message من signing-challenge"
      }
    },
    "example": {
      "challenge_id": "3ad67615-8c89-4a5e-a758-217e9d85b6e6",
      "signature": "Bj7trXvyM9jfruXKttly27VY1xsVuqtKgcjfLf7fZrohjBGX0MwIFtYRMQ3nP5WHtbx0EFadm9rXy/RQqVw2Dg=="
    }
  }
}
