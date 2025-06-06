import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  verifyTeacher, 
  getAvailableKeysPublic, 
  publicBorrowKey, 
  publicReturnKey,
  getPublicTransactions,
  getKeys
} from '../../services/api';
import dataSyncService from '../../services/DataSyncService';

const TeacherPortal = () => {
  const [teacherId, setTeacherId] = useState('');
  const [keys, setKeys] = useState([]);
  const [activeTransactions, setActiveTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('borrow'); // 'borrow' or 'return'
  const [selectedKey, setSelectedKey] = useState('');
  const [teacherInfo, setTeacherInfo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAvailableKeys();
    fetchActiveTransactions();
    
    // Subscribe to real-time updates
    const keySubscription = dataSyncService.onKeyUpdates(updatedKeys => {
      if (updatedKeys && updatedKeys.length > 0) {
        const availableKeys = updatedKeys.filter(key => key.status === 'Available');
        setKeys(availableKeys);
      }
    });
    
    const transactionSubscription = dataSyncService.onTransactionUpdates(updatedTransactions => {
      if (updatedTransactions && updatedTransactions.length > 0) {
        const active = updatedTransactions.filter(transaction => 
          transaction.status === 'Borrowed' || transaction.returnDate === null
        );
        setActiveTransactions(active);
      }
    });
    
    // Clean up subscriptions when component unmounts
    return () => {
      keySubscription.unsubscribe();
      transactionSubscription.unsubscribe();
    };
  }, []);

  const fetchAvailableKeys = async () => {
    try {
      setLoading(true);
      console.log('Fetching available keys...');
      const response = await getAvailableKeysPublic();
      console.log('Available keys response:', response);
      
      // Validate response
      if (Array.isArray(response)) {
        setKeys(response);
        if (response.length === 0) {
          console.log('No available keys found');
        }
      } else {
        console.error('Unexpected response format for keys:', response);
        setError('Failed to load keys: Unexpected response format');
      }
    } catch (error) {
      console.error('Error fetching keys:', error);
      setError('Failed to load keys. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveTransactions = async () => {
    try {
      setLoading(true);
      // First check if we already have data in the sync service
      const cachedTransactions = dataSyncService.getActiveTransactions();
      if (cachedTransactions && cachedTransactions.length > 0) {
        setActiveTransactions(cachedTransactions);
      } else {
        try {
          const response = await getPublicTransactions();
          // Filter for active transactions (keys not returned yet)
          const active = response.filter(transaction => 
            transaction.status === 'Borrowed' || transaction.returnDate === null
          );
          setActiveTransactions(active);
        } catch (error) {
          console.error('Error fetching transactions from API:', error);
          // Don't show error to user as this is a secondary feature
        }
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherIdChange = async (e) => {
    const id = e.target.value;
    setTeacherId(id);
    setError('');
    
    if (id) {
      try {
        setLoading(true);
        console.log('Verifying teacher ID:', id);
        
        // Clear previous cached data
        setTeacherInfo(null);
        
        // Make the API call with error logging
        try {
          const response = await verifyTeacher(id);
          console.log('Teacher verification response:', response);
          
          if (response && response.success) {
            setTeacherInfo({
              id: response.teacher.id,
              name: response.teacher.name,
              department: response.teacher.department,
              photoUrl: response.teacher.photo_url ? `${window.location.origin}${response.teacher.photo_url}` : 'https://via.placeholder.com/150',
              source: response.teacher.source || 'database'
            });
          } else {
            setTeacherInfo(null);
            setError('Teacher ID not found. Please check and try again.');
          }
        } catch (apiError) {
          console.error('API call error:', apiError);
          setTeacherInfo(null);
          setError('Error verifying teacher: ' + apiError);
        }
      } catch (error) {
        console.error('Error in handleTeacherIdChange:', error);
        setTeacherInfo(null);
        setError('Teacher ID not found. Please check and try again.');
      } finally {
        setLoading(false);
      }
    } else {
      setTeacherInfo(null);
    }
  };

  const handleKeyChange = (e) => {
    setSelectedKey(e.target.value);
  };

  const handleBorrow = async (e) => {
    e.preventDefault();
    
    if (!teacherId) {
      setError('Please enter your Teacher ID');
      return;
    }
    
    if (!selectedKey) {
      setError('Please select a key to borrow');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Borrowing key:', selectedKey, 'for teacher:', teacherId);
      const response = await publicBorrowKey({ keyId: selectedKey, teacherId });
      console.log('Borrow response:', response);
      
      if (response.success) {
        toast.success('Key borrowed successfully!');
        setSelectedKey('');
        
        // Refresh data
        fetchAvailableKeys();
        fetchActiveTransactions();
        
        // Force refresh data from server for all components
        getKeys().catch(err => console.error('Error refreshing keys:', err));
        getPublicTransactions().catch(err => console.error('Error refreshing transactions:', err));
      } else {
        setError(response.error || 'Failed to borrow key');
        toast.error(response.error || 'Failed to borrow key');
      }
    } catch (error) {
      console.error('Error borrowing key:', error);
      setError('Failed to borrow key: ' + error);
      toast.error('Failed to borrow key');
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    
    if (!teacherId) {
      setError('Please enter your Teacher ID');
      return;
    }
    
    if (!selectedKey) {
      setError('Please select a key to return');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Returning key:', selectedKey, 'for teacher:', teacherId);
      const response = await publicReturnKey({ keyId: selectedKey, teacherId });
      console.log('Return response:', response);
      
      if (response.success) {
        toast.success('Key returned successfully!');
        setSelectedKey('');
        
        // Refresh data
        fetchAvailableKeys();
        fetchActiveTransactions();
        
        // Force refresh data from server for all components
        getKeys().catch(err => console.error('Error refreshing keys:', err));
        getPublicTransactions().catch(err => console.error('Error refreshing transactions:', err));
      } else {
        setError(response.error || 'Failed to return key');
        toast.error(response.error || 'Failed to return key');
      }
    } catch (error) {
      console.error('Error returning key:', error);
      setError('Failed to return key: ' + error);
      toast.error('Failed to return key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
    <div className="text-center mb-4">
    <h1
        className="fw-bold"
        style={{
        color: '#FFFFFF',
        textShadow: '1px 1px 2px black',
  }}
>
  STI Laboratory Key Portal
</h1>
      </div>
      
      <div className="row">
        {/* Main Form Section */}
        <div className="col-lg-8 mb-4">
          <div className="card shadow-lg h-100" style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
            <div className="card-header bg-primary text-white">
              <ul className="nav nav-tabs card-header-tabs">
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'borrow' ? 'active bg-white text-primary' : 'text-white'}`}
                    onClick={() => setActiveTab('borrow')}
                  >
                    Borrow Key
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'return' ? 'active bg-white text-primary' : 'text-white'}`}
                    onClick={() => setActiveTab('return')}
                  >
                    Return Key
                  </button>
                </li>
              </ul>
            </div>
            <div className="card-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              <div className="mb-4">
                <label htmlFor="teacherId" className="form-label fw-bold">Teacher ID</label>
                <div className="input-group mb-3">
                <input
                  type="text"
                  className="form-control"
                  id="teacherId"
                  value={teacherId}
                  onChange={handleTeacherIdChange}
                  placeholder="Enter your Teacher ID"
                  required
                />
                  {loading && (
                    <span className="input-group-text">
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </span>
                  )}
                </div>
              </div>
              
              {activeTab === 'borrow' ? (
                <form onSubmit={handleBorrow}>
                  <div className="mb-3">
                    <label htmlFor="keySelect" className="form-label fw-bold">Select Key to Borrow</label>
                    <select
                      className="form-select"
                      id="keySelect"
                      value={selectedKey}
                      onChange={handleKeyChange}
                      required
                    >
                      <option value="">-- Select a key --</option>
                      {keys.map(key => (
                        <option key={key.keyId} value={key.keyId}>
                          {key.keyId} - {key.lab}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary w-100 mt-4"
                    disabled={loading || !teacherId || !selectedKey || !teacherInfo}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Processing...
                      </>
                    ) : (
                      'Borrow Key'
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleReturn}>
                  <div className="mb-3">
                    <label htmlFor="returnKeySelect" className="form-label fw-bold">Select Key to Return</label>
                    <select
                      className="form-select"
                      id="returnKeySelect"
                      value={selectedKey}
                      onChange={handleKeyChange}
                      required
                    >
                      <option value="">-- Select a key --</option>
                      {activeTransactions
                        .filter(transaction => transaction.teacherId === teacherId)
                        .map(transaction => (
                          <option key={transaction.id} value={transaction.keyId}>
                            {transaction.keyId} - {transaction.lab}
                          </option>
                        ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-success w-100 mt-4"
                    disabled={loading || !teacherId || !selectedKey || !teacherInfo}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Processing...
                      </>
                    ) : (
                      'Return Key'
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Teacher Information Card */}
        <div className="col-lg-4">
          {teacherInfo ? (
            <div className="card shadow-lg h-100" style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Teacher Information</h5>
            </div>
              <div className="card-body p-3 text-center">
                <div className="teacher-photo-container mb-3" style={{ 
                  height: '250px', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  overflow: 'hidden',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px' 
                }}>
              <img
                src={teacherInfo.photoUrl}
                alt="Teacher"
                    className="img-fluid"
                    style={{ 
                      maxHeight: '100%', 
                      maxWidth: '100%', 
                      objectFit: 'contain' 
                    }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/300x400?text=No+Photo';
                    }}
              />
                </div>
                <div className="teacher-id-card p-2 border rounded bg-light">
                  <h5 className="card-title fw-bold mb-3">{teacherInfo.name}</h5>
                  <div className="d-flex justify-content-between mb-2">
                    <strong>ID:</strong>
                    <span>{teacherInfo.id}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <strong>Department:</strong>
                    <span>{teacherInfo.department || 'N/A'}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <strong>Date:</strong>
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="card-footer bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">Verified ✓</small>
                  <span className={`badge ${teacherInfo.source === 'file' ? 'bg-info' : 'bg-success'}`}>
                    {teacherInfo.source === 'file' ? 'Auto-Generated' : 'Authorized'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="card shadow-lg h-100 bg-light">
              <div className="card-body d-flex flex-column justify-content-center align-items-center text-center p-4">
                <i className="bi bi-person-badge" style={{ fontSize: '4rem', color: '#ccc' }}></i>
                <h5 className="mt-3">Teacher Verification</h5>
                <p className="text-muted">Enter a valid Teacher ID to display information</p>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
);
};

export default TeacherPortal; 