const { TypeTrans } = require('../../../../entities')
const Sequelize = require('sequelize')

const Op = Sequelize.Op
class TypeTransRepository {
// ================= FIND BY ID =================
  async findById(id) {

    return await TypeTrans.findByPk(id)
  }

  async findByCode (code) {
    return TypeTrans.findOne({
      where: { code }
    })
  }
// ================= FIND ONE WHERE COMPLAINT =================

 async  findOneWhereComplaint(){

  return await TypeTrans.findOne({
    where: {
      id: 1,
      name: 'شكوى'
    }
  })
 }

 // ================= CREATE =================

  async create(data) {

    return await TypeTrans.create(
      data
    )
  }

  // ================= UPDATE =================

  async update(instance, payload) {

    await instance.update(payload)

    await instance.reload()

    return instance
  }

  // ================= GET ALL =================

  async findAll() {

    return await TypeTrans.findAll({

      order: [['id', 'ASC']]
    })
  }

  // ================= GET ALL WITHOUT COMPLAINT =================

  async findAllWithoutComplaint() {

    return await TypeTrans.findAll({

      where: {
         is_active: true,
        id: {
          [Op.ne]: 1
        }
      },

      order: [['id', 'ASC']]
    })
  }
}


  


module.exports = new TypeTransRepository()