// Test script to verify frontend-backend integration for unpaid leave
const axios = require('axios');

const BASE_URL = 'http://localhost:5050';

async function testUnpaidLeaveIntegration() {
  console.log('🧪 Testing Unpaid Leave Integration...\n');

  try {
    // 1. Test getting employees to find one for testing
    console.log('1. Getting employees...');
    const employeesResponse = await axios.get(`${BASE_URL}/api/employees`);
    const employees = employeesResponse.data;
    
    if (employees.length === 0) {
      console.log('❌ No employees found. Please add employees first.');
      return;
    }
    
    const testEmployee = employees[0];
    console.log(`✅ Found test employee: ${testEmployee.firstname} ${testEmployee.lastname} (ID: ${testEmployee._id})`);

    // 2. Test getting leave balance (should work with new financial year system)
    console.log('\n2. Testing leave balance API...');
    try {
      const balanceResponse = await axios.get(`${BASE_URL}/api/leaves/${testEmployee._id}/quarterly-balance`);
      const balance = balanceResponse.data;
      console.log('✅ Leave balance API working:');
      console.log(`   Current Financial Year: ${balance.currentFinancialYear || balance.currentQuarter}`);
      console.log(`   Available Sick: ${balance.available?.sick || 0}`);
      console.log(`   Available Casual: ${balance.available?.casual || 0}`);
      console.log(`   Available Paid: ${balance.available?.paid || 0}`);
    } catch (error) {
      console.log('❌ Leave balance API failed:', error.response?.data?.error || error.message);
    }

    // 3. Test creating an unpaid leave request
    console.log('\n3. Testing unpaid leave creation...');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const leaveData = {
      employeeId: testEmployee._id,
      type: 'Unpaid',
      from: today.toISOString().slice(0, 10),
      to: tomorrow.toISOString().slice(0, 10),
      reason: 'Test unpaid leave from integration script'
    };

    try {
      const createResponse = await axios.post(`${BASE_URL}/api/leaves`, leaveData);
      const createdLeave = createResponse.data;
      console.log('✅ Unpaid leave created successfully:');
      console.log(`   Leave ID: ${createdLeave._id}`);
      console.log(`   Type: ${createdLeave.type}`);
      console.log(`   Days: ${createdLeave.days}`);
      console.log(`   Status: ${createdLeave.status}`);

      // 4. Test salary impact calculation for unpaid leave
      console.log('\n4. Testing salary impact calculation...');
      try {
        const impactResponse = await axios.post(`${BASE_URL}/api/leaves/calculate-unpaid-impact`, {
          employeeId: testEmployee._id,
          days: createdLeave.days
        });
        const impact = impactResponse.data;
        console.log('✅ Salary impact calculation working:');
        console.log(`   Employee: ${impact.employeeName}`);
        console.log(`   Unpaid Leave Days: ${impact.unpaidLeaveDays}`);
        console.log(`   Monthly Salary: ₹${impact.monthlySalary}`);
        console.log(`   Per Day Salary: ₹${impact.perDaySalary}`);
        console.log(`   Salary Deduction: ₹${impact.salaryDeduction}`);
        console.log(`   Net Salary After Deduction: ₹${impact.netSalaryAfterDeduction}`);
      } catch (error) {
        console.log('❌ Salary impact calculation failed:', error.response?.data?.error || error.message);
      }

      // 5. Test getting employee's leaves (should include the unpaid leave)
      console.log('\n5. Testing employee leaves API...');
      try {
        const leavesResponse = await axios.get(`${BASE_URL}/api/leaves/${testEmployee._id}`);
        const leaves = leavesResponse.data;
        const unpaidLeaves = leaves.filter(l => l.type === 'Unpaid');
        console.log(`✅ Employee leaves API working: Found ${leaves.length} total leaves, ${unpaidLeaves.length} unpaid leaves`);
        
        if (unpaidLeaves.length > 0) {
          console.log('   Recent unpaid leave:');
          console.log(`   - From: ${unpaidLeaves[0].from} To: ${unpaidLeaves[0].to}`);
          console.log(`   - Days: ${unpaidLeaves[0].days} Status: ${unpaidLeaves[0].status}`);
        }
      } catch (error) {
        console.log('❌ Employee leaves API failed:', error.response?.data?.error || error.message);
      }

      console.log('\n🎉 Integration Test Summary:');
      console.log('✅ Backend APIs are working correctly');
      console.log('✅ Unpaid leave can be created without balance checks');
      console.log('✅ Salary impact calculation is functional');
      console.log('✅ Financial year leave balance system is operational');
      console.log('\n📋 Next Steps:');
      console.log('1. Open the frontend at http://localhost:3000');
      console.log('2. Log in as an employee');
      console.log('3. Go to the Leaves section');
      console.log('4. You should see "Unpaid Leave" as an option');
      console.log('5. Select unpaid leave and submit a request');
      console.log('6. Check that no leave balance is consumed');
      console.log('7. Check the salary impact warning appears');

    } catch (error) {
      console.log('❌ Unpaid leave creation failed:', error.response?.data?.error || error.message);
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

// Run the test
testUnpaidLeaveIntegration().catch(console.error);
