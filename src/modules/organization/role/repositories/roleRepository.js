const { Op } = require('sequelize')

const { Role } = require('../../../../entities')

/**
 * أدوار النظام الداخلية التي لا تُسنَد يدوياً لقسم عبر واجهة إنشاء الدور.
 * `CITIZEN` يُنشأ بالـ seeders ويُربط بـ ODR خاص خارج الهيكل التنظيمي —
 * ظهوره في قائمة الاختيار يغري بربطه بقسم فيكسر افتراض
 * `camunda_group_key != 'CITIZEN'` الذي يميّز الموظفين عن المواطنين.
 */
const INTERNAL_ROLE_CODES = ['CITIZEN']

async function findByCode(code, options = {}) {
  return Role.findOne({ where: { code }, ...options })
}

async function findById(id, options = {}) {
  return Role.findByPk(id, options)
}

/**
 * الأدوار القابلة للإسناد، مرتّبة بالاسم — مصدر قائمة اختيار الدور.
 * تستثني [INTERNAL_ROLE_CODES] فلا تظهر أدوار النظام في القائمة.
 */
async function findAllRoles() {
  return Role.findAll({
    attributes: ['id', 'name', 'code'],
    where: { code: { [Op.notIn]: INTERNAL_ROLE_CODES } },
    order: [['name', 'ASC']]
  })
}

async function create(data, options = {}) {
  return Role.create(data, options)
}

module.exports = {
  INTERNAL_ROLE_CODES,
  findByCode,
  findById,
  findAllRoles,
  create
}
