import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './shared/hooks/useAuth';
import { ToastProvider } from './shared/components/Toast';
import { AppLayout } from './shared/layouts/AppLayout';
import { PageLoading } from './shared/components/Loading';
import { LoginPage } from './features/auth/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { StorePage } from './features/store/StorePage';
import { ProductsPage } from './features/products/ProductsPage';
import { BasketsPage } from './features/baskets/BasketsPage';
import { VenderPage } from './features/sales/VenderPage';
import { HistoricoPage } from './features/sales/HistoricoPage';
import { AgendaPage } from './features/deliveries/AgendaPage';
import { DespesasPage } from './features/stock/DespesasPage';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { firebaseUser, loading } = useAuth();
  if (loading) return <PageLoading />;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const StoreRequiredRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoading />;
  if (!user?.storeId) return <Navigate to="/store" replace />;
  return <>{children}</>;
};

const NoStoreRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoading />;
  if (user?.storeId) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { firebaseUser, loading } = useAuth();
  if (loading) return <PageLoading />;

  return (
    <Routes>
      <Route path="/login" element={firebaseUser ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/store"
          element={
            <NoStoreRoute>
              <StorePage />
            </NoStoreRoute>
          }
        />
        <Route
          path="/"
          element={
            <StoreRequiredRoute>
              <DashboardPage />
            </StoreRequiredRoute>
          }
        />
        <Route
          path="/estoque"
          element={
            <StoreRequiredRoute>
              <Navigate to="/estoque/produtos" replace />
            </StoreRequiredRoute>
          }
        />
        <Route
          path="/estoque/produtos"
          element={
            <StoreRequiredRoute>
              <ProductsPage />
            </StoreRequiredRoute>
          }
        />
        <Route
          path="/estoque/cestas"
          element={
            <StoreRequiredRoute>
              <BasketsPage />
            </StoreRequiredRoute>
          }
        />
        <Route
          path="/financeiro"
          element={
            <StoreRequiredRoute>
              <Navigate to="/financeiro/despesas" replace />
            </StoreRequiredRoute>
          }
        />
        <Route
          path="/financeiro/despesas"
          element={
            <StoreRequiredRoute>
              <DespesasPage />
            </StoreRequiredRoute>
          }
        />
        <Route
          path="/vender"
          element={
            <StoreRequiredRoute>
              <VenderPage />
            </StoreRequiredRoute>
          }
        />
        <Route
          path="/agenda"
          element={
            <StoreRequiredRoute>
              <AgendaPage />
            </StoreRequiredRoute>
          }
        />
        <Route
          path="/historico"
          element={
            <StoreRequiredRoute>
              <HistoricoPage />
            </StoreRequiredRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => (
  <BrowserRouter basename="/minha_loja_online">
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
