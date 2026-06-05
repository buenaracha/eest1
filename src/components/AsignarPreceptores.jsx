// ============================================================
// AsignarPreceptores.jsx
// ============================================================
// Muestra los preceptores asignados a un curso, separados
// en dos columnas: Teoría y Taller.
// Permite agregar y quitar preceptores de cada tipo.
//
// Firestore — por cada operación se actualizan DOS documentos:
//   personal/{email}  → cursos_preceptor_teoria/taller + roles
//   cursos/{id}       → preceptores_teoria/taller
// ============================================================

import { useState, useEffect, useRef } from 'react';
import {
  doc, getDoc, updateDoc, arrayUnion, arrayRemove,
  collection, getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';

// ── Buscador con autocompletado (local, no hace consultas extra) ──
function normalizar(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function BuscadorPersonal({ personal, excluidos, onSeleccionar, placeholder }) {
  const [texto,   setTexto]   = useState('');
  const [abierto, setAbierto] = useState(false);
  const [foco,    setFoco]    = useState(-1);
  const wrapRef               = useRef(null);

  const busqueda  = normalizar(texto);
  const resultados = texto.trim() === '' ? [] : personal.filter(p => {
    if (excluidos.includes(p.email)) return false;
    return (
      normalizar(p.apellido).includes(busqueda) ||
      normalizar(p.nombre).includes(busqueda)   ||
      normalizar(p.email).includes(busqueda)    ||
      normalizar(`${p.apellido} ${p.nombre}`).includes(busqueda)
    );
  });

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function seleccionar(p) {
    onSeleccionar(p);
    setTexto('');
    setAbierto(false);
    setFoco(-1);
  }

  function handleKeyDown(e) {
    if (!abierto || resultados.length === 0) return;
    if (e.key === 'ArrowDown')  { e.preventDefault(); setFoco(f => Math.min(f + 1, resultados.length - 1)); }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setFoco(f => Math.max(f - 1, 0)); }
    if (e.key === 'Enter' && foco >= 0) { e.preventDefault(); seleccionar(resultados[foco]); }
    if (e.key === 'Escape')     setAbierto(false);
  }

  return (
    <div className="buscador-docente" ref={wrapRef} style={{ position: 'relative' }}>
      <input
        className="buscador-docente__input"
        type="text"
        placeholder={placeholder || 'Buscar por apellido o nombre...'}
        value={texto}
        onChange={e => { setTexto(e.target.value); setAbierto(true); setFoco(-1); }}
        onFocus={() => { if (texto.trim()) setAbierto(true); }}
        onKeyDown={handleKeyDown}
      />
      {abierto && resultados.length > 0 && (
        <div className="buscador-docente__dropdown">
          {resultados.slice(0, 8).map((p, idx) => (
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
          {resultados.length > 8 && (
            <div className="buscador-docente__mas">+ {resultados.length - 8} más. Escribí más para filtrar.</div>
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

// ── Columna de un tipo (Teoría o Taller) ──────────────────────
function ColumnaPreceptor({ tipo, label, emailsAsignados, personal, cursoId, onCambio }) {
  const [agregando, setAgregando] = useState(false);
  const [procesando, setProcesando] = useState({}); // { email: bool }

  // Datos de los preceptores actualmente asignados
  const preceptoresActuales = emailsAsignados
    .map(email => personal.find(p => p.email === email))
    .filter(Boolean);

  const campoCurso    = tipo === 'teoria' ? 'cursos_preceptor_teoria' : 'cursos_preceptor_taller';
  const campoRol      = tipo === 'teoria' ? 'preceptor_teoria' : 'preceptor_taller';
  const campoCursos   = tipo === 'teoria' ? 'preceptores_teoria' : 'preceptores_taller';

  // ── Agregar preceptor ───────────────────────────────────────
  async function agregar(persona) {
    setProcesando(prev => ({ ...prev, [persona.email]: true }));
    try {
      // 1. Actualizar personal
      await updateDoc(doc(db, 'personal', persona.email), {
        [campoCurso]:           arrayUnion(cursoId),
        [`roles.${campoRol}`]:  true,
        'roles.preceptor':      true,
      });
      // 2. Actualizar cursos
      await updateDoc(doc(db, 'cursos', cursoId), {
        [campoCursos]: arrayUnion(persona.email),
      });
      onCambio();
      setAgregando(false);
    } catch (err) {
      console.error('Error agregando preceptor:', err);
    } finally {
      setProcesando(prev => ({ ...prev, [persona.email]: false }));
    }
  }

  // ── Quitar preceptor ────────────────────────────────────────
  async function quitar(persona) {
    setProcesando(prev => ({ ...prev, [persona.email]: true }));
    try {
      // 1. Actualizar personal (quitar este curso del array)
      const personalRef  = doc(db, 'personal', persona.email);
      const personalSnap = await getDoc(personalRef);
      const datos        = personalSnap.data();

      const cursosActualizados = (datos[campoCurso] || []).filter(c => c !== cursoId);
      const updates = { [campoCurso]: cursosActualizados };

      // Si ya no tiene ningún curso de este tipo, quitar el rol
      if (cursosActualizados.length === 0) {
        updates[`roles.${campoRol}`] = false;
        // Si tampoco tiene cursos del otro tipo, quitar preceptor general
        const otroTipo   = tipo === 'teoria' ? 'cursos_preceptor_taller' : 'cursos_preceptor_teoria';
        const otrosCursos = datos[otroTipo] || [];
        if (otrosCursos.length === 0) {
          updates['roles.preceptor'] = false;
        }
      }
      await updateDoc(personalRef, updates);

      // 2. Actualizar cursos
      await updateDoc(doc(db, 'cursos', cursoId), {
        [campoCursos]: arrayRemove(persona.email),
      });
      onCambio();
    } catch (err) {
      console.error('Error quitando preceptor:', err);
    } finally {
      setProcesando(prev => ({ ...prev, [persona.email]: false }));
    }
  }

  return (
    <div className="prec-columna">
      <h4 className="prec-columna__titulo">{label}</h4>

      {/* Lista de preceptores actuales */}
      <div className="prec-lista">
        {preceptoresActuales.length === 0 && (
          <p className="prec-vacio">Sin preceptor/a asignado/a</p>
        )}
        {preceptoresActuales.map(p => (
          <div key={p.email} className="prec-item">
            <div className="prec-item__info">
              <span className="prec-item__nombre">{p.apellido}, {p.nombre}</span>
              <span className="prec-item__email">{p.email}</span>
            </div>
            <button
              className="prec-item__quitar"
              onClick={() => quitar(p)}
              disabled={procesando[p.email]}
              title="Quitar preceptor/a"
            >
              {procesando[p.email] ? '⟳' : 'Quitar'}
            </button>
          </div>
        ))}
      </div>

      {/* Buscador para agregar */}
      <div className="prec-agregar">
        <BuscadorPersonal
          personal={personal}
          excluidos={emailsAsignados}
          onSeleccionar={agregar}
          placeholder="Buscar para agregar..."
        />
        <p className="prec-agregar__tip">Seleccioná de la lista para agregar</p>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function AsignarPreceptores({ cursoId }) {
  const [cargando,         setCargando]         = useState(true);
  const [personal,         setPersonal]         = useState([]);
  const [preceptoresTeo,   setPreceptoresTeo]   = useState([]);
  const [preceptoresTal,   setPreceptoresTal]   = useState([]);
  const [version,          setVersion]          = useState(0); // para recargar

  // ── Cargar datos ────────────────────────────────────────────
  useEffect(() => {
    async function cargar() {
      setCargando(true);
      try {
        const [cursoSnap, personalSnap] = await Promise.all([
          getDoc(doc(db, 'cursos', cursoId)),
          getDocs(collection(db, 'personal')),
        ]);

        const cursoData = cursoSnap.data() || {};
        setPreceptoresTeo(cursoData.preceptores_teoria || []);
        setPreceptoresTal(cursoData.preceptores_taller || []);

        const pers = personalSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => p.activo !== false)
          .sort((a, b) => (a.apellido || '').localeCompare(b.apellido || '', 'es'));
        setPersonal(pers);
      } catch (err) {
        console.error('Error cargando datos:', err);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [cursoId, version]);

  function recargar() { setVersion(v => v + 1); }

  if (cargando) {
    return (
      <div className="cargando-inline">
        <div className="spinner spinner--small" />
        <span>Cargando preceptores...</span>
      </div>
    );
  }

  return (
    <div className="prec-wrapper">
      <p className="panel-seccion__desc">
        Podés asignar más de un preceptor/a por tipo. Los cambios se aplican inmediatamente.
      </p>

      <div className="prec-columnas">
        <ColumnaPreceptor
          tipo="teoria"
          label="📖 Preceptor/a de Teoría"
          emailsAsignados={preceptoresTeo}
          personal={personal}
          cursoId={cursoId}
          onCambio={recargar}
        />

        <div className="prec-divisor" />

        <ColumnaPreceptor
          tipo="taller"
          label="🔧 Preceptor/a de Taller"
          emailsAsignados={preceptoresTal}
          personal={personal}
          cursoId={cursoId}
          onCambio={recargar}
        />
      </div>
    </div>
  );
}
