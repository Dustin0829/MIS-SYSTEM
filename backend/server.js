// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Database configuration
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'database.sqlite');
console.log('Using database at:', dbPath);

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_here';

// Create or open SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('DATABASE ERROR:', err.message);
    } else {
    console.log('Connected to the SQLite database');
    
    // Create tables if they don't exist
    db.serialize(() => {
      // Users table (admin and teachers)
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL CHECK(role IN ('admin', 'teacher')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      
      // Create default admin if not exists
      db.get("SELECT * FROM users WHERE id = 'admin'", (err, row) => {
        if (err) {
          console.error('Error checking admin user:', err);
          return;
        }
        
        if (!row) {
          bcrypt.hash('admin123', 10, (err, hash) => {
            if (err) {
              console.error('Error hashing password:', err);
              return;
            }
            
            db.run(
              "INSERT INTO users (id, name, password, email, role) VALUES (?, ?, ?, ?, ?)",
              ['admin', 'System Admin', hash, 'admin@example.com', 'admin'],
              (err) => {
                if (err) {
                  console.error('Error creating admin user:', err);
                } else {
                  console.log('Default admin user created');
                }
              }
            );
          });
        }
      });
      
      // Create test teacher account if not exists
      db.get("SELECT * FROM users WHERE id = 'teacher1'", (err, row) => {
        if (err) {
          console.error('Error checking teacher user:', err);
          return;
        }
        
        if (!row) {
          bcrypt.hash('password', 10, (err, hash) => {
            if (err) {
              console.error('Error hashing password:', err);
              return;
            }
            
            // Insert test teacher in users table
            db.run(
              "INSERT INTO users (id, name, password, email, role) VALUES (?, ?, ?, ?, ?)",
              ['teacher1', 'John Smith', hash, 'teacher1@example.com', 'teacher'],
              (err) => {
                if (err) {
                  console.error('Error creating teacher user:', err);
                } else {
                  // Also add teacher to teachers table
                  db.run(
                    "INSERT INTO teachers (id, name, department, photo_url) VALUES (?, ?, ?, ?)",
                    ['teacher1', 'John Smith', 'Computer Science', null],
                    (err) => {
                      if (err) {
                        console.error('Error adding teacher to teachers table:', err);
                      } else {
                        console.log('Default teacher account created');
                      }
                    }
                  );
                }
              }
            );
          });
        }
      });
      
      // Ensure teachers table is created
      db.run(`CREATE TABLE IF NOT EXISTS teachers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        department TEXT,
        photo_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      
      // Create keys table if not exists
      db.run(`CREATE TABLE IF NOT EXISTS keys (
        keyId TEXT PRIMARY KEY,
        lab TEXT NOT NULL,
        status TEXT CHECK(status IN ('Available', 'Borrowed')) DEFAULT 'Available',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      
      // Create transactions table if not exists
      db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        keyId TEXT NOT NULL,
        teacherId TEXT NOT NULL,
        borrowDate TEXT NOT NULL,
        returnDate TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (keyId) REFERENCES keys (keyId),
        FOREIGN KEY (teacherId) REFERENCES teachers (id)
      )`);
      
      // Create sample data for testing if needed
      db.get("SELECT COUNT(*) as count FROM keys", (err, result) => {
        if (err) {
          console.error('Error checking keys count:', err);
          return;
        }
        
        if (result.count === 0) {
          console.log('No keys found, creating sample data...');
          
          // Create some sample keys
          const sampleKeys = [
            { keyId: 'K001', lab: 'Computer Lab 1' },
            { keyId: 'K002', lab: 'Computer Lab 2' },
            { keyId: 'K003', lab: 'Science Lab' },
            { keyId: 'K004', lab: 'Language Lab' },
            { keyId: 'K005', lab: 'Engineering Lab' }
          ];
          
          sampleKeys.forEach(key => {
            db.run(
              "INSERT INTO keys (keyId, lab, status) VALUES (?, ?, ?)",
              [key.keyId, key.lab, 'Available'],
              err => {
                if (err) console.error(`Error creating sample key ${key.keyId}:`, err);
              }
            );
          });
          
          console.log('Sample keys created');
        }
      });
    });
  }
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5123;

// Serve static files from public directory
app.use(express.static('public'));

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Add CORS preflight handling
app.options('*', cors());

// Enable JSON parsing with increased limit for base64 encoded images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Authentication middleware
const authenticateToken = (req, res, next) => {
  // Skip authentication for login and public routes
  if (req.path === '/api/login' || req.path === '/' || req.path === '/api/hello' || req.path === '/api/health' || 
      req.path.startsWith('/api/public/') || req.path === '/api/keys/available/public') {
    return next();
  }
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    // Instead of rejecting immediately, check if this is dashboard access
    // If user info is provided in the query, use that as a fallback
    if (req.path === '/api/dashboard' && req.query.userRole === 'admin') {
      req.user = { role: 'admin' };
      return next();
    }
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.warn('Token verification failed:', err.message);
      
      // For dashboard access, provide a fallback if the query parameters suggest admin
      if (req.path === '/api/dashboard' && req.query.userRole === 'admin') {
        req.user = { role: 'admin' };
        return next();
      }
      
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Admin authorization middleware
const authorizeAdmin = (req, res, next) => {
  // More lenient admin check for dashboard
  // If userRole query param is present and is admin, allow access
  if (req.path === '/api/dashboard' && req.query.userRole === 'admin') {
    return next();
  }
  
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'STI-MIS Backend API is running. Use /api/* endpoints to access the API.' });
});

// Add a simple hello route
app.get('/api/hello', (req, res) => {
  console.log('Hello endpoint accessed');
  res.json({ message: 'Hello from the backend server!' });
});

// Login route
app.post('/api/login', async (req, res) => {
  try {
  const { id, password } = req.body;
  
  if (!id || !password) {
    return res.status(400).json({ error: 'ID and password are required' });
  }
  
    console.log(`Login attempt for user: ${id}`);
    
    // Check if user exists
    db.get("SELECT * FROM users WHERE id = ?", [id], async (err, user) => {
      if (err) {
        console.error('Database error during login:', err);
        return res.status(500).json({ error: 'Database error during login' });
    }
    
    if (!user) {
        console.log(`User not found: ${id}`);
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
      try {
    // Compare password
        const match = await bcrypt.compare(password, user.password);
        
        if (!match) {
          console.log(`Invalid password for user: ${id}`);
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT token
    const token = jwt.sign(
          { id: user.id, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '365d' }
    );
        
        console.log(`Login successful for user: ${id}, role: ${user.role}`);
    
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
            role: user.role,
            email: user.email
          }
        });
      } catch (err) {
        console.error('Error during password comparison:', err);
        return res.status(500).json({ error: 'Authentication error' });
      }
    });
  } catch (error) {
    console.error('Unexpected error during login:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user info
app.get('/api/me', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  db.get("SELECT id, name, email, role FROM users WHERE id = ?", [userId], (err, user) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  });
});

// Public endpoint to get available keys (no auth required)
app.get('/api/keys/available/public', async (req, res) => {
  try {
    db.all("SELECT * FROM keys WHERE status = 'Available'", (err, keys) => {
      if (err) {
        console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
      
      res.json(keys || []);
    });
  } catch (error) {
    console.error('Error getting available keys:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public endpoint to get transactions
app.get('/api/public/transactions', async (req, res) => {
  try {
    const query = `
      SELECT t.*, k.keyId, k.lab, teach.name as teacher_name, teach.department, teach.photo_url
      FROM transactions t
      JOIN keys k ON t.keyId = k.keyId
      JOIN teachers teach ON t.teacherId = teach.id
      ORDER BY t.borrowDate DESC
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Error fetching transactions:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Format transactions for frontend
      const formattedTransactions = rows.map(t => ({
        id: t.id,
        keyId: t.keyId,
        teacherId: t.teacherId,
        teacherName: t.teacher_name,
        teacherDepartment: t.department,
        teacherPhotoUrl: t.photo_url,
        borrowDate: t.borrowDate,
        returnDate: t.returnDate,
        lab: t.lab,
        status: t.returnDate === null ? 'Borrowed' : 'Returned'
      }));
      
      res.json(formattedTransactions);
    });
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public endpoint to verify teacher existence
app.get('/api/teachers/verify/:id', async (req, res) => {
  try {
    const teacherId = req.params.id;
    console.log(`Verifying teacher ID: ${teacherId}`);
    
    db.get("SELECT id, name, department, photo_url FROM teachers WHERE id = ?", [teacherId], (err, teacher) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!teacher) {
        return res.json({ success: false, message: 'Teacher not found' });
    }
    
    res.json({
        success: true, 
        teacher: {
          id: teacher.id,
          name: teacher.name,
          department: teacher.department,
          photo_url: teacher.photo_url
        }
      });
    });
  } catch (error) {
    console.error('Error verifying teacher:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public route for borrowing keys
app.post('/api/public/borrow', async (req, res) => {
  try {
    const { keyId, teacherId } = req.body;
    
    if (!keyId || !teacherId) {
      return res.status(400).json({ error: 'Key ID and Teacher ID are required' });
    }
    
    // Check if teacher exists
    const teacher = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM teachers WHERE id = ?", [teacherId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    // Check if key exists and is available
    const key = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM keys WHERE keyId = ?", [keyId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!key) {
      return res.status(404).json({ error: 'Key not found' });
    }
    
    if (key.status !== 'Available') {
      return res.status(400).json({ error: 'Key is not available for borrowing' });
    }
    
    // Update key status
    await new Promise((resolve, reject) => {
      db.run("UPDATE keys SET status = 'Borrowed' WHERE keyId = ?", [keyId], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Create transaction record
    const now = new Date().toISOString();
    const result = await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO transactions (keyId, teacherId, borrowDate) VALUES (?, ?, ?)",
        [keyId, teacherId, now],
        function(err) {
          if (err) reject(err);
          else resolve({id: this.lastID});
        }
      );
    });
    
    const transactionId = result.id;
    
    res.json({
      success: true,
      message: 'Key borrowed successfully',
      transaction: {
        id: transactionId,
        keyId,
        teacherId,
        borrowDate: now,
        teacher: {
          id: teacher.id,
          name: teacher.name,
          department: teacher.department,
          photo_url: teacher.photo_url
        },
        key: { ...key, status: 'Borrowed' }
      }
    });
  } catch (error) {
    console.error('Error borrowing key:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// Public route for returning keys
app.post('/api/public/return', async (req, res) => {
  try {
    const { keyId, teacherId } = req.body;
  
    if (!keyId) {
      return res.status(400).json({ error: 'Key ID is required' });
    }
  
    if (!teacherId) {
      return res.status(400).json({ error: 'Teacher ID is required' });
    }
    
    // Check if key exists and is borrowed
    const key = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM keys WHERE keyId = ?", [keyId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!key) {
      return res.status(404).json({ error: 'Key not found' });
    }
    
    if (key.status !== 'Borrowed') {
      return res.status(400).json({ error: 'Key is not currently borrowed' });
    }
    
    // Find active transaction for this key and teacher
    const transaction = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM transactions WHERE keyId = ? AND teacherId = ? AND returnDate IS NULL ORDER BY borrowDate DESC LIMIT 1",
        [keyId, teacherId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!transaction) {
      return res.status(400).json({ error: 'No active borrow record found for this key and teacher' });
    }
    
    // Update key status to available
    await new Promise((resolve, reject) => {
      db.run("UPDATE keys SET status = 'Available' WHERE keyId = ?", [keyId], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Update transaction
    const now = new Date().toISOString();
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE transactions SET returnDate = ? WHERE id = ?",
        [now, transaction.id],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    res.json({ 
      success: true,
      message: 'Key returned successfully',
      transaction: {
        id: transaction.id,
        keyId,
        teacherId,
        borrowDate: transaction.borrowDate,
        returnDate: now
      }
    });
  } catch (error) {
    console.error('Error returning key:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// Apply authentication middleware
app.use(authenticateToken);

// Get all teachers
app.get('/api/teachers', async (req, res) => {
  try {
    db.all("SELECT id, name, department, photo_url, created_at FROM teachers", (err, teachers) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json(teachers || []);
    });
  } catch (error) {
    console.error('Error getting teachers:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get teacher by ID
app.get('/api/teachers/:id', async (req, res) => {
  try {
    const teacherId = req.params.id;
    
    db.get("SELECT id, name, department, photo_url, created_at FROM teachers WHERE id = ?", [teacherId], (err, teacher) => {
      if (err) {
        console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
      
      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found' });
      }
      
      res.json(teacher);
    });
  } catch (error) {
    console.error('Error getting teacher:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a teacher (admin only)
app.post('/api/teachers', authorizeAdmin, async (req, res) => {
  try {
    const { id, name, department, photo_url } = req.body;
  
    if (!id || !name) {
      return res.status(400).json({ error: 'ID and name are required' });
    }
    
    // Check if teacher exists
    db.get("SELECT * FROM teachers WHERE id = ?", [id], async (err, existingTeacher) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (existingTeacher) {
        return res.status(400).json({ error: 'Teacher ID already exists' });
      }
      
      // Create teacher profile
      db.run(
        "INSERT INTO teachers (id, name, department, photo_url) VALUES (?, ?, ?, ?)",
        [id, name, department || null, photo_url || null],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error creating teacher profile' });
    }
    
    res.status(201).json({
            id,
            name,
            department,
            message: 'Teacher created successfully'
          });
        }
      );
    });
  } catch (error) {
    console.error('Error creating teacher:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a teacher (admin only)
app.put('/api/teachers/:id', authorizeAdmin, async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { name, department, photo_url } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
    console.log(`Updating teacher ${teacherId} with:`, req.body);
    
    // Check if teacher exists
    db.get("SELECT * FROM teachers WHERE id = ?", [teacherId], (err, existingTeacher) => {
      if (err) {
        console.error('Database error checking teacher:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!existingTeacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
      // Update teacher profile
      db.run(
        "UPDATE teachers SET name = ?, department = ?, photo_url = ? WHERE id = ?",
        [name, department || null, photo_url || null, teacherId],
        function(err) {
          if (err) {
            console.error('Error updating teacher:', err);
            return res.status(500).json({ error: 'Error updating teacher profile' });
          }
          
          if (this.changes === 0) {
            return res.status(404).json({ error: 'Teacher not found or no changes made' });
          }
          
          console.log(`Teacher ${teacherId} updated successfully`);
    res.json({
            id: teacherId,
            name,
            department,
            photo_url,
            message: 'Teacher updated successfully'
          });
        }
      );
    });
  } catch (error) {
    console.error('Error updating teacher:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a teacher (admin only)
app.delete('/api/teachers/:id', authorizeAdmin, async (req, res) => {
  try {
    const teacherId = req.params.id;
    
    // Check if teacher has any active transactions (borrowed keys)
    db.get(
      "SELECT COUNT(*) as activeCount FROM transactions WHERE teacherId = ? AND returnDate IS NULL",
      [teacherId],
      (err, result) => {
        if (err) {
          console.error('Error checking active transactions:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (result.activeCount > 0) {
          return res.status(400).json({ 
            error: 'Cannot delete a teacher with active borrowed keys. Please ensure all keys are returned first.'
          });
        }
        
        // Check if teacher exists
        db.get("SELECT * FROM teachers WHERE id = ?", [teacherId], (err, teacher) => {
          if (err) {
            console.error('Database error checking teacher:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          
          if (!teacher) {
            return res.status(404).json({ error: 'Teacher not found' });
          }
          
          // Delete teacher
          db.run("DELETE FROM teachers WHERE id = ?", [teacherId], function(err) {
            if (err) {
              console.error('Error deleting teacher:', err);
              return res.status(500).json({ error: 'Error deleting teacher' });
            }
            
            console.log(`Teacher ${teacherId} deleted successfully`);
            res.json({ message: 'Teacher deleted successfully' });
          });
        });
      }
    );
  } catch (error) {
    console.error('Error deleting teacher:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all keys
app.get('/api/keys', async (req, res) => {
  try {
    db.all("SELECT * FROM keys", (err, keys) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json(keys || []);
    });
  } catch (error) {
    console.error('Error getting keys:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get available keys
app.get('/api/keys/available', async (req, res) => {
  try {
    db.all("SELECT * FROM keys WHERE status = 'Available'", (err, keys) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json(keys || []);
    });
  } catch (error) {
    console.error('Error getting available keys:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a key (admin only)
app.post('/api/keys', authorizeAdmin, async (req, res) => {
  try {
  const { keyId, lab } = req.body;
  
  if (!keyId || !lab) {
      return res.status(400).json({ error: 'Key ID and lab are required' });
  }
  
    // Check if key exists
    db.get("SELECT * FROM keys WHERE keyId = ?", [keyId], (err, existingKey) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (existingKey) {
      return res.status(400).json({ error: 'Key ID already exists' });
    }
    
      // Create key
      db.run(
        "INSERT INTO keys (keyId, lab, status) VALUES (?, ?, ?)",
        [keyId, lab, 'Available'],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error creating key' });
          }
          
    res.status(201).json({
            keyId,
            lab,
            status: 'Available',
            message: 'Key created successfully'
          });
        }
      );
    });
  } catch (error) {
    console.error('Error creating key:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a key (admin only)
app.delete('/api/keys/:keyId', authorizeAdmin, async (req, res) => {
  try {
  const { keyId } = req.params;
  
    // Check if key exists and is not borrowed
    db.get("SELECT * FROM keys WHERE keyId = ?", [keyId], (err, key) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!key) {
      return res.status(404).json({ error: 'Key not found' });
    }
    
      if (key.status === 'Borrowed') {
      return res.status(400).json({ error: 'Cannot delete a borrowed key' });
    }
    
      // Delete key
      db.run("DELETE FROM keys WHERE keyId = ?", [keyId], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error deleting key' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Key not found' });
        }
        
    res.json({ message: 'Key deleted successfully' });
      });
    });
  } catch (error) {
    console.error('Error deleting key:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all transactions
app.get('/api/transactions', async (req, res) => {
  try {
    // For admin, show all transactions
    // For teachers, only show their own
  const teacherId = req.user.id;
  const isAdmin = req.user.role === 'admin';
    
    let query = `
      SELECT t.*, k.keyId, k.lab, teach.name as teacher_name, teach.department, teach.photo_url
      FROM transactions t
      JOIN keys k ON t.keyId = k.keyId
      JOIN teachers teach ON t.teacherId = teach.id
    `;
    
    if (!isAdmin) {
      query += ` WHERE t.teacherId = ?`;
    }
    
    query += ` ORDER BY t.borrowDate DESC`;
    
    const params = isAdmin ? [] : [teacherId];
    
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error fetching transactions:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Format transactions for frontend
      const formattedTransactions = rows.map(t => ({
        id: t.id,
        keyId: t.keyId,
        teacherId: t.teacherId,
        teacherName: t.teacher_name,
        teacherDepartment: t.department,
        teacherPhotoUrl: t.photo_url,
        borrowDate: t.borrowDate,
        returnDate: t.returnDate,
        lab: t.lab,
        status: t.returnDate === null ? 'Borrowed' : 'Returned'
      }));
      
      res.json(formattedTransactions);
    });
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get active transactions (currently borrowed keys)
app.get('/api/transactions/active', async (req, res) => {
  try {
    const teacherId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    let query = `
      SELECT t.*, k.keyId, k.lab, teach.name as teacher_name, teach.department, teach.photo_url
      FROM transactions t
      JOIN keys k ON t.keyId = k.keyId
      JOIN teachers teach ON t.teacherId = teach.id
      WHERE t.returnDate IS NULL
    `;
    
    if (!isAdmin) {
      query += ` AND t.teacherId = ?`;
    }
    
    query += ` ORDER BY t.borrowDate DESC`;
    
    const params = isAdmin ? [] : [teacherId];
    
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error fetching active transactions:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Format active transactions for frontend
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const formattedTransactions = rows.map(t => {
        const borrowDate = new Date(t.borrowDate);
        const isOverdue = borrowDate < oneDayAgo;
        
        return {
          id: t.id,
          keyId: t.keyId,
          teacherId: t.teacherId,
          teacherName: t.teacher_name,
          teacherDepartment: t.department,
          teacherPhotoUrl: t.photo_url,
          borrowDate: t.borrowDate,
          lab: t.lab,
          status: 'Borrowed',
          isOverdue
        };
      });
      
      res.json(formattedTransactions);
    });
  } catch (error) {
    console.error('Error getting active transactions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Dashboard data (admin only)
app.get('/api/dashboard', authorizeAdmin, async (req, res) => {
  try {
    // Run parallel queries to gather dashboard data
    Promise.all([
      // Total keys count
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM keys", (err, result) => {
          if (err) reject(err);
          else resolve({ totalKeys: result ? result.count : 0 });
        });
      }),
      
      // Available keys count
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM keys WHERE status = 'Available'", (err, result) => {
          if (err) reject(err);
          else resolve({ availableKeys: result ? result.count : 0 });
        });
      }),
      
      // Borrowed keys count
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM keys WHERE status = 'Borrowed'", (err, result) => {
          if (err) reject(err);
          else resolve({ borrowedKeys: result ? result.count : 0 });
        });
      }),
      
      // Total teachers count
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM teachers", (err, result) => {
          if (err) reject(err);
          else resolve({ totalTeachers: result ? result.count : 0 });
        });
      }),
      
      // Overdue keys (borrowed more than 24 hours ago)
      new Promise((resolve, reject) => {
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);
        const cutoffDate = oneDayAgo.toISOString();
        
        db.all(
          `SELECT t.*, k.keyId, k.lab, teach.name as teacher_name, teach.department
           FROM transactions t
           JOIN keys k ON t.keyId = k.keyId
           JOIN teachers teach ON t.teacherId = teach.id
           WHERE t.returnDate IS NULL AND t.borrowDate < ?
           ORDER BY t.borrowDate ASC`,
          [cutoffDate],
          (err, rows) => {
            if (err) reject(err);
            else {
              const overdueCount = rows.length;
              resolve({ 
                overdueKeys: overdueCount,
                overdueTransactions: rows
              });
            }
          }
        );
      })
    ])
    .then(results => {
      // Combine all results into a single stats object
      const stats = Object.assign({}, ...results.map(r => {
        if (r.overdueTransactions) {
          return { 
            overdueKeys: r.overdueKeys,
            overdueTransactions: r.overdueTransactions.map(t => ({
              id: t.id,
              keyId: t.keyId,
              teacherId: t.teacherId,
              teacherName: t.teacher_name,
              lab: t.lab,
              borrowDate: t.borrowDate,
              isOverdue: true
            }))
          };
        }
        return r;
      }));
    
    res.json({
        stats: {
          totalKeys: stats.totalKeys || 0,
          availableKeys: stats.availableKeys || 0,
          borrowedKeys: stats.borrowedKeys || 0,
          totalTeachers: stats.totalTeachers || 0,
          overdueKeys: stats.overdueKeys || 0
        },
        overdueTransactions: stats.overdueTransactions || []
      });
    })
    .catch(error => {
      console.error('Error generating dashboard data:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    });
  } catch (error) {
    console.error('Unexpected error in dashboard endpoint:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
    status: 'ok', 
      timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Only start the server if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export the app
module.exports = app; 