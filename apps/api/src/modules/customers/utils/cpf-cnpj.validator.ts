function validateCpf(digits: string): boolean {
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += +digits[i] * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  if (+digits[9] !== d1) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += +digits[i] * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  return +digits[10] === d2;
}

function validateCnpj(digits: string): boolean {
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;
  const calc = (d: string, len: number): number => {
    let sum = 0;
    let pos = len - 7;
    for (let i = 0; i < len; i++) {
      sum += +d[i] * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return +digits[12] === calc(digits, 12) && +digits[13] === calc(digits, 13);
}

export function validateCpfCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) return validateCpf(digits);
  if (digits.length === 14) return validateCnpj(digits);
  return false;
}

export function extractDigits(value: string): string {
  return value.replace(/\D/g, '');
}
