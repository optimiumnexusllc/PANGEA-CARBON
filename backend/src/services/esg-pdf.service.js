
const PDFDocument = require('pdfkit');

const ESG_STANDARDS_DEF = {
  GRI:    { name:'GRI Standards 2021-2024',        color:'#059669', badge:'Universal + Topic Standards' },
  CSRD:   { name:'CSRD / ESRS (EU 2022/2464)',     color:'#0369A1', badge:'EU Mandatory 2025' },
  SASB:   { name:'SASB Industry Standards',        color:'#7C3AED', badge:'Investor-grade Disclosure' },
  IFRS:   { name:'IFRS S1 + S2 (ISSB)',            color:'#B45309', badge:'Global Baseline 2024' },
  UNGC:   { name:'UN Global Compact + SDGs',       color:'#0E7490', badge:'10 Principles + 17 SDGs' },
  KING_IV:{ name:'King IV Report (Africa)',         color:'#B91C1C', badge:'African Governance Gold Std.' },
  TCFD:   { name:'TCFD Framework 2024',            color:'#6B21A8', badge:'Climate Financial Disclosure' },
  BTEAM:  { name:'B Corp / B Team Standards',      color:'#065F46', badge:'Business as a Force for Good' },
};

const LEVEL_CONFIG = {
  PLATINUM:{ color:'#60A5FA', bg:'#1E3A5F', label:'PLATINUM', labelFr:'PLATINE',  min:80 },
  GOLD:    { color:'#FCD34D', bg:'#3D2E00', label:'GOLD',     labelFr:'OR',        min:65 },
  SILVER:  { color:'#E2E8F0', bg:'#1E293B', label:'SILVER',   labelFr:'ARGENT',   min:50 },
  BRONZE:  { color:'#F97316', bg:'#2D1A0E', label:'BRONZE',   labelFr:'BRONZE',   min:35 },
  BASIC:   { color:'#6B7280', bg:'#111827', label:'BASIC',    labelFr:'DE BASE',  min:0  },
};

const T = {
  en: {
    title:'CORPORATE ESG ASSESSMENT REPORT', subtitle:'Environmental · Social · Governance',
    company:'Company', sector:'Sector', country:'Country', year:'Reporting Year', framework:'Framework',
    date:'Report Date', id:'Report ID', prepared:'Prepared by', auditor:'Independent Auditor',
    auditorSub:'To be completed by certified ESG auditor',
    overallScore:'OVERALL ESG SCORE', pillarBreakdown:'PILLAR BREAKDOWN',
    environmental:'Environmental', social:'Social', governance:'Governance',
    sdgAlignment:'SDG ALIGNMENT', strengths:'KEY STRENGTHS', gaps:'PRIORITY GAPS',
    compliance:'COMPLIANCE STATUS', declaration:'DECLARATION',
    declBody:'This ESG assessment has been conducted in accordance with the stated framework. Responses are self-declared and subject to independent third-party verification. PANGEA CARBON confirms methodology alignment but does not constitute formal assurance.',
    footer:'PANGEA CARBON Africa · ESG Intelligence Platform · pangea-carbon.com',
    attestTitle:'ESG COMPLIANCE ATTESTATION CERTIFICATE',
    attestBody:'This certifies that the above organization has completed a formal ESG self-assessment under the PANGEA CARBON ESG Intelligence Engine. Scores reflect responses provided as of the report date and require third-party verification for regulatory compliance.',
    verifyAt:'Verify at: pangea-carbon.com/verify/',
    status:'Status', score:'Score', benchmark:'African Benchmark',
  },
  fr: {
    title:"RAPPORT D'ÉVALUATION ESG CORPORATE", subtitle:'Environnement · Social · Gouvernance',
    company:'Entreprise', sector:'Secteur', country:'Pays', year:'Année de référence', framework:'Référentiel',
    date:'Date du rapport', id:'Référence rapport', prepared:'Préparé par', auditor:'Auditeur indépendant',
    auditorSub:'À compléter par un auditeur ESG certifié',
    overallScore:'SCORE ESG GLOBAL', pillarBreakdown:'RÉPARTITION PAR PILIER',
    environmental:'Environnement', social:'Social', governance:'Gouvernance',
    sdgAlignment:'ALIGNEMENT ODD', strengths:'POINTS FORTS', gaps:'LACUNES PRIORITAIRES',
    compliance:'ÉTAT DE CONFORMITÉ', declaration:'DÉCLARATION',
    declBody:"Cette évaluation ESG a été réalisée conformément au référentiel indiqué. Les réponses sont auto-déclarées et soumises à vérification par un tiers indépendant. PANGEA CARBON confirme l'alignement méthodologique mais cela ne constitue pas une assurance formelle.",
    footer:"PANGEA CARBON Africa · Plateforme d'Intelligence ESG · pangea-carbon.com",
    attestTitle:'CERTIFICAT D\'ATTESTATION DE CONFORMITÉ ESG',
    attestBody:"Ceci certifie que l'organisation ci-dessus a complété une auto-évaluation ESG formelle selon le Moteur d'Intelligence ESG PANGEA CARBON. Les scores reflètent les réponses fournies à la date du rapport et requièrent une vérification par un tiers pour la conformité réglementaire.",
    verifyAt:'Vérifier sur: pangea-carbon.com/verify/',
    status:'Statut', score:'Score', benchmark:'Référence Africaine',
  },
};

const COMPLIANCE_ITEMS = {
  GRI:    { req:['G9','E1','S1','S6','G5'], nameEn:'GRI Core Reporting', nameFr:'Reporting GRI Core' },
  CSRD:   { req:['E1','E2','E4','S11','G1','G9','G10'], nameEn:'CSRD ESRS Compliance', nameFr:'Conformité CSRD ESRS' },
  UNGC:   { req:['S5','S6','S12','G5','G7','E10'], nameEn:'UN Global Compact', nameFr:'Pacte Mondial ONU' },
  TCFD:   { req:['E2','E4','G1','G4','G11'], nameEn:'TCFD Alignment', nameFr:'Alignement TCFD' },
  KING_IV:{ req:['G1','G2','G3','G5','G6','G9'], nameEn:'King IV (Africa)', nameFr:'King IV (Afrique)' },
};

const SDG_MAP = {
  4:'Quality Education', 5:'Gender Equality', 6:'Clean Water', 7:'Affordable Energy',
  8:'Decent Work', 10:'Reduced Inequalities', 11:'Sustainable Cities',
  12:'Responsible Consumption', 13:'Climate Action', 15:'Life on Land', 16:'Peace & Justice', 17:'Partnerships',
};

async function generateESGReport(assessment, scores, lang, standard) {
  return new Promise((resolve, reject) => {
    const L = T[lang] || T.en;
    const STD = ESG_STANDARDS_DEF[standard] || ESG_STANDARDS_DEF.GRI;
    const LVL = LEVEL_CONFIG[assessment.level||'BASIC'];
    const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
    const now = new Date();
    const dateFmt = now.toLocaleDateString(locale, { year:'numeric', month:'long', day:'numeric' });
    const reportId = 'PGC-ESG-'+standard.slice(0,4)+'-'+(assessment.reportingYear||2024)+'-'+Date.now().toString(36).toUpperCase();

    const accC = STD.color;
    const C = { dark:'#1A1A2E', white:'#FFFFFF', gray:'#6B7280', light:'#F3F4F6', border:'#E5E7EB', green:'#059669', s1:'#059669', s2:'#2563EB', s3:'#7C3AED' };

    const doc = new PDFDocument({ size:'A4', margin:50 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const fmt = (n) => Math.round(n||0);

    // ── PAGE 1: COVER + SCORES ───────────────────────────────────────────────
    doc.rect(0,0,595,220).fill(C.dark);
    doc.rect(0,220,595,3).fill(accC);

    // Header
    doc.font('Helvetica-Bold').fontSize(24).fillColor(C.white).text('PANGEA CARBON', 50, 52);
    doc.font('Helvetica').fontSize(10).fillColor('#9CA3AF').text('ESG Intelligence Platform · Africa', 50, 82);
    doc.font('Helvetica-Bold').fontSize(17).fillColor(C.white).text(L.title, 50, 120);
    doc.font('Helvetica').fontSize(11).fillColor('#9CA3AF').text(STD.name, 50, 144);

    // Standard + level badge
    doc.rect(370,48,175,28).fill(accC);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white).text(standard+' · '+STD.badge.slice(0,22), 378, 56);
    doc.rect(370,82,175,22).fill(LVL.bg);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(LVL.color).text('⬡ '+(lang==='fr'?LVL.labelFr:LVL.label)+' · '+assessment.rating, 378, 88);

    // Company info
    doc.rect(50,235,495,115).fill(C.light).stroke(C.border);
    doc.font('Helvetica-Bold').fontSize(15).fillColor(C.dark).text(assessment.companyName||'Corporate ESG Assessment', 65, 248);
    doc.font('Helvetica').fontSize(10).fillColor(C.gray).text(L.sector+': '+(assessment.sector||'—')+' · '+L.country+': '+(assessment.country||'—')+' · '+L.year+': '+(assessment.reportingYear||2024), 65, 268);
    const meta = [[L.framework,STD.name],[L.date,dateFmt],[L.id,reportId],[L.status,assessment.level+(lang==='fr'?' — Évalué':' — Assessed')]];
    meta.forEach(([k,v],i)=>{ doc.font('Helvetica-Bold').fontSize(9).fillColor(C.gray).text(k,65,290+i*13); doc.font('Helvetica').fontSize(9).fillColor(C.dark).text(v,200,290+i*13); });

    // ── ESG Score display
    const sY = 370;
    doc.rect(50,sY,495,2).fill(accC);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.dark).text(L.overallScore, 50, sY+10);

    // Big score
    const scoreColor = assessment.totalScore>=70?C.green:assessment.totalScore>=50?'#D97706':'#DC2626';
    doc.rect(50,sY+30,120,80).fill(C.dark);
    doc.font('Helvetica-Bold').fontSize(42).fillColor(scoreColor).text(String(fmt(assessment.totalScore)), 65, sY+40);
    doc.font('Helvetica').fontSize(11).fillColor('#9CA3AF').text('/100 · '+assessment.rating, 68, sY+90);

    // Pillar bars
    const pillars = [[L.environmental,assessment.eScore||0,C.s1,'E'],[L.social,assessment.sScore||0,C.s2,'S'],[L.governance,assessment.gScore||0,C.s3,'G']];
    pillars.forEach(([name,score,col,code],i)=>{
      const x = 190 + i*120;
      const barH = 60;
      const barW = 20;
      const filled = Math.round((score/100)*barH);
      doc.rect(x,sY+35,barW,barH).fill('#E5E7EB');
      doc.rect(x,sY+35+barH-filled,barW,filled).fill(col);
      doc.font('Helvetica-Bold').fontSize(14).fillColor(col).text(String(fmt(score))+'%',x-5,sY+35+barH+5,{width:30,align:'center'});
      doc.font('Helvetica').fontSize(9).fillColor(C.gray).text(code,x-5,sY+35+barH+22,{width:30,align:'center'});
      doc.font('Helvetica').fontSize(8).fillColor(C.gray).text(name,x-30,sY+35+barH+34,{width:80,align:'center'});
    });

    // African benchmark
    doc.rect(490,sY+30,55,80).fill('#F0FDF4').stroke('#86EFAC');
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.green).text(L.benchmark.toUpperCase(),493,sY+38,{width:49});
    doc.font('Helvetica-Bold').fontSize(20).fillColor(C.green).text('42%',496,sY+55);
    doc.font('Helvetica').fontSize(8).fillColor(C.gray).text('avg Africa',492,sY+82,{width:52,align:'center'});

    // Compliance boxes
    const cY = sY+130;
    doc.rect(50,cY,495,2).fill(accC);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(C.dark).text(L.compliance, 50, cY+10);

    const responses = assessment.responses || {};
    Object.entries(COMPLIANCE_ITEMS).forEach(([std,cfg],i)=>{
      const total = cfg.req.length;
      const met = cfg.req.filter(qId=>responses[qId]).length;
      const pct = Math.round((met/total)*100);
      const cCol = pct>=80?C.green:pct>=50?'#D97706':'#DC2626';
      const cx = 55 + i*97;
      doc.rect(cx,cY+28,87,45).fill(C.light).stroke(C.border);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.dark).text(std,cx+4,cY+32,{width:79});
      doc.font('Helvetica-Bold').fontSize(16).fillColor(cCol).text(pct+'%',cx+4,cY+44);
      doc.font('Helvetica').fontSize(7).fillColor(C.gray).text(met+'/'+total+' req.',cx+4,cY+64,{width:79});
    });

    // ── PAGE 2: QUESTIONS + SDGs ─────────────────────────────────────────────
    doc.addPage();
    doc.rect(0,0,595,40).fill(C.dark);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.white).text('PANGEA CARBON · '+L.pillarBreakdown, 50, 14);
    doc.font('Helvetica').fontSize(8).fillColor('#9CA3AF').text(reportId, 420, 22);

    let qY = 55;
    const PILLAR_LABELS = { E:L.environmental, S:L.social, G:L.governance };
    const PILLAR_COLS = { E:C.s1, S:C.s2, G:C.s3 };

    Object.entries({ E:{ CLIMATE:'Climate & Energy', ENVIRONMENT:'Environment', SUPPLY_CHAIN:'Supply Chain' }, S:{ LABOR:'Labor & Human Capital', COMMUNITY:'Community Impact', HUMAN_RIGHTS:'Human Rights' }, G:{ BOARD:'Board & Leadership', ETHICS:'Ethics & Anti-Corruption', TRANSPARENCY:'Transparency & Disclosure' } }).forEach(([pillar, catLabels])=>{
      if (qY > 740) { doc.addPage(); qY = 50; }
      const pCol = PILLAR_COLS[pillar];
      doc.rect(50,qY,495,20).fill(pCol);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(C.white).text('PILIER '+pillar+' — '+PILLAR_LABELS[pillar].toUpperCase(), 58, qY+5);
      qY += 20;

      const ESG_Q = require('./ghg').ESG_QUESTIONS; // fallback
    });

    // SDG Alignment
    if (qY > 600) { doc.addPage(); qY = 50; }
    qY += 10;
    doc.rect(50,qY,495,2).fill(accC);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(C.dark).text(L.sdgAlignment, 50, qY+10);
    qY += 28;

    const sdgScores = { 4:60, 5:assessment.sScore, 6:50, 7:assessment.eScore, 8:assessment.sScore, 12:assessment.eScore, 13:assessment.eScore, 16:assessment.gScore, 17:65 };
    Object.entries(sdgScores).slice(0,9).forEach(([sdg,score],i)=>{
      const sdgX = 50+(i%3)*165;
      const sdgY = qY+Math.floor(i/3)*55;
      const sdgCol = score>=70?C.green:score>=50?'#D97706':'#DC2626';
      doc.rect(sdgX,sdgY,155,45).fill(C.light).stroke(C.border);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.dark).text('SDG '+sdg,sdgX+6,sdgY+6,{width:143});
      doc.font('Helvetica').fontSize(7).fillColor(C.gray).text((SDG_MAP[sdg]||'').slice(0,20),sdgX+6,sdgY+18,{width:100});
      doc.font('Helvetica-Bold').fontSize(14).fillColor(sdgCol).text(fmt(score)+'%',sdgX+110,sdgY+14);
    });

    // ── PAGE 3: ATTESTATION CERTIFICATE ─────────────────────────────────────
    doc.addPage();
    // Gold border
    doc.rect(20,20,555,802).stroke(LVL.color);
    doc.rect(25,25,545,792).stroke(LVL.color);
    doc.rect(0,0,595,280).fill(C.dark);

    doc.font('Helvetica-Bold').fontSize(14).fillColor(LVL.color).text('⬡ PANGEA CARBON ESG INTELLIGENCE', 50, 55, {align:'center',width:495});
    doc.font('Helvetica-Bold').fontSize(20).fillColor(C.white).text(L.attestTitle, 50, 82, {align:'center',width:495});
    
    // Big level badge
    doc.rect(197,130,200,60).fill(LVL.bg);
    doc.rect(197,130,200,60).stroke(LVL.color);
    doc.font('Helvetica-Bold').fontSize(28).fillColor(LVL.color).text(lang==='fr'?LVL.labelFr:LVL.label, 197, 145, {width:200,align:'center'});

    doc.rect(50,210,495,2).fill(LVL.color);
    doc.font('Helvetica-Bold').fontSize(14).fillColor(C.white).text(fmt(assessment.totalScore)+'/100', 50, 225, {width:495,align:'center'});
    doc.font('Helvetica').fontSize(10).fillColor('#9CA3AF').text('ESG SCORE · RATING '+assessment.rating, 50, 244, {width:495,align:'center'});

    // Content
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.dark).text(assessment.companyName||'', 50, 310, {width:495,align:'center'});
    doc.font('Helvetica').fontSize(11).fillColor(C.gray).text(L.framework+': '+STD.name, 50, 332, {width:495,align:'center'});
    doc.font('Helvetica').fontSize(10).fillColor(C.gray).text(L.year+': '+(assessment.reportingYear||2024)+' · '+dateFmt, 50, 350, {width:495,align:'center'});

    // Score bars
    const bY = 390;
    pillars.forEach(([name,score,col],i)=>{
      const bX = 80+i*155;
      doc.rect(bX,bY,130,12).fill('#E5E7EB');
      doc.rect(bX,bY,Math.round(130*score/100),12).fill(col);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(col).text(name.slice(0,12)+': '+fmt(score)+'%',bX,bY+16,{width:130});
    });

    doc.font('Helvetica').fontSize(9).fillColor(C.gray).text(L.attestBody, 60, 450, {width:475,align:'justify',lineGap:4});

    // Declaration
    const decY = 530;
    doc.rect(50,decY,495,2).fill(accC);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.dark).text(L.declaration, 50, decY+12);
    doc.font('Helvetica').fontSize(9).fillColor(C.gray).text(L.declBody, 50, decY+32, {width:495,align:'justify',lineGap:3});

    // Signatures
    const sigY = 620;
    [[L.prepared,'PANGEA CARBON Africa',50],[L.auditor,L.auditorSub,290]].forEach(([role,name,x])=>{
      doc.rect(x,sigY,220,60).stroke(C.border);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.gray).text(role.toUpperCase(),x+10,sigY+8);
      doc.rect(x+10,sigY+20,200,1).fill(C.border);
      doc.font('Helvetica').fontSize(9).fillColor(C.dark).text(name,x+10,sigY+26);
      doc.font('Helvetica').fontSize(8).fillColor(C.gray).text(dateFmt,x+10,sigY+46);
    });

    // QR / verify
    doc.rect(50,710,495,50).fill('#F0FDF4').stroke('#86EFAC');
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.green).text('⬡ '+L.verifyAt+reportId, 60, 730, {width:475,align:'center'});
    doc.font('Helvetica').fontSize(8).fillColor(C.gray).text(L.id+': '+reportId+' · '+dateFmt, 60, 748, {width:475,align:'center'});

    // Footer
    doc.rect(0,800,595,42).fill(C.dark);
    doc.font('Helvetica').fontSize(8).fillColor('#9CA3AF').text(L.footer+' · '+reportId, 50, 816, {align:'center',width:495});

    doc.end();
  });
}

module.exports = { generateESGReport, ESG_STANDARDS_DEF };
