// ============================================================
// PanelInasistencias.jsx — con paso 0.25 y navegación ↓
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp }   from 'firebase/firestore';
import { db }                                         from '../../firebase';

const AÑO_LECTIVO = '2026';

const BIMESTRES = [
  { id: 'b1', label: '1° Bimestre' },
  { id: 'b2', label: '2° Bimestre' },
  { id: 'b3', label: '3° Bimestre' },
  { id: 'b4', label: '4° Bimestre' },
];

// ── Celda editable (sin flechitas, paso 0.25) ─────────────────
function CeldaInasistencia({ dni, bimestre, valor, filaIdx, totalFilas, onGuardar }) {
  const [local,  setLocal]  = useState(valor !== null && valor !== undefined ? String(valor) : '');
  const [estado, setEstado] = useState(null);
  const inputRef            = useRef(null);

  useEffect(() => {
    setLocal(valor !== null && valor !== undefined ? String(valor) : '');
  }, [valor]);

  async function handleBlur() {
    const limpio = local.toString().trim().replace(',', '.');
    const num    = limpio === '' ? null : parseFloat(limpio);

    if (limpio !== '' && (isNaN(num) || num < 0)) {
      setEstado('error');
      return;
    }
    // Redondear a múltiplo de 0.25
    const redondeado = num !== null ? Math.round(num * 4) / 4 : null;
    if (redondeado === valor) return;

    setEstado('guardando');
    const ok = await onGuardar(dni, bimestre, redondeado);
    setEstado(ok ? 'guardado' : 'error');
    if (ok) {
      setLocal(redondeado !== null ? String(redondeado) : '');
      setTimeout(() => setEstado(null), 2000);
    }
  }

  // ── Navegación: Enter/Tab → celda siguiente hacia ABAJO ──
  function handleKeyDown(e) {
    if (e.key !== 'Enter' && e.key !== 'Tab') return;
    e.preventDefault();

    // Guardar primero
    handleBlur();

    // Determinar fila destino
    const siguienteFila = e.shiftKey ? filaIdx - 1 : filaIdx + 1;
    if (siguienteFila < 0 || siguienteFila >= totalFilas) return;

    // Buscar el input de la misma columna en la fila siguiente
    const selector = `input[data-bimestre="${bimestre}"][data-fila="${siguienteFila}"]`;
    const nextInput = document.querySelector(selector);
    if (nextInput) nextInput.focus();
  }

  return (
    <td className="celda celda--editable" style={{ textAlign: 'center', width: 110 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <input
          ref={inputRef}
          className="celda__input celda__input--sin-flechas"
          type="number"
          min="0"
          step="0.25"
          value={local}
          // data-attributes para la navegación
          data-bimestre={bimestre}
          data-fila={filaIdx}
          onChange={e => { setLocal(e.target.value); setEstado(null); }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{ width: 70, textAlign: 'center' }}
        />
        {estado === 'guardando' && <span className="celda__spinner">⟳</span>}
        {estado === 'guardado'  && <span className="celda__ok">✓</span>}
        {estado === 'error'     && <span className="celda__error-ico" title="Valor inválido">✕</span>}
      </div>
    </td>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function PanelInasistencias({ cursoId, alumnos }) {
  const [bimestreActivo, setBimestreActivo] = useState('b1');
  const [inasistencias,  setInasistencias]  = useState({});
  const [cargando,       setCargando]       = useState(true);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      try {
        const resultados = await Promise.all(
          alumnos.map(async al => {
            const ref  = doc(db, 'estudiantes', al.dni, 'trayectorias_anuales', AÑO_LECTIVO);
            const snap = await getDoc(ref);
            return { dni: al.dni, inasistencias: snap.exists() ? (snap.data().inasistencias || {}) : {} };
          })
        );
        const obj = {};
        resultados.forEach(r => { obj[r.dni] = r.inasistencias; });
        setInasistencias(obj);
      } catch (err) {
        console.error('Error cargando inasistencias:', err);
      } finally {
        setCargando(false);
      }
    }
    if (alumnos.length > 0) cargar();
  }, [alumnos]);

  const guardar = useCallback(async (dni, bimestre, valor) => {
    try {
      await updateDoc(doc(db, 'estudiantes', dni, 'trayectorias_anuales', AÑO_LECTIVO), {
        [`inasistencias.${bimestre}`]: valor,
        ultima_modificacion:           serverTimestamp(),
      });
      setInasistencias(prev => ({ ...prev, [dni]: { ...prev[dni], [bimestre]: valor } }));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }, []);

  const total = alumnos.reduce((sum, al) => {
    const v = inasistencias[al.dni]?.[bimestreActivo];
    return sum + (v ?? 0);
  }, 0);

  if (cargando) {
    return (
      <div className="cargando-inline">
        <div className="spinner spinner--small" />
        <span>Cargando inasistencias...</span>
      </div>
    );
  }

  return (
    <div className="panel-seccion">
      <div className="panel-seccion__cabecera">
        <h3 className="panel-seccion__titulo">Inasistencias por bimestre</h3>
        <p className="panel-seccion__desc">
          Escala de 0.25. Enter o Tab para pasar al alumno siguiente.
          Auto-guarda al salir de cada celda.
        </p>
      </div>

      <div className="bimestre-tabs">
        {BIMESTRES.map(b => (
          <button
            key={b.id}
            className={`bimestre-tab ${bimestreActivo === b.id ? 'bimestre-tab--activo' : ''}`}
            onClick={() => setBimestreActivo(b.id)}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div className="grilla-scroll">
        <table className="grilla-tabla">
          <thead>
            <tr>
              <th className="grilla-th grilla-th--nombre">Apellido y Nombre</th>
              <th className="grilla-th" style={{ minWidth: 130 }}>
                {BIMESTRES.find(b => b.id === bimestreActivo)?.label}
              </th>
            </tr>
          </thead>
          <tbody>
            {alumnos.map((alumno, idx) => (
              <tr key={alumno.dni} className="fila-alumno">
                <td className="celda celda--nombre">{alumno.apellido_nombre}</td>
                <CeldaInasistencia
                  dni={alumno.dni}
                  bimestre={bimestreActivo}
                  valor={inasistencias[alumno.dni]?.[bimestreActivo] ?? null}
                  filaIdx={idx}
                  totalFilas={alumnos.length}
                  onGuardar={guardar}
                />
              </tr>
            ))}
          </tbody>
          {/* <tfoot>
            <tr>
              <td className="celda" style={{ fontWeight: 700, padding: '8px 12px', textAlign: 'right' }}>
                Total del bimestre:
              </td>
              <td className="celda" style={{ textAlign: 'center', fontWeight: 700 }}>
                {total}
              </td>
            </tr>
          </tfoot>*/}
        </table>
      </div>
    </div>
  );
}
