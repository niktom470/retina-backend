const express = require('express');
const { predict } = require('../controllers/predict.controller');
const { protect } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');

const router = express.Router();

// POST /api/predict
// Protected: requires valid Bearer JWT
// Accepts: multipart/form-data with field "file" (image/jpeg or image/png)
router.post('/', protect, upload.single('file'), predict);

module.exports = router;
