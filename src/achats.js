import { mkChart, grp, se, fmt, pillOf, popSel, popMois, renderTags, MN, PAL, h2r, pc } from './utils.js';

let DATA = [];
let IND  = 'MontantTTC';
let _meta = '—';
const ILAB = { MontantTTC:"Coût d'achat TTC (DA)", MontantHT:"Coût d'achat HT (DA)", Qte:'Quantité' };

const FIDS = ['af-from','af-to','af-prod','af-cat','af-four','af-type','af-mois','af-an'];
const FMAP = { prod:'af-prod', cat:'af-cat', four:'af-four', type:'af-type', mois:'af-mois', an:'af-an' };
const TLBL = { prod:'Produit', cat:'Catégorie', four:'Fournisseur', type:'Type', mois:'Mois', an:'Année' };

function g(id) { return document.getElementById(id)?.value || ''; }
function s(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function el(id, txt) { const e = document.getElementById(id); if (e) e.textContent = txt; }

function getF() { return { from:g('af-from'), to:g('af-to'), prod:g('af-prod'), cat:g('af-cat'), four:g('af-four'), type:g('af-type'), mois:g('af-mois'), an:g('af-an') }; }

function applyF() {
  const f = getF();
  return DATA.filter(r => {
    if (f.from && r.DateCMD < f.from)       return false;
    if (f.to   && r.DateCMD > f.to)         return false;
    if (f.prod && r.Produit !== f.prod)      return false;
    if (f.cat  && r.Categorie !== f.cat)     return false;
    if (f.four && r.Fournisseur !== f.four)  return false;
    if (f.type && r.TypeAchat !== f.type)    return false;
    if (f.mois && r.Mois !== +f.mois)        return false;
    if (f.an   && r.Annee !== +f.an)         return false;
    return true;
  });
}

function clearF(fid) { s(fid, ''); update(); }
function reset() {
  const dates = DATA.map(d=>d.DateCMD).sort();
  s('af-from',dates[0]); s('af-to',dates[dates.length-1]);
  Object.values(FMAP).forEach(id=>s(id,''));
  IND='MontantTTC';
  document.querySelectorAll('#a-indic .ib').forEach((b,i)=>b.classList.toggle('on-a',i===0));
  update();
}

function renderKPIs(rows) {
  const ca=rows.reduce((s,r)=>s+r.MontantTTC,0), ht=rows.reduce((s,r)=>s+r.MontantHT,0),
    qte=rows.reduce((s,r)=>s+r.Qte,0), nc=new Set(rows.map(r=>r.NumCMD)).size,
    nf=new Set(rows.map(r=>r.Fournisseur)).size, cg=se(grp(rows,'Categorie','MontantTTC')), bc=cg[0];
  document.getElementById('a-kpi').innerHTML = `
    <div class="kc" style="--kc:#3b82f6"><div class="ki">💸</div><div class="kl">Coût Total TTC</div><div class="kv">${(ca/1e6).toFixed(2)} M DA</div><div class="ks">${ca.toLocaleString('fr-DZ')} DA</div></div>
    <div class="kc" style="--kc:#06b6d4"><div class="ki">📋</div><div class="kl">Coût Total HT</div><div class="kv">${(ht/1e6).toFixed(2)} M DA</div><div class="ks">${ht.toLocaleString('fr-DZ')} DA</div></div>
    <div class="kc" style="--kc:#10b981"><div class="ki">📦</div><div class="kl">Quantités Achetées</div><div class="kv">${qte.toLocaleString('fr-DZ')}</div><div class="ks">unités</div></div>
    <div class="kc" style="--kc:#8b5cf6"><div class="ki">🗂</div><div class="kl">Bons de Commande</div><div class="kv">${nc}</div><div class="ks">commandes d'achat</div></div>
    <div class="kc" style="--kc:#f97316"><div class="ki">🏭</div><div class="kl">Fournisseurs Actifs</div><div class="kv">${nf}</div><div class="ks">fournisseurs distincts</div></div>
    <div class="kc" style="--kc:#ef4444"><div class="ki">🏆</div><div class="kl">Top Catégorie (Coût)</div><div class="kv" style="font-size:.9rem">${bc?bc[0]:'—'}</div><div class="ks">${bc?((bc[1]/ca*100).toFixed(1)+'% du coût'):''}</div></div>`;
  _meta = `${rows.length}/${DATA.length} lignes`;
}

function tbSet(id,th,tb){const t=document.getElementById(id);if(!t)return;t.querySelector('thead').innerHTML=th;t.querySelector('tbody').innerHTML=tb;}
function emp(n){return `<tr><td colspan="${n}" class="empty">Aucune donnée</td></tr>`;}

function renderCharts(rows) {
  const L=ILAB[IND];
  const cg=se(grp(rows,'Categorie',IND)); el('as-cat',L);
  mkChart('ach-cat','doughnut',cg.map(e=>e[0]),[{data:cg.map(e=>e[1]),backgroundColor:cg.map((_,i)=>pc(i,.82)),borderColor:cg.map((_,i)=>PAL[i%PAL.length]),borderWidth:1,hoverOffset:5}]);
  const tg=se(grp(rows,'TypeAchat',IND)); el('as-type',L);
  mkChart('ach-type','pie',tg.map(e=>e[0]),[{data:tg.map(e=>e[1]),backgroundColor:tg.map((_,i)=>pc(i,.85)),borderColor:'#13161e',borderWidth:2}]);
  const fg=se(grp(rows,'Fournisseur',IND)); el('as-four',L);
  mkChart('ach-four','doughnut',fg.map(e=>e[0]),[{data:fg.map(e=>e[1]),backgroundColor:fg.map((_,i)=>pc(i,.82)),borderColor:fg.map((_,i)=>PAL[i%PAL.length]),borderWidth:1,hoverOffset:5}]);
  const pg=se(grp(rows,'Produit',IND)); el('at-pb',`Classement Produits — ${L}`);
  mkChart('ach-pb','bar',pg.map(e=>e[0]),[{label:L,data:pg.map(e=>e[1]),backgroundColor:pg.map((_,i)=>pc(i,.78)),borderRadius:4,borderSkipped:false}],{indexAxis:'y',plugins:{legend:{display:false}}});
  mkChart('ach-pp','doughnut',pg.map(e=>e[0]),[{data:pg.map(e=>e[1]),backgroundColor:pg.map((_,i)=>pc(i,.83)),borderColor:pg.map((_,i)=>PAL[i%PAL.length]),borderWidth:1}]);
  const cats=[...new Set(rows.map(r=>r.Categorie))].sort(), fours=[...new Set(rows.map(r=>r.Fournisseur))].sort();
  mkChart('ach-four-cat','bar',cats,fours.map((f,i)=>({label:f,data:cats.map(cat=>rows.filter(r=>r.Fournisseur===f&&r.Categorie===cat).reduce((s,r)=>s+r[IND],0)),backgroundColor:pc(i,.8),borderRadius:4,borderSkipped:false})),{plugins:{legend:{position:'top'}}});
  mkChart('ach-four-bar','bar',fg.map(e=>e[0]),[{label:L,data:fg.map(e=>e[1]),backgroundColor:fg.map((_,i)=>pc(i,.8)),borderRadius:4,borderSkipped:false}],{indexAxis:'y',plugins:{legend:{display:false}}});
  const mm={};rows.forEach(r=>{const k=`${r.Annee}-${String(r.Mois).padStart(2,'0')}`;if(!mm[k])mm[k]={lbl:r.Date.toLocaleDateString('fr-FR',{month:'short',year:'2-digit'}),v:0};mm[k].v+=r[IND]});
  const ms=Object.entries(mm).sort((a,b)=>a[0].localeCompare(b[0]));
  mkChart('ach-trend','line',ms.map(e=>e[1].lbl),[{label:L,data:ms.map(e=>e[1].v),borderColor:PAL[1],backgroundColor:h2r(PAL[1],.07),fill:true,tension:.42,pointBackgroundColor:PAL[1],pointRadius:5,pointHoverRadius:7,borderWidth:2.5}]);
}

function renderTables(rows) {
  const lbl={MontantTTC:'Coût TTC',MontantHT:'Coût HT',Qte:'Quantité'}[IND];
  const pg=se(grp(rows,'Produit',IND)),catOf={};rows.forEach(r=>{catOf[r.Produit]=r.Categorie});
  tbSet('atb-prod',`<tr><th>#</th><th>Produit</th><th>Catégorie</th><th class="nr">${lbl}</th></tr>`,
    pg.length===0?emp(4):pg.map(([p,v],i)=>`<tr><td><span class="rk rk-b">${i+1}</span></td><td>${p}</td><td>${pillOf(catOf[p])}</td><td class="nr">${fmt(v,IND)}</td></tr>`).join(''));
  const fgrp=se(grp(rows,'Fournisseur',IND)),cnt={};rows.forEach(r=>{if(!cnt[r.Fournisseur])cnt[r.Fournisseur]=new Set();cnt[r.Fournisseur].add(r.NumCMD)});
  tbSet('atb-four',`<tr><th>#</th><th>Fournisseur</th><th class="nr">Nb CMD</th><th class="nr">${lbl}</th></tr>`,
    fgrp.length===0?emp(4):fgrp.map(([f,v],i)=>`<tr><td><span class="rk rk-b">${i+1}</span></td><td>${pillOf(f)}</td><td class="nr">${cnt[f]?.size||0}</td><td class="nr">${fmt(v,IND)}</td></tr>`).join(''));
  el('as-raw',`${rows.length} ligne(s)`);
  tbSet('atb-raw','<tr><th>N° CMD</th><th>Date</th><th>Fournisseur</th><th>Produit</th><th>Catégorie</th><th>Type</th><th class="nr">Qté</th><th class="nr">HT</th><th class="nr">Taxe</th><th class="nr">TTC</th></tr>',
    rows.length===0?emp(10):rows.map(r=>`<tr><td>${pillOf(r.NumCMD)}</td><td>${r.Date.toLocaleDateString('fr-FR')}</td><td>${pillOf(r.Fournisseur)}</td><td>${r.Produit}</td><td>${pillOf(r.Categorie)}</td><td>${pillOf(r.TypeAchat)}</td><td class="nr">${r.Qte}</td><td class="nr">${r.MontantHT.toLocaleString('fr-DZ')}</td><td class="nr">${r.Taxe.toLocaleString('fr-DZ')}</td><td class="nr">${r.MontantTTC.toLocaleString('fr-DZ')}</td></tr>`).join(''));
}

function update(){const rows=applyF();renderKPIs(rows);renderTags('a-tags',FMAP,TLBL,getF,clearF,'blue');renderCharts(rows);renderTables(rows);}

export function getMeta() { return _meta; }
export function initAchats(data) {
  DATA=data;
  const dates=DATA.map(d=>d.DateCMD).sort();
  s('af-from',dates[0]); s('af-to',dates[dates.length-1]);
  popSel('af-prod',DATA.map(d=>d.Produit)); popSel('af-cat',DATA.map(d=>d.Categorie));
  popSel('af-four',DATA.map(d=>d.Fournisseur)); popSel('af-type',DATA.map(d=>d.TypeAchat));
  popMois('af-mois',DATA.map(d=>d.Mois)); popSel('af-an',DATA.map(d=>d.Annee));
  document.getElementById('a-indic')?.addEventListener('click',e=>{
    const b=e.target.closest('.ib');if(!b)return;
    document.querySelectorAll('#a-indic .ib').forEach(x=>x.classList.remove('on-a'));
    b.classList.add('on-a'); IND=b.dataset.v; update();
  });
  FIDS.forEach(id=>document.getElementById(id)?.addEventListener('change',update));
  document.getElementById('a-reset')?.addEventListener('click',reset);
  update();
}
