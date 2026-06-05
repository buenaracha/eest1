// ============================================================
// utils/calificaciones.js — versión con 10 niveles de bloqueo
// ============================================================

export const VALORES_INFORME  = ['TEA', 'TEP', 'TED'];
export const VALOR_NO_APLICA  = '—';
export const VALOR_AUSENTE    = 'A';
export const NOTA_MINIMA      = 7;

export const PERIODOS_CARGABLES = ['INF1','C1','IC1','INF2','C2','INOV','IDIC','IFEB'];

export const PERIODOS_TODOS = [
  { value: 'INF1',  label: '1° Informe' },
  { value: 'C1',    label: '1° Cuatrimestre' },
  { value: 'IC1',   label: 'Int. Julio' },
  { value: 'INF2',  label: '2° Informe' },
  { value: 'C2',    label: '2° Cuatrimestre' },
  { value: 'INOV',  label: 'Int. Noviembre' },
  { value: 'ANUAL', label: 'Anual' },
  { value: 'IDIC',  label: 'Int. Diciembre' },
  { value: 'IFEB',  label: 'Int. Febrero' },
  { value: 'FINAL', label: 'Final' },
];

export const COLUMNAS = [
  { campo: 'INF1',  label: 'Inf. 1°',  tipo: 'informe',         bloqueo: 1,  ancho: 75  },
  { campo: 'C1',    label: 'Nota 1°',  tipo: 'nota',            bloqueo: 2,  ancho: 65  },
  { campo: 'IC1',   label: 'Int. Jul', tipo: 'intensificacion', bloqueo: 3,  ancho: 65  },
  { campo: 'INF2',  label: 'Inf. 2°',  tipo: 'informe',         bloqueo: 4,  ancho: 75  },
  { campo: 'C2',    label: 'Nota 2°',  tipo: 'nota',            bloqueo: 5,  ancho: 65  },
  { campo: 'INOV',  label: 'Int. Nov', tipo: 'intensificacion', bloqueo: 6,  ancho: 65  },
  { campo: 'ANUAL', label: 'Anual',    tipo: 'calculado',       bloqueo: 99, ancho: 65  },
  { campo: 'IDIC',  label: 'Int. Dic', tipo: 'intensificacion', bloqueo: 8,  ancho: 65  },
  { campo: 'IFEB',  label: 'Int. Feb', tipo: 'intensificacion', bloqueo: 9,  ancho: 65  },
  { campo: 'FINAL', label: 'Final',    tipo: 'calculado',       bloqueo: 99, ancho: 65  },
];

export const COLUMNAS_EXTRA = [
  { campo: 'inasistencias_docente_1c', label: 'Inasist. 1°C', tipo: 'numero', ancho: 75 },
  { campo: 'inasistencias_docente_2c', label: 'Inasist. 2°C', tipo: 'numero', ancho: 75 },
];

// ── Pasos de bloqueo: 10 períodos ────────────────────────────
// nivel → qué nuevo campo se bloquea en ese paso
export const PASOS_BLOQUEO = [
  { nivel: 1,  label: '1° Informe',        campo: 'INF1', descripcion: 'Se cierra el 1° Informe para todos los docentes.' },
  { nivel: 2,  label: '1° Cuatrimestre',   campo: 'C1',   descripcion: 'Se cierra la nota del 1° Cuatrimestre.' },
  { nivel: 3,  label: 'Int. de Julio',     campo: 'IC1',  descripcion: 'Se cierra la intensificación de julio.' },
  { nivel: 4,  label: '2° Informe',        campo: 'INF2', descripcion: 'Se cierra el 2° Informe.' },
  { nivel: 5,  label: '2° Cuatrimestre',   campo: 'C2',   descripcion: 'Se cierra la nota del 2° Cuatrimestre.' },
  { nivel: 6,  label: 'Int. de Noviembre', campo: 'INOV', descripcion: 'Se cierra la intensificación de noviembre.' },
  { nivel: 7,  label: 'Anual',             campo: null,   descripcion: 'Se cierra el período anual (calculado). No se puede modificar ningún dato del año.' },
  { nivel: 8,  label: 'Int. de Diciembre', campo: 'IDIC', descripcion: 'Se cierra la intensificación de diciembre.' },
  { nivel: 9,  label: 'Int. de Febrero',   campo: 'IFEB', descripcion: 'Se cierra la intensificación de febrero.' },
  { nivel: 10, label: 'Final / Año cerrado', campo: null, descripcion: 'Año completamente cerrado. Ningún docente puede modificar nada.' },
];

// ── Validación ───────────────────────────────────────────────

export function esInformeValido(v) {
  return VALORES_INFORME.includes(v?.toString().toUpperCase().trim());
}

export function esNotaValida(v) {
  if (!v && v !== 0) return false;
  const s = v.toString().trim().toUpperCase();
  if (s === VALOR_AUSENTE) return true;
  const n = Number(s);
  return !isNaN(n) && Number.isInteger(n) && n >= 0 && n <= 10;
}

export function esIntensificacionValida(v) {
  if (!v && v !== 0) return false;
  const s = v.toString().trim();
  return s === VALOR_NO_APLICA || esNotaValida(s);
}

export function esNumeroValido(v) {
  if (!v && v !== 0) return false;
  const n = Number(v);
  return !isNaN(n) && n >= 0;
}

export function validarCampo(campo, valor) {
  const col = [...COLUMNAS, ...COLUMNAS_EXTRA].find(c => c.campo === campo);
  if (!col) return { ok: true, mensaje: '' };
  if (valor === null || valor === undefined || valor.toString().trim() === '') {
    return { ok: true, mensaje: '' };
  }
  const v = valor.toString().trim();
  switch (col.tipo) {
    case 'informe':
      return esInformeValido(v) ? { ok: true, mensaje: '' }
        : { ok: false, mensaje: 'Debe ser TEA, TEP o TED' };
    case 'nota':
      return esNotaValida(v) ? { ok: true, mensaje: '' }
        : { ok: false, mensaje: 'Debe ser un número 0-10 o la letra A' };
    case 'intensificacion':
      return esIntensificacionValida(v) ? { ok: true, mensaje: '' }
        : { ok: false, mensaje: 'Debe ser 0-10, A o —' };
    case 'numero':
      return esNumeroValido(v) ? { ok: true, mensaje: '' }
        : { ok: false, mensaje: 'Debe ser un número positivo' };
    default:
      return { ok: true, mensaje: '' };
  }
}

// ── Normalización ─────────────────────────────────────────────

export function normalizarValor(tipo, valor) {
  if (!valor && valor !== 0) return null;
  const v = valor.toString().trim();
  if (v === '') return null;
  if (tipo === 'informe')          return v.toUpperCase();
  if (tipo === 'intensificacion') {
    if (v === '-' || v === '--')   return VALOR_NO_APLICA;
    if (v.toUpperCase() === 'A')   return VALOR_AUSENTE;
    return v;
  }
  if (tipo === 'nota') {
    if (v.toUpperCase() === 'A')   return VALOR_AUSENTE;
    return v;
  }
  return v;
}

// ── Cálculo automático ────────────────────────────────────────

export function calcularAutomatico(cal) {
  const resultado = { ANUAL: null, FINAL: null, IC1_auto: false };
  const toNum = (v) => {
    if (!v || v === VALOR_NO_APLICA || v === VALOR_AUSENTE) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };
  const c1   = toNum(cal.C1);
  const ic1  = toNum(cal.IC1);
  const c2   = toNum(cal.C2);
  const inov = toNum(cal.INOV);
  const idic = toNum(cal.IDIC);
  const ifeb = toNum(cal.IFEB);

  if (c1 !== null && c1 >= NOTA_MINIMA) resultado.IC1_auto = true;

  let n1 = null;
  if (c1 !== null) {
    if (c1 >= NOTA_MINIMA) n1 = c1;
    else if (ic1 !== null && ic1 >= NOTA_MINIMA) n1 = ic1;
  }

  if (n1 !== null && c2 !== null) {
    if (c2 >= NOTA_MINIMA) resultado.ANUAL = Math.ceil((n1 + c2) / 2);
    else if (inov !== null && inov >= NOTA_MINIMA) resultado.ANUAL = Math.ceil((n1 + c2) / 2);
  }

  if (resultado.ANUAL !== null && resultado.ANUAL >= NOTA_MINIMA) {
    resultado.FINAL = resultado.ANUAL;
  } else if (idic !== null && idic >= NOTA_MINIMA) {
    resultado.FINAL = idic;
  } else if (ifeb !== null && ifeb >= NOTA_MINIMA) {
    resultado.FINAL = ifeb;
  }

  return resultado;
}

// ── Bloqueo: 10 niveles acumulativos ─────────────────────────
// nivel 0  → nada bloqueado
// nivel 1  → INF1 bloqueado
// nivel 2  → + C1
// nivel 3  → + IC1
// nivel 4  → + INF2
// nivel 5  → + C2
// nivel 6  → + INOV
// nivel 7  → Anual cerrado (no agrega campo nuevo, ANUAL es calculado)
// nivel 8  → + IDIC
// nivel 9  → + IFEB
// nivel 10 → Año cerrado (FINAL es calculado, todo bloqueado)

const ORDEN_BLOQUEO = ['INF1','C1','IC1','INF2','C2','INOV', null,'IDIC','IFEB', null];

export function obtenerCamposBloqueados(nivelBloqueo) {
  // ANUAL y FINAL siempre son de solo lectura (tipo='calculado')
  const b = new Set(['ANUAL', 'FINAL']);
  const nivel = Math.min(nivelBloqueo || 0, 10);
  for (let i = 0; i < nivel; i++) {
    if (ORDEN_BLOQUEO[i]) b.add(ORDEN_BLOQUEO[i]);
  }
  return b;
}

export function etiquetaBloqueo(nivelBloqueo) {
  const n = Math.min(nivelBloqueo || 0, 10);
  if (n === 0)  return 'Sin bloqueos';
  if (n === 10) return 'Año cerrado';
  const paso = PASOS_BLOQUEO.find(p => p.nivel === n);
  return paso ? `${paso.label} cerrado` : `Nivel ${n}`;
}

// ── Resumen: delta al guardar ─────────────────────────────────

export function calcularDeltaResumen(campo, valorAnterior, valorNuevo) {
  if (!PERIODOS_CARGABLES.includes(campo)) return null;
  const eraVacio    = valorAnterior === null || valorAnterior === undefined;
  const esVacio     = valorNuevo   === null || valorNuevo   === undefined;
  const eraNoAplica = valorAnterior === VALOR_NO_APLICA;
  const esNoAplica  = valorNuevo   === VALOR_NO_APLICA;
  const catAntes    = eraVacio ? 'vacio' : eraNoAplica ? 'no_aplica' : 'cargado';
  const catDespues  = esVacio  ? 'vacio' : esNoAplica  ? 'no_aplica' : 'cargado';
  if (catAntes === catDespues) return null;
  const delta = { cargados: 0, pendientes: 0, no_aplica: 0 };
  if (catAntes   === 'cargado')   delta.cargados   -= 1;
  if (catAntes   === 'vacio')     delta.pendientes -= 1;
  if (catAntes   === 'no_aplica') delta.no_aplica  -= 1;
  if (catDespues === 'cargado')   delta.cargados   += 1;
  if (catDespues === 'vacio')     delta.pendientes += 1;
  if (catDespues === 'no_aplica') delta.no_aplica  += 1;
  return { campo, delta };
}

// ── Helpers de formato y color ────────────────────────────────

export function formatearCursoId(cursoId) {
  if (!cursoId) return cursoId;
  const partes = cursoId.split('_');
  if (partes.length < 4) return cursoId;
  const [, anio, division, esp] = partes;
  const espNombre = {
    basica: 'Básica', electro: 'Electromecánica',
    electronica: 'Electrónica', quimica: 'Química',
  };
  return `${anio}° ${division}° ${espNombre[esp] || esp}`;
}

export function clasificarValor(campo, valor) {
  if (valor === null || valor === undefined) return 'vacia';
  if (valor === VALOR_NO_APLICA)             return 'no-aplica';
  if (['INF1', 'INF2'].includes(campo)) {
    if (valor === 'TEA') return 'alto';
    if (valor === 'TEP') return 'medio';
    if (valor === 'TED') return 'bajo';
    return 'vacia';
  }
  if (valor === VALOR_AUSENTE) return 'bajo';
  const n = Number(valor);
  if (!isNaN(n)) {
    if (n >= 7) return 'alto';
    if (n >= 4) return 'medio';
    return 'bajo';
  }
  return 'vacia';
}

export const colorCeldaVista = clasificarValor;
