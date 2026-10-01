'use strict';

const fail = (message) => { throw Object.assign(new Error(message), { statusCode: 422 }); };
// Parse decimal text without multiplying a binary floating-point value.
function scaled(value, places = 2, label = 'Amount') {
  const text = String(value ?? '0').trim();
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match || (match[2] || '').length > places) fail(`${label} must be non-negative with at most ${places} decimal places`);
  const result = BigInt(match[1]) * 10n ** BigInt(places) + BigInt((match[2] || '').padEnd(places, '0'));
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) fail(`${label} is too large`);
  return result;
}
function minor(value, label) { return Number(scaled(value, 2, label)); }
function decimal(value) {
  const n = BigInt(value);
  if (n < 0n || n > BigInt(Number.MAX_SAFE_INTEGER)) fail('Amount is outside the supported range');
  return Number(`${n / 100n}.${String(n % 100n).padStart(2, '0')}`);
}
function roundedProduct(a, b, divisor) { return (a * b + divisor / 2n) / divisor; }
// Percent with up to two decimals -> basis points (18.5 -> 1850).
function basisPoints(value, label = 'Tax rate') {
  const bp = scaled(value, 2, label);
  if (bp > 10000n) fail(`${label} cannot exceed 100%`);
  return Number(bp);
}
// Rules: the discount is spread over lines pro rata (last line takes the rounding remainder),
// GST is charged per line on the discounted taxable value, and TDS is withheld on the total
// taxable value. The customer owes total - TDS; TDS becomes a receivable claimable from the tax authority.
function invoice(items, discount = 0, { tdsRate = 0 } = {}) {
  if (!Array.isArray(items) || !items.length || items.length > 200) fail('Provide between 1 and 200 invoice lines');
  let subtotal = 0n;
  const lines = items.map((item) => {
    const quantity = scaled(item.quantity, 3, 'Quantity');
    const rate = scaled(item.rate, 2, 'Rate');
    if (!quantity || !String(item.description || '').trim()) fail('Each line requires a description and positive quantity');
    const amount = roundedProduct(quantity, rate, 1000n);
    subtotal += amount;
    return { item, quantity, rate, amount, bp: BigInt(basisPoints(item.taxRate || 0)) };
  });
  const discountMinor = scaled(discount, 2, 'Discount');
  if (discountMinor > subtotal) fail('Discount cannot exceed subtotal');
  let remaining = discountMinor; let tax = 0n;
  const normalized = lines.map((l, i) => {
    const share = i === lines.length - 1 ? remaining : (subtotal ? l.amount * discountMinor / subtotal : 0n);
    remaining -= share;
    const taxAmount = roundedProduct(l.amount - share, l.bp, 10000n);
    tax += taxAmount;
    return { description: String(l.item.description).trim().slice(0, 1000), quantity: Number(l.item.quantity), rate: decimal(l.rate), amount: decimal(l.amount), taxableValue: decimal(l.amount - share), taxRate: Number(l.bp) / 100, taxAmount: decimal(taxAmount) };
  });
  const taxable = subtotal - discountMinor;
  const tdsBp = BigInt(basisPoints(tdsRate, 'TDS rate'));
  const tds = roundedProduct(taxable, tdsBp, 10000n);
  const total = taxable + tax;
  return { items: normalized, subtotal: decimal(subtotal), discount: decimal(discountMinor), taxableValue: decimal(taxable), taxTotal: decimal(tax), gstAmount: decimal(tax), tdsRate: Number(tdsBp) / 100, tdsAmount: decimal(tds), total: decimal(total), totalMinor: Number(total), receivable: decimal(total - tds) };
}
module.exports = { minor, decimal, scaled, roundedProduct, basisPoints, invoice };
