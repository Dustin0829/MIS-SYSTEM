import React, { useState, useEffect } from 'react';
import { getBorrowedKeys, returnKey } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const ReturnKeyForm = () => {
  const [borrowedKeys, setBorrowedKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  const [selectedBorrowId, setSelectedBorrowId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const fetchBorrowedKeys = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching borrowed keys...');
      
      const data = await getBorrowedKeys();
      console.log('Raw borrowed keys data:', data);
      
      if (!data) {
        console.error('No data received from getBorrowedKeys()');
        setDebugInfo({ 
          message: 'No data received from API',
          receivedData: data
        });
        setError('Failed to load borrowed keys: No data received');
        setBorrowedKeys([]);
        return;
      }
      
      // Check for expected data structure
      const keysList = Array.isArray(data) ? data : data.borrowedKeys || [];
      
      if (!Array.isArray(keysList)) {
        console.error('Borrowed keys is not an array:', keysList);
        setDebugInfo({ 
          message: 'API returned non-array keys',
          receivedData: data,
          keysList
        });
        setError('Failed to load borrowed keys: Invalid data format');
        setBorrowedKeys([]);
        return;
      }
      
      // Process and validate each borrowed key
      const processedKeys = keysList.map((borrow, index) => {
        if (!borrow) {
          console.error(`Null or undefined borrow record at index ${index}`);
          return null;
        }
        
        // Handle missing properties
        if (!borrow.id) {
          console.error(`Borrow record missing id at index ${index}:`, borrow);
        }
        
        if (!borrow.key) {
          console.error(`Borrow record missing key information at index ${index}:`, borrow);
        }
        
        const key = borrow.key || {};
        const borrowDate = borrow.borrowDate ? new Date(borrow.borrowDate) : null;
        const expectedReturnDate = borrow.expectedReturnDate ? new Date(borrow.expectedReturnDate) : null;
        
        return {
          id: borrow.id || `unknown-${index}`,
          keyId: key.keyId || key.id || 'Unknown',
          room: key.room || 'Unknown',
          lab: key.lab || 'Unknown',
          borrowDate: borrowDate ? borrowDate.toLocaleDateString() : 'Unknown date',
          expectedReturnDate: expectedReturnDate ? expectedReturnDate.toLocaleDateString() : 'Not specified',
          purpose: borrow.purpose || 'No purpose specified'
        };
      }).filter(Boolean); // Remove any null entries
      
      console.log('Processed borrowed keys:', processedKeys);
      
      if (processedKeys.length === 0) {
        console.log('No borrowed keys found');
      }
      
      setBorrowedKeys(processedKeys);
    } catch (error) {
      console.error('Error in fetchBorrowedKeys:', error);
      const errorMessage = error.error || error.message || JSON.stringify(error);
      setError(`Failed to load borrowed keys: ${errorMessage}`);
      setDebugInfo({ 
        message: 'Error in fetchBorrowedKeys',
        error: errorMessage, 
        stack: error.stack
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrowedKeys();
  }, []);

  const handleBorrowSelect = (e) => {
    setSelectedBorrowId(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setError('');
      
      if (!selectedBorrowId) {
        setError('Please select a key to return');
        setDebugInfo({
          message: 'Form validation error',
          error: 'No key selected to return',
          selectedBorrowId
        });
        setIsSubmitting(false);
        return;
      }
      
      console.log('Submitting return request for borrow ID:', selectedBorrowId);
      
      const response = await returnKey(selectedBorrowId);
      console.log('Return response:', response);
      
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'You have successfully returned the key!',
      });
      
      navigate('/teacher/dashboard');
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      const errorMessage = error.error || error.message || JSON.stringify(error);
      setError(`Failed to return key: ${errorMessage}`);
      setDebugInfo({ 
        message: 'Error in returnKey submission',
        error: errorMessage, 
        stack: error.stack,
        submittedBorrowId: selectedBorrowId
      });
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Failed to return key: ${errorMessage}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card shadow">
      <div className="card-header bg-primary text-white">
        <h4 className="mb-0">Return a Key</h4>
      </div>
      <div className="card-body">
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
        
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading your borrowed keys...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="borrowId" className="form-label">Select Key to Return</label>
              {borrowedKeys.length === 0 ? (
                <div className="alert alert-info">
                  You don't have any keys borrowed at the moment.
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-primary ms-3"
                    onClick={fetchBorrowedKeys}
                    disabled={loading}
                  >
                    Refresh
                  </button>
                </div>
              ) : (
                <select
                  id="borrowId"
                  className="form-select"
                  value={selectedBorrowId}
                  onChange={handleBorrowSelect}
                  required
                >
                  <option value="">-- Select a Key to Return --</option>
                  {borrowedKeys.map((borrow) => (
                    <option key={borrow.id} value={borrow.id}>
                      {borrow.room} - {borrow.lab} (Borrowed: {borrow.borrowDate})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedBorrowId && (
              <div className="mb-4">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">Selected Key Details</h5>
                    {borrowedKeys
                      .filter(key => key.id === selectedBorrowId)
                      .map(key => (
                        <div key={key.id}>
                          <p><strong>Room:</strong> {key.room}</p>
                          <p><strong>Lab:</strong> {key.lab}</p>
                          <p><strong>Key ID:</strong> {key.keyId}</p>
                          <p><strong>Borrowed Date:</strong> {key.borrowDate}</p>
                          <p><strong>Expected Return:</strong> {key.expectedReturnDate}</p>
                          <p><strong>Purpose:</strong> {key.purpose}</p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            <div className="d-grid gap-2">
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isSubmitting || !selectedBorrowId || borrowedKeys.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Processing...
                  </>
                ) : 'Return Key'}
              </button>
              <button 
                type="button" 
                className="btn btn-outline-secondary"
                onClick={() => navigate('/teacher/dashboard')}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReturnKeyForm; 