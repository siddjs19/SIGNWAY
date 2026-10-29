const express = require('express');
const cors = require('cors');
const lessonRoutes = require('./routes/lessonRoutes');
const quizRoutes = require('./routes/quizRoutes');

const app = express();
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origin is not allowed by CORS'));
  },
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
app.use('/api/lessons', lessonRoutes);
app.use('/api/quizzes', quizRoutes);

module.exports = app;