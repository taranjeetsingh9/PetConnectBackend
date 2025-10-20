const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary, FOLDERS } = require('../config/cloudinary');

// Avatar Upload Storage
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: FOLDERS.USER_AVATARS,
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [
      { width: 200, height: 200, gravity: "face", crop: "thumb" }
    ]
  }
});

// Pet Images Upload Storage
const petImagesStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: FOLDERS.PET_IMAGES,
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [
      { width: 800, height: 600, crop: "limit" }
    ]
  }
});

// Documents Upload Storage
const documentsStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: FOLDERS.PET_GENERAL_DOCS,
    resource_type: 'auto',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx']
  }
});

// File filters
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const documentFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images, PDF, and Word documents are allowed!'), false);
  }
};

module.exports = {
  avatarUpload: multer({
    storage: avatarStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 15 * 1024 * 1024 }
  }),
  
  petImagesUpload: multer({
    storage: petImagesStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 15 * 1024 * 1024 }
  }),
  
  documentsUpload: multer({
    storage: documentsStorage,
    fileFilter: documentFilter,
    limits: { fileSize: 20 * 1024 * 1024 }
  })
};