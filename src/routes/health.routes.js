const express = require('express');
const { getHealth, getMlHealth } = require('../controllers/health.controller');

const router = express.Router();

// GET /api/health
router.get('/', getHealth);

// GET /api/health/ml
router.get('/ml', getMlHealth);

module.exports = router;
