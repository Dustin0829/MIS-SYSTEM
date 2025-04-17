import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5123',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Authentication
export const login = async (id, password) => {
  try {
    const response = await api.post('/api/login', { id, password });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: 'Network error' };
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get('/api/me');
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: 'Network error' };
  }
};

// Teacher management
export const getTeachers = async () => {
  try {
    const response = await api.get('/api/teachers');
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: 'Network error' };
  }
};

export const createTeacher = async (teacherData) => {
  try {
    const response = await api.post('/api/teachers', teacherData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: 'Network error' };
  }
};

export const updateTeacher = async (id, teacherData) => {
  try {
    const response = await api.put(`/api/teachers/${id}`, teacherData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: 'Network error' };
  }
};

export const deleteTeacher = async (id) => {
  try {
    const response = await api.delete(`/api/teachers/${id}`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: 'Network error' };
  }
};

export const addTeacher = createTeacher; // Alias for createTeacher

// Key management
export const getKeys = async () => {
  try {
    const response = await api.get('/api/keys');
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: 'Network error' };
  }
};

export const createKey = async (keyData) => {
  try {
    const response = await api.post('/api/keys', keyData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: 'Network error' };
  }
};

export const deleteKey = async (keyId) => {
  try {
    const response = await api.delete(`/api/keys/${keyId}`);
    return response.data;
  } catch (error) {
    // Properly format the error message
    const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
    throw errorMessage;
  }
};

// Borrow and return operations
export const borrowKey = async (keyId) => {
  try {
    const response = await api.post('/api/borrow', { keyId });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: 'Network error' };
  }
};

export const returnKey = async (keyId) => {
  try {
    const response = await api.post('/api/return', { keyId });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: 'Network error' };
  }
};

// Transaction management
export const getTransactions = async () => {
  try {
    const response = await api.get('/api/transactions');
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: 'Network error' };
  }
};

export const getActiveTransactions = async () => {
  try {
    const response = await api.get('/api/transactions/active');
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: 'Network error' };
  }
};

export const getActiveBorrows = getActiveTransactions; // Alias for getActiveTransactions

// Dashboard data (admin only)
export const getDashboardData = async () => {
  try {
    const response = await api.get('/api/dashboard');
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: 'Network error' };
  }
};

export default api; 