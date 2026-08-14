'use strict'

const bookingExample = {
  id: 21,
  appointment_id: 8,
  user_id: 44,
  first_name: 'أحمد',
  last_name: 'الخالد',
  father_name: 'محمود',
  mother_name: 'فاطمة',
  national_id: '01012345678',
  phone_number: '0912345678',
  identity_image_path: '/uploads/1723640000000-id.jpg',
  reason: 'مراجعة وثائق الشهادة',
  status: 'pending',
  status_label: 'بانتظار الموافقة',
  queue_order: null,
  attended: null,
  decision_note: null,
  decided_by: null,
  decided_at: null,
  created_at: '2026-08-14T10:00:00.000Z',
  updated_at: '2026-08-14T10:00:00.000Z'
}

const approvedBookingExample = {
  ...bookingExample,
  id: 22,
  status: 'approved',
  status_label: 'موافق عليها',
  queue_order: 1,
  decision_note: 'تمت الموافقة — يرجى الحضور قبل الموعد بربع ساعة',
  decided_by: 5,
  decided_at: '2026-08-14T11:00:00.000Z'
}

const postponedBookingExample = {
  ...approvedBookingExample,
  id: 23,
  status: 'postponed',
  status_label: 'تم تأجيلها',
  queue_order: 2
}

const rejectedBookingExample = {
  ...bookingExample,
  id: 24,
  status: 'rejected',
  status_label: 'مرفوضة',
  queue_order: null,
  decision_note: 'صورة الهوية غير واضحة — يرجى إعادة الحجز بمرفق أوضح',
  decided_by: 5,
  decided_at: '2026-08-14T11:05:00.000Z'
}

const slotExample = {
  id: 8,
  appointment_date: '2026-09-01',
  start_time: '09:00:00',
  end_time: '11:00:00',
  capacity: 5,
  approved_taken: 2,
  remaining_seats: 3,
  is_active: true,
  created_by: 5,
  created_at: '2026-08-10T08:00:00.000Z',
  updated_at: '2026-08-10T08:00:00.000Z'
}

function envelope (data, message, statusCode = 200) {
  return {
    success: true,
    status_code: statusCode,
    message,
    data
  }
}

function errorEnvelope (statusCode, message, error) {
  return {
    success: false,
    status_code: statusCode,
    message,
    error,
    data: null
  }
}

module.exports = {
  AppointmentSlot: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 8 },
      appointment_date: { type: 'string', format: 'date', example: '2026-09-01' },
      start_time: { type: 'string', example: '09:00:00' },
      end_time: { type: 'string', example: '11:00:00' },
      capacity: { type: 'integer', example: 5 },
      approved_taken: {
        type: 'integer',
        example: 2,
        description: 'عدد الحجوزات الموافق عليها + المؤجلة'
      },
      remaining_seats: { type: 'integer', example: 3 },
      is_active: { type: 'boolean', example: true },
      created_by: { type: 'integer', nullable: true, example: 5 },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
      bookings: {
        type: 'array',
        items: { $ref: '#/components/schemas/AppointmentBooking' }
      }
    },
    example: slotExample
  },

  AppointmentBooking: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 21 },
      appointment_id: { type: 'integer', example: 8 },
      user_id: { type: 'integer', example: 44 },
      first_name: { type: 'string', example: 'أحمد' },
      last_name: { type: 'string', example: 'الخالد' },
      father_name: { type: 'string', example: 'محمود' },
      mother_name: { type: 'string', example: 'فاطمة' },
      national_id: { type: 'string', maxLength: 11, example: '01012345678' },
      phone_number: {
        type: 'string',
        maxLength: 10,
        example: '0912345678',
        description: 'يبدأ بـ 09 ويتكون من 10 أرقام'
      },
      identity_image_path: { type: 'string', example: '/uploads/1723640000000-id.jpg' },
      reason: { type: 'string', example: 'مراجعة وثائق الشهادة' },
      status: {
        type: 'string',
        enum: ['pending', 'approved', 'rejected', 'postponed', 'cancelled'],
        example: 'pending'
      },
      status_label: {
        type: 'string',
        example: 'بانتظار الموافقة',
        description: 'pending=بانتظار الموافقة | approved=موافق عليها | rejected=مرفوضة | postponed=تم تأجيلها'
      },
      queue_order: { type: 'integer', nullable: true, example: 1 },
      attended: { type: 'boolean', nullable: true, example: null },
      decision_note: { type: 'string', nullable: true },
      decided_by: { type: 'integer', nullable: true },
      decided_at: { type: 'string', format: 'date-time', nullable: true },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' }
    },
    example: bookingExample
  },

  AppointmentBookingWithSlot: {
    allOf: [
      { $ref: '#/components/schemas/AppointmentBooking' },
      {
        type: 'object',
        properties: {
          appointment: {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 8 },
              appointment_date: { type: 'string', example: '2026-09-01' },
              start_time: { type: 'string', example: '09:00:00' },
              end_time: { type: 'string', example: '11:00:00' },
              capacity: { type: 'integer', example: 5 }
            }
          }
        }
      }
    ]
  },

  AppointmentSlotCreate: {
    type: 'object',
    required: ['appointment_date', 'start_time', 'end_time', 'capacity'],
    properties: {
      appointment_date: { type: 'string', format: 'date', example: '2026-09-01' },
      start_time: { type: 'string', example: '09:00', description: 'HH:MM أو HH:MM:SS' },
      end_time: { type: 'string', example: '11:00' },
      capacity: { type: 'integer', minimum: 1, example: 5 }
    },
    example: {
      appointment_date: '2026-09-01',
      start_time: '09:00',
      end_time: '11:00',
      capacity: 5
    }
  },

  AppointmentSlotUpdate: {
    type: 'object',
    required: ['appointment_date', 'start_time', 'end_time', 'capacity'],
    properties: {
      appointment_date: { type: 'string', format: 'date', example: '2026-09-03' },
      start_time: { type: 'string', example: '10:00' },
      end_time: { type: 'string', example: '12:00' },
      capacity: { type: 'integer', minimum: 1, example: 5 },
      is_active: { type: 'boolean', example: true }
    },
    example: {
      appointment_date: '2026-09-03',
      start_time: '10:00',
      end_time: '12:00',
      capacity: 5,
      is_active: true
    }
  },

  AppointmentDecisionInput: {
    type: 'object',
    required: ['decision', 'note'],
    properties: {
      decision: { type: 'string', enum: ['approved', 'rejected'], example: 'approved' },
      note: {
        type: 'string',
        example: 'تمت الموافقة — يرجى الحضور قبل الموعد بربع ساعة',
        description: 'محتوى رسالة الإشعار لصاحب الحجز (مطلوب في الموافقة والرفض)'
      }
    }
  },

  AppointmentAttendanceInput: {
    type: 'object',
    required: ['attended'],
    properties: {
      attended: { type: 'boolean', example: true }
    },
    example: { attended: true }
  },

  AppointmentSlotCreatedEnvelope: {
    allOf: [
      { $ref: '#/components/schemas/ApiSuccessResponse' }
    ],
    example: envelope(
      { ...slotExample, approved_taken: 0, remaining_seats: 5 },
      'تم إضافة الموعد بنجاح',
      201
    )
  },

  AppointmentAvailableSlotsEnvelope: {
    allOf: [{ $ref: '#/components/schemas/ApiSuccessResponse' }],
    example: envelope(
      [
        { ...slotExample, approved_taken: 2, remaining_seats: 3 },
        {
          ...slotExample,
          id: 9,
          start_time: '12:00:00',
          end_time: '14:00:00',
          capacity: 4,
          approved_taken: 0,
          remaining_seats: 4
        }
      ],
      'تم جلب المواعيد المتاحة'
    )
  },

  AppointmentManageApprovedEnvelope: {
    allOf: [{ $ref: '#/components/schemas/ApiSuccessResponse' }],
    example: envelope(
      [
        {
          ...slotExample,
          approved_taken: 2,
          remaining_seats: 3,
          bookings: [approvedBookingExample, postponedBookingExample]
        }
      ],
      'تم جلب مواعيد الإدارة'
    )
  },

  AppointmentManagePendingEnvelope: {
    allOf: [{ $ref: '#/components/schemas/ApiSuccessResponse' }],
    example: envelope(
      [
        {
          ...slotExample,
          approved_taken: 2,
          remaining_seats: 3,
          bookings: [bookingExample]
        }
      ],
      'تم جلب مواعيد الإدارة'
    )
  },

  AppointmentManagePastEnvelope: {
    allOf: [{ $ref: '#/components/schemas/ApiSuccessResponse' }],
    example: envelope(
      [
        {
          ...slotExample,
          id: 3,
          appointment_date: '2026-08-01',
          approved_taken: 2,
          remaining_seats: 3,
          bookings: [
            { ...approvedBookingExample, attended: true },
            { ...postponedBookingExample, attended: false }
          ]
        }
      ],
      'تم جلب مواعيد الإدارة'
    )
  },

  AppointmentMyBookingsEnvelope: {
    allOf: [{ $ref: '#/components/schemas/ApiSuccessResponse' }],
    example: envelope(
      [
        {
          ...bookingExample,
          appointment: {
            id: 8,
            appointment_date: '2026-09-01',
            start_time: '09:00:00',
            end_time: '11:00:00',
            capacity: 5
          }
        },
        {
          ...approvedBookingExample,
          appointment: {
            id: 8,
            appointment_date: '2026-09-01',
            start_time: '09:00:00',
            end_time: '11:00:00',
            capacity: 5
          }
        },
        {
          ...rejectedBookingExample,
          appointment: {
            id: 9,
            appointment_date: '2026-09-02',
            start_time: '12:00:00',
            end_time: '14:00:00',
            capacity: 4
          }
        },
        {
          ...postponedBookingExample,
          appointment: {
            id: 10,
            appointment_date: '2026-09-03',
            start_time: '10:00:00',
            end_time: '12:00:00',
            capacity: 5
          }
        }
      ],
      'تم جلب حجوزاتك'
    )
  },

  AppointmentBookingCreatedEnvelope: {
    allOf: [{ $ref: '#/components/schemas/ApiSuccessResponse' }],
    example: envelope(bookingExample, 'تم إرسال طلب الحجز بنجاح', 201)
  },

  AppointmentSlotDeletedEnvelope: {
    allOf: [{ $ref: '#/components/schemas/ApiSuccessResponse' }],
    example: envelope(
      { id: 8, deleted: true, notified: 2 },
      'تم حذف الموعد وإشعار المحجوزين الموافق عليهم'
    )
  },

  AppointmentPastBookingDeletedEnvelope: {
    allOf: [{ $ref: '#/components/schemas/ApiSuccessResponse' }],
    example: envelope(
      { id: 21, deleted: true, notified: false },
      'تم حذف الحجز السابق بدون إشعار'
    )
  },

  AppointmentErrorFullSlot: {
    allOf: [{ $ref: '#/components/schemas/ApiErrorResponse' }],
    example: errorEnvelope(
      409,
      'عذراً لقد تم حجز كل الأوقات خلال هذه الفترة',
      'عذراً لقد تم حجز كل الأوقات خلال هذه الفترة'
    )
  },

  AppointmentErrorForbidden: {
    allOf: [{ $ref: '#/components/schemas/ApiErrorResponse' }],
    example: errorEnvelope(403, 'Forbidden - missing permission', 'Forbidden - missing permission')
  }
}
