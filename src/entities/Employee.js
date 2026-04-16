'use strict';

module.exports = (sequelize, DataTypes) => {

  class Employee extends sequelize.Sequelize.Model {
    static associate(models) {

      Employee.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

    }
  }

  Employee.init(
    {
      employee_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      national_number: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      first_name_ar: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      last_name_ar: {
        type: DataTypes.STRING,
        allowNull: false,
      },


      father_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      mother_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      date_of_birth: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      gender: {
        type: DataTypes.ENUM('male', 'female'),
        allowNull: true,
      },

      marital_status: {
        type: DataTypes.ENUM('single', 'married'),
        allowNull: true,
      },
      grade: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      status: {
        type: DataTypes.ENUM('active', 'inactive', 'suspended'),
        allowNull: false,
        defaultValue: 'active',
      },

      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'Employee',
      tableName: 'employees',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Employee;
};