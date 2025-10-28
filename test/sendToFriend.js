require('dotenv').config();
const nodemailer = require('nodemailer');

async function sendToFriend() {
  console.log('📧 Sending Test Email to Friend...\n');
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  // Replace with your friend's email
  const friendEmail = 'your.friend@email.com'; // ← CHANGE THIS
  
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: friendEmail,
      subject: '🚀 PetConnect Platform Test - Amazing Pet Adoption System!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #667eea; border-radius: 10px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1>🐾 PetConnect Demo</h1>
            <p>Professional Pet Adoption Platform</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
            <h2>Hello! 👋</h2>
            
            <p>This is a <strong>test email</strong> from the <strong>PetConnect platform</strong> I built!</p>
            
            <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3>🎯 What This System Can Do:</h3>
              <ul>
                <li>🐕 Complete pet adoption workflow</li>
                <li>💳 Secure payment processing (Stripe)</li>
                <li>📝 Digital agreements & e-signatures</li>
                <li>📧 Professional email notifications</li>
                <li>🔔 Real-time notifications</li>
                <li>📄 PDF document generation</li>
                <li>👥 Multi-role system (Adopters, Staff, Admin)</li>
              </ul>
            </div>
            
            <p><strong>Technical Stack:</strong> Node.js, Express, MongoDB, Stripe, Cloudinary, Socket.io</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; display: inline-block;">
                <p style="margin: 0; font-size: 18px; color: #667eea;">
                  <strong>✅ SYSTEM STATUS: FULLY OPERATIONAL</strong>
                </p>
              </div>
            </div>
            
            <p>This email confirms that the entire notification and email system is working perfectly!</p>
            
            <p>Best regards,<br>
            <strong>PetConnect Development Team</strong></p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>This is a test email from a production-ready pet adoption platform</p>
          </div>
        </div>
      `
    });
    
    console.log('✅ Email sent successfully to your friend!');
    console.log('📧 Message ID:', info.messageId);
    console.log('👤 From:', process.env.EMAIL_FROM);
    console.log('📬 To:', friendEmail);
    console.log('\n🎉 Your friend should receive this email shortly!');
    
  } catch (error) {
    console.log('❌ Failed to send email:', error.message);
  }
}

// Replace this email with your friend's actual email
const friendEmail = 'haimanyu@sheridancollege.ca'; 

if (friendEmail === 'haimanyu@sheridancollege.ca') {
  console.log('❌ Please update the friendEmail variable with your friend\'s actual email address!');
  console.log('📝 Edit the file and change: const friendEmail = "your.friend@email.com"');
} else {
  sendToFriend();
}