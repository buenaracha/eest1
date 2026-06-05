// ============================================================
// GrillaCalificaciones.jsx
// Cambio: input inválido → toast de aviso + celda se resetea
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { doc, updateDoc, getDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db }      from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  COLUMNAS, COLUMNAS_EXTRA, VALORES_INFORME, VALOR_NO_APLICA, VALOR_AUSENTE,
  PERIODOS_CARGABLES, calcularAutomatico,
  etiquetaBloqueo, calcularDeltaResumen, clasificarValor,
} from '../utils/calificaciones';

const ORDEN_BOLETIN = ['INF1','C1','IC1','INF2','C2','INOV', null,'IDIC','IFEB', null];

// ── Validación estricta ───────────────────────────────────────
function validarInput(tipo, valor) {
  if (!valor || valor.trim() === '') return { ok: true, normalizado: null };
  const v = valor.trim().toUpperCase();

  if (tipo === 'intensificacion') {
    if (v === '-' || v === '--' || v === '—') return { ok: true, normalizado: VALOR_NO_APLICA };
    if (v === 'A') return { ok: true, normalizado: VALOR_AUSENTE };
    const n = parseInt(v);
    if (!isNaN(n) && String(n) === v && n >= 1 && n <= 10) return { ok: true, normalizado: String(n) };
    return { ok: false, mensaje: 'Valor inválido. Ingresá un número del 1 al 10, la letra A, o — para no aplica.' };
  }

  if (tipo === 'nota') {
    if (v === 'A') return { ok: true, normalizado: VALOR_AUSENTE };
    const n = parseInt(v);
    if (!isNaN(n) && String(n) === v && n >= 1 && n <= 10) return { ok: true, normalizado: String(n) };
    return { ok: false, mensaje: 'Valor inválido. Ingresá un número del 1 al 10 o la letra A.' };
  }

  if (tipo === 'numero') {
    const n = parseFloat(valor.replace(',', '.'));
    if (!isNaN(n) && n >= 0) return { ok: true, normalizado: n };
    return { ok: false, mensaje: 'Ingresá un número positivo.' };
  }

  return { ok: true, normalizado: valor };
}

// ── Color de celda ────────────────────────────────────────────
function claseColor(campo, valor) {
  if (!valor && valor !== 0) return '';
  const cat = clasificarValor(campo, valor);
  if (cat === 'no-aplica') return 'celda--color-no-aplica';
  if (cat === 'alto')      return 'celda--color-alto';
  if (cat === 'medio')     return 'celda--color-medio';
  if (cat === 'bajo')      return 'celda--color-bajo';
  return '';
}

// ── Toast de error ────────────────────────────────────────────
function ToastError({ mensaje, onCerrar }) {
  useEffect(() => {
    const t = setTimeout(onCerrar, 4000);
    return () => clearTimeout(t);
  }, [mensaje, onCerrar]);

  return (
    <div className="grilla-toast" onClick={onCerrar}>
      <span className="grilla-toast__icono">⚠️</span>
      <span className="grilla-toast__texto">{mensaje}</span>
      <span className="grilla-toast__cerrar">✕</span>
    </div>
  );
}

// ── Celda de Informe (select TEA/TEP/TED) ────────────────────
function CeldaInforme({ campo, valor, editable, onChange }) {
  const colorClass = claseColor(campo, valor);
  if (!editable) return <td className={`celda celda--bloqueada ${colorClass}`}>{valor || ''}</td>;
  return (
    <td className={`celda celda--informe celda--actual ${colorClass}`}>
      <select className="celda__select" value={valor || ''} onChange={e => onChange(e.target.value || null)} >
        <option value=""></option>
        {VALORES_INFORME.map(v => <option key={v} value={v}>{v}</option>)}
      </select>
    </td>
  );
}

// ── Celda de texto ────────────────────────────────────────────
// Valida localmente: si el valor no es válido, resetea y llama a onError
function CeldaTexto({ campo, tipo, valor, editable, estado, onBlur, onKeyDown, onError, filaIdx, totalFilas }) {
  const [local, setLocal] = useState(valor ?? '');
  const colorClass = claseColor(campo, valor);

  // Sincronizar si el valor externo cambia
  const prevValor = useRef(valor);
  if (valor !== prevValor.current) {
    prevValor.current = valor;
    setLocal(valor ?? '');
  }

  if (tipo === 'calculado') {
    return <td className={`celda celda--calculada ${colorClass}`}>{valor ?? ''}</td>;
  }
  if (!editable) {
    return <td className={`celda celda--bloqueada ${colorClass}`}>{valor ?? ''}</td>;
  }

  function handleBlur() {
    if (local.trim() === (valor ?? '').toString().trim()) return; // sin cambio
    const { ok, mensaje } = validarInput(tipo, local);
    if (!ok) {
      setLocal(valor ?? ''); // resetear al valor anterior
      onError(mensaje);
      return;
    }
    onBlur(campo, tipo, local);
  }

  function handleKeyDown(e) {
    if (e.key !== 'Enter' && e.key !== 'Tab') return;
    e.preventDefault();
    const { ok, mensaje } = validarInput(tipo, local);
    if (!ok) {
      setLocal(valor ?? '');
      onError(mensaje);
      return;
    }
    onBlur(campo, tipo, local);
    // Navegar a la siguiente fila
    const siguienteFila = e.shiftKey ? filaIdx - 1 : filaIdx + 1;
    if (siguienteFila < 0 || siguienteFila >= totalFilas) return;
    const nextInput = document.querySelector(`input[data-campo="${campo}"][data-fila="${siguienteFila}"]`);
    if (nextInput) nextInput.focus();
  }

  return (
    <td className={`celda celda--editable celda--actual ${estado === 'guardando' ? 'celda--guardando' : ''} ${colorClass}`}>
      <input
        className="celda__input"
        type="text"
        value={local}
        data-fila={filaIdx}
        data-campo={campo}
        autoCapitalize="characters"
        onChange={e => setLocal(e.target.value.toUpperCase())}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        maxLength={3}
      />
      {estado === 'guardando' && <span className="celda__spinner">⟳</span>}
      {estado === 'guardado'  && <span className="celda__ok">✓</span>}
    </td>
  );
}

// ── Celda de inasistencias ────────────────────────────────────
function CeldaInasistencia({ campo, valor, estado, editable, onBlur, onError, filaIdx, totalFilas }) {
  if (!editable) {
  return (
    <td className="celda celda--bloqueada">
      {valor ?? ''}
    </td>
  );
}

  const [local, setLocal] = useState(valor ?? '');

  const prevValor = useRef(valor);
  if (valor !== prevValor.current) {
    prevValor.current = valor;
    setLocal(valor ?? '');
  }

  function handleBlur() {
    const { ok, mensaje } = validarInput('numero', local.toString());
    if (!ok) { setLocal(valor ?? ''); onError(mensaje); return; }
    onBlur(campo, 'numero', local);
  }

  function handleKeyDown(e) {
    if (e.key !== 'Enter' && e.key !== 'Tab') return;
    e.preventDefault();
    const { ok, mensaje } = validarInput('numero', local.toString());
    if (!ok) { setLocal(valor ?? ''); onError(mensaje); return; }
    onBlur(campo, 'numero', local);
    const siguienteFila = e.shiftKey ? filaIdx - 1 : filaIdx + 1;
    if (siguienteFila < 0 || siguienteFila >= totalFilas) return;
    const nextInput = document.querySelector(`input[data-campo="${campo}"][data-fila="${siguienteFila}"]`);
    if (nextInput) nextInput.focus();
  }

  return (
    <td className={`celda celda--editable ${estado === 'guardando' ? 'celda--guardando' : ''}`}>
      <input
        className="celda__input celda__input--sin-flechas"
        type="number" min="0" value={local}
        data-fila={filaIdx} data-campo={campo}
        onChange={e => setLocal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{ textAlign: 'center' }}
      />
      {estado === 'guardando' && <span className="celda__spinner">⟳</span>}
      {estado === 'guardado'  && <span className="celda__ok">✓</span>}
    </td>
  );
}

// ── Fila de un alumno ─────────────────────────────────────────
function FilaAlumno({ alumno, calData, campoActual, campoActualBloqueado, cursoId, dictadoId, onUpdate, onError, filaIdx, totalFilas }) {
  const { perfil } = useAuth();
  const [estados, setEstados] = useState({});

  const setEstado = (campo, estado) => {
    setEstados(prev => ({ ...prev, [campo]: estado }));
    if (estado === 'guardado') setTimeout(() => setEstados(prev => ({ ...prev, [campo]: null })), 2000);
  };

  // Guardar en Firestore (la validación ya pasó en la celda)
  const guardar = useCallback(async (campo, tipo, valorRaw) => {
    const { ok, normalizado } = validarInput(tipo, valorRaw);
    if (!ok) return; // No debería llegar acá, pero por seguridad

    const valorActual = calData[campo] ?? null;
    if (normalizado === valorActual) return;

    setEstado(campo, 'guardando');
    try {
      const camposACalc = ['C1','IC1','C2','INOV','IDIC','IFEB'];
      const nuevosCal   = { ...calData, [campo]: normalizado };
      const updates     = { [campo]: normalizado, ultima_modificacion: serverTimestamp() };

      if (camposACalc.includes(campo)) {
        const auto = calcularAutomatico(nuevosCal);
        if (auto.ANUAL !== (nuevosCal.ANUAL ?? null)) updates.ANUAL = auto.ANUAL;
        if (auto.FINAL !== (nuevosCal.FINAL ?? null)) updates.FINAL = auto.FINAL;
        if (campo === 'C1') {
          if (auto.IC1_auto) {
            if (!nuevosCal.IC1) {
              updates.IC1 = VALOR_NO_APLICA;
            }
          } else {
            if (nuevosCal.IC1 === VALOR_NO_APLICA) {
      updates.IC1 = null;
            }
          }
        }
      }

      const calRef = doc(db, 'cursos', cursoId, 'dictados_materia', dictadoId, 'calificaciones', alumno.dni);
      await updateDoc(calRef, updates);

      const deltaInfo = calcularDeltaResumen(campo, valorActual, normalizado);
      if (deltaInfo) {
        const dictadoRef = doc(db, 'cursos', cursoId, 'dictados_materia', dictadoId);
        await updateDoc(dictadoRef, {
          [`resumen.periodos.${campo}.cargados`]:  increment(deltaInfo.delta.cargados),
          [`resumen.periodos.${campo}.pendientes`]: increment(deltaInfo.delta.pendientes),
          [`resumen.periodos.${campo}.no_aplica`]:  increment(deltaInfo.delta.no_aplica),
          'resumen.ultimo_guardado':     serverTimestamp(),
          'resumen.ultimo_guardado_por': perfil?.email || '',
        });
      }

      onUpdate(alumno.dni, updates);
      setEstado(campo, 'guardado');
    } catch (err) {
      console.error('Error guardando:', err);
      onError('Error al guardar. Verificá tu conexión e intentá de nuevo.');
    }
  }, [calData, cursoId, dictadoId, alumno.dni, onUpdate, perfil, onError]);

  const handleBlur = useCallback((campo, tipo, valorRaw) => {
    guardar(campo, tipo, valorRaw);
  }, [guardar]);

  const handleInformeChange = useCallback(async (campo, valor) => {
    const valorActual = calData[campo] ?? null;
    if (valor === valorActual) return;
    setEstado(campo, 'guardando');
    try {
      const calRef = doc(db, 'cursos', cursoId, 'dictados_materia', dictadoId, 'calificaciones', alumno.dni);
      await updateDoc(calRef, { [campo]: valor, ultima_modificacion: serverTimestamp() });
      onUpdate(alumno.dni, { [campo]: valor });
      setEstado(campo, 'guardado');
    } catch (err) {
      onError('Error al guardar. Intentá de nuevo.');
    }
  }, [calData, cursoId, dictadoId, alumno.dni, onUpdate, onError]);

  const todasColumnas = [...COLUMNAS, ...COLUMNAS_EXTRA];

  return (
    <tr className="fila-alumno">
      <td className="celda celda--nombre">
        {calData.apellido_nombre || alumno.apellido_nombre}
      </td>

      {todasColumnas.map(col => {
        const valor  = calData[col.campo] ?? null;
        const estado = estados[col.campo] || null;

        const editable =
          (campoActual === 'C1' && col.campo === 'inasistencias_docente_1c') ||
          (campoActual === 'C2' && col.campo === 'inasistencias_docente_2c');
        
          if (col.tipo === 'numero') {
          return (
            <CeldaInasistencia
              key={col.campo} campo={col.campo} valor={valor} estado={estado} editable={editable}
              onBlur={handleBlur} onError={onError}
              filaIdx={filaIdx} totalFilas={totalFilas}
            />
          );
        }

        if (col.tipo === 'calculado') {
          return <td key={col.campo} className={`celda celda--calculada ${claseColor(col.campo, valor)}`}>{valor ?? ''}</td>;
        }

        const esCeldaActual = col.campo === campoActual && !campoActualBloqueado;

        if (col.tipo === 'informe') {
          return (
            <CeldaInforme
              key={col.campo} campo={col.campo} valor={valor}
              editable={esCeldaActual}
              onChange={v => handleInformeChange(col.campo, v)}
            />
          );
        }

        return (
          <CeldaTexto
            key={col.campo} campo={col.campo} tipo={col.tipo}
            valor={valor} editable={esCeldaActual} estado={esCeldaActual ? estado : null}
            onBlur={handleBlur} onError={onError}
            filaIdx={filaIdx} totalFilas={totalFilas}
          />
        );
      })}
    </tr>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function GrillaCalificaciones({ cursoId, dictadoId, dictado, alumnos, calificaciones, onCalificacionUpdate }) {
  const [toast, setToast] = useState(null);

  const mostrarError = useCallback((mensaje) => {
    setToast(mensaje);
  }, []);

  const cerrarToast = useCallback(() => setToast(null), []);

  const nivelBoletin        = dictado?.nivel_bloqueo_boletin || 0;
  const nivelManual         = dictado?.nivel_bloqueo_manual  || 0;
  const nivelEfectivo       = Math.max(nivelBoletin, nivelManual);
  const campoActual         = nivelBoletin < ORDEN_BOLETIN.length ? ORDEN_BOLETIN[nivelBoletin] : null;
  const campoActualBloqueado = nivelEfectivo > nivelBoletin || nivelBoletin >= 10 || !campoActual;
  const todasColumnas       = [...COLUMNAS, ...COLUMNAS_EXTRA];

  useEffect(() => {
    async function inicializarResumen() {
      if (!cursoId || !dictadoId || alumnos.length === 0) return;
      const dictadoRef = doc(db, 'cursos', cursoId, 'dictados_materia', dictadoId);
      const snap = await getDoc(dictadoRef);
      if (snap.exists() && snap.data()?.resumen?.periodos) return;
      const periodos = {};
      PERIODOS_CARGABLES.forEach(p => {
        let cargados = 0, no_aplica = 0;
        Object.values(calificaciones).forEach(cal => {
          const v = cal[p];
          if (v === VALOR_NO_APLICA) no_aplica++;
          else if (v !== null && v !== undefined) cargados++;
        });
        periodos[p] = { cargados, no_aplica, pendientes: alumnos.length - cargados - no_aplica };
      });
      await updateDoc(dictadoRef, {
        'resumen.periodos': periodos,
        'resumen.total_alumnos': alumnos.length,
        'resumen.ultimo_guardado': null,
        'resumen.ultimo_guardado_por': null,
      });
    }
    inicializarResumen();
  }, [cursoId, dictadoId, alumnos, calificaciones]);

  const infoPeriodo = campoActualBloqueado
    ? '🔒 No hay columna habilitada para cargar en este momento.'
    : `✏️ Columna habilitada: ${todasColumnas.find(c => c.campo === campoActual)?.label || campoActual}`;

  return (
    <div className="grilla-wrapper">
      <div className="grilla-info">
        <div className="grilla-info__item">
          <span className="grilla-info__label">Materia:</span>
          <strong>{dictado?.nombre_mostrar}</strong>
          {dictado?.grupo && <span className="badge badge--grupo">{dictado.grupo}</span>}
        </div>
        <div className="grilla-info__item">
          <span className="grilla-info__label">Período actual:</span>
          <span className={`grilla-periodo-actual ${campoActualBloqueado ? 'grilla-periodo-actual--bloqueado' : ''}`}>
            {infoPeriodo}
          </span>
        </div>
        <div className="grilla-info__item">
          <span className="grilla-info__label">Alumnos:</span>
          <span>{alumnos.length}</span>
        </div>
      </div>

      <div className="grilla-leyenda">
        <span className="leyenda-item" style={{ background: '#9fc5e8', color: '#1a3a5c' }}>TEA / 7 a 10</span>
        <span className="leyenda-item" style={{ background: '#64f164', color: '#14532d' }}>TEP / 4 a 6</span>
        <span className="leyenda-item" style={{ background: '#ea9999', color: '#7f1d1d' }}>TED / 1 a 3 / A</span>
        <span className="leyenda-item leyenda-item--calculado">Calculado</span>
        {!campoActualBloqueado && (
          <span className="grilla-leyenda__tip">💡 Enter o Tab → siguiente alumno</span>
        )}
      </div>

      <div className="grilla-scroll">
        <table className="grilla-tabla">
          <thead>
            <tr>
              <th className="grilla-th grilla-th--nombre">Apellido y Nombre</th>
              {todasColumnas.map(col => {
                const esActual = col.campo === campoActual && !campoActualBloqueado;
                return (
                  <th
                    key={col.campo}
                    className={`grilla-th ${esActual ? 'grilla-th--actual' : ''} ${col.tipo === 'calculado' ? 'grilla-th--calculado' : ''}`}
                    style={{ minWidth: col.ancho }}
                  >
                    {col.label}
                    {esActual && <div className="grilla-th__actual-indicator">↓</div>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {alumnos.map((alumno, idx) => (
              <FilaAlumno
                key={alumno.dni}
                alumno={alumno}
                calData={calificaciones[alumno.dni] || { dni: alumno.dni, apellido_nombre: alumno.apellido_nombre }}
                campoActual={campoActual}
                campoActualBloqueado={campoActualBloqueado}
                cursoId={cursoId}
                dictadoId={dictadoId}
                onUpdate={onCalificacionUpdate}
                onError={mostrarError}
                filaIdx={idx}
                totalFilas={alumnos.length}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="saberes-seccion">
        <h3 className="saberes-titulo">Saberes — {dictado?.nombre_mostrar}</h3>
        <p className="saberes-info">La carga de saberes se habilitará próximamente.</p>
      </div>

      {/* Toast de error */}
      {toast && <ToastError mensaje={toast} onCerrar={cerrarToast} />}
    </div>
  );
}