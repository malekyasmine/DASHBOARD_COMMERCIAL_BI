import { mkChart, grp, se, fmt, pillOf, popSel, popMois, renderTags, MN, PAL, h2r, pc } from './utils.js';

let DATA = [];
let IND  = 'MontantTTC';
let _meta = '—';
const ILAB = { MontantTTC:'CA TTC (DA)', MontantHT:'CA HT (DA)', Qte:'Quantité' };

const FIDS = ['vf-from','vf-to','vf-prod','vf-cat','vf-cli','vf-forme','vf-type','vf-wil','vf-mois','vf-an'];
const FMAP = { prod:'vf-prod', cat:'vf-cat', cli:'vf-cli', forme:'vf-forme', type:'vf-type', wil:'vf-wil', mois:'vf-mois', an:'vf-an' };
const TLBL = { prod:'Produit', cat:'Catégorie', cli:'Client', forme:'Forme', type:'Type', wil:'Wilaya', mois:'Mois', an:'Année' };

function getF() { return { from:g('vf-from'), to:g('vf-to'), prod:g('vf-prod'), cat:g('vf-cat'), cli:g('vf-cli'), forme:g('vf-forme'), type:g('vf-type'), wil:g('vf-wil'), mois:g('vf-mois'), an:g('vf-an') }; }
function g(id) { return document.getElementById(id)?.value || ''; }

function applyF() {
  const f = getF();
  return DATA.filter(r => {
    if (f.from  && r.DateCMD < f.from)          return false;
    if (f.to    && r.DateCMD > f.to)             return false;
    if (f.prod  && r.Produit !== f.prod)         return false;
    if (f.cat   && r.Categorie !== f.cat)        return false;
    if (f.cli   && r.Client !== f.cli)           return false;
    if (f.forme && r.FormeJuridique !== f.forme) return false;
    if (f.type  && r.TypeVente !== f.type)       return false;
    if (f.wil   && r.Wilaya !== f.wil)           return false;
    if (f.mois  && r.Mois !== +f.mois)           return false;
    if (f.an    && r.Annee !== +f.an)            return false;
    return true;
  });
}

function clearF(fid) { const el = document.getElementById(fid); if (el) el.value = ''; update(); }

function reset() {
  const dates = DATA.map(d => d.DateCMD).sort();
  s('vf-from', dates[0]); s('vf-to', dates[dates.length-1]);
  Object.values(FMAP).forEach(id => s(id, ''));
  IND = 'MontantTTC';
  document.querySelectorAll('#v-indic .ib').forEach((b,i) => b.classList.toggle('on-v', i===0));
  update();
}
function s(id, val) { const el = document.getElementById(id); if (el) el.value = val; }

function renderKPIs(rows) {
  const ca=rows.reduce((s,r)=>s+r.MontantTTC,0), ht=rows.reduce((s,r)=>s+r.MontantHT,0),
    qte=rows.reduce((s,r)=>s+r.Qte,0), nc=new Set(rows.map(r=>r.NumCMD)).size,
    ncl=new Set(rows.map(r=>r.Client)).size, cg=se(grp(rows,'Categorie','MontantTTC')), bc=cg[0];
  document.getElementById('v-kpi').innerHTML = `
    <div class="kc" style="--kc:#f5a623"><div class="ki">💰</div><div class="kl">CA Total TTC</div><div class="kv">${(ca/1e6).toFixed(2)} M DA</div><div class="ks">${ca.toLocaleString('fr-DZ')} DA</div></div>
    <div class="kc" style="--kc:#3b82f6"><div class="ki">📋</div><div class="kl">CA Total HT</div><div class="kv">${(ht/1e6).toFixed(2)} M DA</div><div class="ks">${ht.toLocaleString('fr-DZ')} DA</div></div>
    <div class="kc" style="--kc:#10b981"><div class="ki">📦</div><div class="kl">Quantités Vendues</div><div class="kv">${qte.toLocaleString('fr-DZ')}</div><div class="ks">unités</div></div>
    <div class="kc" style="--kc:#8b5cf6"><div class="ki">🗂</div><div class="kl">Commandes</div><div class="kv">${nc}</div><div class="ks">bons de vente</div></div>
    <div class="kc" style="--kc:#06b6d4"><div class="ki">👥</div><div class="kl">Clients Actifs</div><div class="kv">${ncl}</div><div class="ks">clients distincts</div></div>
    <div class="kc" style="--kc:#f97316"><div class="ki">🏆</div><div class="kl">Top Catégorie</div><div class="kv" style="font-size:.9rem">${bc?bc[0]:'—'}</div><div class="ks">${bc?((bc[1]/ca*100).toFixed(1)+'% du CA'):''}</div></div>`;
  _meta = `${rows.length}/${DATA.length} lignes`;
}

function renderCharts(rows) {
  const L = ILAB[IND];
  const cg=se(grp(rows,'Categorie',IND)); el('vs-cat',L);
  mkChart('vch-cat','doughnut',cg.map(e=>e[0]),[{data:cg.map(e=>e[1]),backgroundColor:cg.map((_,i)=>pc(i,.82)),borderColor:cg.map((_,i)=>PAL[i%PAL.length]),borderWidth:1,hoverOffset:5}]);
  const wg=se(grp(rows,'Wilaya',IND)); el('vs-wil',L);
  mkChart('vch-wil','bar',wg.map(e=>e[0]),[{label:L,data:wg.map(e=>e[1]),backgroundColor:wg.map((_,i)=>pc(i,.8)),borderRadius:5,borderSkipped:false}]);
  const tg=se(grp(rows,'TypeVente',IND)); el('vs-type',L);
  mkChart('vch-type','pie',tg.map(e=>e[0]),[{data:tg.map(e=>e[1]),backgroundColor:tg.map((_,i)=>pc(i,.85)),borderColor:'#13161e',borderWidth:2}]);
  const pg=se(grp(rows,'Produit',IND)); el('vt-pb',`Classement Produits — ${L}`);
  mkChart('vch-pb','bar',pg.map(e=>e[0]),[{label:L,data:pg.map(e=>e[1]),backgroundColor:pg.map((_,i)=>pc(i,.78)),borderRadius:4,borderSkipped:false}],{indexAxis:'y',plugins:{legend:{display:false}}});
  mkChart('vch-pp','doughnut',pg.map(e=>e[0]),[{data:pg.map(e=>e[1]),backgroundColor:pg.map((_,i)=>pc(i,.83)),borderColor:pg.map((_,i)=>PAL[i%PAL.length]),borderWidth:1}]);
  const fg=se(grp(rows,'FormeJuridique',IND));
  mkChart('vch-fj','bar',fg.map(e=>e[0]),[{label:L,data:fg.map(e=>e[1]),backgroundColor:fg.map((_,i)=>pc(i,.8)),borderRadius:6,borderSkipped:false}]);
  const clg=se(grp(rows,'Client',IND));
  mkChart('vch-cli','bar',clg.map(e=>e[0]),[{label:L,data:clg.map(e=>e[1]),backgroundColor:clg.map((_,i)=>pc(i,.8)),borderRadius:4,borderSkipped:false}],{indexAxis:'y',plugins:{legend:{display:false}}});
  const mm={}; rows.forEach(r=>{const k=`${r.Annee}-${String(r.Mois).padStart(2,'0')}`;if(!mm[k])mm[k]={lbl:r.Date.toLocaleDateString('fr-FR',{month:'short',year:'2-digit'}),v:0};mm[k].v+=r[IND]});
  const ms=Object.entries(mm).sort((a,b)=>a[0].localeCompare(b[0]));
  mkChart('vch-trend','line',ms.map(e=>e[1].lbl),[{label:L,data:ms.map(e=>e[1].v),borderColor:PAL[0],backgroundColor:h2r(PAL[0],.07),fill:true,tension:.42,pointBackgroundColor:PAL[0],pointRadius:5,pointHoverRadius:7,borderWidth:2.5}]);
}

function el(id, txt) { const e = document.getElementById(id); if (e) e.textContent = txt; }

function renderTables(rows) {
  const lbl = {MontantTTC:'CA TTC',MontantHT:'CA HT',Qte:'Quantité'}[IND];
  const pg=se(grp(rows,'Produit',IND)), catOf={};rows.forEach(r=>{catOf[r.Produit]=r.Categorie});
  tbSet('vtb-prod',`<tr><th>#</th><th>Produit</th><th>Catégorie</th><th class="nr">${lbl}</th></tr>`,
    pg.length===0?emp(4):pg.map(([p,v],i)=>`<tr><td><span class="rk">${i+1}</span></td><td>${p}</td><td>${pillOf(catOf[p])}</td><td class="nr">${fmt(v,IND)}</td></tr>`).join(''));
  const cg=se(grp(rows,'Client',IND)),inf={};rows.forEach(r=>{inf[r.Client]={fj:r.FormeJuridique,wil:r.Wilaya}});
  tbSet('vtb-cli',`<tr><th>#</th><th>Client</th><th>Forme</th><th>Wilaya</th><th class="nr">${lbl}</th></tr>`,
    cg.length===0?emp(5):cg.map(([c,v],i)=>`<tr><td><span class="rk">${i+1}</span></td><td>${pillOf(c)}</td><td>${pillOf(inf[c]?.fj)}</td><td>${inf[c]?.wil}</td><td class="nr">${fmt(v,IND)}</td></tr>`).join(''));
  el('vs-raw',`${rows.length} ligne(s)`);
  tbSet('vtb-raw','<tr><th>N° CMD</th><th>Date</th><th>Client</th><th>Wilaya</th><th>Produit</th><th>Catégorie</th><th>Type</th><th class="nr">Qté</th><th class="nr">HT</th><th class="nr">Taxe</th><th class="nr">TTC</th></tr>',
    rows.length===0?emp(11):rows.map(r=>`<tr><td>${pillOf(r.NumCMD)}</td><td>${r.Date.toLocaleDateString('fr-FR')}</td><td>${pillOf(r.Client)}</td><td>${r.Wilaya}</td><td>${r.Produit}</td><td>${r.Categorie}</td><td>${pillOf(r.TypeVente)}</td><td class="nr">${r.Qte}</td><td class="nr">${r.MontantHT.toLocaleString('fr-DZ')}</td><td class="nr">${r.Taxe.toLocaleString('fr-DZ')}</td><td class="nr">${r.MontantTTC.toLocaleString('fr-DZ')}</td></tr>`).join(''));
}

function tbSet(id, th, tb) { const t=document.getElementById(id); if(!t)return; t.querySelector('thead').innerHTML=th; t.querySelector('tbody').innerHTML=tb; }
function emp(n) { return `<tr><td colspan="${n}" class="empty">Aucune donnée</td></tr>`; }

function update() { const rows=applyF(); renderKPIs(rows); renderTags('v-tags',FMAP,TLBL,getF,clearF); renderCharts(rows); renderTables(rows); }

export function getMeta() { return _meta; }
export function initVentes(data) {
  DATA = data;
  const dates = DATA.map(d=>d.DateCMD).sort();
  s('vf-from',dates[0]); s('vf-to',dates[dates.length-1]);
  popSel('vf-prod',DATA.map(d=>d.Produit)); popSel('vf-cat',DATA.map(d=>d.Categorie));
  popSel('vf-cli',DATA.map(d=>d.Client)); popSel('vf-forme',DATA.map(d=>d.FormeJuridique));
  popSel('vf-type',DATA.map(d=>d.TypeVente)); popSel('vf-wil',DATA.map(d=>d.Wilaya));
  popMois('vf-mois',DATA.map(d=>d.Mois)); popSel('vf-an',DATA.map(d=>d.Annee));
  document.getElementById('v-indic')?.addEventListener('click',e=>{
    const b=e.target.closest('.ib');if(!b)return;
    document.querySelectorAll('#v-indic .ib').forEach(x=>x.classList.remove('on-v'));
    b.classList.add('on-v'); IND=b.dataset.v; update();
  });
  FIDS.forEach(id=>document.getElementById(id)?.addEventListener('change',update));
  document.getElementById('v-reset')?.addEventListener('click',reset);
  update();
}
