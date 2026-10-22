import { withOutletScope } from './prompts';

describe('withOutletScope', () => {
  it('keeps a chat scoped to its default outlet', () => {
    const prompt = withOutletScope({ name: 'RM Padang Kemang', slug: 'kemang' });

    expect(prompt).toContain('hanya untuk RM Padang Kemang');
    expect(prompt).toContain('outletSlug "kemang"');
    expect(prompt).toContain('jangan menanyakan pilihan cabang');
  });
});
