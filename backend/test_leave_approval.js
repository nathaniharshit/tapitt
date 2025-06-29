const axios = require('axios');

const BASE_URL = 'http://localhost:5050';

async function testLeaveApproval() {
  console.log('🧪 Testing Leave Approval and Balance Deduction...\n');
  
  try {
    // Step 1: Get all employees to find one to test with
    console.log('1. Getting employees list...');
    const employeesResponse = await axios.get(`${BASE_URL}/api/employees`);
    
    const employees = employeesResponse.data;
    if (!employees || employees.length === 0) {
      console.log('❌ No employees found for testing');
      return;
    }
    
    const testEmployee = employees[0];
    console.log(`✅ Using employee: ${testEmployee.firstname} ${testEmployee.lastname} (ID: ${testEmployee._id})`);
    
    // Step 2: Check current leave balance
    console.log('\n2. Checking current leave balance...');
    const balanceResponse = await axios.get(`${BASE_URL}/api/leaves/${testEmployee._id}/financial-year-balance`);
    
    console.log('Current leave balance:', JSON.stringify(balanceResponse.data, null, 2));
    const initialBalance = balanceResponse.data;
    
    // Step 3: Create a new leave request
    console.log('\n3. Creating a new sick leave request...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    
    const createLeaveResponse = await axios.post(`${BASE_URL}/api/leaves`, {
      type: 'Sick',
      from: tomorrow.toISOString().split('T')[0],
      to: dayAfter.toISOString().split('T')[0],
      reason: 'Test sick leave for approval testing',
      employeeId: testEmployee._id
    });
    
    const newLeave = createLeaveResponse.data;
    console.log(`✅ Leave request created: ${newLeave._id} (${newLeave.days} days)`);
    
    // Step 4: Check balance after creation (should be same as creation doesn't deduct)
    console.log('\n4. Checking balance after leave creation...');
    const balanceAfterCreate = await axios.get(`${BASE_URL}/api/leaves/${testEmployee._id}/financial-year-balance`);
    
    console.log('Balance after creation:', JSON.stringify(balanceAfterCreate.data, null, 2));
    
    // Step 5: Approve the leave request
    console.log('\n5. Approving the leave request...');
    const approveResponse = await axios.put(`${BASE_URL}/api/leaves/${newLeave._id}`, {
      status: 'Approved'
    });
    
    console.log('✅ Leave approved successfully');
    
    // Step 6: Check balance after approval (should be deducted)
    console.log('\n6. Checking balance after approval...');
    const finalBalanceResponse = await axios.get(`${BASE_URL}/api/leaves/${testEmployee._id}/financial-year-balance`);
    
    const finalBalance = finalBalanceResponse.data;
    console.log('Final balance:', JSON.stringify(finalBalance, null, 2));
    
    // Step 7: Compare balances
    console.log('\n7. Balance comparison:');
    console.log(`Initial sick available: ${initialBalance.available.sick}`);
    console.log(`Final sick available: ${finalBalance.available.sick}`);
    console.log(`Expected deduction: ${newLeave.days} days`);
    
    const expectedFinalBalance = initialBalance.available.sick - newLeave.days;
    if (finalBalance.available.sick === expectedFinalBalance) {
      console.log('✅ Balance deduction working correctly!');
    } else {
      console.log('❌ Balance deduction NOT working correctly!');
      console.log(`Expected: ${expectedFinalBalance}, Got: ${finalBalance.available.sick}`);
    }
    
    // Step 8: Check YearlyLeave record directly
    console.log('\n8. Checking YearlyLeave record...');
    const yearlyLeaveResponse = await axios.get(`${BASE_URL}/api/leaves/${testEmployee._id}/yearly-leave-debug`);
    
    console.log('YearlyLeave records:', JSON.stringify(yearlyLeaveResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testLeaveApproval();
