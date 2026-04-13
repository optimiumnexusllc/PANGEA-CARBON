/**
 * PANGEA CARBON — AI MRV Assistant
 * Powered by Claude (Anthropic API)
 * Analyse les données carbone, répond aux questions MRV
 */
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { MRVEngine } = require('../services/mrv.service');
const prisma = new PrismaClient();

const SYSTEM_PROMPT = `Tu es l'Assistant MRV de PANGEA CARBON, une plateforme de Carbon Credit Intelligence pour les projets d'énergie renouvelable en Afrique.

Tu es un expert en :
- Méthodologie Verra ACM0002 (grid-connected renewable energy)
- Gold Standard for the Global Goals
- Article 6 de l'Accord de Paris
- Marchés carbone africains (ACMI, Kenya Carbon Markets, South Africa Carbon Tax)
- Calcul de réductions d'émissions (tCO2e)
- Optimisation de portefeuilles MRV

Tu réponds en français, avec précision et en citant des chiffres concrets. Tu aides à :
1. Analyser les données de production et les crédits carbone
2. Identifier les optimisations possibles
3. Expliquer la méthodologie ACM0002
4. Comparer les performances entre projets
5. Anticiper les questions des auditeurs VVB

Tu as accès aux données réelles du portfolio de l'utilisateur (fournies dans le contexte).
Sois concis, actionnable et professionnel.`;

router.post('/chat', auth, async (req, res, next) => {
  try {
    const { message, projectId, conversationHistory = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'Message requis' });

    // Récupérer le contexte des données
    let contextData = '';

    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          readings: { orderBy: { periodStart: 'desc' }, take: 12 },
          mrvRecords: { orderBy: { year: 'desc' }, take: 3 },
        }
      });

      if (project) {
        const mrvSummary = project.mrvRecords[0];
        contextData = `
PROJET ANALYSÉ: ${project.name}
- Pays: ${project.country} (EF: ${project.baselineEF} tCO2/MWh)
- Type: ${project.type} · ${project.installedMW} MW installés
- Standard: ${project.standard}
- Lectures disponibles: ${project.readings.length} mois
${mrvSummary ? `- Dernier MRV (${mrvSummary.year}): ${mrvSummary.netCarbonCredits.toFixed(0)} tCO2e nets · $${mrvSummary.revenueUSD.toFixed(0)} revenus` : ''}
`;
      }
    } else {
      // Données portfolio globales
      const stats = await prisma.mRVRecord.aggregate({
        _sum: { netCarbonCredits: true, revenueUSD: true, totalEnergyMWh: true }
      });
      const projectCount = await prisma.project.count({ where: { userId: req.user.userId } });

      contextData = `
PORTFOLIO GLOBAL:
- Projets: ${projectCount}
- Crédits carbone totaux: ${stats._sum.netCarbonCredits?.toFixed(0) || 0} tCO2e
- Revenus carbone: $${stats._sum.revenueUSD?.toFixed(0) || 0}
- Production totale: ${stats._sum.totalEnergyMWh?.toFixed(0) || 0} MWh
`;
    }

    // Construire les messages
    const messages = [
      ...conversationHistory.slice(-10), // Garder les 10 derniers messages
      { role: 'user', content: message }
    ];

    if (contextData) {
      messages[messages.length - 1].content = `[CONTEXTE DONNÉES]\n${contextData}\n\n[QUESTION]\n${message}`;
    }

    // Appel Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      // Si pas de clé API configurée, réponse simulée
      if (response.status === 401) {
        return res.json({
          reply: `Je suis l'Assistant MRV PANGEA CARBON. Pour activer l'IA complète, configurez votre clé API Anthropic dans Admin → Secrets & Config → Intégrations → \`anthropic_api_key\`.\n\nEn attendant, voici ce que je peux vous dire sur ACM0002 : c'est la méthodologie Verra la plus utilisée pour les projets d'énergie renouvelable connectés au réseau. Elle calcule les réductions d'émissions comme suit :\n\n**ER = EG × EF_grid × (1 - leakage) × (1 - uncertainty)**\n\nOù EG = production (MWh), EF = facteur d'émission grille (tCO2/MWh).\n\nVous pouvez utiliser le Calculateur MRV dans le menu pour simuler vos projets.`,
          simulated: true,
        });
      }
      throw new Error(err.error?.message || 'Erreur API Claude');
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Désolé, je n\'ai pas pu générer une réponse.';

    res.json({ reply, tokensUsed: data.usage });
  } catch (e) { next(e); }
});

// GET /api/assistant/suggestions — Questions suggérées basées sur les données
router.get('/suggestions', auth, async (req, res, next) => {
  try {
    const projectCount = await prisma.project.count({ where: { userId: req.user.userId } });
    const readingCount = await prisma.energyReading.count({ where: { project: { userId: req.user.userId } } });
    const hasCredits = await prisma.mRVRecord.count({ where: { project: { userId: req.user.userId } } });

    const suggestions = [
      { text: 'Comment maximiser mes crédits carbone cette année ?', category: 'optimisation' },
      { text: 'Explique-moi la méthodologie ACM0002 en détail', category: 'éducation' },
      { text: 'Quels sont les risques lors de l\'audit Verra ?', category: 'conformité' },
      { text: 'Comment connecter mes onduleurs SMA à PANGEA CARBON ?', category: 'technique' },
      { text: 'Quel est le meilleur prix pour vendre mes crédits ?', category: 'marché' },
      { text: 'Compare mes projets solaires et éoliens', category: 'analyse' },
    ];

    if (projectCount === 0) suggestions.unshift({ text: 'Comment créer mon premier projet MRV ?', category: 'démarrage' });
    if (readingCount === 0) suggestions.unshift({ text: 'Comment importer mes données de production ?', category: 'démarrage' });

    res.json({ suggestions });
  } catch (e) { next(e); }
});

module.exports = router;
