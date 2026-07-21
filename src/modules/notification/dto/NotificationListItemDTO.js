'use strict'

class NotificationListItemDTO {
  constructor (row) {
    this.id = row.id
    this.title = row.title
    this.message = row.message
    this.type = row.type
    this.channel = row.channel
    this.status = row.status
    this.transaction_id = row.transaction_id
    this.process_instance_id = row.process_instance_id
    this.sent_by = row.sender
      ? {
          id: row.sender.id,
          user_name: row.sender.userName
        }
      : null
    this.metadata = row.metadata || null
    this.sent_count = row.sent_count
    this.failed_count = row.failed_count
    this.is_read = row.read_at != null
    this.read_at = row.read_at ?? null
    this.created_at = row.created_at
  }
}

module.exports = {
  NotificationListItemDTO
}
