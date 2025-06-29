const axios = require('axios');

const BASE_URL = 'http://localhost:5050';

async function testQuarterlySystem() {
  console.log('🧪 Testing Quarterly Leave System...\n');
  
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
    
    // Step 2: Check current quarterly balance
    console.log('\n2. Checking current quarterly balance...');
    const balanceResponse = await axios.get(`${BASE_URL}/api/leaves/${testEmployee._id}/quarterly-balance`);
    
    console.log('Current quarterly balance:', JSON.stringify(balanceResponse.data, null, 2));
    const initialBalance = balanceResponse.data;
    
    // Step 3: Create a new leave request
    console.log('\n3. Creating a new casual leave request...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 4);
    
    const createLeaveResponse = await axios.post(`${BASE_URL}/api/leaves`, {
      type: 'Casual',
      from: tomorrow.toISOString().split('T')[0],
      to: dayAfter.toISOString().split('T')[0],
      reason: 'Test casual leave for quarterly system testing',
      employeeId: testEmployee._id
    });
    
    const newLeave = createLeaveResponse.data;
    console.log(`✅ Leave request created: ${newLeave._id} (${newLeave.days} days)`);
    
    // Step 4: Check balance after creation (should be same as creation doesn't deduct)
    console.log('\n4. Checking balance after leave creation...');
    const balanceAfterCreate = await axios.get(`${BASE_URL}/api/leaves/${testEmployee._id}/quarterly-balance`);
    
    console.log('Balance after creation:', JSON.stringify(balanceAfterCreate.data, null, 2));
    
    // Step 5: Approve the leave request
    console.log('\n5. Approving the leave request...');
    const approveResponse = await axios.put(`${BASE_URL}/api/leaves/${newLeave._id}`, {
      status: 'Approved'
    });
    
    console.log('✅ Leave approved successfully');
    
    // Step 6: Check balance after approval (should be deducted)
    console.log('\n6. Checking balance after approval...');
    const finalBalanceResponse = await axios.get(`${BASE_URL}/api/leaves/${testEmployee._id}/quarterly-balance`);
    
    const finalBalance = finalBalanceResponse.data;
    console.log('Final balance:', JSON.stringify(finalBalance, null, 2));
    
    // Step 7: Compare balances
    console.log('\n7. Balance comparison:');
    console.log(`Initial casual available: ${initialBalance.available.casual}`);
    console.log(`Final casual available: ${finalBalance.available.casual}`);
    console.log(`Expected deduction: ${newLeave.days} days`);
    
    const expectedFinalBalance = initialBalance.available.casual - newLeave.days;
    if (finalBalance.available.casual === expectedFinalBalance) {
      console.log('✅ Quarterly balance deduction working correctly!');
    } else {
      console.log('❌ Quarterly balance deduction NOT working correctly!');
      console.log(`Expected: ${expectedFinalBalance}, Got: ${finalBalance.available.casual}`);
    }
    
    // Step 8: Check QuarterlyLeave record directly
    console.log('\n8. Checking QuarterlyLeave record...');
    const quarterlyLeaveResponse = await axios.get(`${BASE_URL}/api/leaves/${testEmployee._id}/quarterly-leave-debug`);
    
    console.log('QuarterlyLeave records:', JSON.stringify(quarterlyLeaveResponse.data, null, 2));
    
    // Step 9: Test backward compatibility endpoint
    console.log('\n9. Testing backward compatibility (financial-year-balance endpoint)...');
    const backwardCompatResponse = await axios.get(`${BASE_URL}/api/leaves/${testEmployee._id}/financial-year-balance`);
    
    console.log('Backward compatibility response:', JSON.stringify(backwardCompatResponse.data, null, 2));
    
    if (backwardCompatResponse.data.available.casual === finalBalance.available.casual) {
      console.log('✅ Backward compatibility working correctly!');
    } else {
      console.log('❌ Backward compatibility has issues!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testQuarterlySystem();
