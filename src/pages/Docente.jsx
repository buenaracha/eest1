// ============================================================
// Docente.jsx — Panel del docente (versión 2)
// ============================================================
// Cambios respecto a versión anterior:
//   - Usa docente_id como fuente de verdad (collectionGroup query)
//   - Layout nuevo: agrupado por curso, con botón Vista del curso
//   - Solo muestra materias del docente logueado
//   - Integra el componente VistaCurso
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { collectionGroup, collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db }              from '../firebase';
import { useAuth }         from '../contexts/AuthContext';
import Layout              from '../components/Layout';
import GrillaCalificaciones from '../components/GrillaCalificaciones';
import VistaCurso          from '../components/VistaCurso';
import { etiquetaBloqueo, formatearCursoId } from '../utils/calificaciones';

const NAV_ITEMS = [
  { ruta: '/docente', icono: 'docente', etiqueta: 'Mis Cursos/Materias' },
];

function grupoNumero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') return valor;
  const match = String(valor).match(/G?(\d+)$/i);
  return match ? Number(match[1]) : null;
}

// ── Tarjeta de una materia ────────────────────────────────────
function TarjetaMateria({ asignacion, onAbrir }) {
  const { dictado, cantAlumnos } = asignacion;
  const nivel = dictado?.nivel_bloqueo || 0;

  return (
    <button className="tarjeta tarjeta--materia" onClick={() => onAbrir(asignacion)}>
      <div className="tarjeta__icono">📝</div>
      <div className="tarjeta__cuerpo">
        <h4>{dictado?.nombre_mostrar || asignacion.dictado_id}</h4>
        <div className="tarjeta__badges">
          {dictado?.grupo && (
            <span className="badge badge--grupo">{dictado.grupo}</span>
          )}
          <span className={`badge badge--bloqueo badge--bloqueo-${Math.min(nivel, 5)}`}>
            {etiquetaBloqueo(nivel)}
          </span>
        </div>
        <span className="tarjeta__alumnos">
          {cantAlumnos} alumno{cantAlumnos !== 1 ? 's' : ''}
        </span>
      </div>
      <span className="tarjeta__flecha">→</span>
    </button>
  );
}

// ── Panel principal ───────────────────────────────────────────
export default function Docente() {
  const { perfil } = useAuth();

  const [cargando,       setCargando]       = useState(true);
  const [error,          setError]          = useState(null);
  const [cursos,         setCursos]         = useState({}); // { cursoId: [asignaciones] }

  // Vista activa: null | { tipo: 'grilla', asignacion } | { tipo: 'curso', cursoId }
  const [vista,          setVista]          = useState(null);

  // Datos para la grilla
  const [alumnos,        setAlumnos]        = useState([]);
  const [calificaciones, setCalificaciones] = useState({});
  const [cargandoGrilla, setCargandoGrilla] = useState(false);

  // ── Cargar materias del docente ─────────────────────────
  useEffect(() => {
    async function cargar() {
      setCargando(true);
      setError(null);

      try {
        const email = perfil.email.toLowerCase();

        // Buscar todos los dictados donde docente_id == email
        // Requiere índice en Firestore (se crea automáticamente la primera vez)
        const q    = query(collectionGroup(db, 'dictados_materia'), where('docente_id', '==', email));
        const snap = await getDocs(q);

        if (snap.empty) {
          setCursos({});
          setCargando(false);
          return;
        }

        // Agrupar por curso y contar alumnos
        const porCurso = {};

        await Promise.all(snap.docs.map(async (dictadoDoc) => {
          // El path es: cursos/{cursoId}/dictados_materia/{dictadoId}
          const pathParts = dictadoDoc.ref.path.split('/');
          const cursoId   = pathParts[1];
          const dictadoId = pathParts[3];
          const dictado   = dictadoDoc.data();
          if (dictado.activo === false) return;

          // Contar alumnos del curso
          const inscSnap  = await getDocs(collection(db, 'cursos', cursoId, 'inscripciones'));
          let cantAlumnos  = inscSnap.size;

          // Si tiene grupo, contar solo los del grupo
          if (dictado.grupo) {
            const grupoDictado = grupoNumero(dictado.grupo);
            cantAlumnos = inscSnap.docs.filter(d => {
              return grupoNumero(d.data().grupo) === grupoDictado;
            }).length;
          }

          if (!porCurso[cursoId]) porCurso[cursoId] = [];
          porCurso[cursoId].push({ curso_id: cursoId, dictado_id: dictadoId, dictado, cantAlumnos });
        }));

        // Ordenar materias por nombre dentro de cada curso
        Object.values(porCurso).forEach(materias => {
          materias.sort((a, b) =>
            (a.dictado?.nombre_mostrar || '').localeCompare(b.dictado?.nombre_mostrar || '', 'es')
          );
        });

        setCursos(porCurso);

      } catch (err) {
        console.error(err);
        // Detectar si es un error por falta de índice en Firestore
        if (err.message?.includes('index')) {
          setError(
            `La consulta requiere un índice en Firestore. ` +
            `Buscá en la consola del navegador (F12) un link que dice "The query requires an index" ` +
            `y hacé clic en él para crearlo automáticamente. Tardará unos minutos y después recargá.`
          );
        } else {
          setError('Error al cargar tus materias. Intentá recargar la página.');
        }
      } finally {
        setCargando(false);
      }
    }

    if (perfil?.email) cargar();
  }, [perfil]);

  // ── Abrir grilla de una materia ─────────────────────────
  async function abrirGrilla(asignacion) {
    setCargandoGrilla(true);
    setVista({ tipo: 'grilla', asignacion });
    setAlumnos([]);
    setCalificaciones({});

    try {
      const { curso_id, dictado_id, dictado } = asignacion;

      // Leer alumnos
      const inscSnap  = await getDocs(collection(db, 'cursos', curso_id, 'inscripciones'));
      let alumnosData  = inscSnap.docs.map(d => d.data());

      // Filtrar por grupo si corresponde
      if (dictado?.grupo) {
        const grupoDictado = grupoNumero(dictado.grupo);
        alumnosData = alumnosData.filter(a => {
          return grupoNumero(a.grupo) === grupoDictado;
        });
      }

      alumnosData.sort((a, b) =>
        (a.apellido_nombre || '').localeCompare(b.apellido_nombre || '', 'es')
      );
      setAlumnos(alumnosData);

      // Leer calificaciones
      const calSnap = await getDocs(
        collection(db, 'cursos', curso_id, 'dictados_materia', dictado_id, 'calificaciones')
      );
      const calObj = {};
      calSnap.docs.forEach(d => { calObj[d.id] = d.data(); });
      setCalificaciones(calObj);

    } catch (err) {
      console.error(err);
      setError('Error al cargar las calificaciones.');
      setVista(null);
    } finally {
      setCargandoGrilla(false);
    }
  }

  // ── Actualizar calificación en estado local ─────────────
  const handleCalUpdate = useCallback((dni, nuevosValores) => {
    setCalificaciones(prev => ({
      ...prev,
      [dni]: { ...prev[dni], ...nuevosValores },
    }));
  }, []);

  // ── Título dinámico ─────────────────────────────────────
  const titulo = (() => {
    if (!vista) return 'Mis materias';
    if (vista.tipo === 'curso') return `Vista del curso — ${formatearCursoId(vista.cursoId)}`;
    return `${vista.asignacion.dictado?.nombre_mostrar} — ${formatearCursoId(vista.asignacion.curso_id)}`;
  })();

  return (
    <Layout titulo={titulo} navItems={NAV_ITEMS}>

      {/* Botón volver */}
      {vista && (
        <button className="btn-volver" onClick={() => { setVista(null); setError(null); }}>
          ← Volver a mis materias
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="aviso aviso--error">
          <span className="aviso__icono">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* Cargando lista */}
      {cargando && (
        <div className="cargando-inline">
          <div className="spinner spinner--small" />
          <span>Cargando tus materias...</span>
        </div>
      )}

      {/* ── Vista: Lista de mis materias ── */}
      {!cargando && !vista && (
        <>
          {Object.keys(cursos).length === 0 ? (
            <div className="aviso aviso--info">
              <span className="aviso__icono">ℹ️</span>
              <div>
                <strong>No tenés materias asignadas</strong>
                <p>Comunicate con el equipo directivo para que te asignen a tu materia.</p>
              </div>
            </div>
          ) : (
            Object.entries(cursos).map(([cursoId, materias]) => (
              <div key={cursoId} className="curso-bloque">
                {/* Título del curso + botón Vista del curso */}
                <div className="curso-bloque__cabecera">
                  <h3 className="curso-bloque__titulo">
                    📚 {formatearCursoId(cursoId)}
                  </h3>
                  <button
                    className="btn btn--vista-curso"
                    onClick={() => setVista({ tipo: 'curso', cursoId })}
                  >
                    👁 Vista del curso
                  </button>
                </div>

                {/* Separador */}
                <div className="curso-bloque__separador" />

                {/* Tarjetas de materias */}
                <div className="tarjetas-grid">
                  {materias.map(asig => (
                    <TarjetaMateria
                      key={asig.dictado_id}
                      asignacion={asig}
                      onAbrir={abrirGrilla}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* ── Vista: Cargando grilla ── */}
      {cargandoGrilla && (
        <div className="cargando-inline">
          <div className="spinner spinner--small" />
          <span>Cargando calificaciones...</span>
        </div>
      )}

      {/* ── Vista: Grilla de calificaciones ── */}
      {vista?.tipo === 'grilla' && !cargandoGrilla && (
        <GrillaCalificaciones
          cursoId={vista.asignacion.curso_id}
          dictadoId={vista.asignacion.dictado_id}
          dictado={vista.asignacion.dictado}
          alumnos={alumnos}
          calificaciones={calificaciones}
          onCalificacionUpdate={handleCalUpdate}
        />
      )}

      {/* ── Vista: Vista del curso ── */}
      {vista?.tipo === 'curso' && (
        <VistaCurso
          cursoId={vista.cursoId}
          onCerrar={() => setVista(null)}
        />
      )}

    </Layout>
  );
}
