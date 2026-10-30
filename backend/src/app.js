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

app.use(
  '/api/recognition/isl-bridge/frame',
  express.json({ limit: '3mb' }),
  (error, req, res, next) => {
    if (!error) return next();
    const tooLarge = error.type === 'entity.too.large';
    return res.status(tooLarge ? 413 : 400).json({
      success: false,
      code: tooLarge ? 'ISL_BRIDGE_FRAME_TOO_LARGE' : 'INVALID_JSON',
      message: tooLarge
        ? 'ISL Bridge frame request is too large.'
        : 'Request body must contain valid JSON.',
    });
  },
);

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
app.use('/api/recognition', require('./routes/recognition'));
app.use('/api/practitioners', require('./routes/practitioners'));
app.use('/api/credentials', require('./routes/credentials'));

module.exports = app;