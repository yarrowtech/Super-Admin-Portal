import Button from '../common/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

import { blankLine } from './invoiceTotals';

const inr = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(v) || 0);

// Editable invoice lines. Each line carries its own GST rate, because a single invoice
// can legitimately mix slabs (e.g. 18% services alongside a 5% item).
export default function InvoiceLineItems({ lines, onChange, gstOptions, totals, disabled }) {
  const update = (index, key, value) => onChange(lines.map((l, i) => (i === index ? { ...l, [key]: value } : l)));
  const add = () => onChange([...lines, blankLine()]);
  const remove = (index) => onChange(lines.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-neutral-700 dark:text-neutral-200">Line items</span>
        <Button type="button" size="sm" variant="secondary" onClick={add} disabled={disabled || lines.length >= 200}>
          <span className="material-symbols-outlined mr-1 text-[16px]">add</span>Add line
        </Button>
      </div>

      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr,0.7fr,1fr,1fr]">
              <Input
                label={i === 0 ? 'Description' : undefined}
                aria-label={`Line ${i + 1} description`}
                placeholder="e.g. Consulting services"
                value={line.description}
                onChange={(e) => update(i, 'description', e.target.value)}
                disabled={disabled}
                required
              />
              <Input
                label={i === 0 ? 'Qty' : undefined}
                aria-label={`Line ${i + 1} quantity`}
                type="number" min="0.001" step="0.001"
                value={line.quantity}
                onChange={(e) => update(i, 'quantity', e.target.value)}
                disabled={disabled}
                required
              />
              <Input
                label={i === 0 ? 'Rate' : undefined}
                aria-label={`Line ${i + 1} rate`}
                type="number" min="0" step="0.01"
                value={line.rate}
                onChange={(e) => update(i, 'rate', e.target.value)}
                disabled={disabled}
                required
              />
              <Select
                label={i === 0 ? 'GST' : undefined}
                aria-label={`Line ${i + 1} GST rate`}
                value={String(line.taxRate ?? 0)}
                onChange={(e) => update(i, 'taxRate', e.target.value)}
                disabled={disabled}
                options={gstOptions}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
              <span>
                {inr(totals.perLine[i]?.amount)}
                {Number(line.taxRate) > 0 && <> + {inr(totals.perLine[i]?.tax)} GST</>}
              </span>
              {lines.length > 1 && (
                <button type="button" onClick={() => remove(i)} disabled={disabled} className="font-semibold text-rose-600 hover:underline disabled:opacity-50 dark:text-rose-300">
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
