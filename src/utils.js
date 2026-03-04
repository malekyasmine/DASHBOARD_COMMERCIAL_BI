import Chart from 'chart.js/auto';

// ── Palette ──────────────────────────────────────────────────
export const PAL = ['#f5a623','#3b82f6','#10b981','#ef4444',
  '#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899','#6366f1'];

export function h2r(hex, a = 1) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}
export function pc(i, a = 0.78) { return h2r(PAL[i % PAL.length], a); }

// ── Chart factory ────────────────────────────────────────────
const REGISTRY = {};
export function mkChart(id, type, labels, datasets, extra = {}) {
  if (REGISTRY[id]) { REGISTRY[id].destroy(); }
  const ctx = document.getElementById(id);
  if (!ctx) return;
  REGISTRY[id] = new Chart(ctx, {
    type,
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 0,
      animation: { duration: 300 },
      plugins: {
        legend: { labels: { color:'#9ca3af', font:{ family:"'DM Sans'", size:11 }, boxWidth:10, padding:11 } },
        tooltip: {
          backgroundColor:'#1a1e2a', borderColor:'#242836', borderWidth:1,
          titleColor:'#e8eaf0', bodyColor:'#9ca3af', padding:9,
          callbacks: { label: c => {
            const v = c.parsed.y !== undefined ? c.parsed.y : c.parsed;
            return '  ' + (typeof v === 'number' ? v.toLocaleString('fr-DZ') : v);
          }}
        }
      },
      scales: (type === 'bar' || type === 'line') ? {
        x: { ticks:{ color:'#6b7280', font:{size:10} }, grid:{ color:'rgba(255,255,255,.03)' } },
        y: { ticks:{ color:'#6b7280', font:{size:10},
          callback: v => v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1e3 ? (v/1e3).toFixed(0)+'K' : v },
          grid:{ color:'rgba(255,255,255,.05)' } }
      } : {},
      ...extra
    }
  });
}

// ── Data helpers ─────────────────────────────────────────────
export const MN = ['','Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

export function grp(rows, key, val) {
  const m = {};
  rows.forEach(r => { const k = r[key] ?? 'N/A'; m[k] = (m[k] || 0) + r[val]; });
  return m;
}
export function se(m) { return Object.entries(m).sort((a, b) => b[1] - a[1]); }
export function fmt(v, col) {
  return col === 'Qte' ? v.toLocaleString('fr-DZ') + ' u' : v.toLocaleString('fr-DZ') + ' DA';
}

// ── Pill badges ──────────────────────────────────────────────
export function pillOf(v) {
  const s = String(v);
  if (s.startsWith('SARL'))  return `<span class="pill p-sarl">${v}</span>`;
  if (s.startsWith('EURL'))  return `<span class="pill p-eurl">${v}</span>`;
  if (s.startsWith('SNC'))   return `<span class="pill p-snc">${v}</span>`;
  if (s.includes('SLSD'))    return `<span class="pill p-slsd">${v}</span>`;
  if (s.includes('SLSR'))    return `<span class="pill p-slsr">${v}</span>`;
  if (s.includes('SLSG'))    return `<span class="pill p-slsg">${v}</span>`;
  if (s.includes('POL'))     return `<span class="pill p-pol">${v}</span>`;
  if (s === 'Import')        return `<span class="pill p-imp">${v}</span>`;
  if (s === 'Local')         return `<span class="pill p-loc">${v}</span>`;
  if (s.startsWith('Ordin')) return `<span class="pill p-ord">${v}</span>`;
  if (s.startsWith('Impr'))  return `<span class="pill p-pri">${v}</span>`;
  if (s.startsWith('Cons'))  return `<span class="pill p-ink">${v}</span>`;
  if (s.startsWith('Scan'))  return `<span class="pill p-sca">${v}</span>`;
  return v;
}

// ── Select populator ─────────────────────────────────────────
export function popSel(id, vals) {
  const el = document.getElementById(id); if (!el) return;
  const cur = el.value;
  el.innerHTML = '<option value="">Tous</option>';
  [...new Set(vals)].sort().forEach(v => {
    const o = document.createElement('option'); o.value = v; o.textContent = v; el.appendChild(o);
  });
  if (cur) el.value = cur;
}
export function popMois(id, mois) {
  const el = document.getElementById(id); if (!el) return;
  el.innerHTML = '<option value="">Tous</option>';
  [...new Set(mois)].sort((a, b) => a - b).forEach(m => {
    const o = document.createElement('option'); o.value = m; o.textContent = MN[m]; el.appendChild(o);
  });
}

// ── Tag chips ────────────────────────────────────────────────
export function renderTags(containerId, filterMap, labelMap, getF, clearFn, cls = '') {
  const c = document.getElementById(containerId); if (!c) return;
  c.innerHTML = '';
  const f = getF();
  Object.entries(filterMap).forEach(([k, fid]) => {
    const v = f[k]; if (!v) return;
    const lv = k === 'mois' ? MN[+v] : v;
    const d = document.createElement('div');
    d.className = 'tag' + (cls ? ' ' + cls : '');
    d.innerHTML = `${labelMap[k]}: <b>${lv}</b> <span class="rx" data-fid="${fid}">✕</span>`;
    d.querySelector('.rx').addEventListener('click', () => clearFn(fid));
    c.appendChild(d);
  });
}
