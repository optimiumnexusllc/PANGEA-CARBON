'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;

interface FeatureFlags {
  pdf_reports: boolean;
  africa_map: boolean;
  mrv_calculator: boolean;
  api_access: boolean;
  carbon_marketplace: boolean;
  ai_assistant: boolean;
  bulk_import: boolean;
  multi_standard: boolean;
  white_label: boolean;
  sso_saml: boolean;
  [key: string]: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  pdf_reports: true,
  africa_map: true,
  mrv_calculator: true,
  api_access: false,
  carbon_marketplace: false,
  ai_assistant: false,
  bulk_import: false,
  multi_standard: false,
  white_label: false,
  sso_saml: false,
};

const FeatureFlagsContext = createContext<FeatureFlags>(DEFAULT_FLAGS);

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    fetch(`${API}/admin/features`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(features => {
        if (!Array.isArray(features)) return;
        const map: FeatureFlags = { ...DEFAULT_FLAGS };
        features.forEach((f: any) => { map[f.key] = f.enabled; });
        setFlags(map);
      })
      .catch(() => {}); // Silencieux — utilise les defaults
  }, []);

  return (
    <FeatureFlagsContext.Provider value={flags}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}

export function useFeature(key: string): boolean {
  const flags = useContext(FeatureFlagsContext);
  return flags[key] ?? false;
}
