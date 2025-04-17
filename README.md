# system
 mis-system
# MIS-SYSTEM

# Key Management System

A web-based system for managing keys and tracking their borrowing status in an educational institution.

## Project Structure
- `frontend/`: React-based web interface
- `backend/`: Node.js/Express API server with SQLite database

## Deployment Guide (Vercel)

### Prerequisites
1. Create a [Vercel account](https://vercel.com/signup)
2. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```
3. Login to Vercel:
   ```bash
   vercel login
   ```

### Deployment Steps
1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your GitHub repository
5. Configure project:
   - Framework Preset: Other
   - Root Directory: ./
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: frontend/build
6. Add Environment Variables:
   - `JWT_SECRET`: [your-secure-secret]
   - `DATABASE_PATH`: ./database.sqlite

7. Deploy with Vercel CLI:
   ```bash
   vercel
   ```

### Environment Variables
Make sure to set these in your Vercel project settings:
- `JWT_SECRET`: A secure random string for JWT token generation
- `DATABASE_PATH`: Path to SQLite database
- `PORT`: 5123 (optional, Vercel handles this automatically)

### Database Considerations
- SQLite database will be recreated on each deployment
- For production, consider using Vercel's integration with database services like:
  - Vercel Postgres
  - MongoDB Atlas
  - Supabase

## Local Development
1. Clone the repository
2. Install dependencies:
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd frontend
   npm install
   ```
3. Start the servers:
   ```bash
   # Backend
   cd backend
   npm run dev

   # Frontend
   cd frontend
   npm start
   ```
