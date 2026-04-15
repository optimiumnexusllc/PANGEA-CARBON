
const PDFDocument = require('pdfkit');

// ─── Standards GHG Audit ──────────────────────────────────────────────────────
const AUDIT_STANDARDS = {
  GHG_PROTOCOL: {
    name: 'GHG Protocol Corporate Standard',
    edition: 'WRI/WBCSD — 2025 Edition',
    color: '#2563EB', creditType: 'GHG Statement',
    bodyEn: 'This audit has been conducted in accordance with the GHG Protocol Corporate Accounting and Reporting Standard (WRI/WBCSD, Revised Edition). All emission sources across Scope 1 (direct), Scope 2 (indirect electricity) and Scope 3 (value chain) have been inventoried using IPCC AR6 Global Warming Potentials (100-year) and IEA 2024 grid emission factors.',
    bodyFr: "Cet audit a été réalisé conformément au GHG Protocol Corporate Accounting and Reporting Standard (WRI/WBCSD, édition révisée). Toutes les sources d'émission couvrant le Scope 1 (directes), le Scope 2 (électricité indirecte) et le Scope 3 (chaîne de valeur) ont été inventoriées avec les potentiels de réchauffement global IPCC AR6 (100 ans) et les facteurs d'émission réseau IEA 2024.",
  },
  ISO_14064: {
    name: 'ISO 14064-1:2018',
    edition: 'Specification for quantification and reporting of GHG emissions',
    color: '#7C3AED', creditType: 'ISO Certificate',
    bodyEn: 'This greenhouse gas inventory report has been prepared in conformance with ISO 14064-1:2018 (Specification with guidance at the organization level for quantification and reporting of greenhouse gas emissions and removals). The inventory boundary follows the control approach. Emission data quality is Level 3 (metered data) where available.',
    bodyFr: "Ce rapport d'inventaire des gaz à effet de serre a été préparé en conformité avec la norme ISO 14064-1:2018 (Spécification et lignes directrices, au niveau des organismes, pour la quantification et la déclaration des émissions et suppressions des GES). Le périmètre d'inventaire suit l'approche du contrôle. La qualité des données est de niveau 3 (données mesurées) lorsque disponible.",
  },
  BILAN_CARBONE: {
    name: 'Bilan Carbone® v8',
    edition: 'ADEME — Association Bilan Carbone',
    color: '#059669', creditType: 'Bilan Carbone',
    bodyEn: "This carbon footprint has been conducted using the Bilan Carbone® methodology (version 8), developed by ADEME (Agence de la transition écologique). The methodology covers all significant GHG emission sources and provides a comprehensive organizational inventory aligned with French regulatory requirements (Décret Grenelle 2, Article 75).",
    bodyFr: "Ce bilan carbone a été réalisé selon la méthode Bilan Carbone® (version 8), développée par l'ADEME (Agence de la transition écologique). La méthode couvre toutes les sources significatives d'émissions de GES et fournit un inventaire organisationnel complet, aligné avec les exigences réglementaires françaises (Décret Grenelle 2, Article 75).",
  },
  CSRD_ESRS: {
    name: 'CSRD / ESRS E1',
    edition: 'EU Corporate Sustainability Reporting Directive — EFRAG 2024',
    color: '#0369A1', creditType: 'ESRS Disclosure',
    bodyEn: 'This climate disclosure has been prepared in accordance with the European Sustainability Reporting Standards (ESRS E1 — Climate Change), as required by the Corporate Sustainability Reporting Directive (EU 2022/2464). The disclosure covers GHG emissions (Scope 1, 2, 3), climate-related risks and opportunities, and transition plan elements per EFRAG guidance (January 2024).',
    bodyFr: "Cette déclaration climatique a été préparée conformément aux Normes Européennes de Reporting de Durabilité (ESRS E1 — Changement Climatique), telles qu'exigées par la Directive sur la Publication d'Informations en Matière de Durabilité des Entreprises (UE 2022/2464). La déclaration couvre les émissions de GES (Scope 1, 2, 3), les risques et opportunités liés au climat, et les éléments du plan de transition selon les directives EFRAG (janvier 2024).",
  },
  TCFD: {
    name: 'TCFD Framework',
    edition: 'Task Force on Climate-related Financial Disclosures — 2024',
    color: '#B45309', creditType: 'TCFD Report',
    bodyEn: 'This report has been prepared following the recommendations of the Task Force on Climate-related Financial Disclosures (TCFD). It addresses the four core elements: Governance (board oversight of climate risks), Strategy (climate scenario analysis), Risk Management (identification and assessment), and Metrics & Targets (GHG inventory and reduction targets).',
    bodyFr: "Ce rapport a été préparé conformément aux recommandations du Groupe de Travail sur les Divulgations Financières liées au Climat (TCFD). Il aborde les quatre éléments fondamentaux : Gouvernance (supervision du conseil en matière de risques climatiques), Stratégie (analyse de scénarios climatiques), Gestion des risques (identification et évaluation), Mesures et cibles (inventaire GES et objectifs de réduction).",
  },
  SBTi: {
    name: "Science Based Targets initiative (SBTi)",
    edition: 'Corporate Net-Zero Standard v1.2 — 2024',
    color: '#065F46', creditType: 'SBTi Alignment',
    bodyEn: "This GHG inventory has been prepared to support Science Based Target setting in accordance with the SBTi Corporate Net-Zero Standard (version 1.2). Near-term targets (2030) and long-term net-zero targets are assessed against 1.5°C-aligned pathways. The Scope 3 inventory covers all relevant categories per SBTi's completeness requirement (>40% of Scope 3).",
    bodyFr: "Cet inventaire GES a été préparé pour soutenir la définition d'objectifs scientifiques conformément au Standard Net Zéro Entreprises SBTi (version 1.2). Les objectifs à court terme (2030) et les objectifs net zéro à long terme sont évalués par rapport aux trajectoires alignées sur 1,5°C. L'inventaire Scope 3 couvre toutes les catégories pertinentes conformément à l'exigence de complétude SBTi (>40% du Scope 3).",
  },
  CDP: {
    name: 'CDP Climate Disclosure',
    edition: 'CDP — Carbon Disclosure Project 2024',
    color: '#6B21A8', creditType: 'CDP Submission',
    bodyEn: 'This climate questionnaire data has been organized following the CDP (Carbon Disclosure Project) Climate Change questionnaire format (2024). CDP is the global non-profit that runs the world leading environmental disclosure system. This report covers: GHG inventory (C6-C10), targets (C4), governance (C1-C2), risks and opportunities (C2), and strategy (C3).',
    bodyFr: "Les données de ce questionnaire climatique ont été organisées conformément au format du questionnaire CDP (Carbon Disclosure Project) sur le changement climatique (2024). CDP est l'organisation mondiale à but non lucratif qui gère le premier système de divulgation environnementale mondial. Ce rapport couvre : l'inventaire GES (C6-C10), les objectifs (C4), la gouvernance (C1-C2), les risques et opportunités (C2), et la stratégie (C3).",
  },
  SEC_CLIMATE: {
    name: 'SEC Climate Disclosure Rule',
    edition: 'U.S. Securities and Exchange Commission — Rule 33-11275 (2024)',
    color: '#B91C1C', creditType: 'SEC Filing',
    bodyEn: "This climate-related disclosure has been prepared in accordance with the SEC's Final Rules on Climate-Related Disclosures (Release No. 33-11275), effective January 2025. It includes material climate-related risks, governance, strategy, and GHG metrics. Scope 1 and Scope 2 emissions are presented with attestation consistent with Rule 14a-16.",
    bodyFr: "Cette divulgation liée au climat a été préparée conformément aux Règles Finales de la SEC sur les Divulgations liées au Climat (Communiqué n° 33-11275), effectives janvier 2025. Elle comprend les risques climatiques significatifs, la gouvernance, la stratégie et les métriques GES. Les émissions Scope 1 et Scope 2 sont présentées avec une attestation conforme à la Règle 14a-16.",
  },
  VCMI_CCP: {
    name: 'VCMI Claims Code of Practice',
    edition: 'Voluntary Carbon Markets Integrity Initiative — 2024',
    color: '#0E7490', creditType: 'VCMI Claim',
    bodyEn: 'This GHG audit supports a VCMI Claim under the Voluntary Carbon Markets Integrity Initiative (VCMI) Claims Code of Practice (2024). The entity has completed a robust organizational GHG inventory (Scope 1, 2, 3), set a credible near-term emission reduction target, and is eligible to make VCMI Silver, Gold, or Platinum claims based on verified offset purchases from high-quality carbon markets.',
    bodyFr: "Cet audit GES soutient une réclamation VCMI selon le Code de Pratique des Réclamations de l'Initiative pour l'Intégrité des Marchés Volontaires du Carbone (VCMI, 2024). L'entité a réalisé un inventaire GES organisationnel robuste (Scope 1, 2, 3), fixé un objectif crédible de réduction à court terme, et est éligible aux réclamations VCMI Silver, Gold ou Platinum basées sur des achats de compensations vérifiés.",
  },
};

const LABELS = {
  en: {
    title: 'CORPORATE GHG AUDIT REPORT',
    subtitle: 'Greenhouse Gas Emissions Inventory',
    company: 'Company', framework: 'Framework', reportingYear: 'Reporting Year',
    netZeroTarget: 'Net Zero Target', reportDate: 'Report Date',
    reportId: 'Report ID', preparedBy: 'Prepared by', verifiedBy: 'To be verified by',
    vvbPlaceholder: 'Accredited third-party verifier\nTo be completed',
    keyResults: 'KEY RESULTS',
    totalEmissions: 'Total GHG Emissions',
    scope1Total: 'Scope 1 — Direct Emissions',
    scope2Total: 'Scope 2 — Indirect (Electricity)',
    scope3Total: 'Scope 3 — Value Chain',
    offsetRequired: 'Carbon Credits Required for Net-Zero',
    methodology: 'METHODOLOGY',
    emissionSources: 'EMISSION SOURCES DETAIL',
    source: 'Source', quantity: 'Quantity', unit: 'Unit', ef: 'EF (tCO₂e)',
    co2e: 'tCO₂e', scope: 'Scope', category: 'Category',
    financials: 'CARBON OFFSET STRATEGY',
    verraVCU: 'Verra VCU African Credits',
    goldGSCER: 'Gold Standard GSCER',
    totalCost: 'TOTAL OFFSET COST',
    declaration: 'DECLARATION OF CONFORMITY',
    footer: 'This report has been automatically generated by the PANGEA CARBON platform.',
    footerSub: 'It must be verified by an accredited third-party auditor for official compliance purposes.',
    noEntries: 'No emission entries recorded in this audit.',
    status: 'Status',
  },
  fr: {
    title: "RAPPORT D'AUDIT GES CORPORATE",
    subtitle: "Inventaire des Émissions de Gaz à Effet de Serre",
    company: 'Entreprise', framework: 'Référentiel', reportingYear: "Année de référence",
    netZeroTarget: 'Objectif Net Zéro', reportDate: 'Date du rapport',
    reportId: 'Référence rapport', preparedBy: 'Préparé par', verifiedBy: 'À vérifier par',
    vvbPlaceholder: "Auditeur tiers accrédité\nÀ compléter",
    keyResults: 'RÉSULTATS CLÉS',
    totalEmissions: 'Émissions GES Totales',
    scope1Total: 'Scope 1 — Émissions directes',
    scope2Total: "Scope 2 — Indirectes (Électricité)",
    scope3Total: 'Scope 3 — Chaîne de valeur',
    offsetRequired: 'Crédits Carbone Requis pour le Net Zéro',
    methodology: 'MÉTHODOLOGIE',
    emissionSources: "DÉTAIL DES SOURCES D'ÉMISSION",
    source: 'Source', quantity: 'Quantité', unit: 'Unité', ef: 'FE (tCO₂e)',
    co2e: 'tCO₂e', scope: 'Scope', category: 'Catégorie',
    financials: 'STRATÉGIE DE COMPENSATION CARBONE',
    verraVCU: 'Crédits Africains Verra VCU',
    goldGSCER: 'Gold Standard GSCER',
    totalCost: 'COÛT TOTAL COMPENSATION',
    declaration: 'DÉCLARATION DE CONFORMITÉ',
    footer: 'Ce rapport a été généré automatiquement par la plateforme PANGEA CARBON.',
    footerSub: "Il doit être vérifié par un auditeur tiers accrédité à des fins de conformité officielle.",
    noEntries: "Aucune entrée d'émission enregistrée dans cet audit.",
    status: 'Statut',
  },
};

const SCOPE_LABEL = { 1:'Scope 1', 2:'Scope 2', 3:'Scope 3' };
const fmtN = (n, locale) => (n||0).toLocaleString(locale==='fr'?'fr-FR':'en-US', { minimumFractionDigits:3, maximumFractionDigits:3 });
const fmtNR = (n, locale) => (n||0).toLocaleString(locale==='fr'?'fr-FR':'en-US', { maximumFractionDigits:0 });

async function generateAuditReport(audit, lang, standardId) {
  return new Promise((resolve, reject) => {
    const T = LABELS[lang] || LABELS.en;
    const STD = AUDIT_STANDARDS[standardId] || AUDIT_STANDARDS.GHG_PROTOCOL;
    const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
    const now = new Date();
    const dateFmt = now.toLocaleDateString(locale, { year:'numeric', month:'long', day:'numeric' });
    const reportId = 'PGC-GHG-' + standardId.slice(0,3) + '-' + (audit.reportingYear||now.getFullYear()) + '-' + Date.now().toString(36).toUpperCase();

    const accC = STD.color;
    const C = {
      dark: '#1A1A2E', card: '#121920', white: '#FFFFFF',
      acc: accC, gray: '#6B7280', lightGray: '#F3F4F6', border: '#E5E7EB',
      s1: '#DC2626', s2: '#D97706', s3: '#2563EB', green: '#059669',
    };

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const fmt = (n) => fmtN(n, lang);
    const fmtR = (n) => fmtNR(n, lang);

    // ── PAGE 1: COVER ─────────────────────────────────────────────────────────
    doc.rect(0, 0, 595, 210).fill(C.dark);
    doc.rect(0, 210, 595, 3).fill(C.acc);

    // Logo
    doc.font('Helvetica-Bold').fontSize(26).fillColor(C.white).text('PANGEA CARBON', 50, 52);
    doc.font('Helvetica').fontSize(10).fillColor('#9CA3AF').text('Carbon Intelligence Platform · Africa', 50, 84);

    // Standard badge
    doc.rect(390, 48, 155, 26).fill(C.acc);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white).text(standardId.replace(/_/g,' '), 398, 54);
    doc.font('Helvetica').fontSize(7).fillColor(C.white).text(lang.toUpperCase()+' VERSION', 398, 65);

    // Report ID
    doc.rect(390, 80, 155, 18).fill('#0D1117');
    doc.font('Helvetica-Bold').fontSize(7).fillColor(C.acc).text(reportId, 398, 86);

    // Title
    doc.font('Helvetica-Bold').fontSize(20).fillColor(C.white).text(T.title, 50, 128);
    doc.font('Helvetica').fontSize(11).fillColor('#9CA3AF').text(STD.name+' · '+STD.edition, 50, 155);

    // Project info block
    doc.rect(50, 226, 495, 120).fill(C.lightGray).stroke(C.border);
    doc.font('Helvetica-Bold').fontSize(14).fillColor(C.dark).text(audit.name||'Corporate GHG Audit', 65, 240);
    doc.font('Helvetica').fontSize(10).fillColor(C.gray).text(T.framework+': '+STD.name+' · '+T.reportingYear+': '+(audit.reportingYear||now.getFullYear()), 65, 260);

    const meta = [
      [T.status, (audit.status||'IN_PROGRESS')],
      [T.reportDate, dateFmt],
      [T.reportId, reportId],
      [T.netZeroTarget, audit.netZeroTarget||'—'],
    ];
    meta.forEach(([k,v],i) => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.gray).text(k, 65, 283+i*13);
      doc.font('Helvetica').fontSize(9).fillColor(C.dark).text(String(v), 250, 283+i*13);
    });

    // Key results
    const kY = 360;
    doc.rect(50, kY, 495, 2).fill(C.acc);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.dark).text(T.keyResults, 50, kY+10);

    const entries = audit.entries || [];
    const s1 = entries.filter(e=>e.scope===1).reduce((s,e)=>s+e.co2e,0);
    const s2 = entries.filter(e=>e.scope===2).reduce((s,e)=>s+e.co2e,0);
    const s3 = entries.filter(e=>e.scope===3).reduce((s,e)=>s+e.co2e,0);
    const total = s1+s2+s3;

    const kpis = [
      [T.totalEmissions, fmt(total)+' tCO₂e', C.dark, true],
      [T.scope1Total, fmt(s1)+' tCO₂e', C.s1, false],
      [T.scope2Total, fmt(s2)+' tCO₂e', C.s2, false],
      [T.scope3Total, fmt(s3)+' tCO₂e', C.s3, false],
      [T.offsetRequired, fmtR(Math.ceil(total))+' credits', C.green, true],
    ];

    let kR = kY+30;
    kpis.forEach(([label,val,col,bold]) => {
      const bg = bold ? (col===C.dark?'#EEF2FF':'#F0FDF4') : (kR%2===0?C.lightGray:C.white);
      doc.rect(50, kR, 495, bold?24:18).fill(bg).stroke(C.border);
      doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(bold?10:9).fillColor(C.dark).text(label, 60, kR+(bold?7:5));
      doc.font('Helvetica-Bold').fontSize(bold?11:9).fillColor(col).text(val, 400, kR+(bold?7:5), {align:'right',width:135});
      kR += bold?24:18;
    });

    // Methodology box
    kR += 16;
    doc.rect(50, kR, 495, 2).fill(C.acc);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(C.dark).text(T.methodology, 50, kR+10);
    kR += 30;
    const mBody = lang==='fr' ? STD.bodyFr : STD.bodyEn;
    doc.font('Helvetica').fontSize(9).fillColor(C.gray).text(mBody, 50, kR, {width:495, align:'justify'});

    // ── PAGE 2: EMISSION SOURCES ───────────────────────────────────────────────
    doc.addPage();
    doc.rect(0,0,595,40).fill(C.dark);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.white).text('PANGEA CARBON · '+T.emissionSources, 50, 14);
    doc.font('Helvetica').fontSize(8).fillColor('#9CA3AF').text(reportId, 420, 22);

    doc.rect(50,55,495,2).fill(C.acc);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.dark).text(T.emissionSources, 50, 67);

    const colX = [60, 100, 220, 290, 340, 400, 500];
    const tY = 90;
    const headers = [T.scope, T.source, T.quantity, T.unit, T.ef, T.co2e, ''];
    doc.rect(50, tY, 495, 18).fill(C.dark);
    headers.forEach((h,i) => {
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.white).text(h, colX[i], tY+5, {width:colX[i+1]?(colX[i+1]-colX[i]-4):50, lineBreak:false});
    });

    let tableY = tY+18;
    if (entries.length===0) {
      doc.rect(50,tableY,495,30).fill(C.lightGray).stroke(C.border);
      doc.font('Helvetica').fontSize(10).fillColor(C.gray).text(T.noEntries, 60, tableY+10);
      tableY += 30;
    } else {
      const sorted = [...entries].sort((a,b)=>b.co2e-a.co2e);
      sorted.forEach((e,i) => {
        if (tableY > 760) {
          doc.addPage();
          doc.rect(0,0,595,40).fill(C.dark);
          doc.font('Helvetica-Bold').fontSize(10).fillColor(C.white).text('PANGEA CARBON · '+T.emissionSources+' ('+L('suite','suite')+')', 50, 14);
          tableY = 55;
        }
        const bg = i%2===0?C.white:C.lightGray;
        const rowH = 16;
        doc.rect(50,tableY,495,rowH).fill(bg).stroke(C.border);
        const sCol = e.scope===1?C.s1:e.scope===2?C.s2:C.s3;
        doc.font('Helvetica-Bold').fontSize(8).fillColor(sCol).text('S'+e.scope, colX[0], tableY+4, {width:35, lineBreak:false});
        doc.font('Helvetica').fontSize(7.5).fillColor(C.dark).text((e.description||'').slice(0,28), colX[1], tableY+4, {width:115, lineBreak:false});
        doc.font('Helvetica').fontSize(7.5).fillColor(C.gray).text((e.quantity||0).toLocaleString(locale), colX[2], tableY+4, {width:65, lineBreak:false});
        doc.font('Helvetica').fontSize(7.5).fillColor(C.gray).text(e.unit||'', colX[3], tableY+4, {width:45, lineBreak:false});
        doc.font('Helvetica').fontSize(7.5).fillColor(C.gray).text(String(e.emissionFactor||''), colX[4], tableY+4, {width:55, lineBreak:false});
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.s1).text(fmt(e.co2e), colX[5], tableY+4, {width:95, lineBreak:false, align:'right'});
        tableY += rowH;
      });
    }

    // Totals row
    doc.rect(50,tableY,495,22).fill('#EEF2FF').stroke(C.border);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.dark).text('TOTAL SCOPE 1+2+3', 60, tableY+6);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.s1).text(fmt(total)+' tCO₂e', 400, tableY+6, {align:'right', width:135});

    // ── PAGE 3: FINANCIALS + DECLARATION ─────────────────────────────────────
    doc.addPage();
    doc.rect(0,0,595,40).fill(C.dark);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.white).text('PANGEA CARBON · '+T.financials, 50, 14);
    doc.font('Helvetica').fontSize(8).fillColor('#9CA3AF').text(reportId, 420, 22);

    // Offset strategy
    doc.rect(50,55,495,2).fill(C.acc);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.dark).text(T.financials, 50, 67);

    const vcuPrice = 11.04;
    const gsPrice = 18.50;
    const vcuQty = Math.ceil(total*0.5);
    const gsQty = Math.ceil(total*0.5);
    const vcuCost = vcuQty*vcuPrice;
    const gsCost = gsQty*gsPrice;

    const finRows = [
      [T.totalEmissions, fmt(total)+' tCO₂e', ''],
      [T.verraVCU+' (50%)', fmtR(vcuQty)+' credits @ $'+vcuPrice+'/t', '$'+fmtR(vcuCost)],
      [T.goldGSCER+' (50%)', fmtR(gsQty)+' credits @ $'+gsPrice+'/t', '$'+fmtR(gsCost)],
      [T.totalCost, '', '$'+fmtR(vcuCost+gsCost)],
    ];

    let fY = 90;
    finRows.forEach(([k,v,cost],i) => {
      const isTot = i===finRows.length-1;
      doc.rect(50,fY,495,isTot?26:20).fill(isTot?'#F0FDF4':i%2===0?C.lightGray:C.white).stroke(C.border);
      doc.font(isTot?'Helvetica-Bold':'Helvetica').fontSize(isTot?10:9).fillColor(C.dark).text(k, 60, fY+(isTot?8:6));
      if(v) doc.font('Helvetica').fontSize(9).fillColor(C.gray).text(v, 200, fY+(isTot?8:6));
      if(cost) doc.font('Helvetica-Bold').fontSize(isTot?11:9).fillColor(C.green).text(cost, 400, fY+(isTot?8:6), {align:'right',width:135});
      fY += isTot?26:20;
    });

    // African opportunity note
    fY += 16;
    doc.rect(50,fY,495,50).fill('#F0FDF4').stroke('#86EFAC');
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#065F46').text(lang==='fr'?"🌍 Opportunité Carbone Africaine":"🌍 African Carbon Opportunity", 60, fY+8);
    const noteText = lang==='fr'
      ? "Les VCUs africains certifiés Verra/Gold Standard offrent un arbitrage exceptionnel: $7-14/t vs. EU ETS $70+/t. Achetez maintenant sur la Marketplace PANGEA CARBON."
      : "African VCUs (Verra/Gold Standard certified) offer exceptional arbitrage: $7-14/t vs. EU ETS $70+/t. Purchase now on PANGEA CARBON Marketplace.";
    doc.font('Helvetica').fontSize(9).fillColor('#065F46').text(noteText, 60, fY+24, {width:475});
    fY += 66;

    // Declaration
    doc.rect(50,fY,495,2).fill(C.acc);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.dark).text(T.declaration, 50, fY+10);
    fY += 28;
    const declText = lang==='fr'
      ? "Le présent rapport d'audit GES Corporate a été préparé conformément au standard "+STD.name+" ("+STD.edition+"). Les données d'émission utilisées sont issues de mesures directes, de factures et d'estimations documentées. Les facteurs d'émission appliqués proviennent de l'IPCC AR6 (PRG sur 100 ans), l'AIE 2024 et les bases de données nationales UNFCCC. Ce rapport doit être soumis à un auditeur tiers accrédité pour validation officielle."
      : "This Corporate GHG Audit Report has been prepared in accordance with the "+STD.name+" standard ("+STD.edition+"). Emission data is based on direct measurements, invoices and documented estimates. Applied emission factors are sourced from IPCC AR6 (100-year GWP), IEA 2024 and UNFCCC national databases. This report must be submitted to an accredited third-party auditor for official validation.";
    doc.font('Helvetica').fontSize(9).fillColor(C.gray).text(declText, 50, fY, {width:495, align:'justify'});
    fY += 80;

    // Signatures
    [[T.preparedBy,'PANGEA CARBON Africa\nCarbon Intelligence Platform',50],
     [T.verifiedBy, T.vvbPlaceholder, 290]].forEach(([role,name,x]) => {
      doc.rect(x,fY,220,60).stroke(C.border);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.gray).text(role.toUpperCase(), x+10, fY+8);
      doc.rect(x+10,fY+20,200,1).fill(C.border);
      doc.font('Helvetica').fontSize(9).fillColor(C.dark).text(name.replace(/\\n/g,'\n'), x+10, fY+26);
      doc.font('Helvetica').fontSize(8).fillColor(C.gray).text(dateFmt, x+10, fY+46);
    });

    // Footer
    doc.rect(0,800,595,42).fill(C.dark);
    doc.font('Helvetica').fontSize(8).fillColor('#9CA3AF')
       .text('PANGEA CARBON Africa · pangea-carbon.com · '+reportId+' · '+dateFmt, 50, 810, {align:'center',width:495});
    doc.font('Helvetica').fontSize(7).fillColor('#6B7280')
       .text(T.footer+' '+T.footerSub, 50, 823, {align:'center',width:495});

    doc.end();
  });
}

// Helper L() pour le PDF (ne depend pas de React)
function L(en, fr) { return fr; } // défaut fr dans le service — remplacé par le paramètre lang

module.exports = { generateAuditReport, AUDIT_STANDARDS };
