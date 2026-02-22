// backend/markers.js
const express = require('express');

module.exports = (db) => {
  const router = express.Router();
  const collection = db.collection('markers');

  // GET all markers (convert _id to string)
  router.get('/', async (req, res) => {
    try {
      const docs = await collection.find({}).toArray();
      const out = docs.map(d => {
        return {
          ...d,
          _id: d._id ? d._id.toString() : undefined
        };
      });
      res.json(out);
    } catch (err) {
      console.error('GET /markers error:', err);
      res.status(500).json({ error: 'Failed to fetch markers' });
    }
  });

  // POST a new marker
  router.post('/', async (req, res) => {
    try {
      const {
        amenityType,
        indoorOutdoor,
        floor,
        locationDescription,
        lat,
        lng
      } = req.body;

      if (lat == null || lng == null) {
        return res.status(400).json({ error: 'lat and lng required' });
      }

      const doc = {
        amenityType: amenityType || 'Other',
        indoorOutdoor: indoorOutdoor || 'outdoor',
        floor: floor || '',
        locationDescription: locationDescription || '',
        lat: Number(lat),
        lng: Number(lng),
        createdAt: new Date()
      };

      const result = await collection.insertOne(doc);

      // return saved doc with string _id
      doc._id = result.insertedId.toString();
      res.json(doc);
    } catch (err) {
      console.error('POST /markers error:', err);
      res.status(500).json({ error: 'Failed to save marker' });
    }
  });

  // DELETE a marker
  router.delete('/:id', async (req, res) => {
    try {
      const { ObjectId } = require('mongodb');
      const id = req.params.id;
      console.log("Attempting delete for _id:", id);

      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      console.log("Delete result:", result);

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Marker not found' });
      }

      res.json({ success: true });
    } catch (err) {
      console.error('DELETE /markers error:', err);
      res.status(500).json({ error: 'Failed to delete marker' });
    }
  });

  return router;
};