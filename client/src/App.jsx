import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Orders from './pages/Orders.jsx';
import Certificates from './pages/Certificates.jsx';
import Products from './pages/Products.jsx';
import Participants from './pages/Participants.jsx';
import Earnings from './pages/Earnings.jsx';
import BillTree from './pages/BillTree.jsx';
import Settings from './pages/Settings.jsx';

function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="certificates" element={<Certificates />} />
        <Route path="products" element={<Products />} />
        <Route path="participants" element={<Participants />} />
        <Route path="earnings" element={<Earnings />} />
        <Route path="bill-tree" element={<BillTree />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
