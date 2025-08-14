const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();

// Enhanced CORS untuk production
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json());

// In-memory storage dengan persistent default users
// PENTING: Data akan reset setiap restart di Vercel (serverless)
let users = {
  'admin': '$2a$10$N9qo8uLOickgx2ZMRZoMye8IceG7cQQJJSXnlI05JudgzBSYjCbfm', // admin123
  'user1': '$2a$10$N9qo8uLOickgx2ZMRZoMye8IceG7cQQJJSXnlI05JudgzBSYjCbfm', // password1  
  'test': '$2a$10$N9qo8uLOickgx2ZMRZoMye8IceG7cQQJJSXnlI05JudgzBSYjCbfm', // test123
  'demo': '$2a$10$N9qo8uLOickgx2ZMRZoMye8IceG7cQQJJSXnlI05JudgzBSYjCbfm', // demo123
  'miero': '$2a$10$N9qo8uLOickgx2ZMRZoMye8IceG7cQQJJSXnlI05JudgzBSYjCbfm' // testing user
};

// Root endpoint untuk testing
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Flutter Auth API berjalan di Vercel!',
    timestamp: new Date().toISOString(),
    totalUsers: Object.keys(users).length,
    availableEndpoints: [
      'GET /api',
      'POST /api/register', 
      'POST /api/login',
      'GET /api/users',
      'GET /api/check/:username'
    ]
  });
});

// API root endpoint
app.get('/api', (req, res) => {
  res.json({ 
    message: '✅ Flutter Auth API Active',
    timestamp: new Date().toISOString(),
    totalUsers: Object.keys(users).length,
    serverStatus: 'healthy'
  });
});

// Register endpoint
app.post('/api/register', async (req, res) => {
  try {
    console.log('Register request received:', req.body);
    
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username dan password harus diisi' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password minimal 6 karakter' 
      });
    }

    // Check if username exists
    if (users[username]) {
      return res.status(409).json({ 
        success: false, 
        message: 'Username sudah digunakan' 
      });
    }

    // Hash password and save
    const hashedPassword = await bcrypt.hash(password, 10);
    users[username] = hashedPassword;

    console.log(`User registered: ${username}. Total users: ${Object.keys(users).length}`);

    res.status(201).json({ 
      success: true, 
      message: 'Registrasi berhasil',
      username: username,
      totalUsers: Object.keys(users).length
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// Login endpoint  
app.post('/api/login', async (req, res) => {
  try {
    console.log('Login request received:', req.body);

    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username dan password harus diisi' 
      });
    }

    // Check if user exists
    if (!users[username]) {
      return res.status(401).json({ 
        success: false, 
        message: 'Username tidak ditemukan' 
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, users[username]);
    
    if (!isValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Password salah' 
      });
    }

    console.log('User logged in: ${username}');

    res.json({ 
      success: true, 
      message: 'Login berhasil',
      username: username,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// Get all users endpoint
app.get('/api/users', (req, res) => {
  try {
    const userList = Object.keys(users).map(username => ({
      username: username,
      registered: true
    }));

    console.log(`Users list requested. Total: ${userList.length}`);

    res.json({ 
      success: true, 
      total: userList.length,
      users: userList,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// Check if username exists
app.get('/api/check/:username', (req, res) => {
  try {
    const { username } = req.params;
    const exists = !!users[username];
    
    console.log(`Username check: ${username} - exists: ${exists}`);
    
    res.json({
      success: true,
      exists: exists,
      username: username
    });
  } catch (error) {
    console.error('Check user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    totalUsers: Object.keys(users).length
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /',
      'GET /api',
      'POST /api/register', 
      'POST /api/login',
      'GET /api/users',
      'GET /api/check/:username',
      'GET /api/health'
    ]
  });
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Total users: ${Object.keys(users).length}`);
  });
}

module.exports = app;