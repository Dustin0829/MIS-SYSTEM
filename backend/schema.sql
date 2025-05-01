-- Drop existing tables if they exist
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS keys;
DROP TABLE IF EXISTS teachers;

-- Create teachers table with photo field
CREATE TABLE teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT,
  photo_url TEXT DEFAULT 'https://via.placeholder.com/150',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create keys table
CREATE TABLE keys (
  keyId TEXT PRIMARY KEY,
  lab TEXT NOT NULL,
  status TEXT DEFAULT 'Available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create transactions table
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyId TEXT NOT NULL,
  teacherId TEXT NOT NULL,
  borrowDate TEXT NOT NULL,
  returnDate TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (keyId) REFERENCES keys (keyId),
  FOREIGN KEY (teacherId) REFERENCES teachers (id)
);

-- Insert sample teacher data
INSERT INTO teachers (id, name, department, photo_url) VALUES
  ('T001', 'John Smith', 'Mathematics', 'https://via.placeholder.com/150?text=T001'),
  ('T002', 'Sarah Johnson', 'Science', 'https://via.placeholder.com/150?text=T002'),
  ('T003', 'Michael Brown', 'English', 'https://via.placeholder.com/150?text=T003'),
  ('T004', 'Emily Davis', 'History', 'https://via.placeholder.com/150?text=T004'),
  ('T005', 'Robert Wilson', 'Physical Education', 'https://via.placeholder.com/150?text=T005');

-- Insert sample key data
INSERT INTO keys (keyId, lab, status) VALUES
  ('K001', 'Computer Lab A', 'Available'),
  ('K002', 'Science Lab 1', 'Available'),
  ('K003', 'Conference Room', 'Available'),
  ('K004', 'Library', 'Available'),
  ('K005', 'Art Studio', 'Available'); 