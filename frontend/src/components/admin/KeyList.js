import React, { useState, useEffect } from 'react';
import { getKeys, deleteKey } from '../../services/api';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import Pagination from '../common/Pagination';

const KeyList = () => {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [debugInfo, setDebugInfo] = useState(null);
  const keysPerPage = 10;

  const fetchKeys = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      console.log(`Fetching keys for page ${page}...`);
      
      const data = await getKeys(page, keysPerPage);
      console.log('Raw keys data:', data);
      
      if (!data) {
        console.error('No data received from getKeys()');
        setDebugInfo({ 
          message: 'No data received from API',
          receivedData: data
        });
        setError('Failed to load keys: No data received');
        setKeys([]);
        return;
      }
      
      // Check for expected data structure
      if (!data.keys && !Array.isArray(data)) {
        console.error('Invalid keys data format:', data);
        setDebugInfo({ 
          message: 'API returned invalid data format',
          receivedData: data
        });
        setError('Failed to load keys: Invalid data format');
        setKeys([]);
        return;
      }
      
      // Handle both possible response formats
      const keysList = Array.isArray(data) ? data : data.keys || [];
      const total = data.totalPages || Math.ceil(keysList.length / keysPerPage) || 1;
      
      if (!Array.isArray(keysList)) {
        console.error('Keys is not an array:', keysList);
        setDebugInfo({ 
          message: 'API returned non-array keys',
          receivedData: data,
          keysList
        });
        setError('Failed to load keys: Invalid data format');
        setKeys([]);
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
          status: key.status || 'Unknown',
          lab: key.lab || 'Unknown'
        };
      }).filter(Boolean); // Remove any null entries
      
      console.log('Processed keys:', processedKeys);
      console.log('Total pages:', total);
      
      setKeys(processedKeys);
      setTotalPages(total);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error in fetchKeys:', error);
      const errorMessage = error.error || error.message || JSON.stringify(error);
      setError(`Failed to load keys: ${errorMessage}`);
      setDebugInfo({ 
        message: 'Error in fetchKeys',
        error: errorMessage, 
        stack: error.stack,
        currentPage: page
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys(currentPage);
  }, [currentPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleDelete = async (id) => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
      });

      if (result.isConfirmed) {
        setLoading(true);
        console.log(`Deleting key with id ${id}...`);
        
        const response = await deleteKey(id);
        console.log('Delete response:', response);
        
        Swal.fire(
          'Deleted!',
          'The key has been deleted.',
          'success'
        );
        
        // Refresh the key list
        fetchKeys(currentPage);
      }
    } catch (error) {
      console.error('Error deleting key:', error);
      const errorMessage = error.error || error.message || JSON.stringify(error);
      Swal.fire(
        'Error!',
        `Failed to delete key: ${errorMessage}`,
        'error'
      );
      setDebugInfo({ 
        message: 'Error deleting key',
        error: errorMessage, 
        stack: error.stack,
        keyId: id
      });
    }
  };

  if (loading && keys.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading keys...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Key Management</h2>
        <Link to="/admin/keys/add" className="btn btn-primary">Add New Key</Link>
      </div>
      
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
          onClick={() => fetchKeys(currentPage)}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Keys'}
        </button>
      </div>
      
      {keys.length === 0 ? (
        <div className="alert alert-info" role="alert">
          No keys found.
        </div>
      ) : (
        <>
          <div className="card">
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Key ID</th>
                      <th>Room</th>
                      <th>Lab</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((key) => (
                      <tr key={key.id}>
                        <td>{key.keyId}</td>
                        <td>{key.room}</td>
                        <td>{key.lab}</td>
                        <td>
                          {key.status === 'Available' ? (
                            <span className="badge bg-success">Available</span>
                          ) : (
                            <span className="badge bg-danger">Borrowed</span>
                          )}
                        </td>
                        <td>
                          <Link 
                            to={`/admin/keys/edit/${key.id}`} 
                            className="btn btn-sm btn-outline-primary me-2"
                          >
                            Edit
                          </Link>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(key.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div className="d-flex justify-content-center mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default KeyList; 