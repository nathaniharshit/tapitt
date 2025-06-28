#!/usr/bin/env node

const https = require('http');

const testPayrollFlow = async () => {
  console.log('=== Testing Payroll Update Flow ===\n');

  try {
    // 1. Get current payroll standards
    console.log('1. Checking current payroll standards...');
    const standards = await fetch('http://localhost:5050/api/payroll/standards');
    const standardsData = await standards.json();
    console.log('   Current standards:', standardsData);

    // 2. Get employee data 
    console.log('\n2. Checking employee payroll data...');
    const employees = await fetch('http://localhost:5050/api/employees');
    const employeesData = await employees.json();
    
    if (employeesData.length > 0) {
      const emp = employeesData[0];
      console.log(`   Employee: ${emp.firstname} ${emp.lastname}`);
      console.log('   Allowances:', emp.allowances);
      console.log('   Deductions:', emp.deductions);

      // 3. Test salary endpoint
      console.log('\n3. Testing salary endpoint...');
      const salary = await fetch(`http://localhost:5050/api/employees/${emp._id}/salary`);
      const salaryData = await salary.json();
      console.log('   Salary endpoint response:', salaryData);
    }

    console.log('\n=== Test Complete ===');
  } catch (error) {
    console.error('Error during test:', error.message);
  }
};

// For Node.js compatibility
const fetch = require('http').get;

// Convert to promise-based fetch for http
const promiseFetch = (url) => {
  return new Promise((resolve, reject) => {
    const req = require('http').get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ json: () => JSON.parse(data) });
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
  });
};

// Run the test
testPayrollFlow().catch(console.error);
