// services/paymentService.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class PaymentService {
  
  /**
   * Create a Stripe Payment Intent
   */
  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    try {
      console.log(' Creating Stripe payment intent for amount:', amount);
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          ...metadata,
          created_at: new Date().toISOString(),
          system: 'petconnect-adoption'
        }
      });
      
      console.log('Stripe payment intent created:', paymentIntent.id);
      
      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100, // Convert back to dollars
        currency: paymentIntent.currency
      };
      
    } catch (error) {
      console.error(' Stripe payment intent error:', error);
      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }

  /**
   * Retrieve payment intent details
   */
  async getPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      throw new Error(`Failed to retrieve payment: ${error.message}`);
    }
  }

  /**
   * Confirm if payment was successful
   */
  async confirmPayment(paymentIntentId) {
    try {
      const paymentIntent = await this.getPaymentIntent(paymentIntentId);
      
      return {
        success: paymentIntent.status === 'succeeded',
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        receiptUrl: paymentIntent.charges?.data[0]?.receipt_url || null
      };
      
    } catch (error) {
      console.error('Error confirming payment:', error);
      return { success: false, error: error.message };
    }
  }

  async handleWebhook(payload, signature) {
    try {
      // For now, just log the webhook and return success
      // In production, you'll need to set up proper webhook verification
      console.log(' Stripe webhook received (mock implementation)');
      console.log('Signature:', signature ? 'Present' : 'Missing');
      console.log('Payload length:', payload.length);
      
      // Mock successful handling for now
      return { 
        success: true, 
        message: 'Webhook received successfully (mock)' 
      };
      
    } catch (error) {
      console.error(' Webhook error:', error);
      throw new Error(`Webhook error: ${error.message}`);
    }
  }
}

// Create singleton instance
const paymentService = new PaymentService();

module.exports = paymentService;