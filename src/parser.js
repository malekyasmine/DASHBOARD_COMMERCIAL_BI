// ── CSV Parser ────────────────────────────────────────────────
export function parseCSV(text) {
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

// ── Ventes ───────────────────────────────────────────────────
export function enrichVente(r) {
  const numCMD  = r['Num.CMD']  || r['NumCMD']  || '';
  const dateCMD = r['Date.CMD'] || r['DateCMD'] || '';
  const code    = r['Code Produit'] || r['CodeProduit'] || '';
  return {
    NumCMD:        numCMD,
    DateCMD:       dateCMD,
    Date:          new Date(dateCMD),
    Client:        r['Client']   || '',
    Adresse:       r['Adresse']  || '',
    CodeProd:      code,
    Produit:       r['Produit']  || '',
    Qte:           parseFloat(r['Qte'])           || 0,
    MontantHT:     parseFloat(r['Montant HT']     || r['MontantHT'])  || 0,
    Taxe:          parseFloat(r['Taxe'])           || 0,
    MontantTTC:    parseFloat(r['Montant TTC']    || r['MontantTTC']) || 0,
    Annee:         +dateCMD.slice(0, 4),
    Mois:          +dateCMD.slice(5, 7),
    Categorie:     vCat(code),
    TypeVente:     vType(numCMD),
    FormeJuridique:vFJ(r['Client'] || ''),
    Wilaya:        vWil(r['Adresse'] || ''),
  };
}
function vCat(c) {
  if (c.startsWith('LAP')) return 'Ordinateurs Portables';
  if (c.startsWith('PRI')) return 'Imprimantes';
  if (c.startsWith('INK') || c.startsWith('TON')) return 'Consommables';
  if (c.startsWith('SCA')) return 'Scanners';
  return 'Autres';
}
function vType(n) {
  if (n.includes('SLSD')) return 'SLSD – Directe';
  if (n.includes('SLSR')) return 'SLSR – Revendeur';
  if (n.includes('SLSG')) return 'SLSG – Grossiste';
  return 'Autre';
}
function vFJ(c) {
  if (c.startsWith('SARL')) return 'SARL';
  if (c.startsWith('EURL')) return 'EURL';
  if (c.startsWith('SNC'))  return 'SNC';
  return 'Autre';
}
function vWil(a) {
  const l = a.toLowerCase();
  if (l.includes('alger')) return 'Alger';
  if (l.includes('blida')) return 'Blida';
  if (l.includes('oran'))  return 'Oran';
  if (l.includes('sétif') || l.includes('setif')) return 'Sétif';
  return 'Autre';
}

// ── Achats ───────────────────────────────────────────────────
export function enrichAchat(r) {
  const dateCMD = r['Date_CMD'] || '';
  return {
    NumCMD:      r['Num_CMD']          || '',
    DateCMD:     dateCMD,
    Date:        new Date(dateCMD),
    Fournisseur: r['Fournisseur']      || '',
    CodeProd:    r['Code_Produit']     || '',
    Produit:     r['Produit']          || '',
    Categorie:   r['Categorie_Produit']|| '',
    Qte:         parseFloat(r['Quantite'])   || 0,
    MontantHT:   parseFloat(r['Montant_HT']) || 0,
    Taxe:        parseFloat(r['Taxe'])       || 0,
    MontantTTC:  parseFloat(r['Montant_TTC'])|| 0,
    TypeAchat:   r['Type_Achat'] || '',
    Annee:       +dateCMD.slice(0, 4),
    Mois:        +dateCMD.slice(5, 7),
  };
}

// ── Merged / Marges (colonnes exactes du tableau Excel) ───────
export function enrichMarge(r) {
  return {
    NumCMD:        r['NumCMD']        || '',
    DateCMD:       r['DateCMD']       || '',
    CodeProduit:   r['CodeProduit']   || '',
    Produit:       r['Produit']       || '',
    Categorie:     r['Categorie']     || '',
    Wilaya:        r['Wilaya']        || '',
    Annee:         r['Annee']         || '',
    Mois:          r['Mois']          || '',
    Qte:           parseFloat(r['Qte'])           || 0,
    MontantHT:     parseFloat(r['MontantHT'])      || 0,
    PrixUnitaire:  parseFloat(r['PrixUnitaire'])   || 0,
    TypeOperation: r['TypeOperation'] || '',
    Stock:         parseFloat(r['Stock'])          || 0,
    ValeurStock:   parseFloat(r['ValeurStock'])    || 0,
    CMUP:          parseFloat(r['CMUP'])           || 0,
    MargeUnitaire: parseFloat(r['MargeUnitaire'])  || 0,
    MargeTotal:    parseFloat(r['MargeTotal'])     || 0,
  };
}
