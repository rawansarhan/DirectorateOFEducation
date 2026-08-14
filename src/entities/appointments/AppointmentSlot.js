'use strict'

module.exports = (sequelize, DataTypes) => {
  class AppointmentSlot extends sequelize.Sequelize.Model {
    static associate (models) {
      AppointmentSlot.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      })

      AppointmentSlot.hasMany(models.AppointmentBooking, {
        foreignKey: 'appointment_id',
        as: 'bookings'
      })
    }
  }

  AppointmentSlot.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      appointment_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      start_time: {
        type: DataTypes.TIME,
        allowNull: false
      },
      end_time: {
        type: DataTypes.TIME,
        allowNull: false
      },
      capacity: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'AppointmentSlot',
      tableName: 'appointment_slots',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return AppointmentSlot
}
