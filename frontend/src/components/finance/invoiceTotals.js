export const blankLine = () => ({ description: '', quantity: 1, rate: '', taxRate: 0 });

// Mirrors the backend's money.invoice() in integer paise: the discount is spread over
// lines pro rata (last line absorbs the rounding remainder), GST is charged per line on
// the discounted value, and TDS is withheld on the taxable total. Preview only — the
// server recalculates and is the source of truth.
export function previewTotals(lines, discount, tdsRate) {
  const p = (v) => Math.round((Number(v) || 0) * 100);
  const amounts = (lines || []).map((l) => Math.round((Number(l.quantity) || 0) * p(l.rate)));
  const subtotal = amounts.reduce((a, b) => a + b, 0);
  const disc = Math.min(p(discount), subtotal);
  let remaining = disc;
  let tax = 0;
  const perLine = amounts.map((amount, i) => {
    const share = i === amounts.length - 1 ? remaining : (subtotal ? Math.floor((amount * disc) / subtotal) : 0);
    remaining -= share;
    const taxable = amount - share;
    const lineTax = Math.round((taxable * (Number(lines[i].taxRate) || 0)) / 100);
    tax += lineTax;
    return { amount: amount / 100, taxable: taxable / 100, tax: lineTax / 100 };
  });
  const taxable = subtotal - disc;
  const tds = Math.round((taxable * (Number(tdsRate) || 0)) / 100);
  const total = taxable + tax;
  return {
    perLine,
    subtotal: subtotal / 100,
    discount: disc / 100,
    taxable: taxable / 100,
    tax: tax / 100,
    tds: tds / 100,
    total: total / 100,
    receivable: (total - tds) / 100,
  };
}
