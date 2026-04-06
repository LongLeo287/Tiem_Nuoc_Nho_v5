/**
 * inputUtils.ts
 * Các props/handler chuẩn cho <input> để lock chặt kiểu nhập liệu.
 */

/** Chặn tất cả ký tự không phải số nguyên dương (0-9). */
export const onlyPositiveInt = {
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End'];
    if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
  },
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (!/^\d+$/.test(e.clipboardData.getData('text'))) e.preventDefault();
  },
  inputMode: 'numeric' as const,
  pattern: '[0-9]*',
};

/** Chặn tất cả ký tự không phải số (cho phép dấu phẩy/chấm thập phân 1 lần). */
export const onlyDecimal = {
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End', '.', ','];
    if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
    // Chỉ cho 1 dấu thập phân
    const val = (e.target as HTMLInputElement).value;
    if ((e.key === '.' || e.key === ',') && (val.includes('.') || val.includes(','))) e.preventDefault();
  },
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (!/^\d*[.,]?\d*$/.test(e.clipboardData.getData('text'))) e.preventDefault();
  },
  inputMode: 'decimal' as const,
};

/**
 * Dùng cho trường số tiền VNĐ (số nguyên dương, không âm, không e/+/-).
 * Áp cho: giá, số lượng, tổng tiền, v.v.
 */
export const currencyInputProps = {
  ...onlyPositiveInt,
  min: 0,
  step: 1000,
};

/**
 * Dùng cho trường số lượng (số nguyên ≥ 1).
 */
export const quantityInputProps = {
  ...onlyPositiveInt,
  min: 1,
  step: 1,
};
