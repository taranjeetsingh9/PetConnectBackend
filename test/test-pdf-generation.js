// tests/test-pdf-generation.js
const eSignatureService = require('../services/eSignatureService');

async function testPDFGeneration() {
  try {
    const mockRequest = {
      pet: { name: 'Buddy', breed: 'Golden Retriever', age: '2 years', specialNeeds: 'None', medicalHistory: 'Up to date on vaccinations' },
      adopter: { name: 'John Doe', email: 'john@example.com' },
      organization: { name: 'Happy Paws Shelter' }
    };

    const pdfBytes = await eSignatureService.generateAgreementPDF(mockRequest, [
      'Adopter agrees to provide monthly updates for the first 6 months.',
      'Organization may share success stories and photos for promotional purposes.'
    ]);

    // Save test PDF
    const fs = require('fs').promises;
    await fs.writeFile('./test-agreement.pdf', pdfBytes);
    console.log('✅ Test PDF saved as test-agreement.pdf');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPDFGeneration();