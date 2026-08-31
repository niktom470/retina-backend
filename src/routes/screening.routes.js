const express = require('express');
const { createScreening, getAllScreenings, getScreeningById } = require('../controllers/screening.controller');
const { protect } = require('../middleware/auth.middleware');
const { uploadScreening } = require('../middleware/upload.middleware');

const router = express.Router();

// All screening routes are protected
router.use(protect);

router.post('/', uploadScreening.single('image'), createScreening);
router.get('/', getAllScreenings);
router.get('/:id', getScreeningById);

module.exports = router;
