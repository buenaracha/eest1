// ============================================================
// App.jsx — agrega ruta /asignar-personal
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth }                   from './contexts/AuthContext';
import ImpersonateBar                               from './components/ImpersonateBar';

import Login           from './pages/Login';
import NoAutorizado    from './pages/NoAutorizado';
import Docente         from './pages/Docente';
import Preceptor       from './pages/Preceptor';
import Jerarquico      from './pages/Jerarquico';
import Administrativo  from './pages/Administrativo';
import AsignarPersonal from './components/AsignarPersonal';

function Cargando() {
  return (
    <div className="pantalla-carga">
      <div className="spinner" />
      <p>Cargando...</p>
    </div>
  );
}

function RutaProtegida({ children, rolesPermitidos }) {
  const { user, perfil, loading } = useAuth();
  if (loading)  return <Cargando />;
  if (!user)    return <Navigate to="/login"         replace />;
  if (!perfil)  return <Navigate to="/no-autorizado" replace />;
  const tieneRol = rolesPermitidos.some(rol => perfil.roles?.[rol]);
  if (!tieneRol) return <Navigate to="/no-autorizado" replace />;
  return children;
}

function RedirigirSegunRol() {
  const { perfil, loading } = useAuth();
  if (loading) return <Cargando />;
  if (!perfil) return <Navigate to="/no-autorizado" replace />;
  const { roles } = perfil;
  if (roles?.jerarquico)     return <Navigate to="/jerarquico"  replace />;
  if (roles?.administrativo) return <Navigate to="/admin"       replace />;
  if (roles?.preceptor)      return <Navigate to="/preceptor"   replace />;
  if (roles?.docente)        return <Navigate to="/docente"     replace />;
  return <Navigate to="/no-autorizado" replace />;
}

function AppContent() {
  const { user, esJerarquico, impersonando } = useAuth();
  return (
    <>
      {(esJerarquico || impersonando) && <ImpersonateBar />}
      <Routes>
        <Route path="/login"         element={<Login />} />
        <Route path="/no-autorizado" element={<NoAutorizado />} />
        <Route path="/" element={user ? <RedirigirSegunRol /> : <Navigate to="/login" replace />} />

        <Route path="/docente" element={
          <RutaProtegida rolesPermitidos={['docente','jerarquico']}>
            <Docente />
          </RutaProtegida>
        }/>
        <Route path="/preceptor" element={
          <RutaProtegida rolesPermitidos={['preceptor','jerarquico']}>
            <Preceptor />
          </RutaProtegida>
        }/>
        <Route path="/jerarquico" element={
          <RutaProtegida rolesPermitidos={['jerarquico']}>
            <Jerarquico />
          </RutaProtegida>
        }/>
        <Route path="/admin" element={
          <RutaProtegida rolesPermitidos={['administrativo','jerarquico']}>
            <Administrativo />
          </RutaProtegida>
        }/>
        {/* Nueva ruta */}
        <Route path="/asignar-personal" element={
          <RutaProtegida rolesPermitidos={['jerarquico']}>
            <AsignarPersonal />
          </RutaProtegida>
        }/>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
