import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err.response?.data || err);
  }
);

// Auth
export const login = (data) => api.post('/auth/login', data);

// Customers
export const getCustomers   = (search) => api.get('/customers', { params: { search } });
export const getCustomer    = (id) => api.get(`/customers/${id}`);
export const createCustomer = (data) => api.post('/customers', data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);

// Orders
export const getOrders   = (params) => api.get('/orders', { params });
export const getOrder    = (id) => api.get(`/orders/${id}`);
export const createOrder = (data) => api.post('/orders', data);
export const updateOrder = (id, data) => api.put(`/orders/${id}`, data);
export const deleteOrder = (id) => api.delete(`/orders/${id}`);
export const checkSchedule = (date, orderId) =>
  api.get('/orders/schedule-check', { params: { date, orderId } });
export const addMenuDetail    = (orderId, data) => api.post(`/orders/${orderId}/menu-details`, data);
export const removeMenuDetail = (orderId, detailId) => api.delete(`/orders/${orderId}/menu-details/${detailId}`);

// Changes
export const getChanges = (orderId) => api.get(`/orders/${orderId}/changes`);
export const addChange  = (orderId, data) => api.post(`/orders/${orderId}/changes`, data);

// Labor
export const getLabor    = (orderId) => api.get(`/orders/${orderId}/labor`);
export const addLabor    = (orderId, data) => api.post(`/orders/${orderId}/labor`, data);
export const removeLabor = (orderId, laborId) => api.delete(`/orders/${orderId}/labor/${laborId}`);

// Menus
export const getMenus   = () => api.get('/menus');
export const createMenu = (data) => api.post('/menus', data);
export const updateMenu = (id, data) => api.put(`/menus/${id}`, data);
export const deleteMenu = (id) => api.delete(`/menus/${id}`);

// Dishes
export const getDishes   = () => api.get('/dishes');
export const createDish  = (data) => api.post('/dishes', data);
export const updateDish  = (id, data) => api.put(`/dishes/${id}`, data);
export const deleteDish  = (id) => api.delete(`/dishes/${id}`);

// Materials
export const getMaterials   = () => api.get('/materials');
export const createMaterial = (data) => api.post('/materials', data);
export const updateMaterial = (id, data) => api.put(`/materials/${id}`, data);
export const deleteMaterial = (id) => api.delete(`/materials/${id}`);

// Settlements
export const getSettlement  = (orderId) => api.get(`/orders/${orderId}/settlement`);
export const saveSettlement = (orderId, data) => api.post(`/orders/${orderId}/settlement`, data);

// Statistics
export const getStatistics = (params) => api.get('/statistics', { params });
