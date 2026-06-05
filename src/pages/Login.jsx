// ============================================================
// Login — Pantalla de inicio de sesión
// ============================================================

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { user, perfil, loading, login, logout, errorAcceso } = useAuth();
  const navigate = useNavigate();

  // Si ya está logueado y tiene perfil, redirigir al inicio
  useEffect(() => {
    if (!loading && user && perfil) {
      navigate('/');
    }
  }, [loading, user, perfil, navigate]);

  async function handleLogin() {
    try {
      await login();
      // La redirección la maneja el useEffect de arriba
    } catch (err) {
      // Si el usuario cierra el popup, no hacemos nada
      if (err.code !== 'auth/popup-closed-by-user') {
        console.error('Error al iniciar sesión:', err);
      }
    }
  }

  if (loading) {
    return (
      <div className="pantalla-carga">
        <div className="spinner" />
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="login">
      <div className="login__card">

        {/* Logo / nombre de la escuela */}
        <div className="login__cabecera">
          {/* Cuando tengas el PNG: <img src="/logo.png" alt="EEST N°1" className="login__logo" /> */}
          <div className="login__logo-placeholder">EEST N°1</div>
          <h1 className="login__titulo">E.E.S.T. N° 1</h1>
          <p className="login__subtitulo">Sistema de Calificaciones</p>
        </div>

        {/* Mensaje de error si el correo no está registrado */}
        {errorAcceso && (
          <div className="login__error">
            <p>{errorAcceso}</p>
            <button className="login__btn-secundario" onClick={logout}>
              Intentar con otra cuenta
            </button>
          </div>
        )}

        {/* Botón de login — solo mostrar si no hay error de acceso */}
        {!errorAcceso && (
          <div className="login__acciones">
            <p className="login__instruccion">
              Ingresá con tu correo institucional
            </p>
            <button className="login__btn-google" onClick={handleLogin}>
              <svg className="login__google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Ingresar con Google
            </button>
            <p className="login__nota">
              Usá tu correo <strong>@abc.gob.ar</strong>
            </p>
          </div>
        )}

        <p className="login__pie">
          Año lectivo {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
