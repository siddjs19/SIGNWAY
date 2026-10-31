
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')

const app = express()

// Render reverse proxy configuration
app.set('trust proxy', 1)

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin'
    }
  })
)

// CORS configuration
const allowedOrigins = (
  process.env.CLIENT_ORIGIN || 'http://localhost:5173'
)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
)

// Request parsing and logging
app.use(express.json({ limit: '8mb' }))
app.use(morgan('dev'))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
})

app.use('/api', limiter)

// Health check
app.get('/api/health', (req, res) =>
  res.json({
    success: true,
    service: 'SIGNWAY API',
    time: new Date().toISOString()
  })
)

// Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/profile', require('./routes/profile'))
app.use('/api/dashboard', require('./routes/dashboard'))
app.use('/api/lessons', require('./routes/lessons'))
app.use('/api/curriculum', require('./routes/curriculum'))
app.use('/api/practice', require('./routes/practice'))
app.use('/api/credentials', require('./routes/credentials'))
app.use('/api/conversations', require('./routes/conversations'))
app.use('/api/recognition', require('./routes/recognition'))

// 404 handler
app.use((req, res) =>
  res.status(404).json({
    success: false,
    message: 'API route not found'
  })
)

// Error handler
app.use((err, req, res, next) => {
  console.error(err)

  res
    .status(err.status || 500)
    .json({
      success: false,
      message: err.message || 'Internal server error'
    })
})

module.exports = app
