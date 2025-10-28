const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});


// Folder structure for organization
const FOLDERS = {
    USER_AVATARS: 'petconnect/users/avatars',
    PET_IMAGES: 'petconnect/pets/images',
    PET_MEDICAL_DOCS: 'petconnect/pets/medical',
    PET_VACCINATION_DOCS: 'petconnect/pets/vaccinations',
    PET_TRAINING_DOCS: 'petconnect/pets/training',
    PET_GENERAL_DOCS: 'petconnect/pets/documents',
    ADOPTION_AGREEMENTS: 'petconnect/adoptions/agreements',
    ADOPTION_SIGNED_AGREEMENTS: 'petconnect/adoptions/signed-agreements',
    ADOPTION_PAYMENT_RECEIPTS: 'petconnect/adoptions/receipts'
  };
 

module.exports = { cloudinary, FOLDERS };