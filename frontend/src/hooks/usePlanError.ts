'use client';
/**
 * PANGEA CARBON — Plan Error Hook
 * Intercepts 402 PLAN_REQUIRED responses and shows upgrade modal
 */
import { useState, useCallback } from 'react';
import { UpgradeModal, GATED_FEATURES } from '@/components/PlanGate';

const BACKEND_TO_FEATURE = {
  'esg': 'esg',
  'carbon_tax': 'carbon_tax',
  'email_comp': 'email_composer',
  'marketplace': 'marketplace_sell',
  'reports': 'pdf_reports',
};

export function usePlanError() {
  const [upgradeFeature, setUpgradeFeature] = useState(null);

  const handleApiError = useCallback((error) => {
    if (error?.status === 402 || error?.code === 'PLAN_REQUIRED') {
      const module = error?.required?.[0]?.split('.')?.[0];
      const featureKey = (module && BACKEND_TO_FEATURE[module]) || 'esg';
      setUpgradeFeature(featureKey);
      return true;
    }
    return false;
  }, []);

  return { handleApiError, upgradeFeature, clearUpgrade: () => setUpgradeFeature(null) };
}
