const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  /**
   * Send adoption agreement email
   */
  async sendAgreementEmail(adopterEmail, adopterName, petName, agreementUrl, expiresInDays) {
    const subject = `Adoption Agreement Ready for ${petName}`;
    const html = this.generateAgreementEmailHTML(adopterName, petName, agreementUrl, expiresInDays);
    
    return await this.sendEmail(adopterEmail, subject, html);
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmationEmail(adopterEmail, adopterName, petName, amount, receiptUrl) {
    const subject = `Payment Confirmed - ${petName} is Officially Yours!`;
    const html = this.generatePaymentConfirmationHTML(adopterName, petName, amount, receiptUrl);
    
    return await this.sendEmail(adopterEmail, subject, html);
  }

  /**
   * Send adoption finalized email
   */
  async sendAdoptionFinalizedEmail(adopterEmail, adopterName, petName, certificateUrl) {
    const subject = `🎉 Congratulations! ${petName} is Now Part of Your Family`;
    const html = this.generateAdoptionFinalizedHTML(adopterName, petName, certificateUrl);
    
    return await this.sendEmail(adopterEmail, subject, html);
  }

  /**
   * Send meeting scheduled email
   */
  async sendMeetingScheduledEmail(adopterEmail, adopterName, petName, meetingDate, meetingType, meetingLink) {
    const subject = `Meeting Scheduled for ${petName}`;
    const html = this.generateMeetingScheduledHTML(adopterName, petName, meetingDate, meetingType, meetingLink);
    
    return await this.sendEmail(adopterEmail, subject, html);
  }

  /**
   * Generic email sender
   */
  async sendEmail(to, subject, html) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'PetConnect <noreply@petconnect.com>',
        to,
        subject,
        html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully to:', to);
      return result;
    } catch (error) {
      console.error(' Email sending failed:', error);
      throw error;
    }
  }

  /**
   * Generate Agreement Email HTML
   */
  generateAgreementEmailHTML(adopterName, petName, agreementUrl, expiresInDays) {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .urgency { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📝 Adoption Agreement Ready</h1>
        <p>Your journey with ${petName} continues!</p>
    </div>
    
    <div class="content">
        <h2>Hello ${adopterName},</h2>
        
        <p>Great news! Your adoption agreement for <strong>${petName}</strong> is ready for your review and signature.</p>
        
        <div class="urgency">
            <h3>⏰ Important Notice</h3>
            <p>This agreement will expire in <strong>${expiresInDays} days</strong>. Please sign it before the expiration date to continue with the adoption process.</p>
        </div>
        
        <p>To review and sign your adoption agreement:</p>
        
        <div style="text-align: center;">
            <a href="${agreementUrl}" class="button">Review & Sign Agreement</a>
        </div>
        
        <h3>What's Next?</h3>
        <ol>
            <li>Review the agreement terms carefully</li>
            <li>Provide your digital signature</li>
            <li>Proceed to payment (if applicable)</li>
            <li>Finalize the adoption process</li>
        </ol>
        
        <p><strong>Need help?</strong> Our team is here to answer any questions about the agreement terms.</p>
        
        <p>Best regards,<br>The PetConnect Team</p>
    </div>
    
    <div class="footer">
        <p>PetConnect Adoption System<br>
        Making forever homes happen, one paw at a time 🐾</p>
    </div>
</body>
</html>
    `;
  }

  /**
   * Generate Payment Confirmation Email HTML
   */
  generatePaymentConfirmationHTML(adopterName, petName, amount, receiptUrl) {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .confetti { font-size: 24px; text-align: center; margin: 20px 0; }
        .receipt { background: white; padding: 20px; border-radius: 5px; border: 1px solid #ddd; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>💰 Payment Confirmed!</h1>
        <p>${petName} is officially part of your family</p>
    </div>
    
    <div class="content">
        <div class="confetti">
            🎉 🐾 🎉
        </div>
        
        <h2>Congratulations, ${adopterName}!</h2>
        
        <p>Your payment has been processed successfully and <strong>${petName}</strong> is now officially adopted!</p>
        
        <div class="receipt">
            <h3>Payment Details</h3>
            <p><strong>Amount:</strong> $${amount}</p>
            <p><strong>Pet:</strong> ${petName}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Status:</strong> <span style="color: #4CAF50;">Completed</span></p>
            <a href="${receiptUrl}" style="color: #667eea;">Download Receipt</a>
        </div>
        
        <h3>What Happens Next?</h3>
        <ul>
            <li>Your adoption certificate is being generated</li>
            <li>You'll receive final adoption paperwork within 24 hours</li>
            <li>Our team will contact you about pickup/delivery arrangements</li>
        </ul>
        
        <p><strong>Welcome to the PetConnect family!</strong> We're so excited for you and ${petName} to begin this wonderful journey together.</p>
        
        <p>With warm regards,<br>The PetConnect Team</p>
    </div>
    
    <div class="footer">
        <p>PetConnect Adoption System<br>
        Thank you for choosing adoption 💕</p>
    </div>
</body>
</html>
    `;
  }

  /**
   * Generate Adoption Finalized Email HTML
   */
  generateAdoptionFinalizedHTML(adopterName, petName, certificateUrl) {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .celebrate { font-size: 28px; text-align: center; margin: 20px 0; }
        .certificate { background: white; padding: 25px; border-radius: 10px; border: 2px dashed #FF6B6B; margin: 25px 0; text-align: center; }
        .button { background: #FF6B6B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1> Adoption Finalized!</h1>
        <p>Your forever family is complete</p>
    </div>
    
    <div class="content">
        <div class="celebrate">
            🐾 💖 🐾
        </div>
        
        <h2>Welcome Home, ${petName}! 🏡</h2>
        
        <p>Dear ${adopterName},</p>
        
        <p>This is it! The moment we've all been waiting for. <strong>${petName}</strong> is officially and legally part of your family!</p>
        
        <div class="certificate">
            <h3>📜 Official Adoption Certificate</h3>
            <p>Your official adoption certificate is ready. This document certifies that ${petName} has found their forever home with you.</p>
            
            <div style="text-align: center;">
                <a href="${certificateUrl}" class="button">Download Certificate</a>
            </div>
            
            <p><small>We recommend framing this certificate as a beautiful memory of this special day!</small></p>
        </div>
        
        <h3>Your Adoption Journey</h3>
        <p>From the first meeting to this final step, you've shown incredible commitment to providing a loving home. ${petName} is one lucky pet!</p>
        
        <h3>Next Steps & Support</h3>
        <ul>
            <li>Keep your certificate in a safe place</li>
            <li>Update your pet's microchip information (if applicable)</li>
            <li>Join our adopter community for ongoing support</li>
            <li>Don't hesitate to reach out with any questions</li>
        </ul>
        
        <p><strong>Thank you for choosing adoption.</strong> You've not only changed ${petName}'s life forever, but you've also made space for us to rescue another animal in need.</p>
        
        <p>With deepest gratitude,<br>The Entire PetConnect Team</p>
    </div>
    
    <div class="footer">
        <p>PetConnect Adoption System<br>
        Creating happy endings, one adoption at a time 🌟</p>
    </div>
</body>
</html>
    `;
  }

  /**
   * Generate Meeting Scheduled Email HTML
   */
  generateMeetingScheduledHTML(adopterName, petName, meetingDate, meetingType, meetingLink) {
    const meetingTypeText = meetingType === 'virtual' ? 'Virtual Meeting' : 'In-Person Visit';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .meeting-details { background: white; padding: 20px; border-radius: 5px; border: 1px solid #ddd; margin: 20px 0; }
        .button { background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .preparation { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📅 Meeting Scheduled</h1>
        <p>Get ready to meet ${petName}!</p>
    </div>
    
    <div class="content">
        <h2>Hello ${adopterName},</h2>
        
        <p>Your ${meetingTypeText.toLowerCase()} with <strong>${petName}</strong> has been scheduled! We're excited for you to meet your potential new family member.</p>
        
        <div class="meeting-details">
            <h3>Meeting Details</h3>
            <p><strong>Date & Time:</strong> ${new Date(meetingDate).toLocaleString()}</p>
            <p><strong>Type:</strong> ${meetingTypeText}</p>
            <p><strong>Pet:</strong> ${petName}</p>
            ${meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${meetingLink}">Join Meeting</a></p>` : ''}
        </div>
        
        ${meetingType === 'virtual' ? `
        <div class="preparation">
            <h4>💻 Virtual Meeting Preparation</h4>
            <ul>
                <li>Test your camera and microphone beforehand</li>
                <li>Ensure good lighting so we can see you clearly</li>
                <li>Find a quiet space without distractions</li>
                <li>Have questions ready about ${petName}'s care</li>
            </ul>
        </div>
        ` : `
        <div class="preparation">
            <h4> In-Person Visit Preparation</h4>
            <ul>
                <li>Arrive 10-15 minutes early</li>
                <li>Bring a valid photo ID</li>
                <li>Wear comfortable clothing</li>
                <li>Be prepared to spend about an hour with us</li>
            </ul>
        </div>
        `}
        
        <p>This meeting is a great opportunity to:</p>
        <ul>
            <li>Get to know ${petName}'s personality</li>
            <li>Ask our staff any questions about care and needs</li>
            <li>Discuss the adoption process and timeline</li>
            <li>Ensure it's the perfect match for both of you</li>
        </ul>
        
        <p>We're looking forward to seeing you!</p>
        
        <p>Best regards,<br>The PetConnect Team</p>
    </div>
    
    <div class="footer">
        <p>PetConnect Adoption System<br>
        Connecting loving homes with paws in need 🐾</p>
    </div>
</body>
</html>
    `;
  }


// Add to services/emailService.js

/**
 * Send adoption request email (to staff)
 */
async sendAdoptionRequestEmail(staffEmail, staffName, petName, requestId) {
    const subject = `New Adoption Request for ${petName}`;
    const html = this.generateAdoptionRequestHTML(staffName, petName, requestId);
    
    return await this.sendEmail(staffEmail, subject, html);
  }
  
  /**
   * Send adoption approved email
   */
  async sendAdoptionApprovedEmail(adopterEmail, adopterName, petName, chatId) {
    const subject = ` Adoption Approved for ${petName}!`;
    const html = this.generateAdoptionApprovedHTML(adopterName, petName, chatId);
    
    return await this.sendEmail(adopterEmail, subject, html);
  }
  
  /**
   * Send agreement signed email (to staff)
   */
  async sendAgreementSignedEmail(staffEmail, staffName, petName) {
    const subject = `Agreement Signed for ${petName}`;
    const html = this.generateAgreementSignedHTML(staffName, petName);
    
    return await this.sendEmail(staffEmail, subject, html);
  }
  
  /**
   * Send generic notification email
   */
  async sendGenericNotificationEmail(userEmail, userName, message, type) {
    const subject = `PetConnect Notification: ${type}`;
    const html = this.generateGenericNotificationHTML(userName, message, type);
    
    return await this.sendEmail(userEmail, subject, html);
  }
  
  /**
   * Generate Adoption Request Email HTML (for staff)
   */
  generateAdoptionRequestHTML(staffName, petName, requestId) {
    return `
  <!DOCTYPE html>
  <html>
  <head>
      <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
  </head>
  <body>
      <div class="header">
          <h1>🐾 New Adoption Request</h1>
          <p>Action Required</p>
      </div>
      
      <div class="content">
          <h2>Hello ${staffName},</h2>
          
          <p>A new adoption request has been submitted for <strong>${petName}</strong>.</p>
          
          <p><strong>Request ID:</strong> ${requestId}</p>
          <p><strong>Pet:</strong> ${petName}</p>
          <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
          
          <div style="text-align: center;">
              <a href="/admin/adoptions/${requestId}" class="button">Review Request</a>
          </div>
          
          <p>Please review this request within 24 hours and update its status accordingly.</p>
          
          <p>Best regards,<br>PetConnect System</p>
      </div>
      
      <div class="footer">
          <p>PetConnect Adoption System</p>
      </div>
  </body>
  </html>
    `;
  }
  
  /**
   * Generate Adoption Approved Email HTML
   */
  generateAdoptionApprovedHTML(adopterName, petName, chatId) {
    return `
  <!DOCTYPE html>
  <html>
  <head>
      <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
  </head>
  <body>
      <div class="header">
          <h1> Adoption Approved!</h1>
          <p>Next Steps for ${petName}</p>
      </div>
      
      <div class="content">
          <h2>Congratulations, ${adopterName}!</h2>
          
          <p>Your adoption request for <strong>${petName}</strong> has been approved! 🎉</p>
          
          <p>We're excited to help you welcome ${petName} into your family. The next step is to schedule a meeting and discuss the adoption process.</p>
          
          <div style="text-align: center;">
              <a href="/chat/${chatId}" class="button">Chat with Our Team</a>
          </div>
          
          <h3>What's Next?</h3>
          <ol>
              <li>Chat with our team to schedule a meeting</li>
              <li>Meet ${petName} (virtual or in-person)</li>
              <li>Review and sign the adoption agreement</li>
              <li>Complete the adoption process</li>
          </ol>
          
          <p>Our team is here to support you every step of the way!</p>
          
          <p>Best regards,<br>The PetConnect Team</p>
      </div>
      
      <div class="footer">
          <p>PetConnect Adoption System</p>
      </div>
  </body>
  </html>
    `;
  }
  
  /**
   * Generate Agreement Signed Email HTML (for staff)
   */
  generateAgreementSignedHTML(staffName, petName) {
    return `
  <!DOCTYPE html>
  <html>
  <head>
      <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { background: #FF9800; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
  </head>
  <body>
      <div class="header">
          <h1> Agreement Signed</h1>
          <p>Ready for Next Steps</p>
      </div>
      
      <div class="content">
          <h2>Hello ${staffName},</h2>
          
          <p>The adoption agreement for <strong>${petName}</strong> has been signed! ✅</p>
          
          <p>The adopter has completed the digital signature and is ready to proceed with payment and finalization.</p>
          
          <div style="text-align: center;">
              <a href="/admin/adoptions" class="button">View Adoption Details</a>
          </div>
          
          <h3>Next Actions:</h3>
          <ul>
              <li>Wait for payment processing</li>
              <li>Prepare adoption certificate</li>
              <li>Schedule pet pickup/delivery</li>
              <li>Update pet status to "Adopted"</li>
          </ul>
          
          <p>This adoption is almost complete!</p>
          
          <p>Best regards,<br>PetConnect System</p>
      </div>
      
      <div class="footer">
          <p>PetConnect Adoption System</p>
      </div>
  </body>
  </html>
    `;
  }
  
  /**
   * Generate Generic Notification Email HTML
   */
  generateGenericNotificationHTML(userName, message, type) {
    return `
  <!DOCTYPE html>
  <html>
  <head>
      <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
  </head>
  <body>
      <div class="header">
          <h1>🔔 PetConnect Notification</h1>
          <p>${type}</p>
      </div>
      
      <div class="content">
          <h2>Hello ${userName},</h2>
          
          <p>${message}</p>
          
          <p>Please log in to your PetConnect account for more details and to take any necessary action.</p>
          
          <p>Best regards,<br>The PetConnect Team</p>
      </div>
      
      <div class="footer">
          <p>PetConnect Adoption System</p>
      </div>
  </body>
  </html>
    `;
  }


}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;