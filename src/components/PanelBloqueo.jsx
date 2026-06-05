// ============================================================
// PanelBloqueo.jsx — rediseñado
// ============================================================
// Dos tipos de bloqueo:
//   nivel_bloqueo_boletin → aplicado al enviar boletines
//                           NO lo puede quitar el preceptor
//   nivel_bloqueo_manual  → aplicado manualmente por el preceptor
//                           El preceptor puede quitarlo
//
// El docente ve el máximo de ambos (nivel_bloqueo efectivo).
// El preceptor solo puede aplicar UN nivel por encima del actual.
// ============================================================

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db }        from '../../firebase';
import { useAuth }   from '../../contexts/AuthContext';
import { etiquetaBloqueo, PASOS_BLOQUEO } from '../../utils/calificaciones';

// ── Modal de confirmación ─────────────────────────────────────
function ModalConfirmacion({ dictado, texto, descripcion, esQuitar, onConfirmar, onCancelar, guardando }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3 className="modal__titulo">{esQuitar ? '🔓 Confirmar desbloqueo' : '⚠️ Confirmar bloqueo'}</h3>
        <p className="modal__texto">
          Materia: <strong>{dictado.nombre_mostrar}{dictado.grupo ? ` (${dictado.grupo})` : ''}</strong>
        </p>
        <p className="modal__texto">{texto}</p>
        <div className="aviso aviso--info" style={{ margin: '12px 0' }}>
          <span className="aviso__icono">ℹ️</span>
          <span>{descripcion}</span>
        </div>
        <div className="modal__acciones">
          <button className="btn btn--secundario" onClick={onCancelar} disabled={guardando}>Cancelar</button>
          <button
            className={`btn ${esQuitar ? 'btn--advertencia' : 'btn--peligro'}`}
            onClick={onConfirmar}
            disabled={guardando}
          >
            {guardando ? 'Procesando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function PanelBloqueo({ cursoId }) {
  const { perfil }             = useAuth();
  const [dictados,  setDictados]  = useState([]);
  const [cargando,  setCargando]  = useState(true);
  const [modal,     setModal]     = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      try {
        const snap  = await getDocs(collection(db, 'cursos', cursoId, 'dictados_materia'));
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
    if (cursoId) cargar();
  }, [cursoId]);

  // Nivel efectivo: máximo entre boletín y manual
  function nivelEfectivo(dictado) {
    return Math.max(dictado.nivel_bloqueo_boletin || 0, dictado.nivel_bloqueo_manual || 0);
  }

  // Abre modal para APLICAR el siguiente nivel de bloqueo manual
  function iniciarBloqueo(dictado) {
    const efectivo     = nivelEfectivo(dictado);
    const pasoSiguiente = PASOS_BLOQUEO.find(p => p.nivel === efectivo + 1);
    if (!pasoSiguiente) return;
    setModal({
      dictado,
      esQuitar:    false,
      texto:       `Cerrar período: ${pasoSiguiente.label}`,
      descripcion: `${pasoSiguiente.descripcion} El docente no podrá modificar los datos de ese período. Solo el equipo directivo puede revertir el bloqueo del boletín; vos podés revertir el manual.`,
      onConfirmar: () => aplicarBloqueoManual(dictado, efectivo + 1),
    });
  }

  // Abre modal para QUITAR el bloqueo manual
  function iniciarDesbloqueo(dictado) {
    const boletin = dictado.nivel_bloqueo_boletin || 0;
    const etiqBoletin = boletin > 0 ? etiquetaBloqueo(boletin) : 'ninguno';
    setModal({
      dictado,
      esQuitar:    true,
      texto:       'Quitar el bloqueo manual que aplicaste.',
      descripcion: `El bloqueo por envío de boletines (${etiqBoletin}) seguirá vigente y no puede quitarse desde aquí.`,
      onConfirmar: () => quitarBloqueoManual(dictado),
    });
  }

  // Aplica bloqueo manual
  async function aplicarBloqueoManual(dictado, nuevoNivel) {
    setGuardando(true);
    try {
      await updateDoc(doc(db, 'cursos', cursoId, 'dictados_materia', dictado.id), {
        nivel_bloqueo_manual: nuevoNivel,
        nivel_bloqueo:        Math.max(nuevoNivel, dictado.nivel_bloqueo_boletin || 0),
        fecha_ultimo_bloqueo: serverTimestamp(),
        bloqueado_por:        perfil?.email || '',
      });
      setDictados(prev => prev.map(d =>
        d.id === dictado.id
          ? { ...d, nivel_bloqueo_manual: nuevoNivel, nivel_bloqueo: Math.max(nuevoNivel, d.nivel_bloqueo_boletin || 0) }
          : d
      ));
      setModal(null);
    } catch (err) {
      console.error(err);
    } finally {
      setGuardando(false);
    }
  }

  // Quita solo el bloqueo manual (el de boletín queda)
  async function quitarBloqueoManual(dictado) {
    setGuardando(true);
    try {
      const boletin = dictado.nivel_bloqueo_boletin || 0;
      await updateDoc(doc(db, 'cursos', cursoId, 'dictados_materia', dictado.id), {
        nivel_bloqueo_manual: 0,
        nivel_bloqueo:        boletin,
        fecha_ultimo_bloqueo: serverTimestamp(),
        bloqueado_por:        perfil?.email || '',
      });
      setDictados(prev => prev.map(d =>
        d.id === dictado.id
          ? { ...d, nivel_bloqueo_manual: 0, nivel_bloqueo: boletin }
          : d
      ));
      setModal(null);
    } catch (err) {
      console.error(err);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return <div className="cargando-inline"><div className="spinner spinner--small" /><span>Cargando materias...</span></div>;
  }

  return (
    <div className="panel-seccion">
      <div className="panel-seccion__cabecera">
        <h3 className="panel-seccion__titulo">Bloqueo de períodos</h3>
        <p className="panel-seccion__desc">
          Podés aplicar un bloqueo manual por materia. Al enviar boletines, el sistema aplica su propio bloqueo automáticamente.
          Solo el equipo directivo puede revertir el bloqueo de boletines.
        </p>
      </div>

      {/* Leyenda */}
      <div className="bloqueo-leyenda">
        <span className="bloqueo-leyenda__item bloqueo-leyenda__item--boletin">📬 Bloqueo por boletín</span>
        <span className="bloqueo-leyenda__item bloqueo-leyenda__item--manual">🔒 Bloqueo manual (reversible)</span>
      </div>

      {/* Tabla compacta */}
      <div className="bloqueo-tabla-wrapper">
        <table className="bloqueo-tabla">
          <thead>
            <tr>
              <th className="bloqueo-tabla__th bloqueo-tabla__th--materia">Materia</th>
              <th className="bloqueo-tabla__th">Bloqueo boletín</th>
              <th className="bloqueo-tabla__th">Bloqueo manual</th>
              <th className="bloqueo-tabla__th">Efectivo</th>
              <th className="bloqueo-tabla__th bloqueo-tabla__th--acciones">Acción</th>
            </tr>
          </thead>
          <tbody>
            {dictados.map(dictado => {
              const boletin  = dictado.nivel_bloqueo_boletin || 0;
              const manual   = dictado.nivel_bloqueo_manual  || 0;
              const efectivo = Math.max(boletin, manual);
              const siguiente = PASOS_BLOQUEO.find(p => p.nivel === efectivo + 1);
              const tieneBloqManual = manual > boletin; // manual agrega por encima del boletín

              return (
                <tr key={dictado.id} className="bloqueo-fila">
                  <td className="bloqueo-tabla__td bloqueo-tabla__td--materia">
                    <strong>{dictado.nombre_mostrar}</strong>
                    {dictado.grupo && <span className="badge badge--grupo" style={{ marginLeft: 6 }}>{dictado.grupo}</span>}
                  </td>
                  <td className="bloqueo-tabla__td">
                    {boletin > 0
                      ? <span className="badge-bloqueo badge-bloqueo--boletin">{etiquetaBloqueo(boletin)}</span>
                      : <span className="bloqueo-ninguno">—</span>
                    }
                  </td>
                  <td className="bloqueo-tabla__td">
                    {manual > 0
                      ? <span className="badge-bloqueo badge-bloqueo--manual">{etiquetaBloqueo(manual)}</span>
                      : <span className="bloqueo-ninguno">—</span>
                    }
                  </td>
                  <td className="bloqueo-tabla__td">
                    <span className={`badge badge--bloqueo badge--bloqueo-${Math.min(Math.ceil(efectivo / 2), 5)}`}>
                      {etiquetaBloqueo(efectivo)}
                    </span>
                  </td>
                  <td className="bloqueo-tabla__td bloqueo-tabla__td--acciones">
                    <div className="bloqueo-acciones">
                      {/* Botón quitar bloqueo manual (solo si manual > boletin) */}
                      {tieneBloqManual && (
                        <button
                          className="btn-bloqueo btn-bloqueo--quitar"
                          onClick={() => iniciarDesbloqueo(dictado)}
                          title="Quitar bloqueo manual"
                        >
                          🔓 Quitar manual
                        </button>
                      )}
                      {/* Botón cerrar siguiente período */}
                      {siguiente ? (
                        <button
                          className="btn-bloqueo btn-bloqueo--cerrar"
                          onClick={() => iniciarBloqueo(dictado)}
                        >
                          🔒 {siguiente.label}
                        </button>
                      ) : (
                        <span className="bloqueo-cerrado">Año cerrado</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <ModalConfirmacion
          dictado={modal.dictado}
          texto={modal.texto}
          descripcion={modal.descripcion}
          esQuitar={modal.esQuitar}
          onConfirmar={modal.onConfirmar}
          onCancelar={() => setModal(null)}
          guardando={guardando}
        />
      )}
    </div>
  );
}
