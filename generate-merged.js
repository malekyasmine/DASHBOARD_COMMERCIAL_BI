#!/usr/bin/env node
/**
 * generate-merged.js
 * 
 * Reproduit exactement le tableau Excel PART3MARGE.xlsx
 * Méthode : CMUP (Coût Moyen Unitaire Pondéré)
 * 
 * Structure de sortie identique au tableau Excel :
 * NumCMD | DateCMD | CodeProduit | Produit | Categorie | Wilaya | Annee | Mois |
 * Qte | MontantHT | PrixUnitaire | TypeOperation | Stock | ValeurStock | CMUP |
 * MargeUnitaire | MargeTotal
 *
 * Règles de calcul :
 *  - Regrouper par CodeProduit, trier par date (ACHAT avant VENTE à même date)
 *  - ACHAT  : Stock += Qte ; ValeurStock += MontantHT ; CMUP = ValeurStock/Stock ; Marge = 0
 *  - VENTE  : MargeUnitaire = PrixUnitaire_vente - CMUP_courant
 *             MargeTotal    = MargeUnitaire × Qte
 *             Stock        -= Qte ; ValeurStock = Stock × CMUP
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, 'public');

// ── CSV parser (gère guillemets) ─────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = splitLine(lines[0]);
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = splitLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h.trim()] = (vals[i] ?? '').trim(); });
    return row;
  });
}
function splitLine(line) {
  const res = []; let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { res.push(cur); cur = ''; }
    else { cur += ch; }
  }
  res.push(cur);
  return res;
}

// ── Helpers ───────────────────────────────────────────────────
function normCode(c) {
  // PRL → PRI pour matcher ventes ↔ achats
  return (c || '').replace(/^PRL/, 'PRI');
}
function getWilaya(adresse) {
  const a = (adresse || '').toLowerCase();
  if (a.includes('alger'))  return 'Alger';
  if (a.includes('blida'))  return 'Blida';
  if (a.includes('oran'))   return 'Oran';
  if (a.includes('sétif') || a.includes('setif')) return 'Setif';
  return '';
}

// ── Load ──────────────────────────────────────────────────────
const ventesRaw = parseCSV(readFileSync(resolve(PUBLIC, 'vente.csv'), 'utf8'));
const achatsRaw = parseCSV(readFileSync(resolve(PUBLIC, 'achat.csv'), 'utf8'));

// ── Build unified operation list ─────────────────────────────
const ops = [];

achatsRaw.forEach(r => {
  const code = normCode(r['Code_Produit']);
  const qte  = parseFloat(r['Quantite'])   || 0;
  const ht   = parseFloat(r['Montant_HT']) || 0;
  ops.push({
    NumCMD:        r['Num_CMD'] || '',
    DateCMD:       r['Date_CMD'] || '',
    CodeProduit:   code,
    Produit:       r['Produit'] || '',
    Categorie:     r['Categorie_Produit'] || '',
    Wilaya:        '',
    Annee:         (r['Date_CMD'] || '').slice(0, 4),
    Mois:          (r['Date_CMD'] || '').slice(5, 7),
    Qte:           qte,
    MontantHT:     ht,
    PrixUnitaire:  qte > 0 ? ht / qte : 0,
    TypeOperation: 'ACHAT',
  });
});

ventesRaw.forEach(r => {
  const code   = normCode(r['Code Produit'] || r['CodeProduit'] || '');
  const date   = r['Date.CMD'] || r['DateCMD'] || '';
  const qte    = parseFloat(r['Qte']) || 0;
  const ht     = parseFloat(r['Montant HT'] || r['MontantHT']) || 0;
  ops.push({
    NumCMD:        r['Num.CMD'] || r['NumCMD'] || '',
    DateCMD:       date,
    CodeProduit:   code,
    Produit:       r['Produit'] || '',
    Categorie:     r['Categorie'] || '',   // sera rempli depuis achats si vide
    Wilaya:        getWilaya(r['Adresse'] || ''),
    Annee:         date.slice(0, 4),
    Mois:          date.slice(5, 7),
    Qte:           qte,
    MontantHT:     ht,
    PrixUnitaire:  qte > 0 ? ht / qte : 0,
    TypeOperation: 'VENTE',
  });
});

// Référentiel catégories depuis achats (pour compléter les ventes)
const catRef = {};
achatsRaw.forEach(r => {
  const code = normCode(r['Code_Produit']);
  catRef[code] = r['Categorie_Produit'] || '';
});
ops.forEach(op => {
  if (!op.Categorie && catRef[op.CodeProduit]) {
    op.Categorie = catRef[op.CodeProduit];
  }
});

// ── Sort : par CodeProduit, puis par date, ACHAT avant VENTE à même date ──
ops.sort((a, b) => {
  if (a.CodeProduit < b.CodeProduit) return -1;
  if (a.CodeProduit > b.CodeProduit) return  1;
  if (a.DateCMD < b.DateCMD) return -1;
  if (a.DateCMD > b.DateCMD) return  1;
  // même date → ACHAT avant VENTE
  if (a.TypeOperation === 'ACHAT' && b.TypeOperation === 'VENTE') return -1;
  if (a.TypeOperation === 'VENTE' && b.TypeOperation === 'ACHAT') return  1;
  return 0;
});

// ── Calcul CMUP ligne par ligne ───────────────────────────────
const stock = {};  // CodeProduit → { qte, valeur, cmup }

const result = ops.map(op => {
  const c = op.CodeProduit;
  if (!stock[c]) stock[c] = { qte: 0, valeur: 0, cmup: 0 };
  const s = stock[c];

  let margeUnitaire = 0;
  let margeTotal    = 0;

  if (op.TypeOperation === 'ACHAT') {
    // Entrée → recalcul CMUP
    s.qte    += op.Qte;
    s.valeur += op.MontantHT;
    s.cmup    = s.qte > 0 ? s.valeur / s.qte : 0;
    // Marge = 0 sur les achats
  } else {
    // VENTE → marge calculée sur CMUP courant AVANT sortie
    margeUnitaire = op.PrixUnitaire - s.cmup;
    margeTotal    = margeUnitaire * op.Qte;
    // Sortie de stock
    s.qte    -= op.Qte;
    s.valeur  = s.qte > 0 ? s.qte * s.cmup : 0;
  }

  return {
    NumCMD:        op.NumCMD,
    DateCMD:       op.DateCMD,
    CodeProduit:   op.CodeProduit,
    Produit:       op.Produit,
    Categorie:     op.Categorie,
    Wilaya:        op.Wilaya,
    Annee:         op.Annee,
    Mois:          op.Mois,
    Qte:           op.Qte,
    MontantHT:     op.MontantHT,
    PrixUnitaire:  op.PrixUnitaire,
    TypeOperation: op.TypeOperation,
    Stock:         s.qte,
    ValeurStock:   s.valeur,
    CMUP:          s.cmup,
    MargeUnitaire: margeUnitaire,
    MargeTotal:    margeTotal,
  };
});

// ── CSV output ────────────────────────────────────────────────
function toCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = v => {
    const s = v === null || v === undefined ? '' : String(v);
    return s.includes(',') ? `"${s}"` : s;
  };
  return [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
}

const outPath = resolve(PUBLIC, 'merged_data.csv');
writeFileSync(outPath, toCSV(result), 'utf8');

// ── Console summary ───────────────────────────────────────────
const ventes = result.filter(r => r.TypeOperation === 'VENTE');
const margeTotal = ventes.reduce((s, r) => s + r.MargeTotal, 0);

console.log(`✅  merged_data.csv — ${result.length} lignes`);
console.log(`    Achats : ${result.filter(r => r.TypeOperation === 'ACHAT').length} | Ventes : ${ventes.length}`);
console.log(`💹  Marge totale HT : ${margeTotal.toLocaleString('fr-FR')} DA\n`);
console.log('CodeProduit       | NumCMD       | Type  | Qte  | PrixU    | CMUP       | MargeU     | MargeTotal');
console.log('-'.repeat(100));
result.forEach(r => {
  const f = v => String(Math.round(v)).padStart(10);
  console.log(
    `${r.CodeProduit.padEnd(17)} | ${r.NumCMD.padEnd(12)} | ${r.TypeOperation.padEnd(5)} | ` +
    `${String(r.Qte).padStart(4)} | ${f(r.PrixUnitaire)} | ${f(r.CMUP)} | ${f(r.MargeUnitaire)} | ${f(r.MargeTotal)}`
  );
});
