// ============================================================
// AsignarDocente.jsx — Módulo reutilizable
// ============================================================
// Muestra las materias de un curso y permite cambiar el docente
// asignado a cada una mediante un buscador con autocompletado.
// Ignora tildes, mayúsculas y diacríticos al buscar.
//
// Props:
//   cursoId    → ID del curso (ej: "2026_2_9_basica")
//   soloLectura → bool (opcional, default false)
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Normaliza para comparar ignorando tildes, mayúsculas, diacríticos
function normalizar(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// ── Buscador con autocompletado ───────────────────────────────
function BuscadorDocente({ personal, valorActual, onSeleccionar, disabled }) {
  const [texto,    setTexto]    = useState('');
  const [abierto,  setAbierto]  = useState(false);
  const [foco,     setFoco]     = useState(-1);
  const wrapperRef              = useRef(null);

  // Nombre del docente actual para mostrarlo
  const docenteActual = personal.find(p => p.email === valorActual);
  const nombreActual  = docenteActual
    ? `${docenteActual.apellido}, ${docenteActual.nombre}`
    : '';

  // Filtrar personal según lo que se escribe
  const textoBusqueda = normalizar(texto);
  const resultados = texto.trim() === '' ? [] : personal.filter(p => {
    const apellido = normalizar(p.apellido || '');
    const nombre   = normalizar(p.nombre   || '');
    const email    = normalizar(p.email    || '');
    return apellido.includes(textoBusqueda)
      || nombre.includes(textoBusqueda)
      || email.includes(textoBusqueda)
      || `${apellido} ${nombre}`.includes(textoBusqueda)
      || `${nombre} ${apellido}`.includes(textoBusqueda);
  });

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickFuera(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setAbierto(false);
      }
    }
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, []);

  function seleccionar(persona) {
    onSeleccionar(persona.email);
    setTexto('');
    setAbierto(false);
    setFoco(-1);
  }

  function limpiar() {
    onSeleccionar('');
    setTexto('');
  }

  function handleKeyDown(e) {
    if (!abierto || resultados.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setFoco(f => Math.min(f + 1, resultados.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setFoco(f => Math.max(f - 1, 0)); }
    if (e.key === 'Enter' && foco >= 0) { e.preventDefault(); seleccionar(resultados[foco]); }
    if (e.key === 'Escape') { setAbierto(false); setFoco(-1); }
  }

  if (disabled) {
    return (
      <span style={{ fontSize: 13, color: '#374151' }}>
        {nombreActual || <span style={{ color: '#9ca3af' }}>Sin asignar</span>}
      </span>
    );
  }

  return (
    <div className="buscador-docente" ref={wrapperRef}>
      {/* Docente actual */}
      <div className="buscador-docente__actual">
        {nombreActual
          ? <span className="buscador-docente__nombre-actual">{nombreActual}</span>
          : <span className="buscador-docente__sin-asignar">Sin asignar</span>
        }
        {valorActual && (
          <button className="buscador-docente__limpiar" onClick={limpiar} title="Quitar docente">✕</button>
        )}
      </div>

      {/* Input de búsqueda */}
      <div className="buscador-docente__input-wrapper">
        <input
          className="buscador-docente__input"
          type="text"
          placeholder="Buscar por apellido o nombre..."
          value={texto}
          onChange={e => { setTexto(e.target.value); setAbierto(true); setFoco(-1); }}
          onFocus={() => { if (texto.trim()) setAbierto(true); }}
          onKeyDown={handleKeyDown}
        />
        {texto && (
          <button className="buscador-docente__limpiar-input" onClick={() => { setTexto(''); setAbierto(false); }}>✕</button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {abierto && resultados.length > 0 && (
        <div className="buscador-docente__dropdown">
          {resultados.slice(0, 10).map((p, idx) => (
            <button
              key={p.email}
              className={`buscador-docente__opcion ${idx === foco ? 'buscador-docente__opcion--foco' : ''}`}
              onMouseDown={e => { e.preventDefault(); seleccionar(p); }}
              onMouseEnter={() => setFoco(idx)}
            >
              <span className="buscador-docente__opcion-nombre">{p.apellido}, {p.nombre}</span>
              <span className="buscador-docente__opcion-email">{p.email}</span>
            </button>
          ))}
          {resultados.length > 10 && (
            <div className="buscador-docente__mas">
              + {resultados.length - 10} resultados más. Escribí más para filtrar.
            </div>
          )}
        </div>
      )}

      {abierto && texto.trim() && resultados.length === 0 && (
        <div className="buscador-docente__dropdown">
          <div className="buscador-docente__vacio">Sin resultados para "{texto}"</div>
        </div>
      )}
    </div>
  );
}

// ── Fila de un dictado ────────────────────────────────────────
function FilaDictado({ dictado, personal, cursoId, soloLectura }) {
  const [docenteId, setDocenteId] = useState(dictado.docente_id || '');
  const [docenteGuardado, setDocenteGuardado] = useState(dictado.docente_id || '');
  const [estado,    setEstado]    = useState(null); // guardando | guardado | error

  async function guardar() {
    if (docenteId === docenteGuardado) return;
    setEstado('guardando');
    try {
      await updateDoc(doc(db, 'cursos', cursoId, 'dictados_materia', dictado.id), {
        docente_id:         docenteId || null,
        ultima_modificacion: serverTimestamp(),
      });
      setDocenteGuardado(docenteId);
      setEstado('guardado');
      setTimeout(() => setEstado(null), 2000);
    } catch (err) {
      console.error(err);
      setEstado('error');
    }
  }

  const cambio = docenteId !== docenteGuardado;

  return (
    <tr className="asignar-fila">
      <td className="asignar-td asignar-td--materia">
        <strong>{dictado.nombre_mostrar}</strong>
        {dictado.grupo && <span className="badge badge--grupo" style={{ marginLeft: 6 }}>{dictado.grupo}</span>}
      </td>
      <td className="asignar-td asignar-td--buscador">
        <BuscadorDocente
          personal={personal}
          valorActual={docenteId}
          onSeleccionar={setDocenteId}
          disabled={soloLectura}
        />
      </td>
      {!soloLectura && (
        <td className="asignar-td asignar-td--accion">
          <div className="asignar-accion">
            <button
              className={`btn-asignar ${cambio ? 'btn-asignar--activo' : ''}`}
              onClick={guardar}
              disabled={!cambio || estado === 'guardando'}
            >
              {estado === 'guardando' ? '⟳' : 'Actualizar'}
            </button>
            {estado === 'guardado' && <span className="celda__ok" style={{ fontSize: 14 }}>✓</span>}
            {estado === 'error'    && <span className="celda__error-ico" style={{ fontSize: 14 }}>✕</span>}
          </div>
        </td>
      )}
    </tr>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function AsignarDocente({ cursoId, soloLectura = false }) {
  const [dictados, setDictados] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      try {
        const [dictSnap, persSnap] = await Promise.all([
          getDocs(collection(db, 'cursos', cursoId, 'dictados_materia')),
          getDocs(collection(db, 'personal')),
        ]);
        const dictados = dictSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(d => d.activo !== false)
          .sort((a, b) => (a.nombre_mostrar || '').localeCompare(b.nombre_mostrar || '', 'es'));
        const personal = persSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => p.activo !== false)
          .sort((a, b) => (a.apellido || '').localeCompare(b.apellido || '', 'es'));
        setDictados(dictados);
        setPersonal(personal);
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    }
    if (cursoId) cargar();
  }, [cursoId]);

  if (cargando) {
    return <div className="cargando-inline"><div className="spinner spinner--small" /><span>Cargando...</span></div>;
  }

  if (dictados.length === 0) {
    return (
      <div className="aviso aviso--info">
        <span className="aviso__icono">ℹ️</span>
        <span>Este curso aún no tiene materias creadas.</span>
      </div>
    );
  }

  return (
    <div className="asignar-wrapper">
      {!soloLectura && (
        <p className="panel-seccion__desc" style={{ marginBottom: 12 }}>
          Buscá por apellido o nombre. Los cambios se confirman con el botón "Actualizar".
        </p>
      )}
      <div className="grilla-scroll">
        <table className="asignar-tabla">
          <thead>
            <tr>
              <th className="asignar-th asignar-th--materia">Materia</th>
              <th className="asignar-th">Docente asignado</th>
              {!soloLectura && <th className="asignar-th asignar-th--accion">Acción</th>}
            </tr>
          </thead>
          <tbody>
            {dictados.map(d => (
              <FilaDictado
                key={d.id}
                dictado={d}
                personal={personal}
                cursoId={cursoId}
                soloLectura={soloLectura}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
