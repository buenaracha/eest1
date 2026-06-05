// ============================================================
// Jerarquico.jsx — agrega ítem "Asignar personal" en el nav
// ============================================================

import { useState }     from 'react';
import { useNavigate }  from 'react-router-dom';
import Layout           from '../components/Layout';
import FormAgregarDocente from '../components/FormAgregarDocente';
import { useAuth }      from '../contexts/AuthContext';
import GestionCursos from '../components/GestionCursos';

const NAV_ITEMS = [
  { ruta: '/jerarquico',       icono: 'jerarquico', etiqueta: 'Conducción' },
  { ruta: '/asignar-personal', icono: 'admin',      etiqueta: 'Asignar personal' },
  { ruta: '/docente',          icono: 'docente',    etiqueta: 'Vista docente' },
  { ruta: '/preceptor',        icono: 'preceptor',  etiqueta: 'Vista preceptor' },
  { ruta: '/admin',            icono: 'admin',      etiqueta: 'Administración' },
];

const TABS = [
  { id: 'inicio',   label: '🏫 Panel' },
  { id: 'personal', label: '👤 Agregar personal' },
  { id: 'cursos' , label: '🏫 Gestión de cursos' },
];

export default function Jerarquico() {
  const { perfil }  = useAuth();
  const navigate    = useNavigate();
  const [tabActivo, setTabActivo] = useState('inicio');

  return (
    <Layout titulo="Equipo de Conducción" navItems={NAV_ITEMS}>

      <div className="tabs-barra">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${tabActivo === tab.id ? 'tab-btn--activo' : ''}`}
            onClick={() => setTabActivo(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabActivo === 'inicio' && (
        <div className="panel-bienvenida">
          <div className="panel-bienvenida__saludo">
            <h2>Bienvenido/a, {perfil?.nombre} {perfil?.apellido}</h2>
            <p>Accediste con permisos de <strong>Equipo de Conducción</strong>.</p>
          </div>

          <div className="tarjetas-grid">
            <div className="tarjeta tarjeta--proximamente">
              <div className="tarjeta__icono">📊</div>
              <h3>Estado general</h3>
              <p>Vista de carga de notas por curso y materia.</p>
              <span className="tarjeta__badge">Próximamente</span>
            </div>

            <div className="tarjeta" style={{ cursor: 'pointer' }}
              onClick={() => setTabActivo('personal')}>
              <div className="tarjeta__icono">👤</div>
              <h3>Agregar personal</h3>
              <p>Cargá un nuevo integrante al sistema.</p>
            </div>

            <div className="tarjeta" style={{ cursor: 'pointer' }}
              onClick={() => setTabActivo('cursos')}>
              <div className="tarjeta__icono">🏫</div>
              <h3>Gestión de cursos</h3>
              <p>Modificar cursos, asignar docentes a materias, asignar preceptores, definir cantidad de grupos.</p>
            </div>

            <div className="tarjeta tarjeta--proximamente">
              <div className="tarjeta__icono">📬</div>
              <h3>Envío de boletines</h3>
              <p>Generá y enviá los boletines a las familias.</p>
              <span className="tarjeta__badge">Próximamente</span>
            </div>

            <div className="tarjeta tarjeta--proximamente">
              <div className="tarjeta__icono">🔓</div>
              <h3>Desbloqueo de períodos</h3>
              <p>Revertí bloqueos para correcciones autorizadas.</p>
              <span className="tarjeta__badge">Próximamente</span>
            </div>

            <div className="tarjeta tarjeta--proximamente">
              <div className="tarjeta__icono">📜</div>
              <h3>Auditoría de cambios</h3>
              <p>Historial de modificaciones del sistema.</p>
              <span className="tarjeta__badge">Próximamente</span>
            </div>
          </div>
        </div>
      )}

      {tabActivo === 'personal' && (
        <div className="panel-seccion">
          <div className="panel-seccion__cabecera">
            <h3 className="panel-seccion__titulo">Agregar personal al sistema</h3>
            <p className="panel-seccion__desc">
              Los campos con * son obligatorios. Una vez agregado, la persona
              podrá ingresar con su correo institucional.
            </p>
          </div>
          <FormAgregarDocente />
        </div>
      )}

      {tabActivo === 'cursos' && (
        <GestionCursos />
      )}
    </Layout>
  );
}
