const express = require('express');
const router = express.Router();
const webScrollController = require('../controllers/webScrollController');

/**
 * @route POST /api/scroll
 * @desc Scroll through pages on a website
 * @body {string} site - Website URL to scroll
 * @body {number} pages - Number of pages to scroll through (default: 1)
 */
router.post('/scroll', webScrollController.webScroll);

module.exports = router;