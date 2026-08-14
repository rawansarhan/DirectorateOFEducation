'use strict'

module.exports = (sequelize, DataTypes) => {
  class AppointmentBooking extends sequelize.Sequelize.Model {
    static associate (models) {
      AppointmentBooking.belongsTo(models.AppointmentSlot, {
        foreignKey: 'appointment_id',
        as: 'appointment'
      })

      AppointmentBooking.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      })

      AppointmentBooking.belongsTo(models.User, {
        foreignKey: 'decided_by',
        as: 'decider'
      })
    }
  }

  AppointmentBooking.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      appointment_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      first_name: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      last_name: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      father_name: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      mother_name: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      national_id: {
        type: DataTypes.STRING(11),
        allowNull: false
      },
      phone_number: {
        type: DataTypes.STRING(10),
        allowNull: false
      },
      identity_image_path: {
        type: DataTypes.STRING,
        allowNull: false
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'postponed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      queue_order: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      attended: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: null
      },
      decision_note: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      decided_by: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      decided_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'AppointmentBooking',
      tableName: 'appointment_bookings',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return AppointmentBooking
}
