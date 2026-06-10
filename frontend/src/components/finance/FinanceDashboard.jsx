import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { financeApi } from '../../services/finance';

const tabOptions = [
  { id: 'accounts', label: 'Chart of Accounts' },
  { id: 'journals', label: 'Journal Entries' },
  { id: 'erp-reports', label: 'ERP Reports' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'payments', label: 'Payments' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'budgets', label: 'Budgets' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'reports', label: 'Reports' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'vendors', label: 'Vendors' },
  { id: 'clients', label: 'Clients' }
];

const TAB_ALIAS = {
  overview: 'invoices',
  transactions: 'payments',
  audit: 'reports',
  approvals: 'budgets',
  settings: 'compliance',
};

const FinanceDashboard = ({ activeTab: externalActiveTab, onTabChange }) => {
  const { token, user } = useAuth();
  const [localActiveTab, setLocalActiveTab] = useState('invoices');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [reports, setReports] = useState([]);
  const [compliance, setCompliance] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [clients, setClients] = useState([]);
  const [invoiceNotes, setInvoiceNotes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [trialBalance, setTrialBalance] = useState({ rows: [], totals: { debit: 0, credit: 0 } });
  const [balanceSheet, setBalanceSheet] = useState({ assets: 0, liabilities: 0, equity: 0 });
  const [profitLoss, setProfitLoss] = useState({ revenue: 0, expenses: 0, netIncome: 0 });
  const [taxSummary, setTaxSummary] = useState({ taxableSales: 0, gstCollected: 0, tdsWithheld: 0 });
  const [itrSummary, setItrSummary] = useState({ totalIncome: 0, totalExpenses: 0, taxableIncome: 0, estimatedTax: 0 });
  const [auditLogs, setAuditLogs] = useState([]);
  const [approvalItems, setApprovalItems] = useState([]);

  const [invoiceForm, setInvoiceForm] = useState({
    clientName: '',
    clientEmail: '',
    status: 'draft',
    dueDate: '',
    description: '',
    quantity: 1,
    rate: 0,
    taxRate: 0,
    gstRate: 18,
    tdsRate: 0,
    discount: 0
  });
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [noteForm, setNoteForm] = useState({
    invoiceId: '',
    type: 'credit',
    amount: 0,
    reason: ''
  });
  const [paymentForm, setPaymentForm] = useState({
    invoice: '',
    customerName: '',
    amount: 0,
    method: 'bank',
    reference: ''
  });
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: '',
    amount: 0,
    status: 'submitted',
    department: ''
  });
  const [budgetForm, setBudgetForm] = useState({
    department: '',
    fiscalYear: '',
    allocated: 0,
    spent: 0,
    notes: ''
  });
  const [costCenterForm, setCostCenterForm] = useState({
    name: '',
    code: '',
    department: '',
    budget: 0,
    spent: 0
  });
  const [payrollForm, setPayrollForm] = useState({
    employeeName: '',
    periodStart: '',
    periodEnd: '',
    grossPay: 0,
    deductions: 0,
    status: 'draft'
  });
  const [reportForm, setReportForm] = useState({
    type: 'profit-loss',
    periodStart: '',
    periodEnd: '',
    summary: ''
  });
  const [complianceForm, setComplianceForm] = useState({
    type: 'gst',
    periodLabel: '',
    dueDate: '',
    status: 'pending',
    reference: ''
  });
  const [vendorForm, setVendorForm] = useState({
    name: '',
    contactEmail: '',
    paymentTerms: '',
    balance: 0
  });
  const [clientForm, setClientForm] = useState({
    name: '',
    contactEmail: '',
    paymentTerms: '',
    balance: 0
  });
  const [accountForm, setAccountForm] = useState({
    code: '',
    name: '',
    type: 'asset',
    normalBalance: 'debit'
  });
  const [journalForm, setJournalForm] = useState({
    memo: '',
    entryDate: '',
    debitAccount: '',
    creditAccount: '',
    amount: 0
  });

  useEffect(() => {
    const fetchAll = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      const requests = [
        financeApi.getDashboard(token),
        financeApi.getAccounts(token),
        financeApi.getJournalEntries(token),
        financeApi.getInvoices(token),
        financeApi.getInvoiceNotes(token),
        financeApi.getPayments(token),
        financeApi.getExpenses(token),
        financeApi.getBudgets(token),
        financeApi.getCostCenters(token),
        financeApi.getPayrolls(token),
        financeApi.getReports(token),
        financeApi.getTrialBalance(token),
        financeApi.getBalanceSheet(token),
        financeApi.getProfitLoss(token),
        financeApi.getTaxSummary(token),
        financeApi.getItrSummary(token),
        financeApi.getCompliance(token),
        financeApi.getVendors(token),
        financeApi.getClients(token),
        financeApi.getAuditLogs(token, { page: 1, limit: 25 }),
        financeApi.getApprovals(token, { page: 1, limit: 25 })
      ];

      const results = await Promise.allSettled(requests);
      const [
        dashboardRes,
        accountsRes,
        journalsRes,
        invoicesRes,
        invoiceNotesRes,
        paymentsRes,
        expensesRes,
        budgetsRes,
        costCentersRes,
        payrollsRes,
        reportsRes,
        trialBalanceRes,
        balanceSheetRes,
        profitLossRes,
        taxSummaryRes,
        itrSummaryRes,
        complianceRes,
        vendorsRes,
        clientsRes,
        auditLogsRes,
        approvalsRes
      ] = results;

      const setIfOk = (result, setter, fallback = []) => {
        if (result.status === 'fulfilled') {
          setter(result.value?.data || fallback);
        } else {
          setter(fallback);
          setError(result.reason?.message || 'Failed to load finance data');
        }
      };

      if (dashboardRes.status === 'fulfilled') {
        setDashboard(dashboardRes.value?.data || null);
      } else {
        setDashboard(null);
      }

      setIfOk(invoicesRes, setInvoices);
      setIfOk(invoiceNotesRes, setInvoiceNotes);
      setIfOk(paymentsRes, setPayments);
      setIfOk(expensesRes, setExpenses);
      setIfOk(budgetsRes, setBudgets);
      setIfOk(costCentersRes, setCostCenters);
      setIfOk(payrollsRes, setPayrolls);
      setIfOk(reportsRes, setReports);
      setIfOk(accountsRes, setAccounts);
      setIfOk(journalsRes, setJournalEntries);
      if (trialBalanceRes.status === 'fulfilled') {
        setTrialBalance(trialBalanceRes.value?.data || { rows: [], totals: { debit: 0, credit: 0 } });
      }
      if (balanceSheetRes.status === 'fulfilled') {
        setBalanceSheet(balanceSheetRes.value?.data || { assets: 0, liabilities: 0, equity: 0 });
      }
      if (profitLossRes.status === 'fulfilled') {
        setProfitLoss(profitLossRes.value?.data || { revenue: 0, expenses: 0, netIncome: 0 });
      }
      if (taxSummaryRes.status === 'fulfilled') {
        setTaxSummary(taxSummaryRes.value?.data || { taxableSales: 0, gstCollected: 0, tdsWithheld: 0 });
      }
      if (itrSummaryRes.status === 'fulfilled') {
        setItrSummary(itrSummaryRes.value?.data || { totalIncome: 0, totalExpenses: 0, taxableIncome: 0, estimatedTax: 0 });
      }
      setIfOk(complianceRes, setCompliance);
      setIfOk(vendorsRes, setVendors);
      setIfOk(clientsRes, setClients);
      if (auditLogsRes.status === 'fulfilled') {
        setAuditLogs(auditLogsRes.value?.data?.items || []);
      }
      if (approvalsRes.status === 'fulfilled') {
        setApprovalItems(approvalsRes.value?.data?.items || []);
      }

      setLoading(false);
    };

    fetchAll();
  }, [token]);

  const isControlled = typeof externalActiveTab === 'string';
  const activeTab = isControlled ? externalActiveTab : localActiveTab;
  const contentTab = TAB_ALIAS[activeTab] || activeTab;

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(
      Number(value || 0)
    );

  const handleTabChange = (tabId) => {
    if (isControlled) {
      onTabChange?.(tabId);
      return;
    }
    setLocalActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const getInvoiceTotal = (invoice) => {
    const numericTotal = Number(invoice?.total ?? invoice?.amount ?? invoice?.totalAmount);
    if (!Number.isNaN(numericTotal) && numericTotal > 0) return numericTotal;
    const items = invoice?.items || [];
    const base = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0), 0);
    const discount = Number(invoice?.discount || 0);
    const taxRate = Number(invoice?.gstRate ?? items?.[0]?.taxRate ?? invoice?.taxRate ?? 0);
    const taxable = Math.max(base - discount, 0);
    const tax = (taxRate / 100) * taxable;
    return taxable + tax;
  };

  const invoiceMetrics = useMemo(() => {
    const now = new Date();
    const metrics = {
      totalAmount: 0,
      overdueAmount: 0,
      outstandingAmount: 0,
      overdueCount: 0,
      totalCount: invoices.length
    };

    invoices.forEach((invoice) => {
      const total = getInvoiceTotal(invoice);
      const balanceDue = Number(invoice?.balanceDue ?? (invoice?.status === 'paid' ? 0 : total));
      metrics.totalAmount += Number(total) || 0;
      metrics.outstandingAmount += Number(balanceDue) || 0;

      const dueDate = invoice?.dueDate ? new Date(invoice.dueDate) : null;
      if (dueDate && dueDate < now && invoice?.status !== 'paid' && balanceDue > 0) {
        metrics.overdueAmount += Number(balanceDue) || 0;
        metrics.overdueCount += 1;
      }
    });

    return metrics;
  }, [invoices]);

  const paymentTotal = useMemo(
    () => payments.reduce((sum, payment) => sum + Number(payment?.amount || 0), 0),
    [payments]
  );

  const expenseMetrics = useMemo(() => {
    const pendingStatuses = new Set(['submitted', 'pending']);
    let pendingAmount = 0;
    let pendingCount = 0;

    expenses.forEach((expense) => {
      const amount = Number(expense?.amount || 0);
      if (pendingStatuses.has(expense?.status)) {
        pendingAmount += amount;
        pendingCount += 1;
      }
    });

    return { pendingAmount, pendingCount };
  }, [expenses]);

  const outstandingInvoices = useMemo(
    () => invoices.filter((invoice) => Number(invoice.balanceDue || 0) > 0 && invoice.status !== 'paid'),
    [invoices]
  );

  const agingBuckets = useMemo(() => {
    const now = new Date();
    const buckets = {
      current: { label: 'Current', amount: 0, count: 0 },
      bucket1: { label: '1-30', amount: 0, count: 0 },
      bucket2: { label: '31-60', amount: 0, count: 0 },
      bucket3: { label: '61-90', amount: 0, count: 0 },
      bucket4: { label: '90+', amount: 0, count: 0 }
    };

    outstandingInvoices.forEach((invoice) => {
      const balance = Number(invoice?.balanceDue ?? getInvoiceTotal(invoice));
      if (!Number.isFinite(balance) || balance <= 0) return;
      const dueDate = invoice?.dueDate ? new Date(invoice.dueDate) : null;
      if (!dueDate || dueDate >= now) {
        buckets.current.amount += balance;
        buckets.current.count += 1;
        return;
      }
      const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
      if (daysOverdue <= 30) {
        buckets.bucket1.amount += balance;
        buckets.bucket1.count += 1;
      } else if (daysOverdue <= 60) {
        buckets.bucket2.amount += balance;
        buckets.bucket2.count += 1;
      } else if (daysOverdue <= 90) {
        buckets.bucket3.amount += balance;
        buckets.bucket3.count += 1;
      } else {
        buckets.bucket4.amount += balance;
        buckets.bucket4.count += 1;
      }
    });

    return Object.values(buckets);
  }, [outstandingInvoices]);

  const expenseSummary = useMemo(() => {
    let totalAmount = 0;
    let verifiedAmount = 0;
    let verifiedCount = 0;
    let pendingCount = 0;

    expenses.forEach((expense) => {
      const amount = Number(expense?.amount || 0);
      totalAmount += amount;
      if (expense?.status === 'verified') {
        verifiedAmount += amount;
        verifiedCount += 1;
      }
      if (expense?.status === 'submitted' || expense?.status === 'pending') {
        pendingCount += 1;
      }
    });

    return {
      totalAmount,
      verifiedAmount,
      verifiedCount,
      pendingCount
    };
  }, [expenses]);

  const kpis = useMemo(() => {
    const revenue = Number(profitLoss?.revenue || 0);
    const totalExpenses = Number(profitLoss?.expenses || expenseSummary.totalAmount || 0);
    const net = Number(profitLoss?.netIncome || 0);
    const pendingPayments = Number(invoiceMetrics.outstandingAmount || 0);
    const burnRate = revenue > 0 ? (totalExpenses / revenue) * 100 : 0;
    return [
      {
        label: 'Revenue',
        value: formatCurrency(revenue),
        subValue: `${Math.max(invoices.length, 0)}`,
        subLabel: 'invoices'
      },
      {
        label: 'Expenses',
        value: formatCurrency(totalExpenses),
        subValue: `${expenseSummary.pendingCount}`,
        subLabel: 'pending items'
      },
      {
        label: 'Profit / Loss',
        value: formatCurrency(net),
        subValue: net >= 0 ? 'Profit' : 'Loss',
        subLabel: 'net position'
      },
      {
        label: 'Pending Payments',
        value: formatCurrency(pendingPayments),
        subValue: `${invoiceMetrics.overdueCount}`,
        subLabel: 'overdue invoices'
      },
      {
        label: 'Burn Rate',
        value: `${burnRate.toFixed(1)}%`,
        subValue: formatCurrency(expenseSummary.pendingAmount),
        subLabel: 'pending burn'
      },
    ];
  }, [expenseSummary, formatCurrency, invoices.length, invoiceMetrics, profitLoss]);

  const customerBalances = useMemo(() => {
    const map = {};
    outstandingInvoices.forEach((invoice) => {
      const name = invoice.clientName || 'Unknown';
      map[name] = (map[name] || 0) + Number(invoice.balanceDue || 0);
    });
    return Object.entries(map)
      .map(([name, balance]) => ({ name, balance }))
      .sort((a, b) => b.balance - a.balance);
  }, [outstandingInvoices]);

  const invoiceStatusLabel = (invoice) => {
    if (invoice.status === 'sent') return 'unpaid';
    return invoice.status || 'draft';
  };

  const createInvoice = async () => {
    if (!token) return;
      const payload = {
        clientName: invoiceForm.clientName,
        clientEmail: invoiceForm.clientEmail,
        status: invoiceForm.status,
        dueDate: invoiceForm.dueDate || undefined,
        discount: Number(invoiceForm.discount) || 0,
        items: [
          {
            description: invoiceForm.description,
            quantity: Number(invoiceForm.quantity) || 0,
            rate: Number(invoiceForm.rate) || 0,
            taxRate: Number(invoiceForm.gstRate ?? invoiceForm.taxRate) || 0
          }
        ]
      };
      payload.gstRate = Number(invoiceForm.gstRate) || 0;
      payload.tdsRate = Number(invoiceForm.tdsRate) || 0;
    if (editingInvoiceId) {
      const res = await financeApi.updateInvoice(editingInvoiceId, payload, token);
      setInvoices((prev) => prev.map((item) => (item._id === editingInvoiceId ? res.data : item)));
    } else {
      const res = await financeApi.createInvoice(payload, token);
      setInvoices((prev) => [res.data, ...prev]);
    }
      setInvoiceForm({
        clientName: '',
        clientEmail: '',
        status: 'draft',
        dueDate: '',
        description: '',
        quantity: 1,
        rate: 0,
        taxRate: 0,
        gstRate: 18,
        tdsRate: 0,
        discount: 0
      });
    setEditingInvoiceId(null);
  };

  const markInvoicePaid = async (invoiceId) => {
    if (!token) return;
    const res = await financeApi.updateInvoice(invoiceId, { status: 'paid' }, token);
    setInvoices((prev) => prev.map((item) => (item._id === invoiceId ? res.data : item)));
  };

  const startInvoiceEdit = (invoice) => {
    setEditingInvoiceId(invoice._id);
    const firstItem = invoice.items?.[0] || {};
    setInvoiceForm({
      clientName: invoice.clientName || '',
      clientEmail: invoice.clientEmail || '',
      status: invoice.status || 'draft',
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
        description: firstItem.description || '',
        quantity: firstItem.quantity || 1,
        rate: firstItem.rate || 0,
        taxRate: firstItem.taxRate || 0,
        gstRate: invoice.gstRate ?? firstItem.taxRate ?? 18,
        tdsRate: invoice.tdsRate || 0,
        discount: invoice.discount || 0
      });
  };

  const createInvoiceNote = async () => {
    if (!token || !noteForm.invoiceId) return;
    const payload = {
      type: noteForm.type,
      amount: Number(noteForm.amount) || 0,
      reason: noteForm.reason
    };
    const res = await financeApi.createInvoiceNote(noteForm.invoiceId, payload, token);
    setInvoiceNotes((prev) => [res.data, ...prev]);
    setNoteForm({ invoiceId: '', type: 'credit', amount: 0, reason: '' });
  };

  const createPayment = async () => {
    if (!token) return;
    const payload = {
      invoice: paymentForm.invoice || undefined,
      customerName: paymentForm.customerName,
      amount: Number(paymentForm.amount) || 0,
      method: paymentForm.method,
      reference: paymentForm.reference
    };
    const res = await financeApi.createPayment(payload, token);
    setPayments((prev) => [res.data, ...prev]);
    setPaymentForm({ invoice: '', customerName: '', amount: 0, method: 'bank', reference: '' });
  };

  const reconcilePayment = async (paymentId) => {
    if (!token) return;
    const res = await financeApi.updatePayment(paymentId, { status: 'reconciled' }, token);
    setPayments((prev) => prev.map((item) => (item._id === paymentId ? res.data : item)));
  };

  const createExpense = async () => {
    if (!token) return;
    const payload = {
      title: expenseForm.title,
      category: expenseForm.category,
      amount: Number(expenseForm.amount) || 0,
      status: expenseForm.status,
      department: expenseForm.department
    };
    const res = await financeApi.createExpense(payload, token);
    setExpenses((prev) => [res.data, ...prev]);
    setExpenseForm({ title: '', category: '', amount: 0, status: 'submitted', department: '' });
  };

  const verifyExpense = async (expenseId) => {
    if (!token) return;
    const res = await financeApi.updateExpense(expenseId, { status: 'verified' }, token);
    setExpenses((prev) => prev.map((item) => (item._id === expenseId ? res.data : item)));
  };

  const createBudget = async () => {
    if (!token) return;
    const payload = {
      department: budgetForm.department,
      fiscalYear: budgetForm.fiscalYear,
      allocated: Number(budgetForm.allocated) || 0,
      spent: Number(budgetForm.spent) || 0,
      notes: budgetForm.notes
    };
    const res = await financeApi.createBudget(payload, token);
    setBudgets((prev) => [res.data, ...prev]);
    setBudgetForm({ department: '', fiscalYear: '', allocated: 0, spent: 0, notes: '' });
  };

  const createCostCenter = async () => {
    if (!token) return;
    const payload = {
      name: costCenterForm.name,
      code: costCenterForm.code,
      department: costCenterForm.department,
      budget: Number(costCenterForm.budget) || 0,
      spent: Number(costCenterForm.spent) || 0
    };
    const res = await financeApi.createCostCenter(payload, token);
    setCostCenters((prev) => [res.data, ...prev]);
    setCostCenterForm({ name: '', code: '', department: '', budget: 0, spent: 0 });
  };

  const createPayroll = async () => {
    if (!token) return;
    const payload = {
      employeeName: payrollForm.employeeName,
      periodStart: payrollForm.periodStart,
      periodEnd: payrollForm.periodEnd,
      grossPay: Number(payrollForm.grossPay) || 0,
      deductions: Number(payrollForm.deductions) || 0,
      status: payrollForm.status
    };
    const res = await financeApi.createPayroll(payload, token);
    setPayrolls((prev) => [res.data, ...prev]);
    setPayrollForm({
      employeeName: '',
      periodStart: '',
      periodEnd: '',
      grossPay: 0,
      deductions: 0,
      status: 'draft'
    });
  };

  const createReport = async () => {
    if (!token) return;
    const payload = {
      type: reportForm.type,
      periodStart: reportForm.periodStart,
      periodEnd: reportForm.periodEnd,
      summary: reportForm.summary
    };
    const res = await financeApi.createReport(payload, token);
    setReports((prev) => [res.data, ...prev]);
    setReportForm({ type: 'profit-loss', periodStart: '', periodEnd: '', summary: '' });
  };

  const createCompliance = async () => {
    if (!token) return;
    const payload = {
      type: complianceForm.type,
      periodLabel: complianceForm.periodLabel,
      dueDate: complianceForm.dueDate,
      status: complianceForm.status,
      reference: complianceForm.reference
    };
    const res = await financeApi.createCompliance(payload, token);
    setCompliance((prev) => [res.data, ...prev]);
    setComplianceForm({ type: 'gst', periodLabel: '', dueDate: '', status: 'pending', reference: '' });
  };

  const createVendor = async () => {
    if (!token) return;
    const payload = {
      name: vendorForm.name,
      contactEmail: vendorForm.contactEmail,
      paymentTerms: vendorForm.paymentTerms,
      balance: Number(vendorForm.balance) || 0
    };
    const res = await financeApi.createVendor(payload, token);
    setVendors((prev) => [res.data, ...prev]);
    setVendorForm({ name: '', contactEmail: '', paymentTerms: '', balance: 0 });
  };

  const createClient = async () => {
    if (!token) return;
    const payload = {
      name: clientForm.name,
      contactEmail: clientForm.contactEmail,
      paymentTerms: clientForm.paymentTerms,
      balance: Number(clientForm.balance) || 0
    };
    const res = await financeApi.createClient(payload, token);
    setClients((prev) => [res.data, ...prev]);
    setClientForm({ name: '', contactEmail: '', paymentTerms: '', balance: 0 });
  };

  const createAccount = async () => {
    if (!token) return;
    const payload = {
      code: accountForm.code,
      name: accountForm.name,
      type: accountForm.type,
      normalBalance: accountForm.normalBalance
    };
    const res = await financeApi.createAccount(payload, token);
    setAccounts((prev) => [...prev, res.data]);
    setAccountForm({ code: '', name: '', type: 'asset', normalBalance: 'debit' });
  };

  const createJournalEntry = async () => {
    if (!token) return;
    const amount = Number(journalForm.amount) || 0;
    const payload = {
      memo: journalForm.memo,
      entryDate: journalForm.entryDate || undefined,
      lines: [
        { account: journalForm.debitAccount, debit: amount, credit: 0 },
        { account: journalForm.creditAccount, debit: 0, credit: amount }
      ]
    };
    const res = await financeApi.createJournalEntry(payload, token);
    setJournalEntries((prev) => [res.data, ...prev]);
    setJournalForm({ memo: '', entryDate: '', debitAccount: '', creditAccount: '', amount: 0 });
  };

  const postJournalEntry = async (entryId) => {
    if (!token) return;
    const res = await financeApi.postJournalEntry(entryId, token);
    setJournalEntries((prev) => prev.map((item) => (item._id === entryId ? res.data : item)));
    const [trial, sheet, pl] = await Promise.all([
      financeApi.getTrialBalance(token),
      financeApi.getBalanceSheet(token),
      financeApi.getProfitLoss(token)
    ]);
    setTrialBalance(trial.data || { rows: [], totals: { debit: 0, credit: 0 } });
    setBalanceSheet(sheet.data || { assets: 0, liabilities: 0, equity: 0 });
    setProfitLoss(pl.data || { revenue: 0, expenses: 0, netIncome: 0 });
  };

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-neutral-600 dark:text-neutral-400">Loading finance module...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
      <div className="mx-auto max-w-6xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-neutral-800 dark:text-neutral-100">Finance Module</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Welcome back{user?.firstName ? `, ${user.firstName}` : ''}. Manage billing, payments, budgets and compliance.
            </p>
          </div>
          <div className="rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-neutral-800">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Today</p>
            <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
              {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((item) => (
            <div key={item.label} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{item.label}</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{item.value}</p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {item.subValue} {item.subLabel}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Revenue</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(profitLoss.revenue)}</p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Profit & loss</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Expenses</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(profitLoss.expenses)}</p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Operational spend</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Net Income</p>
            <p
              className={`text-2xl font-bold ${
                profitLoss.netIncome >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(profitLoss.netIncome)}
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">After expenses</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Equity</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(balanceSheet.equity)}</p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Balance sheet</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr,1fr]">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Receivables aging</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Open invoice balances by overdue band</p>
              </div>
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                {outstandingInvoices.length} open
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {agingBuckets.map((bucket) => (
                <div key={bucket.label} className="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700">
                  <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{bucket.label} days</p>
                  <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
                    {formatCurrency(bucket.amount)}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{bucket.count} invoices</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Expense snapshot</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Verified vs pending expenses</p>
              </div>
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{expenses.length} entries</p>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700">
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Total submitted</p>
                <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
                  {formatCurrency(expenseSummary.totalAmount)}
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700">
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Verified</p>
                <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
                  {formatCurrency(expenseSummary.verifiedAmount)}
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{expenseSummary.verifiedCount} items</p>
              </div>
              <div className="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700">
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Pending review</p>
                <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
                  {formatCurrency(expenseMetrics.pendingAmount)}
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{expenseSummary.pendingCount} items</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {tabOptions.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'bg-white text-neutral-700 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'accounts' && (
          <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Chart of Accounts</h2>
              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Account code"
                  value={accountForm.code}
                  onChange={(e) => setAccountForm((prev) => ({ ...prev, code: e.target.value }))}
                />
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Account name"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    value={accountForm.type}
                    onChange={(e) => setAccountForm((prev) => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="asset">Asset</option>
                    <option value="liability">Liability</option>
                    <option value="equity">Equity</option>
                    <option value="revenue">Revenue</option>
                    <option value="expense">Expense</option>
                  </select>
                  <select
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    value={accountForm.normalBalance}
                    onChange={(e) => setAccountForm((prev) => ({ ...prev, normalBalance: e.target.value }))}
                  >
                    <option value="debit">Debit</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={createAccount}
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Save Account
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Accounts</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{accounts.length} records</p>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-neutral-500">
                    <tr>
                      <th className="py-2">Code</th>
                      <th className="py-2">Name</th>
                      <th className="py-2">Type</th>
                      <th className="py-2">Normal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => (
                      <tr key={account._id} className="border-t border-neutral-100 dark:border-neutral-700">
                        <td className="py-2 font-semibold text-neutral-800 dark:text-neutral-100">{account.code}</td>
                        <td className="py-2 text-neutral-600 dark:text-neutral-300">{account.name}</td>
                        <td className="py-2 text-neutral-500">{account.type}</td>
                        <td className="py-2 text-neutral-500">{account.normalBalance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'journals' && (
          <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Journal Entry</h2>
              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Memo"
                  value={journalForm.memo}
                  onChange={(e) => setJournalForm((prev) => ({ ...prev, memo: e.target.value }))}
                />
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  type="date"
                  value={journalForm.entryDate}
                  onChange={(e) => setJournalForm((prev) => ({ ...prev, entryDate: e.target.value }))}
                />
                <select
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  value={journalForm.debitAccount}
                  onChange={(e) => setJournalForm((prev) => ({ ...prev, debitAccount: e.target.value }))}
                >
                  <option value="">Select debit account</option>
                  {accounts.map((account) => (
                    <option key={account._id} value={account._id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  value={journalForm.creditAccount}
                  onChange={(e) => setJournalForm((prev) => ({ ...prev, creditAccount: e.target.value }))}
                >
                  <option value="">Select credit account</option>
                  {accounts.map((account) => (
                    <option key={account._id} value={account._id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  type="number"
                  placeholder="Amount"
                  value={journalForm.amount}
                  onChange={(e) => setJournalForm((prev) => ({ ...prev, amount: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={createJournalEntry}
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Save Entry
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Journal Register</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{journalEntries.length} records</p>
              </div>
              <div className="mt-4 space-y-3">
                {journalEntries.map((entry) => (
                  <div key={entry._id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-neutral-800 dark:text-neutral-100">{entry.entryNumber}</p>
                        <p className="text-xs text-neutral-500">{entry.memo || 'No memo'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                          {formatCurrency(entry.totalDebit)}
                        </p>
                        <p className="text-xs text-neutral-500">{entry.status}</p>
                      </div>
                    </div>
                    {entry.status !== 'posted' && (
                      <button
                        type="button"
                        onClick={() => postJournalEntry(entry._id)}
                        className="mt-2 text-xs font-semibold text-primary hover:underline"
                      >
                        Post entry
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'erp-reports' && (
          <section className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Assets</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(balanceSheet.assets)}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Liabilities</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(balanceSheet.liabilities)}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Equity</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(balanceSheet.equity)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Revenue</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(profitLoss.revenue)}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Expenses</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(profitLoss.expenses)}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Net Income</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(profitLoss.netIncome)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">GST Collected</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(taxSummary.gstCollected)}</p>
                <p className="text-xs text-neutral-500">Taxable Sales: {formatCurrency(taxSummary.taxableSales)}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">TDS Withheld</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(taxSummary.tdsWithheld)}</p>
                <p className="text-xs text-neutral-500">GST/TDS summary</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Estimated ITR Tax</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(itrSummary.estimatedTax)}</p>
                <p className="text-xs text-neutral-500">Taxable Income: {formatCurrency(itrSummary.taxableIncome)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Total Income</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(itrSummary.totalIncome)}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Total Expenses</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(itrSummary.totalExpenses)}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Taxable Income</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(itrSummary.taxableIncome)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Trial Balance</h2>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  Debit: {formatCurrency(trialBalance.totals.debit)} · Credit: {formatCurrency(trialBalance.totals.credit)}
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-neutral-500">
                    <tr>
                      <th className="py-2">Account</th>
                      <th className="py-2">Debit</th>
                      <th className="py-2">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trialBalance.rows.map((row) => (
                      <tr key={row.accountId} className="border-t border-neutral-100 dark:border-neutral-700">
                        <td className="py-2 text-neutral-700 dark:text-neutral-200">
                          {row.code} - {row.name}
                        </td>
                        <td className="py-2 text-neutral-700 dark:text-neutral-200">{formatCurrency(row.debit)}</td>
                        <td className="py-2 text-neutral-700 dark:text-neutral-200">{formatCurrency(row.credit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {contentTab === 'invoices' && (
          <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Create Invoice</h2>
              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Client name"
                  value={invoiceForm.clientName}
                  onChange={(e) => setInvoiceForm((prev) => ({ ...prev, clientName: e.target.value }))}
                />
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Client email"
                  value={invoiceForm.clientEmail}
                  onChange={(e) => setInvoiceForm((prev) => ({ ...prev, clientEmail: e.target.value }))}
                />
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Item description"
                  value={invoiceForm.description}
                  onChange={(e) => setInvoiceForm((prev) => ({ ...prev, description: e.target.value }))}
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    placeholder="Qty"
                    type="number"
                    value={invoiceForm.quantity}
                    onChange={(e) => setInvoiceForm((prev) => ({ ...prev, quantity: e.target.value }))}
                  />
                  <input
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    placeholder="Rate"
                    type="number"
                    value={invoiceForm.rate}
                    onChange={(e) => setInvoiceForm((prev) => ({ ...prev, rate: e.target.value }))}
                  />
                  <input
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    placeholder="GST %"
                    type="number"
                    value={invoiceForm.gstRate}
                    onChange={(e) => setInvoiceForm((prev) => ({ ...prev, gstRate: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                  />
                  <input
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    placeholder="TDS %"
                    type="number"
                    value={invoiceForm.tdsRate}
                    onChange={(e) => setInvoiceForm((prev) => ({ ...prev, tdsRate: e.target.value }))}
                  />
                  <input
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    placeholder="Discount"
                    type="number"
                    value={invoiceForm.discount}
                    onChange={(e) => setInvoiceForm((prev) => ({ ...prev, discount: e.target.value }))}
                  />
                </div>
                <select
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  value={invoiceForm.status}
                  onChange={(e) => setInvoiceForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
                <button
                  type="button"
                  onClick={createInvoice}
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  {editingInvoiceId ? 'Update Invoice' : 'Save Invoice'}
                </button>
              </div>
              <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Credit / Debit Note</h3>
                <div className="mt-3 space-y-2">
                  <select
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    value={noteForm.invoiceId}
                    onChange={(e) => setNoteForm((prev) => ({ ...prev, invoiceId: e.target.value }))}
                  >
                    <option value="">Select invoice</option>
                    {invoices.map((invoice) => (
                      <option key={invoice._id} value={invoice._id}>
                        {invoice.invoiceNumber} · {invoice.clientName}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                      value={noteForm.type}
                      onChange={(e) => setNoteForm((prev) => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="credit">Credit Note</option>
                      <option value="debit">Debit Note</option>
                    </select>
                    <input
                      className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                      type="number"
                      placeholder="Amount"
                      value={noteForm.amount}
                      onChange={(e) => setNoteForm((prev) => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                  <input
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    placeholder="Reason"
                    value={noteForm.reason}
                    onChange={(e) => setNoteForm((prev) => ({ ...prev, reason: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={createInvoiceNote}
                    className="w-full rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Invoice History</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{invoices.length} records</p>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-neutral-500">
                    <tr>
                      <th className="py-2">Invoice</th>
                      <th className="py-2">Client</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Total</th>
                      <th className="py-2">Balance</th>
                      <th className="py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice._id} className="border-t border-neutral-100 dark:border-neutral-700">
                        <td className="py-2 font-semibold text-neutral-800 dark:text-neutral-100">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="py-2 text-neutral-600 dark:text-neutral-300">{invoice.clientName}</td>
                        <td className="py-2 text-neutral-500">{invoiceStatusLabel(invoice)}</td>
                        <td className="py-2 text-neutral-700 dark:text-neutral-200">{formatCurrency(invoice.total)}</td>
                        <td className="py-2 text-neutral-700 dark:text-neutral-200">{formatCurrency(invoice.balanceDue)}</td>
                        <td className="py-2">
                          {invoice.status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => markInvoicePaid(invoice._id)}
                              className="text-xs font-semibold text-primary hover:underline"
                            >
                              Mark paid
                            </button>
                          )}
                          {invoice.status === 'draft' && (
                            <button
                              type="button"
                              onClick={() => startInvoiceEdit(invoice)}
                              className="ml-3 text-xs font-semibold text-neutral-500 hover:underline"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Latest Notes</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{invoiceNotes.length} notes</p>
                </div>
                <div className="mt-3 space-y-2">
                  {invoiceNotes.slice(0, 5).map((note) => (
                    <div key={note._id} className="rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-neutral-700">
                      <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                        <span className="font-semibold">{note.type} note</span>
                        <span>{formatCurrency(note.amount)}</span>
                      </div>
                      <p className="text-neutral-500">{note.reason || 'No reason provided'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {contentTab === 'payments' && (
          <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Record Payment</h2>
              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Invoice id (optional)"
                  value={paymentForm.invoice}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, invoice: e.target.value }))}
                />
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Customer name"
                  value={paymentForm.customerName}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, customerName: e.target.value }))}
                />
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  type="number"
                  placeholder="Amount"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                />
                <select
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, method: e.target.value }))}
                >
                  <option value="bank">Bank</option>
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                </select>
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Reference"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, reference: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={createPayment}
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Save Payment
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Payment Ledger</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{payments.length} records</p>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-neutral-500">
                    <tr>
                      <th className="py-2">Customer</th>
                      <th className="py-2">Method</th>
                      <th className="py-2">Amount</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment._id} className="border-t border-neutral-100 dark:border-neutral-700">
                        <td className="py-2 text-neutral-700 dark:text-neutral-200">{payment.customerName || 'N/A'}</td>
                        <td className="py-2 text-neutral-500">{payment.method}</td>
                        <td className="py-2 text-neutral-700 dark:text-neutral-200">{formatCurrency(payment.amount)}</td>
                        <td className="py-2 text-neutral-500">{payment.status}</td>
                        <td className="py-2">
                          {payment.status !== 'reconciled' && (
                            <button
                              type="button"
                              onClick={() => reconcilePayment(payment._id)}
                              className="text-xs font-semibold text-primary hover:underline"
                            >
                              Reconcile
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Outstanding Payments</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {formatCurrency(outstandingInvoices.reduce((sum, inv) => sum + Number(inv.balanceDue || 0), 0))}
                  </p>
                </div>
                <div className="mt-3 space-y-2">
                  {outstandingInvoices.slice(0, 5).map((invoice) => (
                    <div key={invoice._id} className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-neutral-700">
                      <div>
                        <p className="font-semibold text-neutral-800 dark:text-neutral-100">{invoice.clientName}</p>
                        <p className="text-neutral-500">{invoice.invoiceNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-neutral-700 dark:text-neutral-200">{formatCurrency(invoice.balanceDue)}</p>
                        <p className="text-neutral-500">{invoiceStatusLabel(invoice)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Customer Balances</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{customerBalances.length} customers</p>
                </div>
                <div className="mt-3 space-y-2">
                  {customerBalances.slice(0, 5).map((customer) => (
                    <div key={customer.name} className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-neutral-700">
                      <p className="font-semibold text-neutral-800 dark:text-neutral-100">{customer.name}</p>
                      <p className="text-neutral-700 dark:text-neutral-200">{formatCurrency(customer.balance)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {contentTab === 'expenses' && (
          <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Submit Expense</h2>
              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Expense title"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, title: e.target.value }))}
                />
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Category"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, category: e.target.value }))}
                />
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  type="number"
                  placeholder="Amount"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
                />
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Department"
                  value={expenseForm.department}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, department: e.target.value }))}
                />
                <select
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  value={expenseForm.status}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="submitted">Submitted</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                  <option value="paid">Paid</option>
                </select>
                <button
                  type="button"
                  onClick={createExpense}
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Save Expense
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Expense Overview</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{expenses.length} records</p>
              </div>
              <div className="mt-4 space-y-3">
                {expenses.map((expense) => (
                  <div key={expense._id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-neutral-800 dark:text-neutral-100">{expense.title}</p>
                        <p className="text-xs text-neutral-500">{expense.category} · {expense.department}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{formatCurrency(expense.amount)}</p>
                        <p className="text-xs text-neutral-500">{expense.status}</p>
                      </div>
                    </div>
                    {expense.status === 'submitted' && (
                      <button
                        type="button"
                        onClick={() => verifyExpense(expense._id)}
                        className="mt-2 text-xs font-semibold text-primary hover:underline"
                      >
                        Verify documents
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {contentTab === 'budgets' && (
          <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Allocate Budget</h2>
              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Department"
                  value={budgetForm.department}
                  onChange={(e) => setBudgetForm((prev) => ({ ...prev, department: e.target.value }))}
                />
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Fiscal year"
                  value={budgetForm.fiscalYear}
                  onChange={(e) => setBudgetForm((prev) => ({ ...prev, fiscalYear: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    type="number"
                    placeholder="Allocated"
                    value={budgetForm.allocated}
                    onChange={(e) => setBudgetForm((prev) => ({ ...prev, allocated: e.target.value }))}
                  />
                  <input
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    type="number"
                    placeholder="Spent"
                    value={budgetForm.spent}
                    onChange={(e) => setBudgetForm((prev) => ({ ...prev, spent: e.target.value }))}
                  />
                </div>
                <textarea
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Notes"
                  rows={3}
                  value={budgetForm.notes}
                  onChange={(e) => setBudgetForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={createBudget}
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Save Budget
                </button>
              </div>
              <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Cost Centers</h3>
                <div className="mt-3 space-y-2">
                  <input
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    placeholder="Cost center name"
                    value={costCenterForm.name}
                    onChange={(e) => setCostCenterForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <input
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    placeholder="Code"
                    value={costCenterForm.code}
                    onChange={(e) => setCostCenterForm((prev) => ({ ...prev, code: e.target.value }))}
                  />
                  <input
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    placeholder="Department"
                    value={costCenterForm.department}
                    onChange={(e) => setCostCenterForm((prev) => ({ ...prev, department: e.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                      type="number"
                      placeholder="Budget"
                      value={costCenterForm.budget}
                      onChange={(e) => setCostCenterForm((prev) => ({ ...prev, budget: e.target.value }))}
                    />
                    <input
                      className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                      type="number"
                      placeholder="Spent"
                      value={costCenterForm.spent}
                      onChange={(e) => setCostCenterForm((prev) => ({ ...prev, spent: e.target.value }))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={createCostCenter}
                    className="w-full rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary"
                  >
                    Add Cost Center
                  </button>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Budget Utilization</h2>
              <div className="mt-4 space-y-3">
                {budgets.map((budget) => (
                  <div key={budget._id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-neutral-800 dark:text-neutral-100">{budget.department}</p>
                        <p className="text-xs text-neutral-500">FY {budget.fiscalYear}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                          {formatCurrency(budget.spent)} / {formatCurrency(budget.allocated)}
                        </p>
                        <p className="text-xs text-neutral-500">{budget.status}</p>
                      </div>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-neutral-100 dark:bg-neutral-700">
                      <div
                        className={`h-2 rounded-full ${
                          budget.status === 'over'
                            ? 'bg-red-500'
                            : budget.status === 'at-risk'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(budget.utilization || 0, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Cost Centers</h3>
                <div className="mt-3 space-y-2">
                  {costCenters.map((center) => (
                    <div key={center._id} className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700">
                      <div>
                        <p className="font-semibold text-neutral-800 dark:text-neutral-100">{center.name}</p>
                        <p className="text-xs text-neutral-500">{center.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-neutral-500">{formatCurrency(center.spent)} / {formatCurrency(center.budget)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {contentTab === 'payroll' && (
          <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Process Payroll</h2>
              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Employee name"
                  value={payrollForm.employeeName}
                  onChange={(e) => setPayrollForm((prev) => ({ ...prev, employeeName: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    type="date"
                    value={payrollForm.periodStart}
                    onChange={(e) => setPayrollForm((prev) => ({ ...prev, periodStart: e.target.value }))}
                  />
                  <input
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    type="date"
                    value={payrollForm.periodEnd}
                    onChange={(e) => setPayrollForm((prev) => ({ ...prev, periodEnd: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    type="number"
                    placeholder="Gross pay"
                    value={payrollForm.grossPay}
                    onChange={(e) => setPayrollForm((prev) => ({ ...prev, grossPay: e.target.value }))}
                  />
                  <input
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    type="number"
                    placeholder="Deductions"
                    value={payrollForm.deductions}
                    onChange={(e) => setPayrollForm((prev) => ({ ...prev, deductions: e.target.value }))}
                  />
                </div>
                <select
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  value={payrollForm.status}
                  onChange={(e) => setPayrollForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="draft">Draft</option>
                  <option value="processed">Processed</option>
                  <option value="disbursed">Disbursed</option>
                </select>
                <button
                  type="button"
                  onClick={createPayroll}
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Save Payroll
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Payroll Runs</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{payrolls.length} records</p>
              </div>
              <div className="mt-4 space-y-3">
                {payrolls.map((payroll) => (
                  <div key={payroll._id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-neutral-800 dark:text-neutral-100">{payroll.employeeName || 'Employee'}</p>
                        <p className="text-xs text-neutral-500">
                          {payroll.periodStart ? new Date(payroll.periodStart).toLocaleDateString() : 'N/A'} -{' '}
                          {payroll.periodEnd ? new Date(payroll.periodEnd).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                          {formatCurrency(payroll.netPay)}
                        </p>
                        <p className="text-xs text-neutral-500">{payroll.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {contentTab === 'reports' && (
          <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Generate Report</h2>
              <div className="mt-4 space-y-3">
                <select
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  value={reportForm.type}
                  onChange={(e) => setReportForm((prev) => ({ ...prev, type: e.target.value }))}
                >
                  <option value="profit-loss">Profit & Loss</option>
                  <option value="expense-summary">Expense Summary</option>
                  <option value="revenue">Revenue Report</option>
                  <option value="cash-flow">Cash Flow Statement</option>
                  <option value="tax">Tax Report</option>
                  <option value="monthly">Monthly Summary</option>
                  <option value="yearly">Yearly Summary</option>
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    type="date"
                    value={reportForm.periodStart}
                    onChange={(e) => setReportForm((prev) => ({ ...prev, periodStart: e.target.value }))}
                  />
                  <input
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    type="date"
                    value={reportForm.periodEnd}
                    onChange={(e) => setReportForm((prev) => ({ ...prev, periodEnd: e.target.value }))}
                  />
                </div>
                <textarea
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  rows={3}
                  placeholder="Summary"
                  value={reportForm.summary}
                  onChange={(e) => setReportForm((prev) => ({ ...prev, summary: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={createReport}
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Save Report
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Report Archive</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{reports.length} records</p>
              </div>
              <div className="mt-4 space-y-3">
                {reports.map((report) => (
                  <div key={report._id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                    <p className="font-semibold text-neutral-800 dark:text-neutral-100">{report.type}</p>
                    <p className="text-xs text-neutral-500">
                      {report.periodStart ? new Date(report.periodStart).toLocaleDateString() : 'N/A'} -{' '}
                      {report.periodEnd ? new Date(report.periodEnd).toLocaleDateString() : 'N/A'}
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">{report.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {contentTab === 'compliance' && (
          <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Compliance Record</h2>
              <div className="mt-4 space-y-3">
                <select
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  value={complianceForm.type}
                  onChange={(e) => setComplianceForm((prev) => ({ ...prev, type: e.target.value }))}
                >
                  <option value="gst">GST</option>
                  <option value="tds">TDS</option>
                  <option value="statutory">Statutory</option>
                  <option value="audit">Audit</option>
                  <option value="other">Other</option>
                </select>
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Period label"
                  value={complianceForm.periodLabel}
                  onChange={(e) => setComplianceForm((prev) => ({ ...prev, periodLabel: e.target.value }))}
                />
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  type="date"
                  value={complianceForm.dueDate}
                  onChange={(e) => setComplianceForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                />
                <select
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  value={complianceForm.status}
                  onChange={(e) => setComplianceForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="pending">Pending</option>
                  <option value="filed">Filed</option>
                  <option value="overdue">Overdue</option>
                </select>
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Reference"
                  value={complianceForm.reference}
                  onChange={(e) => setComplianceForm((prev) => ({ ...prev, reference: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={createCompliance}
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Save Compliance
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Compliance Tracker</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{compliance.length} records</p>
              </div>
              <div className="mt-4 space-y-3">
                {compliance.map((record) => (
                  <div key={record._id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                    <p className="font-semibold text-neutral-800 dark:text-neutral-100">{record.type}</p>
                    <p className="text-xs text-neutral-500">{record.periodLabel}</p>
                    <p className="text-xs text-neutral-500">Due {record.dueDate ? new Date(record.dueDate).toLocaleDateString() : 'N/A'}</p>
                    <p className="text-xs text-neutral-500">Status {record.status}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {contentTab === 'vendors' && (
          <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Vendor Profile</h2>
              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Vendor name"
                  value={vendorForm.name}
                  onChange={(e) => setVendorForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Contact email"
                  value={vendorForm.contactEmail}
                  onChange={(e) => setVendorForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                />
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Payment terms"
                  value={vendorForm.paymentTerms}
                  onChange={(e) => setVendorForm((prev) => ({ ...prev, paymentTerms: e.target.value }))}
                />
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  type="number"
                  placeholder="Balance"
                  value={vendorForm.balance}
                  onChange={(e) => setVendorForm((prev) => ({ ...prev, balance: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={createVendor}
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Save Vendor
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Vendor Directory</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{vendors.length} records</p>
              </div>
              <div className="mt-4 space-y-3">
                {vendors.map((vendor) => (
                  <div key={vendor._id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                    <p className="font-semibold text-neutral-800 dark:text-neutral-100">{vendor.name}</p>
                    <p className="text-xs text-neutral-500">{vendor.contactEmail}</p>
                    <p className="text-xs text-neutral-500">Terms: {vendor.paymentTerms || 'N/A'}</p>
                    <p className="text-xs text-neutral-500">Balance: {formatCurrency(vendor.balance)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {contentTab === 'clients' && (
          <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Client Profile</h2>
              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Client name"
                  value={clientForm.name}
                  onChange={(e) => setClientForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Contact email"
                  value={clientForm.contactEmail}
                  onChange={(e) => setClientForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                />
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  placeholder="Payment terms"
                  value={clientForm.paymentTerms}
                  onChange={(e) => setClientForm((prev) => ({ ...prev, paymentTerms: e.target.value }))}
                />
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  type="number"
                  placeholder="Balance"
                  value={clientForm.balance}
                  onChange={(e) => setClientForm((prev) => ({ ...prev, balance: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={createClient}
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Save Client
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Client Directory</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{clients.length} records</p>
              </div>
              <div className="mt-4 space-y-3">
                {clients.map((client) => (
                  <div key={client._id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                    <p className="font-semibold text-neutral-800 dark:text-neutral-100">{client.name}</p>
                    <p className="text-xs text-neutral-500">{client.contactEmail}</p>
                    <p className="text-xs text-neutral-500">Terms: {client.paymentTerms || 'N/A'}</p>
                    <p className="text-xs text-neutral-500">Balance: {formatCurrency(client.balance)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'audit' && (
          <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Audit Logs</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{auditLogs.length} rows</p>
            </div>
            <div className="mt-4 space-y-3">
              {auditLogs.map((row) => (
                <div key={row._id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{row.action}</p>
                  <p className="text-xs text-neutral-500">{row.resourceType} • {row.riskFlag}</p>
                  <p className="text-xs text-neutral-500">{new Date(row.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'approvals' && (
          <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Approval Workflows</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{approvalItems.length} rows</p>
            </div>
            <div className="mt-4 space-y-3">
              {approvalItems.map((row) => (
                <div key={row._id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{row.module} • {row.entityType}</p>
                  <p className="text-xs text-neutral-500">Entity: {row.entityId}</p>
                  <p className="text-xs text-neutral-500">Status: {row.status}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

export default FinanceDashboard;

