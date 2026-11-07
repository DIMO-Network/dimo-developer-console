// Why a caller may or may not edit a template, as facts rather than English, so
// the banner can translate it. The service renders the same facts in English
// for the API's refusal message.
export type EntitlementReason =
  | {
      key:
        'curator' | 'licenseUnavailable' | 'manufacturerUnavailable' | 'licenseRequired';
    }
  | {
      key: 'create' | 'licensed';
      via: 'owner' | 'signer';
      tokenId: number;
      alias: string | null;
    }
  | { key: 'manufacturer'; make: string; tokenId: number };

type Values = Record<string, string | number>;
type Translate = (key: string, values?: Values) => string;

const PREFIX = 'templateEditor.entitlement.reason';

// Token ids are passed as strings so they are never digit-grouped.
const valuesOf = (reason: EntitlementReason, t: Translate): Values | undefined => {
  if (reason.key === 'create' || reason.key === 'licensed') {
    const tokenId = String(reason.tokenId);
    const license = reason.alias
      ? t(`${PREFIX}.licenseWithAlias`, { tokenId, alias: reason.alias })
      : t(`${PREFIX}.license`, { tokenId });
    return { via: reason.via, license };
  }
  if (reason.key === 'manufacturer') {
    return { make: reason.make, tokenId: String(reason.tokenId) };
  }
  return undefined;
};

// A create skips a zero count: "nothing has been published yet" and "no cars use
// it yet" are the same fact told twice. Refusals say nothing about vehicles.
const vehiclesText = (
  reason: EntitlementReason,
  mintedVehicles: number | null,
  t: Translate,
): string | null => {
  if (!['curator', 'create', 'licensed', 'manufacturer'].includes(reason.key))
    return null;
  if (mintedVehicles === null) return t(`${PREFIX}.vehiclesUnknown`);
  if (reason.key === 'create' && mintedVehicles === 0) return null;
  return t(`${PREFIX}.vehicles`, { count: mintedVehicles });
};

export const entitlementReasonText = (
  reason: EntitlementReason,
  mintedVehicles: number | null,
  t: Translate,
): string => {
  const text = t(`${PREFIX}.${reason.key}`, valuesOf(reason, t));
  const vehicles = vehiclesText(reason, mintedVehicles, t);
  return vehicles ? t(`${PREFIX}.withVehicles`, { reason: text, vehicles }) : text;
};
