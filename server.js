// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'campusmap';

if (!MONGO_URI) {
  console.error('MONGO_URI not set in .env — add MONGO_URI and restart');
  process.exit(1);
}

async function start() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(DB_NAME);

    // mount markers router
    const markersRouter = require('./backend/markers')(db);
    app.use('/markers', markersRouter);

    // mapbox token endpoint used by frontend
    app.get('/api/config', (req, res) => {
      res.json({ mapboxToken: process.env.MAPBOX_TOKEN || '' });
    });

    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();