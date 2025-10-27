// tests/test-digital-signature-simple.js
require('dotenv').config();
const eSignatureService = require('../services/eSignatureService');
const cloudinaryDocService = require('../services/cloudinaryDocumentService');

async function testDigitalSignatureSimple() {
  try {
    console.log('🧪 Testing Digital Signature (Simple Version)...\n');

    // 1. Generate original PDF
    console.log('1. 📄 Generating original PDF...');
    const mockRequest = {
      pet: { name: 'Signature Test Pet', breed: 'Test Breed', age: 'Test Age' },
      adopter: { name: 'Test Signer', email: 'test@example.com' },
      organization: { name: 'Test Shelter' }
    };

    const originalPdf = await eSignatureService.generateAgreementPDF(mockRequest, []);
    console.log('✅ Original PDF generated');

    // 2. Create mock signature (base64 of a simple line)
    console.log('\n2. 🖊️ Creating mock signature...');
    const mockSignature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    // 3. Add signature to PDF using simple method
    console.log('\n3. 📝 Adding signature to PDF (simple method)...');
    const signedPdf = await eSignatureService.addSignatureToPDFSimple(
      originalPdf,
      mockSignature,
      {
        adopterName: 'Test Signer',
        signedAt: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        userAgent: 'Test Browser',
        petName: 'Signature Test Pet'
      }
    );
    console.log('✅ Signature added to PDF');

    // 4. Upload signed PDF to Cloudinary
    console.log('\n4. ☁️ Uploading signed PDF...');
    const cloudinaryResult = await cloudinaryDocService.uploadAgreementPDF(
      signedPdf,
      'test-signature-simple-123',
      'signed'
    );
    console.log('✅ Signed PDF uploaded to Cloudinary');
    console.log('   🔗 URL:', cloudinaryResult.url);

    console.log('\n🎉 DIGITAL SIGNATURE TEST COMPLETED SUCCESSFULLY!');
    return cloudinaryResult;

  } catch (error) {
    console.error('❌ Digital signature test failed:', error);
  }
}

testDigitalSignatureSimple();