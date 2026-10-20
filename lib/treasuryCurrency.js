/** Devises disponibles pour la section Trésorerie (CR V1) */

import { isVisiteLibreReunion } from './reunionTypes';

export const TREASURY_CURRENCIES = [
  { value: 'MGA', label: 'Ariary (MGA)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'MUR', label: 'Roupie mauricienne (MUR)' },
];

/** Code affiché devant les montants des comptes locaux (ex. « MUR ») */
export function getCurrencyCode(currencyCode) {
  const found = TREASURY_CURRENCIES.find((c) => c.value === currencyCode);
  return found?.value || '';
}

/** Regroupe les milliers par espaces : « 44235.5 » → « 44 235.5 » */
function groupThousands(value) {
  const text = String(value).trim().replace(/\s+/g, '');
  const match = /^(-?)(\d+)([.,]\d+)?$/.exec(text);
  if (!match) return String(value).trim();
  const [, sign, intPart, decimals = ''] = match;
  const groups = [];
  for (let end = intPart.length; end > 0; end -= 3) {
    groups.unshift(intPart.slice(Math.max(0, end - 3), end));
  }
  return `${sign}${groups.join(' ')}${decimals}`;
}

/**
 * Montant d’un compte local (administratif / œuvre) : « MUR 44 235 ».
 * @returns {string} '' si aucun montant
 */
export function formatLocalAccountAmount(value, currencyCode) {
  if (value === undefined || value === null || String(value).trim() === '') return '';
  const amount = groupThousands(value);
  const code = getCurrencyCode(currencyCode);
  return code ? `${code} ${amount}` : amount;
}

/** La section Trésorerie est-elle à inclure dans le rapport ? (OUI / NON) */
export function isTreasuryEnabled(formData) {
  return formData?.treasuryEnabled === 'OUI';
}

/**
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateTreasuryCurrencyForExport(formData) {
  if (isVisiteLibreReunion(formData?.reunionType)) {
    return { ok: true };
  }
  if (!isTreasuryEnabled(formData)) {
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
