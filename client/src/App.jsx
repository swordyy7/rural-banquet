import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Menus from './pages/Menus';
import Materials from './pages/Materials';
import Statistics from './pages/Statistics';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"   element={<Dashboard />} />
            <Route path="customers"   element={<Customers />} />
            <Route path="orders"      element={<Orders />} />
            <Route path="orders/:id"  element={<OrderDetail />} />
            <Route path="menus"       element={<Menus />} />
            <Route path="materials"   element={<Materials />} />
            <Route path="statistics"  element={<Statistics />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
