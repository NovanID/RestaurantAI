import { getJwtSecret } from './jwt-secret';

describe('getJwtSecret', () => {
  const originalSecret = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('throws an error if JWT_SECRET is not set', () => {
    delete process.env.JWT_SECRET;
    expect(() => getJwtSecret()).toThrow('JWT_SECRET wajib tersedia');
  });

  it('throws an error if JWT_SECRET is less than 32 characters', () => {
    process.env.JWT_SECRET = 'short_secret_123';
    expect(() => getJwtSecret()).toThrow('minimal 32 karakter');
  });

  it('returns secret when it satisfies length requirement', () => {
    const validSecret = 'super_secret_jwt_key_that_is_long_enough_32chars';
    process.env.JWT_SECRET = validSecret;
    expect(getJwtSecret()).toBe(validSecret);
  });
});
