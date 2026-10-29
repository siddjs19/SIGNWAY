const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function auth(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token is required'
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not configured');
    return res.status(500).json({
      success: false,
      message: 'Authentication is not configured'
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token'
    });
  }

  if (!decoded.userId) {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token'
    });
  }

  try {
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error('Authentication lookup error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not verify the authenticated user'
    });
  }
}

module.exports = auth;