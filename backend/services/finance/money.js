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
function invoice(items, discount = 0) {
  if (!Array.isArray(items) || !items.length || items.length > 200) fail('Provide between 1 and 200 invoice lines');
  let subtotal = 0n;
  const normalized = items.map((item) => {
    const quantity = scaled(item.quantity, 3, 'Quantity');
    const rate = scaled(item.rate, 2, 'Rate');
    if (!quantity || !String(item.description || '').trim()) fail('Each line requires a description and positive quantity');
    const amount = roundedProduct(quantity, rate, 1000n);
    subtotal += amount;
    return { description: String(item.description).trim().slice(0, 1000), quantity: Number(item.quantity), rate: decimal(rate), amount: decimal(amount), taxRate: 0, taxAmount: 0 };
  });
  const discountMinor = scaled(discount, 2, 'Discount');
  if (discountMinor > subtotal) fail('Discount cannot exceed subtotal');
  return { items: normalized, subtotal: decimal(subtotal), discount: decimal(discountMinor), total: decimal(subtotal - discountMinor), totalMinor: Number(subtotal - discountMinor), taxTotal: 0, gstAmount: 0, tdsAmount: 0 };
}
module.exports = { minor, decimal, scaled, roundedProduct, invoice };
