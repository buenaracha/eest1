// ============================================================
// ImpersonateBar — Barra para testear roles
// ============================================================
// Solo visible para usuarios con rol jerárquico.
// Permite ingresar el correo de otro usuario y ver la app
// exactamente como la vería esa persona.
// Útil para verificar que los permisos funcionan correctamente
// antes de que cada usuario real acceda al sistema.
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ImpersonateBar() {
  const { impersonando, perfil, perfilReal, impersonar, detenerImpersonacion } = useAuth();
  const [emailInput, setEmailInput] = useState('');
  const [error,      setError]      = useState('');
  const [cargando,   setCargando]   = useState(false);
  const navigate = useNavigate();

  async function handleImpersonar(e) {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setCargando(true);
    setError('');

    const resultado = await impersonar(emailInput.trim());

    if (resultado.ok) {
      setEmailInput('');
      // Redirigir a la pantalla correspondiente al rol del usuario impersonado
      const roles = perfil?.roles; // perfil ya fue actualizado por impersonar()
      // Navegar a la raíz y dejar que el router redirija según el nuevo rol
      navigate('/');
    } else {
      setError(resultado.error);
    }

    setCargando(false);
  }

  function handleDetener() {
    detenerImpersonacion();
    navigate('/');
  }

  // ── Si está impersonando: mostrar banner de aviso ─────────
  if (impersonando) {
    return (
      <div className="impersonate-bar impersonate-bar--activo">
        <span className="impersonate-bar__aviso">
          👁️ Estás viendo la app como: <strong>{perfil?.apellido}, {perfil?.nombre}</strong>
          {' '}({perfil?.email})
        </span>
        <button
          className="impersonate-bar__btn impersonate-bar__btn--detener"
          onClick={handleDetener}
        >
          Volver a mi cuenta
        </button>
      </div>
    );
  }

  // ── Si no está impersonando: mostrar el formulario ────────
  return (
    <div className="impersonate-bar">
      <span className="impersonate-bar__etiqueta">🔍 Ver como:</span>
      <form className="impersonate-bar__form" onSubmit={handleImpersonar}>
        <input
          type="email"
          className="impersonate-bar__input"
          placeholder="correo@abc.gob.ar"
          value={emailInput}
          onChange={e => { setEmailInput(e.target.value); setError(''); }}
          disabled={cargando}
        />
        <button
          type="submit"
          className="impersonate-bar__btn"
          disabled={cargando || !emailInput.trim()}
        >
          {cargando ? 'Buscando...' : 'Simular'}
        </button>
      </form>
      {error && <span className="impersonate-bar__error">{error}</span>}
    </div>
  );
}
