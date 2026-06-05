// ============================================================
// FormAgregarDocente.jsx — ABM completo con búsqueda local
// ============================================================
// - Búsqueda en vivo con sugerencias
// - Validaciones en tiempo real (onBlur)
// - Carga de datos existentes al hacer clic (CORREGIDO)
// - Baja lógica (checkbox Inactivo)
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, setDoc, getDoc, getDocs, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const ROLES_DISPONIBLES = [
  { id: 'docente',         label: 'Docente' },
  { id: 'preceptor',       label: 'Preceptor/a' },
  { id: 'jerarquico',      label: 'Jerárquico/a' },
  { id: 'administrativo',  label: 'Administrativo/a' },
];

const FORMULARIO_INICIAL = {
  dni:              '',
  apellido:         '',
  nombre:           '',
  email:            '',
  fecha_nacimiento: '',
  domicilio:        '',
  telefono:         '',
  titulos:          '',
  roles: {
    docente:         false,
    preceptor:       false,
    jerarquico:      false,
    administrativo:  false,
  },
  activo: true,
};

function Campo({ label, requerido, error, children }) {
  return (
    <div className="form-campo">
      <label className="form-campo__label">
        {label} {requerido && <span className="form-campo__req">*</span>}
      </label>
      {children}
      {error && <span className="form-campo__error">{error}</span>}
    </div>
  );
}

// ── Función para quitar tildes y normalizar texto ─────────────────
function normalizarTexto(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '');
}

// ── Función para capitalizar cada palabra ─────────────────────────
function capitalizarTexto(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .split(' ')
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
}

// ── Validación de campo específico ────────────────────────────────
function validarCampo(campo, valor) {
  switch (campo) {
    case 'dni':
      if (!valor || valor.trim() === '') return 'El DNI es obligatorio.';
      if (isNaN(Number(valor))) return 'El DNI debe ser numérico.';
      const dniNum = parseInt(valor);
      if (dniNum < 1000000 || dniNum > 99999999) return 'El DNI debe tener entre 7 y 8 dígitos.';
      return null;
      
    case 'apellido':
      if (!valor || valor.trim() === '') return 'El apellido es obligatorio.';
      if (valor.trim().length < 2) return 'El apellido debe tener al menos 2 caracteres.';
      return null;
      
    case 'nombre':
      if (!valor || valor.trim() === '') return 'El nombre es obligatorio.';
      if (valor.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres.';
      return null;
      
    case 'email':
      if (!valor || valor.trim() === '') return 'El correo es obligatorio.';
      if (!valor.includes('@')) return 'El correo no parece válido.';
      const dominio = valor.split('@')[1];
      if (dominio !== 'abc.gob.ar') return 'El correo debe ser del dominio @abc.gob.ar';
      return null;
      
    default:
      return null;
  }
}

export default function FormAgregarDocente({ onGuardado, onCancelar }) {
  const [form, setForm] = useState(FORMULARIO_INICIAL);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);
  
  const [todosLosPersonal, setTodosLosPersonal] = useState([]);
  const [sugerencias, setSugerencias] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [editandoExistente, setEditandoExistente] = useState(false);
  const [emailOriginal, setEmailOriginal] = useState('');
  const [cargandoPersonal, setCargandoPersonal] = useState(false);
  
  // Ref para la función de carga (evita problemas de closure)
  const cargarDatosExistenteRef = useRef(null);

  // ── Cargar todo el personal desde Firebase ──────────────────────
  const cargarTodoElPersonal = useCallback(async () => {
    console.log('🔄 Cargando personal desde Firebase...');
    setCargandoPersonal(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'personal'));
      const personal = [];
      querySnapshot.forEach(doc => {
        personal.push({ id: doc.id, ...doc.data() });
      });
      setTodosLosPersonal(personal);
      console.log(`✅ Cargados ${personal.length} registros`);
      return personal;
    } catch (error) {
      console.error('Error al cargar personal:', error);
      return [];
    } finally {
      setCargandoPersonal(false);
    }
  }, []);

  // ── Cargar datos al montar el componente (solo una vez) ─────────
  useEffect(() => {
    cargarTodoElPersonal();
  }, []); // Solo se ejecuta una vez al montar

  // ── Buscar localmente mientras escribís ────────────────────────
  useEffect(() => {
    if (editandoExistente) return;
    
    const apellidoBuscado = normalizarTexto(form.apellido);
    const nombreBuscado = normalizarTexto(form.nombre);
    
    if (!apellidoBuscado && !nombreBuscado) {
      setSugerencias([]);
      setMostrarSugerencias(false);
      return;
    }

    const filtrados = todosLosPersonal.filter(persona => {
      const personaApellido = normalizarTexto(persona.apellido);
      const personaNombre = normalizarTexto(persona.nombre);
      
      if (apellidoBuscado && nombreBuscado) {
        return personaApellido.includes(apellidoBuscado) && personaNombre.includes(nombreBuscado);
      } else if (apellidoBuscado) {
        return personaApellido.includes(apellidoBuscado);
      } else if (nombreBuscado) {
        return personaNombre.includes(nombreBuscado);
      }
      return false;
    });
    
    setSugerencias(filtrados);
    setMostrarSugerencias(filtrados.length > 0);
  }, [form.apellido, form.nombre, todosLosPersonal, editandoExistente]);

  // ── Cargar datos de una persona existente ──────────────────────
  const cargarDatosExistente = useCallback((persona) => {
    console.log('🎯 EJECUTANDO cargarDatosExistente para:', persona?.apellido);
    
    if (!persona) {
      console.error('❌ No hay persona');
      return;
    }
    
    const formatFecha = (fecha) => {
      if (!fecha) return '';
      if (fecha.toDate) {
        return fecha.toDate().toISOString().split('T')[0];
      }
      if (typeof fecha === 'string') return fecha;
      return '';
    };

    const rolesIniciales = {
      docente: false,
      preceptor: false,
      jerarquico: false,
      administrativo: false,
    };

    const rolesCargados = { ...rolesIniciales, ...(persona.roles || {}) };

    const titulosString = Array.isArray(persona.titulos) 
      ? persona.titulos.join('\n') 
      : (persona.titulos || '');

    // Actualizar el formulario con los datos
    setForm({
      dni: persona.dni?.toString() || '',
      apellido: persona.apellido || '',
      nombre: persona.nombre || '',
      email: persona.email || '',
      fecha_nacimiento: formatFecha(persona.fecha_nacimiento),
      domicilio: persona.domicilio || '',
      telefono: persona.telefono || '',
      titulos: titulosString,
      roles: rolesCargados,
      activo: persona.activo ?? true,
    });

    setEditandoExistente(true);
    setEmailOriginal(persona.email);
    setMostrarSugerencias(false);
    setSugerencias([]);
    setErrores({});

    if (persona.activo === false) {
      setErrores({ general: '⚠️ Esta persona está dada de baja. Podés reactivarla al guardar.' });
    }
    
    console.log('✅ Datos cargados para:', persona.apellido);
  }, []);

  // Guardar la función en el ref para usarla desde el onMouseDown
  cargarDatosExistenteRef.current = cargarDatosExistente;

  // ── SetField solo para cambios del usuario ─────────────────────
  function setField(campo, valor) {
    let valorFormateado = valor;
    if (campo === 'apellido' || campo === 'nombre') {
      valorFormateado = capitalizarTexto(valor);
    }
    
    setForm(prev => ({ ...prev, [campo]: valorFormateado }));
    setErrores(prev => ({ ...prev, [campo]: null, general: null }));
    
    if ((campo === 'apellido' || campo === 'nombre') && editandoExistente) {
      setEditandoExistente(false);
      setEmailOriginal('');
    }
  }

  // ── Validar campo al perder foco ───────────────────────────────
  function handleBlur(campo) {
    const error = validarCampo(campo, form[campo]);
    setErrores(prev => ({ ...prev, [campo]: error }));
  }

  function setRol(rol, valor) {
    setForm(prev => ({ ...prev, roles: { ...prev.roles, [rol]: valor } }));
    setErrores(prev => ({ ...prev, roles: null }));
  }

  function resetearFormulario() {
    setForm(FORMULARIO_INICIAL);
    setErrores({});
    setEditandoExistente(false);
    setEmailOriginal('');
    setSugerencias([]);
    setMostrarSugerencias(false);
  }

  // ── Validación completa al guardar ─────────────────────────────
  function validarCompleto() {
    const errs = {};
    
    errs.dni = validarCampo('dni', form.dni);
    errs.apellido = validarCampo('apellido', form.apellido);
    errs.nombre = validarCampo('nombre', form.nombre);
    errs.email = validarCampo('email', form.email);
    
    if (!Object.values(form.roles).some(Boolean)) {
      errs.roles = 'Seleccioná al menos un rol.';
    }
    
    Object.keys(errs).forEach(key => errs[key] === null && delete errs[key]);
    
    return errs;
  }

  // ── Guardar (Alta o Modificación) ──────────────────────────────
  async function handleGuardar() {
    const errs = validarCompleto();
    if (Object.keys(errs).length > 0) {
      setErrores(errs);
      return;
    }

    setGuardando(true);
    try {
      const email = form.email.trim().toLowerCase();
      const ref = doc(db, 'personal', email);

      const titulos = form.titulos
        .split('\n')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const ahora = serverTimestamp();
      const datosBase = {
        dni: parseInt(form.dni.trim()),
        apellido: form.apellido.trim(),
        nombre: form.nombre.trim(),
        email,
        fecha_nacimiento: form.fecha_nacimiento || null,
        domicilio: form.domicilio.trim() || null,
        telefono: form.telefono.trim() || null,
        titulos: titulos.length > 0 ? titulos : null,
        roles: form.roles,
        activo: form.activo,
        fecha_modificacion: ahora,
      };

      if (!editandoExistente) {
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setErrores({ email: 'Ya existe un usuario con ese correo.' });
          setGuardando(false);
          return;
        }
        await setDoc(ref, {
          ...datosBase,
          cursos_preceptor: [],
          fecha_creacion: ahora,
        });
        console.log('✅ Alta exitosa:', email);
      } else {
        await setDoc(ref, datosBase, { merge: true });
        console.log('✅ Modificación exitosa:', email);
      }

      // Actualizar caché local
      const personaActualizada = { id: email, ...datosBase };
      setTodosLosPersonal(prev => {
        const index = prev.findIndex(p => p.id === email);
        if (index >= 0) {
          const nuevos = [...prev];
          nuevos[index] = personaActualizada;
          return nuevos;
        }
        return [...prev, personaActualizada];
      });

      setExito(true);
      resetearFormulario();
      if (onGuardado) onGuardado(email);
    } catch (err) {
      console.error('❌ Error al guardar:', err);
      setErrores({ general: `Error al guardar: ${err.message}` });
    } finally {
      setGuardando(false);
    }
  }

  // ── Pantalla de éxito ──────────────────────────────────────────
  if (exito) {
    return (
      <div className="form-exito">
        <div className="form-exito__icono">✅</div>
        <h3>¡Operación completada correctamente!</h3>
        <p>El personal ha sido {editandoExistente ? 'actualizado' : 'agregado'} en el sistema.</p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button className="btn btn--primario" onClick={() => { setExito(false); resetearFormulario(); cargarTodoElPersonal(); }}>
            Nuevo registro
          </button>
          {onCancelar && (
            <button className="btn btn--secundario" onClick={onCancelar}>
              Cerrar
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Render principal ───────────────────────────────────────────
  return (
    <div className="form-docente">
      {errores.general && (
        <div className="aviso aviso--error">
          <span className="aviso__icono">⚠️</span>
          <span>{errores.general}</span>
        </div>
      )}

      {editandoExistente && (
        <div className="aviso aviso--info" style={{ marginBottom: '16px', backgroundColor: '#e3f2fd', padding: '8px', borderRadius: '8px' }}>
          <span>✏️ Modo edición: {form.apellido}, {form.nombre}</span>
          <button 
            style={{ marginLeft: '12px', background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer' }}
            onClick={() => { resetearFormulario(); cargarTodoElPersonal(); }}
          >
            [Cancelar edición]
          </button>
        </div>
      )}

      {/* Sección: datos de identidad */}
      <div className="form-seccion">
        <h4 className="form-seccion__titulo">Datos de identidad</h4>
        <div className="form-grid form-grid--3">
          
          <Campo label="DNI" requerido error={errores.dni}>
            <input
              className={`form-input ${errores.dni ? 'form-input--error' : ''}`}
              type="number"
              placeholder="12345678"
              value={form.dni}
              onChange={e => setField('dni', e.target.value)}
              onBlur={() => handleBlur('dni')}
            />
          </Campo>

          <div className="form-campo" style={{ position: 'relative' }}>
            <Campo label="Apellido" requerido error={errores.apellido}>
              <input
                className={`form-input ${errores.apellido ? 'form-input--error' : ''}`}
                type="text"
                placeholder="García"
                value={form.apellido}
                onChange={e => setField('apellido', e.target.value)}
                onFocus={() => {
                  if (sugerencias.length > 0) setMostrarSugerencias(true);
                }}
                onBlur={() => {
                  setTimeout(() => setMostrarSugerencias(false), 200);
                  handleBlur('apellido');
                }}
              />
            </Campo>
            
            {/* Sugerencias de búsqueda */}
            {mostrarSugerencias && sugerencias.length > 0 && !editandoExistente && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '4px',
                maxHeight: '250px',
                overflowY: 'auto',
                zIndex: 1000,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}>
                {sugerencias.map(persona => (
                  <div
                    key={persona.id}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #eee',
                      backgroundColor: persona.activo ? '#fff' : '#fff3f3'
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🖱️ MOUSE DOWN en:', persona.apellido);
                      if (cargarDatosExistenteRef.current) {
                        cargarDatosExistenteRef.current(persona);
                      } else {
                        console.error('❌ Función no disponible');
                        cargarDatosExistente(persona);
                      }
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = persona.activo ? '#fff' : '#fff3f3'}
                  >
                    <div style={{ fontWeight: 'bold' }}>
                      {persona.apellido}, {persona.nombre}
                    </div>
                    <div style={{ fontSize: '0.8em', color: '#666' }}>
                      {persona.email} • DNI: {persona.dni}
                    </div>
                    {!persona.activo && (
                      <div style={{ fontSize: '0.7em', color: '#dc3545', marginTop: '4px' }}>
                        ⚠️ Dado de baja
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Campo label="Nombre" requerido error={errores.nombre}>
            <input
              className={`form-input ${errores.nombre ? 'form-input--error' : ''}`}
              type="text"
              placeholder="Juan"
              value={form.nombre}
              onChange={e => setField('nombre', e.target.value)}
              onBlur={() => handleBlur('nombre')}
            />
          </Campo>

        </div>
        {mostrarSugerencias && sugerencias.length > 0 && !editandoExistente && (
          <div className="form-campo__ayuda" style={{ marginTop: '8px', color: '#1976d2' }}>
            💡 {sugerencias.length} coincidencia(s). Click para cargar datos.
          </div>
        )}
        {cargandoPersonal && (
          <div className="form-campo__ayuda">Cargando lista de personal...</div>
        )}
      </div>

      {/* Sección: contacto */}
      <div className="form-seccion">
        <h4 className="form-seccion__titulo">Contacto</h4>
        <div className="form-grid form-grid--2">

          <Campo label="Correo institucional" requerido error={errores.email}>
            <input
              className={`form-input ${errores.email ? 'form-input--error' : ''}`}
              type="email"
              placeholder="usuario@abc.gob.ar"
              value={form.email}
              onChange={e => setField('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              disabled={editandoExistente}
            />
            {editandoExistente && (
              <span className="form-campo__ayuda" style={{ color: '#ff9800' }}>
                🔒 El correo no se puede modificar en edición.
              </span>
            )}
          </Campo>

          <Campo label="Teléfono" error={errores.telefono}>
            <input
              className="form-input"
              type="text"
              placeholder="11-1234-5678"
              value={form.telefono}
              onChange={e => setField('telefono', e.target.value)}
            />
          </Campo>

        </div>
      </div>

      {/* Sección: datos personales */}
      <div className="form-seccion">
        <h4 className="form-seccion__titulo">Datos personales</h4>
        <div className="form-grid form-grid--2">

          <Campo label="Fecha de nacimiento" error={errores.fecha_nacimiento}>
            <input
              className="form-input"
              type="date"
              value={form.fecha_nacimiento}
              onChange={e => setField('fecha_nacimiento', e.target.value)}
            />
          </Campo>

          <Campo label="Domicilio" error={errores.domicilio}>
            <input
              className="form-input"
              type="text"
              placeholder="Calle 123, Ciudad"
              value={form.domicilio}
              onChange={e => setField('domicilio', e.target.value)}
            />
          </Campo>

        </div>

        <Campo label="Títulos habilitantes" error={errores.titulos}>
          <textarea
            className="form-input form-input--textarea"
            placeholder="Escribí un título por línea. Ej:&#10;Profesor de Matemática&#10;Técnico en Electrónica"
            value={form.titulos}
            rows={3}
            onChange={e => setField('titulos', e.target.value)}
          />
          <span className="form-campo__ayuda">Un título por línea.</span>
        </Campo>
      </div>

      {/* Sección: roles */}
      <div className="form-seccion">
        <h4 className="form-seccion__titulo">Roles en el sistema</h4>
        {errores.roles && <span className="form-campo__error" style={{ marginBottom: 8, display: 'block' }}>{errores.roles}</span>}
        <div className="form-roles" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {ROLES_DISPONIBLES.map(rol => (
            <label key={rol.id} className="form-rol" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                checked={form.roles[rol.id]}
                onChange={e => setRol(rol.id, e.target.checked)}
              />
              <span>{rol.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Sección: Estado (Baja lógica) */}
      <div className="form-seccion">
        <h4 className="form-seccion__titulo">Estado en el sistema</h4>
        <div className="form-checkbox" style={{ marginTop: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!form.activo}
              onChange={e => {
                const nuevoEstado = !e.target.checked;
                setForm(prev => ({ ...prev, activo: nuevoEstado }));
                if (nuevoEstado === false) {
                  setErrores({ ...errores, general: '⚠️ Esta persona quedará como INACTIVA. No podrá ingresar al sistema.' });
                } else {
                  setErrores({ ...errores, general: null });
                }
              }}
            />
            <span style={{ fontWeight: '500' }}>
              {!form.activo ? '🔴 Marcar como Activo' : '⚫ Marcar como Inactivo'}
            </span>
          </label>
          <span className="form-campo__ayuda" style={{ display: 'block', marginTop: '4px', fontSize: '0.8em' }}>
            {!form.activo 
              ? '✅ Al activar, la persona podrá volver a ingresar al sistema.' 
              : '⚠️ Al marcar como inactivo, la persona NO podrá ingresar hasta que se reactive.'}
          </span>
        </div>
      </div>

      {/* Acciones */}
      <div className="form-acciones" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
        {onCancelar && (
          <button className="btn btn--secundario" onClick={onCancelar} disabled={guardando}>
            Cancelar
          </button>
        )}
        <button className="btn btn--primario" onClick={handleGuardar} disabled={guardando}>
          {guardando ? 'Guardando...' : editandoExistente ? '💾 Guardar cambios' : '✓ Agregar al sistema'}
        </button>
      </div>
    </div>
  );
}