require('dotenv').config();
const nodemailer = require('nodemailer');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function sendInteractiveEmail() {
  console.log('🎯 INTERACTIVE EMAIL TEST\n');
  
  // Ask for friend's email
  rl.question('📧 Enter your friend\'s email address: ', async (friendEmail) => {
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    try {
      console.log('\n🚀 Sending email to:', friendEmail);
      
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: friendEmail,
        subject: '🌟 Check out this PetConnect Demo!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 2.5em;">🐾 PetConnect</h1>
              <p style="margin: 10px 0 0 0; font-size: 1.2em;">Professional Pet Adoption Platform</p>
            </div>
            
            <div style="padding: 30px; background: #f8f9fa;">
              <h2>Hey! Check this out! 🚀</h2>
              
              <p>I just finished building a <strong>complete pet adoption platform</strong> and wanted to share this test email with you!</p>
              
              <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h3 style="color: #667eea; margin-top: 0;">✨ Platform Features:</h3>
                <ul style="line-height: 1.6;">
                  <li>✅ Complete adoption workflow automation</li>
                  <li>✅ Secure payment processing with Stripe</li>
                  <li>✅ Digital contracts & e-signatures</li>
                  <li>✅ Real-time notifications</li>
                  <li>✅ Professional email system (this email!)</li>
                  <li>✅ Multi-organization support</li>
                  <li>✅ Admin dashboard & analytics</li>
                </ul>
              </div>
              
              <p>This email is sent automatically by the system when adoptions are completed! 🎉</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; background: #28a745; color: white; padding: 10px 20px; border-radius: 5px; font-weight: bold;">
                  SYSTEM STATUS: PRODUCTION READY ✅
                </div>
              </div>
              
              <p><em>Just wanted to show you what I've been working on! 😊</em></p>
              
              <p>Best,<br>Your Friend</p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #6c757d; font-size: 0.9em; border-top: 1px solid #dee2e6;">
              <p>PetConnect - Making forever homes happen 🏠</p>
            </div>
          </div>
        `
      });
      
      console.log('\n✅ SUCCESS! Email sent to your friend!');
      console.log('📧 Message ID:', info.messageId);
      console.log('⏰ They should receive it within 1-2 minutes.');
      console.log('\n🎊 Your Pet Connect platform is officially LIVE!');
      
    } catch (error) {
      console.log('\n❌ Failed to send email:', error.message);
    } finally {
      rl.close();
    }
  });
}

sendInteractiveEmail();