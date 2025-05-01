import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import stiBackground from '../images/sti-background.png';

const PublicTeacherLayout = () => {
  return (
    <div className="container-fluid" style={{
      backgroundImage: `url(${stiBackground})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 0',
      position: 'relative'
    }}>
      {/* Admin Login Button */}
      <Link 
        to="/login" 
        className="btn btn-dark position-absolute shadow-lg"
        style={{ 
          top: '60px', 
          right: '20px', 
          zIndex: 1000,
          padding: '8px 16px',
          fontSize: '14px'
        }}
        title="Admin Login"
      >
        <i className="bi bi-shield-lock me-1"></i> Admin
      </Link>
      
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
};

export default PublicTeacherLayout; 