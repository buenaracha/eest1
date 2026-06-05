// ============================================================
// utils/calificaciones.js — Validación, cálculo y resumen
// ============================================================

// ── Constantes ───────────────────────────────────────────────

export const VALORES_INFORME  = ['TEA', 'TEP', 'TED'];
export const VALOR_NO_APLICA  = '—';
export const VALOR_AUSENTE    = 'A';
export const NOTA_MINIMA      = 7;

// Períodos calificables (excluye ANUAL y FINAL que son calculados)
export const PERIODOS_CARGABLES = ['INF1','C1','IC1','INF2','C2','INOV','IDIC','IFEB'];

// Todos los períodos en orden cronológico
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

// Definición de columnas de la grilla
export const COLUMNAS = [
  { campo: 'INF1',  label: 'Inf. 1°',  tipo: 'informe',         bloqueo: 1, ancho: 90  },
  { campo: 'C1',    label: 'Nota 1°',  tipo: 'nota',            bloqueo: 1, ancho: 75  },
  { campo: 'IC1',   label: 'Int. Jul', tipo: 'intensificacion', bloqueo: 2, ancho: 75  },
  { campo: 'INF2',  label: 'Inf. 2°',  tipo: 'informe',         bloqueo: 3, ancho: 90  },
  { campo: 'C2',    label: 'Nota 2°',  tipo: 'nota',            bloqueo: 3, ancho: 75  },
  { campo: 'INOV',  label: 'Int. Nov', tipo: 'intensificacion', bloqueo: 4, ancho: 75  },
  { campo: 'ANUAL', label: 'Anual',    tipo: 'calculado',       bloqueo: 99, ancho: 75 },
  { campo: 'IDIC',  label: 'Int. Dic', tipo: 'intensificacion', bloqueo: 5, ancho: 75  },
  { campo: 'IFEB',  label: 'Int. Feb', tipo: 'intensificacion', bloqueo: 5, ancho: 75  },
  { campo: 'FINAL', label: 'Final',    tipo: 'calculado',       bloqueo: 99, ancho: 75 },
];

export const COLUMNAS_EXTRA = [
  { campo: 'inasistencias_docente_1c', label: 'Inasist. 1°C', tipo: 'numero', ancho: 90 },
  { campo: 'inasistencias_docente_2c', label: 'Inasist. 2°C', tipo: 'numero', ancho: 90 },
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
  return !isNaN(n) && Number.isInteger(n) && n >= 0;
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
        : { ok: false, mensaje: 'Debe ser un número entero positivo' };
    default:
      return { ok: true, mensaje: '' };
  }
}

// ── Normalización ─────────────────────────────────────────────

export function normalizarValor(tipo, valor) {
  if (!valor && valor !== 0) return null;
  const v = valor.toString().trim();
  if (v === '') return null;
  if (tipo === 'informe') return v.toUpperCase();
  if (tipo === 'intensificacion') {
    if (v === '-' || v === '--') return VALOR_NO_APLICA;
    if (v.toUpperCase() === 'A') return VALOR_AUSENTE;
    return v;
  }
  if (tipo === 'nota') {
    if (v.toUpperCase() === 'A') return VALOR_AUSENTE;
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
    if (c2 >= NOTA_MINIMA) {
      resultado.ANUAL = Math.ceil((n1 + c2) / 2);
    } else if (inov !== null && inov >= NOTA_MINIMA) {
      resultado.ANUAL = Math.ceil((n1 + c2) / 2);
    }
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

// ── Bloqueo de columnas ───────────────────────────────────────

export function obtenerCamposBloqueados(nivelBloqueo) {
  const b = new Set(['ANUAL', 'FINAL']);
  if (nivelBloqueo >= 1) { b.add('INF1'); b.add('C1'); }
  if (nivelBloqueo >= 2)   b.add('IC1');
  if (nivelBloqueo >= 3) { b.add('INF2'); b.add('C2'); }
  if (nivelBloqueo >= 4)   b.add('INOV');
  if (nivelBloqueo >= 5) { b.add('IDIC'); b.add('IFEB'); }
  return b;
}

export function etiquetaBloqueo(nivelBloqueo) {
  const etiquetas = [
    'Sin bloqueos', '1° cuat. cerrado', 'Int. julio cerrada',
    '2° cuat. cerrado', 'Int. nov. cerrada', 'Año cerrado',
  ];
  return etiquetas[Math.min(nivelBloqueo || 0, 5)];
}

// ── Resumen: calcular delta al guardar una nota ───────────────
// Devuelve un objeto con los incrementos/decrementos a aplicar
// en el documento del dictado usando FieldValue.increment().
// Esto evita leer todos los alumnos para recalcular el resumen.

export function calcularDeltaResumen(campo, valorAnterior, valorNuevo) {
  if (!PERIODOS_CARGABLES.includes(campo)) return null;

  const eraVacio    = valorAnterior === null || valorAnterior === undefined;
  const esVacio     = valorNuevo === null || valorNuevo === undefined;
  const eraNoAplica = valorAnterior === VALOR_NO_APLICA;
  const esNoAplica  = valorNuevo === VALOR_NO_APLICA;

  // Si no cambió de categoría, no hay delta
  const categoriaAntes = eraVacio ? 'vacio' : eraNoAplica ? 'no_aplica' : 'cargado';
  const categoriaDespues = esVacio ? 'vacio' : esNoAplica ? 'no_aplica' : 'cargado';
  if (categoriaAntes === categoriaDespues) return null;

  const delta = {
    cargados:   0,
    pendientes: 0,
    no_aplica:  0,
  };

  // Restar de la categoría anterior
  if (categoriaAntes === 'cargado')   delta.cargados   -= 1;
  if (categoriaAntes === 'vacio')     delta.pendientes -= 1;
  if (categoriaAntes === 'no_aplica') delta.no_aplica  -= 1;

  // Sumar a la categoría nueva
  if (categoriaDespues === 'cargado')   delta.cargados   += 1;
  if (categoriaDespues === 'vacio')     delta.pendientes += 1;
  if (categoriaDespues === 'no_aplica') delta.no_aplica  += 1;

  return { campo, delta };
}

// ── Formatear ID de curso para mostrar ───────────────────────
// "2026_2_9_basica" → "2° 9° Básica"
export function formatearCursoId(cursoId) {
  if (!cursoId) return cursoId;
  const partes = cursoId.split('_');
  if (partes.length < 4) return cursoId;
  const [, anio, division, esp] = partes;
  const espNombre = { basica: 'Básica', electro: 'Electromecánica', electronica: 'Electrónica', quimica: 'Química' };
  return `${anio}° ${division}° ${espNombre[esp] || esp}`;
}

// ── Color de celda en Vista del Curso ────────────────────────
export function colorCeldaVista(campo, valor) {
  if (valor === null || valor === undefined) return 'vacia';
  if (valor === VALOR_NO_APLICA) return 'no-aplica';
  if (valor === VALOR_AUSENTE) return 'ausente';
  if (['INF1', 'INF2'].includes(campo)) {
    return valor === 'TEA' ? 'aprobado' : valor === 'TEP' ? 'proceso' : 'desaprobado';
  }
  const n = Number(valor);
  if (!isNaN(n)) return n >= NOTA_MINIMA ? 'aprobado' : 'desaprobado';
  return 'normal';
}
