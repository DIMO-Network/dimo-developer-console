import { siToyota, siFord, siTesla, siBmw, siHonda } from 'simple-icons';

export interface VehicleModel {
  label: string;
  slug: string;
  years: number[];
}

export interface VehicleMake {
  label: string;
  slug: string;
  nodeId: number;
  siPath: string;
  models: VehicleModel[];
}

export const MAKES: VehicleMake[] = [
  {
    label: 'Toyota',
    slug: 'toyota',
    nodeId: 131,
    siPath: siToyota.path,
    models: [
      { label: '4Runner', slug: '4runner', years: [2022, 2023, 2024] },
      { label: 'RAV4', slug: 'rav4', years: [2022, 2023, 2024] },
    ],
  },
  {
    label: 'Ford',
    slug: 'ford',
    nodeId: 41,
    siPath: siFord.path,
    models: [
      { label: 'F-150', slug: 'f-150', years: [2022, 2023] },
      { label: 'Mustang', slug: 'mustang', years: [2022, 2023] },
    ],
  },
  {
    label: 'Tesla',
    slug: 'tesla',
    nodeId: 130,
    siPath: siTesla.path,
    models: [
      { label: 'Model 3', slug: 'model-3', years: [2022, 2023, 2024, 2025, 2026] },
      { label: 'Model Y', slug: 'model-y', years: [2022, 2023, 2024, 2025, 2026] },
    ],
  },
  {
    label: 'BMW',
    slug: 'bmw',
    nodeId: 13,
    siPath: siBmw.path,
    models: [
      { label: '3 Series', slug: '3-series', years: [2024, 2025] },
      { label: 'X5', slug: 'x5', years: [2022, 2023] },
    ],
  },
  {
    label: 'Honda',
    slug: 'honda',
    nodeId: 48,
    siPath: siHonda.path,
    models: [
      { label: 'Civic', slug: 'civic', years: [2022, 2023] },
      { label: 'CR-V', slug: 'cr-v', years: [2022, 2023, 2024] },
    ],
  },
];

export function buildDeviceDefinitionId(
  makeSlug: string,
  modelSlug: string,
  year: number,
): string {
  return `${makeSlug}_${modelSlug}_${year}`;
}
