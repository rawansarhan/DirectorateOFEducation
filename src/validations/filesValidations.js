const Joi = require('joi');

// القيم المسموحة من DB
const FILE_TYPES = ['pdf', 'docx', 'jpg', 'png'];
const TYPE_FILE_ENUM = ['اضبارة', 'وثائق للمواطن', 'كتاب وزاري'];

const ValidateCreateFile = (data) => {
  const schema = Joi.object({
    file_name: Joi.string().trim().min(2).max(100).required(),

    file_type: Joi.string()
      .valid(...FILE_TYPES)
      .required(),

    type: Joi.string()
      .valid(...TYPE_FILE_ENUM)
      .required(),
  });

  return schema.validate(data);
};

const ValidateUpdateFile = (data) => {
  const schema = Joi.object({
    file_name: Joi.string().trim().min(2).max(100).optional(),

    file_type: Joi.string()
      .valid(...FILE_TYPES)
      .optional(),

    type: Joi.string()
      .valid(...TYPE_FILE_ENUM)
      .optional(),
  }).min(1);

  return schema.validate(data);
};

module.exports = {
  ValidateCreateFile,
  ValidateUpdateFile
};