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
    department: '',
    photo_url: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

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

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        toast.error("File is too large. Maximum size is 5MB.");
        e.target.value = null; // Reset the input
        return;
      }
      
      setPhotoFile(file);
      // Preview the photo
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.id || !formData.name) {
      toast.error('ID and name are required');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Prepare the teacher data
      let photo_url = formData.photo_url;
      
      // If photo file exists, convert it to base64
      if (photoFile) {
        photo_url = await convertFileToBase64(photoFile);
      }
      
      // Create the teacher data object with the form fields
      const teacherData = {
        id: formData.id,
        name: formData.name,
        department: formData.department || null,
        photo_url: photo_url || null
      };
      
      console.log('Creating teacher with data:', teacherData);
      await addTeacher(teacherData);
      
      toast.success('Teacher added successfully!');
      setFormData({ id: '', name: '', department: '', photo_url: '' });
      setPhotoFile(null);
      setPhotoPreview(null);
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
      
      // Prepare update data
      let photo_url = formData.photo_url;
      
      // If photo file exists, convert it to base64
      if (photoFile) {
        photo_url = await convertFileToBase64(photoFile);
      }
      
      // Only send relevant fields for update
      const updateData = {
        name: formData.name,
        department: formData.department,
        photo_url: photo_url
      };
      
      await updateTeacher(editingTeacherId, updateData);
      
      toast.success('Teacher updated successfully!');
      setFormData({ id: '', name: '', department: '', photo_url: '' });
      setPhotoFile(null);
      setPhotoPreview(null);
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

  // Helper function to convert File to base64 string
  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete teacher with ID ${id}?`)) {
      return;
    }
    
    try {
      setLoading(true);
      console.log(`Deleting teacher with ID: ${id}`);
      
      await deleteTeacher(id);
      
      toast.success('Teacher deleted successfully!');
      fetchTeachers();
    } catch (error) {
      console.error('Error in handleDelete:', error);
      
      if (error.includes('active key transactions')) {
        toast.error('Cannot delete a teacher who has active borrowed keys. Please ensure all keys are returned first.');
      } else if (error.includes('not found')) {
        toast.error('Teacher not found. It may have been already deleted.');
        // Refresh to make sure our list is up to date
        fetchTeachers();
      } else {
        setError('Failed to delete teacher: ' + error);
        toast.error('Failed to delete teacher: ' + error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (teacher) => {
    setFormData({
      id: teacher.id,
      name: teacher.name,
      department: teacher.department || '',
      photo_url: teacher.photo_url || ''
    });
    setEditingTeacherId(teacher.id);
    setPhotoPreview(teacher.photo_url || null);
    setPhotoFile(null);
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
                  <label htmlFor="department" className="form-label">Department (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="e.g., Computer Science"
                    disabled={submitting}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="photo_upload" className="form-label">Photo (Optional)</label>
                  <input
                    type="file"
                    className="form-control"
                    id="photo_upload"
                    name="photo_upload"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    disabled={submitting}
                  />
                  <div className="form-text">Upload teacher's photo (max 5MB)</div>
                  {photoPreview && (
                    <div className="mt-2">
                      <div className="d-flex align-items-center">
                        <img 
                          src={photoPreview} 
                          alt="Preview" 
                          className="img-thumbnail" 
                          style={{ maxHeight: '100px' }} 
                        />
                        <button 
                          type="button" 
                          className="btn btn-sm btn-danger ms-2"
                          onClick={() => {
                            setPhotoPreview(null);
                            setPhotoFile(null);
                            setFormData({
                              ...formData,
                              photo_url: ''
                            });
                          }}
                        >
                          <i className="bi bi-trash"></i> Remove
                        </button>
                      </div>
                    </div>
                  )}
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
                  <label htmlFor="editDepartment" className="form-label">Department (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    id="editDepartment"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="e.g., Computer Science"
                    disabled={submitting}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="editPhotoUpload" className="form-label">Photo (Optional)</label>
                  <input
                    type="file"
                    className="form-control"
                    id="editPhotoUpload"
                    name="photo_upload"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    disabled={submitting}
                  />
                  <div className="form-text">Upload a new photo or keep existing</div>
                  {photoPreview && (
                    <div className="mt-2">
                      <div className="d-flex align-items-center">
                        <img 
                          src={photoPreview} 
                          alt="Preview" 
                          className="img-thumbnail" 
                          style={{ maxHeight: '100px' }} 
                        />
                        <button 
                          type="button" 
                          className="btn btn-sm btn-danger ms-2"
                          onClick={() => {
                            setPhotoPreview(null);
                            setPhotoFile(null);
                            setFormData({
                              ...formData,
                              photo_url: ''
                            });
                          }}
                        >
                          <i className="bi bi-trash"></i> Remove
                        </button>
                      </div>
                    </div>
                  )}
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
                    <th>Photo</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => (
                    <tr key={teacher.id}>
                      <td>{teacher.id}</td>
                      <td>
                        {teacher.photo_url ? (
                          <img 
                            src={teacher.photo_url} 
                            alt={teacher.name}
                            className="rounded-circle"
                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div 
                            className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white"
                            style={{ width: '40px', height: '40px' }}
                          >
                            {teacher.name.charAt(0)}
                          </div>
                        )}
                      </td>
                      <td>{teacher.name}</td>
                      <td>{teacher.department || '-'}</td>
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