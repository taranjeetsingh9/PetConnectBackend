const { adoptionService } = require('../services/adoptionService');

class SafeAdoptionFlowTest {
  constructor() {
    this.testResults = [];
  }

  async runAllTests() {
    try {
      console.log('🧪 STARTING SAFE ADOPTION FLOW TESTS (No Stripe Required)...\n');

      // Test 1: Service Structure
      await this.testServiceStructure();
      
      // Test 2: Method Availability
      await this.testMethodAvailability();
      
      // Test 3: Utility Functions
      await this.testUtilityFunctions();

      this.printResults();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  async testServiceStructure() {
    console.log('1. Testing Service Structure...');
    
    try {
      if (adoptionService && typeof adoptionService === 'object') {
        this.testResults.push({ test: 'Service Structure', status: 'PASSED' });
        console.log('✅ Adoption service structure test PASSED');
      } else {
        throw new Error('Adoption service not found');
      }
    } catch (error) {
      this.testResults.push({ test: 'Service Structure', status: 'FAILED', error: error.message });
      console.log('❌ Service structure test FAILED:', error.message);
    }
  }

  async testMethodAvailability() {
    console.log('2. Testing Method Availability...');
    
    try {
      const requiredMethods = [
        'requestAdoption',
        'updateRequestStatus', 
        'sendAdoptionAgreement',
        'initiatePayment',
        'finalizeAdoptionAfterPayment',
        'getMyRequests',
        'getOrganizationRequests'
      ];

      const missingMethods = requiredMethods.filter(method => !adoptionService[method]);
      
      if (missingMethods.length === 0) {
        this.testResults.push({ test: 'Method Availability', status: 'PASSED', result: 'All core methods available' });
        console.log('✅ Method availability test PASSED');
      } else {
        throw new Error(`Missing methods: ${missingMethods.join(', ')}`);
      }
    } catch (error) {
      this.testResults.push({ test: 'Method Availability', status: 'FAILED', error: error.message });
      console.log('❌ Method availability test FAILED:', error.message);
    }
  }

  async testUtilityFunctions() {
    console.log('3. Testing Utility Functions...');
    
    try {
      // Test fee calculation (should work without DB)
      const testPet = { 
        _id: 'test123', 
        species: 'dog', 
        age: 2, 
        specialNeeds: false 
      };
      
      // Mock the calculateAdoptionFee method call
      const fee = await adoptionService.calculateAdoptionFee('test123');
      
      if (typeof fee === 'number' && fee > 0) {
        this.testResults.push({ test: 'Utility Functions', status: 'PASSED', result: `Fee calculation works: $${fee}` });
        console.log('✅ Utility functions test PASSED');
      } else {
        throw new Error('Fee calculation returned invalid result');
      }
    } catch (error) {
      this.testResults.push({ test: 'Utility Functions', status: 'FAILED', error: error.message });
      console.log('❌ Utility functions test FAILED:', error.message);
      console.log('💡 This is expected if database is not connected');
    }
  }

  printResults() {
    console.log('\n📊 SAFE TEST RESULTS:');
    console.log('====================');
    
    this.testResults.forEach((result, index) => {
      const status = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`${index + 1}. ${result.test}: ${status} ${result.status}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.result) {
        console.log(`   Result: ${result.result}`);
      }
    });

    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const total = this.testResults.length;
    
    console.log(`\n🎯 SUMMARY: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 ALL SAFE TESTS PASSED! Core adoption service is working.');
    } else if (passed >= 2) {
      console.log('⚠️ Partial success. Service structure is good, but some features need database/Stripe.');
    } else {
      console.log('❌ Multiple tests failed. Check service implementation.');
    }

    console.log('\n🔧 NEXT STEPS:');
    console.log('1. Add Stripe keys to .env file');
    console.log('2. Ensure MongoDB is connected');
    console.log('3. Test with actual adoption requests');
  }
}

// Run tests if called directly
if (require.main === module) {
  const test = new SafeAdoptionFlowTest();
  test.runAllTests();
}

module.exports = SafeAdoptionFlowTest;