// services/cloudinaryDocumentService.js
const { cloudinary, FOLDERS } = require('../config/cloudinary');
const crypto = require('crypto');

// Add adoption agreements folder
const FOLDERS_WITH_AGREEMENTS = {
  ...FOLDERS,
  ADOPTION_AGREEMENTS: 'petconnect/adoptions/agreements',
  ADOPTION_SIGNED_AGREEMENTS: 'petconnect/adoptions/signed-agreements'
};

class CloudinaryDocumentService {
  
  /**
   * Upload agreement PDF to Cloudinary
   */
  async uploadAgreementPDF(pdfBuffer, agreementId, type = 'draft') {
    try {
      console.log('☁️ Uploading agreement PDF to Cloudinary...');
      
      return new Promise((resolve, reject) => {
        // Create upload stream for PDF
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: type === 'signed' 
              ? FOLDERS_WITH_AGREEMENTS.ADOPTION_SIGNED_AGREEMENTS
              : FOLDERS_WITH_AGREEMENTS.ADOPTION_AGREEMENTS,
            public_id: `agreement-${agreementId}-${type}-${Date.now()}`,
            resource_type: 'raw', // ✅ CRITICAL: Set to 'raw' for PDF files
            type: 'upload',
            tags: ['adoption-agreement', type, agreementId],
            context: {
              agreement_id: agreementId,
              document_type: type,
              uploaded_at: new Date().toISOString()
            }
          },
          (error, result) => {
            if (error) {
              console.error('❌ Cloudinary upload error:', error);
              reject(new Error(`Cloudinary upload failed: ${error.message}`));
            } else {
              console.log('✅ Agreement PDF uploaded to Cloudinary:', result.public_id);
              resolve({
                public_id: result.public_id,
                url: result.secure_url,
                version: result.version,
                format: result.format,
                bytes: result.bytes,
                created_at: result.created_at,
                folder: result.folder,
                resource_type: result.resource_type
              });
            }
          }
        );

        // Send the PDF buffer to Cloudinary
        uploadStream.end(pdfBuffer);
      });

    } catch (error) {
      console.error('❌ Cloudinary upload error:', error);
      throw new Error(`Failed to upload agreement to Cloudinary: ${error.message}`);
    }
  }

  /**
   * Upload signed agreement PDF
   */
  async uploadSignedAgreementPDF(pdfBuffer, agreementId) {
    return this.uploadAgreementPDF(pdfBuffer, agreementId, 'signed');
  }

  /**
   * Get agreement PDF from Cloudinary
   */
  async getAgreementPDF(publicId) {
    try {
      // Generate secure URL (optional - adds expiration)
      const pdfUrl = cloudinary.url(publicId, {
        resource_type: 'raw',
        secure: true,
        type: 'upload',
        flags: 'attachment', // Force download
        expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiry
      });

      return pdfUrl;

    } catch (error) {
      console.error('❌ Cloudinary get error:', error);
      throw new Error(`Failed to get agreement from Cloudinary: ${error.message}`);
    }
  }

  /**
   * Delete agreement from Cloudinary (if needed)
   */
  async deleteAgreementPDF(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'raw'
      });
      
      console.log('🗑️ Deleted agreement from Cloudinary:', publicId);
      return result;

    } catch (error) {
      console.error('❌ Cloudinary delete error:', error);
      throw new Error(`Failed to delete agreement from Cloudinary: ${error.message}`);
    }
  }

  /**
   * Generate secure access token for Cloudinary URLs
   */
  generateSecureToken(agreementId, adopterId) {
    const secret = process.env.CLOUDINARY_SECRET || 'cloudinary-secret';
    return crypto
      .createHash('sha256')
      .update(`${agreementId}-${adopterId}-${Date.now()}-${secret}`)
      .digest('hex');
  }

  /**
   * Generate signed URL with Cloudinary (more secure)
   */
  generateSignedURL(publicId, expiresIn = 3600) {
    try {
      const url = cloudinary.url(publicId, {
        resource_type: 'raw',
        secure: true,
        sign_url: true, // Enable URL signing
        expires_at: Math.floor(Date.now() / 1000) + expiresIn
      });

      return url;

    } catch (error) {
      console.error(' Cloudinary signed URL error:', error);
      // Fallback to regular URL
      return cloudinary.url(publicId, {
        resource_type: 'raw',
        secure: true
      });
    }
  }
}

module.exports = new CloudinaryDocumentService();