'use strict';
// Indian payroll statutory deductions, in integer paise.
//
// IMPORTANT: these are the commonly applied defaults, not legal advice. Rates, wage
// ceilings and Professional Tax slabs change by statute and by state. Verify against
// current law (and your state's PT schedule) before running live payroll, and override
// via the environment variables named below.
//
//   FINANCE_PF_RATE_BP        employee PF rate in basis points (default 1200 = 12%)
//   FINANCE_PF_WAGE_CEILING   monthly PF wage ceiling in rupees (default 15000; 0 = no ceiling)
//   FINANCE_PT_DISABLED       set to "true" where Professional Tax does not apply
//
// Professional Tax here follows the widely used Maharashtra monthly schedule. Other
// states differ; set FINANCE_PT_DISABLED=true and handle PT as a salary-profile
// deduction if your state's slabs are different.

const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const pfRateBp = () => num(process.env.FINANCE_PF_RATE_BP, 1200);
const pfCeilingPaise = () => num(process.env.FINANCE_PF_WAGE_CEILING, 15000) * 100;
const ptEnabled = () => String(process.env.FINANCE_PT_DISABLED || '').toLowerCase() !== 'true';

// Maharashtra monthly Professional Tax: nil up to 7,500; 175 to 10,000; 200 above
// (February is 300 to make the 2,500 annual cap).
const PT_SLABS = [
  { upToPaise: 750000, taxPaise: 0 },
  { upToPaise: 1000000, taxPaise: 17500 },
  { upToPaise: Infinity, taxPaise: 20000 },
];

function professionalTax(grossPaise, month) {
  if (!ptEnabled()) return 0;
  const slab = PT_SLABS.find((s) => grossPaise <= s.upToPaise);
  if (!slab || !slab.taxPaise) return 0;
  // February carries the balancing amount so the year totals the 2,500 cap.
  return month === 2 && slab.taxPaise === 20000 ? 30000 : slab.taxPaise;
}

// PF is computed on basic pay, capped at the wage ceiling unless the ceiling is disabled.
function providentFund(basicPaise) {
  const ceiling = pfCeilingPaise();
  const pensionable = ceiling > 0 ? Math.min(basicPaise, ceiling) : basicPaise;
  return Math.round((pensionable * pfRateBp()) / 10000);
}

// Returns every statutory deduction for one monthly run, plus the profile's own
// deductions, so the caller can post each to its own payable account.
function monthlyDeductions({ basicMinor, grossMinor, profileDeductionMinor = 0, month, tdsMinor = 0 }) {
  const pf = providentFund(basicMinor);
  const pt = professionalTax(grossMinor, month);
  const tds = Math.max(0, Math.round(tdsMinor));
  const other = Math.max(0, Math.round(profileDeductionMinor));
  return {
    pf,
    professionalTax: pt,
    tds,
    other,
    total: pf + pt + tds + other,
    basis: {
      pfRate: pfRateBp() / 100,
      pfCeiling: pfCeilingPaise() / 100,
      professionalTaxApplied: ptEnabled(),
    },
  };
}

module.exports = { monthlyDeductions, providentFund, professionalTax };
