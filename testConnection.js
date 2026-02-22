require('dotenv').config();
const { MongoClient } = require('mongodb');

async function testConnection() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas!");

    const db = client.db('campusmap'); // your database
    const collections = await db.collections();
    console.log("Collections in campusmap:", collections.map(c => c.collectionName));
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    await client.close();
  }
}

testConnection();