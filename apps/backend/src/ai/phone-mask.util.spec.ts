import { maskPhone, maskSensitiveData } from './phone-mask.util';

describe('Phone Masking Utility', () => {
  it('masks typical Indonesian mobile numbers preserving prefix and last 4 digits', () => {
    expect(maskPhone('081234567890')).toBe('0812****7890');
    expect(maskPhone('0812-3456-7890')).toBe('0812****7890');
  });

  it('masks sensitive phone keys inside nested tool input objects', () => {
    const input = {
      customerName: 'Sutan Rajo',
      customerPhone: '081288887766',
      partySize: 4,
      nested: {
        phone: '081311112222',
      },
    };
    const masked = maskSensitiveData(input) as any;
    expect(masked.customerName).toBe('Sutan Rajo');
    expect(masked.customerPhone).toBe('0812****7766');
    expect(masked.nested.phone).toBe('0813****2222');
  });
});
