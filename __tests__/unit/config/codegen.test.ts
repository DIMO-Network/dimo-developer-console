/**
 * @jest-environment node
 */
import { loadDocuments } from '@graphql-tools/load';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import codegenConfig from '@/codegen';

// graphql-codegen validates every document it finds against Identity's schema. A
// test's own query (src/hoc/__tests__/withApollo.test.tsx has one) fails that check,
// and `npm run compile`, which `npm run dev` runs first, exits without generating.
describe('codegen documents', () => {
  it('reads app code only, never test files', async () => {
    const sources = await loadDocuments(codegenConfig.documents as string[], {
      loaders: [new CodeFileLoader({ pluckConfig: { skipIndent: true } })],
      cwd: process.cwd(),
    });
    const files = sources.map((source) => source.location ?? '');

    expect(files.length).toBeGreaterThan(0);
    expect(files.filter((file) => /__tests__|\.test\.tsx?$/.test(file))).toEqual([]);
  });
});
