
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Remettre maxMW à null pour toutes les orgs qui ont maxMW = 0
  // (null → utilise la limite du plan, 0 → bloque tout)
  const result = await p.organization.updateMany({
    where: { maxMW: 0 },
    data: { maxMW: null }
  });
  console.log('Updated', result.count, 'organizations: maxMW 0 → null');
  
  // Aussi maxProjects = 0
  const r2 = await p.organization.updateMany({
    where: { maxProjects: 0 },
    data: { maxProjects: null }
  });
  console.log('Updated', r2.count, 'organizations: maxProjects 0 → null');
  
  // Vérifier l'état des organisations
  const orgs = await p.organization.findMany({
    select: { id:true, name:true, plan:true, maxMW:true, maxProjects:true }
  });
  console.log('Organizations:');
  orgs.forEach(o => console.log(' -', o.name, '| plan:', o.plan, '| maxMW:', o.maxMW, '| maxProjects:', o.maxProjects));
  
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
