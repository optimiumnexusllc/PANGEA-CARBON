/**
 * PANGEA CARBON — ESG Intelligence Engine
 * Environmental · Social · Governance
 * Standards: GRI 2024 · SASB · IFRS S1/S2 · CSRD ESRS · King IV · UN SDGs
 */

const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const prisma = new PrismaClient();

// ─── Questions ESG (triées par pilier + catégorie) ───────────────────────────
const ESG_QUESTIONS = {
  // ── ENVIRONMENTAL ──────────────────────────────────────────────────────────
  E: {
    CLIMATE: [
      { id:'E1', q:'Do you measure and report your GHG emissions (Scope 1, 2, 3)?', qFr:"Mesurez-vous et déclarez-vous vos émissions GES (Scope 1, 2, 3) ?", weight:10, standard:'GRI 305 / ESRS E1', sdg:13, type:'bool' },
      { id:'E2', q:'Do you have a science-based net-zero target (SBTi or equivalent)?', qFr:"Avez-vous un objectif net-zéro basé sur la science (SBTi ou équivalent) ?", weight:8, standard:'SBTi / ESRS E1', sdg:13, type:'bool' },
      { id:'E3', q:'What percentage of your energy comes from renewable sources?', qFr:"Quel pourcentage de votre énergie provient de sources renouvelables ?", weight:7, standard:'GRI 302', sdg:7, type:'pct' },
      { id:'E4', q:'Do you have a climate transition plan with milestones?', qFr:"Disposez-vous d'un plan de transition climatique avec des jalons ?", weight:7, standard:'TCFD / CSRD', sdg:13, type:'bool' },
      { id:'E5', q:'Do you purchase carbon credits to offset residual emissions?', qFr:"Achetez-vous des crédits carbone pour compenser les émissions résiduelles ?", weight:5, standard:'VCMI / GHG Protocol', sdg:13, type:'bool' },
    ],
    ENVIRONMENT: [
      { id:'E6', q:'Do you manage and report your water consumption?', qFr:"Gérez-vous et déclarez-vous votre consommation d'eau ?", weight:6, standard:'GRI 303', sdg:6, type:'bool' },
      { id:'E7', q:'Do you have a zero-waste-to-landfill target?', qFr:"Avez-vous un objectif zéro déchet en décharge ?", weight:4, standard:'GRI 306', sdg:12, type:'bool' },
      { id:'E8', q:'Do you assess your impact on local biodiversity?', qFr:"Évaluez-vous votre impact sur la biodiversité locale ?", weight:5, standard:'GRI 304 / ESRS E4', sdg:15, type:'bool' },
      { id:'E9', q:'Do you have an environmental management system (ISO 14001)?', qFr:"Disposez-vous d'un système de management environnemental (ISO 14001) ?", weight:5, standard:'ISO 14001', sdg:12, type:'bool' },
    ],
    SUPPLY_CHAIN: [
      { id:'E10', q:'Do you assess environmental risks in your supply chain?', qFr:"Évaluez-vous les risques environnementaux dans votre chaîne d'approvisionnement ?", weight:6, standard:'CSDDD / ESRS E1', sdg:12, type:'bool' },
      { id:'E11', q:'Do you require environmental standards from key suppliers?', qFr:"Exigez-vous des standards environnementaux de vos fournisseurs clés ?", weight:5, standard:'GRI 308', sdg:12, type:'bool' },
    ],
  },
  // ── SOCIAL ─────────────────────────────────────────────────────────────────
  S: {
    LABOR: [
      { id:'S1', q:'Do you publish an annual employee safety report (LTIR)?', qFr:"Publiez-vous un rapport annuel sur la sécurité des employés (LTIR) ?", weight:8, standard:'GRI 403 / ISO 45001', sdg:8, type:'bool' },
      { id:'S2', q:'What is your gender diversity ratio at management level (%women)?', qFr:"Quel est votre ratio de diversité de genre au niveau de la direction (% femmes) ?", weight:7, standard:'GRI 405 / ESRS S1', sdg:5, type:'pct' },
      { id:'S3', q:'Do you provide living wages above national minimum wage?', qFr:"Versez-vous des salaires décents supérieurs au salaire minimum national ?", weight:7, standard:'GRI 202 / ILO', sdg:8, type:'bool' },
      { id:'S4', q:'Do you offer employee training (avg hours/year per employee)?', qFr:"Offrez-vous de la formation aux employés (heures moy./an par employé) ?", weight:5, standard:'GRI 404', sdg:4, type:'number' },
      { id:'S5', q:'Do you allow freedom of association and collective bargaining?', qFr:"Respectez-vous la liberté d'association et la négociation collective ?", weight:7, standard:'ILO Core / GRI 407', sdg:8, type:'bool' },
      { id:'S6', q:'Do you prohibit child labor and forced labor in operations?', qFr:"Interdisez-vous le travail des enfants et le travail forcé dans vos opérations ?", weight:9, standard:'ILO Core / UNGC Principle 4-5', sdg:8, type:'bool' },
    ],
    COMMUNITY: [
      { id:'S7', q:'Do you measure and report community investment (% revenue)?', qFr:"Mesurez-vous et déclarez-vous l'investissement communautaire (% du chiffre d'affaires) ?", weight:6, standard:'GRI 413', sdg:11, type:'bool' },
      { id:'S8', q:'Do you conduct community impact assessments for new projects?', qFr:"Réalisez-vous des évaluations d'impact communautaire pour les nouveaux projets ?", weight:6, standard:'IFC PS 5 / ESRS S3', sdg:11, type:'bool' },
      { id:'S9', q:'Do you have a grievance mechanism accessible to local communities?', qFr:"Disposez-vous d'un mécanisme de réclamation accessible aux communautés locales ?", weight:5, standard:'IFC PS 2 / UNGC', sdg:16, type:'bool' },
      { id:'S10', q:'What % of your workforce is from the local community?', qFr:"Quel % de votre main-d'oeuvre est issu de la communauté locale ?", weight:5, standard:'GRI 413 / SDG 8', sdg:8, type:'pct' },
    ],
    HUMAN_RIGHTS: [
      { id:'S11', q:'Have you conducted a human rights due diligence assessment?', qFr:"Avez-vous réalisé une évaluation de diligence raisonnable en matière de droits humains ?", weight:8, standard:'UNGP / CSDDD', sdg:16, type:'bool' },
      { id:'S12', q:'Do you have an anti-modern slavery policy?', qFr:"Disposez-vous d'une politique anti-esclavage moderne ?", weight:7, standard:'UK Modern Slavery Act / CSDDD', sdg:8, type:'bool' },
    ],
  },
  // ── GOVERNANCE ─────────────────────────────────────────────────────────────
  G: {
    BOARD: [
      { id:'G1', q:'Does your board have a sustainability/ESG committee?', qFr:"Votre conseil d'administration dispose-t-il d'un comité développement durable/ESG ?", weight:8, standard:'GRI 2 / King IV / TCFD', sdg:16, type:'bool' },
      { id:'G2', q:'What % of board members are independent directors?', qFr:"Quel % des membres du conseil sont des administrateurs indépendants ?", weight:7, standard:'King IV / OECD CG', sdg:16, type:'pct' },
      { id:'G3', q:'Is ESG performance linked to executive compensation?', qFr:"La performance ESG est-elle liée à la rémunération des dirigeants ?", weight:7, standard:'ESRS G1 / King IV', sdg:16, type:'bool' },
      { id:'G4', q:'Do you have board-level climate competency (TCFD)?', qFr:"Votre conseil dispose-t-il de compétences climatiques (TCFD) ?", weight:6, standard:'TCFD / ESRS G1', sdg:13, type:'bool' },
    ],
    ETHICS: [
      { id:'G5', q:'Do you have a published anti-corruption/bribery policy?', qFr:"Disposez-vous d'une politique anti-corruption/pot-de-vin publiée ?", weight:9, standard:'GRI 205 / UNGC P10', sdg:16, type:'bool' },
      { id:'G6', q:'Do you have a whistleblower protection mechanism?', qFr:"Disposez-vous d'un mécanisme de protection des lanceurs d'alerte ?", weight:7, standard:'GRI 2-26 / ESRS G1', sdg:16, type:'bool' },
      { id:'G7', q:'Are you a signatory to the UN Global Compact?', qFr:"Êtes-vous signataire du Pacte Mondial des Nations Unies ?", weight:6, standard:'UNGC', sdg:17, type:'bool' },
      { id:'G8', q:'Do you publish a public tax transparency report?', qFr:"Publiez-vous un rapport public de transparence fiscale ?", weight:5, standard:'GRI 207 / CSRD', sdg:16, type:'bool' },
    ],
    TRANSPARENCY: [
      { id:'G9', q:'Do you publish an annual sustainability/ESG report?', qFr:"Publiez-vous un rapport annuel développement durable/ESG ?", weight:8, standard:'GRI 2 / CSRD / ESRS', sdg:17, type:'bool' },
      { id:'G10', q:'Is your ESG data externally assured/audited?', qFr:"Vos données ESG sont-elles vérifiées/auditées par un tiers externe ?", weight:7, standard:'ISAE 3000 / AA1000AS', sdg:16, type:'bool' },
      { id:'G11', q:'Do you disclose climate-related financial risks (TCFD)?', qFr:"Divulguez-vous les risques financiers liés au climat (TCFD) ?", weight:6, standard:'TCFD / IFRS S2', sdg:13, type:'bool' },
      { id:'G12', q:'Do you have a supplier code of conduct?', qFr:"Disposez-vous d'un code de conduite fournisseurs ?", weight:5, standard:'GRI 2 / CSDDD', sdg:12, type:'bool' },
    ],
  },
};

// ─── Calcul du score ESG ────────────────────────────────────────────────────
function calculateESGScore(responses) {
  let pillars = { E:{ score:0, max:0 }, S:{ score:0, max:0 }, G:{ score:0, max:0 } };
  
  Object.entries(ESG_QUESTIONS).forEach(([pillar, cats]) => {
    Object.values(cats).forEach(questions => {
      questions.forEach(q => {
        pillars[pillar].max += q.weight * 10;
        const resp = responses[q.id];
        if (resp !== undefined && resp !== null && resp !== '') {
          if (q.type === 'bool') {
            pillars[pillar].score += resp ? q.weight * 10 : 0;
          } else if (q.type === 'pct') {
            const val = Math.min(100, parseFloat(resp) || 0);
            pillars[pillar].score += (val / 100) * q.weight * 10;
          } else if (q.type === 'number') {
            const val = parseFloat(resp) || 0;
            const normalized = Math.min(1, val / 40); // 40h = perfect
            pillars[pillar].score += normalized * q.weight * 10;
          }
        }
      });
    });
  });

  const eScore = pillars.E.max > 0 ? Math.round((pillars.E.score / pillars.E.max) * 100) : 0;
  const sScore = pillars.S.max > 0 ? Math.round((pillars.S.score / pillars.S.max) * 100) : 0;
  const gScore = pillars.G.max > 0 ? Math.round((pillars.G.score / pillars.G.max) * 100) : 0;
  const total = Math.round(eScore * 0.40 + sScore * 0.35 + gScore * 0.25);

  const rating = total >= 80 ? 'AAA' : total >= 65 ? 'AA' : total >= 50 ? 'A' : total >= 35 ? 'BBB' : total >= 20 ? 'BB' : 'B';
  const level = total >= 80 ? 'PLATINUM' : total >= 65 ? 'GOLD' : total >= 50 ? 'SILVER' : total >= 35 ? 'BRONZE' : 'BASIC';

  return { eScore, sScore, gScore, total, rating, level, pillars };
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// GET /api/esg/questions — Liste des questions
router.get('/questions', auth, (req, res) => {
  res.json({ questions: ESG_QUESTIONS });
});

// GET /api/esg/assessments — Liste des audits ESG
router.get('/assessments', auth, async (req, res, next) => {
  try {
    const where = ['SUPER_ADMIN','ADMIN','ORG_OWNER'].includes(req.user.role)
      ? (req.user.organizationId ? { organizationId: req.user.organizationId } : {})
      : { userId: req.user.userId };
    const assessments = await prisma.eSGAssessment.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 20,
    });
    res.json({ assessments });
  } catch(e) { next(e); }
});

// POST /api/esg/assessments — Créer un audit ESG
router.post('/assessments', auth, async (req, res, next) => {
  try {
    const { companyName, reportingYear, sector, country, framework } = req.body;
    if (!companyName) return res.status(400).json({ error: 'companyName required' });
    const assessment = await prisma.eSGAssessment.create({
      data: {
        companyName, reportingYear: parseInt(reportingYear)||new Date().getFullYear()-1,
        sector: sector||'OTHER', country: country||'CI', framework: framework||'GRI',
        userId: req.user.userId, organizationId: req.user.organizationId||null,
        status: 'IN_PROGRESS', responses: {}, eScore:0, sScore:0, gScore:0, totalScore:0,
        rating: 'B', level: 'BASIC',
      },
    });
    await prisma.auditLog.create({ data: { userId:req.user.userId, action:'ESG_ASSESSMENT_CREATED', entity:'ESGAssessment', entityId:assessment.id, after:{ companyName, reportingYear } } }).catch(()=>{});
    res.json(assessment);
  } catch(e) { next(e); }
});

// GET /api/esg/assessments/:id
router.get('/assessments/:id', auth, async (req, res, next) => {
  try {
    const a = await prisma.eSGAssessment.findUnique({ where: { id: req.params.id } });
    if (!a) return res.status(404).json({ error: 'Not found' });
    res.json(a);
  } catch(e) { next(e); }
});

// PUT /api/esg/assessments/:id/responses — Sauvegarder les réponses
router.put('/assessments/:id/responses', auth, async (req, res, next) => {
  try {
    const { responses } = req.body;
    const scores = calculateESGScore(responses || {});
    const answeredCount = Object.keys(responses||{}).length;
    const totalQ = Object.values(ESG_QUESTIONS).flatMap(c=>Object.values(c)).flat().length;
    const status = answeredCount >= totalQ ? 'COMPLETED' : 'IN_PROGRESS';

    const updated = await prisma.eSGAssessment.update({
      where: { id: req.params.id },
      data: {
        responses, status,
        eScore: scores.eScore, sScore: scores.sScore, gScore: scores.gScore,
        totalScore: scores.total, rating: scores.rating, level: scores.level,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
    });
    res.json({ ...updated, scores });
  } catch(e) { next(e); }
});

// GET /api/esg/assessments/:id/score — Score détaillé
router.get('/assessments/:id/score', auth, async (req, res, next) => {
  try {
    const a = await prisma.eSGAssessment.findUnique({ where: { id: req.params.id } });
    if (!a) return res.status(404).json({ error: 'Not found' });
    const scores = calculateESGScore(a.responses || {});
    res.json({ assessment: a, scores, questions: ESG_QUESTIONS });
  } catch(e) { next(e); }
});

// DELETE /api/esg/assessments/:id
router.delete('/assessments/:id', auth, async (req, res, next) => {
  try {
    await prisma.eSGAssessment.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch(e) { next(e); }
});

// GET /api/esg/assessments/:id/report?lang=fr&standard=GRI
router.get('/assessments/:id/report', auth, async (req, res, next) => {
  try {
    const lang = req.query.lang === 'fr' ? 'fr' : 'en';
    const standard = req.query.standard || 'GRI';
    const a = await prisma.eSGAssessment.findUnique({ where: { id: req.params.id } });
    if (!a) return res.status(404).json({ error: 'Not found' });
    const scores = calculateESGScore(a.responses || {});
    const { generateESGReport } = require('../services/esg-pdf.service');
    const pdfBuffer = await generateESGReport(a, scores, lang, standard);
    const filename = 'PANGEA-ESG-'+standard+'-'+(a.companyName||'Company').replace(/[^a-zA-Z]/g,'-').slice(0,15)+'-'+(a.reportingYear||2024)+'-'+lang.toUpperCase()+'.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="'+filename+'"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch(e) { next(e); }
});

// GET /api/esg/dashboard
router.get('/dashboard', auth, async (req, res, next) => {
  try {
    const where = req.user.organizationId ? { organizationId: req.user.organizationId } : { userId: req.user.userId };
    const assessments = await prisma.eSGAssessment.findMany({ where, orderBy:{ createdAt:'desc' }, take:10 });
    const latest = assessments[0];
    res.json({
      totalAssessments: assessments.length,
      latestScore: latest?.totalScore || 0,
      latestRating: latest?.rating || '—',
      latestLevel: latest?.level || '—',
      eScore: latest?.eScore || 0,
      sScore: latest?.sScore || 0,
      gScore: latest?.gScore || 0,
      assessments,
    });
  } catch(e) { next(e); }
});

module.exports = router;
