// ============================================================
// ConfigurarMaterias.jsx
// ============================================================
// Herramienta para conduccion: define materias de taller y crea
// los dictados por grupo, copiando calificaciones segun el grupo
// asignado a cada estudiante.
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { PERIODOS_CARGABLES } from '../utils/calificaciones';

function baseDictadoId(id) {
  return id.replace(/_G\d+$/i, '');
}

function slugify(str) {
  return str
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function grupoNumero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') return valor;
  const match = String(valor).match(/G?(\d+)$/i);
  return match ? Number(match[1]) : null;
}

function calcularResumen(alumnos, calificaciones) {
  const periodos = {};
  PERIODOS_CARGABLES.forEach(campo => {
    let cargados = 0;
    let no_aplica = 0;
    alumnos.forEach(al => {
      const valor = calificaciones[al.dni]?.[campo];
      if (valor === '—' || valor === 'â€”') no_aplica++;
      else if (valor !== null && valor !== undefined) cargados++;
    });
    periodos[campo] = {
      cargados,
      no_aplica,
      pendientes: alumnos.length - cargados - no_aplica,
    };
  });
  return {
    periodos,
    total_alumnos: alumnos.length,
    ultimo_guardado: null,
    ultimo_guardado_por: null,
  };
}

function FilaMateria({ materia, grupos, onCambiarTipo, onConvertir, onQuitar, estado }) {
  const esDerivada = !!materia.grupo;
  const yaEsTaller = materia.tipo_materia === 'taller';

  return (
    <tr className="asignar-fila">
      <td className="asignar-td asignar-td--materia">
        <strong>{materia.nombre_mostrar || materia.id}</strong>
        {materia.grupo && <span className="badge badge--grupo" style={{ marginLeft: 6 }}>{materia.grupo}</span>}
        {materia.activo === false && <span className="badge" style={{ marginLeft: 6 }}>Archivada</span>}
      </td>
      <td className="asignar-td">
        <select
          className="form-input"
          value={yaEsTaller ? 'taller' : 'normal'}
          onChange={e => onCambiarTipo(materia, e.target.value)}
          disabled={estado === 'guardando' || esDerivada}
        >
          <option value="normal">Teoria</option>
          <option value="taller">Taller</option>
        </select>
      </td>
      <td className="asignar-td">
        {esDerivada ? (
          <span className="panel-seccion__desc">Dictado de grupo</span>
        ) : (
          <button
            className={`btn-asignar ${yaEsTaller ? 'btn-asignar--activo' : ''}`}
            onClick={() => onConvertir(materia, grupos)}
            disabled={estado === 'guardando'}
          >
            {estado === 'guardando' ? 'Creando...' : `Crear G1 a G${grupos}`}
          </button>
        )}
      </td>
      <td className="asignar-td">
        <div className="asignar-accion">
        {estado === 'guardado' && <span className="celda__ok">OK</span>}
        {estado === 'error' && <span className="celda__error-ico">Error</span>}
          <button
            className="btn-asignar btn-asignar--peligro"
            onClick={() => onQuitar(materia)}
            disabled={estado === 'guardando'}
          >
            Quitar
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function ConfigurarMaterias({ cursoId }) {
  const [dictados, setDictados] = useState([]);
  const [dictadoIds, setDictadoIds] = useState(new Set());
  const [inscripciones, setInscripciones] = useState([]);
  const [cantidadGrupos, setCantidadGrupos] = useState(2);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState('normal');
  const [estados, setEstados] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const [dictSnap, inscSnap] = await Promise.all([
        getDocs(collection(db, 'cursos', cursoId, 'dictados_materia')),
        getDocs(collection(db, 'cursos', cursoId, 'inscripciones')),
      ]);

      const dictadosData = dictSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => d.activo !== false)
        .sort((a, b) => {
          const na = `${a.nombre_mostrar || ''} ${a.grupo || ''}`;
          const nb = `${b.nombre_mostrar || ''} ${b.grupo || ''}`;
          return na.localeCompare(nb, 'es');
        });

      const inscData = inscSnap.docs
        .map(d => ({ id: d.id, ...d.data(), grupo: grupoNumero(d.data().grupo) }))
        .sort((a, b) => (a.apellido_nombre || '').localeCompare(b.apellido_nombre || '', 'es'));

      setDictados(dictadosData);
      setDictadoIds(new Set(dictSnap.docs.map(d => d.id)));
      setInscripciones(inscData);
    } catch (err) {
      console.error(err);
      setError('Error al cargar las materias del curso.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (cursoId) cargar();
  }, [cursoId]);

  const resumenGrupos = useMemo(() => {
    const obj = {};
    for (let i = 1; i <= cantidadGrupos; i++) obj[i] = 0;
    let sinGrupo = 0;
    inscripciones.forEach(al => {
      if (!al.grupo) sinGrupo++;
      else obj[al.grupo] = (obj[al.grupo] || 0) + 1;
    });
    return { obj, sinGrupo };
  }, [inscripciones, cantidadGrupos]);

  async function cambiarTipo(materia, tipo) {
    setEstados(prev => ({ ...prev, [materia.id]: 'guardando' }));
    try {
      await updateDoc(doc(db, 'cursos', cursoId, 'dictados_materia', materia.id), {
        tipo_materia: tipo,
        ultima_modificacion: serverTimestamp(),
      });
      setEstados(prev => ({ ...prev, [materia.id]: 'guardado' }));
      setTimeout(() => setEstados(prev => ({ ...prev, [materia.id]: null })), 2000);
      await cargar();
    } catch (err) {
      console.error(err);
      setEstados(prev => ({ ...prev, [materia.id]: 'error' }));
    }
  }

  async function agregarMateria(e) {
    e.preventDefault();
    const nombre = nuevoNombre.trim();
    if (!nombre) return;

    const id = slugify(nombre);
    if (!id) return;
    if (dictadoIds.has(id)) {
      setError('Ya existe una materia con ese nombre o identificador.');
      return;
    }

    setEstados(prev => ({ ...prev, nueva: 'guardando' }));
    setError(null);
    try {
      const batch = writeBatch(db);
      const dictadoRef = doc(db, 'cursos', cursoId, 'dictados_materia', id);
      const calificacionesVacias = {};

      batch.set(dictadoRef, {
        materia_base_id: id,
        nombre_mostrar: nombre,
        grupo: null,
        docente_id: null,
        tipo_materia: nuevoTipo,
        activo: true,
        nivel_bloqueo: 0,
        nivel_bloqueo_boletin: 0,
        nivel_bloqueo_manual: 0,
        fecha_ultimo_bloqueo: null,
        bloqueado_por: null,
        resumen: calcularResumen(inscripciones, calificacionesVacias),
        fecha_creacion: serverTimestamp(),
        ultima_modificacion: serverTimestamp(),
      }, { merge: true });

      inscripciones.forEach(al => {
        batch.set(
          doc(db, 'cursos', cursoId, 'dictados_materia', id, 'calificaciones', al.dni),
          {
            dni: al.dni,
            apellido_nombre: al.apellido_nombre,
            ultima_modificacion: serverTimestamp(),
          },
          { merge: true }
        );
      });

      await batch.commit();
      setNuevoNombre('');
      setNuevoTipo('normal');
      setEstados(prev => ({ ...prev, nueva: 'guardado' }));
      setTimeout(() => setEstados(prev => ({ ...prev, nueva: null })), 2000);
      await cargar();
    } catch (err) {
      console.error(err);
      setEstados(prev => ({ ...prev, nueva: 'error' }));
      setError('No se pudo agregar la materia.');
    }
  }

  async function quitarMateria(materia) {
    const confirmar = window.confirm(
      `Se quitara "${materia.nombre_mostrar || materia.id}" de las vistas del curso. Los datos quedaran archivados.`
    );
    if (!confirmar) return;

    setEstados(prev => ({ ...prev, [materia.id]: 'guardando' }));
    setError(null);
    try {
      await updateDoc(doc(db, 'cursos', cursoId, 'dictados_materia', materia.id), {
        activo: false,
        archivado_manualmente: true,
        ultima_modificacion: serverTimestamp(),
      });
      setEstados(prev => ({ ...prev, [materia.id]: 'guardado' }));
      setTimeout(() => setEstados(prev => ({ ...prev, [materia.id]: null })), 2000);
      await cargar();
    } catch (err) {
      console.error(err);
      setEstados(prev => ({ ...prev, [materia.id]: 'error' }));
      setError('No se pudo quitar la materia.');
    }
  }

  async function convertirEnTaller(materia, grupos) {
    const confirmar = window.confirm(
      `Se crearan ${grupos} dictados para "${materia.nombre_mostrar || materia.id}" y se archivara el dictado original.`
    );
    if (!confirmar) return;

    setEstados(prev => ({ ...prev, [materia.id]: 'guardando' }));
    try {
      const calSnap = await getDocs(
        collection(db, 'cursos', cursoId, 'dictados_materia', materia.id, 'calificaciones')
      );
      const calificaciones = {};
      calSnap.docs.forEach(d => { calificaciones[d.id] = d.data(); });

      const cursoRef = doc(db, 'cursos', cursoId);
      const batch = writeBatch(db);
      const baseId = baseDictadoId(materia.id);
      const idsExistentes = new Set(dictados.map(d => d.id));

      batch.update(cursoRef, {
        cantidad_grupos_taller: grupos,
        ultima_modificacion: serverTimestamp(),
      });

      batch.set(doc(db, 'cursos', cursoId, 'dictados_materia', materia.id), {
        tipo_materia: 'taller',
        activo: false,
        archivado_por_conversion: true,
        cantidad_grupos: grupos,
        ultima_modificacion: serverTimestamp(),
      }, { merge: true });

      for (let n = 1; n <= grupos; n++) {
        const alumnosGrupo = inscripciones.filter(al => al.grupo === n);
        const calGrupo = {};
        alumnosGrupo.forEach(al => {
          if (calificaciones[al.dni]) calGrupo[al.dni] = calificaciones[al.dni];
        });

        const dictadoGrupoId = `${baseId}_G${n}`;
        const dictadoGrupoRef = doc(db, 'cursos', cursoId, 'dictados_materia', dictadoGrupoId);
        const existeGrupo = idsExistentes.has(dictadoGrupoId);

        if (existeGrupo) {
          batch.set(dictadoGrupoRef, {
            tipo_materia: 'taller',
            cantidad_grupos: grupos,
            activo: true,
            ultima_modificacion: serverTimestamp(),
          }, { merge: true });
          continue;
        }

        batch.set(dictadoGrupoRef, {
          materia_base_id: baseId,
          nombre_mostrar: materia.nombre_mostrar || materia.id,
          grupo: `G${n}`,
          tipo_materia: 'taller',
          cantidad_grupos: grupos,
          activo: true,
          docente_id: null,
          nivel_bloqueo: materia.nivel_bloqueo || 0,
          nivel_bloqueo_boletin: materia.nivel_bloqueo_boletin || 0,
          nivel_bloqueo_manual: materia.nivel_bloqueo_manual || 0,
          fecha_ultimo_bloqueo: materia.fecha_ultimo_bloqueo || null,
          bloqueado_por: materia.bloqueado_por || null,
          resumen: calcularResumen(alumnosGrupo, calGrupo),
          fecha_creacion: serverTimestamp(),
          ultima_modificacion: serverTimestamp(),
        }, { merge: true });

        alumnosGrupo.forEach(al => {
          const calOriginal = calificaciones[al.dni] || {
            dni: al.dni,
            apellido_nombre: al.apellido_nombre,
          };
          batch.set(
            doc(db, 'cursos', cursoId, 'dictados_materia', dictadoGrupoId, 'calificaciones', al.dni),
            {
              ...calOriginal,
              dni: al.dni,
              apellido_nombre: calOriginal.apellido_nombre || al.apellido_nombre,
              ultima_modificacion: serverTimestamp(),
            },
            { merge: true }
          );
        });
      }

      await batch.commit();
      setEstados(prev => ({ ...prev, [materia.id]: 'guardado' }));
      setTimeout(() => setEstados(prev => ({ ...prev, [materia.id]: null })), 2000);
      await cargar();
    } catch (err) {
      console.error(err);
      setEstados(prev => ({ ...prev, [materia.id]: 'error' }));
      setError('No se pudo crear la configuracion de taller.');
    }
  }

  if (cargando) {
    return <div className="cargando-inline"><div className="spinner spinner--small" /><span>Cargando materias...</span></div>;
  }

  return (
    <div className="asignar-wrapper">
      {error && <div className="aviso aviso--error"><span className="aviso__icono">!</span><span>{error}</span></div>}

      <div className="config-materias-barra">
        <label className="form-campo__label" htmlFor="cantidad-grupos">Cantidad de grupos de taller</label>
        <select
          id="cantidad-grupos"
          className="form-input config-materias-select"
          value={cantidadGrupos}
          onChange={e => setCantidadGrupos(Number(e.target.value))}
        >
          <option value={2}>2 grupos</option>
          <option value={3}>3 grupos</option>
          <option value={4}>4 grupos</option>
        </select>
        <div className="grupos-resumen">
          {Array.from({ length: cantidadGrupos }, (_, idx) => idx + 1).map(n => (
            <div key={n} className="grupos-resumen__item">
              <span className="badge badge--grupo">G{n}</span>
              <span>{resumenGrupos.obj[n] || 0} alumnos</span>
            </div>
          ))}
          {resumenGrupos.sinGrupo > 0 && (
            <div className="grupos-resumen__item">
              <span className="badge" style={{ background: '#fef9c3', color: '#854d0e' }}>Sin grupo</span>
              <span>{resumenGrupos.sinGrupo} alumnos</span>
            </div>
          )}
        </div>
      </div>

      <form className="config-materias-agregar" onSubmit={agregarMateria}>
        <div className="form-campo config-materias-agregar__nombre">
          <label className="form-campo__label" htmlFor="nueva-materia">Agregar materia</label>
          <input
            id="nueva-materia"
            className="form-input"
            type="text"
            value={nuevoNombre}
            onChange={e => setNuevoNombre(e.target.value)}
            placeholder="Nombre de la materia"
          />
        </div>
        <div className="form-campo">
          <label className="form-campo__label" htmlFor="nueva-materia-tipo">Tipo</label>
          <select
            id="nueva-materia-tipo"
            className="form-input config-materias-select"
            value={nuevoTipo}
            onChange={e => setNuevoTipo(e.target.value)}
          >
            <option value="normal">Teoria</option>
            <option value="taller">Taller</option>
          </select>
        </div>
        <button
          className={`btn-asignar ${nuevoNombre.trim() ? 'btn-asignar--activo' : ''}`}
          type="submit"
          disabled={!nuevoNombre.trim() || estados.nueva === 'guardando'}
        >
          {estados.nueva === 'guardando' ? 'Agregando...' : 'Agregar'}
        </button>
        {estados.nueva === 'guardado' && <span className="celda__ok">OK</span>}
        {estados.nueva === 'error' && <span className="celda__error-ico">Error</span>}
      </form>

      <div className="grilla-scroll">
        <table className="asignar-tabla">
          <thead>
            <tr>
              <th className="asignar-th asignar-th--materia">Materia</th>
              <th className="asignar-th">Tipo</th>
              <th className="asignar-th">Grupos</th>
              <th className="asignar-th asignar-th--accion">Estado</th>
            </tr>
          </thead>
          <tbody>
            {dictados.map(materia => (
              <FilaMateria
                key={materia.id}
                materia={materia}
                grupos={cantidadGrupos}
                estado={estados[materia.id]}
                onCambiarTipo={cambiarTipo}
                onConvertir={convertirEnTaller}
                onQuitar={quitarMateria}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
