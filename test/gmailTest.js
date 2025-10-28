require('dotenv').config();
const nodemailer = require('nodemailer');

async function testGmail() {
  console.log('🧪 Testing Gmail Configuration...\n');
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    // Test connection
    await transporter.verify();
    console.log('✅ Gmail connection successful!');
    
    // Try to send test email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: 'PetConnect Test Email',
      text: 'If you receive this, your email configuration is working!'
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    
  } catch (error) {
    console.log('❌ Email test failed:', error.message);
    console.log('\n🔧 Common Solutions:');
    console.log('1. Enable 2FA and use App Passwords');
    console.log('2. Or enable "Less secure app access"');
    console.log('3. Check if password has special characters');
  }
}

testGmail();