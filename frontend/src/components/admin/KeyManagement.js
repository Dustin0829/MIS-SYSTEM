import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getKeys, createKey, deleteKey } from '../../services/api';

const KeyManagement = () => {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    keyId: '',
    lab: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const data = await getKeys();
      const mappedKeys = data.map(key => ({
        keyId: key.keyid || key.keyId,
        lab: key.lab,
        status: key.status
      }));
      setKeys(mappedKeys);
    } catch (error) {
      setError('Failed to load keys: ' + error);
      toast.error('Failed to load keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.keyId || !formData.lab) {
      toast.error('Please fill in all fields');
      return;
    }
    
    try {
      setSubmitting(true);
      await createKey(formData);
      
      toast.success('Key added successfully!');
      setFormData({ keyId: '', lab: '' });
      setShowAddForm(false);
      fetchKeys();
    } catch (error) {
      setError('Failed to add key: ' + error);
      toast.error('Failed to add key: ' + error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (keyId) => {
    if (!window.confirm(`Are you sure you want to delete key ${keyId}?`)) {
      return;
    }
    
    try {
      await deleteKey(keyId);
      toast.success('Key deleted successfully!');
      fetchKeys();
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : JSON.stringify(error);
      console.error('Delete key error details:', error);
      setError(`Failed to delete key: ${errorMessage}`);
      toast.error(`Failed to delete key: ${errorMessage}`);
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
        <button 
          className="btn btn-primary" 
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : 'Add New Key'}
        </button>
      </div>
      
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      
      {showAddForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">Add New Key</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="keyId" className="form-label">Key ID</label>
                  <input
                    type="text"
                    className="form-control"
                    id="keyId"
                    name="keyId"
                    value={formData.keyId}
                    onChange={handleChange}
                    placeholder="e.g., K01"
                    disabled={submitting}
                    required
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="lab" className="form-label">Lab Name</label>
                  <input
                    type="text"
                    className="form-control"
                    id="lab"
                    name="lab"
                    value={formData.lab}
                    onChange={handleChange}
                    placeholder="e.g., Computer Lab A"
                    disabled={submitting}
                    required
                  />
                </div>
              </div>
              <div className="d-flex justify-content-end">
                <button 
                  type="button" 
                  className="btn btn-secondary me-2"
                  onClick={() => setShowAddForm(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Adding...
                    </>
                  ) : (
                    'Add Key'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Key Inventory</h5>
        </div>
        <div className="card-body">
          {keys.length === 0 ? (
            <div className="alert alert-info" role="alert">
              No keys found in the system. Add your first key using the "Add New Key" button.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Key ID</th>
                    <th>Lab</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr key={key.keyId}>
                      <td>{key.keyId}</td>
                      <td>{key.lab}</td>
                      <td>
                        <span className={`badge ${key.status === 'Available' ? 'bg-success' : 'bg-warning'}`}>
                          {key.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(key.keyId)}
                          disabled={key.status === 'Borrowed'}
                          title={key.status === 'Borrowed' ? 'Cannot delete borrowed key' : 'Delete this key'}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KeyManagement; 