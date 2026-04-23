'use strict';

module.exports = (sequelize, DataTypes) => {

  class File extends sequelize.Sequelize.Model {
    static associate(models) {


   

    }
  }

  File.init(
    {
      file_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      file_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },

    
      type: {
        type: DataTypes.ENUM(
          'اضبارة',
          'وثائق للمواطن',
          'كتاب وزاري'
        ),
        allowNull: false,
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
      modelName: 'File',
      tableName: 'files',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return File;
};