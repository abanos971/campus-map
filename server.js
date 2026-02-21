const express = require('express');
const path = require('path');
require('dotenv').config();

const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // Needed for POST requests
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB setup
const client = new MongoClient(process.env.MONGO_URI);
let markersCollection;

async function startServer() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas");

    const db = client.db('campusmap');
    markersCollection = db.collection('markers');

    // ---- API Routes ---- //

    // Get all markers
    app.get('/markers', async (req, res) => {
      const markers = await markersCollection.find({}).toArray();
      res.json(markers);
    });

    // Add a marker
    app.post('/markers', async (req, res) => {
      const { name, lat, lng } = req.body;

      if (!name || lat == null || lng == null) {
        return res.status(400).json({ error: "Missing fields" });
      }

      const result = await markersCollection.insertOne({ name, lat, lng });
      res.json({ success: true, insertedId: result.insertedId });
    });

    // Mapbox config route (unchanged)
    app.get('/api/config', (req, res) => {
      res.json({
        mapboxToken: process.env.MAPBOX_TOKEN || ''
      });
    });

    // Serve homepage (unchanged)
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'map.html'));
    });

    app.listen(PORT, () => {
      console.log(`Campus Map server running at http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error("Failed to start server:", err);
  }
}

startServer();