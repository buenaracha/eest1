// ============================================================
// NoAutorizado — Pantalla cuando el correo no tiene acceso
// ============================================================

import { useNavigate } from 'react-router-dom';
import { useAuth }     from '../contexts/AuthContext';

export default function NoAutorizado() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="no-autorizado">
      <div className="no-autorizado__card">
        <div className="no-autorizado__icono">🔒</div>
        <h1>Sin acceso al sistema</h1>

        {user ? (
          <>
            <p>
              El correo <strong>{user.email}</strong> no está registrado
              en el sistema de calificaciones.
            </p>
            <p>
              Si creés que es un error, comunicate con el equipo directivo
              o con el administrador del sistema.
            </p>
            <button className="btn btn--primario" onClick={handleLogout}>
              Salir
            </button>
          </>
        ) : (
          <>
            <p>No tenés una sesión activa.</p>
            <button className="btn btn--primario" onClick={() => navigate('/login')}>
              Ir al inicio
            </button>
          </>
        )}
      </div>
    </div>
  );
}
