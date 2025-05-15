import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { getTeachers, addTeacher, updateTeacher, deleteTeacher, getTeacherUploadPath, clearAllTeachers } from '../../services/api';

// Importing teacher by Excel file
import * as XLSX from 'xlsx';


const TeacherManagement = () => {
  // Importing teacher by Excel file
  const [showImportForm, setShowImportForm] = useState(false);
  const [activeTab, setActiveTab] = useState('excel'); // Default to Excel tab

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
  const [uploadPathInfo, setUploadPathInfo] = useState(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [verificationStep, setVerificationStep] = useState(1);
  const [verificationText, setVerificationText] = useState('');

  // Handle tab switching
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

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
    // Fetch upload path information
    getTeacherUploadPath()
      .then(data => {
        setUploadPathInfo(data);
      })
      .catch(err => {
        console.error("Failed to get upload path information:", err);
      });
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
      reader.onload = () => {
        console.log(`Converted ${file.name} to base64 string, size: ${reader.result.length} characters`);
        resolve(reader.result);
      };
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
    setShowImportForm(false);
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

  // Open the Teachers folder directly
  const openTeachersFolder = async () => {
    try {
      // Make a backend request to open the folder
      const response = await fetch('/api/open-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ path: '/Users/MacBook/Desktop/Teachers' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to open folder');
      }
      
      toast.info("Opening Teachers folder...");
    } catch (error) {
      console.error("Error opening folder:", error);
      
      // Fallback: Just inform the user where to find the folder
      toast.info("Please open the folder at: /Users/MacBook/Desktop/Teachers");
      
      // On macOS, we can try to open using the Finder
      window.open('file:///Users/MacBook/Desktop/Teachers');
    }
  };

  // Function for importing teacher by Excel file
  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        // Process Excel file
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          toast.warning("No data found in the Excel file.");
          return;
        }
    
        toast.info(`Processing ${jsonData.length} teachers from Excel...`);
        
        // Validate data
        const validData = jsonData.filter(row => row.id && row.name);
        
        if (validData.length < jsonData.length) {
          toast.warning(`${jsonData.length - validData.length} records were skipped due to missing ID or name.`);
        }
    
        // Process each valid teacher
        let successCount = 0;
        for (const teacher of validData) {
          try {
            await addTeacher({
              id: teacher.id,
              name: teacher.name,
              department: teacher.department || '',
              photo_url: teacher.photo_url || ''
            });
            successCount++;
          } catch (err) {
            console.error(`Error importing teacher ${teacher.id}:`, err);
          }
        }
        
        toast.success(`Successfully imported ${successCount} teachers!`);
        fetchTeachers();
      } catch (err) {
        console.error("Excel import error:", err);
        toast.error("Failed to import from Excel: " + err.message);
      }
    };
    
    reader.onerror = (error) => {
      console.error("File reading error:", error);
      toast.error("Error reading Excel file.");
    };
    
    reader.readAsArrayBuffer(file);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Teacher Management</h2>
        <div className="d-flex gap-2">
          <button
            className="btn btn-danger"
            onClick={() => {
              setShowClearAllModal(true);
              setVerificationStep(1);
              setVerificationText('');
            }}
          >
            <i className="bi bi-trash me-2"></i>
            Clear All Teachers
          </button>
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
          <button 
            className="btn btn-warning fw-bold"
            onClick={() => {
              setShowImportForm(!showImportForm);
              setShowAddForm(false);
              setShowEditForm(false);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <i className="bi bi-file-earmark-spreadsheet"></i>
            {showImportForm ? 'Close Import' : 'Import'}
          </button>
        </div>
      </div>
    
    {error && (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    )}
      
      {showImportForm && (
         <div className="card mb-4 border-warning">
           <div className="card-header bg-warning bg-opacity-25 d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Import Teachers</h5>
           </div>
           <div className="card-body">
             <ul className="nav nav-tabs" id="importTabs" role="tablist">
               <li className="nav-item" role="presentation">
                 <button 
                   className={`nav-link ${activeTab === 'excel' ? 'active' : ''}`} 
                   id="excel-tab" 
                   onClick={() => handleTabChange('excel')}
                   type="button" 
                   role="tab" 
                   aria-controls="excel" 
                   aria-selected={activeTab === 'excel'}
                 >
                   <i className="bi bi-file-earmark-spreadsheet me-1"></i> Excel Import
                 </button>
               </li>
               <li className="nav-item" role="presentation">
                 <button 
                   className={`nav-link ${activeTab === 'photos' ? 'active' : ''}`} 
                   id="photos-tab" 
                   onClick={() => handleTabChange('photos')}
                   type="button" 
                   role="tab" 
                   aria-controls="photos" 
                   aria-selected={activeTab === 'photos'}
                 >
                   <i className="bi bi-folder-fill me-1"></i> Photo Directory
                 </button>
               </li>
             </ul>
             
             <div className="tab-content p-3 border border-top-0 rounded-bottom" id="importTabsContent">
               {/* Excel Import Tab */}
               <div 
                 className={`tab-pane fade ${activeTab === 'excel' ? 'show active' : ''}`} 
                 id="excel" 
                 role="tabpanel" 
                 aria-labelledby="excel-tab"
               >
                 <div className="row">
                   <div className="col-md-6">
                     <h5 className="mb-3">Batch Import via Excel</h5>
                     <div className="mb-3">
                       <label className="btn btn-primary d-flex align-items-center justify-content-center gap-2" style={{ maxWidth: '250px' }}>
                         <i className="bi bi-file-earmark-spreadsheet"></i> Select Excel File
                         <input
                           type="file"
                           accept=".xlsx, .xls"
                           style={{ display: 'none' }}
                           onChange={handleExcelUpload}
                         />
                       </label>
                     </div>
                     <div className="alert alert-info mt-3">
                       <i className="bi bi-info-circle me-2"></i>
                       <span>Use Excel for batch importing multiple teachers at once.</span>
                     </div>
                   </div>
                   <div className="col-md-6">
                     <h5 className="mb-3">Required Excel Format</h5>
                     <div className="table-responsive">
                       <table className="table table-bordered table-sm">
                         <thead className="table-light">
                           <tr>
                             <th>id</th>
                             <th>name</th>
                             <th>department</th>
                             <th>photo_url (optional)</th>
                           </tr>
                         </thead>
                         <tbody>
                           <tr>
                             <td>1001</td>
                             <td>John Smith</td>
                             <td>Mathematics</td>
                             <td></td>
                           </tr>
                           <tr>
                             <td>1002</td>
                             <td>Jane Doe</td>
                             <td>Science</td>
                             <td></td>
                           </tr>
                         </tbody>
                       </table>
                     </div>
                     <small className="text-muted">Headers must match exactly as shown above.</small>
                   </div>
                 </div>
               </div>
               
               {/* Photos Directory Tab */}
               <div 
                 className={`tab-pane fade ${activeTab === 'photos' ? 'show active' : ''}`} 
                 id="photos" 
                 role="tabpanel" 
                 aria-labelledby="photos-tab"
               >
                 <div className="card border-0 mb-4 shadow-sm rounded-3">
                   <div className="card-body p-5 text-center">
                     <div className="mb-3">
                       <button 
                         className="btn px-5 py-3 d-flex align-items-center gap-3 mx-auto shadow rounded-pill"
                         onClick={openTeachersFolder}
                         style={{
                           background: "linear-gradient(135deg, #4b6cb7 0%, #182848 100%)",
                           color: "white",
                           transition: "all 0.3s ease",
                         }}
                         onMouseOver={(e) => {
                           e.currentTarget.style.transform = "translateY(-2px)";
                           e.currentTarget.style.boxShadow = "0 8px 15px rgba(0, 0, 0, 0.2)";
                         }}
                         onMouseOut={(e) => {
                           e.currentTarget.style.transform = "translateY(0)";
                           e.currentTarget.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
                         }}
                       >
                         <i className="bi bi-folder-fill fs-4"></i> 
                         <span className="fw-semibold fs-5">Open Teachers Folder</span>
                       </button>
                       <div className="mt-3 text-muted">
                         <small className="d-block">
                           Default location: <span className="font-monospace bg-light px-2 py-1 rounded">/Users/MacBook/Desktop/Teachers</span>
                         </small>
                       </div>
                     </div>
                   </div>
                 </div>

                 <div className="alert alert-info bg-info bg-opacity-10 border-start border-info border-4 d-flex align-items-center my-4" role="alert">
                   <div className="rounded-circle bg-info p-2 d-flex align-items-center justify-content-center me-3" style={{width: "40px", height: "40px"}}>
                     <i className="bi bi-info-circle-fill text-white fs-5"></i>
                   </div>
                   <div>
                     <strong className="text-info">Important:</strong> The ID in the filename must match a teacher ID in your data to connect properly.
                     <p className="mb-0 mt-1">Use format: <span className="font-monospace bg-dark text-light px-2 py-1 rounded">TeacherID.jpg</span> (Examples: <span className="text-primary font-monospace">123.jpg</span> or <span className="text-primary font-monospace">CLN0526A.jpg</span>)</p>
                   </div>
                 </div>
               </div>
             </div>
           </div>
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
                            src={teacher.photo_url.startsWith('data:image') ? 
                              teacher.photo_url : 
                              (teacher.photo_url.startsWith('/') ? teacher.photo_url : `/${teacher.photo_url}`)} 
                            alt={teacher.name}
                            className="rounded-circle"
                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                            onError={(e) => {
                              console.error(`Error loading image for ${teacher.id}:`, e);
                              e.target.onerror = null;
                              e.target.src = 'https://via.placeholder.com/40?text=NA';
                            }}
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
      {showClearAllModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  {verificationStep === 1 ? 'Clear All Teachers - Step 1' : 'Clear All Teachers - Step 2'}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowClearAllModal(false);
                    setVerificationStep(1);
                    setVerificationText('');
                  }}
                ></button>
              </div>
              <div className="modal-body">
                {verificationStep === 1 ? (
                  <div>
                    <div className="alert alert-danger">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      <strong>Warning:</strong> This action will permanently delete all teachers from the system.
                    </div>
                    <p>Are you sure you want to proceed with clearing all teachers?</p>
                    <p>This action cannot be undone.</p>
                  </div>
                ) : (
                  <div>
                    <div className="alert alert-danger">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      <strong>Final Verification Required</strong>
                    </div>
                    <p>To confirm deletion of all teachers, please type:</p>
                    <p className="fw-bold text-danger mb-3">delete all teachers</p>
                    <input
                      type="text"
                      className="form-control"
                      value={verificationText}
                      onChange={(e) => setVerificationText(e.target.value)}
                      placeholder="Type the verification text"
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowClearAllModal(false);
                    setVerificationStep(1);
                    setVerificationText('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={async () => {
                    if (verificationStep === 1) {
                      setVerificationStep(2);
                      return;
                    }
                    if (verificationText.toLowerCase() !== 'delete all teachers') {
                      toast.error('Verification text does not match. Please try again.');
                      return;
                    }
                    try {
                      setLoading(true);
                      await clearAllTeachers();
                      toast.success('All teachers have been cleared successfully');
                      setShowClearAllModal(false);
                      setVerificationStep(1);
                      setVerificationText('');
                      fetchTeachers();
                    } catch (error) {
                      toast.error('Failed to clear all teachers: ' + error.message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Processing...
                    </>
                  ) : (
                    verificationStep === 1 ? 'Proceed to Verification' : 'Confirm Delete All'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherManagement; 