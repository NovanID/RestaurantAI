export function maskPhone(phone: string): string {
  if (!phone) return phone;
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  const prefixLen = Math.min(4, Math.floor((digits.length - 4) / 2) + 2);
  const prefix = digits.slice(0, prefixLen);
  const suffix = digits.slice(-4);
  const maskLen = Math.max(4, digits.length - prefixLen - 4);
  return `${prefix}${'*'.repeat(maskLen)}${suffix}`;
}

export function maskSensitiveData(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    // Detect typical phone formats (08..., +62...)
    if (/^(\+62|62|08)\d{7,13}$/.test(data.replace(/[-\s]/g, ''))) {
      return maskPhone(data);
    }
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item));
  }
  if (typeof data === 'object') {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (/(phone|nomor_telepon|telepon|customerPhone|no_hp)/i.test(key) && typeof value === 'string') {
        masked[key] = maskPhone(value);
      } else {
        masked[key] = maskSensitiveData(value);
      }
    }
    return masked;
  }
  return data;
}
