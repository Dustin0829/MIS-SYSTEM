import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { login } from '../services/api';

const Login = ({ setUser }) => {
  const [formData, setFormData] = useState({
    id: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDebugInfo(null);
    
    if (!formData.id || !formData.password) {
      setError('Please enter both ID and password');
      return;
    }

    try {
      setLoading(true);
      console.log('Attempting login with:', { id: formData.id, password: '***' });
      
      const data = await login(formData.id, formData.password);
      console.log('Login successful, response:', data);
      
      // Save token and user data to localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Update user state in parent component
      setUser(data.user);
      
      toast.success('Login successful!');
    } catch (error) {
      console.error('Login error:', error);
      
      // Provide more detailed error information
      let errorMessage = 'Login failed';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMessage = `Server error: ${error.response.status} - ${error.response.data?.error || 'Unknown error'}`;
        setDebugInfo({
          status: error.response.status,
          data: error.response.data
        });
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'No response from server. Is the backend running on port 5123?';
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid login-container vh-100 d-flex align-items-center">
      <div className="row justify-content-center w-100">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow login-card">
            <div className="card-header login-header text-center py-3">
              <div className="d-flex justify-content-center align-items-center">
                <div className="sti-logo"></div>
                <h2 className="mb-0">KEY MANAGEMENT SYSTEM</h2>
              </div>
            </div>
            <div className="card-body p-5">
              
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              
              {debugInfo && (
                <div className="alert alert-warning">
                  <strong>Debug Info:</strong>
                  <pre className="mt-2" style={{ whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              )}
              
              <form onSubmit={handleSubmit}>
                <div className="mb-4 text-start">
                  <label htmlFor="id" className="form-label fw-bold">
                    User ID
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    id="id"
                    name="id"
                    value={formData.id}
                    onChange={handleChange}
                    placeholder="Enter your ID"
                    disabled={loading}
                    required
                  />
                </div>
                
                <div className="mb-4 text-start">
                  <label htmlFor="password" className="form-label fw-bold">
                    Password
                  </label>
                  <input
                    type="password"
                    className="form-control form-control-lg"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    disabled={loading}
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  className="btn btn-primary w-100 py-3 mt-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Logging in...
                    </>
                  ) : (
                    'LOGIN'
                  )}
                </button>
              </form>
              
              <div className="mt-4 text-center">
                <small className="text-muted">
                  * Demo credentials: Admin (ID: admin, Password: admin123)
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 