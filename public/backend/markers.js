// backend/markers.js
const express = require('express');
const router = express.Router();

module.exports = (markersCollection) => {

  router.get('/', async (req, res) => {
    const markers = await markersCollection.find({}).toArray();
    res.json(markers);
  });

  router.post('/', async (req, res) => {
    const { name, lat, lng } = req.body;
    const result = await markersCollection.insertOne({ name, lat, lng });
    res.json(result);
  });

  return router;
};