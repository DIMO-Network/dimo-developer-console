import { AxiosError } from 'axios';

jest.mock('@/services/brand', () => ({
  createMyBrand: jest.fn(),
  updateMyBrandById: jest.fn(),
  uploadBrandAsset: jest.fn(),
}));
import { createMyBrand, updateMyBrandById, uploadMyBrandAsset } from '@/actions/brand';
import * as brandService from '@/services/brand';

const refused = (status: number, data: object) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data,
  } as never);

const brand = { id: 'b1', name: 'Fleet App' };
const file = new File(['x'], 'logo.png', { type: 'image/png' });

// Next masks whatever a Server Action throws and Axios fields never reach the
// browser, so what the form must act on has to come back as a value.
describe('brand Server Actions', () => {
  it('return the saved brand', async () => {
    (brandService.createMyBrand as jest.Mock).mockResolvedValue(brand);

    await expect(createMyBrand('ws-1', { name: 'Fleet App' })).resolves.toEqual({
      ok: true,
      data: brand,
    });
  });

  it('return a refusal the form can read, when creating', async () => {
    (brandService.createMyBrand as jest.Mock).mockRejectedValue(
      refused(409, { message: 'Taken', code: 'BRAND_NAME_TAKEN' }),
    );

    await expect(createMyBrand('ws-1', { name: 'Fleet App' })).resolves.toEqual({
      ok: false,
      status: 409,
      code: 'BRAND_NAME_TAKEN',
      message: 'Taken',
    });
  });

  it('return a refusal the form can read, when renaming', async () => {
    (brandService.updateMyBrandById as jest.Mock).mockRejectedValue(
      refused(409, { message: 'Taken', code: 'BRAND_NAME_TAKEN' }),
    );

    await expect(
      updateMyBrandById('ws-1', 'b1', { name: 'Fleet App' }),
    ).resolves.toMatchObject({ ok: false, code: 'BRAND_NAME_TAKEN' });
  });

  it('return a refused upload the same way', async () => {
    (brandService.uploadBrandAsset as jest.Mock).mockRejectedValue(
      refused(400, { error: 'unsupported content-type' }),
    );

    await expect(uploadMyBrandAsset('ws-1', file)).resolves.toMatchObject({
      ok: false,
      status: 400,
    });
  });
});
