const axios = require('axios');

const BASE_URL = 'http://localhost:5050';

async function testCarryForward() {
  console.log('🧪 Testing Quarterly Carry-Forward...\n');
  
  try {
    // Get an employee
    const employeesResponse = await axios.get(`${BASE_URL}/api/employees`);
    const employee = employeesResponse.data[0];
    
    console.log(`Using employee: ${employee.firstname} ${employee.lastname} (ID: ${employee._id})`);
    
    // Test carry-forward from Q1 2025 to Q2 2025
    console.log('\nTesting carry-forward from Q1 2025 to Q2 2025...');
    
    const carryForwardResponse = await axios.post(`${BASE_URL}/api/leaves/test-carry-forward`, {
      employeeId: employee._id,
      fromYear: 2025,
      fromQuarter: 'Q1'
    });
    
    console.log('Carry-forward result:');
    console.log(JSON.stringify(carryForwardResponse.data, null, 2));
    
    // Check Q2 balance after carry-forward
    console.log('\nChecking Q2 balance after carry-forward...');
    const q2BalanceResponse = await axios.get(`${BASE_URL}/api/leaves/${employee._id}/quarterly-balance`);
    
    console.log('Q2 Balance with carry-forward:');
    console.log(JSON.stringify(q2BalanceResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testCarryForward();
