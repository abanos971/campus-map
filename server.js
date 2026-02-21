const express = require('express');
const path = require('path');
require('dotenv').config(); // Load .env file

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get Mapbox token
app.get('/api/config', (req, res) => {
  res.json({
    mapboxToken: process.env.MAPBOX_TOKEN || ''
  });
});

// Serve the map as the default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'map.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Campus Map server running at http://localhost:${PORT}`);
});
