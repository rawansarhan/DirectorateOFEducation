const processRepository =
  require('../repositories/processRepository')

async function getProcessByIdService(id) {
  const processId = parseInt(id, 10)

   const process = await processRepository.findById(processId)

  if (!process) {
    throw new Error('Process not found')
  }

  return process
}



module.exports = {
  getProcessByIdService
}