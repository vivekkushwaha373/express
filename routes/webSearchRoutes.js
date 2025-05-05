const express = require('express');
// const { webSearch } = require('../controllers/webSearchRoutes');
const router = express.Router();
const webSearchController = require('../controllers/webSearchController');

/**
 * @route POST /api/search
 * @desc Search for content on a website
 * @body {string} site - Website URL to search
 * @body {string} query - Text to search for
 */
router.post('/search', webSearchController.webSearch);

module.exports = router;