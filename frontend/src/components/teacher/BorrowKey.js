import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getKeys, borrowKey } from '../../services/api';

const BorrowKey = () => {
  const [keys, setKeys] = useState([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching available keys...');
      const data = await getKeys();
      console.log('Raw keys data received:', data);
      
      if (!data || !Array.isArray(data)) {
        console.error('Invalid data format received from getKeys():', data);
        setDebugInfo({ 
          message: 'Received invalid data format', 
          data 
        });
        setError('Failed to load keys: Invalid data format received');
        setKeys([]);
        return;
      }
      
      // Map the data to ensure consistent property names
      const mappedKeys = data.map((key, index) => {
        if (!key) {
          console.error(`Null or undefined key at index ${index}`);
          return null;
        }
        
        console.log(`Processing key:`, key);
        
        // Handle missing keyId/keyid
        if (!key.keyid && !key.keyId) {
          console.error(`Key missing both keyId and keyid:`, key);
        }
        
        return {
          keyId: key.keyid || key.keyId || `unknown-${index}`,
          lab: key.lab || 'Unknown',
          status: key.status || 'Unknown'
        };
      }).filter(Boolean); // Remove any null entries
      
      console.log('Mapped keys:', mappedKeys);
      
      // Filter for available keys only
      const availableKeys = mappedKeys.filter(key => key.status === 'Available');
      console.log('Available keys:', availableKeys);
      
      setKeys(availableKeys);
      
      // Check if a keyId was passed in the URL query params
      const params = new URLSearchParams(location.search);
      const keyId = params.get('keyId');
      
      if (keyId && availableKeys.some(key => key.keyId === keyId)) {
        setSelectedKey(keyId);
      }
    } catch (error) {
      console.error('Error in fetchKeys:', error);
      const errorMessage = error.error || error.message || JSON.stringify(error);
      setError(`Failed to load keys: ${errorMessage}`);
      setDebugInfo({ 
        message: 'Error in fetchKeys', 
        error: errorMessage, 
        stack: error.stack 
      });
    } finally {
      setLoading(false);
    }
  }, [location.search]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedKey) {
      toast.error('Please select a key to borrow');
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      console.log('Borrowing key:', selectedKey);
      await borrowKey(selectedKey);
      
      toast.success('Key borrowed successfully!');
      navigate('/teacher/my-borrows');
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      const errorMessage = error.error || error.message || JSON.stringify(error);
      setError(`Failed to borrow key: ${errorMessage}`);
      setDebugInfo({ 
        message: 'Error in handleSubmit', 
        error: errorMessage, 
        stack: error.stack 
      });
      toast.error(`Failed to borrow key: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading available keys...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4">Borrow a Lab Key</h2>
      
      {error && (
        <div className="alert alert-danger" role="alert">
          <strong>Error:</strong> {error}
          <button 
            className="btn btn-sm btn-outline-danger float-end"
            onClick={() => setDebugInfo(prev => prev ? null : { hasError: true })}
          >
            {debugInfo ? 'Hide Debug Info' : 'Show Debug Info'}
          </button>
        </div>
      )}
      
      {debugInfo && (
        <div className="alert alert-secondary mb-3">
          <h6>Debug Information:</h6>
          <pre className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mb-3">
        <button 
          className="btn btn-sm btn-outline-secondary"
          onClick={fetchKeys}
        >
          Refresh Available Keys
        </button>
      </div>
      
      {keys.length === 0 ? (
        <div className="alert alert-info" role="alert">
          No keys are currently available for borrowing. Please check back later.
        </div>
      ) : (
        <div className="row">
          <div className="col-md-6">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">Select a Key to Borrow</h5>
                
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="keySelect" className="form-label">Available Keys</label>
                    <select
                      id="keySelect"
                      className="form-select"
                      value={selectedKey}
                      onChange={(e) => setSelectedKey(e.target.value)}
                      disabled={submitting}
                      required
                    >
                      <option value="">-- Select a key --</option>
                      {keys.map((key) => (
                        <option key={key.keyId} value={key.keyId}>
                          {key.keyId} - Lab {key.lab}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="d-grid gap-2">
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={!selectedKey || submitting}
                    >
                      {submitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Processing...
                        </>
                      ) : (
                        'Borrow Key'
                      )}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary"
                      onClick={() => navigate('/teacher')}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">Borrowing Instructions</h5>
                <ul className="list-group list-group-flush">
                  <li className="list-group-item">Select the key you wish to borrow from the dropdown menu.</li>
                  <li className="list-group-item">Click the "Borrow Key" button to confirm.</li>
                  <li className="list-group-item">After borrowing, you are responsible for the safe return of the key.</li>
                  <li className="list-group-item">Keys should be returned within 24 hours to avoid overdue status.</li>
                  <li className="list-group-item">You can view your borrowed keys in the "My Borrows" section.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BorrowKey; 