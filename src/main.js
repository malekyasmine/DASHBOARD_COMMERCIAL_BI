import { parseCSV, enrichVente, enrichAchat, enrichMarge } from './parser.js';
import { initVentes, getMeta as getMetaV } from './ventes.js';
import { initAchats, getMeta as getMetaA } from './achats.js';
import { initMarges, getMeta as getMetaM } from './marges.js';

const metaFns = { v: () => getMetaV(), a: () => getMetaA(), m: () => getMetaM() };

async function loadData() {
  const [vR, aR, mR] = await Promise.all([
    fetch('/vente.csv'), fetch('/achat.csv'), fetch('/merged_data.csv')
  ]);
  if (!vR.ok) throw new Error('Impossible de charger vente.csv');
  if (!aR.ok) throw new Error('Impossible de charger achat.csv');
  if (!mR.ok) throw new Error("merged_data.csv introuvable — lancez d'abord : node generate-merged.js");
  const [vT, aT, mT] = await Promise.all([vR.text(), aR.text(), mR.text()]);
  return { ventes:parseCSV(vT).map(enrichVente), achats:parseCSV(aT).map(enrichAchat), marges:parseCSV(mT).map(enrichMarge) };
}

function setupTabs() {
  ['v','a','m'].forEach(t =>
    document.getElementById('btn-'+t)?.addEventListener('click', () => switchTab(t))
  );
}

function switchTab(t) {
  ['v','a','m'].forEach(id => {
    document.getElementById('panel-'+id)?.classList.toggle('show', id===t);
    const b = document.getElementById('btn-'+id);
    if (b) b.className = 'tab-btn' + (id===t ? ' active-'+id : '');
  });
  // Met à jour le compteur de la topbar selon l'onglet actif
  const meta = document.getElementById('tb-meta');
  if (meta) meta.textContent = metaFns[t]?.() || '';
}

async function main() {
  document.getElementById('loading').style.display = 'flex';
  try {
    const { ventes, achats, marges } = await loadData();
    document.getElementById('loading').style.display = 'none';
    setupTabs();
    initVentes(ventes);
    initAchats(achats);
    initMarges(marges);
  } catch(err) {
    document.getElementById('loading').innerHTML =
      `<div class="load-err">❌ ${err.message}<br>
       <small>Vérifiez que <b>vente.csv</b>, <b>achat.csv</b> et <b>merged_data.csv</b><br>
       sont dans le dossier <b>public/</b><br><br>
       Pour regénérer merged_data.csv :<br><code>node generate-merged.js</code></small></div>`;
  }
}
main();
