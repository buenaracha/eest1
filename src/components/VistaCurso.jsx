// ============================================================
// VistaCurso.jsx — Vista de curso por período (solo lectura)
// Actualización: colores nuevos, resumen con 4 categorías
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs }              from 'firebase/firestore';
import { db }                               from '../firebase';
import { PERIODOS_TODOS, clasificarValor, formatearCursoId, VALOR_AUSENTE } from '../utils/calificaciones';

// ── Celda coloreada ───────────────────────────────────────────
function CeldaVista({ campo, valor }) {
  const clase = clasificarValor(campo, valor);
  return (
    <td className={`vista-celda vista-celda--${clase}`}>
      {valor ?? ''}
    </td>
  );
}

// ── Resumen de una materia para el período ────────────────────
function ResumenMateria({ dictado, alumnos, calDictado, periodo }) {
  let altos = 0, medios = 0, bajos = 0, ausentes = 0, sinCargar = 0;

  alumnos.forEach(al => {
    const v = calDictado?.[al.dni]?.[periodo];
    if (v === null || v === undefined) {
      sinCargar++;
    } else if (v === VALOR_AUSENTE) {
      ausentes++;
    } else {
      const cat = clasificarValor(periodo, v);
      if (cat === 'alto')  altos++;
      else if (cat === 'medio') medios++;
      else if (cat === 'bajo')  bajos++;
      else sinCargar++;
    }
  });

  return (
    <div className="vista-resumen__card">
      <div className="vista-resumen__materia">
        {dictado.nombre_mostrar}
        {dictado.grupo && <span className="badge badge--grupo">{dictado.grupo}</span>}
      </div>
      <div className="vista-resumen__stats">
        {altos    > 0 && <span className="stat stat--alto"   title="TEA / 7 a 10">✓ {altos}</span>}
        {medios   > 0 && <span className="stat stat--medio"  title="TEP / 4 a 6">~ {medios}</span>}
        {bajos    > 0 && <span className="stat stat--bajo"   title="TED / 0 a 3">✗ {bajos}</span>}
        {ausentes > 0 && <span className="stat stat--ausente" title="Ausentes">A {ausentes}</span>}
        {sinCargar> 0 && <span className="stat stat--sin-cargar" title="Sin cargar">? {sinCargar}</span>}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function VistaCurso({ cursoId, onCerrar }) {
  const [periodo,     setPeriodo]     = useState('C1');
  const [cargando,    setCargando]    = useState(true);
  const [error,       setError]       = useState(null);
  const [alumnos,     setAlumnos]     = useState([]);
  const [dictados,    setDictados]    = useState([]);
  const [cache,       setCache]       = useState({});
  const [cargandoCal, setCargandoCal] = useState(false);

  // ── Cargar estructura (una sola vez) ─────────────────────
  useEffect(() => {
    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const [inscSnap, dictSnap] = await Promise.all([
          getDocs(collection(db, 'cursos', cursoId, 'inscripciones')),
          getDocs(collection(db, 'cursos', cursoId, 'dictados_materia')),
        ]);

        const alumnosData = inscSnap.docs
          .map(d => d.data())
          .sort((a, b) => (a.apellido_nombre || '').localeCompare(b.apellido_nombre || '', 'es'));

        const dictadosData = dictSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(d => d.activo !== false)
          .sort((a, b) => (a.nombre_mostrar || '').localeCompare(b.nombre_mostrar || '', 'es'));

        setAlumnos(alumnosData);
        setDictados(dictadosData);

        // Pre-cargar calificaciones del período por defecto
        await cargarCalificaciones(dictadosData, {});
      } catch (err) {
        console.error(err);
        setError('Error al cargar los datos del curso.');
      } finally {
        setCargando(false);
      }
    }
    if (cursoId) cargar();
  }, [cursoId]);

  // ── Cargar calificaciones (con caché) ────────────────────
  const cargarCalificaciones = useCallback(async (dictadosActuales, cacheActual) => {
    const faltantes = dictadosActuales.filter(d => !cacheActual[d.id]);
    if (faltantes.length === 0) return;

    setCargandoCal(true);
    try {
      const nuevaCache = { ...cacheActual };
      await Promise.all(faltantes.map(async d => {
        const snap = await getDocs(
          collection(db, 'cursos', cursoId, 'dictados_materia', d.id, 'calificaciones')
        );
        const obj = {};
        snap.docs.forEach(doc => { obj[doc.id] = doc.data(); });
        nuevaCache[d.id] = obj;
      }));
      setCache(nuevaCache);
    } catch (err) {
      console.error('Error cargando calificaciones:', err);
    } finally {
      setCargandoCal(false);
    }
  }, [cursoId]);

  async function handleCambioPeriodo(nuevo) {
    setPeriodo(nuevo);
    await cargarCalificaciones(dictados, cache);
  }

  // ── Render ────────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="vista-curso">
        <div className="cargando-inline">
          <div className="spinner spinner--small" />
          <span>Cargando vista del curso...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vista-curso">
        <div className="aviso aviso--error">
          <span className="aviso__icono">⚠️</span>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const periodoInfo = PERIODOS_TODOS.find(p => p.value === periodo);

  return (
    <div className="vista-curso">

      {/* Cabecera */}
      <div className="vista-curso__cabecera">
        <div className="vista-curso__titulo-grupo">
          {onCerrar && (
            <button className="btn-volver" onClick={onCerrar}>← Volver</button>
          )}
          <div>
            <h2 className="vista-curso__titulo">
              Vista del curso — {formatearCursoId(cursoId)}
            </h2>
            <p className="vista-curso__subtitulo">
              Solo lectura · {alumnos.length} alumnos · {dictados.length} materias
            </p>
          </div>
        </div>

        <div className="vista-curso__selector">
          <label className="vista-curso__selector-label">Período:</label>
          <select
            className="vista-curso__selector-select"
            value={periodo}
            onChange={e => handleCambioPeriodo(e.target.value)}
          >
            {PERIODOS_TODOS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          {cargandoCal && <div className="spinner spinner--small" />}
        </div>
      </div>

      {/* Leyenda */}
      <div className="vista-leyenda">
        <span className="vista-leyenda__item vista-leyenda__item--alto">✓ TEA / 7 a 10</span>
        <span className="vista-leyenda__item vista-leyenda__item--medio">~ TEP / 4 a 6</span>
        <span className="vista-leyenda__item vista-leyenda__item--bajo">✗ TED / 0 a 3</span>
        <span className="vista-leyenda__item vista-leyenda__item--bajo">A Ausente</span>
        <span className="vista-leyenda__item vista-leyenda__item--no-aplica">— No aplica</span>
        <span className="vista-leyenda__item vista-leyenda__item--vacia">Sin cargar</span>
      </div>

      {/* Tabla */}
      <div className="grilla-scroll">
        <table className="vista-tabla">
          <thead>
            <tr>
              <th className="vista-th vista-th--nombre">Apellido y Nombre</th>
              {dictados.map(d => (
                <th key={d.id} className="vista-th" title={d.nombre_mostrar}>
                  <div className="vista-th__nombre">{d.nombre_mostrar}</div>
                  {d.grupo && <div className="vista-th__grupo">{d.grupo}</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alumnos.map(alumno => (
              <tr key={alumno.dni} className="fila-alumno">
                <td className="celda celda--nombre">{alumno.apellido_nombre}</td>
                {dictados.map(d => {
                  const valor = cache[d.id]?.[alumno.dni]?.[periodo] ?? null;
                  return <CeldaVista key={d.id} campo={periodo} valor={valor} />;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resumen del período */}
      <div className="vista-resumen">
        <h3 className="vista-resumen__titulo">
          Resumen — {periodoInfo?.label}
        </h3>
        <div className="vista-resumen__grilla">
          {dictados.map(d => (
            <ResumenMateria
              key={d.id}
              dictado={d}
              alumnos={alumnos}
              calDictado={cache[d.id]}
              periodo={periodo}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
