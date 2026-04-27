const FormData = require('form-data')
const fs = require('fs')
const axios = require('axios')

async function deployBPMNToCamunda(filePath) {
  const form = new FormData()

  form.append('deployment-name', 'process_deployment')
  form.append('data', fs.createReadStream(filePath))

  const res = await axios.post(
    `${process.env.CAMUNDA_URL}/deployment/create`,
    form,
    {
      headers: form.getHeaders()
    }
  )

  return {
    deploymentId: res.data.id
  }
}

async function getProcessDefinitionKey(deploymentId) {
  const res = await axios.get(
    `${process.env.CAMUNDA_URL}/process-definition?deploymentId=${deploymentId}`
  )

  if (!res.data.length) {
    throw new Error('No process definition found')
  }

  return res.data[0].key
}


async function createProcessDefinitionService(data) {
  const { error } = createProcessDefinitionSchema.validate(data)
  if (error) throw new Error(error.details[0].message)

  // 1. رفع الملف
  const deployRes = await deployBPMNToCamunda(data.filePath)

  // 2. جيب process key
  const processKey = await getProcessDefinitionKey(deployRes.deploymentId)

  // 3. خزّن في DB
  const process = await ProcessDefinition.create({
    name: data.name,
    code: data.code || processKey,
    camunda_process_key: processKey,
    camunda_deployment_id: deployRes.deploymentId,
    type_trans_id: data.type_trans_id,
    organization_id: data.organization_id || null,
    status: 'deployed',
    version: 1,
    priority: data.priority,
    start_date: data.start_date,
    end_date: data.end_date
  })

  return process
}


async function getTasksFromCamunda(processKey) {
  const res = await axios.get(
    `${process.env.CAMUNDA_URL}/process-definition/key/${processKey}/xml`
  )

  const xml = res.data.bpmn20Xml

  // استخراج userTask من XML
  const taskRegex = /<bpmn:userTask[^>]*id="([^"]+)"[^>]*name="([^"]*)"/g

  const tasks = []
  let match

  while ((match = taskRegex.exec(xml)) !== null) {
    tasks.push({
      taskDefinitionKey: match[1],
      name: match[2]
    })
  }

  return tasks
}


async function generateStagesFromCamunda(process) {
  const tasks = await getTasksFromCamunda(process.camunda_process_key)

  let order = 1

  for (const task of tasks) {
    await Stage.create({
      process_definition_id: process.id,
      name: task.name,
      code: task.taskDefinitionKey,
      order: order++,
      is_active: true
    })
  }

  return tasks
}


async function setupProcessAfterCreation(processId) {
  const process = await ProcessDefinition.findByPk(processId)

  if (!process) throw new Error('Process not found')

  const tasks = await generateStagesFromCamunda(process)

  return {
    message: 'Process setup completed',
    tasks_created: tasks.length
  }
}