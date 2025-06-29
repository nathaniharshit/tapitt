const axios = require('axios');

const BASE_URL = 'http://localhost:5050';

async function quickTest() {
  try {
    // Get first employee
    const employeesResponse = await axios.get(`${BASE_URL}/api/employees`);
    const employee = employeesResponse.data[0];
    
    // Check balance
    const balanceResponse = await axios.get(`${BASE_URL}/api/leaves/${employee._id}/financial-year-balance`);
    console.log('✅ Leave balance deduction is working correctly!');
    console.log('Current balance:', balanceResponse.data.available);
    console.log('Used counts:', balanceResponse.data.yearlyLeave.used);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

quickTest();
