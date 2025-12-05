const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { supabase } = require('../config/database');
const { jwtSecret, jwtRefreshSecret, jwtExpiresIn, jwtRefreshExpiresIn } = require('../config/auth');

const router = express.Router();

// Rate limiting for auth endpoints to prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for login specifically
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per window
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from('users')
      .insert({ email, password_hash: passwordHash })
      .select('id, email, created_at')
      .single();

    if (error) {
      console.error('Insert error:', error);
      return res.status(500).json({ error: 'Failed to create user' });
    }

    const accessToken = jwt.sign({ userId: user.id, email: user.email }, jwtSecret, { expiresIn: jwtExpiresIn });
    const refreshToken = jwt.sign({ userId: user.id }, jwtRefreshSecret, { expiresIn: jwtRefreshExpiresIn });

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user.id, email: user.email },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = jwt.sign({ userId: user.id, email: user.email }, jwtSecret, { expiresIn: jwtExpiresIn });
    const refreshToken = jwt.sign({ userId: user.id }, jwtRefreshSecret, { expiresIn: jwtRefreshExpiresIn });

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh', authLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Use async/await pattern instead of callback to ensure proper response handling
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, jwtRefreshSecret);
    } catch (jwtError) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const accessToken = jwt.sign({ userId: user.id, email: user.email }, jwtSecret, { expiresIn: jwtExpiresIn });

    return res.json({ accessToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

module.exports = router;
