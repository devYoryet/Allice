import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import BusinessListPage from './pages/BusinessListPage';
import BusinessDetailPage from './pages/BusinessDetailPage';
import BusinessFormPage from './pages/BusinessFormPage';
import MapPage from './pages/MapPage';
import UpcomingPage from './pages/UpcomingPage';
import ReportsPage from './pages/ReportsPage';
import OrdersPage from './pages/OrdersPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<BusinessListPage />} />
            <Route path="businesses/new" element={<BusinessFormPage />} />
            <Route path="businesses/:id" element={<BusinessDetailPage />} />
            <Route path="businesses/:id/edit" element={<BusinessFormPage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="upcoming" element={<UpcomingPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="orders" element={<OrdersPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
