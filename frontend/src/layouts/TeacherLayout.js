import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';

const TeacherLayout = ({ user, onLogout }) => {
  return (
    <div className="container-fluid">
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary mb-4">
        <div className="container">
          <div className="d-flex align-items-center">
            <div className="sti-logo me-2"></div>
            <span className="navbar-brand">Lab Key Management</span>
          </div>
          <button   
            className="navbar-toggler" 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <NavLink className="nav-link" to="/teacher" end>
                  Home
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/teacher/borrow">
                  Borrow Key
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/teacher/my-borrows">
                  My Borrows
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/teacher/history">
                  History
                </NavLink>
              </li>
            </ul>
            <div className="d-flex align-items-center">
              <span className="text-white me-3">
                Welcome, {user?.name}
              </span>
              <button 
                className="btn btn-outline-light" 
                onClick={onLogout}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="container py-4">
        <Outlet />
      </main>
      <footer className="container-fluid text-center py-3 footer mt-5">
        <small>&copy; Franc {new Date().getFullYear()} STI Lab Key Management System</small>
      </footer>
    </div>
  );
};

export default TeacherLayout; 