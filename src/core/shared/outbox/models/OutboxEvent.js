

module.exports = (sequelize, DataTypes) => {

  const OutboxEvent = sequelize.define('OutboxEvent', {

    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    event_type: {
      type: DataTypes.STRING,
      allowNull: false
    },

    payload: {
      type: DataTypes.JSON,
      allowNull: false
    },

    status: {
      type: DataTypes.ENUM(
        'pending',
        'processed',
        'failed'
      ),
      defaultValue: 'pending'
    },

    processed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_error: {
  type: DataTypes.TEXT,
  allowNull: true
}

  }, {

    tableName: 'outbox_events',

    underscored: true
  })

  return OutboxEvent
}