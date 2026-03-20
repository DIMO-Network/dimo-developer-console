import { siToyota, siFord, siTesla, siBmw, siHonda } from 'simple-icons';

export interface VehicleMake {
  label: string;
  slug: string;
  nodeId: number;
  siPath: string;
  models: { label: string; slug: string }[];
}

export const MAKES: VehicleMake[] = [
  {
    label: 'Toyota',
    slug: 'toyota',
    nodeId: 131,
    siPath: siToyota.path,
    models: [
      { label: 'Camry', slug: 'camry' },
      { label: 'RAV4', slug: 'rav4' },
    ],
  },
  {
    label: 'Ford',
    slug: 'ford',
    nodeId: 41,
    siPath: siFord.path,
    models: [
      { label: 'F-150', slug: 'f-150' },
      { label: 'Mustang', slug: 'mustang' },
    ],
  },
  {
    label: 'Tesla',
    slug: 'tesla',
    nodeId: 130,
    siPath: siTesla.path,
    models: [
      { label: 'Model 3', slug: 'model-3' },
      { label: 'Model Y', slug: 'model-y' },
    ],
  },
  {
    label: 'BMW',
    slug: 'bmw',
    nodeId: 13,
    siPath: siBmw.path,
    models: [
      { label: '3 Series', slug: '3-series' },
      { label: 'X5', slug: 'x5' },
    ],
  },
  {
    label: 'Honda',
    slug: 'honda',
    nodeId: 48,
    siPath: siHonda.path,
    models: [
      { label: 'Civic', slug: 'civic' },
      { label: 'CR-V', slug: 'cr-v' },
    ],
  },
];

export const YEARS = [2022, 2023, 2024, 2025, 2026];

export function buildDeviceDefinitionId(
  makeSlug: string,
  modelSlug: string,
  year: number,
): string {
  return `${makeSlug}-${modelSlug}-${year}`;
}
