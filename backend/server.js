const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Database setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Connected to the SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  // Users table (for admin and teachers)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    password TEXT NOT NULL,
    role TEXT NOT NULL
  )`);

  // Keys table
  db.run(`CREATE TABLE IF NOT EXISTS keys (
    keyId TEXT PRIMARY KEY,
    lab TEXT NOT NULL,
    status TEXT NOT NULL
  )`);

  // Transactions table (for borrowing and returning)
  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacherId TEXT NOT NULL,
    keyId TEXT NOT NULL,
    borrowDate TEXT NOT NULL,
    returnDate TEXT,
    FOREIGN KEY (teacherId) REFERENCES users (id),
    FOREIGN KEY (keyId) REFERENCES keys (keyId)
  )`);

  // Create initial admin user if it doesn't exist
  const saltRounds = 10;
  bcrypt.hash('admin123', saltRounds, (err, hash) => {
    if (err) {
      console.error('Error hashing password:', err);
      return;
    }
    
    db.get('SELECT * FROM users WHERE id = ?', ['admin'], (err, row) => {
      if (err) {
        console.error('Error checking for admin user:', err);
        return;
      }
      
      if (!row) {
        console.log('Admin user not found, creating...');
        db.run(
          'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
          ['admin', 'System Admin', 'admin@school.org', hash, 'admin'],
          function(err) {
            if (err) {
              console.error('Error creating admin user:', err);
            } else {
              console.log('Admin user created successfully');
            }
          }
        );
      } else {
        console.log('Admin user already exists');
      }
    });
  });
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5123;
const JWT_SECRET = 'your_jwt_secret_key'; // In production, use environment variable

// Middleware
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Enable pre-flight for all routes
app.options('*', cors());

app.use(express.json());

// CORS headers middleware for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Admin authorization middleware
const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Add a simple hello route
app.get('/api/hello', (req, res) => {
  console.log('Hello endpoint accessed');
  res.json({ message: 'Hello from the backend server!' });
});

// Routes

// Authentication
app.post('/api/login', (req, res) => {
  console.log('Login attempt:', req.body);
  const { id, password } = req.body;
  
  if (!id || !password) {
    console.log('Missing credentials');
    return res.status(400).json({ error: 'ID and password are required' });
  }
  
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      console.log('User not found:', id);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log('User found:', user.id, user.role);
    
    bcrypt.compare(password, user.password, (err, result) => {
      if (err) {
        console.error('Password comparison error:', err);
        return res.status(500).json({ error: 'Password verification error' });
      }
      
      if (!result) {
        console.log('Password mismatch for user:', id);
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      console.log('Login successful for user:', id);
      
      const token = jwt.sign(
        { id: user.id, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '8h' }
      );
      
      res.json({ 
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    });
  });
});

// Get current user info
app.get('/api/me', authenticateToken, (req, res) => {
  db.get('SELECT id, name, email, role FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  });
});

// Teacher routes
app.get('/api/teachers', authenticateToken, (req, res) => {
  db.all('SELECT id, name, email FROM users WHERE role = "teacher"', (err, teachers) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(teachers);
  });
});

app.post('/api/teachers', authenticateToken, authorizeAdmin, (req, res) => {
  const { id, name, email, password } = req.body;
  
  if (!id || !name || !password) {
    return res.status(400).json({ error: 'ID, name, and password are required' });
  }
  
  // Check if teacher ID already exists
  db.get('SELECT id FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (user) {
      return res.status(400).json({ error: 'Teacher ID already exists' });
    }
    
    // Hash password
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        return res.status(500).json({ error: 'Error hashing password' });
      }
      
      db.run(
        'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
        [id, name, email || null, hash, 'teacher'],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error creating teacher' });
          }
          
          res.status(201).json({
            id,
            name,
            email
          });
        }
      );
    });
  });
});

app.put('/api/teachers/:id', authenticateToken, authorizeAdmin, (req, res) => {
  const { name, email } = req.body;
  const { id } = req.params;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  db.run(
    'UPDATE users SET name = ?, email = ? WHERE id = ? AND role = "teacher"',
    [name, email || null, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error updating teacher' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Teacher not found' });
      }
      
      res.json({ id, name, email });
    }
  );
});

app.delete('/api/teachers/:id', authenticateToken, authorizeAdmin, (req, res) => {
  const { id } = req.params;
  
  // Check for active borrows
  db.get(
    'SELECT COUNT(*) as activeCount FROM transactions WHERE teacherId = ? AND returnDate IS NULL',
    [id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (result.activeCount > 0) {
        return res.status(400).json({ error: 'Cannot delete teacher with active borrows' });
      }
      
      db.run('DELETE FROM users WHERE id = ? AND role = "teacher"', [id], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error deleting teacher' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Teacher not found' });
        }
        
        res.json({ message: 'Teacher deleted successfully' });
      });
    }
  );
});

// Key routes
app.get('/api/keys', authenticateToken, (req, res) => {
  db.all('SELECT keyId, lab, status FROM keys', (err, keys) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(keys);
  });
});

app.post('/api/keys', authenticateToken, authorizeAdmin, (req, res) => {
  const { keyId, lab } = req.body;
  
  if (!keyId || !lab) {
    return res.status(400).json({ error: 'Key ID and lab name are required' });
  }
  
  // Check if key ID already exists
  db.get('SELECT keyId FROM keys WHERE keyId = ?', [keyId], (err, key) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (key) {
      return res.status(400).json({ error: 'Key ID already exists' });
    }
    
    db.run(
      'INSERT INTO keys (keyId, lab, status) VALUES (?, ?, ?)',
      [keyId, lab, 'Available'],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error adding key' });
        }
        
        res.status(201).json({
          keyId,
          lab,
          status: 'Available'
        });
      }
    );
  });
});

app.delete('/api/keys/:keyId', authenticateToken, authorizeAdmin, (req, res) => {
  const { keyId } = req.params;
  
  // Check if key is currently borrowed
  db.get('SELECT status FROM keys WHERE keyId = ?', [keyId], (err, key) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!key) {
      return res.status(404).json({ error: 'Key not found' });
    }
    
    if (key.status === 'Borrowed') {
      return res.status(400).json({ error: 'Cannot delete a borrowed key' });
    }
    
    db.run('DELETE FROM keys WHERE keyId = ?', [keyId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error deleting key' });
      }
      
      res.json({ message: 'Key deleted successfully' });
    });
  });
});

// Borrow/Return routes
app.post('/api/borrow', authenticateToken, (req, res) => {
  const { keyId } = req.body;
  const teacherId = req.user.id;
  
  if (!keyId) {
    return res.status(400).json({ error: 'Key ID is required' });
  }
  
  // Check if key is available
  db.get('SELECT status FROM keys WHERE keyId = ?', [keyId], (err, key) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!key) {
      return res.status(404).json({ error: 'Key not found' });
    }
    
    if (key.status !== 'Available') {
      return res.status(400).json({ error: 'Key is not available' });
    }
    
    // Get current timestamp
    const borrowDate = new Date().toISOString();
    
    // Start a transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Update key status
      db.run(
        'UPDATE keys SET status = ? WHERE keyId = ?',
        ['Borrowed', keyId],
        function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Error updating key status' });
          }
          
          // Create transaction record
          db.run(
            'INSERT INTO transactions (teacherId, keyId, borrowDate) VALUES (?, ?, ?)',
            [teacherId, keyId, borrowDate],
            function(err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Error creating transaction record' });
              }
              
              db.run('COMMIT');
              res.status(201).json({
                id: this.lastID,
                teacherId,
                keyId,
                borrowDate,
                returnDate: null
              });
            }
          );
        }
      );
    });
  });
});

app.post('/api/return', authenticateToken, (req, res) => {
  const { keyId } = req.body;
  const teacherId = req.user.id;
  
  if (!keyId) {
    return res.status(400).json({ error: 'Key ID is required' });
  }
  
  // Check if key exists and is borrowed by this teacher
  db.get(
    `SELECT t.id FROM transactions t 
     JOIN keys k ON t.keyId = k.keyId 
     WHERE t.keyId = ? AND t.teacherId = ? AND t.returnDate IS NULL`,
    [keyId, teacherId],
    (err, transaction) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!transaction) {
        return res.status(400).json({ error: 'You do not have this key borrowed' });
      }
      
      const returnDate = new Date().toISOString();
      
      // Start a transaction
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Update key status
        db.run(
          'UPDATE keys SET status = ? WHERE keyId = ?',
          ['Available', keyId],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Error updating key status' });
            }
            
            // Update transaction record
            db.run(
              'UPDATE transactions SET returnDate = ? WHERE id = ?',
              [returnDate, transaction.id],
              function(err) {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Error updating transaction record' });
                }
                
                db.run('COMMIT');
                res.json({
                  id: transaction.id,
                  teacherId,
                  keyId,
                  returnDate
                });
              }
            );
          }
        );
      });
    }
  );
});

// Get transactions
app.get('/api/transactions', authenticateToken, (req, res) => {
  const teacherId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  
  // Admins can see all transactions, teachers can only see their own
  const query = isAdmin 
    ? `SELECT t.*, u.name as teacherName 
       FROM transactions t 
       JOIN users u ON t.teacherId = u.id 
       ORDER BY t.borrowDate DESC`
    : `SELECT t.* 
       FROM transactions t 
       WHERE t.teacherId = ? 
       ORDER BY t.borrowDate DESC`;
  
  const params = isAdmin ? [] : [teacherId];
  
  db.all(query, params, (err, transactions) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(transactions);
  });
});

// Get active borrows
app.get('/api/transactions/active', authenticateToken, (req, res) => {
  const teacherId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  
  // Calculate overdue (24 hours threshold)
  const overdueCutoff = new Date();
  overdueCutoff.setHours(overdueCutoff.getHours() - 24);
  const overdueCutoffStr = overdueCutoff.toISOString();
  
  // Admins can see all active borrows, teachers can only see their own
  const query = isAdmin 
    ? `SELECT t.*, u.name as teacherName, k.lab,
         CASE WHEN t.borrowDate < ? THEN 1 ELSE 0 END as isOverdue
       FROM transactions t 
       JOIN users u ON t.teacherId = u.id 
       JOIN keys k ON t.keyId = k.keyId
       WHERE t.returnDate IS NULL 
       ORDER BY t.borrowDate ASC`
    : `SELECT t.*, k.lab,
         CASE WHEN t.borrowDate < ? THEN 1 ELSE 0 END as isOverdue
       FROM transactions t 
       JOIN keys k ON t.keyId = k.keyId
       WHERE t.teacherId = ? AND t.returnDate IS NULL 
       ORDER BY t.borrowDate ASC`;
  
  const params = isAdmin ? [overdueCutoffStr] : [overdueCutoffStr, teacherId];
  
  db.all(query, params, (err, borrows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(borrows);
  });
});

// Dashboard data (admin only)
app.get('/api/dashboard', authenticateToken, authorizeAdmin, (req, res) => {
  // Calculate overdue (24 hours threshold)
  const overdueCutoff = new Date();
  overdueCutoff.setHours(overdueCutoff.getHours() - 24);
  const overdueCutoffStr = overdueCutoff.toISOString();
  
  db.serialize(() => {
    // Get total counts
    db.get(
      `SELECT 
         (SELECT COUNT(*) FROM keys) as totalKeys,
         (SELECT COUNT(*) FROM keys WHERE status = 'Available') as availableKeys,
         (SELECT COUNT(*) FROM keys WHERE status = 'Borrowed') as borrowedKeys,
         (SELECT COUNT(*) FROM users WHERE role = 'teacher') as totalTeachers,
         (SELECT COUNT(*) FROM transactions WHERE returnDate IS NULL AND borrowDate < ?) as overdueKeys`,
      [overdueCutoffStr],
      (err, stats) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        // Get overdue transactions
        db.all(
          `SELECT t.*, u.name as teacherName, k.lab
           FROM transactions t 
           JOIN users u ON t.teacherId = u.id 
           JOIN keys k ON t.keyId = k.keyId
           WHERE t.returnDate IS NULL AND t.borrowDate < ?
           ORDER BY t.borrowDate ASC`,
          [overdueCutoffStr],
          (err, overdueTransactions) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }
            
            res.json({
              stats,
              overdueTransactions
            });
          }
        );
      }
    );
  });
});

// Test endpoint to check admin user
app.get('/api/check-admin', (req, res) => {
  db.get('SELECT id, name, email, role FROM users WHERE id = ?', ['admin'], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    res.json({ 
      message: 'Admin user exists', 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  });
});

// Add a simple test route
app.get('/api/test', (req, res) => {
  console.log('Test endpoint accessed');
  res.json({ message: 'Backend server is running!' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 