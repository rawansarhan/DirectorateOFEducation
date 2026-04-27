const {
  registerEmployee,
  registerCitizen,
  login
} = require('../services/auth')

// ================= REGISTER EMPLOYEE =================
const registerEmployeeUser = async (req, res) => {
  try {
    const result = await registerEmployee(req.body)
console.log(result)
    return res.status(201).json({
      success: true,
      message: 'Employee registered successfully',
      data: result
    })
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
}

// ================= REGISTER CITIZEN =================
const registerCitizenUser = async (req, res) => {
  try {
    const result = await registerCitizen(req.body)

    return res.status(201).json({
      success: true,
      message: 'Citizen registered successfully',
      data: result
    })
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
}

// ================= LOGIN =================
const loginUser = async (req, res) => {
  try {
    const result = await login(req.body)

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    })
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: err.message
    })
  }
}

module.exports = {
  registerEmployeeUser,
   registerCitizenUser ,
  loginUser
}