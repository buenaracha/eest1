// ============================================================
// GestionCursos.jsx — Página de asignación de personal
// ============================================================
// Paso 1: Seleccionar curso (agrupado por año)
// Paso 2: Elegir qué asignar (Docentes o Preceptores)
// Paso 3: Usar el componente correspondiente
// ============================================================

import { useState, useEffect }  from 'react';
import { collection, getDocs }  from 'firebase/firestore';
import { db }                   from '../firebase';
import AsignarDocente           from '../components/AsignarDocente';
import AsignarPreceptores       from '../components/AsignarPreceptores';
import ConfigurarMaterias       from '../components/ConfigurarMaterias';
import { formatearCursoId }     from '../utils/calificaciones';

const ESPECIALIDAD_NOMBRE = {
  basica:       'Básica',
  electro:      'Electromecánica',
  electronica:  'Electrónica',
  quimica:      'Química',
};

// ── Selector de curso agrupado por año ────────────────────────
function SelectorCurso({ cursos, cursoActivo, onSeleccionar }) {
  // Agrupar por año
  const porAnio = cursos.reduce((acc, c) => {
    const k = c.anio || '?';
    if (!acc[k]) acc[k] = [];
    acc[k].push(c);
    return acc;
  }, {});

  const aniosOrdenados = Object.keys(porAnio).sort((a, b) => parseInt(a) - parseInt(b));

  return (
    <div className="selector-curso">
      {aniosOrdenados.map(anio => (
        <div key={anio} className="selector-curso__grupo">
          <h4 className="selector-curso__anio">{anio}° Año</h4>
          <div className="selector-curso__botones">
            {porAnio[anio]
              .sort((a, b) => a.division - b.division)
              .map(curso => {
                const espNombre = ESPECIALIDAD_NOMBRE[curso.especialidad_id] || curso.especialidad_id || '';
                const activo    = cursoActivo === curso.id;
                return (
                  <button
                    key={curso.id}
                    className={`selector-curso__btn ${activo ? 'selector-curso__btn--activo' : ''}`}
                    onClick={() => onSeleccionar(activo ? null : curso.id)}
                    title={`${anio}° ${curso.division}° ${espNombre}`}
                  >
                    <span className="selector-curso__btn-div">{curso.division}°</span>
                    <span className="selector-curso__btn-esp">{espNombre}</span>
                  </button>
                );
              })
            }
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function AsignarPersonal() {
  const [cursos,      setCursos]      = useState([]);
  const [cargando,    setCargando]    = useState(true);
  const [cursoActivo, setCursoActivo] = useState(null);
  const [seccion,     setSeccion]     = useState('docentes'); // 'docentes' | 'materias' | 'preceptores'

  // Cargar cursos activos
  useEffect(() => {
    async function cargar() {
      setCargando(true);
      try {
        const snap  = await getDocs(collection(db, 'cursos'));
        const datos = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(c => c.activo !== false);
        setCursos(datos);
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  function handleSeleccionarCurso(id) {
    setCursoActivo(id);
    setSeccion('docentes'); // resetear sección al cambiar curso
  }

  const cursoNombre = cursoActivo ? formatearCursoId(cursoActivo) : '';

  return (
       <>
        {/* ── Selector de curso ── */}
        {!cursoActivo && (
        <div className="panel-seccion" style={{ marginBottom: 24 }}>
          <div className="panel-seccion__cabecera">
            <h3 className="panel-seccion__titulo">Seleccioná un curso</h3>
            <p className="panel-seccion__desc">
              Hacé clic en un curso para asignarle docentes o preceptores.
            </p>
          </div>
  
          {cargando ? (
            <div className="cargando-inline">
              <div className="spinner spinner--small" />
              <span>Cargando cursos...</span>
            </div>
          ) : (
            <SelectorCurso
              cursos={cursos}
              cursoActivo={cursoActivo}
              onSeleccionar={handleSeleccionarCurso}
            />
          )}
        </div>
        )}
  
        {/* ── Panel de asignación (aparece al seleccionar un curso) ── */}
        {cursoActivo && (
          <div className="panel-seccion">
  
            {/* Cabecera con nombre del curso y tabs */}
            <div className="asignacion-cabecera">
              <div className="asignacion-cabecera__info">
                <h3 className="asignacion-cabecera__titulo">
                  {cursoNombre}
                </h3>
                <button
                  className="btn-volver asignacion-cabecera__cambiar"
                  onClick={() => setCursoActivo(null)}
                >
                  Cambiar curso
                </button>
              </div>
              <div className="tabs-barra" style={{ margin: 0 }}>
                <button
                  className={`tab-btn ${seccion === 'docentes' ? 'tab-btn--activo' : ''}`}
                  onClick={() => setSeccion('docentes')}
                >
                  👥 Docentes
                </button>
                <button
                  className={`tab-btn ${seccion === 'materias' ? 'tab-btn--activo' : ''}`}
                  onClick={() => setSeccion('materias')}
                >
                  📚 Materias
                </button>
                <button
                  className={`tab-btn ${seccion === 'preceptores' ? 'tab-btn--activo' : ''}`}
                  onClick={() => setSeccion('preceptores')}
                >
                  📋 Preceptores
                </button>
              </div>
            </div>
  
            {/* Contenido según sección */}
            <div style={{ marginTop: 20 }}>
              {seccion === 'docentes' && (
                <AsignarDocente cursoId={cursoActivo} />
              )}
              {seccion === 'materias' && (
                <ConfigurarMaterias cursoId={cursoActivo} />
              )}
              {seccion === 'preceptores' && (
                <AsignarPreceptores cursoId={cursoActivo} />
              )}
            </div>
  
          </div>
        )}
      </>
    );
}
