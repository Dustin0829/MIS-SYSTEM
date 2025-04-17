import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { useState, useEffect } from 'react';
import './App.css';

// Auth Components
import Login from './components/Login';

// Layout Components
import TeacherLayout from './layouts/TeacherLayout';
import AdminLayout from './layouts/AdminLayout';

// Teacher Components
import TeacherHome from './components/teacher/TeacherHome';
import BorrowKey from './components/teacher/BorrowKey';
import MyBorrows from './components/teacher/MyBorrows';
import History from './components/teacher/History';

// Admin Components
import Dashboard from './components/admin/Dashboard';
import KeyManagement from './components/admin/KeyManagement';
import TeacherManagement from './components/admin/TeacherManagement';
import AllTransactions from './components/admin/AllTransactions';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    
    setLoading(false);
  }, []);

  // Check if user is logged in
  const isLoggedIn = !!user;
  const isAdmin = user?.role === 'admin';

  // Protected route component
  const ProtectedRoute = ({ children, requireAdmin }) => {
    if (!isLoggedIn) {
      return <Navigate to="/login" />;
    }

    if (requireAdmin && !isAdmin) {
      return <Navigate to="/teacher" />;
    }

    return children;
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return <div className="d-flex justify-content-center align-items-center vh-100">Loading...</div>;
  }

  return (
    <div className="App">
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={!isLoggedIn ? <Login setUser={setUser} /> : (isAdmin ? <Navigate to="/admin" /> : <Navigate to="/teacher" />)} />
        
        {/* Teacher Routes */}
        <Route 
          path="/teacher" 
          element={
            <ProtectedRoute>
              <TeacherLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        >
          <Route index element={<TeacherHome />} />
          <Route path="borrow" element={<BorrowKey />} />
          <Route path="my-borrows" element={<MyBorrows />} />
          <Route path="history" element={<History />} />
        </Route>

        {/* Admin Routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="keys" element={<KeyManagement />} />
          <Route path="teachers" element={<TeacherManagement />} />
          <Route path="transactions" element={<AllTransactions />} />
        </Route>

        {/* Default Routes */}
        <Route path="/" element={<Navigate to={isLoggedIn ? (isAdmin ? "/admin" : "/teacher") : "/login"} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;
