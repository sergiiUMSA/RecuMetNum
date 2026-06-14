/* ===================================================
   FANI — Centro de Control Numérico
   js/metodos.js — Biblioteca de métodos numéricos
   =================================================== */

// ══════════════════════════════════════════════════════
// ÁLGEBRA LINEAL — Sistemas de ecuaciones (3×3)
// ══════════════════════════════════════════════════════

/**
 * Gauss-Seidel para sistema Ax = b (3×3)
 * @param {number[][]} A - Matriz 3×3
 * @param {number[]}   b - Vector independiente
 * @param {number}     tol - Tolerancia
 * @param {number}     maxIter - Máximo de iteraciones
 * @returns {{ x: number[], iteraciones: object[], convergido: boolean }}
 */
function gaussSeidel(A, b, tol, maxIter) {
  const n = A.length;
  let x = new Array(n).fill(0);
  const iteraciones = [];

  for (let k = 0; k < maxIter; k++) {
    const xOld = [...x];

    for (let i = 0; i < n; i++) {
      let sigma = 0;
      for (let j = 0; j < n; j++) {
        if (j !== i) sigma += A[i][j] * x[j];
      }
      if (Math.abs(A[i][i]) < 1e-14) throw new Error('Elemento diagonal cero en fila ' + i + '. Reordena la matriz.');
      x[i] = (b[i] - sigma) / A[i][i];
    }

    const error = Math.max(...x.map((xi, i) => Math.abs(xi - xOld[i])));
    iteraciones.push({ iter: k + 1, x: [...x], error });

    if (error < tol) {
      return { x, iteraciones, convergido: true };
    }
  }
  return { x, iteraciones, convergido: false };
}

/**
 * Jacobi para sistema Ax = b (3×3)
 */
function jacobi(A, b, tol, maxIter) {
  const n = A.length;
  let x = new Array(n).fill(0);
  const iteraciones = [];

  for (let k = 0; k < maxIter; k++) {
    const xNew = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sigma = 0;
      for (let j = 0; j < n; j++) {
        if (j !== i) sigma += A[i][j] * x[j];
      }
      if (Math.abs(A[i][i]) < 1e-14) throw new Error('Elemento diagonal cero en fila ' + i);
      xNew[i] = (b[i] - sigma) / A[i][i];
    }

    const error = Math.max(...xNew.map((xi, i) => Math.abs(xi - x[i])));
    x = [...xNew];
    iteraciones.push({ iter: k + 1, x: [...x], error });

    if (error < tol) return { x, iteraciones, convergido: true };
  }
  return { x, iteraciones, convergido: false };
}

// ── Eliminación Gaussiana para resolver Ax = b ──
function gauss(A, b) {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let k = 0; k < n; k++) {
    // pivoteo parcial
    let maxRow = k;
    for (let i = k + 1; i < n; i++) {
      if (Math.abs(M[i][k]) > Math.abs(M[maxRow][k])) maxRow = i;
    }
    [M[k], M[maxRow]] = [M[maxRow], M[k]];
    if (Math.abs(M[k][k]) < 1e-14) throw new Error('Sistema singular o mal condicionado.');

    for (let i = k + 1; i < n; i++) {
      const factor = M[i][k] / M[k][k];
      for (let j = k; j <= n; j++) M[i][j] -= factor * M[k][j];
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n];
    for (let j = i + 1; j < n; j++) x[i] -= M[i][j] * x[j];
    x[i] /= M[i][i];
  }
  return x;
}

// ── Número de condición (norma infinito) ──
function numeroCond(A) {
  const normA    = normInf(A);
  try {
    const Ainv     = invertir3x3(A);
    const normAinv = normInf(Ainv);
    return normA * normAinv;
  } catch(e) {
    return Infinity;
  }
}

function normInf(A) {
  return Math.max(...A.map(row => row.reduce((s, v) => s + Math.abs(v), 0)));
}

function invertir3x3(A) {
  const det =
    A[0][0] * (A[1][1]*A[2][2] - A[1][2]*A[2][1]) -
    A[0][1] * (A[1][0]*A[2][2] - A[1][2]*A[2][0]) +
    A[0][2] * (A[1][0]*A[2][1] - A[1][1]*A[2][0]);

  if (Math.abs(det) < 1e-14) throw new Error('Matriz singular, no invertible.');

  const inv = [
    [
      (A[1][1]*A[2][2]-A[1][2]*A[2][1])/det,
      (A[0][2]*A[2][1]-A[0][1]*A[2][2])/det,
      (A[0][1]*A[1][2]-A[0][2]*A[1][1])/det
    ],
    [
      (A[1][2]*A[2][0]-A[1][0]*A[2][2])/det,
      (A[0][0]*A[2][2]-A[0][2]*A[2][0])/det,
      (A[0][2]*A[1][0]-A[0][0]*A[1][2])/det
    ],
    [
      (A[1][0]*A[2][1]-A[1][1]*A[2][0])/det,
      (A[0][1]*A[2][0]-A[0][0]*A[2][1])/det,
      (A[0][0]*A[1][1]-A[0][1]*A[1][0])/det
    ]
  ];
  return inv;
}

// ══════════════════════════════════════════════════════
// ECUACIONES DIFERENCIALES ORDINARIAS (EDO)
// ══════════════════════════════════════════════════════

/**
 * RK4 para dH/dt = f(t, H)
 */
function rk4(f, t0, y0, dt, tMax, stopCondition) {
  const pts = [{ t: t0, y: y0 }];
  let t = t0, y = y0;

  while (t < tMax) {
    const k1 = f(t,         y);
    const k2 = f(t + dt/2,  y + dt*k1/2);
    const k3 = f(t + dt/2,  y + dt*k2/2);
    const k4 = f(t + dt,    y + dt*k3);
    y = y + (dt/6) * (k1 + 2*k2 + 2*k3 + k4);
    t = parseFloat((t + dt).toFixed(10));
    pts.push({ t, y });
    if (stopCondition && stopCondition(y)) break;
  }
  return pts;
}

/**
 * Heun (RK2) para dH/dt = f(t, H)
 */
function heun(f, t0, y0, dt, tMax, stopCondition) {
  const pts = [{ t: t0, y: y0 }];
  let t = t0, y = y0;

  while (t < tMax) {
    const k1 = f(t,      y);
    const k2 = f(t + dt, y + dt*k1);
    y = y + (dt/2) * (k1 + k2);
    t = parseFloat((t + dt).toFixed(10));
    pts.push({ t, y });
    if (stopCondition && stopCondition(y)) break;
  }
  return pts;
}

/**
 * Euler explícito
 */
function euler(f, t0, y0, dt, tMax, stopCondition) {
  const pts = [{ t: t0, y: y0 }];
  let t = t0, y = y0;

  while (t < tMax) {
    y = y + dt * f(t, y);
    t = parseFloat((t + dt).toFixed(10));
    pts.push({ t, y });
    if (stopCondition && stopCondition(y)) break;
  }
  return pts;
}

// ── Sistema vectorial EDO (Escenario G) ──
/**
 * RK4 vectorizado para sistemas dY/dt = F(t, Y)
 */
function rk4Sistema(F, t0, Y0, dt, tMax) {
  const resultado = [{ t: t0, Y: [...Y0] }];
  let t = t0, Y = [...Y0];

  while (t < tMax) {
    const k1 = F(t,         Y);
    const k2 = F(t + dt/2,  Y.map((yi, i) => yi + dt*k1[i]/2));
    const k3 = F(t + dt/2,  Y.map((yi, i) => yi + dt*k2[i]/2));
    const k4 = F(t + dt,    Y.map((yi, i) => yi + dt*k3[i]));
    Y = Y.map((yi, i) => yi + (dt/6)*(k1[i] + 2*k2[i] + 2*k3[i] + k4[i]));
    // Clamp negatives
    Y = Y.map(v => Math.max(0, v));
    t = parseFloat((t + dt).toFixed(10));
    resultado.push({ t, Y: [...Y] });
  }
  return resultado;
}

function heunSistema(F, t0, Y0, dt, tMax) {
  const resultado = [{ t: t0, Y: [...Y0] }];
  let t = t0, Y = [...Y0];

  while (t < tMax) {
    const k1 = F(t,      Y);
    const k2 = F(t + dt, Y.map((yi, i) => yi + dt*k1[i]));
    Y = Y.map((yi, i) => Math.max(0, yi + (dt/2)*(k1[i] + k2[i])));
    t = parseFloat((t + dt).toFixed(10));
    resultado.push({ t, Y: [...Y] });
  }
  return resultado;
}

// ══════════════════════════════════════════════════════
// INTERPOLACIÓN
// ══════════════════════════════════════════════════════

/**
 * Interpolación de Lagrange
 */
function lagrange(xs, ys, x) {
  const n = xs.length;
  let result = 0;
  for (let i = 0; i < n; i++) {
    let term = ys[i];
    for (let j = 0; j < n; j++) {
      if (j !== i) {
        const denom = xs[i] - xs[j];
        if (Math.abs(denom) < 1e-14) throw new Error('Puntos x duplicados en la tabla.');
        term *= (x - xs[j]) / denom;
      }
    }
    result += term;
  }
  return result;
}

/**
 * Newton — diferencias divididas
 */
function newton(xs, ys, x) {
  const n = xs.length;
  const F = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) F[i][0] = ys[i];

  for (let j = 1; j < n; j++) {
    for (let i = 0; i < n - j; i++) {
      const denom = xs[i + j] - xs[i];
      if (Math.abs(denom) < 1e-14) throw new Error('Puntos x duplicados.');
      F[i][j] = (F[i + 1][j - 1] - F[i][j - 1]) / denom;
    }
  }

  let result = F[0][0];
  let prod   = 1;
  for (let j = 1; j < n; j++) {
    prod  *= (x - xs[j - 1]);
    result += F[0][j] * prod;
  }
  return result;
}

/**
 * Splines cúbicos naturales
 */
function splineCubico(xs, ys, x) {
  const n = xs.length;
  if (n < 2) throw new Error('Se necesitan al menos 2 puntos para spline.');

  const h = [], alpha = [], l = [], mu = [], z = [], c = [], b = [], d = [];
  for (let i = 0; i < n - 1; i++) h.push(xs[i + 1] - xs[i]);

  for (let i = 1; i < n - 1; i++) {
    alpha.push(3 * ((ys[i + 1] - ys[i]) / h[i] - (ys[i] - ys[i - 1]) / h[i - 1]));
  }

  l[0] = 1; mu[0] = 0; z[0] = 0;
  for (let i = 1; i < n - 1; i++) {
    l[i] = 2 * (xs[i + 1] - xs[i - 1]) - h[i - 1] * mu[i - 1];
    mu[i] = h[i] / l[i];
    z[i]  = (alpha[i - 1] - h[i - 1] * z[i - 1]) / l[i];
  }

  l[n - 1] = 1; z[n - 1] = 0; c[n - 1] = 0;
  for (let j = n - 2; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (ys[j + 1] - ys[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }

  // find interval
  let idx = n - 2;
  for (let i = 0; i < n - 1; i++) {
    if (x >= xs[i] && x <= xs[i + 1]) { idx = i; break; }
  }

  const dx = x - xs[idx];
  return ys[idx] + b[idx]*dx + c[idx]*dx*dx + d[idx]*dx*dx*dx;
}

// evaluación de polinomio interpolador en muchos puntos (para graficar)
function evaluarInterpolacion(metodo, xs, ys, xArr) {
  return xArr.map(x => {
    try {
      if (metodo === 'lagrange')  return lagrange(xs, ys, x);
      if (metodo === 'newton')    return newton(xs, ys, x);
      if (metodo === 'spline')    return splineCubico(xs, ys, x);
    } catch(e) { return null; }
  });
}

// ══════════════════════════════════════════════════════
// INTEGRACIÓN NUMÉRICA
// ══════════════════════════════════════════════════════

function trapecio(f, a, b, n) {
  const h = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) sum += 2 * f(a + i * h);
  return (h / 2) * sum;
}

function simpson13(f, a, b, n) {
  if (n % 2 !== 0) n++;  // n debe ser par
  const h = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) {
    sum += (i % 2 === 0 ? 2 : 4) * f(a + i * h);
  }
  return (h / 3) * sum;
}

function simpson38(f, a, b, n) {
  // n debe ser múltiplo de 3
  while (n % 3 !== 0) n++;
  const h = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) {
    sum += (i % 3 === 0 ? 2 : 3) * f(a + i * h);
  }
  return (3 * h / 8) * sum;
}

// ══════════════════════════════════════════════════════
// RAÍCES DE ECUACIONES
// ══════════════════════════════════════════════════════

/**
 * Bisección
 */
function biseccion(f, a, b, tol, maxIter) {
  if (f(a) * f(b) > 0) throw new Error('f(a) y f(b) tienen el mismo signo. No hay garantía de raíz en [a, b].');
  const iteraciones = [];

  for (let k = 0; k < maxIter; k++) {
    const c   = (a + b) / 2;
    const fc  = f(c);
    const err = Math.abs(b - a) / 2;
    iteraciones.push({ iter: k + 1, a, b, c, fc, error: err });

    if (err < tol || Math.abs(fc) < 1e-14) return { raiz: c, iteraciones, convergido: true };
    if (f(a) * fc < 0) b = c;
    else                a = c;
  }
  return { raiz: (a + b) / 2, iteraciones, convergido: false };
}

/**
 * Newton-Raphson
 */
function newtonRaphson(f, df, x0, tol, maxIter) {
  let x = x0;
  const iteraciones = [];

  for (let k = 0; k < maxIter; k++) {
    const fx  = f(x);
    const dfx = df(x);
    if (Math.abs(dfx) < 1e-14) throw new Error('Derivada cero en x = ' + x.toFixed(6));
    const xNew  = x - fx / dfx;
    const error = Math.abs(xNew - x);
    iteraciones.push({ iter: k + 1, x, fx, dfx, xNew, error });
    x = xNew;
    if (error < tol) return { raiz: x, iteraciones, convergido: true };
  }
  return { raiz: x, iteraciones, convergido: false };
}

/**
 * Secante
 */
function secante(f, x0, x1, tol, maxIter) {
  const iteraciones = [];
  let xPrev = x0, xCurr = x1;

  for (let k = 0; k < maxIter; k++) {
    const f0 = f(xPrev), f1 = f(xCurr);
    const denom = f1 - f0;
    if (Math.abs(denom) < 1e-14) throw new Error('División por cero en método de la secante.');
    const xNew  = xCurr - f1 * (xCurr - xPrev) / denom;
    const error = Math.abs(xNew - xCurr);
    iteraciones.push({ iter: k + 1, xPrev, xCurr, xNew, f1, error });
    xPrev = xCurr;
    xCurr = xNew;
    if (error < tol) return { raiz: xNew, iteraciones, convergido: true };
  }
  return { raiz: xCurr, iteraciones, convergido: false };
}

// ══════════════════════════════════════════════════════
// UTILIDADES GENERALES
// ══════════════════════════════════════════════════════

/**
 * Genera un array de n puntos entre a y b
 */
function linspace(a, b, n) {
  const arr = [];
  const step = (b - a) / (n - 1);
  for (let i = 0; i < n; i++) arr.push(a + i * step);
  return arr;
}

/**
 * Formatea número con cifras significativas
 */
function fmt(v, dec = 6) {
  if (typeof v !== 'number' || isNaN(v)) return 'N/A';
  return v.toFixed(dec);
}
