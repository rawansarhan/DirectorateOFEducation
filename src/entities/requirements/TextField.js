'use strict'

module.exports = (sequelize, DataTypes) => {
  class TextField extends sequelize.Sequelize.Model {
    static associate () {}
  }

  TextField.init(
    {
      id_widget: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true
      },
      label: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      is_required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      input_type: {
        type: DataTypes.ENUM('text', 'string', 'int', 'phoneNumber', 'email'),
        allowNull: false
      },
      regex: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      max_length: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      min_length: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: 'TextField',
      tableName: 'text_fields',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return TextField
}
