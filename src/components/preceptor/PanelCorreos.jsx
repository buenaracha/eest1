// ============================================================
// PanelCorreos.jsx
// ============================================================
// El preceptor actualiza los correos de contacto de cada familia.
// Pueden ser uno o varios (separados por coma).
// Datos: estudiantes/{dni}/emails_familia (array)
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc }           from 'firebase/firestore';
import { db }                               from '../../firebase';

// ── Fila de un alumno ─────────────────────────────────────────
function FilaCorreo({ alumno, emails, onGuardar }) {
  const [local,  setLocal]  = useState((emails || []).join(', '));
  const [estado, setEstado] = useState(null);

  useEffect(() => { setLocal((emails || []).join(', ')); }, [emails]);

  async function handleBlur() {
    // Parsear: separar por comas, limpiar espacios
    const nuevos = local
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0);

    // Validar que cada uno tenga @ (validación simple)
    const invalidos = nuevos.filter(e => !e.includes('@'));
    if (invalidos.length > 0) {
      setEstado('error');
      return;
    }

    // Si no cambió, no guardar
    const actual = (emails || []).join(', ');
    if (nuevos.join(', ') === actual) return;

    setEstado('guardando');
    const ok = await onGuardar(alumno.dni, nuevos);
    setEstado(ok ? 'guardado' : 'error');
    if (ok) setTimeout(() => setEstado(null), 2000);
  }

  return (
    <tr className="fila-alumno">
      <td className="celda celda--nombre">{alumno.apellido_nombre}</td>
      <td className="celda celda--editable" style={{ padding: '4px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            className="celda__input"
            type="text"
            value={local}
            onChange={e => { setLocal(e.target.value); setEstado(null); }}
            onBlur={handleBlur}
            placeholder="correo@ejemplo.com, otro@ejemplo.com"
            style={{ textAlign: 'left', minWidth: 300 }}
          />
          {estado === 'guardando' && <span className="celda__spinner">⟳</span>}
          {estado === 'guardado'  && <span className="celda__ok">✓</span>}
          {estado === 'error'     && (
            <span className="celda__error-ico" title="Correo inválido (verificá que tenga @)">✕</span>
          )}
        </div>
      </td>
      <td className="celda" style={{ textAlign: 'center', fontSize: 12, color: '#6b7280' }}>
        {(!emails || emails.length === 0) ? (
          <span style={{ color: '#ef4444' }}>⚠ Sin correo</span>
        ) : (
          `${emails.length} correo${emails.length !== 1 ? 's' : ''}`
        )}
      </td>
    </tr>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function PanelCorreos({ alumnos }) {
  const [emailsPorAlumno, setEmailsPorAlumno] = useState({}); // { dni: [email1, email2] }
  const [cargando, setCargando] = useState(true);
  const [sinCorreo, setSinCorreo] = useState(0);

  // ── Cargar emails de todos los alumnos ───────────────────
  useEffect(() => {
    async function cargar() {
      setCargando(true);
      try {
        const resultados = await Promise.all(
          alumnos.map(async (al) => {
            const snap = await getDoc(doc(db, 'estudiantes', al.dni));
            return {
              dni:    al.dni,
              emails: snap.exists() ? (snap.data().emails_familia || []) : [],
            };
          })
        );
        const obj = {};
        let sinEmail = 0;
        resultados.forEach(r => {
          obj[r.dni] = r.emails;
          if (!r.emails || r.emails.length === 0) sinEmail++;
        });
        setEmailsPorAlumno(obj);
        setSinCorreo(sinEmail);
      } catch (err) {
        console.error('Error cargando correos:', err);
      } finally {
        setCargando(false);
      }
    }
    if (alumnos.length > 0) cargar();
  }, [alumnos]);

  // ── Guardar emails de un alumno ──────────────────────────
  const guardar = useCallback(async (dni, nuevosEmails) => {
    try {
      await updateDoc(doc(db, 'estudiantes', dni), {
        emails_familia: nuevosEmails,
      });
      setEmailsPorAlumno(prev => ({ ...prev, [dni]: nuevosEmails }));
      setSinCorreo(prev => {
        const teníaSinCorreo = !emailsPorAlumno[dni] || emailsPorAlumno[dni].length === 0;
        const ahoraTienCorreo = nuevosEmails.length > 0;
        if (teníaSinCorreo && ahoraTienCorreo) return prev - 1;
        if (!teníaSinCorreo && !ahoraTienCorreo) return prev + 1;
        return prev;
      });
      return true;
    } catch (err) {
      console.error('Error guardando correo:', err);
      return false;
    }
  }, [emailsPorAlumno]);

  if (cargando) {
    return (
      <div className="cargando-inline">
        <div className="spinner spinner--small" />
        <span>Cargando correos...</span>
      </div>
    );
  }

  return (
    <div className="panel-seccion">
      <div className="panel-seccion__cabecera">
        <h3 className="panel-seccion__titulo">Correos de familia</h3>
        <p className="panel-seccion__desc">
          Podés ingresar uno o más correos separados por coma. Auto-guarda al salir de cada celda.
        </p>
      </div>

      {sinCorreo > 0 && (
        <div className="aviso aviso--info" style={{ marginBottom: 16 }}>
          <span className="aviso__icono">⚠️</span>
          <span>{sinCorreo} alumno{sinCorreo !== 1 ? 's' : ''} sin correo cargado. No recibirán el boletín.</span>
        </div>
      )}

      <div className="grilla-scroll">
        <table className="grilla-tabla">
          <thead>
            <tr>
              <th className="grilla-th grilla-th--nombre">Apellido y Nombre</th>
              <th className="grilla-th" style={{ minWidth: 340, textAlign: 'left', paddingLeft: 12 }}>
                Correo(s) de la familia
              </th>
              <th className="grilla-th" style={{ minWidth: 100 }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {alumnos.map(alumno => (
              <FilaCorreo
                key={alumno.dni}
                alumno={alumno}
                emails={emailsPorAlumno[alumno.dni]}
                onGuardar={guardar}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
