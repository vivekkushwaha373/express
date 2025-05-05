// File: app.js
const express = require('express');
const bodyParser = require('body-parser');
const webSearchRoutes = require('./routes/webSearchRoutes');
const webScrollRoutes = require('./routes/webScrollRoutes');
// const googleSearchRoutes = require('./routes/googleSearchRoutes');
// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'Web Search and Scroll API',
        endpoints: {
            webSearch: '/api/search',
            webScroll: '/api/scroll'
        }
    });
});

// Routes
app.use('/api', webSearchRoutes);
app.use('/api', webScrollRoutes);
// app.use('/api', googleSearchRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;