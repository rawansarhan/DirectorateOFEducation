'use strict'

const { Op } = require('sequelize')
const { RefreshToken } = require('../../../../entities')

class RefreshTokenRepository {
  getSequelize () {
    return RefreshToken.sequelize
  }

  async create (data, options = {}) {
    return RefreshToken.create(data, options)
  }

  async findByHash (tokenHash, options = {}) {
    return RefreshToken.findOne({
      where: { token_hash: tokenHash },
      ...options
    })
  }

  async findById (id, options = {}) {
    return RefreshToken.findByPk(id, options)
  }

  // إبطال توكن واحد (logout أو عند التدوير) مع ربطه بالتوكن الجديد اختيارياً
  async revoke (token, { replacedById = null, transaction } = {}) {
    return token.update(
      {
        revoked_at: new Date(),
        replaced_by_id: replacedById
      },
      { transaction }
    )
  }

  // إبطال كل التوكنات الفعّالة لمستخدم (logout-all أو عند كشف إعادة الاستخدام)
  async revokeAllForUser (userId, { transaction } = {}) {
    return RefreshToken.update(
      { revoked_at: new Date() },
      {
        where: {
          user_id: userId,
          revoked_at: null
        },
        transaction
      }
    )
  }

  // حذف التوكنات المنتهية (تنظيف اختياري عبر cron)
  async deleteExpired () {
    return RefreshToken.destroy({
      where: {
        expires_at: { [Op.lt]: new Date() }
      }
    })
  }
}

module.exports = new RefreshTokenRepository()
