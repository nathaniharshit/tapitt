const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/tapitt').then(async () => {
  const Settings = mongoose.model('Settings', new mongoose.Schema({
    category: { type: String, required: true },
    subcategory: { type: String, required: true },
    key: { type: String, required: true },
    value: mongoose.Schema.Types.Mixed,
    description: String,
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }));
  
  const payrollSettings = await Settings.find({ 
    category: 'payroll', 
    subcategory: 'standards',
    isActive: true 
  }).sort({ key: 1 });
  
  console.log('Current Payroll Standards (Settings-based):');
  console.log('==========================================');
  payrollSettings.forEach(setting => {
    const value = setting.value;
    console.log(`${setting.key}:`);
    console.log(`  Type: ${value.type || 'N/A'}`);
    console.log(`  Amount: ${value.amount || 'N/A'}`);
    console.log(`  Calculation: ${value.calculationType || 'N/A'}`);
    console.log(`  Description: ${value.description || 'N/A'}`);
    console.log('  ---');
  });
  
  console.log(`\nTotal payroll standards found: ${payrollSettings.length}`);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
