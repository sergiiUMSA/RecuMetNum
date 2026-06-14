/* ===================================================
   FANI — Centro de Control Numérico
   js/main.js — Controlador principal de la interfaz
   =================================================== */

// ══════════════════════════════════════════════════════
// NAVEGACIÓN ENTRE ESCENARIOS
// ══════════════════════════════════════════════════════

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // quitar active a todos
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.scenario-panel').forEach(p => p.classList.remove('active'));

    // activar el seleccionado
    btn.classList.add('active');
    const target = document.getElementById(btn.dataset.target);
    if (target) {
      target.classList.add('active');
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ══════════════════════════════════════════════════════
// HELPERS DE UI
// ══════════════════════════════════════════════════════

function mostrarError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '⚠ ' + msg;
  el.classList.remove('hidden');
}
function ocultarError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function mostrarResultado(id, html, clase = '') {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = html;
  el.className = 'result-highlight' + (clase ? ' ' + clase : '');
  el.parentElement.classList.remove('hidden');
  el.classList.remove('hidden');
}

function mostrarResultados(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function ocultarResultados(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

// Leer la matriz 3×3 del formulario (prefijo p.ej. 'a' o 'f')
function leerMatriz(pref) {
  const A = [], b = [];
  for (let i = 0; i < 3; i++) {
    const row = [];
    for (let j = 0; j < 3; j++) {
      const v = parseFloat(document.getElementById(pref + i + '' + j).value);
      if (isNaN(v)) throw new Error('Todos los valores de la matriz deben ser números.');
      row.push(v);
    }
    A.push(row);
    const bv = parseFloat(document.getElementById(pref + 'b' + i).value);
    if (isNaN(bv)) throw new Error('Los valores del vector b deben ser números.');
    b.push(bv);
  }
  return { A, b };
}

// Construir tabla HTML de iteraciones
function tablaIteraciones(columnas, filas, convergedRow = null) {
  let html = '<table><thead><tr>';
  columnas.forEach(c => { html += `<th>${c}</th>`; });
  html += '</tr></thead><tbody>';
  filas.forEach((fila, idx) => {
    const cls = (convergedRow !== null && idx === convergedRow) ? ' class="converged"' : '';
    html += `<tr${cls}>`;
    fila.forEach(v => {
      html += `<td>${typeof v === 'number' ? fmt(v, 6) : v}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

// Paleta de colores para Plotly
const COLORS = {
  accent:  '#00c8ff',
  accent2: '#7b2ff7',
  green:   '#00e676',
  orange:  '#ff9800',
  red:     '#ff4444',
  yellow:  '#ffeb3b',
};

const PLOTLY_LAYOUT = (title, xLabel, yLabel) => ({
  title:  { text: title,  font: { color: '#8ab0cc', size: 13 } },
  paper_bgcolor: '#0f1e35',
  plot_bgcolor:  '#07111f',
  font:   { color: '#8ab0cc', family: 'Courier New, monospace', size: 11 },
  xaxis:  { title: xLabel, gridcolor: '#1a3a5c', zerolinecolor: '#1a3a5c', color: '#8ab0cc' },
  yaxis:  { title: yLabel, gridcolor: '#1a3a5c', zerolinecolor: '#1a3a5c', color: '#8ab0cc' },
  margin: { t: 40, b: 50, l: 55, r: 20 },
  legend: { font: { color: '#8ab0cc' } },
  hovermode: 'closest',
});

const PLOTLY_CONFIG = { responsive: true, displayModeBar: false };

// ══════════════════════════════════════════════════════
// ESCENARIO A — TRIANGULACIÓN DE RADAR
// ══════════════════════════════════════════════════════

function ejecutarEscenarioA() {
  ocultarError('aError');
  ocultarResultados('aResultados');
  document.getElementById('aTabla').innerHTML = '';
  document.getElementById('aGrafico').innerHTML = '';
  document.getElementById('aPerturbadoResultado').classList.add('hidden');

  try {
    const { A, b } = leerMatriz('a');
    const tol      = parseFloat(document.getElementById('aTol').value);
    const maxIter  = parseInt(document.getElementById('aMaxIter').value);
    const pertPct  = parseFloat(document.getElementById('aPerturbacion').value);
    const metodo   = document.getElementById('aMetodo').value;

    if (isNaN(tol) || tol <= 0)      throw new Error('La tolerancia debe ser un número positivo.');
    if (isNaN(maxIter) || maxIter < 1) throw new Error('El número de iteraciones debe ser positivo.');

    // Resolver
    const res = metodo === 'jacobi'
      ? jacobi(A, b, tol, maxIter)
      : gaussSeidel(A, b, tol, maxIter);

    const cond = numeroCond(A);

    // Número de condición
    mostrarResultados('aResultados');
    mostrarResultado('aSolucion',
      `📍 POSICIÓN DETECTADA: X = ${fmt(res.x[0], 4)} | Y = ${fmt(res.x[1], 4)} | Z = ${fmt(res.x[2], 4)} unidades`,
      res.convergido ? 'good' : 'warn'
    );
    mostrarResultado('aNumCond',
      `🔢 Número de condición κ(A) = ${fmt(cond, 2)} → ${cond > 1000 ? '⚠ SISTEMA MAL CONDICIONADO' : '✔ Sistema estable'}`,
      cond > 1000 ? 'warn' : 'good'
    );

    // Tabla
    const cols  = ['Iter', 'x₁', 'x₂', 'x₃', 'Error máx.'];
    const filas = res.iteraciones.map(it => [it.iter, it.x[0], it.x[1], it.x[2], it.error]);
    const lastIdx = filas.length - 1;
    document.getElementById('aTabla').innerHTML = tablaIteraciones(cols, filas, res.convergido ? lastIdx : null);

    // Gráfico de convergencia
    const iters  = res.iteraciones.map(it => it.iter);
    const errors = res.iteraciones.map(it => it.error);
    Plotly.newPlot('aGrafico', [{
      x: iters, y: errors, mode: 'lines+markers',
      name: 'Error de convergencia',
      line:   { color: COLORS.accent, width: 2 },
      marker: { color: COLORS.accent, size: 4 },
    }, {
      x: [iters[0], iters[iters.length - 1]], y: [tol, tol],
      mode: 'lines', name: 'Tolerancia',
      line: { color: COLORS.orange, dash: 'dash', width: 1 },
    }],
    { ...PLOTLY_LAYOUT('Convergencia del método iterativo', 'Iteración', 'Error absoluto'), yaxis: { ...PLOTLY_LAYOUT().yaxis, type: 'log', title: 'Error absoluto (log)' } },
    PLOTLY_CONFIG);

    // Análisis de perturbación
    if (!isNaN(pertPct) && pertPct > 0) {
      const bPerturb = b.map(bi => bi * (1 + pertPct / 100));
      const xOrig    = res.x;
      const xPert    = gauss(A, bPerturb);
      const errRel   = xOrig.map((xi, i) => Math.abs(xi - xPert[i]) / (Math.abs(xi) + 1e-14) * 100);

      const div = document.getElementById('aPerturbadoResultado');
      div.classList.remove('hidden');
      div.innerHTML = `
        <h4>⚡ ANÁLISIS DE PERTURBACIÓN ELECTROMAGNÉTICA (∆b = ${pertPct}%)</h4>
        <p>Solución original:   X=${fmt(xOrig[0],4)}, Y=${fmt(xOrig[1],4)}, Z=${fmt(xOrig[2],4)}</p>
        <p>Solución perturbada: X=${fmt(xPert[0],4)}, Y=${fmt(xPert[1],4)}, Z=${fmt(xPert[2],4)}</p>
        <p>Error relativo:      ΔX=${fmt(errRel[0],2)}% | ΔY=${fmt(errRel[1],2)}% | ΔZ=${fmt(errRel[2],2)}%</p>
        <p style="color:${cond > 1000 ? '#ff9800' : '#00e676'}; margin-top:.5rem;">
          ${cond > 1000
            ? '⚠ El sistema es MAL CONDICIONADO: pequeñas perturbaciones producen grandes errores en la posición.'
            : '✔ El sistema es ESTABLE: la perturbación introduce errores tolerables en la localización.'}
        </p>`;
    }

  } catch (err) {
    mostrarError('aError', err.message);
  }
}

// ══════════════════════════════════════════════════════
// ESCENARIO B — DESCENSO CINEMÁTICO (EDO)
// ══════════════════════════════════════════════════════

function ejecutarEscenarioB() {
  ocultarError('bError');
  ocultarResultados('bResultados');
  document.getElementById('bGrafico').innerHTML = '';

  try {
    const H0      = parseFloat(document.getElementById('bH0').value);
    const perdida = parseFloat(document.getElementById('bPerdida').value);
    const empuje  = parseFloat(document.getElementById('bEmpuje').value);
    const hCrit   = parseFloat(document.getElementById('bHCrit').value);
    const tMax    = parseFloat(document.getElementById('bTMax').value);
    const dt      = parseFloat(document.getElementById('bDt').value);
    const metodo  = document.getElementById('bMetodo').value;

    if (isNaN(H0) || H0 <= 0)        throw new Error('Altitud inicial debe ser positiva.');
    if (isNaN(perdida) || perdida <= 0) throw new Error('Pérdida de altura debe ser positiva.');
    if (isNaN(empuje) || empuje < 0)  throw new Error('Empuje debe ser ≥ 0.');
    if (hCrit >= H0)                  throw new Error('Altitud crítica debe ser menor que la altitud inicial.');
    if (dt <= 0)                      throw new Error('El paso de tiempo debe ser positivo.');

    // dH/dt = empuje - perdida (simplificado: variación sinusoidal del empuje)
    const f = (t, H) => empuje * Math.sin(0.2 * t + 0.5) - perdida + 0.1 * H * 0.0;
    // Modelo: tasa neta negativa con pulso electromagnético
    const fModel = (t, H) => empuje * (1 + 0.3 * Math.sin(0.5 * t)) - perdida;

    const stopFn = (H) => H <= hCrit;

    let pts;
    if (metodo === 'rk4')   pts = rk4(fModel,  0, H0, dt, tMax, stopFn);
    else if (metodo === 'heun') pts = heun(fModel, 0, H0, dt, tMax, stopFn);
    else                        pts = euler(fModel, 0, H0, dt, tMax, stopFn);

    // Encontrar tiempo de arribo a zona crítica
    let tArribo = null;
    for (const pt of pts) {
      if (pt.y <= hCrit) { tArribo = pt.t; break; }
    }

    mostrarResultados('bResultados');
    if (tArribo !== null) {
      mostrarResultado('bTiempoArribo',
        `🚨 ALARMA: El FANI cruza la zona crítica (${hCrit} m) a los ${fmt(tArribo, 2)} segundos`,
        'bad'
      );
    } else {
      mostrarResultado('bTiempoArribo',
        `✔ El FANI NO alcanza la zona crítica (${hCrit} m) en los ${tMax} s simulados. Altitud final: ${fmt(pts[pts.length-1].y, 1)} m`,
        'good'
      );
    }

    // Gráfico
    const ts = pts.map(p => p.t);
    const hs = pts.map(p => p.y);

    const traces = [{
      x: ts, y: hs, mode: 'lines',
      name: 'Altitud H(t)',
      line: { color: COLORS.accent, width: 2 },
    }, {
      x: [ts[0], ts[ts.length - 1]], y: [hCrit, hCrit],
      mode: 'lines', name: `Zona crítica (${hCrit} m)`,
      line: { color: COLORS.red, dash: 'dash', width: 1.5 },
    }];

    if (tArribo !== null) {
      traces.push({
        x: [tArribo], y: [hCrit],
        mode: 'markers', name: `T arribo: ${fmt(tArribo, 2)}s`,
        marker: { color: COLORS.red, size: 10, symbol: 'star' },
      });
    }

    Plotly.newPlot('bGrafico', traces,
      PLOTLY_LAYOUT(`Descenso Cinemático — ${metodo.toUpperCase()}`, 'Tiempo (s)', 'Altitud (m)'),
      PLOTLY_CONFIG);

  } catch (err) {
    mostrarError('bError', err.message);
  }
}

// ══════════════════════════════════════════════════════
// ESCENARIO C — INTERPOLACIÓN
// ══════════════════════════════════════════════════════

function addPunto() {
  const container = document.getElementById('cPuntos');
  const div = document.createElement('div');
  div.className = 'punto-row';
  div.innerHTML = `
    <label>t</label><input type="number" class="input-field pt" value="0" />
    <label>H</label><input type="number" class="input-field ph" value="0" />
    <button class="btn-remove" onclick="removePunto(this)">✕</button>`;
  container.appendChild(div);
}

function removePunto(btn) {
  const container = document.getElementById('cPuntos');
  if (container.children.length <= 2) {
    alert('Se necesitan al menos 2 puntos para interpolar.');
    return;
  }
  btn.parentElement.remove();
}

function leerPuntos() {
  const rows = document.querySelectorAll('#cPuntos .punto-row');
  const xs = [], ys = [];
  rows.forEach(row => {
    const t = parseFloat(row.querySelector('.pt').value);
    const h = parseFloat(row.querySelector('.ph').value);
    if (isNaN(t) || isNaN(h)) throw new Error('Todos los puntos deben tener valores numéricos.');
    xs.push(t); ys.push(h);
  });
  // ordenar por x
  const indices = xs.map((_, i) => i).sort((a, b) => xs[a] - xs[b]);
  return {
    xs: indices.map(i => xs[i]),
    ys: indices.map(i => ys[i])
  };
}

function ejecutarEscenarioC() {
  ocultarError('cError');
  ocultarResultados('cResultados');
  document.getElementById('cGrafico').innerHTML = '';

  try {
    const { xs, ys } = leerPuntos();
    const tInterp   = parseFloat(document.getElementById('cTiempo').value);
    const metodo    = document.getElementById('cMetodo').value;

    if (xs.length < 2) throw new Error('Se necesitan al menos 2 puntos.');
    if (isNaN(tInterp))  throw new Error('El tiempo a interpolar debe ser un número.');

    // Verificar duplicados
    for (let i = 0; i < xs.length - 1; i++) {
      if (Math.abs(xs[i] - xs[i + 1]) < 1e-10) throw new Error('Existen tiempos duplicados en los datos.');
    }

    let valor;
    if (metodo === 'lagrange')  valor = lagrange(xs, ys, tInterp);
    else if (metodo === 'newton')  valor = newton(xs, ys, tInterp);
    else                           valor = splineCubico(xs, ys, tInterp);

    mostrarResultados('cResultados');
    mostrarResultado('cValorInterpolado',
      `📡 Altitud interpolada en t = ${tInterp}s → H ≈ ${fmt(valor, 2)} m (${metodo.toUpperCase()})`,
      'good'
    );

    // Gráfico
    const xMin  = Math.min(...xs);
    const xMax  = Math.max(...xs);
    const xPlot = linspace(xMin, xMax, 300);
    const yPlot = evaluarInterpolacion(metodo, xs, ys, xPlot);

    Plotly.newPlot('cGrafico', [
      {
        x: xPlot, y: yPlot, mode: 'lines',
        name: 'Curva interpolada',
        line: { color: COLORS.accent, width: 2 },
      },
      {
        x: xs, y: ys, mode: 'markers',
        name: 'Datos conocidos',
        marker: { color: COLORS.green, size: 8, symbol: 'circle' },
      },
      {
        x: [tInterp], y: [valor],
        mode: 'markers', name: `Interpolado (t=${tInterp})`,
        marker: { color: COLORS.orange, size: 12, symbol: 'star' },
      }
    ],
    PLOTLY_LAYOUT('Reconstrucción de Ruta de Vuelo', 'Tiempo (s)', 'Altitud (m)'),
    PLOTLY_CONFIG);

  } catch (err) {
    mostrarError('cError', err.message);
  }
}

// ══════════════════════════════════════════════════════
// ESCENARIO D — INTEGRACIÓN NUMÉRICA
// ══════════════════════════════════════════════════════

function ejecutarEscenarioD() {
  ocultarError('dError');
  ocultarResultados('dResultados');
  document.getElementById('dGrafico').innerHTML = '';

  try {
    const a       = parseFloat(document.getElementById('dA').value);
    const b_val   = parseFloat(document.getElementById('dB').value);
    let   n       = parseInt(document.getElementById('dN').value);
    const metodo  = document.getElementById('dMetodo').value;
    const funcion = document.getElementById('dFuncion').value;

    if (isNaN(a) || isNaN(b_val)) throw new Error('Los límites deben ser números.');
    if (b_val <= a)                throw new Error('El límite superior debe ser mayor al inferior.');
    if (isNaN(n) || n < 2)        throw new Error('El número de subintervalos debe ser ≥ 2.');

    // Función de velocidad
    const v = {
      sinusoidal: t => 500 + 300 * Math.sin(0.1 * t),
      acelerada:  t => 200 + 50 * t - t * t,
      pulso:      t => 800 * Math.exp(-0.05 * t) + 100,
    }[funcion];

    let distNum;
    if (metodo === 'simpson13')     distNum = simpson13(v, a, b_val, n);
    else if (metodo === 'simpson38') distNum = simpson38(v, a, b_val, n);
    else                             distNum = trapecio(v, a, b_val, n);

    // Velocidad promedio para modelo lineal
    const vProm  = (v(a) + v(b_val)) / 2;
    const distLin = vProm * (b_val - a);
    const desv    = Math.abs(distNum - distLin) / (Math.abs(distLin) + 1e-14) * 100;

    mostrarResultados('dResultados');
    mostrarResultado('dDistanciaNum',
      `📏 Distancia numérica (${metodo}): ${distNum.toLocaleString('es-BO', {maximumFractionDigits: 2})} m`,
      'good'
    );
    mostrarResultado('dDistanciaLin',
      `📐 Modelo lineal clásico: ${distLin.toLocaleString('es-BO', {maximumFractionDigits: 2})} m`,
      ''
    );
    mostrarResultado('dDesviacion',
      `⚠ Desviación de la anomalía: ${fmt(desv, 2)}% ${desv > 15 ? '— COMPORTAMIENTO ANÓMALO DETECTADO' : '— comportamiento dentro de rango normal'}`,
      desv > 15 ? 'bad' : 'good'
    );

    // Gráfico de velocidad
    const tArr  = linspace(a, b_val, 500);
    const vArr  = tArr.map(v);
    const vLinArr = tArr.map(t => vProm);

    Plotly.newPlot('dGrafico', [
      {
        x: tArr, y: vArr, mode: 'lines',
        name: 'v(t) real', fill: 'tozeroy', fillcolor: 'rgba(0,200,255,0.1)',
        line: { color: COLORS.accent, width: 2 },
      },
      {
        x: tArr, y: vLinArr, mode: 'lines',
        name: 'Modelo lineal', line: { color: COLORS.orange, dash: 'dash', width: 1.5 },
      }
    ],
    PLOTLY_LAYOUT('Perfil de Velocidad — Área = Distancia Acumulada', 'Tiempo (s)', 'Velocidad (m/s)'),
    PLOTLY_CONFIG);

  } catch (err) {
    mostrarError('dError', err.message);
  }
}

// ══════════════════════════════════════════════════════
// ESCENARIO E — RAÍCES DE ECUACIONES
// ══════════════════════════════════════════════════════

// Actualizar visibilidad de parámetros según método
document.getElementById('eMetodo').addEventListener('change', function () {
  const m = this.value;
  document.getElementById('eBiseccionParams').style.display = (m === 'biseccion') ? 'block' : 'none';
  document.getElementById('eNewtonParams').style.display    = (m !== 'biseccion') ? 'block' : 'none';
});
// Init visibility
(function () {
  const m = document.getElementById('eMetodo').value;
  document.getElementById('eBiseccionParams').style.display = (m === 'biseccion') ? 'block' : 'none';
  document.getElementById('eNewtonParams').style.display    = (m !== 'biseccion') ? 'block' : 'none';
})();

function ejecutarEscenarioE() {
  ocultarError('eError');
  ocultarResultados('eResultados');
  document.getElementById('eTabla').innerHTML   = '';
  document.getElementById('eGrafico').innerHTML = '';

  try {
    const energiaBase = parseFloat(document.getElementById('eEnergiaBase').value);
    const energiaRad  = parseFloat(document.getElementById('eEnergiaRad').value);
    const tol         = parseFloat(document.getElementById('eTol').value);
    const maxIter     = parseInt(document.getElementById('eMaxIter').value);
    const metodo      = document.getElementById('eMetodo').value;
    const funcion     = document.getElementById('eFuncion').value;

    if (isNaN(energiaBase) || isNaN(energiaRad)) throw new Error('Los valores de energía deben ser números.');
    if (tol <= 0)  throw new Error('Tolerancia debe ser positiva.');
    if (maxIter < 1) throw new Error('Máx. iteraciones debe ser positivo.');

    // Constante combinada
    const K = energiaRad - energiaBase;  // valor a equilibrar

    // f(v) según selección
    let f, df;
    if (funcion === 'termica') {
      // 0.002v² + 0.5v − K = 0
      f  = v => 0.002 * v * v + 0.5 * v - K;
      df = v => 0.004 * v + 0.5;
    } else {
      // v·ln(v) − K·0.012 = 0
      const C = K * 0.012;
      f  = v => v * Math.log(v) - C;
      df = v => Math.log(v) + 1;
    }

    let res;
    if (metodo === 'biseccion') {
      const a = parseFloat(document.getElementById('eA').value);
      const b = parseFloat(document.getElementById('eB').value);
      if (isNaN(a) || isNaN(b)) throw new Error('Los límites a y b deben ser números.');
      res = biseccion(f, a, b, tol, maxIter);
    } else if (metodo === 'newton') {
      const v0 = parseFloat(document.getElementById('eV0').value);
      if (isNaN(v0)) throw new Error('El valor inicial v₀ debe ser un número.');
      res = newtonRaphson(f, df, v0, tol, maxIter);
    } else {
      // secante
      const v0 = parseFloat(document.getElementById('eV0').value);
      res = secante(f, v0, v0 * 1.1 + 1, tol, maxIter);
    }

    mostrarResultados('eResultados');
    mostrarResultado('eRaiz',
      `🔥 Velocidad de equilibrio térmico: v* = ${fmt(res.raiz, 4)} m/s | f(v*) = ${fmt(f(res.raiz), 8)}`,
      'good'
    );
    mostrarResultado('eConvergencia',
      `📊 Iteraciones: ${res.iteraciones.length} | Convergencia: ${res.convergido ? '✔ LOGRADA' : '⚠ NO ALCANZADA'}`,
      res.convergido ? 'good' : 'warn'
    );

    // Tabla de iteraciones
    let cols, filas;
    if (metodo === 'biseccion') {
      cols  = ['Iter', 'a', 'b', 'c', 'f(c)', 'Error'];
      filas = res.iteraciones.map(it => [it.iter, it.a, it.b, it.c, it.fc, it.error]);
    } else if (metodo === 'newton') {
      cols  = ['Iter', 'xₙ', 'f(xₙ)', "f'(xₙ)", 'xₙ₊₁', 'Error'];
      filas = res.iteraciones.map(it => [it.iter, it.x, it.fx, it.dfx, it.xNew, it.error]);
    } else {
      cols  = ['Iter', 'xₙ₋₁', 'xₙ', 'xₙ₊₁', 'f(xₙ)', 'Error'];
      filas = res.iteraciones.map(it => [it.iter, it.xPrev, it.xCurr, it.xNew, it.f1, it.error]);
    }
    const lastIdx = res.iteraciones.length - 1;
    document.getElementById('eTabla').innerHTML = tablaIteraciones(cols, filas, res.convergido ? lastIdx : null);

    // Gráfico de la función
    const vMin = Math.max(0.1, res.raiz * 0.1);
    const vMax = res.raiz * 2.5;
    const vArr = linspace(vMin, vMax, 400);
    const fArr = vArr.map(v => f(v));

    Plotly.newPlot('eGrafico', [
      {
        x: vArr, y: fArr, mode: 'lines',
        name: 'f(v)',
        line: { color: COLORS.accent, width: 2 },
      },
      {
        x: [vMin, vMax], y: [0, 0], mode: 'lines',
        name: 'f(v) = 0',
        line: { color: COLORS.text_mid, dash: 'dot', width: 1 },
      },
      {
        x: [res.raiz], y: [0],
        mode: 'markers', name: `v* = ${fmt(res.raiz, 3)}`,
        marker: { color: COLORS.red, size: 12, symbol: 'star' },
      }
    ],
    PLOTLY_LAYOUT('Función de Temperatura vs. Velocidad', 'Velocidad v (m/s)', 'f(v)'),
    PLOTLY_CONFIG);

  } catch (err) {
    mostrarError('eError', err.message);
  }
}

// ══════════════════════════════════════════════════════
// ESCENARIO F — SISTEMAS MAL CONDICIONADOS
// ══════════════════════════════════════════════════════

function ejecutarEscenarioF() {
  ocultarError('fError');
  ocultarResultados('fResultados');
  document.getElementById('fGrafico').innerHTML = '';

  try {
    const { A, b } = leerMatriz('f');
    const pct       = parseFloat(document.getElementById('fPerturbPct').value);
    if (isNaN(pct) || pct < 0) throw new Error('El porcentaje de perturbación debe ser ≥ 0.');

    const xOrig  = gauss(A, b);
    const bPert  = b.map(bi => bi * (1 + pct / 100));
    const xPert  = gauss(A, bPert);
    const cond   = numeroCond(A);

    const errRel = xOrig.map((xi, i) => {
      const denom = Math.abs(xi) + 1e-14;
      return Math.abs(xi - xPert[i]) / denom * 100;
    });

    mostrarResultados('fResultados');
    mostrarResultado('fSolOriginal',
      `📍 Solución original:   x₁=${fmt(xOrig[0],4)} | x₂=${fmt(xOrig[1],4)} | x₃=${fmt(xOrig[2],4)}`,
      'good'
    );
    mostrarResultado('fSolPerturbada',
      `⚡ Solución perturbada (∆b=${pct}%): x₁=${fmt(xPert[0],4)} | x₂=${fmt(xPert[1],4)} | x₃=${fmt(xPert[2],4)}`,
      'warn'
    );
    mostrarResultado('fNumCond',
      `🔢 Número de condición: κ(A) = ${fmt(cond, 2)}`,
      cond > 1000 ? 'bad' : 'good'
    );

    const veredicto = cond > 1e6
      ? '❌ SISTEMA GRAVEMENTE MAL CONDICIONADO — La interferencia electromagnética colapsa el sistema de rastreo.'
      : cond > 1000
      ? '⚠ SISTEMA MAL CONDICIONADO — Perturbaciones pequeñas producen errores significativos en la posición.'
      : '✔ SISTEMA BIEN CONDICIONADO — El sistema de rastreo es estable ante interferencias.';

    mostrarResultado('fVeredicto', veredicto, cond > 1000 ? (cond > 1e6 ? 'bad' : 'warn') : 'good');

    // Gráfico comparativo
    const labels  = ['x₁ (X radar)', 'x₂ (Y radar)', 'x₃ (Z radar)'];
    Plotly.newPlot('fGrafico', [
      {
        x: labels, y: xOrig, type: 'bar', name: 'Solución original',
        marker: { color: COLORS.accent },
      },
      {
        x: labels, y: xPert, type: 'bar', name: `Perturbada (${pct}%)`,
        marker: { color: COLORS.orange },
      }
    ],
    { ...PLOTLY_LAYOUT('Comparación de Soluciones — Sistema Perturbado', 'Variable', 'Valor'), barmode: 'group' },
    PLOTLY_CONFIG);

  } catch (err) {
    mostrarError('fError', err.message);
  }
}

// ══════════════════════════════════════════════════════
// ESCENARIO G — DINÁMICA SOCIAL (SISTEMA EDO)
// ══════════════════════════════════════════════════════

function ejecutarEscenarioG() {
  ocultarError('gError');
  ocultarResultados('gResultados');
  document.getElementById('gGrafico').innerHTML = '';

  try {
    const E0   = parseFloat(document.getElementById('gE0').value);
    const A0   = parseFloat(document.getElementById('gA0').value);
    const M0   = parseFloat(document.getElementById('gM0').value);
    const a    = parseFloat(document.getElementById('ga').value);
    const b    = parseFloat(document.getElementById('gb').value);
    const c    = parseFloat(document.getElementById('gc').value);
    const k    = parseFloat(document.getElementById('gk').value);
    const r    = parseFloat(document.getElementById('gr').value);
    const tMax = parseFloat(document.getElementById('gTMax').value);
    const metodo = document.getElementById('gMetodo').value;

    for (const [name, v] of [['E0',E0],['A0',A0],['M0',M0],['a',a],['b',b],['c',c],['k',k],['r',r],['tMax',tMax]]) {
      if (isNaN(v)) throw new Error(`El parámetro ${name} debe ser un número.`);
      if (v < 0)    throw new Error(`El parámetro ${name} debe ser ≥ 0.`);
    }

    // Sistema de EDOs:
    // dE/dt = -a·E·A + b·M·A
    // dA/dt =  a·E·A - c·A·M
    // dM/dt =  k·A   - r·M
    const F = (t, Y) => {
      const [E, A, M] = Y;
      return [
        -a * E * A + b * M * A,
         a * E * A - c * A * M,
         k * A     - r * M
      ];
    };

    const Y0  = [E0, A0, M0];
    const dt  = tMax / 1000;

    let resultado;
    if (metodo === 'rk4') resultado = rk4Sistema(F, 0, Y0, dt, tMax);
    else                   resultado = heunSistema(F, 0, Y0, dt, tMax);

    // Encontrar pico de alarma
    let picoA = 0, tPico = 0;
    resultado.forEach(pt => {
      if (pt.Y[1] > picoA) { picoA = pt.Y[1]; tPico = pt.t; }
    });

    const Afinal = resultado[resultado.length - 1].Y[1];

    mostrarResultados('gResultados');
    mostrarResultado('gPicoAlarma',
      `📈 Pico de alarma social: ${fmt(picoA, 1)} k personas en el día ${fmt(tPico, 1)}`,
      'warn'
    );

    const veredicto =
      Afinal < A0 * 0.1  ? '✔ La alarma se DISIPA — el control informativo (c) fue efectivo.'
      : Afinal < A0 * 2  ? '⚠ La alarma se ESTABILIZA en un nivel moderado.'
      :                     '❌ La alarma se MASIFICA — el pánico colectivo domina la narrativa social.';

    mostrarResultado('gVeredicto', veredicto,
      Afinal < A0 * 0.1 ? 'good' : Afinal < A0 * 2 ? 'warn' : 'bad');

    // Gráfico multi-línea
    const ts = resultado.map(p => p.t);
    const Es = resultado.map(p => p.Y[0]);
    const As = resultado.map(p => p.Y[1]);
    const Ms = resultado.map(p => p.Y[2]);

    Plotly.newPlot('gGrafico', [
      { x: ts, y: Es, mode: 'lines', name: 'Escépticos (E)', line: { color: COLORS.green, width: 2 } },
      { x: ts, y: As, mode: 'lines', name: 'Alarmados (A)',  line: { color: COLORS.red,   width: 2 } },
      { x: ts, y: Ms, mode: 'lines', name: 'Medios (M)',     line: { color: COLORS.orange, width: 2 } },
    ],
    PLOTLY_LAYOUT('Dinámica Social de Pánico — Avistamiento Masivo', 'Tiempo (días)', 'Población (miles)'),
    PLOTLY_CONFIG);

  } catch (err) {
    mostrarError('gError', err.message);
  }
}

// ══════════════════════════════════════════════════════
// CASOS DE ESTUDIO OBLIGATORIOS
// ══════════════════════════════════════════════════════

/** CASO 1: Interpolación — Altitud en t=3 s */
function ejecutarCaso1() {
  const div = document.getElementById('caso1Resultado');
  div.classList.add('hidden');

  try {
    const xs = [1, 5, 10];
    const ys = [800, 1200, 2500];
    const t  = 3;

    const vLagrange = lagrange(xs, ys, t);
    const vNewton   = newton(xs, ys, t);
    const vSpline   = splineCubico(xs, ys, t);

    div.innerHTML = `
      <strong>CASO 1 — Interpolación (t = 3 s)</strong><br>
      Datos: t=[1,5,10] → H=[800, 1200, 2500] m<br><br>
      Lagrange:    H(3) ≈ <strong>${fmt(vLagrange, 4)} m</strong><br>
      Newton:      H(3) ≈ <strong>${fmt(vNewton, 4)} m</strong><br>
      Spline cúb.: H(3) ≈ <strong>${fmt(vSpline, 4)} m</strong>
    `;
    div.classList.remove('hidden');

    // Cambiar a escenario C con datos precargados
    document.querySelectorAll('.punto-row').forEach(r => r.remove());
    const container = document.getElementById('cPuntos');
    [[1,800],[5,1200],[10,2500]].forEach(([t,h]) => {
      const row = document.createElement('div');
      row.className = 'punto-row';
      row.innerHTML = `<label>t</label><input type="number" class="input-field pt" value="${t}"/><label>H</label><input type="number" class="input-field ph" value="${h}"/><button class="btn-remove" onclick="removePunto(this)">✕</button>`;
      container.appendChild(row);
    });
    document.getElementById('cTiempo').value = '3';
    document.getElementById('cMetodo').value = 'lagrange';

  } catch (e) {
    div.innerHTML = '⚠ Error: ' + e.message;
    div.classList.remove('hidden');
  }
}

/** CASO 2: EDO — Descenso cinemático */
function ejecutarCaso2() {
  const div = document.getElementById('caso2Resultado');
  div.classList.add('hidden');

  try {
    const H0      = 15000;
    const perdida = 1500;
    const empuje  = 400;
    const hCrit   = 2000;
    const tMax    = 60;
    const dt      = 0.1;

    const fModel = (t, H) => empuje * (1 + 0.3 * Math.sin(0.5 * t)) - perdida;
    const pts    = rk4(fModel, 0, H0, dt, tMax, H => H <= hCrit);

    let tArribo = null;
    for (const pt of pts) {
      if (pt.y <= hCrit) { tArribo = pt.t; break; }
    }

    div.innerHTML = `
      <strong>CASO 2 — EDO (Descenso RK4)</strong><br>
      H₀=15000 m | Pérdida=1500 m/s | Empuje=400 m/s<br>
      Zona crítica: 2000 m<br><br>
      ${tArribo !== null
        ? `🚨 Tiempo de arribo a zona crítica: <strong>${fmt(tArribo, 3)} s</strong>`
        : `✔ No alcanza zona crítica en ${tMax} s. H final = ${fmt(pts[pts.length-1].y,1)} m`}
    `;
    div.classList.remove('hidden');

    // Precargar escenario B
    document.getElementById('bH0').value     = H0;
    document.getElementById('bPerdida').value = perdida;
    document.getElementById('bEmpuje').value  = empuje;
    document.getElementById('bHCrit').value   = hCrit;
    document.getElementById('bTMax').value    = tMax;
    document.getElementById('bDt').value      = 0.5;
    document.getElementById('bMetodo').value  = 'rk4';

  } catch (e) {
    div.innerHTML = '⚠ Error: ' + e.message;
    div.classList.remove('hidden');
  }
}

/** CASO 3: Raíces — Equilibrio de energía */
function ejecutarCaso3() {
  const div = document.getElementById('caso3Resultado');
  div.classList.add('hidden');

  try {
    const energiaBase = 500;
    const energiaRad  = 580;
    const K = energiaRad - energiaBase; // = 80

    // f(v) = 0.002v² + 0.5v − K
    const f  = v => 0.002 * v * v + 0.5 * v - K;
    const df = v => 0.004 * v + 0.5;

    const resNewton  = newtonRaphson(f, df, 50, 1e-6, 100);
    const resBis     = biseccion(f, 0.1, 500, 1e-6, 100);

    div.innerHTML = `
      <strong>CASO 3 — Equilibrio de Energía</strong><br>
      E_base=500u | E_rad=580u → K=80u<br>
      f(v) = 0.002v² + 0.5v − 80<br><br>
      Newton-Raphson: v* ≈ <strong>${fmt(resNewton.raiz, 6)}</strong> (${resNewton.iteraciones.length} iter.)<br>
      Bisección:      v* ≈ <strong>${fmt(resBis.raiz, 6)}</strong> (${resBis.iteraciones.length} iter.)<br>
      Verificación: f(v*) = ${fmt(f(resNewton.raiz), 10)}
    `;
    div.classList.remove('hidden');

    // Precargar escenario E
    document.getElementById('eEnergiaBase').value = energiaBase;
    document.getElementById('eEnergiaRad').value  = energiaRad;
    document.getElementById('eMetodo').value       = 'newton';
    document.getElementById('eV0').value           = 50;
    document.getElementById('eTol').value          = 1e-6;
    document.getElementById('eFuncion').value      = 'termica';
    document.getElementById('eMetodo').dispatchEvent(new Event('change'));

  } catch (e) {
    div.innerHTML = '⚠ Error: ' + e.message;
    div.classList.remove('hidden');
  }
}
