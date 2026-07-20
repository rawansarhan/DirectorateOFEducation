'use strict'

module.exports = {
  ...require('./auth'),
  ...require('./widgets'),
  ...require('./typeProcess'),
  ...require('./organization'),
  ...require('./department'),
  ...require('./role'),
  ...require('./location'),
  ...require('./common'),
  ...require('./transaction'),
  ...require('./workflow'),
  ...require('./processDefinition')
}
