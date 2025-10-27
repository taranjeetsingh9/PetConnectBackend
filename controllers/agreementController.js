// controllers/agreementController.js
const adoptionService = require('../services/adoptionService');

/**
 * Get agreement details for signing page
 */
exports.getAgreement = async (req, res) => {
  try {
    const agreement = await adoptionService.getAgreementForSigning(req.user, req.params.id);
    res.json({
      success: true,
      agreement
    });
  } catch (error) {
    console.error('Error in getAgreement:', error);
    res.status(error.status || 500).json({ 
      success: false,
      error: error.message 
    });
  }
};

/**
 * Serve signature capture page
 */
exports.getSignaturePage = async (req, res) => {
  try {
    const signatureHTML = await adoptionService.generateSignaturePage(req.user, req.params.id);
    res.send(signatureHTML);
  } catch (error) {
    console.error('Error in getSignaturePage:', error);
    res.status(error.status || 500).send(`
      <html>
        <body>
          <h1>Error</h1>
          <p>${error.message}</p>
          <a href="/adoptions">Back to Adoptions</a>
        </body>
      </html>
    `);
  }
};

/**
 * Process digital signature submission
 */
exports.signAgreement = async (req, res) => {
  try {
    const result = await adoptionService.processDigitalSignature(
      req.user,
      req.params.id,
      {
        signature: req.body.signature,
        signedAt: req.body.signedAt
      },
      req
    );

    res.json(result);
  } catch (error) {
    console.error('Error in signAgreement:', error);
    res.status(error.status || 500).json({ 
      success: false,
      error: error.message 
    });
  }
};

/**
 * Download agreement PDF
 */
exports.downloadAgreement = async (req, res) => {
  try {
    const agreement = await adoptionService.getAgreementDetails(req.user, req.params.id);
    
    // Get the appropriate PDF URL (signed or unsigned)
    const pdfUrl = agreement.signedDocument?.url || agreement.pdfUrl;
    
    // Redirect to Cloudinary URL for download
    res.redirect(pdfUrl);
    
  } catch (error) {
    console.error('Error in downloadAgreement:', error);
    res.status(error.status || 500).json({ 
      success: false,
      error: error.message 
    });
  }
};