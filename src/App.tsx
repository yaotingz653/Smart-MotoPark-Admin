import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SpotManager from './pages/SpotManager';
import UserManager from './pages/UserManager';
import GridConfig from './pages/GridConfig';
import Layout from './components/Layout';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/spots" element={<SpotManager />} />
          <Route path="/users" element={<UserManager />} />
          <Route path="/grid" element={<GridConfig />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
