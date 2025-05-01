import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getKeys, getTeachers, borrowKey, returnKey, getActiveTransactions } from '../services/api';

const KeyBorrowingSystem = () => {
  // State variables
  const [teacherId, setTeacherId] = useState('');
  const [teacherData, setTeacherData] = useState(null);
  const [keys, setKeys] = useState([]);
  const [availableKeys, setAvailableKeys] = useState([]);
  const [borrowedKeys, setBorrowedKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('borrow'); // 'borrow' or 'return'

  // Fetch keys and borrowed keys on component mount
  useEffect(() => {
    fetchKeys();
    fetchBorrowedKeys();
  }, []);

  // Fetch available keys from the API
  const fetchKeys = async () => {
    try {
      setLoading(true);
      const data = await getKeys();
      setKeys(data);
      setAvailableKeys(data.filter(key => key.status === 'Available'));
    } catch (error) {
      toast.error(`Failed to load keys: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch borrowed keys from the API
  const fetchBorrowedKeys = async () => {
    try {
      setLoading(true);
      const data = await getActiveTransactions();
      setBorrowedKeys(data);
    } catch (error) {
      toast.error(`Failed to load borrowed keys: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle teacher ID lookup
  const handleTeacherLookup = async () => {
    if (!teacherId.trim()) {
      toast.error('Please enter a Teacher ID');
      return;
    }

    try {
      setLoading(true);
      const teachers = await getTeachers();
      const foundTeacher = teachers.find(teacher => teacher.id === teacherId);
      
      if (foundTeacher) {
        setTeacherData(foundTeacher);
        toast.success(`Found teacher: ${foundTeacher.name}`);
      } else {
        setTeacherData(null);
        toast.error('Teacher not found. Please check the ID and try again.');
      }
    } catch (error) {
      toast.error(`Failed to lookup teacher: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle borrowing a key
  const handleBorrowKey = async (keyId) => {
    if (!teacherData) {
      toast.error('Please lookup a teacher first');
      return;
    }

    try {
      setLoading(true);
      await borrowKey({ keyId, teacherId: teacherData.id });
      toast.success('Key borrowed successfully!');
      
      // Refresh data
      fetchKeys();
      fetchBorrowedKeys();
      
      // Reset after successful borrow
      setTeacherId('');
      setTeacherData(null);
    } catch (error) {
      toast.error(`Failed to borrow key: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle returning a key
  const handleReturnKey = async (keyId) => {
    if (!teacherData) {
      toast.error('Please lookup a teacher first');
      return;
    }

    try {
      setLoading(true);
      await returnKey({ keyId, teacherId: teacherData.id });
      toast.success('Key returned successfully!');
      
      // Refresh data
      fetchKeys();
      fetchBorrowedKeys();
      
      // Reset after successful return
      setTeacherId('');
      setTeacherData(null);
    } catch (error) {
      toast.error(`Failed to return key: ${error}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate time elapsed since borrowing
  const getTimeElapsed = (borrowDate) => {
    const borrowed = new Date(borrowDate);
    const now = new Date();
    const diffMs = now - borrowed;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHrs > 24) {
      const days = Math.floor(diffHrs / 24);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (diffHrs > 0) {
      return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
    } else {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4 text-center">Key Borrowing System</h1>
      
      {/* Teacher lookup section */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h2 className="h5 mb-0">Teacher Lookup</h2>
        </div>
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="input-group">
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Enter Teacher ID" 
                  value={teacherId} 
                  onChange={(e) => setTeacherId(e.target.value)} 
                />
                <button 
                  className="btn btn-primary" 
                  onClick={handleTeacherLookup}
                  disabled={loading || !teacherId.trim()}
                >
                  {loading ? 'Looking up...' : 'Lookup'}
                </button>
              </div>
              <div className="form-text text-muted">
                Example Teacher IDs: T001, T002, T003
              </div>
            </div>
            
            <div className="col-md-6">
              {teacherData && (
                <div className="d-flex align-items-center">
                  <img 
                    src={teacherData.photo_url} 
                    alt={teacherData.name} 
                    className="rounded me-3" 
                    style={{ width: '60px', height: '60px' }} 
                  />
                  <div>
                    <h3 className="h5 mb-1">{teacherData.name}</h3>
                    <p className="text-muted mb-0">ID: {teacherData.id}</p>
                    <p className="text-muted mb-0">{teacherData.department}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs for borrow/return */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'borrow' ? 'active' : ''}`}
            onClick={() => setActiveTab('borrow')}
          >
            Borrow Keys
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'return' ? 'active' : ''}`}
            onClick={() => setActiveTab('return')}
          >
            Return Keys
          </button>
        </li>
      </ul>
      
      {/* Borrow Keys Tab */}
      {activeTab === 'borrow' && (
        <div className="card">
          <div className="card-header bg-success text-white">
            <h2 className="h5 mb-0">Available Keys</h2>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">Loading keys...</p>
              </div>
            ) : availableKeys.length === 0 ? (
              <div className="alert alert-info">
                No keys are currently available for borrowing.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Key ID</th>
                      <th>Lab</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableKeys.map(key => (
                      <tr key={key.keyId}>
                        <td>{key.keyId}</td>
                        <td>{key.lab}</td>
                        <td>
                          <span className="badge bg-success">Available</span>
                        </td>
                        <td>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => handleBorrowKey(key.keyId)}
                            disabled={loading || !teacherData}
                          >
                            Borrow
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {!teacherData && (
              <div className="alert alert-warning mt-3">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                Please lookup a teacher first to borrow a key.
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Return Keys Tab */}
      {activeTab === 'return' && (
        <div className="card">
          <div className="card-header bg-danger text-white">
            <h2 className="h5 mb-0">Borrowed Keys</h2>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">Loading borrowed keys...</p>
              </div>
            ) : borrowedKeys.length === 0 ? (
              <div className="alert alert-info">
                No keys are currently borrowed.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Key ID</th>
                      <th>Lab</th>
                      <th>Borrowed By</th>
                      <th>Borrowed</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {borrowedKeys.map(borrow => (
                      <tr key={borrow.id} className={borrow.isOverdue ? 'table-danger' : ''}>
                        <td>{borrow.keyId}</td>
                        <td>{borrow.lab}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <img 
                              src={borrow.teacherPhotoUrl} 
                              alt={borrow.teacherName} 
                              className="rounded me-2" 
                              style={{ width: '30px', height: '30px' }} 
                            />
                            <span>{borrow.teacherName}</span>
                          </div>
                        </td>
                        <td>
                          <span title={new Date(borrow.borrowDate).toLocaleString()}>
                            {getTimeElapsed(borrow.borrowDate)}
                          </span>
                          {borrow.isOverdue && (
                            <span className="badge bg-danger ms-2">Overdue</span>
                          )}
                        </td>
                        <td>
                          {teacherData && teacherData.id === borrow.teacherId ? (
                            <button 
                              className="btn btn-success btn-sm"
                              onClick={() => handleReturnKey(borrow.keyId)}
                              disabled={loading}
                            >
                              Return
                            </button>
                          ) : (
                            <button 
                              className="btn btn-outline-secondary btn-sm"
                              disabled
                              title="Only the teacher who borrowed this key can return it"
                            >
                              Return
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {!teacherData && (
              <div className="alert alert-warning mt-3">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                Please lookup a teacher first to return a key.
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Information card */}
      <div className="card mt-4">
        <div className="card-header bg-info text-white">
          <h2 className="h5 mb-0">Key Borrowing Policy</h2>
        </div>
        <div className="card-body">
          <ul className="list-group list-group-flush">
            <li className="list-group-item">Keys should be returned within 24 hours of borrowing.</li>
            <li className="list-group-item">Overdue keys are highlighted in red in the borrowed keys list.</li>
            <li className="list-group-item">Please return keys promptly when you're finished using the lab.</li>
            <li className="list-group-item">If you need to keep a key longer, please contact the IT staff.</li>
            <li className="list-group-item">Teachers are responsible for any keys they borrow.</li>
          </ul>
        </div>
        <div className="card-footer text-end">
          <small className="text-muted">
            <a href="/admin-login" className="text-muted text-decoration-none">
              Admin Access
            </a>
          </small>
        </div>
      </div>
    </div>
  );
};

export default KeyBorrowingSystem; 