// models/AdoptionAgreement.js - UPDATED VERSION
const mongoose = require('mongoose');

const adoptionAgreementSchema = new mongoose.Schema({
  // Core References
  adoptionRequest: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'AdoptionRequest', 
    required: true 
  },
  
  // Agreement Content
  template: { 
    type: String, 
    required: true 
  },
  customClauses: [{
    clause: String,
    required: {
      type: Boolean,
      default: false
    }
  }],
  
  // Cloudinary Storage
  cloudinaryPublicId: String, // Cloudinary public_id for the PDF
  pdfUrl: String, // Direct URL to the PDF
  storageProvider: {
    type: String,
    default: 'cloudinary',
    enum: ['cloudinary', 'local']
  },
  
  // Digital Signature & Security
  signatureToken: String, // Secure token for signature validation
  agreementHash: String, // SHA256 hash of agreement content for legal integrity
  
  // Status & Timeline
  status: { 
    type: String, 
    enum: ['draft', 'sent', 'signed', 'expired', 'cancelled'],
    default: 'draft'
  },
  sentAt: Date,
  expiresAt: Date,
  
  // Signed Document Details (Enhanced)
  signedDocument: {
    // Cloudinary storage for signed PDF
    cloudinaryPublicId: String,
    url: String,
    
    // Signature data
    signature: String, // Base64 signature image
    signatureHash: String, // SHA256 hash of signature for verification
    
    // Legal metadata
    signedAt: Date,
    ipAddress: String,
    userAgent: String,
    deviceFingerprint: String, // Optional: for additional security
    
    // Legal verification
    contentHash: String, // Hash of original agreement content
    verified: {
      type: Boolean,
      default: false
    }
  },
  
  // Metadata & Analytics
  metadata: {
    pdfSize: Number, // File size in bytes
    customClausesCount: Number,
    cloudinaryVersion: String,
    uploadedAt: Date,
    generatedAt: Date,
    
    // Security logs
    viewedAt: Date, // When adopter first viewed
    viewedCount: {
      type: Number,
      default: 0
    },
    
    // Legal compliance
    termsVersion: {
      type: String,
      default: '1.0'
    },
    jurisdiction: {
      type: String,
      default: 'US'
    }
  }
}, { 
  timestamps: true 
});

// Index for better performance
adoptionAgreementSchema.index({ adoptionRequest: 1 });
adoptionAgreementSchema.index({ status: 1 });
adoptionAgreementSchema.index({ expiresAt: 1 });
adoptionAgreementSchema.index({ signatureToken: 1 });

module.exports = mongoose.model('AdoptionAgreement', adoptionAgreementSchema);