// ============================================================
// AuthContext — Contexto de autenticación y roles
// ============================================================
// Este módulo maneja TODO lo relacionado con usuarios:
//   - Detectar si hay alguien logueado (Firebase Auth)
//   - Buscar el perfil y rol en Firestore (colección "personal")
//   - Proveer funciones de login/logout
//   - Manejar la impersonación (ver la app como otro usuario)
//
// Todos los demás componentes acceden a esto con: useAuth()
// ============================================================

import { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

// Crear el contexto
const AuthContext = createContext(null);

// ============================================================
// Provider — envuelve toda la app (ver main.jsx)
// ============================================================
export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null);  // Usuario de Firebase Auth
  const [perfil,      setPerfil]      = useState(null);  // Documento de Firestore
  const [perfilReal,  setPerfilReal]  = useState(null);  // Perfil real (para impersonación)
  const [loading,     setLoading]     = useState(true);  // Mientras carga al inicio
  const [impersonando, setImpersonando] = useState(false);
  const [errorAcceso, setErrorAcceso] = useState(null);  // Mensaje de error de acceso

  // ── Escuchar cambios en la sesión de Firebase Auth ─────────
  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, async (firebaseUser) => {
      setErrorAcceso(null);

      if (firebaseUser) {
        setUser(firebaseUser);
        const datos = await buscarPerfil(firebaseUser.email);
        if (!datos) {
          // El correo no está en la colección "personal"
          setErrorAcceso(
            `El correo ${firebaseUser.email} no está registrado en el sistema. ` +
            `Comunicate con el administrador.`
          );
        }
      } else {
        // Se deslogueó
        setUser(null);
        setPerfil(null);
        setPerfilReal(null);
        setImpersonando(false);
      }

      setLoading(false);
    });

    return cancelar; // Limpiar el listener al desmontar
  }, []);

  // ── Buscar perfil en Firestore ──────────────────────────────
  async function buscarPerfil(email) {
    try {
      const ref  = doc(db, 'personal', email.toLowerCase().trim());
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const datos = { id: snap.id, ...snap.data() };
        setPerfil(datos);
        setPerfilReal(datos);
        return datos;
      } else {
        setPerfil(null);
        setPerfilReal(null);
        return null;
      }
    } catch (err) {
      console.error('Error buscando perfil:', err);
      setPerfil(null);
      return null;
    }
  }

  // ── Login con Google ────────────────────────────────────────
  async function login() {
    const provider = new GoogleAuthProvider();
    // Sugerir el dominio institucional como primera opción
    provider.setCustomParameters({ hd: 'abc.gob.ar' });
    await signInWithPopup(auth, provider);
  }

  // ── Logout ──────────────────────────────────────────────────
  async function logout() {
    setImpersonando(false);
    await signOut(auth);
  }

  // ── Impersonar: ver la app como otro usuario ────────────────
  // Solo disponible para jerárquicos. Útil para testear roles.
  async function impersonar(email) {
    try {
      const ref  = doc(db, 'personal', email.toLowerCase().trim());
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setPerfil({ id: snap.id, ...snap.data() });
        setImpersonando(true);
        return { ok: true };
      } else {
        return { ok: false, error: `No se encontró el correo: ${email}` };
      }
    } catch (err) {
      return { ok: false, error: 'Error al buscar el usuario.' };
    }
  }

  // ── Dejar de impersonar ─────────────────────────────────────
  function detenerImpersonacion() {
    setPerfil(perfilReal);
    setImpersonando(false);
  }

  // ── Helpers de roles ────────────────────────────────────────
  // Estos valores son cómodos para usar en los componentes
  const esDocente        = !!perfil?.roles?.docente;
  const esPreceptor      = !!perfil?.roles?.preceptor;
  const esJerarquico     = !!perfil?.roles?.jerarquico;
  const esAdministrativo = !!perfil?.roles?.administrativo;

  // El nombre para mostrar: "Apellido, Nombre" o el email si no hay perfil
  const nombreMostrar = perfil
    ? `${perfil.apellido}, ${perfil.nombre}`
    : user?.email || '';

  // ── Valor del contexto ──────────────────────────────────────
  const value = {
    user,
    perfil,
    perfilReal,
    loading,
    impersonando,
    errorAcceso,
    nombreMostrar,
    esDocente,
    esPreceptor,
    esJerarquico,
    esAdministrativo,
    login,
    logout,
    impersonar,
    detenerImpersonacion,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook de acceso rápido ───────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() debe usarse dentro de <AuthProvider>');
  return ctx;
}
