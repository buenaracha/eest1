// ============================================================
// PanelBloqueo.jsx — 10 períodos de bloqueo
// ============================================================

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db }                  from '../../firebase';
import { useAuth }             from '../../contexts/AuthContext';
import { etiquetaBloqueo, PASOS_BLOQUEO } from '../../utils/calificaciones';

// ── Barra de progreso visual ──────────────────────────────────
function BarraBloqueo({ nivel }) {
  return (
    <div className="barra-bloqueo">
      {PASOS_BLOQUEO.map(paso => {
        const activo = nivel >= paso.nivel;
        return (
          <div
            key={paso.nivel}
            className={`barra-bloqueo__paso ${activo ? 'barra-bloqueo__paso--activo' : ''}`}
            title={paso.label}
          >
            <span>{activo ? '🔒' : '🔓'}</span>
            <span className="barra-bloqueo__paso-label">{paso.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Modal de confirmación ─────────────────────────────────────
function ModalConfirmacion({ dictado, pasoSiguiente, onConfirmar, onCancelar, guardando }) {
  if (!pasoSiguiente) return null;
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3 className="modal__titulo">⚠️ Confirmar bloqueo</h3>
        <p className="modal__texto">
          Estás por cerrar el período <strong>{pasoSiguiente.label}</strong> de:
        </p>
        <p className="modal__texto">
          <strong>{dictado.nombre_mostrar}{dictado.grupo ? ` (${dictado.grupo})` : ''}</strong>
        </p>
        {pasoSiguiente.campo && (
          <p className="modal__texto" style={{ fontSize: 13, color: '#6b7280' }}>
            Campo que se bloqueará: <strong>{pasoSiguiente.campo}</strong>
          </p>
        )}
        <div className="aviso aviso--info" style={{ margin: '12px 0' }}>
          <span className="aviso__icono">ℹ️</span>
          <span>{pasoSiguiente.descripcion} Esta acción solo puede revertirla el equipo directivo.</span>
        </div>
        <div className="modal__acciones">
          <button className="btn btn--secundario" onClick={onCancelar} disabled={guardando}>
            Cancelar
          </button>
          <button className="btn btn--peligro" onClick={onConfirmar} disabled={guardando}>
            {guardando ? 'Bloqueando...' : 'Confirmar bloqueo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function PanelBloqueo({ cursoId }) {
  const { perfil }              = useAuth();
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
          .filter(d => d.activo !== false)
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

  function iniciarBloqueo(dictado) {
    const nivel         = dictado.nivel_bloqueo || 0;
    const pasoSiguiente = PASOS_BLOQUEO.find(p => p.nivel === nivel + 1);
    if (!pasoSiguiente) return;
    setModal({ dictado, pasoSiguiente });
  }

  async function confirmarBloqueo() {
    if (!modal) return;
    setGuardando(true);
    try {
      const { dictado, pasoSiguiente } = modal;
      await updateDoc(doc(db, 'cursos', cursoId, 'dictados_materia', dictado.id), {
        nivel_bloqueo:        pasoSiguiente.nivel,
        fecha_ultimo_bloqueo: serverTimestamp(),
        bloqueado_por:        perfil?.email || '',
      });
      setDictados(prev =>
        prev.map(d => d.id === dictado.id ? { ...d, nivel_bloqueo: pasoSiguiente.nivel } : d)
      );
      setModal(null);
    } catch (err) {
      console.error('Error al bloquear:', err);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="cargando-inline">
        <div className="spinner spinner--small" />
        <span>Cargando materias...</span>
      </div>
    );
  }

  return (
    <div className="panel-seccion">
      <div className="panel-seccion__cabecera">
        <h3 className="panel-seccion__titulo">Bloqueo de períodos</h3>
        <p className="panel-seccion__desc">
          Una vez cerrado un período, los docentes no pueden modificar esas notas.
          Solo el equipo directivo puede revertir un bloqueo.
        </p>
      </div>

      <div className="bloqueo-lista">
        {dictados.map(dictado => {
          const nivel      = dictado.nivel_bloqueo || 0;
          const siguiente  = PASOS_BLOQUEO.find(p => p.nivel === nivel + 1);
          const cerrado    = nivel >= 10;

          return (
            <div key={dictado.id} className="bloqueo-card">
              <div className="bloqueo-card__cabecera">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="bloqueo-card__nombre">{dictado.nombre_mostrar}</span>
                  {dictado.grupo && <span className="badge badge--grupo">{dictado.grupo}</span>}
                </div>
                <span className={`badge badge--bloqueo badge--bloqueo-${Math.min(Math.ceil(nivel / 2), 5)}`}>
                  {etiquetaBloqueo(nivel)}
                </span>
              

              <div className="bloqueo-card__accion">
                {cerrado ? (
                  <span className="bloqueo-card__cerrado">🔒 Año completamente cerrado</span>
                ) : (
                  <button className="btn btn--advertencia" onClick={() => iniciarBloqueo(dictado)}>
                    🔒 Cerrar: {siguiente?.label}
                  </button>
                )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <ModalConfirmacion
          dictado={modal.dictado}
          pasoSiguiente={modal.pasoSiguiente}
          onConfirmar={confirmarBloqueo}
          onCancelar={() => setModal(null)}
          guardando={guardando}
        />
      )}
    </div>
  );
}
