'use strict';

module.exports = (sequelize, DataTypes) => {
  const ActivityLog = sequelize.define('ActivityLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    action: {
      type: DataTypes.STRING,
      allowNull: false
    },

    entity_type: {
      type: DataTypes.STRING,
      allowNull: true
    },

    entity_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'activity_logs',
  timestamps: true,
createdAt: "created_at",
updatedAt: "updated_at"

  });

  ActivityLog.associate = models => {
    ActivityLog.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return ActivityLog;
};
