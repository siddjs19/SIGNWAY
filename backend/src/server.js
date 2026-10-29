require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 5000;

async function startServer() {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET must be configured before starting the API');
    process.exit(1);
  }

  try {
    await mongoose.connect(
      process.env.MONGODB_URI ||
      'mongodb://127.0.0.1:27017/signbridge'
    );

    console.log('MongoDB connected successfully');

    app.listen(PORT, () => {
      console.log(`SignBridge API running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

startServer();