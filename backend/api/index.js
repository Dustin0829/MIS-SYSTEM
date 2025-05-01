const app = require('../server');
const teachersRouter = require('./teachers');
const keysRouter = require('./keys');
const transactionsRouter = require('./transactions');

// Register API routes
app.use('/api/teachers', teachersRouter);
app.use('/api/keys', keysRouter);
app.use('/api/transactions', transactionsRouter);

// Export the Express app for Vercel
module.exports = app; 