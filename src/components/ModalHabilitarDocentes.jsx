// ============================================================
// ModalHabilitarDocentes.jsx — Asignar docentes a materias
// ============================================================
// El jerárquico selecciona un curso, ve las materias y puede
// cambiar el docente asignado a cada una.
// ============================================================

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db }                  from '../firebase';
import { formatearCursoId }    from '../utils/calificaciones';

export default function ModalHabilitarDocentes({ onCerrar }) {
  const [cursos,    setCursos]    = useState([]);
  const [cursoId,   setCursoId]   = useState('');
  const [dictados,  setDictados]  = useState([]);
  const [personal,  setPersonal]  = useState([]);
  const [cargando,  setCargando]  = useState(false);
  const [guardando, setGuardando] = useState({}); // { dictadoId: bool }
  const [guardados, setGuardados] = useState({}); // { dictadoId: bool }

  // ── Cargar cursos y personal ─────────────────────────────
  useEffect(() => {
    async function cargar() {
      setCargando(true);
      try {
        const [cursosSnap, personalSnap] = await Promise.all([
          getDocs(collection(db, 'cursos')),
          getDocs(collection(db, 'personal')),
        ]);
        const cursosData = cursosSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(c => c.activo)
          .sort((a, b) => a.anio !== b.anio ? a.anio - b.anio : a.division - b.division);

        const personalData = personalSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => p.activo && p.roles?.docente)
          .sort((a, b) => (a.apellido || '').localeCompare(b.apellido || '', 'es'));

        setCursos(cursosData);
        setPersonal(personalData);
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  // ── Cargar dictados del curso seleccionado ───────────────
  async function handleCursoChange(id) {
    setCursoId(id);
    setDictados([]);
    setGuardados({});
    if (!id) return;

    setCargando(true);
    try {
      const snap  = await getDocs(collection(db, 'cursos', id, 'dictados_materia'));
      const datos = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.nombre_mostrar || '').localeCompare(b.nombre_mostrar || '', 'es'));
      setDictados(datos);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }

  // ── Cambiar docente de un dictado ────────────────────────
  async function handleCambioDocente(dictadoId, nuevoEmail) {
    setGuardando(prev => ({ ...prev, [dictadoId]: true }));
    try {
      await updateDoc(doc(db, 'cursos', cursoId, 'dictados_materia', dictadoId), {
        docente_id: nuevoEmail || null,
      });
      setDictados(prev =>
        prev.map(d => d.id === dictadoId ? { ...d, docente_id: nuevoEmail || null } : d)
      );
      setGuardados(prev => ({ ...prev, [dictadoId]: true }));
      setTimeout(() => setGuardados(prev => ({ ...prev, [dictadoId]: false })), 2000);
    } catch (err) {
      console.error('Error guardando docente:', err);
    } finally {
      setGuardando(prev => ({ ...prev, [dictadoId]: false }));
    }
  }

  const nombreDocente = (email) => {
    if (!email) return '';
    const p = personal.find(x => x.email === email);
    return p ? `${p.apellido}, ${p.nombre}` : email;
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal--grande">
        <div className="modal__header">
          <h3 className="modal__titulo">👥 Habilitar docentes en materias</h3>
          <button className="modal__cerrar" onClick={onCerrar}>✕</button>
        </div>

        <div className="modal__cuerpo">
          {/* Selector de curso */}
          <div style={{ marginBottom: 20 }}>
            <label className="modal__label">Seleccioná un curso:</label>
            <select
              className="vista-curso__selector-select"
              style={{ width: '100%', marginTop: 6 }}
              value={cursoId}
              onChange={e => handleCursoChange(e.target.value)}
            >
              <option value="">— Elegir curso —</option>
              {cursos.map(c => (
                <option key={c.id} value={c.id}>{formatearCursoId(c.id)}</option>
              ))}
            </select>
          </div>

          {/* Lista de materias con selector de docente */}
          {cargando && (
            <div className="cargando-inline">
              <div className="spinner spinner--small" />
              <span>Cargando...</span>
            </div>
          )}

          {!cargando && cursoId && dictados.length === 0 && (
            <div className="aviso aviso--info">
              <span className="aviso__icono">ℹ️</span>
              <span>Este curso aún no tiene materias (dictados) creados.</span>
            </div>
          )}

          {dictados.length > 0 && (
            <div className="modal-dictados">
              <p className="modal__desc" style={{ marginBottom: 12 }}>
                Asigná un docente a cada materia. Los cambios se guardan inmediatamente.
              </p>
              {dictados.map(d => (
                <div key={d.id} className="modal-dictado-row">
                  <div className="modal-dictado-info">
                    <span className="modal-dictado-nombre">{d.nombre_mostrar}</span>
                    {d.grupo && <span className="badge badge--grupo">{d.grupo}</span>}
                  </div>
                  <div className="modal-dictado-selector">
                    <select
                      className="vista-curso__selector-select"
                      value={d.docente_id || ''}
                      onChange={e => handleCambioDocente(d.id, e.target.value)}
                      disabled={guardando[d.id]}
                    >
                      <option value="">— Sin asignar —</option>
                      {personal.map(p => (
                        <option key={p.id} value={p.email}>
                          {p.apellido}, {p.nombre}
                        </option>
                      ))}
                    </select>
                    {guardando[d.id] && <span className="celda__spinner" style={{ fontSize: 14 }}>⟳</span>}
                    {guardados[d.id] && <span className="celda__ok" style={{ fontSize: 14 }}>✓</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal__acciones">
          <div style={{ flex: 1 }} />
          <button className="btn btn--secundario" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
