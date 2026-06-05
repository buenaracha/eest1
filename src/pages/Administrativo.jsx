// ============================================================
// Administrativo — Panel de gestión del sistema
// ============================================================

import Layout    from '../components/Layout';
import { useNavigate }  from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NAV_ITEMS = [
  { ruta: '/admin', icono: 'admin', etiqueta: 'Administración' },
  { ruta: '/asignar-personal', icono: 'admin',      etiqueta: 'Asignar personal' },
];

export default function Administrativo() {
  const { perfil } = useAuth();
  const navigate    = useNavigate();

  return (
    <Layout titulo="Administración del sistema" navItems={NAV_ITEMS}>
      <div className="panel-bienvenida">

        <div className="panel-bienvenida__saludo">
          <h2>Bienvenido/a, {perfil?.nombre} {perfil?.apellido}</h2>
          <p>Accediste al <strong>panel de administración</strong>.</p>
        </div>

        <div className="tarjetas-grid">

          <div className="tarjeta tarjeta--proximamente">
            <div className="tarjeta__icono">👤</div>
            <h3>Gestión de personal</h3>
            <p>Alta, baja y modificación de docentes, preceptores y personal directivo.</p>
            <span className="tarjeta__badge">Próximamente</span>
          </div>

          <div className="tarjeta" style={{ cursor: 'pointer' }}
            onClick={() => navigate('/asignar-personal')}>
            <div className="tarjeta__icono">🏫</div>
            <h3>Gestión de cursos</h3>
            <p>Modificar cursos, asignar docentes a materias, asignar preceptores, definir cantidad de grupos.</p>
          </div>

          <div className="tarjeta tarjeta--proximamente">
            <div className="tarjeta__icono">👥</div>
            <h3>Gestión de alumnos</h3>
            <p>Alta, baja, pase entre cursos y actualización de datos personales.</p>
            <span className="tarjeta__badge">Próximamente</span>
          </div>

          <div className="tarjeta tarjeta--proximamente">
            <div className="tarjeta__icono">📅</div>
            <h3>Inicio de año lectivo</h3>
            <p>Crear el nuevo ciclo lectivo copiando la estructura del año anterior.</p>
            <span className="tarjeta__badge">Próximamente</span>
          </div>

        </div>

      </div>
    </Layout>
  );
}
