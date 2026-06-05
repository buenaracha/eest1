// ============================================================
// Layout.jsx — con cambiador de rol y botones de acción
// ============================================================

import { useState }                    from 'react';
import { useNavigate, useLocation }    from 'react-router-dom';
import { useAuth }                     from '../contexts/AuthContext';
import ModalBoletines                  from './ModalBoletines';
import ModalHabilitarDocentes          from './ModalHabilitarDocentes';

function Icono({ nombre }) {
  const iconos = {
    docente: '📝', preceptor: '📋', jerarquico: '🏫',
    admin: '⚙️', logout: '🚪', menu: '☰', cerrar: '✕', usuario: '👤',
  };
  return <span className="icono">{iconos[nombre] || '•'}</span>;
}

// Rutas disponibles por rol
const RUTAS_POR_ROL = [
  { rol: 'jerarquico',     ruta: '/jerarquico',  label: 'Equipo de Conducción',      icono: '🏫' },
  { rol: 'preceptor',      ruta: '/preceptor',   label: 'Preceptor/a',    icono: '📋' },
  { rol: 'docente',        ruta: '/docente',      label: 'Docente',        icono: '📝' },
  { rol: 'administrativo', ruta: '/admin',        label: 'Administrativo', icono: '⚙️' },
];

export default function Layout({ titulo, children, navItems = [] }) {
  const { nombreMostrar, perfil, perfilReal, logout, impersonando } = useAuth();
  const navigate     = useNavigate();
  const location     = useLocation();
  const [menuAbierto,      setMenuAbierto]      = useState(false);
  const [modalBoletines,   setModalBoletines]   = useState(false);
  const [modalDocentes,    setModalDocentes]    = useState(false);

  async function handleLogout() { await logout(); navigate('/login'); }

  // Roles disponibles del usuario real (no impersonado)
  const rolesDisponibles = RUTAS_POR_ROL.filter(r => perfilReal?.roles?.[r.rol]);
  const tieneMultiplesRoles = rolesDisponibles.length > 1;

  // El jerárquico REAL (no impersonado) puede ver los botones de acción
  const esJerarquicoReal = !!perfilReal?.roles?.jerarquico;

  return (
    <div className={`layout ${impersonando ? 'layout--impersonando' : ''}`}>

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${menuAbierto ? 'sidebar--abierto' : ''}`}>
        <div className="sidebar__cabecera">
          <div className="sidebar__logo">
            <span className="sidebar__logo-texto">EEST N°1</span>
          </div>
          <p className="sidebar__subtitulo">Sistema de Calificaciones</p>
        </div>

        <nav className="sidebar__nav">
          {navItems.map(item => (
            <button
              key={item.ruta}
              className={`sidebar__nav-item ${location.pathname === item.ruta ? 'sidebar__nav-item--activo' : ''}`}
              onClick={() => { navigate(item.ruta); setMenuAbierto(false); }}
            >
              <Icono nombre={item.icono} />
              <span>{item.etiqueta}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar__pie">
          {/* Datos del usuario */}
          <div className="sidebar__usuario">
            <Icono nombre="usuario" />
            <div className="sidebar__usuario-info">
              <span className="sidebar__usuario-nombre">{nombreMostrar}</span>
              <span className="sidebar__usuario-rol">
                {perfil?.roles?.jerarquico     && 'Jerárquico'}
                {perfil?.roles?.preceptor      && !perfil?.roles?.jerarquico && 'Preceptor/a'}
                {perfil?.roles?.docente        && !perfil?.roles?.preceptor && !perfil?.roles?.jerarquico && 'Docente'}
                {perfil?.roles?.administrativo && !perfil?.roles?.jerarquico && 'Administrativo/a'}
              </span>
            </div>
          </div>

          {/* Cambiador de rol — solo si tiene varios */}
          {tieneMultiplesRoles && (
            <div className="sidebar__rol-switcher">
              <span className="sidebar__rol-label">Cambiar vista:</span>
              <div className="sidebar__rol-botones">
                {rolesDisponibles.map(r => (
                  <button
                    key={r.rol}
                    className={`sidebar__rol-btn ${location.pathname === r.ruta ? 'sidebar__rol-btn--activo' : ''}`}
                    onClick={() => { navigate(r.ruta); setMenuAbierto(false); }}
                    title={r.label}
                  >
                    {r.icono} {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Logout */}
          <button className="sidebar__logout" onClick={handleLogout}>
            <Icono nombre="logout" />
            <span>Salir</span>
          </button>
        </div>
      </aside>

      {menuAbierto && (
        <div className="sidebar__overlay" onClick={() => setMenuAbierto(false)} />
      )}

      {/* ── Área principal ── */}
      <main className="main">
        <header className="main__header">
          <button className="main__menu-btn" onClick={() => setMenuAbierto(!menuAbierto)}>
            <Icono nombre={menuAbierto ? 'cerrar' : 'menu'} />
          </button>
          <h1 className="main__titulo">{titulo}</h1>

          {/* Botones de acción para jerárquicos */}
          {esJerarquicoReal && (
            <div className="header-acciones">
              <button
                className="header-accion-btn"
                onClick={() => setModalDocentes(true)}
                title="Habilitar docentes en materias"
              >
                👥 Docentes
              </button>
              <button
                className="header-accion-btn header-accion-btn--principal"
                onClick={() => setModalBoletines(true)}
                title="Enviar boletines"
              >
                📬 Boletines
              </button>
            </div>
          )}
        </header>

        <div className="main__contenido">
          {children}
        </div>
      </main>

      {/* Modales */}
      {modalBoletines  && <ModalBoletines        onCerrar={() => setModalBoletines(false)}  />}
      {modalDocentes   && <ModalHabilitarDocentes onCerrar={() => setModalDocentes(false)}   />}
    </div>
  );
}
