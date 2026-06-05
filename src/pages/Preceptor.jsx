// ============================================================
// Preceptor.jsx — con tab de Docentes (usa AsignarDocente)
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs }    from 'firebase/firestore';
import { db }                     from '../firebase';
import { useAuth }                from '../contexts/AuthContext';
import Layout                     from '../components/Layout';
import VistaCurso                 from '../components/VistaCurso';
import PanelInasistencias         from '../components/preceptor/PanelInasistencias';
import PanelCorreos               from '../components/preceptor/PanelCorreos';
import PanelBloqueo               from '../components/preceptor/PanelBloqueo';
import PanelGrupos                from '../components/preceptor/PanelGrupos';
import AsignarDocente             from '../components/AsignarDocente';
import { formatearCursoId }       from '../utils/calificaciones';

const NAV_ITEMS = [{ ruta: '/preceptor', icono: 'preceptor', etiqueta: 'Mis cursos' }];

const TABS = [
  { id: 'inasistencias', label: '📋 Inasistencias' },
  { id: 'correos',       label: '📧 Correos' },
  { id: 'grupos',        label: '🔧 Grupos' },
  { id: 'bloqueo',       label: '🔒 Bloqueo' },
  { id: 'docentes',      label: '👥 Docentes' },
  { id: 'vista',         label: '👁 Vista del curso' },
];

function SelectorCurso({ cursos, onSeleccionar }) {
  return (
    <div className="panel-bienvenida">
      <div className="panel-bienvenida__saludo">
        <h2>Seleccioná un curso</h2>
        <p>Tenés asignados {cursos.length} cursos.</p>
      </div>
      <div className="tarjetas-grid">
        {cursos.map(cursoId => (
          <button key={cursoId} className="tarjeta tarjeta--materia" onClick={() => onSeleccionar(cursoId)}>
            <div className="tarjeta__icono">🏫</div>
            <div className="tarjeta__cuerpo"><h4>{formatearCursoId(cursoId)}</h4></div>
            <span className="tarjeta__flecha">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Preceptor() {
  const { perfil } = useAuth();
  const [cursoActivo, setCursoActivo] = useState(null);
  const [tabActivo,   setTabActivo]   = useState('inasistencias');
  const [alumnos,     setAlumnos]     = useState([]);
  const [cargando,    setCargando]    = useState(false);
  const [error,       setError]       = useState(null);

  const cursosAsignados = useMemo(() => Array.from(new Set([
    ...(perfil?.cursos_preceptor_teoria || []),
    ...(perfil?.cursos_preceptor_taller || []),
    ...(perfil?.cursos_preceptor || []),
  ])).sort(), [perfil]);

  useEffect(() => {
    if (cursosAsignados.length === 1) setCursoActivo(cursosAsignados[0]);
  }, [cursosAsignados]);

  useEffect(() => {
    async function cargar() {
      if (!cursoActivo) return;
      setCargando(true);
      setError(null);
      try {
        const snap  = await getDocs(collection(db, 'cursos', cursoActivo, 'inscripciones'));
        const datos = snap.docs
          .map(d => d.data())
          .sort((a, b) => (a.apellido_nombre || '').localeCompare(b.apellido_nombre || '', 'es'));
        setAlumnos(datos);
      } catch (err) {
        setError('Error al cargar los alumnos.');
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [cursoActivo]);

  const tabsVisibles = TABS;

  return (
    <Layout titulo="Panel Preceptor/a" navItems={NAV_ITEMS}>

      {cursosAsignados.length === 0 && (
        <div className="aviso aviso--info">
          <span className="aviso__icono">ℹ️</span>
          <div>
            <strong>No tenés cursos asignados</strong>
            <p>Comunicate con el equipo directivo.</p>
          </div>
        </div>
      )}

      {cursosAsignados.length > 1 && !cursoActivo && (
        <SelectorCurso cursos={cursosAsignados} onSeleccionar={setCursoActivo} />
      )}

      {cursoActivo && (
        <>
          <div className="preceptor-cabecera">
            <div className="preceptor-cabecera__info">
              <h2 className="preceptor-cabecera__titulo">{formatearCursoId(cursoActivo)}</h2>
              <span className="preceptor-cabecera__alumnos">{alumnos.length} alumnos</span>
            </div>
            {cursosAsignados.length > 1 && (
              <button className="btn-volver" style={{ margin: 0 }} onClick={() => { setCursoActivo(null); setAlumnos([]); }}>
                ← Cambiar curso
              </button>
            )}
          </div>

          <div className="tabs-barra">
            {tabsVisibles.map(tab => (
              <button
                key={tab.id}
                className={`tab-btn ${tabActivo === tab.id ? 'tab-btn--activo' : ''}`}
                onClick={() => setTabActivo(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error && <div className="aviso aviso--error"><span className="aviso__icono">⚠️</span><span>{error}</span></div>}

          {cargando && <div className="cargando-inline"><div className="spinner spinner--small" /><span>Cargando alumnos...</span></div>}

          {!cargando && (
            <>
              {tabActivo === 'inasistencias' && <PanelInasistencias cursoId={cursoActivo} alumnos={alumnos} />}
              {tabActivo === 'correos'       && <PanelCorreos alumnos={alumnos} />}
              {tabActivo === 'bloqueo'       && <PanelBloqueo cursoId={cursoActivo} />}
              {tabActivo === 'docentes'      && (
                <div className="panel-seccion">
                  <div className="panel-seccion__cabecera">
                    <h3 className="panel-seccion__titulo">Docentes del curso</h3>
                    <p className="panel-seccion__desc">
                      Podés cambiar el docente asignado a cada materia. Buscá por apellido o nombre.
                    </p>
                  </div>
                  <AsignarDocente cursoId={cursoActivo} />
                </div>
              )}
              {tabActivo === 'vista'         && <VistaCurso cursoId={cursoActivo} />}
              {tabActivo === 'grupos'        && <PanelGrupos cursoId={cursoActivo} alumnos={alumnos} />}
            </>
          )}
        </>
      )}
    </Layout>
  );
}
