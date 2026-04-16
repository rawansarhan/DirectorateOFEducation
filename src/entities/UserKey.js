'use strict';

module.exports = (sequelize, DataTypes) => {

  class UserKey extends sequelize.Sequelize.Model {
    static associate(models) {

      UserKey.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE',
      });

      UserKey.hasMany(models.DigitalSignature, {
        foreignKey: 'user_key_id',
        as: 'signatures',
      });

    }
  }

  UserKey.init(
    {
      public_key: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      key_fingerprint: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
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
      modelName: 'UserKey',
      tableName: 'user_key',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return UserKey;
};