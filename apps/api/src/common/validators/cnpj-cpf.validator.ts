export function validateCnpj(digits: string): boolean {
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calc = (len: number) => {
    let sum = 0;
    let pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += parseInt(digits[len - i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  return (
    calc(12) === parseInt(digits[12]) &&
    calc(13) === parseInt(digits[13])
  );
}

export function validateCpf(digits: string): boolean {
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calcDigit = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += parseInt(digits[i]) * (len + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 || rest === 11 ? 0 : rest;
  };

  return (
    calcDigit(9) === parseInt(digits[9]) &&
    calcDigit(10) === parseInt(digits[10])
  );
}

export function validateCnpjCpf(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 14) return validateCnpj(digits);
  if (digits.length === 11) return validateCpf(digits);
  return false;
}

export function deriveTipoDocumento(digits: string): 'CNPJ' | 'CPF' {
  return digits.length === 14 ? 'CNPJ' : 'CPF';
}

export function formatCnpjCpf(digits: string): string {
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
