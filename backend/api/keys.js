const express = require('express');
const router = express.Router();
const db = require('../server');

// Get all keys
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM keys';
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ data: rows });
  });
});

// Get a single key
router.get('/:id', (req, res) => {
  const sql = 'SELECT * FROM keys WHERE id = ?';
  db.get(sql, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Key not found' });
    }
    res.json({ data: row });
  });
});

// Create a new key
router.post('/', (req, res) => {
  const { roomNumber, keyType, location, status } = req.body;
  
  if (!roomNumber) {
    return res.status(400).json({ error: 'Room number is required' });
  }
  
  const sql = 'INSERT INTO keys (roomNumber, keyType, location, status) VALUES (?, ?, ?, ?)';
  const statusValue = status || 'available'; // Default to available if not provided
  
  db.run(sql, [roomNumber, keyType, location, statusValue], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.status(201).json({
      message: 'Key created successfully',
      data: { 
        id: this.lastID, 
        roomNumber, 
        keyType, 
        location,
        status: statusValue
      }
    });
  });
});

// Update a key
router.put('/:id', (req, res) => {
  const { roomNumber, keyType, location, status } = req.body;
  
  if (!roomNumber) {
    return res.status(400).json({ error: 'Room number is required' });
  }
  
  const sql = 'UPDATE keys SET roomNumber = ?, keyType = ?, location = ?, status = ? WHERE id = ?';
  db.run(sql, [roomNumber, keyType, location, status, req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Key not found' });
    }
    
    res.json({
      message: 'Key updated successfully',
      data: { id: req.params.id, roomNumber, keyType, location, status }
    });
  });
});

// Delete a key
router.delete('/:id', (req, res) => {
  // Check if key is currently checked out
  const checkSql = 'SELECT * FROM transactions WHERE keyId = ? AND returnDate IS NULL';
  db.get(checkSql, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (row) {
      return res.status(400).json({ error: 'Cannot delete key that is currently checked out' });
    }
    
    const sql = 'DELETE FROM keys WHERE id = ?';
    db.run(sql, [req.params.id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Key not found' });
      }
      
      res.json({ message: 'Key deleted successfully' });
    });
  });
});

// Get available keys
router.get('/status/available', (req, res) => {
  const sql = "SELECT * FROM keys WHERE status = 'available'";
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ data: rows });
  });
});

module.exports = router; 