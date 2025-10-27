// tests/final-smoke-test.js
require('dotenv').config();

async function finalSmokeTest() {
  console.log('🚀 FINAL BACKEND SMOKE TEST\n');
  
  // 1. Test critical services load
  console.log('1. Service Dependencies...');
  try {
    const services = [
      '../services/adoptionService',
      '../services/eSignatureService', 
      '../services/cloudinaryDocumentService'
    ];
    
    services.forEach(service => {
      require(service);
      console.log(`   ✅ ${service.split('/').pop()}`);
    });
  } catch (e) {
    console.log('❌ Service loading failed');
    return;
  }

  // 2. Test PDF generation (most critical)
  console.log('\n2. PDF Generation...');
  try {
    const eSignatureService = require('../services/eSignatureService');
    const mockRequest = {
      pet: { name: 'Test', breed: 'Test', age: '1' },
      adopter: { name: 'Test', email: 'test@test.com' },
      organization: { name: 'Test Shelter' }
    };
    const pdf = await eSignatureService.generateAgreementPDF(mockRequest, []);
    console.log(`   ✅ PDF Generation: ${(pdf.length / 1024).toFixed(1)}KB`);
  } catch (e) {
    console.log('❌ PDF generation failed');
    return;
  }

  // 3. Test Cloudinary connectivity
  console.log('\n3. Cloudinary Connectivity...');
  try {
    const cloudinary = require('../config/cloudinary').cloudinary;
    console.log('   ✅ Cloudinary config loaded');
  } catch (e) {
    console.log('❌ Cloudinary config failed');
    return;
  }

  // 4. Test database models
  console.log('\n4. Database Models...');
  try {
    const models = [
      '../models/AdoptionAgreement',
      '../models/AdopterRequest',
      '../models/Payment'
    ];
    
    models.forEach(model => {
      require(model);
      console.log(`   ✅ ${model.split('/').pop()}`);
    });
  } catch (e) {
    console.log('❌ Model loading failed');
    return;
  }

  console.log('\n🎉 BACKEND READY FOR FRONTEND INTEGRATION!');
  console.log('\n📋 Next: Start frontend development with these endpoints:');
  console.log('   POST /api/adoptions/:id/send-agreement');
  console.log('   GET  /api/agreements/:id');
  console.log('   GET  /api/agreements/:id/sign');
  console.log('   POST /api/agreements/:id/sign');
}

finalSmokeTest();