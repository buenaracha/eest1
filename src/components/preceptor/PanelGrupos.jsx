// ============================================================
// PanelGrupos.jsx
// ============================================================
// Permite asignar a cada alumno el grupo de taller del curso.
// Las opciones G1, G2, G3, etc. se calculan desde la configuracion
// de las materias de taller y desde los grupos ya guardados.
// ============================================================

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const ANIO_LECTIVO = '2026';

function crearOpcionesGrupo(cantidad) {
  const opciones = [{ value: '', label: 'Sin grupo' }];
  for (let i = 1; i <= cantidad; i++) {
    opciones.push({ value: String(i), label: `G${i}` });
  }
  return opciones;
}

function extraerNumeroGrupo(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') return valor;
  const match = String(valor).match(/G?(\d+)$/i);
  return match ? Number(match[1]) : null;
}

function SelectorGrupo({ alumno, grupoActual, opciones, onCambiar, estado }) {
  return (
    <tr className="fila-alumno">
      <td className="celda celda--nombre">{alumno.apellido_nombre}</td>
      <td className="celda" style={{ textAlign: 'center', padding: '4px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <select
            className="celda__select"
            style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db', fontSize: 13 }}
            value={grupoActual ?? ''}
            onChange={e => onCambiar(alumno.dni, e.target.value)}
          >
            {opciones.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
          {estado === 'guardando' && <span className="celda__spinner">...</span>}
          {estado === 'guardado'  && <span className="celda__ok">OK</span>}
          {estado === 'error'     && <span className="celda__error-ico">Error</span>}
        </div>
      </td>
    </tr>
  );
}

export default function PanelGrupos({ cursoId, alumnos }) {
  const [grupos, setGrupos] = useState({});
  const [estados, setEstados] = useState({});
  const [cantidadGrupos, setCantidadGrupos] = useState(2);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      try {
        const [cursoSnap, inscSnap, dictSnap] = await Promise.all([
          getDoc(doc(db, 'cursos', cursoId)),
          getDocs(collection(db, 'cursos', cursoId, 'inscripciones')),
          getDocs(collection(db, 'cursos', cursoId, 'dictados_materia')),
        ]);

        const cursoData = cursoSnap.data() || {};
        let maxGrupo = Number(cursoData.cantidad_grupos_taller || 0);
        const gruposActuales = {};

        dictSnap.docs.forEach(d => {
          const data = d.data();
          if (data.activo === false || data.tipo_materia !== 'taller') return;
          maxGrupo = Math.max(maxGrupo, Number(data.cantidad_grupos || 0));
          maxGrupo = Math.max(maxGrupo, extraerNumeroGrupo(data.grupo) || 0);
          maxGrupo = Math.max(maxGrupo, extraerNumeroGrupo(d.id) || 0);
        });

        inscSnap.docs.forEach(d => {
          const data = d.data();
          const grupo = extraerNumeroGrupo(data.grupo);
          gruposActuales[data.dni] = grupo;
          maxGrupo = Math.max(maxGrupo, grupo || 0);
        });

        setCantidadGrupos(Math.max(2, maxGrupo || 2));
        setGrupos(gruposActuales);
      } catch (err) {
        console.error('Error cargando grupos:', err);
      } finally {
        setCargando(false);
      }
    }

    if (cursoId) cargar();
  }, [cursoId]);

  async function handleCambio(dni, valorStr) {
    const nuevoGrupo = valorStr === '' ? null : Number(valorStr);

    setEstados(prev => ({ ...prev, [dni]: 'guardando' }));
    try {
      await updateDoc(
        doc(db, 'cursos', cursoId, 'inscripciones', dni),
        { grupo: nuevoGrupo }
      );
      await updateDoc(
        doc(db, 'estudiantes', dni, 'trayectorias_anuales', ANIO_LECTIVO),
        { grupo: nuevoGrupo }
      );

      setGrupos(prev => ({ ...prev, [dni]: nuevoGrupo }));
      setEstados(prev => ({ ...prev, [dni]: 'guardado' }));
      setTimeout(() => setEstados(prev => ({ ...prev, [dni]: null })), 2000);
    } catch (err) {
      console.error('Error guardando grupo:', err);
      setEstados(prev => ({ ...prev, [dni]: 'error' }));
    }
  }

  const opciones = crearOpcionesGrupo(cantidadGrupos);
  const conteos = {};
  for (let i = 1; i <= cantidadGrupos; i++) conteos[i] = 0;
  let sinGrupo = 0;

  Object.values(grupos).forEach(g => {
    if (!g) sinGrupo++;
    else conteos[g] = (conteos[g] || 0) + 1;
  });

  if (cargando) {
    return (
      <div className="cargando-inline">
        <div className="spinner spinner--small" />
        <span>Cargando grupos...</span>
      </div>
    );
  }

  return (
    <div className="panel-seccion">
      <div className="panel-seccion__cabecera">
        <h3 className="panel-seccion__titulo">Asignacion de grupos de taller</h3>
        <p className="panel-seccion__desc">
          Asigna cada alumno al grupo que corresponda. Las opciones salen de la configuracion de materias de taller del curso.
        </p>
      </div>

      <div className="grupos-resumen">
        {Array.from({ length: cantidadGrupos }, (_, idx) => idx + 1).map(n => (
          <div key={n} className="grupos-resumen__item">
            <span className="badge badge--grupo">G{n}</span>
            <span>{conteos[n] || 0} alumnos</span>
          </div>
        ))}
        {sinGrupo > 0 && (
          <div className="grupos-resumen__item">
            <span className="badge" style={{ background: '#fef9c3', color: '#854d0e' }}>Sin grupo</span>
            <span>{sinGrupo} alumnos</span>
          </div>
        )}
      </div>

      <div className="grilla-scroll">
        <table className="grilla-tabla">
          <thead>
            <tr>
              <th className="grilla-th grilla-th--nombre">Apellido y Nombre</th>
              <th className="grilla-th" style={{ minWidth: 220 }}>Grupo asignado</th>
            </tr>
          </thead>
          <tbody>
            {alumnos.map(alumno => (
              <SelectorGrupo
                key={alumno.dni}
                alumno={alumno}
                grupoActual={grupos[alumno.dni]}
                opciones={opciones}
                onCambiar={handleCambio}
                estado={estados[alumno.dni]}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
