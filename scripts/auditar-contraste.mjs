/**
 * Auditoría de contraste WCAG del panel, leyendo los valores reales de
 * src/styles/admin.css. No estima: parsea el archivo.
 */
import { readFileSync } from 'node:fs';

// --- oklch -> sRGB ---------------------------------------------------------
function oklchToRgb(L, C, Hdeg) {
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const g = (c) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055;
    return Math.min(1, Math.max(0, v));
  };
  return [g(lr), g(lg), g(lb)];
}

const lum = ([r, g, b]) => {
  const f = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contraste = (c1, c2) => {
  const [a, b] = [lum(c1), lum(c2)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
};
/** Compone un color con alfa sobre un fondo opaco. */
const componer = (fg, alpha, bg) => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));

// --- parseo del CSS --------------------------------------------------------
const css = readFileSync('src/styles/admin.css', 'utf8');
function bloque(sel) {
  const re = new RegExp(sel.replace('.', '\\.') + '\\s*\\{([^}]*)\\}', 's');
  const m = css.match(re);
  if (!m) throw new Error('no encontré el bloque ' + sel);
  const vars = {};
  for (const linea of m[1].split('\n')) {
    const v = linea.match(/^\s*(--[a-z0-9-]+)\s*:\s*(.+?);/i);
    if (v) vars[v[1]] = v[2].trim();
  }
  return vars;
}
function color(valor, fondoParaAlfa) {
  const m = valor.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+)%)?\s*\)/);
  if (!m) throw new Error('no pude parsear ' + valor);
  const rgb = oklchToRgb(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
  if (m[4] !== undefined) return componer(rgb, parseFloat(m[4]) / 100, fondoParaAlfa);
  return rgb;
}

const TEMAS = { claro: bloque(':root'), oscuro: bloque('.dark') };

// Pares a auditar. `min` sale de WCAG: 4.5 texto normal, 3.0 texto grande y
// elementos de interfaz (bordes, iconos).
const PARES = [
  ['texto principal',              '--foreground',      '--background', 4.5],
  ['texto secundario s/ fondo',    '--muted-foreground','--background', 4.5],
  ['texto secundario s/ tarjeta',  '--muted-foreground','--card',       4.5],
  ['texto en boton primario',      '--primary-foreground','--primary',  4.5],
  ['error (Alert) s/ tarjeta',     '--destructive',     '--card',       4.5],
  ['error s/ fondo',               '--destructive',     '--background', 4.5],
  // Bordes decorativos (tarjetas, separadores): WCAG 1.4.11 NO los exige.
  ['borde decorativo [exento]',    '--border',          '--background', 0],
  ['borde de input s/ fondo',      '--input',           '--background', 3.0],
  ['anillo de foco s/ fondo',      '--ring',            '--background', 3.0],
  ['texto en barra lateral',       '--sidebar-foreground','--sidebar',  4.5],
  ['borde lateral [exento]',       '--sidebar-border',  '--sidebar',    0],
];

let fallos = 0;
for (const [nombre, tema] of Object.entries(TEMAS)) {
  console.log('\n=== TEMA ' + nombre.toUpperCase() + ' ===');
  for (const [etiqueta, fgVar, bgVar, min] of PARES) {
    const bg = color(tema[bgVar], [1, 1, 1]);
    const fg = color(tema[fgVar], bg);
    const r = contraste(fg, bg);
    const ok = r >= min;
    if (!ok) fallos++;
    console.log(`  ${ok ? 'OK  ' : 'BAJO'} ${etiqueta.padEnd(30)} ${r.toFixed(2)}:1  (min ${min})`);
  }

  // Estados con opacidad: son los que suelen quedar mal y no se ven en una
  // tabla de variables.
  console.log('  --- estados con opacidad ---');
  const bg = color(tema['--background'], [1, 1, 1]);
  const card = color(tema['--card'], [1, 1, 1]);

  // WCAG 1.4.3 exime explícitamente los controles deshabilitados, así que esto
  // se informa pero no cuenta como fallo. Igual conviene mirarlo: si queda muy
  // bajo, la dueña no va a distinguir un campo deshabilitado de uno vacío.
  const inputDeshabilitado = componer(color(tema['--muted-foreground'], bg), 0.5, bg);
  const rInput = contraste(inputDeshabilitado, bg);
  console.log(`  INFO ${'input deshabilitado (50%)'.padEnd(30)} ${rInput.toFixed(2)}:1  (exento por WCAG 1.4.3)`);

  const bordeInputDeshab = componer(color(tema['--input'], bg), 0.5, bg);
  console.log(`  INFO ${'borde de input deshabilitado'.padEnd(30)} ${contraste(bordeInputDeshab, bg).toFixed(2)}:1  (exento)`);

  const descripcionError = componer(color(tema['--destructive'], card), 0.9, card);
  const rDesc = contraste(descripcionError, card);
  if (rDesc < 4.5) fallos++;
  console.log(`  ${rDesc >= 4.5 ? 'OK  ' : 'BAJO'} ${'descripcion de error (90%)'.padEnd(30)} ${rDesc.toFixed(2)}:1  (min 4.5)`);
}

console.log('\n' + (fallos === 0 ? 'TODO OK: ningun par por debajo del minimo' : fallos + ' PARES POR DEBAJO DEL MINIMO'));
process.exit(fallos === 0 ? 0 : 1);
