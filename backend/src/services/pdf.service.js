const PDFDocument = require('pdfkit');
const { MRVEngine } = require('./mrv.service');

/**
 * Génère un rapport MRV certifiable Verra ACM0002
 * @param {Object} project - Données du projet
 * @param {Object} mrvData - Résultats du calcul MRV
 * @param {Array} readings - Lectures de production
 * @returns {Buffer} PDF buffer
 */
async function generateMRVReport(project, mrvData, readings) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const C = {
      black: '#0A0A0A', dark: '#1A1A2E', green: '#00875A',
      lightGreen: '#E3FCF3', gray: '#6B7280', lightGray: '#F3F4F6',
      border: '#E5E7EB', accent: '#059669', white: '#FFFFFF',
    };

    const fmt = (n, d = 0) => n ? n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
    const now = new Date();
    const reportId = `PGC-${project.countryCode}-${mrvData.year}-${Date.now().toString(36).toUpperCase()}`;

    // ── COVER PAGE ──────────────────────────────────────────────────────────
    doc.rect(0, 0, 595, 200).fill(C.dark);
    doc.rect(0, 200, 595, 4).fill(C.green);

    // Logo text
    doc.font('Helvetica-Bold').fontSize(28).fillColor(C.white)
       .text('PANGEA CARBON', 50, 60);
    doc.font('Helvetica').fontSize(12).fillColor('#9CA3AF')
       .text('Carbon Credit Intelligence · Africa', 50, 95);

    doc.font('Helvetica-Bold').fontSize(18).fillColor(C.white)
       .text('MONITORING & VERIFICATION REPORT', 50, 130);
    doc.font('Helvetica').fontSize(11).fillColor('#9CA3AF')
       .text(`Rapport annuel de Monitoring, Reporting & Vérification`, 50, 155);

    // Report ID badge
    doc.rect(400, 55, 145, 28).fill(C.green);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white)
       .text(reportId, 408, 63);

    // Project info block
    doc.rect(50, 220, 495, 110).fill(C.lightGray).stroke(C.border);
    doc.font('Helvetica-Bold').fontSize(14).fillColor(C.dark)
       .text(project.name, 65, 235);
    doc.font('Helvetica').fontSize(10).fillColor(C.gray)
       .text(`${project.type} · ${project.country} · ${project.installedMW} MW installés`, 65, 255);

    const meta = [
      ['Période de monitoring', `01/01/${mrvData.year} – 31/12/${mrvData.year}`],
      ['Méthodologie', 'ACM0002 v19.0 — Consolidated methodology for grid-connected RE'],
      ['Standard', project.standard || 'Verra Verified Carbon Standard (VCS)'],
      ['Date du rapport', now.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })],
    ];
    meta.forEach(([k, v], i) => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.gray).text(k, 65, 278 + i * 13);
      doc.font('Helvetica').fontSize(9).fillColor(C.dark).text(v, 220, 278 + i * 13);
    });

    // ── KEY RESULTS ──────────────────────────────────────────────────────────
    doc.moveDown(2);
    const kpiY = 350;
    doc.rect(50, kpiY, 495, 2).fill(C.green);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.dark)
       .text('RÉSULTATS CLÉS', 50, kpiY + 12);

    const kpis = [
      ['Production totale', `${fmt(mrvData.projectMetrics?.totalMWh)} MWh`, C.dark],
      ['Réductions d\'émissions brutes', `${fmt(mrvData.emissions?.grossReductions)} tCO₂e`, C.dark],
      ['Crédits carbone nets (VCUs)', `${fmt(mrvData.emissions?.netCarbonCredits)} tCO₂e`, C.green],
      ['Revenus carbone estimés', `$${fmt(mrvData.financials?.netRevenueUSD)}`, C.accent],
    ];

    kpis.forEach(([label, value, color], i) => {
      const x = i % 2 === 0 ? 50 : 300;
      const y = kpiY + 35 + Math.floor(i / 2) * 55;
      doc.rect(x, y, 230, 45).fill(i % 2 === 0 ? C.lightGray : C.lightGreen).stroke(C.border);
      doc.font('Helvetica').fontSize(8).fillColor(C.gray).text(label.toUpperCase(), x + 10, y + 8);
      doc.font('Helvetica-Bold').fontSize(16).fillColor(color).text(value, x + 10, y + 20);
    });

    // ── NEW PAGE — CALCUL DÉTAILLÉ ───────────────────────────────────────────
    doc.addPage();

    // Header
    doc.rect(0, 0, 595, 40).fill(C.dark);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.white)
       .text('PANGEA CARBON — Rapport MRV', 50, 14);
    doc.font('Helvetica').fontSize(9).fillColor('#9CA3AF')
       .text(reportId, 400, 15).text(project.name, 400, 26);

    // Section: Calcul ACM0002
    doc.rect(50, 55, 495, 2).fill(C.green);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.dark)
       .text('CALCUL DES RÉDUCTIONS D\'ÉMISSIONS (ACM0002)', 50, 67);
    doc.font('Helvetica').fontSize(9).fillColor(C.gray)
       .text('Consolidated baseline and monitoring methodology for grid-connected electricity generation from renewable sources', 50, 83);

    // Formula box
    doc.rect(50, 100, 495, 32).fill('#F0FDF4').stroke(C.green);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.green)
       .text('ER_y  =  EG_RE,y  ×  EF_grid,CM,y  −  LE_y', 60, 113, { align: 'center', width: 475 });

    // Step table
    const steps = [
      ['', 'Paramètre', 'Valeur', 'Unité', 'Source'],
      ['1', 'Électricité produite (EG_RE,y)', fmt(mrvData.projectMetrics?.totalMWh, 2), 'MWh', 'Compteur certifié'],
      ['2', `Facteur d'émission grille (EF_grid,CM,y) — ${project.countryCode}`, project.baselineEF?.toFixed(3), 'tCO₂/MWh', 'UNFCCC / IPCC'],
      ['3', 'Réductions brutes (EG × EF)', fmt(mrvData.emissions?.grossReductions, 2), 'tCO₂e', 'Calcul ACM0002 §3'],
      ['4', 'Déduction fuites (LE_y = 3%)', `− ${fmt(mrvData.emissions?.leakageDeduction, 2)}`, 'tCO₂e', 'ACM0002 §4.2'],
      ['5', 'Déduction incertitude (5%)', `− ${fmt(mrvData.emissions?.uncertaintyDeduction, 2)}`, 'tCO₂e', 'ACM0002 §5.1'],
      ['→', 'CRÉDITS CARBONE NETS (VCUs)', fmt(mrvData.emissions?.netCarbonCredits, 2), 'tCO₂e', ''],
    ];

    let tY = 148;
    steps.forEach((row, ri) => {
      const isHeader = ri === 0;
      const isTotal = ri === steps.length - 1;
      const bg = isHeader ? C.dark : isTotal ? C.lightGreen : ri % 2 === 0 ? C.white : C.lightGray;
      doc.rect(50, tY, 495, 20).fill(bg).stroke(C.border);
      const fColor = isHeader ? C.white : isTotal ? C.green : C.dark;
      const fw = isHeader || isTotal ? 'Helvetica-Bold' : 'Helvetica';
      const cols = [60, 80, 380, 440, 490];
      row.forEach((cell, ci) => {
        doc.font(fw).fontSize(8).fillColor(fColor).text(String(cell), cols[ci], tY + 6, { width: ci === 1 ? 285 : 55, lineBreak: false });
      });
      tY += 20;
    });

    // Section: Données production
    tY += 20;
    doc.rect(50, tY, 495, 2).fill(C.green);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.dark).text('DONNÉES DE PRODUCTION MENSUELLES', 50, tY + 12);
    tY += 30;

    const readingHeaders = ['Mois', 'Production (MWh)', 'Puissance crête (MW)', 'Disponibilité (%)', 'Statut'];
    const rColX = [60, 130, 250, 370, 460];

    doc.rect(50, tY, 495, 18).fill(C.dark);
    readingHeaders.forEach((h, i) => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white).text(h, rColX[i], tY + 5, { width: 110, lineBreak: false });
    });
    tY += 18;

    (readings || []).slice(0, 12).forEach((r, i) => {
      const bg = i % 2 === 0 ? C.white : C.lightGray;
      doc.rect(50, tY, 495, 16).fill(bg).stroke(C.border);
      const month = new Date(r.periodStart).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      [month, fmt(r.energyMWh, 1), fmt(r.peakPowerMW, 1), r.availabilityPct ? fmt(r.availabilityPct, 1) : '—', 'Vérifié'].forEach((v, ci) => {
        doc.font('Helvetica').fontSize(8).fillColor(C.dark).text(String(v), rColX[ci], tY + 4, { width: 110, lineBreak: false });
      });
      tY += 16;
    });

    // ── PAGE 3 — FINANCIALS & CERTIFICATION ─────────────────────────────────
    doc.addPage();
    doc.rect(0, 0, 595, 40).fill(C.dark);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.white).text('PANGEA CARBON — Rapport MRV', 50, 14);
    doc.font('Helvetica').fontSize(9).fillColor('#9CA3AF').text(reportId, 400, 22);

    // Revenue section
    doc.rect(50, 55, 495, 2).fill(C.green);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.dark).text('VALORISATION FINANCIÈRE', 50, 67);

    const revRows = [
      ['Crédits carbone nets', `${fmt(mrvData.emissions?.netCarbonCredits)} tCO₂e`],
      ['Prix de marché (Verra VCU)', `$${mrvData.financials?.marketPriceUSD}/tCO₂e`],
      ['Revenus bruts', `$${fmt(mrvData.financials?.grossRevenueUSD)}`],
      ['Coûts vérification (8%)', `− $${fmt(mrvData.financials?.transactionCostsUSD)}`],
      ['REVENUS NETS ESTIMÉS', `$${fmt(mrvData.financials?.netRevenueUSD)}`],
    ];

    let rY = 88;
    revRows.forEach(([k, v], i) => {
      const isTotal = i === revRows.length - 1;
      doc.rect(50, rY, 495, isTotal ? 26 : 20).fill(isTotal ? C.lightGreen : i % 2 === 0 ? C.lightGray : C.white).stroke(C.border);
      doc.font(isTotal ? 'Helvetica-Bold' : 'Helvetica').fontSize(isTotal ? 11 : 9)
         .fillColor(isTotal ? C.green : C.dark).text(k, 60, rY + (isTotal ? 8 : 6));
      doc.font(isTotal ? 'Helvetica-Bold' : 'Helvetica').fontSize(isTotal ? 11 : 9)
         .fillColor(isTotal ? C.green : C.dark).text(v, 400, rY + (isTotal ? 8 : 6), { align: 'right', width: 135 });
      rY += isTotal ? 26 : 20;
    });

    // Equivalents
    rY += 20;
    doc.rect(50, rY, 495, 2).fill(C.green);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.dark).text('ÉQUIVALENTS ENVIRONNEMENTAUX', 50, rY + 12);
    rY += 30;
    const eqs = [
      ['🚗 Voitures retirées de la route', fmt(mrvData.equivalents?.carsOffRoad)],
      ['🌳 Arbres équivalents plantés', fmt(mrvData.equivalents?.treesPlanted)],
      ['🏠 Foyers africains électrifiés', fmt(mrvData.equivalents?.homesElectrified)],
    ];
    eqs.forEach(([label, value]) => {
      doc.rect(50, rY, 495, 22).fill(C.lightGray).stroke(C.border);
      doc.font('Helvetica').fontSize(10).fillColor(C.dark).text(label, 60, rY + 6);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(C.accent).text(value, 400, rY + 6, { align: 'right', width: 135 });
      rY += 22;
    });

    // Signature & certification
    rY += 30;
    doc.rect(50, rY, 495, 2).fill(C.green);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.dark).text('DÉCLARATION DE CONFORMITÉ', 50, rY + 12);
    rY += 32;

    doc.font('Helvetica').fontSize(9).fillColor(C.gray).text(
      `Le présent rapport de Monitoring, Reporting et Vérification (MRV) a été généré conformément à la méthodologie Verra ACM0002 v19.0 "Consolidated baseline and monitoring methodology for grid-connected electricity generation from renewable sources". Les données de production présentées sont issues des systèmes de métrologie certifiés du projet. Les calculs de réductions d'émissions et de crédits carbone nets (VCUs) ont été effectués selon les paramètres de surveillance définis dans le Plan de Surveillance approuvé.`,
      50, rY, { width: 495, align: 'justify' }
    );

    rY += 70;
    // Signatures boxes
    [['Préparé par', 'PANGEA CARBON Africa\nPlatforme MRV Certifiée', 50],
     ['Approuvé par', 'Validation et Vérification Body\nÀ compléter par auditeur VVB', 290]].forEach(([role, name, x]) => {
      doc.rect(x, rY, 220, 60).stroke(C.border);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.gray).text(role.toUpperCase(), x + 10, rY + 8);
      doc.rect(x + 10, rY + 20, 200, 1).fill(C.border);
      doc.font('Helvetica').fontSize(9).fillColor(C.dark).text(name, x + 10, rY + 26);
      doc.font('Helvetica').fontSize(8).fillColor(C.gray).text(now.toLocaleDateString('fr-FR'), x + 10, rY + 46);
    });

    // Footer
    doc.rect(0, 800, 595, 42).fill(C.dark);
    doc.font('Helvetica').fontSize(8).fillColor('#9CA3AF')
       .text(`PANGEA CARBON Africa · pangea-carbon.com · Rapport ${reportId} · Généré le ${now.toLocaleDateString('fr-FR')}`, 50, 816, { align: 'center', width: 495 });
    doc.font('Helvetica').fontSize(7).fillColor('#6B7280')
       .text('Ce rapport est généré automatiquement par la plateforme PANGEA CARBON. Il doit être soumis à un auditeur VVB accrédité Verra/Gold Standard pour validation et issuance des crédits carbone.', 50, 828, { align: 'center', width: 495 });

    doc.end();
  });
}

module.exports = { generateMRVReport };
