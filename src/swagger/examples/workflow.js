module.exports = {
  "LeaveProcessAuthSubmit": {
    "summary": "POST /transaction/submit — مرحلة AUTH (leave_process_auth)",
    "description": "نفس config_json من stage_config/create + value لكل widget",
    "value": {
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
  "LeaveProcessReviewComplete": {
    "summary": "POST /tasks/{taskId}/complete — مراجعة مع assignments[]",
    "value": {
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
  "CompleteTaskWithDestination": {
    "summary": "POST /tasks/{taskId}/complete — مثال كامل مع assignments[]",
    "value": {
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
        },
        {
          "widget_type": "text_field",
          "data": {
            "id": "review_note",
            "label": "ملاحظة المراجعة",
            "is_required": false,
            "input_type": "text"
          },
          "value": "المستندات مكتملة"
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
          "department_id": 3,
          "role_id": 2
        }
      ]
    }
  },
  "LeaveProcessSignEduManagerComplete": {
    "summary": "POST /tasks/{taskId}/complete — توقيع مدير التربية + PDF",
    "value": {
      "form_id": "leave_process_sign_edu_manager",
      "form_name": "توقيع مدير التربية",
      "widgets": [],
      "templates": [
        {
          "id": 1,
          "value": {
            "manager-name": "اسم مدير التربية",
            "employee": "روان سرحان",
            "job": "معلمة",
            "department": "دائرة التربية"
          }
        }
      ],
      "decision": "approve",
      "note": "",
      "signature": {
        "challenge_id": "3ad67615-8c89-4a5e-a758-217e9d85b6e6",
        "signature": "Bj7trXvyM9jfruXKttly27VY1xsVuqtKgcjfLf7fZrohjBGX0MwIFtYRMQ3nP5WHtbx0EFadm9rXy/RQqVw2Dg=="
      }
    }
  },
  "LeaveProcessSignSecondaryComplete": {
    "summary": "POST /tasks/{taskId}/submit-documents/complete — توقيع الثانوي",
    "value": {
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
  }
}
