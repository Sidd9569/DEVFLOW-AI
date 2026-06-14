require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

console.log('MONGO_URI:', process.env.MONGO_URI ? 'Set (hidden for security)' : 'Not set');

if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is not defined in .env file');
  console.log('Please check your .env file contains: MONGO_URI=mongodb+srv://...');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  });
