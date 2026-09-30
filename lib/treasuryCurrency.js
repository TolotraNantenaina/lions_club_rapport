/** Devises disponibles pour la section Trésorerie (CR V1) */

import { isVisiteLibreReunion } from './reunionTypes';

export const TREASURY_CURRENCIES = [
  { value: 'MGA', label: 'Ariary (MGA)', symbol: 'Ar' },
  { value: 'EUR', label: 'Euro (EUR)', symbol: '€' },
  { value: 'MUR', label: 'Roupie mauricienne (MUR)', symbol: 'Rs' },
];

export function getCurrencySymbol(currencyCode) {
  const found = TREASURY_CURRENCIES.find((c) => c.value === currencyCode);
  return found?.symbol || '';
}

/**
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateTreasuryCurrencyForExport(formData) {
  if (isVisiteLibreReunion(formData?.reunionType)) {
    return { ok: true };
  }
  if (formData?.treasuryCurrency) {
    return { ok: true };
  }
  return {
    ok: false,
    message: 'Veuillez sélectionner une devise dans la section Trésorerie avant d’exporter.',
  };
}
