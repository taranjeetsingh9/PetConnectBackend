// test/test-server-status.js
require('dotenv').config();
const axios = require('axios');

async function testServerStatus() {
  console.log('🔍 CHECKING SERVER STATUS\n');
  
  try {
    // Test basic server response
    const response = await axios.get('http://localhost:5001/');
    console.log('✅ Server is running on port 5001');
    console.log('📄 Serving:', response.config.url);
    
    // Test if auth endpoint exists
    try {
      const authResponse = await axios.get('http://localhost:5001/api/auth');
      console.log('✅ Auth endpoint responding');
    } catch (authError) {
      console.log('⚠️  Auth endpoint may require specific routes');
    }
    
    // Test if pets endpoint exists (usually public)
    try {
      const petsResponse = await axios.get('http://localhost:5001/api/pets');
      console.log('✅ Pets endpoint responding');
    } catch (petsError) {
      console.log('⚠️  Pets endpoint may require authentication');
    }
    
    console.log('\n🎉 Server is running! Ready for endpoint testing.');
    
  } catch (error) {
    console.log('❌ Server not responding:', error.message);
    console.log('\n💡 Make sure your server is running:');
    console.log('   npm start or node server.js');
  }
}

testServerStatus();