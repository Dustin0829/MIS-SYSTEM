import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getKeys, borrowKey } from '../../services/api';

const BorrowKey = () => {
  const [keys, setKeys] = useState([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        setLoading(true);
        const data = await getKeys();
        
        // Filter for available keys only
        const availableKeys = data.filter(key => key.status === 'Available');
        setKeys(availableKeys);
        
        // Check if a keyId was passed in the URL query params
        const params = new URLSearchParams(location.search);
        const keyId = params.get('keyId');
        
        if (keyId && availableKeys.some(key => key.keyId === keyId)) {
          setSelectedKey(keyId);
        }
      } catch (error) {
        setError('Failed to load keys: ' + error);
      } finally {
        setLoading(false);
      }
    };

    fetchKeys();
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedKey) {
      toast.error('Please select a key to borrow');
      return;
    }
    
    try {
      setSubmitting(true);
      await borrowKey(selectedKey);
      
      toast.success('Key borrowed successfully!');
      navigate('/teacher/my-borrows');
    } catch (error) {
      setError('Failed to borrow key: ' + error);
      toast.error('Failed to borrow key: ' + error);
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
          {error}
        </div>
      )}
      
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