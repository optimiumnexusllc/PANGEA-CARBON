'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;

// ─── Matrice features par plan (source de vérité frontend) ───────────────────
const PLAN_FEATURES = {
  TRIAL: {
    // MRV & Projets
    mrv_calculator: true,
    pdf_reports: false,
    bulk_import: false,
    africa_map: true,
    ai_assistant: false,
    // Marketplace & Finance
    carbon_marketplace: true,
    carbon_tax_engine: true,
    credit_pipeline: true,
    ghg_audit: true,
    // Intégrations
    api_access: true,    // 1 clé max
    equipment_api: false,
    // Admin
    multi_standard: false,
    white_label: false,
    sso_saml: false,
    email_composer: true,
    // Limites
    maxProjects: 3,
    maxUsers: 2,
    maxMW: 50,
    maxApiKeys: 1,
  },
  STARTER: {
    mrv_calculator: true,
    pdf_reports: true,
    bulk_import: true,
    africa_map: true,
    ai_assistant: false,
    carbon_marketplace: true,
    carbon_tax_engine: false,
    credit_pipeline: true,
    ghg_audit: true,
    api_access: true,
    equipment_api: true,
    multi_standard: false,
    white_label: false,
    sso_saml: false,
    email_composer: true,
    maxProjects: 10,
    maxUsers: 5,
    maxMW: 500,
    maxApiKeys: 5,
  },
  GROWTH: {
    mrv_calculator: true,
    pdf_reports: true,
    bulk_import: true,
    africa_map: true,
    ai_assistant: true,
    carbon_marketplace: true,
    carbon_tax_engine: true,
    credit_pipeline: true,
    ghg_audit: true,
    api_access: true,
    equipment_api: true,
    multi_standard: true,
    white_label: false,
    sso_saml: false,
    email_composer: true,
    maxProjects: 50,
    maxUsers: 20,
    maxMW: 5000,
    maxApiKeys: 20,
  },
  ENTERPRISE: {
    mrv_calculator: true,
    pdf_reports: true,
    bulk_import: true,
    africa_map: true,
    ai_assistant: true,
    carbon_marketplace: true,
    carbon_tax_engine: true,
    credit_pipeline: true,
    ghg_audit: true,
    api_access: true,
    equipment_api: true,
    multi_standard: true,
    white_label: true,
    sso_saml: true,
    email_composer: true, // Contrôlé par adminOnly dans le nav
    maxProjects: 999,
    maxUsers: 999,
    maxMW: 999999,
    maxApiKeys: 999,
  },
};

// Features admin-only (indépendant du plan)
const ADMIN_ONLY_FEATURES = ['email_composer'];

export type PlanTier = 'TRIAL' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';

export interface FeatureFlags {
  [key: string]: boolean | number;
}

const DEFAULT_FLAGS = PLAN_FEATURES.TRIAL;

const FeatureFlagsContext = createContext(DEFAULT_FLAGS);
const UserContext = createContext({ role:'ANALYST', plan:'TRIAL', organizationId:null });

export function FeatureFlagsProvider({ children }) {
  const [flags, setFlags] = useState(DEFAULT_FLAGS);
  const [userCtx, setUserCtx] = useState({ role:'ANALYST', plan:'TRIAL', organizationId:null });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Lire l'utilisateur courant pour son rôle et plan
    fetch(`${API}/auth/me`, { headers:{ Authorization:`Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(me => {
        if (!me) return;
        const plan = (me.organization?.plan || me.plan || 'TRIAL') as PlanTier;
        const role = me.role || 'ANALYST';
        const planFlags = PLAN_FEATURES[plan] || PLAN_FEATURES.TRIAL;

        // Flags effectifs selon le rôle et le plan
        const isPlatformAdmin = ['SUPER_ADMIN','ADMIN'].includes(role);
        const isOrgOwner = role === 'ORG_OWNER';
        // SUPER_ADMIN/ADMIN: accès complet plateforme
        // ORG_OWNER: accès complet à son compte (ENTERPRISE) mais sans admin plateforme
        // Autres: accès selon plan
        const effectiveFlags = isPlatformAdmin
          ? { ...PLAN_FEATURES.ENTERPRISE, email_composer: true }
          : isOrgOwner
            ? { ...PLAN_FEATURES.ENTERPRISE, email_composer: false }
            : { ...planFlags };

        setFlags(effectiveFlags);
        setUserCtx({ role, plan, organizationId: me.organizationId });
      })
      .catch(() => {});

    // Aussi charger les feature flags DB (override admin)
    fetch(`${API}/admin/features`, { headers:{ Authorization:`Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(features => {
        if (!Array.isArray(features)) return;
        const overrides = {};
        features.forEach(f => { overrides[f.key] = f.enabled; });
        setFlags(prev => ({ ...prev, ...overrides }));
      })
      .catch(() => {});
  }, []);

  return (
    <FeatureFlagsContext.Provider value={flags}>
      <UserContext.Provider value={userCtx}>
        {children}
      </UserContext.Provider>
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() { return useContext(FeatureFlagsContext); }
export function useUserContext()  { return useContext(UserContext); }
export function useFeature(key)   { return (useContext(FeatureFlagsContext)[key] ?? false) as boolean; }
export function usePlanLimit(key) { return (useContext(FeatureFlagsContext)[key] ?? 0) as number; }

// Plans metadata pour l'UI
export const PLAN_METADATA = {
  TRIAL: {
    name:'Trial', price:'Free', color:'#4A6278',
    description:'14 jours pour tester PANGEA CARBON',
    limits:'3 projets · 2 users · 50 MW',
    badge:'TRIAL',
  },
  STARTER: {
    name:'Starter', price:'$299/mo', color:'#38BDF8',
    description:'Pour les petits développeurs de projets',
    limits:'10 projets · 5 users · 500 MW',
    badge:'STARTER',
  },
  GROWTH: {
    name:'Growth', price:'$799/mo', color:'#A78BFA',
    description:'Pour les IPP et développeurs en croissance',
    limits:'50 projets · 20 users · 5 000 MW',
    badge:'GROWTH',
  },
  ENTERPRISE: {
    name:'Enterprise', price:'Custom', color:'#FCD34D',
    description:'Infrastructure complète + SLA 99.9%',
    limits:'Illimité · White-label · SSO · Support dédié',
    badge:'ENTERPRISE',
  },
};
