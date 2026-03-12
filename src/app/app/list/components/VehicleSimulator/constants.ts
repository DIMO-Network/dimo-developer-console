export interface VehicleMake {
  label: string;
  slug: string;
  nodeId: number;
  models: { label: string; slug: string }[];
}

export const MAKES: VehicleMake[] = [
  {
    label: 'Toyota',
    slug: 'toyota',
    nodeId: 131,
    models: [
      { label: 'Camry', slug: 'camry' },
      { label: 'RAV4', slug: 'rav4' },
    ],
  },
  {
    label: 'Ford',
    slug: 'ford',
    nodeId: 41,
    models: [
      { label: 'F-150', slug: 'f-150' },
      { label: 'Mustang', slug: 'mustang' },
    ],
  },
  {
    label: 'Tesla',
    slug: 'tesla',
    nodeId: 130,
    models: [
      { label: 'Model 3', slug: 'model-3' },
      { label: 'Model Y', slug: 'model-y' },
    ],
  },
  {
    label: 'BMW',
    slug: 'bmw',
    nodeId: 13,
    models: [
      { label: '3 Series', slug: '3-series' },
      { label: 'X5', slug: 'x5' },
    ],
  },
  {
    label: 'Honda',
    slug: 'honda',
    nodeId: 48,
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
