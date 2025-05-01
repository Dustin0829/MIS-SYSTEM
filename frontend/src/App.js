import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { useState, useEffect } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import TeacherLayout from './layouts/TeacherLayout';
import PublicTeacherLayout from './layouts/PublicTeacherLayout';

// Components
import Login from './components/Login';

// Admin Components
import Dashboard from './components/admin/Dashboard';
import KeyManagement from './components/admin/KeyManagement';
import TeacherManagement from './components/admin/TeacherManagement';
import AllTransactions from './components/admin/AllTransactions';

// Teacher Components
import TeacherHome from './components/teacher/TeacherHome';
import BorrowKey from './components/teacher/BorrowKey';
import MyBorrows from './components/teacher/MyBorrows';
import TransactionHistory from './components/teacher/History';

// Public Components
import TeacherPortal from './components/public/TeacherPortal';
import PublicTransactions from './components/public/PublicTransactions';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in - focus on user data instead of token validity
    const userData = localStorage.getItem('user');
    
    if (userData) {
      try {
        setUser(JSON.parse(userData));
        // Ensure token exists even if it's invalid - this will help maintain session
        if (!localStorage.getItem('token')) {
          // Create a placeholder token so requests don't fail entirely
          localStorage.setItem('token', 'local-session');
        }
      } catch (err) {
        console.error('Error parsing user data:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    
    setLoading(false);
  }, []);

  // Check if user is logged in and their role
  const isLoggedIn = !!user;
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';

  // Route protection components
  const ProtectedRoute = ({ children, requiredRole }) => {
    if (!isLoggedIn) {
      return <Navigate to="/login" />;
    }
    
    if (requiredRole && user.role !== requiredRole) {
      return <Navigate to={user.role === 'admin' ? '/admin' : '/teacher'} />;
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
        <Route 
          path="/login" 
          element={isLoggedIn 
            ? <Navigate to={isAdmin ? '/admin' : '/teacher'} /> 
            : <Login setUser={setUser} />
          } 
        />
        
        {/* Public Teacher Portal (no login required) */}
        <Route path="/teacher-portal" element={<PublicTeacherLayout />}>
          <Route index element={<TeacherPortal />} />
          <Route path="transactions" element={<PublicTransactions />} />
        </Route>
        
        <Route path="/" element={<Navigate to={isLoggedIn ? (isAdmin ? '/admin' : '/teacher') : '/teacher-portal'} />} />
        
        {/* Admin Routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="keys" element={<KeyManagement />} />
          <Route path="teachers" element={<TeacherManagement />} />
          <Route path="transactions" element={<AllTransactions />} />
        </Route>
        
        {/* Teacher Routes (protected) */}
        <Route 
          path="/teacher" 
          element={
            <ProtectedRoute requiredRole="teacher">
              <TeacherLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        >
          <Route index element={<TeacherHome />} />
          <Route path="borrow" element={<BorrowKey />} />
          <Route path="my-borrows" element={<MyBorrows />} />
          <Route path="history" element={<TransactionHistory />} />
        </Route>
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;
