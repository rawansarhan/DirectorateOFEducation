function generateBPMN(process, stages) {

  let nodes = ''
  let flows = ''

  const startId = 'start'
  const endId = 'end'

  // 🔥 helper: إيجاد stage بالـ code
  const findStage = (code) => stages.find(s => s.code === code)

  stages.forEach((stage, index) => {

    const id = stage.camunda_task_key || stage.code

    // ================== candidate groups ==================
    const groups = stage.stage_assignments?.map(
      a => a.organization_department_role?.camunda_group_key
    ).filter(Boolean)

    const extension = groups.length
      ? `
        <bpmn:extensionElements>
          <camunda:candidateGroups>${groups.join(',')}</camunda:candidateGroups>
        </bpmn:extensionElements>
      `
      : ''

    let node = ''

    // =====================================================
    // 🟢 USER TASK / APPROVAL / UPLOAD
    // =====================================================
    if (
      stage.type === 'USER_TASK' ||
      stage.type === 'UPLOAD' ||
      stage.type === 'APPROVAL'
    ) {

      node = `
        <bpmn:userTask id="${id}" name="${stage.name}">
          ${extension}
        </bpmn:userTask>
      `

      nodes += node + '\n'

      // 🔗 ربط مع البداية أو المرحلة السابقة
      if (index === 0) {
        flows += `
          <bpmn:sequenceFlow 
            id="flow_start_to_${id}" 
            sourceRef="${startId}" 
            targetRef="${id}" 
          />
        `
      }

      // =====================================================
      // 🔥 APPROVAL LOGIC
      // =====================================================
      if (stage.type === 'APPROVAL') {

        const gatewayId = `${id}_gateway`

        // gateway
        nodes += `
          <bpmn:exclusiveGateway id="${gatewayId}" name="decision_${stage.name}" />
        `

        // flow task → gateway
        flows += `
          <bpmn:sequenceFlow 
            id="flow_${id}_to_gateway" 
            sourceRef="${id}" 
            targetRef="${gatewayId}" 
          />
        `

        // 🔥 transitions من DB (بشكل بسيط)
        const config = stage.stage_configs?.find(c => c.type === 'transitions')
        const transitions = config?.config_json || {}

        // approve → next stage (حسب order إذا ما محدد)
        let approveTarget = transitions.approve
        if (!approveTarget && stages[index + 1]) {
          approveTarget = stages[index + 1].code
        }

        if (approveTarget) {
          flows += `
            <bpmn:sequenceFlow 
              id="flow_${gatewayId}_approve" 
              sourceRef="${gatewayId}" 
              targetRef="${approveTarget}">
              <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">
                \${action == "approve"}
              </bpmn:conditionExpression>
            </bpmn:sequenceFlow>
          `
        }

        // reject → end
        flows += `
          <bpmn:sequenceFlow 
            id="flow_${gatewayId}_reject" 
            sourceRef="${gatewayId}" 
            targetRef="${endId}">
            <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">
              \${action == "reject"}
            </bpmn:conditionExpression>
          </bpmn:sequenceFlow>
        `

        // return → previous stage
        let returnTarget = transitions.return
        if (!returnTarget && stages[index - 1]) {
          returnTarget = stages[index - 1].code
        }

        if (returnTarget) {
          flows += `
            <bpmn:sequenceFlow 
              id="flow_${gatewayId}_return" 
              sourceRef="${gatewayId}" 
              targetRef="${returnTarget}">
              <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">
                \${action == "return"}
              </bpmn:conditionExpression>
            </bpmn:sequenceFlow>
          `
        }

        return
      }

      // =====================================================
      // 🟢 USER TASK العادي → يروح للمرحلة التالية
      // =====================================================
      if (stage.type !== 'APPROVAL') {

        const next = stages[index + 1]

        if (next) {
          flows += `
            <bpmn:sequenceFlow 
              id="flow_${id}_to_${next.code}" 
              sourceRef="${id}" 
              targetRef="${next.code}" 
            />
          `
        } else {
          flows += `
            <bpmn:sequenceFlow 
              id="flow_${id}_to_end" 
              sourceRef="${id}" 
              targetRef="${endId}" 
            />
          `
        }
      }
    }

    // =====================================================
    // 🟡 SYSTEM TASK
    // =====================================================
    else if (
      stage.type === 'SYSTEM_TASK' ||
      stage.type === 'DOCUMENT' ||
      stage.type === 'NOTIFICATION'
    ) {

      node = `<bpmn:serviceTask id="${id}" name="${stage.name}" />`

      nodes += node + '\n'

      const next = stages[index + 1]

      if (next) {
        flows += `
          <bpmn:sequenceFlow 
            id="flow_${id}_to_${next.code}" 
            sourceRef="${id}" 
            targetRef="${next.code}" 
          />
        `
      } else {
        flows += `
          <bpmn:sequenceFlow 
            id="flow_${id}_to_end" 
            sourceRef="${id}" 
            targetRef="${endId}" 
          />
        `
      }
    }

    // =====================================================
    // 🔵 DECISION (Gateway حقيقي)
    // =====================================================
    else if (stage.type === 'DECISION') {

      node = `<bpmn:exclusiveGateway id="${id}" name="${stage.name}" />`
      nodes += node + '\n'

      // 🔥 config فيه expressions
      const decisionConfig = stage.stage_configs?.find(
        c => c.type === 'decision'
      )

      const branches = decisionConfig?.config_json?.branches || []

      branches.forEach((b, idx) => {
        flows += `
          <bpmn:sequenceFlow 
            id="flow_${id}_${idx}" 
            sourceRef="${id}" 
            targetRef="${b.target}">
            <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">
              ${b.expression}
            </bpmn:conditionExpression>
          </bpmn:sequenceFlow>
        `
      })

      // ربط المرحلة السابقة بالـ gateway
      if (index > 0) {
        const prev = stages[index - 1]
        flows += `
          <bpmn:sequenceFlow 
            id="flow_${prev.code}_to_${id}" 
            sourceRef="${prev.code}" 
            targetRef="${id}" 
          />
        `
      }
    }

  })

  // =====================================================
  // 🟢 FINAL XML
  // =====================================================
  return `
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:camunda="http://camunda.org/schema/1.0/bpmn">

  <bpmn:process id="${process.code}" isExecutable="true">

    <bpmn:startEvent id="${startId}" />
    
    ${nodes}

    <bpmn:endEvent id="${endId}" />

    ${flows}

  </bpmn:process>

</bpmn:definitions>
  `
}