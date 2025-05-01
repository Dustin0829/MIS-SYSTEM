const express = require('express');
const router = express.Router();
const db = require('../server');

// Get all transactions
router.get('/', (req, res) => {
  const sql = `
    SELECT t.*, k.roomNumber, teacherName 
    FROM transactions t
    JOIN keys k ON t.keyId = k.id
    JOIN teachers ON t.teacherId = teachers.id
  `;
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ data: rows });
  });
});

// Get a single transaction
router.get('/:id', (req, res) => {
  const sql = `
    SELECT t.*, k.roomNumber, teacherName 
    FROM transactions t
    JOIN keys k ON t.keyId = k.id
    JOIN teachers ON t.teacherId = teachers.id
    WHERE t.id = ?
  `;
  db.get(sql, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ data: row });
  });
});

// Create a new transaction (check out a key)
router.post('/', (req, res) => {
  const { keyId, teacherId, purpose } = req.body;
  
  if (!keyId || !teacherId) {
    return res.status(400).json({ error: 'Key ID and Teacher ID are required' });
  }
  
  // Start a transaction to ensure data consistency
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Check if key exists and is available
    db.get('SELECT * FROM keys WHERE id = ? AND status = "available"', [keyId], (err, key) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: err.message });
      }
      
      if (!key) {
        db.run('ROLLBACK');
        return res.status(400).json({ error: 'Key not found or not available' });
      }
      
      // Check if teacher exists
      db.get('SELECT * FROM teachers WHERE id = ?', [teacherId], (err, teacher) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }
        
        if (!teacher) {
          db.run('ROLLBACK');
          return res.status(400).json({ error: 'Teacher not found' });
        }
        
        // Create transaction
        const checkoutDate = new Date().toISOString();
        const insertSql = 'INSERT INTO transactions (keyId, teacherId, checkoutDate, purpose) VALUES (?, ?, ?, ?)';
        
        db.run(insertSql, [keyId, teacherId, checkoutDate, purpose], function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }
          
          const transactionId = this.lastID;
          
          // Update key status to checked-out
          db.run('UPDATE keys SET status = "checked-out" WHERE id = ?', [keyId], function(err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }
            
            db.run('COMMIT');
            res.status(201).json({
              message: 'Key checked out successfully',
              data: {
                id: transactionId,
                keyId,
                teacherId,
                checkoutDate,
                purpose
              }
            });
          });
        });
      });
    });
  });
});

// Update a transaction (check in a key)
router.put('/:id/return', (req, res) => {
  const { remarks } = req.body;
  
  // Start a transaction to ensure data consistency
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Check if transaction exists and is not already returned
    db.get('SELECT * FROM transactions WHERE id = ? AND returnDate IS NULL', [req.params.id], (err, transaction) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: err.message });
      }
      
      if (!transaction) {
        db.run('ROLLBACK');
        return res.status(400).json({ error: 'Transaction not found or key already returned' });
      }
      
      const returnDate = new Date().toISOString();
      
      // Update transaction with return date
      db.run('UPDATE transactions SET returnDate = ?, remarks = ? WHERE id = ?', 
        [returnDate, remarks, req.params.id], 
        function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }
          
          // Update key status to available
          db.run('UPDATE keys SET status = "available" WHERE id = ?', [transaction.keyId], function(err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }
            
            db.run('COMMIT');
            res.json({
              message: 'Key returned successfully',
              data: {
                id: req.params.id,
                keyId: transaction.keyId,
                teacherId: transaction.teacherId,
                checkoutDate: transaction.checkoutDate,
                returnDate,
                remarks
              }
            });
          });
        }
      );
    });
  });
});

// Get active transactions (keys not returned)
router.get('/status/active', (req, res) => {
  const sql = `
    SELECT t.*, k.roomNumber, teacherName
    FROM transactions t
    JOIN keys k ON t.keyId = k.id
    JOIN teachers ON t.teacherId = teachers.id
    WHERE t.returnDate IS NULL
  `;
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ data: rows });
  });
});

// Get transactions by teacher
router.get('/teacher/:teacherId', (req, res) => {
  const sql = `
    SELECT t.*, k.roomNumber
    FROM transactions t
    JOIN keys k ON t.keyId = k.id
    WHERE t.teacherId = ?
    ORDER BY t.checkoutDate DESC
  `;
  db.all(sql, [req.params.teacherId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ data: rows });
  });
});

// Delete a transaction (administrative function, use with caution)
router.delete('/:id', (req, res) => {
  // Check if transaction exists
  db.get('SELECT * FROM transactions WHERE id = ?', [req.params.id], (err, transaction) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // If transaction is active (key not returned), update key status to available
    if (!transaction.returnDate) {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Delete the transaction
        db.run('DELETE FROM transactions WHERE id = ?', [req.params.id], function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }
          
          // Update key status to available
          db.run('UPDATE keys SET status = "available" WHERE id = ?', [transaction.keyId], function(err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }
            
            db.run('COMMIT');
            res.json({ message: 'Transaction deleted successfully' });
          });
        });
      });
    } else {
      // If key already returned, just delete the transaction
      db.run('DELETE FROM transactions WHERE id = ?', [req.params.id], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        res.json({ message: 'Transaction deleted successfully' });
      });
    }
  });
});

module.exports = router; 