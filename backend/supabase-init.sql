-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL
);

-- Create keys table
CREATE TABLE IF NOT EXISTS keys (
  keyId VARCHAR(50) PRIMARY KEY,
  lab VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Available'
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  teacherId VARCHAR(255) REFERENCES users(id),
  keyId VARCHAR(50) REFERENCES keys(keyId),
  borrowDate TIMESTAMP NOT NULL,
  returnDate TIMESTAMP
);

-- Create admin user if it doesn't exist
INSERT INTO users (id, name, email, password, role)
VALUES (
  'admin', 
  'System Admin', 
  'admin@school.org',
  -- Password: admin123
  '$2b$10$zPiXYc4OhVEQx7SH7Hcfse/hybyG4HKU9U1Q.Vf9Z5H5NvzXnHgie',
  'admin'
) ON CONFLICT (id) DO NOTHING;

-- Create sample data
INSERT INTO keys (keyId, lab, status)
VALUES 
  ('KEY001', 'Computer Lab 1', 'Available'),
  ('KEY002', 'Computer Lab 2', 'Available'),
  ('KEY003', 'Science Lab', 'Available')
ON CONFLICT (keyId) DO NOTHING; 