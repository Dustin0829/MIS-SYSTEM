import React, { useState, useEffect } from 'react';
import { getAvailableKeys, borrowKey } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const BorrowKeyForm = () => {
  const [availableKeys, setAvailableKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  const [formData, setFormData] = useState({
    keyId: '',
    purpose: '',
    expectedReturnDate: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const fetchAvailableKeys = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching available keys...');
      
      const data = await getAvailableKeys();
      console.log('Raw available keys data:', data);
      
      if (!data) {
        console.error('No data received from getAvailableKeys()');
        setDebugInfo({ 
          message: 'No data received from API',
          receivedData: data
        });
        setError('Failed to load available keys: No data received');
        setAvailableKeys([]);
        return;
      }
      
      // Check for expected data structure
      const keysList = Array.isArray(data) ? data : data.keys || [];
      
      if (!Array.isArray(keysList)) {
        console.error('Keys is not an array:', keysList);
        setDebugInfo({ 
          message: 'API returned non-array keys',
          receivedData: data,
          keysList
        });
        setError('Failed to load available keys: Invalid data format');
        setAvailableKeys([]);
        return;
      }
      
      // Process and validate each key
      const processedKeys = keysList.map((key, index) => {
        if (!key) {
          console.error(`Null or undefined key at index ${index}`);
          return null;
        }
        
        // Handle missing properties
        if (!key.id) {
          console.error(`Key missing id at index ${index}:`, key);
        }
        
        if (!key.room) {
          console.error(`Key missing room at index ${index}:`, key);
        }
        
        return {
          id: key.id || `unknown-${index}`,
          keyId: key.keyId || key.id || `unknown-${index}`,
          room: key.room || 'Unknown',
          lab: key.lab || 'Unknown'
        };
      }).filter(Boolean); // Remove any null entries
      
      console.log('Processed available keys:', processedKeys);
      
      if (processedKeys.length === 0) {
        console.log('No available keys found');
      }
      
      setAvailableKeys(processedKeys);
    } catch (error) {
      console.error('Error in fetchAvailableKeys:', error);
      const errorMessage = error.error || error.message || JSON.stringify(error);
      setError(`Failed to load available keys: ${errorMessage}`);
      setDebugInfo({ 
        message: 'Error in fetchAvailableKeys',
        error: errorMessage, 
        stack: error.stack
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableKeys();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setError('');
      
      // Validate form inputs
      if (!formData.keyId) {
        setError('Please select a key');
        setDebugInfo({
          message: 'Form validation error',
          error: 'No key selected',
          formData
        });
        setIsSubmitting(false);
        return;
      }
      
      if (!formData.purpose) {
        setError('Please provide a purpose for borrowing');
        setDebugInfo({
          message: 'Form validation error',
          error: 'No purpose provided',
          formData
        });
        setIsSubmitting(false);
        return;
      }
      
      console.log('Submitting borrow request:', formData);
      
      const borrowData = {
        keyId: formData.keyId,
        purpose: formData.purpose,
        expectedReturnDate: formData.expectedReturnDate || undefined
      };
      
      console.log('Formatted borrow data:', borrowData);
      
      const response = await borrowKey(borrowData);
      console.log('Borrow response:', response);
      
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'You have successfully borrowed the key!',
      });
      
      navigate('/teacher/dashboard');
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      const errorMessage = error.error || error.message || JSON.stringify(error);
      setError(`Failed to borrow key: ${errorMessage}`);
      setDebugInfo({ 
        message: 'Error in borrowKey submission',
        error: errorMessage, 
        stack: error.stack,
        submittedData: formData
      });
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Failed to borrow key: ${errorMessage}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card shadow">
      <div className="card-header bg-primary text-white">
        <h4 className="mb-0">Borrow a Key</h4>
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
            <p className="mt-2">Loading available keys...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="keyId" className="form-label">Select Key</label>
              {availableKeys.length === 0 ? (
                <div className="alert alert-info">
                  No keys are currently available for borrowing.
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-primary ms-3"
                    onClick={fetchAvailableKeys}
                    disabled={loading}
                  >
                    Refresh
                  </button>
                </div>
              ) : (
                <select
                  id="keyId"
                  name="keyId"
                  className="form-select"
                  value={formData.keyId}
                  onChange={handleChange}
                  required
                >
                  <option value="">-- Select a Key --</option>
                  {availableKeys.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.room} - {key.lab} ({key.keyId})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="purpose" className="form-label">Purpose</label>
              <textarea
                id="purpose"
                name="purpose"
                className="form-control"
                value={formData.purpose}
                onChange={handleChange}
                rows="3"
                placeholder="Please describe why you need this key"
                required
              ></textarea>
            </div>

            <div className="mb-3">
              <label htmlFor="expectedReturnDate" className="form-label">Expected Return Date</label>
              <input
                type="date"
                id="expectedReturnDate"
                name="expectedReturnDate"
                className="form-control"
                value={formData.expectedReturnDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
              />
              <small className="text-muted">Optional. When do you expect to return this key?</small>
            </div>

            <div className="d-grid gap-2">
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isSubmitting || availableKeys.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Processing...
                  </>
                ) : 'Borrow Key'}
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

export default BorrowKeyForm; 