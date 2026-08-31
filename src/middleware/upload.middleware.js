const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
const MAX_FILE_SIZE_MB = 10;

// Ensure uploads directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Use memory storage — the image buffer is forwarded directly to FastAPI
// and NOT persisted on disk by the Node server.
const memoryStorage = multer.memoryStorage();

// Use disk storage — the image is persisted to the uploads directory.
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type: ${file.mimetype}. Only JPEG and PNG fundus images are accepted.`
      ),
      false
    );
  }
};

const uploadMemory = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, // bytes
  },
});

const uploadDisk = multer({
  storage: diskStorage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, // bytes
  },
});

module.exports = { upload: uploadMemory, uploadScreening: uploadDisk };
