// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs');
const { exec } = require('child_process');

// Database configuration
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'database.sqlite');
console.log('Using database at:', dbPath);

// Create a single uploads directory for all teachers if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads', 'teachers');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory for teachers at:', uploadsDir);
}

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

      // Set up file watcher after database is initialized
      setupTeacherFolderWatcher();
    });
  }
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5123;

// Serve static files from public directory
app.use(express.static('public'));

// Serve uploaded files from the uploads directory
console.log('Setting up static file serving from:', path.join(__dirname, 'uploads'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Log all requests to uploads directory for debugging
app.use('/uploads', (req, res, next) => {
  console.log(`[Static Files] Accessing: ${req.url} from ${req.ip}`);
  // Check if the file exists before proceeding
  const filePath = path.join(__dirname, 'uploads', req.url);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`[Static Files] ERROR: File not found: ${filePath}`);
    } else {
      console.log(`[Static Files] File exists: ${filePath}`);
    }
    next();
  });
});

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Authentication middleware
const authenticateToken = (req, res, next) => {
  // Skip authentication for login and public routes
  if (req.path === '/api/login' || req.path === '/' || req.path === '/api/hello' || req.path === '/api/health' || 
      req.path.startsWith('/api/public/') || req.path === '/api/keys/available/public' ||
      req.path === '/api/debug/teacher-images') {
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

// Process an image file found in teachers directory
const processTeacherImage = (filename) => {
  // Only process image files
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
  const ext = path.extname(filename).toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    console.log(`Skipping non-image file: ${filename}`);
    return;
  }
  
  // Extract teacher ID from filename
  // Support multiple formats:
  // 1. teacherId_Name_Department.jpg
  // 2. teacherId.jpg
  const filenameWithoutExt = path.basename(filename, ext);
  
  let teacherId;
  if (filenameWithoutExt.includes('_')) {
    // Format: teacherId_Name_Department.jpg
    const parts = filenameWithoutExt.split('_');
    teacherId = parts[0];
  } else {
    // Format: teacherId.jpg
    teacherId = filenameWithoutExt;
  }
  
  // Check if the ID appears to be valid (allow alphanumeric characters)
  if (!/^[a-zA-Z0-9]+$/.test(teacherId)) {
    console.log(`Invalid teacher ID in filename: ${filename}. ID part should only contain letters and numbers.`);
    return;
  }
  
  console.log(`Processing image for teacher ID: ${teacherId}`);
  
  // Full path to the image
  const imagePath = path.join(uploadsDir, filename);
  
  // Relative path for URL (this is what we'll store in the database)
  const relativePath = `/uploads/teachers/${filename}`;
  
  // Check if the teacher exists in the database
  db.get("SELECT id, name, department FROM teachers WHERE id = ?", [teacherId], (err, teacher) => {
    if (err) {
      console.error(`Error checking teacher ${teacherId}:`, err);
      return;
    }
    
    if (teacher) {
      // Teacher exists, update the photo URL
      db.run(
        "UPDATE teachers SET photo_url = ? WHERE id = ?",
        [relativePath, teacherId],
        (err) => {
          if (err) {
            console.error(`Error updating photo for teacher ${teacherId}:`, err);
          } else {
            console.log(`Updated photo for teacher ${teacherId} (${teacher.name}) to ${relativePath}`);
          }
        }
      );
    } else {
      // Teacher doesn't exist yet, but we have their photo
      // Extract name and department from filename if possible
      let name = `Teacher ${teacherId}`;
      let department = 'Unknown Department';
      
      if (filenameWithoutExt.includes('_')) {
        const parts = filenameWithoutExt.split('_');
        if (parts.length >= 2) {
          name = parts[1].replace(/-/g, ' ');
        }
        
        if (parts.length >= 3) {
          department = parts[2].replace(/-/g, ' ');
        }
      }
      
      // Create teacher record with information from the filename
      db.run(
        "INSERT INTO teachers (id, name, department, photo_url) VALUES (?, ?, ?, ?)",
        [teacherId, name, department, relativePath],
        (err) => {
          if (err) {
            console.error(`Error creating teacher record for ID ${teacherId}:`, err);
          } else {
            console.log(`Created record for teacher ID ${teacherId} with photo ${relativePath}`);
          }
        }
      );
    }
  });
};

// Scan directory for existing teacher images and process them
const scanTeacherDirectory = () => {
  console.log(`Scanning teachers directory for existing images: ${uploadsDir}`);
  try {
    fs.readdir(uploadsDir, (err, files) => {
      if (err) {
        console.error('Error reading teachers directory:', err);
        return;
      }
      
      // Filter for image files
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return allowedExtensions.includes(ext);
      });
      
      console.log(`Found ${imageFiles.length} images in teachers directory`);
      
      // Process each file
      imageFiles.forEach(file => {
        console.log(`Processing existing teacher image: ${file}`);
        processTeacherImage(file);
      });
    });
  } catch (error) {
    console.error('Error scanning teachers directory:', error);
  }
};

// Setup a file watcher for the teachers uploads directory
const setupTeacherFolderWatcher = () => {
  // Watch the main uploads directory for changes
  fs.watch(uploadsDir, (eventType, filename) => {
    if (eventType === 'rename' && filename) {
      // A new file was added or a file was deleted
      const filePath = path.join(uploadsDir, filename);
      
      // Check if the file exists (to distinguish between add and delete)
      if (fs.existsSync(filePath)) {
        console.log(`New file detected in teachers folder: ${filename}`);
        processTeacherImage(filename);
      }
    }
  });
  
  console.log(`Set up file watcher for teachers uploads directory: ${uploadsDir}`);
};

// Set up file watcher after database is initialized
setupTeacherFolderWatcher();
// Scan existing teacher images
scanTeacherDirectory();

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
    
    // Check if teacher exists in database
    db.get("SELECT id, name, department, photo_url FROM teachers WHERE id = ?", [teacherId], (err, teacher) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // If teacher exists in database, return that information
      if (teacher) {
        console.log(`Teacher ${teacherId} found in database:`, teacher);
        // Ensure photo_url is properly formed
        if (teacher.photo_url && !teacher.photo_url.startsWith('data:image') && !teacher.photo_url.startsWith('/')) {
          teacher.photo_url = '/' + teacher.photo_url;
        }
        
        return res.json({
          success: true, 
          teacher: {
            id: teacher.id,
            name: teacher.name,
            department: teacher.department,
            photo_url: teacher.photo_url,
            source: 'database'
          }
        });
      }
      
      // If teacher doesn't exist in database, check the uploads folder
      const teacherDir = path.join(uploadsDir);
      
      // Read all files in the uploads directory
      fs.readdir(teacherDir, (err, files) => {
        if (err) {
          console.error('Error reading uploads directory:', err);
          return res.json({ success: false, message: 'Teacher not found' });
        }
        
        // Find files with matching ID in the filename (should start with the ID followed by underscore or just the ID)
        const teacherFiles = files.filter(file => {
          const filename = path.parse(file).name; // Get filename without extension
          return filename === teacherId || filename.startsWith(teacherId + '_'); // Check if matches ID exactly or starts with ID_
        });
        
        console.log(`Searching for teacher ID ${teacherId} in files, found: ${teacherFiles.length} matches`);
        
        if (teacherFiles.length === 0) {
          // No matching files found
          return res.json({ success: false, message: 'Teacher not found' });
        }
        
        // Get the first matching file
        const teacherFile = teacherFiles[0];
        
        // Create a photo URL for the file
        const photoUrl = `/uploads/teachers/${teacherFile}`;
        console.log(`Using photo from file: ${photoUrl}`);
        
        // Parse the filename to extract name and department if present
        const filenameParts = path.parse(teacherFile).name.split('_');
        let name = `Teacher ${teacherId}`;
        let department = 'Unknown Department';
        
        if (filenameParts.length >= 2) {
          name = filenameParts[1].replace(/-/g, ' ');
        }
        
        if (filenameParts.length >= 3) {
          department = filenameParts[2].replace(/-/g, ' ');
        }
        
        // Create a placeholder teacher object
        const teacherFromFile = {
          id: teacherId,
          name: name,
          department: department,
          photo_url: photoUrl,
          source: 'file'
        };
        
        // Create this teacher in the database as a placeholder
        db.run(
          "INSERT OR IGNORE INTO teachers (id, name, department, photo_url) VALUES (?, ?, ?, ?)",
          [teacherId, teacherFromFile.name, teacherFromFile.department, photoUrl],
          (err) => {
            if (err) {
              console.error('Error creating placeholder teacher record:', err);
            } else {
              console.log(`Created placeholder record for teacher ID ${teacherId} with photo ${photoUrl}`);
            }
          }
        );
        
        // Return the teacher information
        return res.json({
          success: true,
          teacher: teacherFromFile
        });
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

// General endpoint for getting the upload path information
app.get('/api/teachers/upload-path', (req, res) => {
  // Return the upload path information
  res.json({
    success: true,
    uploadPath: uploadsDir,
    filenameFormat: "TeacherID_Name_Department.jpg",
    uploadInstructions: "Place image files in the teachers folder with filename format: TeacherID_Name_Department.jpg"
  });
});

// Clear all teachers (admin only)
app.delete('/api/teachers/clear-all', authorizeAdmin, async (req, res) => {
  try {
    // Get all teachers
    db.all("SELECT id FROM teachers", async (err, teachers) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!teachers || teachers.length === 0) {
        return res.json({ message: 'No teachers to delete.' });
      }
      let deleted = 0;
      let skipped = 0;
      for (const teacher of teachers) {
        // Check for active transactions
        const hasActive = await new Promise((resolve) => {
          db.get(
            "SELECT COUNT(*) as activeCount FROM transactions WHERE teacherId = ? AND returnDate IS NULL",
            [teacher.id],
            (err, result) => {
              if (err) return resolve(true); // skip on error
              resolve(result.activeCount > 0);
            }
          );
        });
        if (hasActive) {
          skipped++;
          continue;
        }
        await new Promise((resolve) => {
          db.run("DELETE FROM teachers WHERE id = ?", [teacher.id], (err) => {
            if (!err) deleted++;
            resolve();
          });
        });
      }
      res.json({ message: `Deleted ${deleted} teachers. Skipped ${skipped} with active borrowed keys.` });
    });
  } catch (error) {
    console.error('Error clearing all teachers:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all teachers
app.get('/api/teachers', async (req, res) => {
  try {
    db.all("SELECT id, name, department, photo_url, created_at FROM teachers", (err, teachers) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Normalize photo URLs to ensure they start with '/' if they're not base64
      const normalizedTeachers = teachers.map(teacher => {
        if (teacher.photo_url && !teacher.photo_url.startsWith('data:image') && !teacher.photo_url.startsWith('/')) {
          teacher.photo_url = '/' + teacher.photo_url;
        }
        return teacher;
      });
      
      res.json(normalizedTeachers || []);
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
      
      // Normalize photo URL if it exists and isn't base64
      if (teacher.photo_url && !teacher.photo_url.startsWith('data:image') && !teacher.photo_url.startsWith('/')) {
        teacher.photo_url = '/' + teacher.photo_url;
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
    
    console.log(`Creating teacher with ID: ${id}, name: ${name}, photoProvided: ${!!photo_url}`);
    if (photo_url) {
      console.log(`Photo URL length: ${photo_url.length} characters`);
      const isBase64 = photo_url.startsWith('data:image');
      console.log(`Is base64 image: ${isBase64}`);
    }
    
    // Check if teacher exists
    db.get("SELECT * FROM teachers WHERE id = ?", [id], async (err, existingTeacher) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error: ' + err.message });
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
            console.error('Error creating teacher profile:', err);
            return res.status(500).json({ error: 'Error creating teacher profile: ' + err.message });
          }
    
          res.status(201).json({
            id,
            name,
            department,
            photo_url: photo_url,
            message: 'Teacher created successfully'
          });
        }
      );
    });
  } catch (error) {
    console.error('Error creating teacher:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
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
  
    console.log(`Updating teacher ${teacherId} with:`, { name, department, photoProvided: !!photo_url });
    
    if (photo_url) {
      console.log(`Photo URL length: ${photo_url.length} characters`);
      // Check if it's a base64 string
      const isBase64 = photo_url.startsWith('data:image');
      console.log(`Is base64 image: ${isBase64}`);
    }
    
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
            return res.status(500).json({ error: 'Error updating teacher profile: ' + err.message });
          }
          
          if (this.changes === 0) {
            return res.status(404).json({ error: 'Teacher not found or no changes made' });
          }
          
          console.log(`Teacher ${teacherId} updated successfully`);
          res.json({
            id: teacherId,
            name,
            department,
            photo_url: photo_url,
            message: 'Teacher updated successfully'
          });
        }
      );
    });
  } catch (error) {
    console.error('Error updating teacher:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
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

// Endpoint to open a folder - useful for the import feature
app.post('/api/open-folder', authenticateToken, (req, res) => {
  const { path: folderPath } = req.body;
  
  if (!folderPath) {
    return res.status(400).json({ error: 'Folder path is required' });
  }
  
  console.log(`Attempting to open folder: ${folderPath}`);
  
  // Check if folder exists
  if (!fs.existsSync(folderPath)) {
    return res.status(404).json({ error: 'Folder not found' });
  }
  
  // Open folder based on OS
  const platform = process.platform;
  let command;
  
  if (platform === 'darwin') {
    // macOS
    command = `open "${folderPath}"`;
  } else if (platform === 'win32') {
    // Windows
    command = `explorer "${folderPath}"`;
  } else if (platform === 'linux') {
    // Linux
    command = `xdg-open "${folderPath}"`;
  } else {
    return res.status(400).json({ error: 'Unsupported platform' });
  }
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error opening folder: ${error}`);
      return res.status(500).json({ error: `Failed to open folder: ${error.message}` });
    }
    
    console.log(`Folder opened successfully: ${folderPath}`);
    res.json({ success: true, message: 'Folder opened successfully' });
  });
});

// Route to manually create or ensure a teacher's upload folder exists
app.post('/api/teachers/:teacherId/ensure-folder', authenticateToken, (req, res) => {
  const { teacherId } = req.params;
  
  // First check if this teacher exists
  db.get("SELECT id FROM teachers WHERE id = ?", [teacherId], (err, teacher) => {
    if (err) {
      console.error('Error checking teacher existence:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    // Return the upload information
    res.json({
      success: true,
      teacherId,
      uploadPath: uploadsDir,
      filenameFormat: `${teacherId}_filename.jpg`,
      uploadInstructions: `Place image files in the teachers folder with filename format: ${teacherId}_filename.jpg`
    });
  });
});

// Route to get a teacher's upload folder path
app.get('/api/teachers/:teacherId/upload-path', authenticateToken, (req, res) => {
  const { teacherId } = req.params;
  
  // First check if this teacher exists
  db.get("SELECT id FROM teachers WHERE id = ?", [teacherId], (err, teacher) => {
    if (err) {
      console.error('Error checking teacher existence:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    // Return the upload path information
    res.json({
      success: true,
      teacherId,
      uploadPath: uploadsDir,
      filenameFormat: `${teacherId}_Name_Department.jpg`,
      uploadInstructions: `Place image files in the teachers folder with filename format: ${teacherId}_Name_Department.jpg`
    });
  });
});

// Route to manually trigger re-scanning of the teachers directory
app.post('/api/teachers/rescan-directory', authenticateToken, authorizeAdmin, (req, res) => {
  console.log('Manually triggering rescan of teachers directory');
  try {
    scanTeacherDirectory();
    res.json({ 
      success: true, 
      message: 'Teacher directory scan initiated. Check server logs for results.' 
    });
  } catch (error) {
    console.error('Error initiating directory scan:', error);
    res.status(500).json({ error: 'Server error while scanning directory' });
  }
});

// Debug route to check image URLs
app.get('/api/debug/teacher-images', (req, res) => {
  try {
    // Scan images in the upload directory
    fs.readdir(uploadsDir, (err, files) => {
      if (err) {
        console.error('Error reading teachers directory:', err);
        return res.status(500).json({ error: 'Error reading directory' });
      }
      
      // Filter for image files
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return allowedExtensions.includes(ext);
      });
      
      // Get information about each image
      const images = imageFiles.map(file => {
        return {
          filename: file,
          path: path.join(uploadsDir, file),
          url: `/uploads/teachers/${file}`,
          exists: fs.existsSync(path.join(uploadsDir, file)),
          size: fs.existsSync(path.join(uploadsDir, file)) ? 
                fs.statSync(path.join(uploadsDir, file)).size : 0
        };
      });
      
      // Also check database for photo_url entries
      db.all("SELECT id, name, department, photo_url FROM teachers WHERE photo_url IS NOT NULL", (err, teachers) => {
        if (err) {
          console.error('Error querying teachers with photos:', err);
          return res.json({ 
            images,
            teachersWithPhotos: [],
            message: 'Error querying database' 
          });
        }
        
        res.json({
          uploadsDir,
          imageCount: images.length,
          images,
          teachersWithPhotos: teachers,
          staticServing: {
            uploadsDirExists: fs.existsSync(path.join(__dirname, 'uploads')),
            teachersDirExists: fs.existsSync(uploadsDir),
            serverPath: __dirname
          }
        });
      });
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Only start the server if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export the app
module.exports = app; 