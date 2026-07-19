const {
  Organization
} = require('../../../../../entities')

class organizationRepository {

//////////////////////////////////////////////////

  async findById(id){
    return await Organization.findByPk(id)
  }
}

module.exports =
  new organizationRepository()