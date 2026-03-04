import { mkChart, pillOf, popSel, popMois, renderTags, MN, PAL, h2r, pc } from './utils.js';

let ALL  = [];   // toutes les lignes (ACHAT + VENTE)
let DATA = [];   // uniquement les VENTES (pour les analyses de marge)
let IND  = 'MargeTotal';
let _meta = '—';

const ILAB = {
  MargeTotal:    'Marge Totale HT (DA)',
  MargeUnitaire: 'Marge Unitaire HT (DA)',
  MontantHT:     'CA HT (DA)',
  Qte:           'Quantité vendue',
};

const FIDS = ['mf-from','mf-to','mf-prod','mf-cat','mf-wil','mf-mois','mf-an'];
const FMAP = { prod:'mf-prod', cat:'mf-cat', wil:'mf-wil', mois:'mf-mois', an:'mf-an' };
const TLBL = { prod:'Produit', cat:'Catégorie', wil:'Wilaya', mois:'Mois', an:'Année' };

function g(id)    { return document.getElementById(id)?.value || ''; }
function s(id, v) { const e = document.getElementById(id); if (e) e.value = v; }
function el(id,t) { const e = document.getElementById(id); if (e) e.textContent = t; }

function getF() {
  return { from:g('mf-from'), to:g('mf-to'), prod:g('mf-prod'), cat:g('mf-cat'), wil:g('mf-wil'), mois:g('mf-mois'), an:g('mf-an') };
}

function applyF() {
  const f = getF();
  // On filtre uniquement les VENTES
  return DATA.filter(r => {
    if (f.from && r.DateCMD < f.from) return false;
    if (f.to   && r.DateCMD > f.to)   return false;
    if (f.prod && r.Produit   !== f.prod) return false;
    if (f.cat  && r.Categorie !== f.cat)  return false;
    if (f.wil  && r.Wilaya    !== f.wil)  return false;
    if (f.mois && r.Mois      !== f.mois) return false;
    if (f.an   && r.Annee     !== f.an)   return false;
    return true;
  });
}

function clearF(fid) { s(fid, ''); update(); }

function reset() {
  const dates = DATA.map(d => d.DateCMD).sort();
  s('mf-from', dates[0]); s('mf-to', dates[dates.length - 1]);
  Object.values(FMAP).forEach(id => s(id, ''));
  IND = 'MargeTotal';
  document.querySelectorAll('#m-indic .ib').forEach((b, i) => b.classList.toggle('on-m', i === 0));
  update();
}

// ── Aggregation ───────────────────────────────────────────────
function aggIND(rows) {
  if (IND === 'MargeUnitaire') {
    return rows.length > 0 ? rows.reduce((s, r) => s + r.MargeUnitaire, 0) / rows.length : 0;
  }
  return rows.reduce((s, r) => s + r[IND], 0);
}

function groupAgg(rows, key) {
  const m = {};
  rows.forEach(r => {
    const k = r[key] || 'N/A';
    if (!m[k]) m[k] = [];
    m[k].push(r);
  });
  return Object.entries(m).map(([k, sub]) => [k, aggIND(sub)]).sort((a, b) => b[1] - a[1]);
}

function fmtV(v) {
  if (IND === 'Qte') return v.toLocaleString('fr-DZ') + ' u';
  return v.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }) + ' DA';
}

// ── KPIs ─────────────────────────────────────────────────────
function renderKPIs(rows) {
  const margeT  = rows.reduce((s, r) => s + r.MargeTotal, 0);
  const caHT    = rows.reduce((s, r) => s + r.MontantHT, 0);
  const cmupMoy = rows.length > 0 ? rows.reduce((s, r) => s + r.CMUP, 0) / rows.length : 0;
  const taux    = caHT > 0 ? (margeT / caHT * 100) : 0;
  const qte     = rows.reduce((s, r) => s + r.Qte, 0);

  // Top produit marge
  const pm   = groupAgg(rows, 'Produit');
  const best = pm[0];

  document.getElementById('m-kpi').innerHTML = `
    <div class="kc" style="--kc:#10b981"><div class="ki">📈</div><div class="kl">Marge Totale HT</div><div class="kv">${(margeT/1e3).toFixed(1)} K DA</div><div class="ks">${margeT.toLocaleString('fr-DZ',{maximumFractionDigits:0})} DA</div></div>
    <div class="kc" style="--kc:#3b82f6"><div class="ki">💰</div><div class="kl">CA Total HT</div><div class="kv">${(caHT/1e6).toFixed(2)} M DA</div><div class="ks">${caHT.toLocaleString('fr-DZ',{maximumFractionDigits:0})} DA</div></div>
    <div class="kc" style="--kc:#f5a623"><div class="ki">📊</div><div class="kl">Taux Marge / CA</div><div class="kv">${taux.toFixed(1)} %</div><div class="ks">Marge HT / CA HT</div></div>
    <div class="kc" style="--kc:#8b5cf6"><div class="ki">🏷</div><div class="kl">CMUP Moyen</div><div class="kv">${cmupMoy.toLocaleString('fr-DZ',{maximumFractionDigits:0})}</div><div class="ks">DA / unité</div></div>
    <div class="kc" style="--kc:#06b6d4"><div class="ki">📦</div><div class="kl">Quantités Vendues</div><div class="kv">${qte.toLocaleString('fr-DZ')}</div><div class="ks">unités</div></div>
    <div class="kc" style="--kc:#f97316"><div class="ki">🏆</div><div class="kl">Top Produit (Marge)</div><div class="kv" style="font-size:.75rem;line-height:1.3">${best ? best[0] : '—'}</div><div class="ks">${best ? best[1].toLocaleString('fr-DZ',{maximumFractionDigits:0})+' DA' : ''}</div></div>`;

  _meta = `${rows.length}/${DATA.length} ventes`;
}

// ── Charts ────────────────────────────────────────────────────
function renderCharts(rows) {
  const L = ILAB[IND];

  // 1. Marge par Produit (bar horizontal)
  const pg = groupAgg(rows, 'Produit');
  el('mt-pb', `${L} — par Produit`);
  mkChart('mch-prod', 'bar', pg.map(e => e[0]), [{
    label: L, data: pg.map(e => e[1]),
    backgroundColor: pg.map((_, i) => pc(i, .82)), borderRadius: 5, borderSkipped: false
  }], { indexAxis: 'y', plugins: { legend: { display: false } } });

  // 2. Marge par Catégorie (donut)
  const cg = groupAgg(rows, 'Categorie');
  el('ms-cat', L);
  mkChart('mch-cat', 'doughnut', cg.map(e => e[0]), [{
    data: cg.map(e => e[1]),
    backgroundColor: cg.map((_, i) => pc(i, .82)),
    borderColor: cg.map((_, i) => PAL[i % PAL.length]), borderWidth: 1, hoverOffset: 6
  }]);

  // 3. Marge par Wilaya (bar)
  const wg = groupAgg(rows, 'Wilaya');
  el('ms-wil', L);
  mkChart('mch-wil', 'bar', wg.map(e => e[0]), [{
    label: L, data: wg.map(e => e[1]),
    backgroundColor: wg.map((_, i) => pc(i, .8)), borderRadius: 5, borderSkipped: false
  }]);

  // 4. CA vs CMUP×Qte vs Marge — par produit (grouped bar)
  const prods = [...new Set(rows.map(r => r.Produit))];
  const caP    = prods.map(p => rows.filter(r => r.Produit === p).reduce((s, r) => s + r.MontantHT, 0));
  const coutP  = prods.map(p => rows.filter(r => r.Produit === p).reduce((s, r) => s + r.CMUP * r.Qte, 0));
  const margeP = prods.map(p => rows.filter(r => r.Produit === p).reduce((s, r) => s + r.MargeTotal, 0));
  mkChart('mch-compare', 'bar', prods, [
    { label: 'CA HT',         data: caP,    backgroundColor: pc(0, .75), borderRadius: 3, borderSkipped: false },
    { label: 'Coût (CMUP×Q)', data: coutP,  backgroundColor: pc(3, .75), borderRadius: 3, borderSkipped: false },
    { label: 'Marge HT',      data: margeP, backgroundColor: pc(2, .85), borderRadius: 3, borderSkipped: false },
  ], { plugins: { legend: { position: 'top' } } });

  // 5. Évolution mensuelle marge (line)
  const mm = {};
  rows.forEach(r => {
    const k = `${r.Annee}-${String(r.Mois).padStart(2, '0')}`;
    if (!mm[k]) mm[k] = { lbl: new Date(r.DateCMD).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }), rows: [] };
    mm[k].rows.push(r);
  });
  const ms = Object.entries(mm).sort((a, b) => a[0].localeCompare(b[0]));
  mkChart('mch-trend', 'line', ms.map(e => e[1].lbl), [{
    label: L, data: ms.map(e => aggIND(e[1].rows)),
    borderColor: '#10b981', backgroundColor: h2r('#10b981', .08),
    fill: true, tension: .42, pointBackgroundColor: '#10b981', pointRadius: 5, pointHoverRadius: 7, borderWidth: 2.5
  }]);

  // 6. Taux de marge par catégorie (bar)
  const cats = [...new Set(rows.map(r => r.Categorie))];
  const tauxCat = cats.map(cat => {
    const sub = rows.filter(r => r.Categorie === cat);
    const ca  = sub.reduce((s, r) => s + r.MontantHT, 0);
    return { cat, t: ca > 0 ? (sub.reduce((s, r) => s + r.MargeTotal, 0) / ca * 100) : 0 };
  }).sort((a, b) => b.t - a.t);
  mkChart('mch-taux', 'bar', tauxCat.map(e => e.cat), [{
    label: 'Taux marge / CA (%)',
    data: tauxCat.map(e => e.t),
    backgroundColor: tauxCat.map((_, i) => pc(i, .8)), borderRadius: 5, borderSkipped: false
  }], { plugins: { legend: { display: false } } });
}

// ── Tableau consolidé (toutes lignes ACHAT+VENTE) ─────────────
function renderTable(rows) {
  // Tableau de détail des ventes filtrées
  el('ms-raw', `${rows.length} vente(s) filtrée(s)`);
  const t = document.getElementById('mtb-raw'); if (!t) return;
  t.querySelector('thead').innerHTML = `
    <tr>
      <th>N° CMD</th><th>Date</th><th>Produit</th><th>Catégorie</th><th>Wilaya</th>
      <th class="nr">Qté</th><th class="nr">PV HT/u</th><th class="nr">CMUP</th>
      <th class="nr">Marge/u</th><th class="nr">Marge Totale</th>
    </tr>`;
  t.querySelector('tbody').innerHTML = rows.length === 0
    ? `<tr><td colspan="10" class="empty">Aucune donnée</td></tr>`
    : rows.map(r => {
        const pos = r.MargeTotal >= 0;
        const gc  = pos ? '#34d399' : '#f87171';
        return `<tr>
          <td>${pillOf(r.NumCMD)}</td>
          <td>${new Date(r.DateCMD).toLocaleDateString('fr-FR')}</td>
          <td>${r.Produit}</td>
          <td>${r.Categorie}</td>
          <td>${r.Wilaya || '—'}</td>
          <td class="nr">${r.Qte}</td>
          <td class="nr">${r.PrixUnitaire.toLocaleString('fr-DZ', {maximumFractionDigits:0})} DA</td>
          <td class="nr">${r.CMUP.toLocaleString('fr-DZ', {maximumFractionDigits:0})} DA</td>
          <td class="nr" style="color:${gc}">${r.MargeUnitaire.toLocaleString('fr-DZ', {maximumFractionDigits:0})} DA</td>
          <td class="nr" style="color:${gc};font-weight:700">${r.MargeTotal.toLocaleString('fr-DZ', {maximumFractionDigits:0})} DA</td>
        </tr>`;
      }).join('');

  // Tableau consolidé — ancienne template, ordre corrigé (Produit → Date), valeurs CMUP exactes
  const tc = document.getElementById('mtb-consolidated'); if (!tc) return;
  tc.querySelector('thead').innerHTML = `
    <tr>
      <th>N° CMD</th><th>Date</th><th>Code</th><th>Produit</th><th>Catégorie</th><th>Wilaya</th>
      <th>Type</th><th class="nr">Qté</th><th class="nr">Montant HT</th><th class="nr">Prix Unit.</th>
      <th class="nr">Stock</th><th class="nr">Valeur Stock</th><th class="nr">CMUP</th>
      <th class="nr">Marge/u</th><th class="nr">Marge Tot.</th>
    </tr>`;
  const sorted = [...ALL].sort((a, b) => {
    if (a.Produit < b.Produit) return -1;
    if (a.Produit > b.Produit) return  1;
    if (a.DateCMD < b.DateCMD) return -1;
    if (a.DateCMD > b.DateCMD) return  1;
    if (a.TypeOperation === 'ACHAT' && b.TypeOperation === 'VENTE') return -1;
    if (a.TypeOperation === 'VENTE' && b.TypeOperation === 'ACHAT') return  1;
    return 0;
  });
  tc.querySelector('tbody').innerHTML = sorted.map(r => {
    const isV  = r.TypeOperation === 'VENTE';
    const pos  = r.MargeTotal >= 0;
    const gc   = pos ? '#34d399' : '#f87171';
    const bg   = isV ? '' : 'background:rgba(59,130,246,.04)';
    const fmt0 = v => (+v).toLocaleString('fr-DZ', { maximumFractionDigits: 2 });
    return `<tr style="${bg}">
      <td>${pillOf(r.NumCMD)}</td>
      <td>${new Date(r.DateCMD).toLocaleDateString('fr-FR')}</td>
      <td style="font-size:.65rem;color:var(--muted)">${r.CodeProduit}</td>
      <td>${r.Produit}</td>
      <td>${r.Categorie || '—'}</td>
      <td>${r.Wilaya || '—'}</td>
      <td><span class="pill ${isV ? 'p-slsd' : 'p-pol'}">${r.TypeOperation}</span></td>
      <td class="nr">${r.Qte}</td>
      <td class="nr">${fmt0(r.MontantHT)} DA</td>
      <td class="nr">${fmt0(r.PrixUnitaire)} DA</td>
      <td class="nr">${fmt0(r.Stock)}</td>
      <td class="nr">${fmt0(r.ValeurStock)} DA</td>
      <td class="nr">${fmt0(r.CMUP)} DA</td>
      <td class="nr" style="color:${isV ? gc : 'var(--muted)'}">${isV ? fmt0(r.MargeUnitaire)+' DA' : '—'}</td>
      <td class="nr" style="color:${isV ? gc : 'var(--muted)'};font-weight:700">${isV ? fmt0(r.MargeTotal)+' DA' : '—'}</td>
    </tr>`;
  }).join('');
}

function update() {
  const rows = applyF();
  renderKPIs(rows);
  renderTags('m-tags', FMAP, TLBL, getF, clearF, 'green');
  renderCharts(rows);
  renderTable(rows);
}

export function getMeta() { return _meta; }
export function initMarges(data) {
  ALL  = data;
  DATA = data.filter(r => r.TypeOperation === 'VENTE');

  const dates = DATA.map(d => d.DateCMD).sort();
  s('mf-from', dates[0]); s('mf-to', dates[dates.length - 1]);

  popSel('mf-prod', DATA.map(d => d.Produit));
  popSel('mf-cat',  DATA.map(d => d.Categorie));
  popSel('mf-wil',  DATA.map(d => d.Wilaya).filter(Boolean));
  popMois('mf-mois', DATA.map(d => +d.Mois));
  popSel('mf-an',   DATA.map(d => d.Annee));

  document.getElementById('m-indic')?.addEventListener('click', e => {
    const b = e.target.closest('.ib'); if (!b) return;
    document.querySelectorAll('#m-indic .ib').forEach(x => x.classList.remove('on-m'));
    b.classList.add('on-m'); IND = b.dataset.v; update();
  });
  FIDS.forEach(id => document.getElementById(id)?.addEventListener('change', update));
  document.getElementById('m-reset')?.addEventListener('click', reset);
  update();
}
