const express = require('express');

module.exports = (db) => {
  const router = express.Router();
  const users = db.collection('users');

  // SIGNUP
  router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const existing = await users.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already used' });

    const doc = { username: username || '', email, password, createdAt: new Date() };
    const result = await users.insertOne(doc);

    res.status(201).json({ _id: result.insertedId.toString(), username: doc.username, email });
  });

  // backend/auth.js  (replace the login route block with this)
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password required' });
      }

      // collection variable should already be defined earlier in this file
      const user = await users.findOne({ email });

      // If user not found OR password mismatch -> return 401 with friendly message
      if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Wrong username/password' });
      }

      // Successful login -> return user object (MVP: no token)
      return res.json({
        user: {
          _id: user._id.toString(),
          username: user.username || '',
          email: user.email
        }
      });
    } catch (err) {
      console.error('POST /api/login error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
};