import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getTeachers, addTeacher, updateTeacher, deleteTeacher } from '../../services/api';

const TeacherManagement = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    password: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState(null);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const data = await getTeachers();
      setTeachers(data);
    } catch (error) {
      setError('Failed to load teachers: ' + error);
      toast.error('Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.id || !formData.name || !formData.password) {
      toast.error('ID, name, and password are required');
      return;
    }
    
    try {
      setSubmitting(true);
      await addTeacher(formData);
      
      toast.success('Teacher added successfully!');
      setFormData({ id: '', name: '', email: '', password: '' });
      setShowAddForm(false);
      fetchTeachers();
    } catch (error) {
      setError('Failed to add teacher: ' + error);
      toast.error('Failed to add teacher: ' + error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Name is required');
      return;
    }
    
    try {
      setSubmitting(true);
      // Only send name and email for update
      const updateData = {
        name: formData.name,
        email: formData.email
      };
      
      await updateTeacher(editingTeacherId, updateData);
      
      toast.success('Teacher updated successfully!');
      setFormData({ id: '', name: '', email: '', password: '' });
      setShowEditForm(false);
      setEditingTeacherId(null);
      fetchTeachers();
    } catch (error) {
      setError('Failed to update teacher: ' + error);
      toast.error('Failed to update teacher: ' + error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete teacher with ID ${id}?`)) {
      return;
    }
    
    try {
      await deleteTeacher(id);
      
      toast.success('Teacher deleted successfully!');
      fetchTeachers();
    } catch (error) {
      setError('Failed to delete teacher: ' + error);
      toast.error('Failed to delete teacher: ' + error);
    }
  };

  const handleEdit = (teacher) => {
    setFormData({
      id: teacher.id,
      name: teacher.name,
      email: teacher.email || '',
      password: '' // Password is not included in edit
    });
    setEditingTeacherId(teacher.id);
    setShowEditForm(true);
    setShowAddForm(false);
  };

  if (loading && teachers.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading teachers...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Teacher Management</h2>
        <button 
          className="btn btn-primary" 
          onClick={() => {
            setShowAddForm(!showAddForm);
            setShowEditForm(false);
            setFormData({ id: '', name: '', email: '', password: '' });
          }}
        >
          {showAddForm ? 'Cancel' : 'Add New Teacher'}
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
            <h5 className="mb-0">Add New Teacher</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleAddSubmit}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="id" className="form-label">Teacher ID</label>
                  <input
                    type="text"
                    className="form-control"
                    id="id"
                    name="id"
                    value={formData.id}
                    onChange={handleChange}
                    placeholder="e.g., T001"
                    disabled={submitting}
                    required
                  />
                  <div className="form-text">Unique identifier for the teacher (e.g., T001)</div>
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="name" className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., John Doe"
                    disabled={submitting}
                    required
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="email" className="form-label">Email (Optional)</label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g., john@school.org"
                    disabled={submitting}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="password" className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password"
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
                    'Add Teacher'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {showEditForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">Edit Teacher</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleEditSubmit}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="editId" className="form-label">Teacher ID</label>
                  <input
                    type="text"
                    className="form-control"
                    id="editId"
                    value={formData.id}
                    disabled
                  />
                  <div className="form-text">Teacher ID cannot be changed</div>
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="editName" className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    id="editName"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., John Doe"
                    disabled={submitting}
                    required
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="editEmail" className="form-label">Email (Optional)</label>
                  <input
                    type="email"
                    className="form-control"
                    id="editEmail"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g., john@school.org"
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="d-flex justify-content-end">
                <button 
                  type="button" 
                  className="btn btn-secondary me-2"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingTeacherId(null);
                  }}
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
                      Updating...
                    </>
                  ) : (
                    'Update Teacher'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Teacher List</h5>
        </div>
        <div className="card-body">
          {teachers.length === 0 ? (
            <div className="alert alert-info" role="alert">
              No teachers found in the system. Add your first teacher using the "Add New Teacher" button.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => (
                    <tr key={teacher.id}>
                      <td>{teacher.id}</td>
                      <td>{teacher.name}</td>
                      <td>{teacher.email || '-'}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary me-2"
                          onClick={() => handleEdit(teacher)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(teacher.id)}
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

export default TeacherManagement; 