// services/eSignatureService.js
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class ESignatureService {
  
  constructor() {
    this.fontCache = {};
  }

  /**
   * Load font with caching
   */
  async loadFont(fontName = 'arial') {
    if (this.fontCache[fontName]) {
      return this.fontCache[fontName];
    }

    try {
      const fontPath = path.join(__dirname, '../fonts', `${fontName}.ttf`);
      const fontBytes = await fs.readFile(fontPath);
      this.fontCache[fontName] = fontBytes;
      return fontBytes;
    } catch (error) {
      console.warn(`Font ${fontName} not found, using fallback`);
      // Return a basic font or handle error
      return null;
    }
  }

  /**
   * Generate professional adoption agreement PDF
   */
  async generateAgreementPDF(request, customClauses = []) {
    try {
      console.log(' Generating professional agreement PDF for:', request.pet.name);

      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      pdfDoc.registerFontkit(fontkit);
      
      // Load font
      const fontBytes = await this.loadFont('arial');
      if (!fontBytes) {
        throw new Error('Font file not found. Please add font files to /fonts directory');
      }
      const font = await pdfDoc.embedFont(fontBytes);
      
      // Add first page
      let page = pdfDoc.addPage([612, 792]); // US Letter size (8.5 x 11 inches)
      let yPosition = 750; // Start from top
      
      // ===== HEADER SECTION =====
      page.drawText('PET ADOPTION AGREEMENT', {
        x: 50,
        y: yPosition,
        size: 16,
        font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 30;
      
      page.drawText(`Agreement Date: ${new Date().toLocaleDateString()}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
      yPosition -= 40;
      
      // ===== PARTIES SECTION =====
      page.drawText('1. PARTIES', {
        x: 50,
        y: yPosition,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;
      
      page.drawText(`This Adoption Agreement ("Agreement") is made between:`, {
        x: 70,
        y: yPosition,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 15;
      
      page.drawText(`Organization: ${request.organization.name}`, {
        x: 90,
        y: yPosition,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 15;
      
      page.drawText(`Adopter: ${request.adopter.name} (${request.adopter.email})`, {
        x: 90,
        y: yPosition,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 30;
      
      // ===== PET INFORMATION SECTION =====
      page.drawText('2. PET INFORMATION', {
        x: 50,
        y: yPosition,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;
      
      const petInfo = [
        `Pet Name: ${request.pet.name}`,
        `Breed: ${request.pet.breed}`,
        `Age: ${request.pet.age}`,
        `Special Needs: ${request.pet.specialNeeds || 'None documented'}`,
        `Medical History: ${request.pet.medicalHistory || 'Up to date on vaccinations'}`
      ];
      
      petInfo.forEach(info => {
        if (yPosition < 100) {
          page = pdfDoc.addPage([612, 792]);
          yPosition = 750;
        }
        
        page.drawText(info, {
          x: 70,
          y: yPosition,
          size: 10,
          font,
          color: rgb(0, 0, 0),
        });
        yPosition -= 15;
      });
      yPosition -= 20;
      
      // ===== TERMS AND CONDITIONS SECTION =====
      page.drawText('3. TERMS AND CONDITIONS', {
        x: 50,
        y: yPosition,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 25;
      
      const standardTerms = [
        '3.1 CARE AND TREATMENT: Adopter agrees to provide proper food, water, shelter, veterinary care, and humane treatment at all times.',
        '3.2 OWNERSHIP TRANSFER: Adopter shall not sell, assign, or transfer ownership of the pet without prior written consent from the Organization.',
        '3.3 FOLLOW-UP VISITS: Organization reserves the right to conduct reasonable follow-up visits to ensure the pet\'s wellbeing and proper care.',
        '3.4 RETURN POLICY: If Adopter can no longer care for the pet for any reason, Adopter must return the pet to the Organization.',
        '3.5 DEFAULT: If Adopter fails to comply with any terms, Organization may reclaim the pet immediately.',
        '3.6 INDEMNIFICATION: Adopter agrees to indemnify and hold Organization harmless from any claims arising from pet ownership.'
      ];
      
      const allTerms = [...standardTerms, ...customClauses.map((clause, index) => 
        `3.${index + 7} ADDITIONAL: ${clause}`
      )];
      
      for (const term of allTerms) {
        if (yPosition < 100) {
          page = pdfDoc.addPage([612, 792]);
          yPosition = 750;
        }
        
        const lines = this.wrapText(term, 80);
        lines.forEach(line => {
          page.drawText(line, {
            x: 70,
            y: yPosition,
            size: 9,
            font,
            color: rgb(0, 0, 0),
          });
          yPosition -= 12;
        });
        yPosition -= 5;
      }
      
      // ===== SIGNATURE SECTION =====
      if (yPosition < 200) {
        page = pdfDoc.addPage([612, 792]);
        yPosition = 750;
      }
      
      page.drawText('4. SIGNATURES', {
        x: 50,
        y: yPosition,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 30;
      
      page.drawText('By signing below, Adopter acknowledges understanding and agreement to all terms:', {
        x: 70,
        y: yPosition,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 40;
      
      // Adopter signature area
      page.drawText('ADOPTER SIGNATURE:', {
        x: 70,
        y: yPosition,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;
      
      // Signature line
      page.drawLine({
        start: { x: 70, y: yPosition },
        end: { x: 300, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      yPosition -= 30;
      
      page.drawText('Printed Name:', {
        x: 70,
        y: yPosition,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;
      
      page.drawLine({
        start: { x: 70, y: yPosition },
        end: { x: 300, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      yPosition -= 30;
      
      page.drawText('Date:', {
        x: 70,
        y: yPosition,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;
      
      page.drawLine({
        start: { x: 70, y: yPosition },
        end: { x: 200, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      yPosition -= 40;
      
      // Organization acknowledgment
      page.drawText('ORGANIZATION ACKNOWLEDGMENT:', {
        x: 70,
        y: yPosition,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 40;
      
      page.drawText(`Representative: _________________________`, {
        x: 70,
        y: yPosition,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;
      
      page.drawText(`Date: _________________________`, {
        x: 70,
        y: yPosition,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
      
      // Set PDF metadata
      pdfDoc.setTitle(`Adoption Agreement - ${request.pet.name}`);
      pdfDoc.setAuthor('PetConnect Adoption System');
      pdfDoc.setSubject('Legal Adoption Agreement');
      pdfDoc.setKeywords(['adoption', 'pet', 'legal', 'agreement']);
      pdfDoc.setProducer('PetConnect E-Signature Service');
      pdfDoc.setCreationDate(new Date());
      pdfDoc.setModificationDate(new Date());

      // Save PDF
      const pdfBytes = await pdfDoc.save();
      console.log(' PDF generated successfully');
      
      return pdfBytes;
      
    } catch (error) {
      console.error(' Error generating PDF:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }
  
  /**
   * Wrap long text into multiple lines for PDF
   */
  wrapText(text, maxLength) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + word).length > maxLength) {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    }
    
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }
    
    return lines;
  }
  
  /**
   * Generate secure signature token
   */
  generateSignatureToken(agreementId, adopterId) {
    const secret = process.env.SIGNATURE_SECRET || 'petconnect-signature-secret';
    const token = crypto
      .createHash('sha256')
      .update(`${agreementId}-${adopterId}-${Date.now()}-${secret}`)
      .digest('hex');
    
    console.log(' Generated signature token for agreement:', agreementId);
    return token;
  }
  
  /**
   * Validate signature token
   */
  validateSignatureToken(token, agreementId, adopterId) {
    const secret = process.env.SIGNATURE_SECRET || 'petconnect-signature-secret';
    const expectedToken = crypto
      .createHash('sha256')
      .update(`${agreementId}-${adopterId}-${secret}`)
      .digest('hex');
    
    const isValid = token === expectedToken;
    console.log('🔐 Signature token validation:', isValid ? 'VALID' : 'INVALID');
    return isValid;
  }

// services/eSignatureService.js - ADD THESE METHODS:

/**
 * Add digital signature to existing PDF
 */
async addSignatureToPDFSimple(originalPdfBytes, signatureImage, signatureData) {
  try {
    console.log(' Adding digital signature to PDF (simple version)...');
    
    // Load the original PDF
    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    
    // Use standard fonts only (no fontkit required)
    const font = pdfDoc.embedStandardFont('Helvetica');
    
    // Convert base64 signature to image
    const signatureBytes = Buffer.from(signatureImage.split(',')[1], 'base64');
    const signatureImageEmbed = await pdfDoc.embedPng(signatureBytes);
    
    // Add signature image to PDF
    firstPage.drawImage(signatureImageEmbed, {
      x: 70,
      y: 120,
      width: 180,
      height: 60,
    });
    
    // Add signature metadata with standard font
    const signatureText = [
      `Digitally signed by: ${signatureData.adopterName}`,
      `Date: ${new Date(signatureData.signedAt).toLocaleString()}`,
      `IP: ${signatureData.ipAddress}`
    ];
    
    let textY = 80;
    signatureText.forEach(line => {
      firstPage.drawText(line, {
        x: 70,
        y: textY,
        size: 8,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
      textY -= 10;
    });
    
    // Update PDF metadata
    pdfDoc.setTitle(`Adoption Agreement - ${signatureData.petName} - SIGNED`);
    pdfDoc.setModificationDate(new Date());
    
    const signedPdfBytes = await pdfDoc.save();
    console.log(' Digital signature added to PDF (simple version)');
    
    return signedPdfBytes;
    
  } catch (error) {
    console.error(' Error adding signature to PDF:', error);
    throw new Error(`Failed to add signature: ${error.message}`);
  }
}

/**
 * Generate signature capture HTML for frontend
 */
generateSignatureCaptureHTML(agreementId, token) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Sign Adoption Agreement</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .agreement-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .signature-container { border: 2px dashed #ccc; padding: 20px; margin: 20px 0; }
        #signature-pad { border: 1px solid #ddd; background: white; cursor: crosshair; }
        .controls { margin: 10px 0; }
        .btn { padding: 10px 20px; margin: 5px; border: none; border-radius: 4px; cursor: pointer; }
        .btn-primary { background: #007bff; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        .signature-preview { margin-top: 20px; text-align: center; }
        .legal-notice { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>Sign Adoption Agreement</h1>
    
    <div class="agreement-info">
        <h3>Agreement Details</h3>
        <p><strong>Please read carefully before signing:</strong></p>
        <p>By signing below, you agree to all terms and conditions in the adoption agreement.</p>
        <p>Your signature creates a legally binding contract.</p>
    </div>

    <div class="legal-notice">
        <h4>⚠️ Legal Notice</h4>
        <p>This digital signature is legally binding and equivalent to a handwritten signature.</p>
        <p>Your IP address, timestamp, and device information will be recorded for legal verification.</p>
    </div>

    <div class="signature-container">
        <h3>Draw Your Signature</h3>
        <canvas id="signature-pad" width="600" height="200"></canvas>
        <div class="controls">
            <button onclick="clearSignature()" class="btn btn-secondary">Clear Signature</button>
            <button onclick="saveSignature()" class="btn btn-primary">Sign Agreement</button>
        </div>
    </div>

    <div class="signature-preview">
        <h4>Signature Preview</h4>
        <img id="signature-preview" style="max-width: 300px; display: none;" />
    </div>

    <script>
        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;
        const canvas = document.getElementById('signature-pad');
        const ctx = canvas.getContext('2d');
        
        // Set canvas styling
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Signature drawing functions
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);

        // Touch support for mobile
        canvas.addEventListener('touchstart', handleTouch);
        canvas.addEventListener('touchmove', handleTouch);
        canvas.addEventListener('touchend', stopDrawing);

        function startDrawing(e) {
            isDrawing = true;
            const pos = getMousePos(canvas, e);
            [lastX, lastY] = [pos.x, pos.y];
        }

        function draw(e) {
            if (!isDrawing) return;
            const pos = getMousePos(canvas, e);
            
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            
            [lastX, lastY] = [pos.x, pos.y];
        }

        function handleTouch(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            
            if (e.type === 'touchstart') {
                startDrawing(mouseEvent);
            } else if (e.type === 'touchmove') {
                draw(mouseEvent);
            }
        }

        function stopDrawing() {
            isDrawing = false;
            updateSignaturePreview();
        }

        function getMousePos(canvas, evt) {
            const rect = canvas.getBoundingClientRect();
            return {
                x: evt.clientX - rect.left,
                y: evt.clientY - rect.top
            };
        }

        function clearSignature() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            document.getElementById('signature-preview').style.display = 'none';
        }

        function updateSignaturePreview() {
            const dataUrl = canvas.toDataURL();
            const preview = document.getElementById('signature-preview');
            preview.src = dataUrl;
            preview.style.display = 'block';
        }

        async function saveSignature() {
            if (canvas.toDataURL() === canvas.toDataURL('white')) {
                alert('Please provide your signature before continuing.');
                return;
            }

            const signatureData = canvas.toDataURL();
            
            try {
                const response = await fetch('/api/adoptions/agreements/${agreementId}/sign', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ${token}'
                    },
                    body: JSON.stringify({
                        signature: signatureData,
                        signedAt: new Date().toISOString(),
                        agreementId: '${agreementId}'
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    alert(' Agreement signed successfully! Redirecting to payment...');
                    window.location.href = result.redirectTo;
                } else {
                    const error = await response.json();
                    alert('Error: ' + error.msg);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Network error. Please try again.');
            }
        }

        // Initialize clean canvas
        clearSignature();
    </script>
</body>
</html>
  `;
}




}

// Create singleton instance
const eSignatureService = new ESignatureService();

module.exports = eSignatureService;