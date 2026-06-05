// ============================================================
// ModalBoletines.jsx — Envío de boletines por período
// ============================================================
// Permite al jerárquico seleccionar curso, período y alumnos
// para enviar los boletines por correo.
// La generación de PDF y envío de mail se implementa en Etapa 5.
// ============================================================

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db }                  from '../firebase';
import { PERIODOS_TODOS, formatearCursoId } from '../utils/calificaciones';

const AÑO_LECTIVO = '2026';

export default function ModalBoletines({ onCerrar }) {
  const [paso,         setPaso]         = useState(1); // 1=curso, 2=periodo, 3=alumnos
  const [cursos,       setCursos]       = useState([]);
  const [cursoId,      setCursoId]      = useState('');
  const [periodo,      setPeriodo]      = useState('C1');
  const [alumnos,      setAlumnos]      = useState([]);
  const [seleccionados,setSeleccionados]= useState(new Set());
  const [cargando,     setCargando]     = useState(false);
  const [enviando,     setEnviando]     = useState(false);

  // ── Cargar lista de cursos ───────────────────────────────
  useEffect(() => {
    async function cargar() {
      setCargando(true);
      try {
        const snap  = await getDocs(collection(db, 'cursos'));
        const datos = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(c => c.activo)
          .sort((a, b) => {
            if (a.anio !== b.anio) return a.anio - b.anio;
            return a.division - b.division;
          });
        setCursos(datos);
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  // ── Cargar alumnos del curso seleccionado ────────────────
  async function cargarAlumnos(id) {
    setCargando(true);
    try {
      const snap  = await getDocs(collection(db, 'cursos', id, 'inscripciones'));
      const datos = snap.docs
        .map(d => d.data())
        .filter(a => !a.fecha_baja)
        .sort((a, b) => (a.apellido_nombre || '').localeCompare(b.apellido_nombre || '', 'es'));
      setAlumnos(datos);
      // Pre-seleccionar todos
      setSeleccionados(new Set(datos.map(a => a.dni)));
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }

  function toggleAlumno(dni) {
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(dni)) next.delete(dni); else next.add(dni);
      return next;
    });
  }

  function toggleTodos() {
    if (seleccionados.size === alumnos.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(alumnos.map(a => a.dni)));
    }
  }

  // ── Simular envío (Etapa 5) ──────────────────────────────
  async function handleEnviar() {
    setEnviando(true);
    // TODO Etapa 5: generar PDF por alumno y enviar por mail
    await new Promise(r => setTimeout(r, 1500)); // simular
    setEnviando(false);
    alert(`✅ Función próximamente disponible.\n\nSe enviarían boletines de:\nCurso: ${formatearCursoId(cursoId)}\nPeríodo: ${PERIODOS_TODOS.find(p=>p.value===periodo)?.label}\nAlumnos: ${seleccionados.size}`);
  }

  const periodoLabel = PERIODOS_TODOS.find(p => p.value === periodo)?.label;

  return (
    <div className="modal-overlay">
      <div className="modal modal--grande">
        <div className="modal__header">
          <h3 className="modal__titulo">📬 Enviar boletines</h3>
          <button className="modal__cerrar" onClick={onCerrar}>✕</button>
        </div>

        {/* Indicador de pasos */}
        <div className="modal-pasos">
          {['Curso', 'Período', 'Alumnos'].map((label, i) => (
            <div key={i} className={`modal-paso ${paso > i + 1 ? 'modal-paso--completo' : ''} ${paso === i + 1 ? 'modal-paso--activo' : ''}`}>
              <span className="modal-paso__num">{paso > i + 1 ? '✓' : i + 1}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="modal__cuerpo">

          {/* Paso 1: Seleccionar curso */}
          {paso === 1 && (
            <div>
              <p className="modal__desc">Seleccioná el curso para enviar los boletines:</p>
              {cargando ? (
                <div className="cargando-inline"><div className="spinner spinner--small" /><span>Cargando cursos...</span></div>
              ) : (
                <div className="modal-lista-cursos">
                  {cursos.map(curso => (
                    <button
                      key={curso.id}
                      className={`modal-opcion ${cursoId === curso.id ? 'modal-opcion--activo' : ''}`}
                      onClick={() => setCursoId(curso.id)}
                    >
                      {formatearCursoId(curso.id)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Paso 2: Seleccionar período */}
          {paso === 2 && (
            <div>
              <p className="modal__desc">Seleccioná el período a enviar:</p>
              <div className="modal-lista-cursos">
                {PERIODOS_TODOS.map(p => (
                  <button
                    key={p.value}
                    className={`modal-opcion ${periodo === p.value ? 'modal-opcion--activo' : ''}`}
                    onClick={() => setPeriodo(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Paso 3: Seleccionar alumnos */}
          {paso === 3 && (
            <div>
              <div className="modal__subtitulo-row">
                <p className="modal__desc">
                  Período: <strong>{periodoLabel}</strong> · Curso: <strong>{formatearCursoId(cursoId)}</strong>
                </p>
                <button className="btn btn--secundario" style={{ padding: '4px 12px', fontSize: 12 }} onClick={toggleTodos}>
                  {seleccionados.size === alumnos.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
              </div>

              {cargando ? (
                <div className="cargando-inline"><div className="spinner spinner--small" /><span>Cargando alumnos...</span></div>
              ) : (
                <div className="modal-lista-alumnos">
                  {alumnos.map(alumno => (
                    <label key={alumno.dni} className="modal-alumno">
                      <input
                        type="checkbox"
                        checked={seleccionados.has(alumno.dni)}
                        onChange={() => toggleAlumno(alumno.dni)}
                      />
                      <span>{alumno.apellido_nombre}</span>
                    </label>
                  ))}
                </div>
              )}

              <p className="modal__conteo">
                {seleccionados.size} de {alumnos.length} alumnos seleccionados
              </p>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="modal__acciones">
          {paso > 1 && (
            <button className="btn btn--secundario" onClick={() => setPaso(p => p - 1)}>
              ← Atrás
            </button>
          )}
          <div style={{ flex: 1 }} />
          {paso < 3 ? (
            <button
              className="btn btn--primario"
              disabled={paso === 1 && !cursoId}
              onClick={async () => {
                if (paso === 2) await cargarAlumnos(cursoId);
                setPaso(p => p + 1);
              }}
            >
              Siguiente →
            </button>
          ) : (
            <button
              className="btn btn--primario"
              disabled={seleccionados.size === 0 || enviando}
              onClick={handleEnviar}
            >
              {enviando ? 'Procesando...' : `📬 Enviar ${seleccionados.size} boletín${seleccionados.size !== 1 ? 'es' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
