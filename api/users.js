// api/users.js - Vercel API untuk Flutter App
import mysql from 'mysql2/promise';

// Konfigurasi Database Railway MySQL
const dbConfig = {
  host: process.env.MYSQL_HOST || 'your-railway-mysql-host',
  user: process.env.MYSQL_USER || 'your-mysql-username', 
  password: process.env.MYSQL_PASSWORD || 'your-mysql-password',
  database: process.env.MYSQL_DATABASE || 'your-database-name',
  port: process.env.MYSQL_PORT || 3306,
  ssl: {
    rejectUnauthorized: false
  },
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000,
};

// Helper function untuk membuat koneksi
async function createConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    return connection;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw new Error('Database connection failed');
  }
}

// Helper function untuk inisialisasi tabel
async function initializeTable(connection) {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      android_id VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;
  
  await connection.execute(createTableQuery);
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let connection;

  try {
    connection = await createConnection();
    await initializeTable(connection);

    // TEST CONNECTION
    if (req.method === 'GET' && req.query.action === 'test') {
      return res.status(200).json({ 
        success: true, 
        message: 'Database connection successful',
        timestamp: new Date().toISOString()
      });
    }

    // REGISTER USER
    if (req.method === 'POST' && req.query.action === 'register') {
      const { username, password, androidId } = req.body;

      if (!username || !password || !androidId) {
        return res.status(400).json({
          success: false,
          error: 'Username, password, and androidId are required'
        });
      }

      try {
        // Check if username already exists
        const [existingUser] = await connection.execute(
          'SELECT username FROM users WHERE username = ?',
          [username]
        );

        if (existingUser.length > 0) {
          return res.status(409).json({
            success: false,
            error: 'Username sudah terdaftar'
          });
        }

        // Insert new user
        await connection.execute(
          'INSERT INTO users (username, password, android_id) VALUES (?, ?, ?)',
          [username, password, androidId]
        );

        return res.status(201).json({
          success: true,
          message: 'User berhasil didaftarkan',
          username: username,
          androidId: androidId.substring(0, 8) + '...'
        });

      } catch (dbError) {
        console.error('Database error during registration:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Gagal menyimpan user ke database'
        });
      }
    }

    // LOGIN VALIDATION
    if (req.method === 'POST' && req.query.action === 'login') {
      const { username, password, androidId } = req.body;

      if (!username || !password || !androidId) {
        return res.status(400).json({
          success: false,
          error: 'Username, password, and androidId are required'
        });
      }

      try {
        const [users] = await connection.execute(
          'SELECT username, password, android_id FROM users WHERE username = ?',
          [username]
        );

        if (users.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Username tidak ditemukan'
          });
        }

        const user = users[0];

        if (user.password !== password) {
          return res.status(401).json({
            success: false,
            error: 'Password salah'
          });
        }

        if (user.android_id !== androidId) {
          return res.status(403).json({
            success: false,
            error: `AKSES DITOLAK: Device tidak dikenali!\n\nRegistered Device: ${user.android_id.substring(0, 8)}...\nCurrent Device: ${androidId.substring(0, 8)}...`
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Login berhasil',
          username: username
        });

      } catch (dbError) {
        console.error('Database error during login:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Gagal validasi login'
        });
      }
    }

    // GET ALL USERS (for display purposes)
    if (req.method === 'GET' && req.query.action === 'all') {
      try {
        const [users] = await connection.execute(
          'SELECT username, password FROM users ORDER BY created_at DESC'
        );

        const userMap = {};
        users.forEach(user => {
          userMap[user.username] = user.password;
        });

        return res.status(200).json({
          success: true,
          users: userMap,
          total: users.length
        });

      } catch (dbError) {
        console.error('Database error getting users:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Gagal mengambil data users'
        });
      }
    }

    // GET USER ANDROID ID
    if (req.method === 'GET' && req.query.action === 'androidid') {
      const { username } = req.query;

      if (!username) {
        return res.status(400).json({
          success: false,
          error: 'Username is required'
        });
      }

      try {
        const [users] = await connection.execute(
          'SELECT android_id FROM users WHERE username = ?',
          [username]
        );

        if (users.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'User tidak ditemukan'
          });
        }

        return res.status(200).json({
          success: true,
          androidId: users[0].android_id
        });

      } catch (dbError) {
        console.error('Database error getting android ID:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Gagal mengambil Android ID'
        });
      }
    }

    // If no matching route
    return res.status(404).json({
      success: false,
      error: 'API endpoint not found'
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}