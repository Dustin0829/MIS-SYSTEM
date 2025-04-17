module.exports = {
    port: process.env.PORT || 5123,
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    databasePath: process.env.DATABASE_PATH || './database.sqlite',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}; 