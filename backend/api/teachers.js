const express = require('express');
const router = express.Router();
const { db } = require('../server');
const { authorizeAdmin } = require('./auth');

// Get all teachers
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM teachers';
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ data: rows });
  });
});

// Verify teacher by ID (public route, no auth required)
router.get('/verify/:id', (req, res) => {
  const sql = 'SELECT id, name, department, photo_url FROM teachers WHERE id = ?';
  db.get(sql, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    res.json({ 
      success: true,
      teacher: row 
    });
  });
});

// Get a single teacher
router.get('/:id', (req, res) => {
  const sql = 'SELECT * FROM teachers WHERE id = ?';
  db.get(sql, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    res.json({ data: row });
  });
});

// Create a new teacher
router.post('/', (req, res) => {
  const { name, email, phone } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  
  const sql = 'INSERT INTO teachers (name, email, phone) VALUES (?, ?, ?)';
  db.run(sql, [name, email, phone], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.status(201).json({
      message: 'Teacher created successfully',
      data: { id: this.lastID, name, email, phone }
    });
  });
});

// Update a teacher
router.put('/:id', (req, res) => {
  const { name, email, phone } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  
  const sql = 'UPDATE teachers SET name = ?, email = ?, phone = ? WHERE id = ?';
  db.run(sql, [name, email, phone, req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    res.json({
      message: 'Teacher updated successfully',
      data: { id: req.params.id, name, email, phone }
    });
  });
});

// Delete a teacher
router.delete('/:id', (req, res) => {
  // Check if teacher has any active transactions
  const checkSql = 'SELECT * FROM transactions WHERE teacherId = ? AND returnDate IS NULL';
  db.get(checkSql, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (row) {
      return res.status(400).json({ error: 'Cannot delete teacher with active key transactions' });
    }
    
    const sql = 'DELETE FROM teachers WHERE id = ?';
    db.run(sql, [req.params.id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Teacher not found' });
      }
      
      res.json({ message: 'Teacher deleted successfully' });
    });
  });
});

// Clear all teachers (admin only)
router.delete('/clear-all', authorizeAdmin, async (req, res) => {
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

module.exports = router; 