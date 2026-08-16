/**
 * Performance test — Directorate of Education (dev)
 * Base: https://dev-education-directorate.abukm.com
 *
 * مسار الكتابة (signing-challenge / complete / submit) غير مضمّن:
 * يحتاج USB + body كامل وينشئ معاملات حقيقية + rate limit.
 * للقياس هنا: GET القراءة فقط.
 *
 *    k6 run -e SCENARIO=smoke -e CITIZEN_TOKEN="..." perf/k6-performance.js
 *    k6 run -e SCENARIO=load  -e EMPLOYEE_TOKEN="..." perf/k6-performance.js
 */

import http from 'k6/http'
import { check, group, sleep } from 'k6'

const BASE_URL = (
  __ENV.BASE_URL || 'https://dev-education-directorate.abukm.com'
).replace(/\/$/, '')

const EMPLOYEE_TOKEN = __ENV.EMPLOYEE_TOKEN || __ENV.TOKEN || ''
const CITIZEN_TOKEN = __ENV.CITIZEN_TOKEN || __ENV.TOKEN || ''
const TASK_ID = __ENV.TASK_ID || ''
const PROCESS_ID = __ENV.PROCESS_ID || ''
const TYPE_TRANS_ID = __ENV.TYPE_TRANS_ID || '0'

const SCENARIO = (__ENV.SCENARIO || 'load').toLowerCase()

const scenarioOptions = {
  smoke: {
    vus: 1,
    duration: '30s'
  },
  load: {
    vus: 10,
    duration: '2m'
  },
  stress: {
    vus: 30,
    duration: '3m'
  }
}

export const options = {
  ...(scenarioOptions[SCENARIO] || scenarioOptions.load),
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<3000'],
    checks: ['rate>0.90']
  },
  tags: {
    env: 'dev-education-directorate'
  }
}

function authHeaders (token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json'
  }
}

function getOk (url, params, expected = [200]) {
  const res = http.get(url, params)
  check(res, {
    [`${params?.tags?.name || url} status ok`]: (r) =>
      expected.includes(r.status)
  })
  return res
}

function parseJson (res) {
  try {
    return res.json()
  } catch (err) {
    return null
  }
}

function listItems (body) {
  if (Array.isArray(body?.data?.items)) return body.data.items
  if (Array.isArray(body?.data?.data)) return body.data.data
  if (Array.isArray(body?.data)) return body.data
  return []
}

function firstTaskId (body) {
  for (const item of listItems(body)) {
    const id = item?.task_id || item?.id_task || item?.id
    if (id) return String(id)
  }
  return ''
}

function firstProcessId (body) {
  for (const item of listItems(body)) {
    const id = item?.process_id || item?.id
    if (id) return String(id)
  }
  return ''
}

export function setup () {
  if (!EMPLOYEE_TOKEN && !CITIZEN_TOKEN) {
    console.warn(
      'لا يوجد TOKEN — سيُختبر فقط المسار العام. مري EMPLOYEE_TOKEN و/أو CITIZEN_TOKEN.'
    )
  }

  let taskId = TASK_ID
  let processId = PROCESS_ID

  if (!taskId && EMPLOYEE_TOKEN) {
    const res = http.get(`${BASE_URL}/api/workflow/tasks?status=all&limit=10`, {
      headers: authHeaders(EMPLOYEE_TOKEN)
    })
    if (res.status === 200) {
      taskId = firstTaskId(parseJson(res))
    }
    if (!taskId) {
      console.warn(
        'لا يوجد task_id في صندوق المهام — لن يُختبر GET /api/workflow/tasks/{taskId}'
      )
    }
  }

  if (!processId && CITIZEN_TOKEN) {
    const res = http.get(
      `${BASE_URL}/api/process_definitions/auth/0?page=1&limit=3`,
      { headers: authHeaders(CITIZEN_TOKEN) }
    )
    if (res.status === 200) {
      processId = firstProcessId(parseJson(res))
    }
    if (!processId) {
      console.warn(
        'لا يوجد process_id — لن يُختبر GET /api/stage_config/config/{id}'
      )
    }
  }

  return {
    baseUrl: BASE_URL,
    employeeToken: EMPLOYEE_TOKEN,
    citizenToken: CITIZEN_TOKEN,
    taskId,
    processId,
    typeTransId: TYPE_TRANS_ID
  }
}

export default function (data) {
  const base = data.baseUrl

  group('public — فحص تحديث التطبيق', () => {
    getOk(
      `${base}/api/app-updates/settings?app=citizen&platform=android&current_version_code=1`,
      { tags: { name: 'GET /api/app-updates/settings citizen' } }
    )
    getOk(
      `${base}/api/app-updates/settings?app=employee&platform=android&current_version_code=1`,
      { tags: { name: 'GET /api/app-updates/settings employee' } }
    )
  })

  if (data.citizenToken) {
    const headers = authHeaders(data.citizenToken)

    group('citizen — معاملاتي والعمليات الظاهرة', () => {
      getOk(`${base}/api/transaction/my/counts`, {
        headers,
        tags: { name: 'GET /api/transaction/my/counts' }
      })
      getOk(`${base}/api/transaction/my?limit=10`, {
        headers,
        tags: { name: 'GET /api/transaction/my' }
      })
      getOk(`${base}/api/typeProcess`, {
        headers,
        tags: { name: 'GET /api/typeProcess' }
      })
      getOk(`${base}/api/process_definitions/auth/0?page=1&limit=3`, {
        headers,
        tags: { name: 'GET /api/process_definitions/auth/0' }
      })
      getOk(`${base}/api/notifications/my?limit=10`, {
        headers,
        tags: { name: 'GET /api/notifications/my (citizen)' }
      })

      if (data.processId) {
        getOk(`${base}/api/stage_config/config/${data.processId}`, {
          headers,
          tags: { name: 'GET /api/stage_config/config/:id' }
        })
      }
    })
  }

  if (data.employeeToken) {
    const headers = authHeaders(data.employeeToken)

    group('employee — صندوق المهام', () => {
      getOk(`${base}/api/workflow/tasks?status=all`, {
        headers,
        tags: { name: 'GET /api/workflow/tasks' }
      })
      getOk(`${base}/api/workflow/tasks?status=active`, {
        headers,
        tags: { name: 'GET /api/workflow/tasks?status=active' }
      })
      getOk(`${base}/api/workflow/tasks?status=pending_pickup`, {
        headers,
        tags: { name: 'GET /api/workflow/tasks?status=pending_pickup' }
      })
      if (data.taskId) {
        getOk(`${base}/api/workflow/tasks/${data.taskId}`, {
          headers,
          tags: { name: 'GET /api/workflow/tasks/:taskId' }
        })
      }
      getOk(`${base}/api/typeProcess/employee`, {
        headers,
        tags: { name: 'GET /api/typeProcess/employee' }
      })
      getOk(`${base}/api/process_definitions/type/${data.typeTransId}`, {
        headers,
        tags: { name: 'GET /api/process_definitions/type/:id' }
      })
      getOk(`${base}/api/organization/employee`, {
        headers,
        tags: { name: 'GET /api/organization/employee' }
      })
      getOk(`${base}/api/notifications/my?limit=10`, {
        headers,
        tags: { name: 'GET /api/notifications/my (employee)' }
      })
    })
  }

  sleep(1)
}
