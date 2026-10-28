const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
}));

app.use(express.json());

// Homepage route
app.get('/', (req, res) => {
  res.send('Welcome to SignBridge AI Backend!');
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SignBridge AI API is running',
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/conversations', require('./routes/conversation'));



module.exports = app;