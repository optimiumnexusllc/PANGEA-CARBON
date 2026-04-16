/**
 * PANGEA CARBON — Restore All User Accounts
 * Run after --force-reset to recreate all accounts
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('[RESTORE] Starting account restoration...');
  
  // Organisation principale
  const org = await prisma.organization.upsert({
    where: { slug: 'pangea-carbon-africa' },
    update: {},
    create: {
      name: 'PANGEA CARBON Africa',
      slug: 'pangea-carbon-africa',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      country: 'CI',
      billingEmail: 'contact@pangea-carbon.com',
      maxProjects: 999, maxUsers: 999, maxMW: 99999,
    }
  });
  console.log('[RESTORE] Org:', org.name);
  
  const accounts = [
    {
      email: 'contact@pangea-carbon.com',
      name: 'Dayiri Esdras',
      password: 'PangeaCarb0n@2026!',
      role: 'SUPER_ADMIN',
      orgId: org.id,
      isActive: true,
      emailVerified: true,
    },
    {
      email: 'demo@pangea-carbon.com',
      name: 'Demo Analyst',
      password: 'Demo@2026!',
      role: 'ANALYST',
      orgId: org.id,
      isActive: true,
      emailVerified: true,
    },
    {
      email: 'esdras.dayiri@gmail.com',
      name: 'DAYIRI Esdras',
      password: 'PangeaCarb0n@2026!',
      role: 'SUPER_ADMIN',
      orgId: null,
      isActive: true,
      emailVerified: true,
    },
    {
      email: 'tchiraplatform@protonmail.com',
      name: 'Tchira SMS',
      password: 'Tchira@2026!',
      role: 'ORG_OWNER',
      orgId: null,
      isActive: true,
      emailVerified: true,
    },
    {
      email: 'ad@h-datas.com',
      name: 'Abdoulaye D',
      password: 'HData@2026!',
      role: 'ANALYST',
      orgId: null,
      isActive: true,
      emailVerified: true,
    },
    {
      email: 'optimexcelium@gmail.com',
      name: 'OPTIMIUM',
      password: 'Optimium@2026!',
      role: 'ORG_OWNER',
      orgId: null,
      isActive: true,
      emailVerified: true,
    },
  ];
  
  for (const acc of accounts) {
    const hash = await bcrypt.hash(acc.password, 10);
    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: { password: hash, isActive: acc.isActive, emailVerified: acc.emailVerified },
      create: {
        email: acc.email,
        name: acc.name,
        password: hash,
        role: acc.role,
        organizationId: acc.orgId,
        isActive: acc.isActive,
        emailVerified: acc.emailVerified,
        loginCount: 0,
      }
    });
    console.log('[RESTORE]', user.role, '-', user.email, '- password:', acc.password);
  }
  
  console.log('\n[RESTORE] All accounts restored successfully!');
  console.log('[RESTORE] Run the main seed for demo data: node src/utils/seed.js');
}

main().catch(console.error).finally(() => prisma.$disconnect());
