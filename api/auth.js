const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const app = express();

// Enhanced CORS untuk production
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json());

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to Railway MySQL database');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  }
};

testConnection();

// Root endpoint untuk testing
app.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT COUNT(*) as total FROM users');
    const totalUsers = rows[0].total;
    
    res.json({ 
      message: '🚀 Flutter Auth API berjalan di Vercel dengan Railway MySQL!',
      timestamp: new Date().toISOString(),
      totalUsers: totalUsers,
      availableEndpoints: [
        'GET /api',
        'POST /api/register', 
        'POST /api/login',
        'GET /api/users',
        'POST /api/users',
        'GET /api/check/:username',
        'GET /api/health'
      ]
    });
  } catch (error) {
    console.error('Root endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database connection error: ' + error.message 
    });
  }
});

// API root endpoint
app.get('/api', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT COUNT(*) as total FROM users');
    const totalUsers = rows[0].total;
    
    res.json({ 
      message: '✅ Flutter Auth API Active with Railway MySQL',
      timestamp: new Date().toISOString(),
      totalUsers: totalUsers,
      serverStatus: 'healthy'
    });
  } catch (error) {
    console.error('API root error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database error: ' + error.message 
    });
  }
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
    const [existingUsers] = await pool.execute(
      'SELECT username FROM users WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Username sudah digunakan' 
      });
    }

    // Hash password and save to database
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await pool.execute(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );

    // Get total users count
    const [countRows] = await pool.execute('SELECT COUNT(*) as total FROM users');
    const totalUsers = countRows[0].total;

    console.log(`User registered: ${username}. Total users: ${totalUsers}`);

    res.status(201).json({ 
      success: true, 
      message: 'Registrasi berhasil',
      username: username,
      userId: result.insertId,
      totalUsers: totalUsers,
      timestamp: new Date().toISOString()
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

    // Get user from database
    const [users] = await pool.execute(
      'SELECT id, username, password, created_at FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Username tidak ditemukan' 
      });
    }

    const user = users[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Password salah' 
      });
    }

    console.log(`User logged in: ${username}`);

    res.json({ 
      success: true, 
      message: 'Login berhasil',
      username: user.username,
      userId: user.id,
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
app.get('/api/users', async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, created_at FROM users ORDER BY created_at DESC'
    );

    console.log(`Users list requested. Total: ${users.length}`);

    res.json({ 
      success: true, 
      total: users.length,
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        registered: true,
        created_at: user.created_at
      })),
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
app.get('/api/check/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const [users] = await pool.execute(
      'SELECT username FROM users WHERE username = ?',
      [username]
    );
    
    const exists = users.length > 0;
    
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
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const [rows] = await pool.execute('SELECT COUNT(*) as total FROM users');
    const totalUsers = rows[0].total;
    
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      totalUsers: totalUsers,
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'disconnected',
      error: error.message
    });
  }
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
  });
}

module.exports = app;

