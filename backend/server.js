// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('ENV CHECK - SUPABASE_URL exists:', !!supabaseUrl);
console.log('ENV CHECK - SUPABASE_ANON_KEY exists:', !!supabaseKey);
console.log('ENV CHECK - SUPABASE_URL prefix:', supabaseUrl ? supabaseUrl.substring(0, 10) + '...' : 'undefined');

const supabase = createClient(supabaseUrl, supabaseKey);

// Test Supabase connection immediately
(async () => {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      console.error('STARTUP ERROR: Supabase connection failed:', error.message);
    } else {
      console.log('Supabase connection successful, found users:', data.length);
    }
  } catch (err) {
    console.error('STARTUP ERROR: Unexpected error testing Supabase:', err.message);
  }
})();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5123;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Specific frontend URL
const FRONTEND_URL = 'https://sti-pat9vocms-franc-egos-projects.vercel.app';

// Serve static files from public directory
app.use(express.static('public'));

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

// Enable JSON parsing
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'STI-MIS Backend API is running. Use /api/* endpoints to access the API.' });
});

// Direct test login page route
app.get('/test-login', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Login Test</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      border: 1px solid #ccc;
      padding: 20px;
      border-radius: 5px;
    }
    .form-group {
      margin-bottom: 15px;
    }
    label {
      display: block;
      margin-bottom: 5px;
    }
    input {
      width: 100%;
      padding: 8px;
      box-sizing: border-box;
    }
    button {
      background-color: #4CAF50;
      color: white;
      padding: 10px 15px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    #result {
      margin-top: 20px;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background-color: #f9f9f9;
      min-height: 100px;
    }
    .success {
      color: green;
    }
    .error {
      color: red;
    }
  </style>
</head>
<body>
  <h1>Login Test</h1>
  
  <div class="container">
    <div class="form-group">
      <label for="backendUrl">Backend URL (Current):</label>
      <input type="text" id="backendUrl" value="${req.protocol}://${req.get('host')}">
    </div>
    
    <div class="form-group">
      <label for="userId">User ID:</label>
      <input type="text" id="userId" value="admin">
    </div>
    
    <div class="form-group">
      <label for="password">Password:</label>
      <input type="password" id="password" value="admin123">
    </div>
    
    <div class="form-group">
      <label for="endpoint">Endpoint:</label>
      <select id="endpoint">
        <option value="/api/login">Regular Login</option>
        <option value="/api/login-debug" selected>Debug Login</option>
      </select>
    </div>
    
    <button onclick="testLogin()">Test Login</button>
  </div>
  
  <h2>Result:</h2>
  <div id="result">Results will appear here...</div>
  
  <script>
    async function testLogin() {
      const resultElem = document.getElementById('result');
      resultElem.innerHTML = 'Sending request...';
      
      const backendUrl = document.getElementById('backendUrl').value;
      const userId = document.getElementById('userId').value;
      const password = document.getElementById('password').value;
      const endpoint = document.getElementById('endpoint').value;
      
      try {
        const response = await fetch(\`\${backendUrl}\${endpoint}\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ id: userId, password: password })
        });
        
        const data = await response.json();
        
        let resultHtml = \`<p>Status: \${response.status} \${response.statusText}</p>\`;
        
        if (response.ok) {
          resultHtml += \`<p class="success">Request successful</p>\`;
        } else {
          resultHtml += \`<p class="error">Request failed</p>\`;
        }
        
        resultHtml += \`<pre>\${JSON.stringify(data, null, 2)}</pre>\`;
        resultElem.innerHTML = resultHtml;
      } catch (error) {
        resultElem.innerHTML = \`
          <p class="error">Error: \${error.message}</p>
          <p>This could be a CORS error if the console shows Cross-Origin Request Blocked</p>
        \`;
      }
    }
  </script>
</body>
</html>
  `);
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  // Skip authentication for login routes
  if (req.path === '/api/login' || req.path === '/api/login-debug' || req.path === '/') {
    return next();
  }
  
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
app.post('/api/login', async (req, res) => {
  const { id, password } = req.body;
  
  if (!id || !password) {
    console.log('Login attempt missing credentials');
    return res.status(400).json({ error: 'ID and password are required' });
  }
  
  try {
    console.log(`Login attempt for user: ${id}`);
    
    // Check environment variables
    console.log(`Environment check: SUPABASE_URL exists: ${!!process.env.SUPABASE_URL}, SUPABASE_ANON_KEY exists: ${!!process.env.SUPABASE_ANON_KEY}`);
    
    // Query for user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Supabase error during login:', error);
      return res.status(500).json({ 
        error: 'Database error during login', 
        details: error.message,
        code: error.code 
      });
    }
    
    if (!user) {
      console.log(`Login failed: User ${id} not found`);
      return res.status(401).json({ error: 'Invalid credentials (user not found)' });
    }
    
    console.log(`User found, validating password for ${id}`);
    
    // Compare password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log(`Login failed: Password mismatch for ${id}`);
      return res.status(401).json({ error: 'Invalid credentials (password mismatch)' });
    }
    
    console.log(`Login successful for ${id}`);
    
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
  } catch (error) {
    console.error('Unexpected error during login:', error);
    res.status(500).json({ 
      error: 'Server error during login process', 
      details: error.message 
    });
  }
});

// Get current user info
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('id', req.user.id)
      .single();
    
    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Teacher routes
app.get('/api/teachers', authenticateToken, async (req, res) => {
  try {
    const { data: teachers, error } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('role', 'teacher');
    
    if (error) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/teachers', authenticateToken, authorizeAdmin, async (req, res) => {
  const { id, name, email, password } = req.body;
  
  if (!id || !name || !password) {
    return res.status(400).json({ error: 'ID, name, and password are required' });
  }
  
  try {
    const { data: existingTeacher, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id);
    
    if (error || existingTeacher.length > 0) {
      return res.status(400).json({ error: 'Teacher ID already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .insert([
        { id, name, email, password: hashedPassword, role: 'teacher' }
      ])
      .select('*');
    
    if (teacherError) {
      return res.status(500).json({ error: 'Error creating teacher' });
    }
    
    res.status(201).json({
      id: teacher[0].id,
      name: teacher[0].name,
      email: teacher[0].email
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/teachers/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const { name, email } = req.body;
  const { id } = req.params;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  try {
    const { data: updatedTeacher, error } = await supabase
      .from('users')
      .update({ name, email })
      .eq('id', id)
      .eq('role', 'teacher')
      .select('*');
    
    if (error || updatedTeacher.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    res.json({
      id: updatedTeacher[0].id,
      name: updatedTeacher[0].name,
      email: updatedTeacher[0].email
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/teachers/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log(`Attempting to delete teacher with ID: ${id}`);
    
    // Check if teacher exists
    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('id, name')
      .eq('id', id)
      .eq('role', 'teacher');
    
    if (teacherError) {
      console.error('Error checking teacher existence:', teacherError);
      return res.status(500).json({ error: 'Database error', details: teacherError.message });
    }
    
    if (!teacher || teacher.length === 0) {
      console.log(`Teacher with ID ${id} not found`);
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    // Check if teacher has active borrows
    const { data: activeBorrows, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('teacherId', id)
      .eq('returnDate', null);
    
    if (error) {
      console.error('Error checking active borrows:', error);
      return res.status(500).json({ error: 'Database error checking active borrows', details: error.message });
    }
    
    if (activeBorrows && activeBorrows.length > 0) {
      console.log(`Cannot delete teacher with ID ${id} - has ${activeBorrows.length} active borrows`);
      return res.status(400).json({ error: 'Cannot delete teacher with active borrows' });
    }
    
    // Delete the teacher
    console.log(`Deleting teacher with ID: ${id}`);
    const { data: deletedTeacher, error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .eq('role', 'teacher')
      .select();
    
    if (deleteError) {
      console.error('Error deleting teacher:', deleteError);
      return res.status(500).json({ error: 'Error deleting teacher', details: deleteError.message });
    }
    
    console.log(`Successfully deleted teacher: ${id}`);
    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error('Unexpected error during teacher deletion:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Key routes
app.get('/api/keys', authenticateToken, async (req, res) => {
  console.log('GET /api/keys accessed by user:', req.user.id);
  try {
    const { data: keys, error } = await supabase
      .from('keys')
      .select('keyid, lab, status');
    
    if (error) {
      console.error('Error fetching keys:', error);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }
    console.log(`Successfully fetched ${keys.length} keys`);
    res.json(keys);
  } catch (error) {
    console.error('Server error in /api/keys:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

app.post('/api/keys', authenticateToken, authorizeAdmin, async (req, res) => {
  const { keyId, lab } = req.body;
  console.log('POST /api/keys with data:', req.body);
  
  if (!keyId || !lab) {
    console.log('Validation error: Missing keyId or lab name');
    return res.status(400).json({ error: 'Key ID and lab name are required' });
  }
  
  try {
    // Check if key exists
    console.log('Checking if key exists with ID:', keyId);
    const { data: existingKey, error: checkError } = await supabase
      .from('keys')
      .select('*')
      .eq('keyid', keyId);
    
    if (checkError) {
      console.error('Error checking existing key:', checkError);
      return res.status(500).json({ error: 'Database error', details: checkError.message });
    }
    
    if (existingKey && existingKey.length > 0) {
      console.log('Key already exists:', existingKey[0]);
      return res.status(400).json({ error: 'Key ID already exists' });
    }
    
    // Insert new key
    console.log('Inserting new key with ID:', keyId, 'and lab:', lab);
    const { data: newKey, error: insertError } = await supabase
      .from('keys')
      .insert([
        { keyid: keyId, lab, status: 'Available' }
      ])
      .select('*');
    
    if (insertError) {
      console.error('Error inserting key:', insertError);
      return res.status(500).json({ error: 'Error adding key', details: insertError.message });
    }
    
    if (!newKey || newKey.length === 0) {
      console.error('No key was created in the database');
      return res.status(500).json({ error: 'Key was not created' });
    }
    
    console.log('Successfully created key:', newKey[0]);
    res.status(201).json({
      keyId: newKey[0].keyid,
      lab: newKey[0].lab,
      status: newKey[0].status
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/keys:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

app.delete('/api/keys/:keyId', authenticateToken, authorizeAdmin, async (req, res) => {
  const { keyId } = req.params;
  
  try {
    console.log(`Deleting key with ID: ${keyId}`);
    
    // First check if the key exists
    const { data: key, error } = await supabase
      .from('keys')
      .select('*')
      .eq('keyid', keyId);
    
    if (error) {
      console.error('Error finding key to delete:', error);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }
    
    if (key.length === 0) {
      console.log(`Key with ID ${keyId} not found`);
      return res.status(404).json({ error: 'Key not found' });
    }
    
    if (key[0].status === 'Borrowed') {
      console.log(`Cannot delete borrowed key: ${keyId}`);
      return res.status(400).json({ error: 'Cannot delete a borrowed key' });
    }
    
    console.log(`Proceeding to delete key: ${keyId}`);
    
    // Delete the key
    const { data: deletedKey, error: deleteError } = await supabase
      .from('keys')
      .delete()
      .eq('keyid', keyId)
      .select();
    
    if (deleteError) {
      console.error('Error deleting key:', deleteError);
      return res.status(500).json({ error: 'Error deleting key', details: deleteError.message });
    }
    
    if (deletedKey.length === 0) {
      console.log('No key was deleted');
      return res.status(404).json({ error: 'Key not found or could not be deleted' });
    }
    
    console.log(`Successfully deleted key: ${keyId}`);
    res.json({ message: 'Key deleted successfully' });
  } catch (error) {
    console.error('Unexpected error in delete key route:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Borrow/Return routes
app.post('/api/borrow', authenticateToken, async (req, res) => {
  const { keyId } = req.body;
  const teacherId = req.user.id;
  
  console.log(`Borrow request: teacherId=${teacherId}, keyId=${keyId}`);
  
  if (!keyId) {
    console.log('Borrow failed: Key ID is missing');
    return res.status(400).json({ error: 'Key ID is required' });
  }
  
  try {
    // 1. Check if key exists and is available
    console.log(`Checking key with ID: ${keyId}`);
    const { data: key, error: keyError } = await supabase
      .from('keys')
      .select('*')
      .eq('keyid', keyId);
    
    if (keyError) {
      console.error('Error fetching key:', keyError);
      return res.status(500).json({ error: 'Database error', details: keyError.message });
    }
    
    if (!key || key.length === 0) {
      console.log(`Key with ID ${keyId} not found`);
      return res.status(404).json({ error: 'Key not found' });
    }
    
    if (key[0].status !== 'Available') {
      console.log(`Key ${keyId} is not available, status: ${key[0].status}`);
      return res.status(400).json({ error: 'Key is not available' });
    }
    
    // 2. Check if teacher already has active borrows for this key
    console.log(`Checking if teacher ${teacherId} already has key ${keyId} borrowed`);
    const { data: existingBorrows, error: existingError } = await supabase
      .from('transactions')
      .select('*')
      .eq('teacherId', teacherId)
      .eq('keyid', keyId)
      .is('returnDate', null);
    
    if (existingError) {
      console.error('Error checking existing borrows:', existingError);
      return res.status(500).json({ error: 'Error checking existing borrows' });
    }
    
    if (existingBorrows && existingBorrows.length > 0) {
      console.log(`Teacher ${teacherId} already has key ${keyId} borrowed`);
      return res.status(400).json({ error: 'You already have this key borrowed' });
    }
    
    // 3. Create the transaction
    console.log(`Creating borrow transaction for teacher=${teacherId}, key=${keyId}`);
    const transactionData = { 
      teacherId, 
      keyid: keyId, 
      borrowDate: new Date().toISOString() 
    };
    console.log('Transaction data:', transactionData);
    
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert([transactionData])
      .select('*');
    
    if (transactionError) {
      console.error('Error creating transaction record:', transactionError);
      return res.status(500).json({ 
        error: 'Error creating transaction record', 
        details: transactionError.message 
      });
    }
    
    if (!transaction || transaction.length === 0) {
      console.error('Transaction was not created');
      return res.status(500).json({ error: 'Transaction was not created' });
    }
    
    console.log('Transaction created successfully:', transaction[0]);
    
    // 4. Update key status
    console.log(`Updating key ${keyId} status to Borrowed`);
    const { data: updatedKey, error: updateError } = await supabase
      .from('keys')
      .update({ status: 'Borrowed' })
      .eq('keyid', keyId)
      .select();
    
    if (updateError) {
      console.error('Error updating key status:', updateError);
      // Rollback transaction since key status update failed
      await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction[0].id);
      
      return res.status(500).json({ 
        error: 'Error updating key status', 
        details: updateError.message 
      });
    }
    
    console.log('Key status updated successfully');
    
    // 5. Return success response
    res.status(201).json({
      id: transaction[0].id,
      teacherId,
      keyId: transaction[0].keyid,
      borrowDate: transaction[0].borrowDate,
      returnDate: null
    });
  } catch (error) {
    console.error('Unexpected error in borrow key:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

app.post('/api/return', authenticateToken, async (req, res) => {
  const { keyId } = req.body;
  const teacherId = req.user.id;
  
  console.log(`Return request: teacherId=${teacherId}, keyId=${keyId}`);
  
  if (!keyId) {
    console.log('Return failed: Key ID is missing');
    return res.status(400).json({ error: 'Key ID is required' });
  }
  
  try {
    // 1. Check if the transaction exists
    console.log(`Checking active borrow for teacher=${teacherId}, key=${keyId}`);
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('keyid', keyId)
      .eq('teacherId', teacherId)
      .is('returnDate', null);
    
    if (transactionError) {
      console.error('Error checking transaction:', transactionError);
      return res.status(500).json({ 
        error: 'Database error', 
        details: transactionError.message 
      });
    }
    
    if (!transaction || transaction.length === 0) {
      console.log(`No active borrow found for teacher=${teacherId}, key=${keyId}`);
      return res.status(400).json({ error: 'You do not have this key borrowed' });
    }
    
    console.log('Found active transaction:', transaction[0]);
    
    // 2. Update the transaction with return date
    console.log(`Updating transaction ${transaction[0].id} with return date`);
    const returnDate = new Date().toISOString();
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('transactions')
      .update({ returnDate })
      .eq('id', transaction[0].id)
      .select();
    
    if (updateError) {
      console.error('Error updating transaction record:', updateError);
      return res.status(500).json({ 
        error: 'Error updating transaction record', 
        details: updateError.message 
      });
    }
    
    if (!updatedTransaction || updatedTransaction.length === 0) {
      console.error('Transaction update failed');
      return res.status(500).json({ error: 'Transaction update failed' });
    }
    
    console.log('Transaction updated successfully with return date');
    
    // 3. Update key status to Available
    console.log(`Updating key ${keyId} status to Available`);
    const { data: updatedKey, error: keyUpdateError } = await supabase
      .from('keys')
      .update({ status: 'Available' })
      .eq('keyid', keyId)
      .select();
    
    if (keyUpdateError) {
      console.error('Error updating key status:', keyUpdateError);
      // Don't roll back transaction, as the key was returned, just log the error
      return res.status(500).json({ 
        error: 'Error updating key status', 
        details: keyUpdateError.message 
      });
    }
    
    console.log('Key status updated successfully to Available');
    
    // 4. Return success response
    res.json({
      id: updatedTransaction[0].id,
      teacherId,
      keyId: updatedTransaction[0].keyid,
      returnDate: updatedTransaction[0].returnDate
    });
  } catch (error) {
    console.error('Unexpected error in return key:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get transactions
app.get('/api/transactions', authenticateToken, async (req, res) => {
  const teacherId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  console.log('GET /api/transactions accessed by user:', teacherId, 'isAdmin:', isAdmin);
  
  try {
    console.log('Fetching transactions from Supabase...');
    
    // Use simpler queries first to ensure better compatibility
    const { data: transactions, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .order('borrowDate', { ascending: false });
      
    if (transactionError) {
      console.error('Error fetching transactions:', transactionError);
      return res.status(500).json({ 
        error: 'Database error', 
        details: transactionError.message 
      });
    }

    if (!transactions) {
      console.log('No transactions found');
      return res.json([]);
    }
    
    console.log(`Retrieved ${transactions.length} transactions`);
    
    // Get additional information for each transaction
    const formattedTransactions = [];
    
    for (const transaction of transactions) {
      // Skip other teachers' transactions if not admin
      if (!isAdmin && transaction.teacherId !== teacherId) {
        continue;
      }
      
      try {
        // Get lab information
        let lab = "Unknown";
        if (transaction.keyid) {
          const { data: keyData } = await supabase
            .from('keys')
            .select('lab')
            .eq('keyid', transaction.keyid)
            .single();
            
          if (keyData && keyData.lab) {
            lab = keyData.lab;
          }
        }
        
        // Get teacher name if admin
        let teacherName = null;
        if (isAdmin && transaction.teacherId) {
          const { data: userData } = await supabase
            .from('users')
            .select('name')
            .eq('id', transaction.teacherId)
            .single();
            
          if (userData && userData.name) {
            teacherName = userData.name;
          }
        }
        
        const formattedTransaction = {
          id: transaction.id,
          teacherId: transaction.teacherId,
          keyId: transaction.keyid,
          borrowDate: transaction.borrowDate,
          returnDate: transaction.returnDate,
          lab
        };
        
        if (teacherName) {
          formattedTransaction.teacherName = teacherName;
        }
        
        formattedTransactions.push(formattedTransaction);
      } catch (err) {
        console.error('Error processing transaction:', err);
        // Continue with the next transaction instead of failing the entire request
      }
    }
    
    // Filter for current user if not admin
    const userTransactions = isAdmin 
      ? formattedTransactions 
      : formattedTransactions.filter(t => t.teacherId === teacherId);
    
    console.log(`Returning ${userTransactions.length} formatted transactions`);
    res.json(userTransactions);
  } catch (error) {
    console.error('Server error in /api/transactions:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get active borrows
app.get('/api/transactions/active', authenticateToken, async (req, res) => {
  const teacherId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  console.log('GET /api/transactions/active accessed by user:', teacherId, 'isAdmin:', isAdmin);
  
  try {
    console.log('Fetching active borrows from Supabase...');
    const overdueCutoff = new Date();
    overdueCutoff.setHours(overdueCutoff.getHours() - 24);
    
    // Use simpler queries first to ensure better compatibility
    let query = supabase
      .from('transactions')
      .select('*')
      .is('returnDate', null);
      
    if (!isAdmin) {
      query = query.eq('teacherId', teacherId);
    }
    
    query = query.order('borrowDate', { ascending: true });
    
    const { data: activeBorrows, error: borrowsError } = await query;
    
    if (borrowsError) {
      console.error('Error fetching active borrows:', borrowsError);
      return res.status(500).json({ 
        error: 'Database error', 
        details: borrowsError.message 
      });
    }
    
    if (!activeBorrows || activeBorrows.length === 0) {
      console.log('No active borrows found');
      return res.json([]);
    }
    
    console.log(`Retrieved ${activeBorrows.length} active borrows`);
    
    // Get additional information for each borrow
    const formattedBorrows = [];
    
    for (const borrow of activeBorrows) {
      try {
        // Get lab information
        let lab = "Unknown";
        if (borrow.keyid) {
          const { data: keyData } = await supabase
            .from('keys')
            .select('lab')
            .eq('keyid', borrow.keyid)
            .single();
            
          if (keyData && keyData.lab) {
            lab = keyData.lab;
          }
        }
        
        // Get teacher name if admin
        let teacherName = null;
        if (isAdmin && borrow.teacherId) {
          const { data: userData } = await supabase
            .from('users')
            .select('name')
            .eq('id', borrow.teacherId)
            .single();
            
          if (userData && userData.name) {
            teacherName = userData.name;
          }
        }
        
        // Calculate if overdue
        const borrowDate = new Date(borrow.borrowDate);
        const isOverdue = borrowDate < overdueCutoff;
        
        const formattedBorrow = {
          id: borrow.id,
          teacherId: borrow.teacherId,
          keyId: borrow.keyid,
          borrowDate: borrow.borrowDate,
          lab,
          isOverdue
        };
        
        if (teacherName) {
          formattedBorrow.teacherName = teacherName;
        }
        
        formattedBorrows.push(formattedBorrow);
      } catch (err) {
        console.error('Error processing active borrow:', err);
        // Continue with the next borrow instead of failing the entire request
      }
    }
    
    console.log(`Returning ${formattedBorrows.length} formatted active borrows`);
    res.json(formattedBorrows);
  } catch (error) {
    console.error('Server error in /api/transactions/active:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Dashboard data (admin only)
app.get('/api/dashboard', authenticateToken, authorizeAdmin, async (req, res) => {
  console.log('GET /api/dashboard accessed by admin:', req.user.id);
  try {
    const stats = {
      totalKeys: 0,
      availableKeys: 0, 
      borrowedKeys: 0,
      totalTeachers: 0,
      overdueKeys: 0
    };
    
    // Get keys stats
    const { data: keys, error: keysError } = await supabase
      .from('keys')
      .select('status');
      
    if (keysError) {
      console.error('Error fetching keys for dashboard:', keysError);
    } else if (keys) {
      stats.totalKeys = keys.length;
      stats.availableKeys = keys.filter(k => k.status === 'Available').length;
      stats.borrowedKeys = keys.filter(k => k.status === 'Borrowed').length;
    }
    
    // Get teacher count
    const { data: teachers, error: teachersError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'teacher');
      
    if (teachersError) {
      console.error('Error fetching teachers for dashboard:', teachersError);
    } else if (teachers) {
      stats.totalTeachers = teachers.length;
    }
    
    // Get overdue transactions (borrowed more than 24 hours ago)
    const overdueCutoff = new Date();
    overdueCutoff.setHours(overdueCutoff.getHours() - 24);
    
    const { data: overdueTransactions, error: overdueError } = await supabase
      .from('transactions')
      .select('*, users!inner(name)')
      .eq('returnDate', null)
      .lt('borrowDate', overdueCutoff.toISOString());
    
    if (overdueError) {
      console.error('Error fetching overdue transactions:', overdueError);
    } else if (overdueTransactions) {
      stats.overdueKeys = overdueTransactions.length;
    }
    
    res.json({
      stats,
      overdueTransactions: overdueTransactions || []
    });
  } catch (error) {
    console.error('Server error in /api/dashboard:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Test endpoint to check admin user
app.get('/api/check-admin', async (req, res) => {
  try {
    const { data: admin, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', 'admin');
    
    if (error || !admin.length) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    res.json({ 
      message: 'Admin user exists', 
      user: {
        id: admin[0].id,
        name: admin[0].name,
        email: admin[0].email,
        role: admin[0].role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Add a simple test route
app.get('/api/test', (req, res) => {
  console.log('Test endpoint accessed');
  res.json({ message: 'Backend server is running!' });
});

// Debug route for Supabase connection
app.get('/api/debug', (req, res) => {
  try {
    const envInfo = {
      supabaseUrlExists: !!process.env.SUPABASE_URL,
      supabaseUrlPrefix: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 10) + '...' : null,
      supabaseKeyExists: !!process.env.SUPABASE_ANON_KEY,
      supabaseKeyPrefix: process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.substring(0, 10) + '...' : null,
      jwtSecretExists: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV
    };
    
    res.json({ 
      message: 'Environment variables check', 
      environment: envInfo 
    });
  } catch (error) {
    res.status(500).json({ error: 'Error checking environment: ' + error.message });
  }
});

// Supabase connection test route
app.get('/api/test-supabase', async (req, res) => {
  try {
    // Try to read from the users table
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      return res.status(500).json({ 
        message: 'Supabase connection error', 
        error: error.message
      });
    }
    
    res.json({ 
      message: 'Supabase connection successful', 
      userCount: data.length
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Server error when testing Supabase', 
      error: error.message 
    });
  }
});

// Route to create admin user if it doesn't exist
app.get('/api/init-admin', async (req, res) => {
  try {
    // Check if admin exists
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', 'admin');
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    // If admin exists
    if (data && data.length > 0) {
      return res.json({ 
        message: 'Admin user exists',
        admin: {
          id: data[0].id,
          name: data[0].name
        }
      });
    }
    
    // No admin found, create one
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const { data: newAdmin, error: createError } = await supabase
      .from('users')
      .insert([
        { 
          id: 'admin', 
          name: 'System Admin', 
          email: 'admin@school.org', 
          password: hashedPassword, 
          role: 'admin' 
        }
      ]);
    
    if (createError) {
      return res.status(500).json({ error: createError.message });
    }
    
    return res.json({ message: 'Admin user created successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Special debug login route
app.post('/api/login-debug', async (req, res) => {
  // Set CORS headers directly
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  const { id, password } = req.body;
  
  try {
    // Return detailed info about the request
    const responseData = {
      message: 'Login debug info',
      requestReceived: true,
      requestBody: req.body,
      headers: req.headers,
      authStatus: 'checking credentials...'
    };
    
    // Check if user exists
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      responseData.authStatus = 'database error';
      responseData.error = error.message;
      return res.status(200).json(responseData);
    }
    
    if (!user) {
      responseData.authStatus = 'user not found';
      return res.status(200).json(responseData);
    }
    
    responseData.authStatus = 'user found, checking password';
    
    // Compare password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      responseData.authStatus = 'password mismatch';
      return res.status(200).json(responseData);
    }
    
    responseData.authStatus = 'login successful';
    responseData.userData = {
      id: user.id,
      name: user.name,
      role: user.role
    };
    
    return res.status(200).json(responseData);
  } catch (error) {
    return res.status(200).json({
      message: 'Login debug info',
      requestReceived: true,
      error: error.message,
      stack: error.stack
    });
  }
});

// Reset admin password route
app.get('/api/reset-admin-password', async (req, res) => {
  try {
    // Hash a new password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Update the admin user
    const { data, error } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', 'admin');
    
    if (error) {
      return res.status(500).json({ 
        message: 'Failed to reset admin password', 
        error: error.message 
      });
    }
    
    return res.json({ 
      message: 'Admin password reset successfully to "admin123"' 
    });
  } catch (error) {
    return res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Add a detailed debug endpoint
app.get('/api/debug-tables', async (req, res) => {
  try {
    const results = {};
    
    // Check users table
    console.log('Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact' });
    
    results.users = {
      exists: !usersError,
      count: users ? users.length : 0,
      error: usersError ? usersError.message : null,
      sample: users && users.length > 0 ? { 
        id: users[0].id,
        name: users[0].name,
        role: users[0].role
      } : null
    };
    
    // Check keys table
    console.log('Checking keys table...');
    const { data: keys, error: keysError } = await supabase
      .from('keys')
      .select('*', { count: 'exact' });
    
    results.keys = {
      exists: !keysError,
      count: keys ? keys.length : 0,
      error: keysError ? keysError.message : null,
      sample: keys && keys.length > 0 ? { 
        keyid: keys[0].keyid,
        lab: keys[0].lab,
        status: keys[0].status
      } : null
    };
    
    // Check transactions table
    console.log('Checking transactions table...');
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' });
    
    results.transactions = {
      exists: !transactionsError,
      count: transactions ? transactions.length : 0,
      error: transactionsError ? transactionsError.message : null,
      sample: transactions && transactions.length > 0 ? { 
        id: transactions[0].id,
        teacherId: transactions[0].teacherId,
        keyid: transactions[0].keyid
      } : null
    };
    
    // Check environment variables
    results.environment = {
      supabaseUrlExists: !!process.env.SUPABASE_URL,
      supabaseKeyExists: !!process.env.SUPABASE_ANON_KEY,
      jwtSecretExists: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV
    };
    
    res.json({
      message: 'Database debug information',
      timestamp: new Date().toISOString(),
      results
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ 
      error: 'Server error during debug', 
      message: error.message,
      stack: error.stack
    });
  }
});

// Only start the server if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export the app for Vercel
module.exports = app; 