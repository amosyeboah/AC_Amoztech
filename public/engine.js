/**
 * AmozTech Separate Entity & Double-Entry Accounting Engine
 * ---------------------------------------------------------
 * Enforces the Separate Entity Concept between Amos (Owner) and AmozTech
 * (plus sub-units: PayLite, Engage AI, Custom Projects, and future units).
 *
 * All metrics, balances, current accounts, ledgers, trial balances, and answers
 * to the 9 Essential Financial Questions are derived strictly from recorded
 * transactions and registered assets—never from manually maintained totals.
 */

const CHART_OF_ACCOUNTS = [
  // 1000-1999: ASSETS
  { code: '1010', name: 'Cash on Hand', type: 'ASSET', subtype: 'CASH' },
  { code: '1020', name: 'Business Bank Account (GCB / Ecobank)', type: 'ASSET', subtype: 'BANK' },
  { code: '1030', name: 'Business Mobile Money (MTN MoMo / Telecel)', type: 'ASSET', subtype: 'MOMO' },
  { code: '1200', name: 'Accounts Receivable (Client Invoices)', type: 'ASSET', subtype: 'RECEIVABLE' },
  { code: '1300', name: 'Due from Amos (Owner Receivable / Personal Spend by Business)', type: 'ASSET', subtype: 'AMOS_RECEIVABLE' },
  { code: '1400', name: 'Inter-Unit Funding Receivable (Affiliate Clearing)', type: 'ASSET', subtype: 'INTERCOMPANY' },
  { code: '1500', name: 'Property, Equipment & Tech Assets (At Cost)', type: 'ASSET', subtype: 'FIXED_ASSET' },
  { code: '1590', name: 'Accumulated Depreciation', type: 'ASSET', subtype: 'CONTRA_ASSET' },

  // 2000-2999: LIABILITIES
  { code: '2000', name: 'Accounts Payable (Vendor Bills)', type: 'LIABILITY', subtype: 'PAYABLE' },
  { code: '2100', name: 'Due to Amos — Owner Loans Payable', type: 'LIABILITY', subtype: 'AMOS_LOAN_PAYABLE' },
  { code: '2110', name: 'Due to Amos — Reimbursable Expenses Payable', type: 'LIABILITY', subtype: 'AMOS_REIMB_PAYABLE' },
  { code: '2200', name: 'Taxes Payable (GRA / VAT / WHT)', type: 'LIABILITY', subtype: 'TAX_PAYABLE' },
  { code: '2400', name: 'Inter-Unit Funding Payable (Affiliate Clearing)', type: 'LIABILITY', subtype: 'INTERCOMPANY' },

  // 3000-3999: EQUITY
  { code: '3010', name: 'Amos Capital Contributions (Cash Equity)', type: 'EQUITY', subtype: 'CAPITAL' },
  { code: '3020', name: 'Amos Contributed Assets (In-Kind Equity)', type: 'EQUITY', subtype: 'ASSET_CAPITAL' },
  { code: '3100', name: 'Opening Balance / Retained Earnings', type: 'EQUITY', subtype: 'RETAINED_EARNINGS' },
  { code: '3200', name: 'Amos Owner Drawings / Withdrawals', type: 'EQUITY', subtype: 'CONTRA_EQUITY_DRAWINGS' },
  { code: '3300', name: 'Dividends & Profit Distributions to Amos', type: 'EQUITY', subtype: 'CONTRA_EQUITY_DIVIDENDS' },

  // 4000-4999: REVENUE
  { code: '4010', name: 'SaaS & Subscription Revenue', type: 'REVENUE', subtype: 'OPERATING_REVENUE' },
  { code: '4020', name: 'Transaction Fees & Commissions', type: 'REVENUE', subtype: 'OPERATING_REVENUE' },
  { code: '4030', name: 'Custom Software & Project Revenue', type: 'REVENUE', subtype: 'OPERATING_REVENUE' },
  { code: '4090', name: 'Other Operating Income', type: 'REVENUE', subtype: 'OPERATING_REVENUE' },

  // 5000-5999: EXPENSES
  { code: '5010', name: 'Cloud Hosting & Infrastructure (AWS / GCP)', type: 'EXPENSE', subtype: 'SOFTWARE_INFRA' },
  { code: '5020', name: 'Software Subscriptions & APIs (OpenAI / SaaS)', type: 'EXPENSE', subtype: 'SUBSCRIPTIONS' },
  { code: '5030', name: 'Direct Project & Contractor Costs', type: 'EXPENSE', subtype: 'PROJECT_COSTS' },
  { code: '5100', name: 'General Operating & Office Expenses', type: 'EXPENSE', subtype: 'OPERATING_EXPENSE' },
  { code: '5150', name: 'Marketing & Growth Acquisition', type: 'EXPENSE', subtype: 'MARKETING' },
  { code: '5200', name: 'Executive Salary — Amos (Management Compensation)', type: 'EXPENSE', subtype: 'AMOS_SALARY' },
  { code: '5210', name: 'Staff Payroll & Allowances', type: 'EXPENSE', subtype: 'PAYROLL' },
  { code: '5300', name: 'Corporate Taxes & Statutory Levies (GRA)', type: 'EXPENSE', subtype: 'TAXES' },
  { code: '5400', name: 'Depreciation Expense', type: 'EXPENSE', subtype: 'DEPRECIATION' }
];

function getCashAccountCode(paymentMethod) {
  const m = String(paymentMethod || 'BANK').toUpperCase();
  if (m === 'CASH') return '1010';
  if (m === 'MOMO' || m === 'MOBILE_MONEY' || m === 'MOBILE MONEY') return '1030';
  return '1020';
}

function getExpenseAccountCode(categoryName = '') {
  const c = String(categoryName).toLowerCase();
  if (c.includes('cloud') || c.includes('hosting') || c.includes('server') || c.includes('infra')) return '5010';
  if (c.includes('sub') || c.includes('software') || c.includes('api') || c.includes('saas')) return '5020';
  if (c.includes('project') || c.includes('contractor') || c.includes('dev')) return '5030';
  if (c.includes('market') || c.includes('ads') || c.includes('growth')) return '5150';
  if (c.includes('tax') || c.includes('gra') || c.includes('vat') || c.includes('levy')) return '5300';
  if (c.includes('staff') || c.includes('payroll') || c.includes('wage')) return '5210';
  return '5100';
}

function getRevenueAccountCode(categoryName = '') {
  const c = String(categoryName).toLowerCase();
  if (c.includes('saas') || c.includes('sub') || c.includes('ai')) return '4010';
  if (c.includes('fee') || c.includes('commission') || c.includes('paylite') || c.includes('payment')) return '4020';
  if (c.includes('project') || c.includes('custom') || c.includes('contract') || c.includes('client')) return '4030';
  return '4090';
}

/**
 * Generates balanced double-entry journal lines for any recorded transaction.
 * Guarantees SUM(debit) === SUM(credit) to 2 decimal places.
 */
function generateJournalLines(tx) {
  const amount = round2(Number(tx.amount_ghs ?? tx.amount ?? 0));
  if (amount <= 0) {
    throw new Error('Transaction amount must be greater than zero.');
  }

  const cashAcc = getCashAccountCode(tx.payment_method);
  const flowType = tx.flow_type;
  const subType = tx.sub_type;
  const unitId = tx.business_unit_id;
  const counterUnitId = tx.counterparty_unit_id || null;
  const lines = [];

  if (flowType === 'AMOS_TO_BUSINESS') {
    if (subType === 'CAPITAL_CONTRIBUTION') {
      // Amos invests cash capital into the business unit
      lines.push(
        { account_code: cashAcc, business_unit_id: unitId, debit: amount, credit: 0, memo: `Capital injection from Amos: ${tx.reason}` },
        { account_code: '3010', business_unit_id: unitId, debit: 0, credit: amount, memo: `Amos Equity Capital Contribution` }
      );
    } else if (subType === 'OWNER_LOAN') {
      // Amos lends money to the business unit (Liability owed to Amos)
      lines.push(
        { account_code: cashAcc, business_unit_id: unitId, debit: amount, credit: 0, memo: `Owner loan received from Amos: ${tx.reason}` },
        { account_code: '2100', business_unit_id: unitId, debit: 0, credit: amount, memo: `Liability: Due to Amos (Owner Loan)` }
      );
    } else if (subType === 'EXPENSE_PAID_PERSONALLY') {
      // Amos pays a business expense from his personal pocket (Business Expense + Reimbursable Liability to Amos)
      const expAcc = getExpenseAccountCode(tx.category_name || tx.reason);
      lines.push(
        { account_code: expAcc, business_unit_id: unitId, debit: amount, credit: 0, memo: `Business expense paid personally by Amos: ${tx.reason}` },
        { account_code: '2110', business_unit_id: unitId, debit: 0, credit: amount, memo: `Liability: Reimbursable Expense Due to Amos` }
      );
    } else if (subType === 'ASSET_CONTRIBUTED') {
      // Amos contributes a physical/tech asset to the business unit as In-Kind Equity
      lines.push(
        { account_code: '1500', business_unit_id: unitId, debit: amount, credit: 0, memo: `Asset contributed by Amos: ${tx.reason}` },
        { account_code: '3020', business_unit_id: unitId, debit: 0, credit: amount, memo: `Amos In-Kind Asset Equity Contribution` }
      );
    } else if (subType === 'AMOS_REPAYS_BUSINESS') {
      // Amos repays money he owed to the business unit
      lines.push(
        { account_code: cashAcc, business_unit_id: unitId, debit: amount, credit: 0, memo: `Repayment from Amos to business: ${tx.reason}` },
        { account_code: '1300', business_unit_id: unitId, debit: 0, credit: amount, memo: `Settlement of Due from Amos receivable` }
      );
    } else {
      throw new Error(`Unsupported AMOS_TO_BUSINESS sub_type: ${subType}`);
    }
  } else if (flowType === 'BUSINESS_TO_AMOS') {
    if (subType === 'REIMBURSEMENT') {
      // Business reimburses Amos for out-of-pocket business expenses
      lines.push(
        { account_code: '2110', business_unit_id: unitId, debit: amount, credit: 0, memo: `Reimbursement paid to Amos: ${tx.reason}` },
        { account_code: cashAcc, business_unit_id: unitId, debit: 0, credit: amount, memo: `Cash outflow for Amos reimbursement` }
      );
    } else if (subType === 'LOAN_REPAYMENT') {
      // Business repays Amos's owner loan principal
      lines.push(
        { account_code: '2100', business_unit_id: unitId, debit: amount, credit: 0, memo: `Owner loan repayment to Amos: ${tx.reason}` },
        { account_code: cashAcc, business_unit_id: unitId, debit: 0, credit: amount, memo: `Cash outflow for Amos loan repayment` }
      );
    } else if (subType === 'SALARY') {
      // Executive / Management salary paid to Amos (Operating Expense, NOT loan/equity return)
      lines.push(
        { account_code: '5200', business_unit_id: unitId, debit: amount, credit: 0, memo: `Management salary paid to Amos: ${tx.reason}` },
        { account_code: cashAcc, business_unit_id: unitId, debit: 0, credit: amount, memo: `Cash outflow for Amos salary` }
      );
    } else if (subType === 'DIVIDEND') {
      // Profit distribution / dividend paid to Amos (Return on Investment)
      lines.push(
        { account_code: '3300', business_unit_id: unitId, debit: amount, credit: 0, memo: `Profit distribution / Dividend to Amos: ${tx.reason}` },
        { account_code: cashAcc, business_unit_id: unitId, debit: 0, credit: amount, memo: `Cash outflow for Amos dividend` }
      );
    } else if (subType === 'OWNER_DRAWING') {
      // Owner drawing reducing equity
      lines.push(
        { account_code: '3200', business_unit_id: unitId, debit: amount, credit: 0, memo: `Owner withdrawal / drawing by Amos: ${tx.reason}` },
        { account_code: cashAcc, business_unit_id: unitId, debit: 0, credit: amount, memo: `Cash outflow for owner drawing` }
      );
    } else if (subType === 'PERSONAL_EXPENSE_BY_BUSINESS') {
      // Business pays a personal expense on Amos's behalf OR advances cash to Amos -> Amos now OWES the business!
      lines.push(
        { account_code: '1300', business_unit_id: unitId, debit: amount, credit: 0, memo: `Paid on Amos's personal behalf (Receivable from Amos): ${tx.reason}` },
        { account_code: cashAcc, business_unit_id: unitId, debit: 0, credit: amount, memo: `Business cash used for Amos personal item` }
      );
    } else {
      throw new Error(`Unsupported BUSINESS_TO_AMOS sub_type: ${subType}`);
    }
  } else if (flowType === 'INCOME_EXPENSE') {
    if (subType === 'REVENUE') {
      const revAcc = getRevenueAccountCode(tx.category_name || tx.reason);
      lines.push(
        { account_code: cashAcc, business_unit_id: unitId, debit: amount, credit: 0, memo: `Revenue received: ${tx.reason}` },
        { account_code: revAcc, business_unit_id: unitId, debit: 0, credit: amount, memo: `Operating Revenue (${tx.category_name || 'General'})` }
      );
    } else if (subType === 'OPERATING_EXPENSE') {
      const expAcc = getExpenseAccountCode(tx.category_name || tx.reason);
      lines.push(
        { account_code: expAcc, business_unit_id: unitId, debit: amount, credit: 0, memo: `Operating expense: ${tx.reason}` },
        { account_code: cashAcc, business_unit_id: unitId, debit: 0, credit: amount, memo: `Cash paid for ${tx.reason}` }
      );
    } else if (subType === 'ASSET_PURCHASE') {
      lines.push(
        { account_code: '1500', business_unit_id: unitId, debit: amount, credit: 0, memo: `Business asset purchase: ${tx.reason}` },
        { account_code: cashAcc, business_unit_id: unitId, debit: 0, credit: amount, memo: `Cash paid for business asset` }
      );
    } else if (subType === 'OPENING_BALANCE') {
      lines.push(
        { account_code: cashAcc, business_unit_id: unitId, debit: amount, credit: 0, memo: `Opening cash balance: ${tx.reason}` },
        { account_code: '3100', business_unit_id: unitId, debit: 0, credit: amount, memo: `Opening Retained Earnings / Balance` }
      );
    } else {
      throw new Error(`Unsupported INCOME_EXPENSE sub_type: ${subType}`);
    }
  } else if (flowType === 'UNIT_TRANSFER') {
    if (!counterUnitId || String(counterUnitId) === String(unitId)) {
      throw new Error('Internal business transfer requires two distinct business units (sender and receiver).');
    }
    // Sender unit: Credits Cash, Debits Inter-Unit Receivable (1400)
    // Receiver unit: Debits Cash, Credits Inter-Unit Payable (2400)
    // Neither unit records Revenue or Expense! Consolidated cash & P&L have zero double-counting.
    lines.push(
      { account_code: '1400', business_unit_id: unitId, debit: amount, credit: 0, memo: `Inter-unit transfer sent to unit #${counterUnitId}: ${tx.reason}` },
      { account_code: cashAcc, business_unit_id: unitId, debit: 0, credit: amount, memo: `Cash sent in inter-unit transfer` },
      { account_code: cashAcc, business_unit_id: counterUnitId, debit: amount, credit: 0, memo: `Cash received in inter-unit transfer from unit #${unitId}` },
      { account_code: '2400', business_unit_id: counterUnitId, debit: 0, credit: amount, memo: `Inter-unit funding received from unit #${unitId}: ${tx.reason}` }
    );
  } else {
    throw new Error(`Unsupported transaction flow_type: ${flowType}`);
  }

  // Verify double-entry invariant
  const totalDebit = round2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round2(lines.reduce((s, l) => s + l.credit, 0));
  if (totalDebit !== totalCredit) {
    throw new Error(`Double-entry imbalance detected: Debit=${totalDebit}, Credit=${totalCredit}`);
  }

  return lines;
}

/**
 * Calculates asset depreciation (straight-line) and current book value as of referenceDate.
 */
function calculateAssetValuation(asset, referenceDate = new Date().toISOString().slice(0, 10)) {
  const cost = round2(Number(asset.purchase_cost || 0));
  const salvage = round2(Number(asset.salvage_value || 0));
  const lifeYears = Number(asset.useful_life_years || 3);
  const purchaseDate = new Date(asset.purchase_date || referenceDate);
  const refDate = new Date(referenceDate);

  const elapsedMs = Math.max(0, refDate.getTime() - purchaseDate.getTime());
  const elapsedYears = elapsedMs / (1000 * 60 * 60 * 24 * 365.25);

  const depreciableBase = Math.max(0, cost - salvage);
  const annualDepreciation = lifeYears > 0 ? round2(depreciableBase / lifeYears) : 0;
  const accumulatedDepreciation = round2(Math.min(depreciableBase, annualDepreciation * elapsedYears));
  const computedBookValue = round2(Math.max(salvage, cost - accumulatedDepreciation));
  const currentValue = asset.current_value != null && Number(asset.current_value) > 0
    ? round2(Number(asset.current_value))
    : computedBookValue;

  return {
    ...asset,
    purchase_cost: cost,
    salvage_value: salvage,
    annual_depreciation: annualDepreciation,
    accumulated_depreciation: accumulatedDepreciation,
    computed_book_value: computedBookValue,
    effective_value: currentValue
  };
}

/**
 * Comprehensive Financial Calculator across all or filtered Business Units & Date Ranges.
 * Computes:
 * 1. Dashboard summary KPIs
 * 2. Unit-by-unit breakdown & Consolidated AmozTech totals (with internal transfers eliminated)
 * 3. Current Accounts (What each business owes Amos vs. What Amos owes each business, running balances)
 * 4. Exact, data-backed answers to all 9 Essential Financial Questions
 * 5. Trial Balance & Income Statement / Balance Sheet figures
 */
function computeFinancialState({
  businessUnits = [],
  transactions = [],
  assets = [],
  filterUnitId = 'ALL',
  startDate = null,
  endDate = null
}) {
  const activeTxs = transactions
    .filter((tx) => tx.status !== 'VOIDED')
    .filter((tx) => {
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;
      return true;
    })
    .sort((a, b) => (a.date === b.date ? (a.id || 0) - (b.id || 0) : a.date.localeCompare(b.date)));

  const valuedAssets = assets.map((a) => calculateAssetValuation(a, endDate || new Date().toISOString().slice(0, 10)));

  // Initialize per-unit trackers
  const unitMap = {};
  for (const u of businessUnits) {
    unitMap[u.id] = {
      unit_id: u.id,
      name: u.name,
      code: u.code,
      is_parent: Boolean(u.is_parent),
      // Amos -> Business
      capital_cash: 0,
      capital_assets_contributed: 0,
      owner_loans_in: 0,
      expenses_paid_personally: 0,
      amos_repayments_to_business: 0,
      // Business -> Amos
      reimbursements_to_amos: 0,
      loan_repayments_to_amos: 0,
      salary_to_amos: 0,
      dividends_to_amos: 0,
      drawings_by_amos: 0,
      personal_expenses_by_business: 0,
      // Operations
      revenue: 0,
      operating_expenses: 0, // includes out-of-pocket expenses paid by Amos + business-paid op expenses + Amos salary
      business_paid_expenses: 0,
      asset_purchases: 0,
      opening_balance: 0,
      // Inter-unit transfers
      transfers_in: 0,
      transfers_out: 0,
      // Cash by channel
      cash_on_hand: 0,
      bank_balance: 0,
      momo_balance: 0,
      // Assets
      business_owned_assets_cost: 0,
      business_owned_assets_value: 0,
      amos_personal_assets_used_cost: 0,
      amos_personal_assets_used_value: 0
    };
  }

  const ensureUnit = (id) => {
    if (!unitMap[id]) {
      unitMap[id] = {
        unit_id: id,
        name: `Unit #${id}`,
        code: `U${id}`,
        is_parent: false,
        capital_cash: 0,
        capital_assets_contributed: 0,
        owner_loans_in: 0,
        expenses_paid_personally: 0,
        amos_repayments_to_business: 0,
        reimbursements_to_amos: 0,
        loan_repayments_to_amos: 0,
        salary_to_amos: 0,
        dividends_to_amos: 0,
        drawings_by_amos: 0,
        personal_expenses_by_business: 0,
        revenue: 0,
        operating_expenses: 0,
        business_paid_expenses: 0,
        asset_purchases: 0,
        opening_balance: 0,
        transfers_in: 0,
        transfers_out: 0,
        cash_on_hand: 0,
        bank_balance: 0,
        momo_balance: 0,
        business_owned_assets_cost: 0,
        business_owned_assets_value: 0,
        amos_personal_assets_used_cost: 0,
        amos_personal_assets_used_value: 0
      };
    }
    return unitMap[id];
  };

  const adjustUnitCash = (u, paymentMethod, delta) => {
    const code = getCashAccountCode(paymentMethod);
    if (code === '1010') u.cash_on_hand = round2(u.cash_on_hand + delta);
    else if (code === '1030') u.momo_balance = round2(u.momo_balance + delta);
    else u.bank_balance = round2(u.bank_balance + delta);
  };

  // Running current account ledger entries
  const currentAccountHistory = [];
  let runningBizOwesAmos = 0;
  let runningAmosOwesBiz = 0;

  for (const tx of activeTxs) {
    const amt = round2(Number(tx.amount_ghs ?? tx.amount ?? 0));
    const u = ensureUnit(tx.business_unit_id);

    if (tx.flow_type === 'AMOS_TO_BUSINESS') {
      if (tx.sub_type === 'CAPITAL_CONTRIBUTION') {
        u.capital_cash = round2(u.capital_cash + amt);
        adjustUnitCash(u, tx.payment_method, amt);
      } else if (tx.sub_type === 'OWNER_LOAN') {
        u.owner_loans_in = round2(u.owner_loans_in + amt);
        adjustUnitCash(u, tx.payment_method, amt);
      } else if (tx.sub_type === 'EXPENSE_PAID_PERSONALLY') {
        u.expenses_paid_personally = round2(u.expenses_paid_personally + amt);
        u.operating_expenses = round2(u.operating_expenses + amt);
      } else if (tx.sub_type === 'ASSET_CONTRIBUTED') {
        u.capital_assets_contributed = round2(u.capital_assets_contributed + amt);
      } else if (tx.sub_type === 'AMOS_REPAYS_BUSINESS') {
        u.amos_repayments_to_business = round2(u.amos_repayments_to_business + amt);
        adjustUnitCash(u, tx.payment_method, amt);
      }
    } else if (tx.flow_type === 'BUSINESS_TO_AMOS') {
      if (tx.sub_type === 'REIMBURSEMENT') {
        u.reimbursements_to_amos = round2(u.reimbursements_to_amos + amt);
        adjustUnitCash(u, tx.payment_method, -amt);
      } else if (tx.sub_type === 'LOAN_REPAYMENT') {
        u.loan_repayments_to_amos = round2(u.loan_repayments_to_amos + amt);
        adjustUnitCash(u, tx.payment_method, -amt);
      } else if (tx.sub_type === 'SALARY') {
        u.salary_to_amos = round2(u.salary_to_amos + amt);
        u.operating_expenses = round2(u.operating_expenses + amt);
        u.business_paid_expenses = round2(u.business_paid_expenses + amt);
        adjustUnitCash(u, tx.payment_method, -amt);
      } else if (tx.sub_type === 'DIVIDEND') {
        u.dividends_to_amos = round2(u.dividends_to_amos + amt);
        adjustUnitCash(u, tx.payment_method, -amt);
      } else if (tx.sub_type === 'OWNER_DRAWING') {
        u.drawings_by_amos = round2(u.drawings_by_amos + amt);
        adjustUnitCash(u, tx.payment_method, -amt);
      } else if (tx.sub_type === 'PERSONAL_EXPENSE_BY_BUSINESS') {
        u.personal_expenses_by_business = round2(u.personal_expenses_by_business + amt);
        adjustUnitCash(u, tx.payment_method, -amt);
      }
    } else if (tx.flow_type === 'INCOME_EXPENSE') {
      if (tx.sub_type === 'REVENUE') {
        u.revenue = round2(u.revenue + amt);
        adjustUnitCash(u, tx.payment_method, amt);
      } else if (tx.sub_type === 'OPERATING_EXPENSE') {
        u.operating_expenses = round2(u.operating_expenses + amt);
        u.business_paid_expenses = round2(u.business_paid_expenses + amt);
        adjustUnitCash(u, tx.payment_method, -amt);
      } else if (tx.sub_type === 'ASSET_PURCHASE') {
        u.asset_purchases = round2(u.asset_purchases + amt);
        adjustUnitCash(u, tx.payment_method, -amt);
      } else if (tx.sub_type === 'OPENING_BALANCE') {
        u.opening_balance = round2(u.opening_balance + amt);
        adjustUnitCash(u, tx.payment_method, amt);
      }
    } else if (tx.flow_type === 'UNIT_TRANSFER') {
      u.transfers_out = round2(u.transfers_out + amt);
      adjustUnitCash(u, tx.payment_method, -amt);
      if (tx.counterparty_unit_id) {
        const recv = ensureUnit(tx.counterparty_unit_id);
        recv.transfers_in = round2(recv.transfers_in + amt);
        adjustUnitCash(recv, tx.payment_method, amt);
      }
    }

    // Track Current Account running balance if transaction touches Amos <-> Business debt/receivable
    const matchesUnitFilter =
      filterUnitId === 'ALL' ||
      String(tx.business_unit_id) === String(filterUnitId) ||
      String(tx.counterparty_unit_id) === String(filterUnitId);

    if (matchesUnitFilter && (tx.flow_type === 'AMOS_TO_BUSINESS' || tx.flow_type === 'BUSINESS_TO_AMOS')) {
      let deltaBizOwesAmos = 0;
      let deltaAmosOwesBiz = 0;
      let classification = '';

      if (tx.sub_type === 'OWNER_LOAN') {
        deltaBizOwesAmos = amt;
        classification = 'Owner Loan (+ Business Owes Amos)';
      } else if (tx.sub_type === 'EXPENSE_PAID_PERSONALLY') {
        deltaBizOwesAmos = amt;
        classification = 'Business Expense Paid by Amos (+ Business Owes Amos)';
      } else if (tx.sub_type === 'REIMBURSEMENT') {
        deltaBizOwesAmos = -amt;
        classification = 'Expense Reimbursement (- Reduces What Business Owes Amos)';
      } else if (tx.sub_type === 'LOAN_REPAYMENT') {
        deltaBizOwesAmos = -amt;
        classification = 'Loan Principal Repayment (- Reduces What Business Owes Amos)';
      } else if (tx.sub_type === 'PERSONAL_EXPENSE_BY_BUSINESS') {
        deltaAmosOwesBiz = amt;
        classification = 'Personal Spend Paid by Business (+ Amos Owes Business)';
      } else if (tx.sub_type === 'AMOS_REPAYS_BUSINESS') {
        deltaAmosOwesBiz = -amt;
        classification = 'Amos Repayment to Business (- Reduces What Amos Owes Business)';
      } else if (tx.sub_type === 'CAPITAL_CONTRIBUTION') {
        classification = 'Equity Capital Injection (Permanent Equity — Not Debt)';
      } else if (tx.sub_type === 'ASSET_CONTRIBUTED') {
        classification = 'In-Kind Asset Equity Contribution (Equity — Not Debt)';
      } else if (tx.sub_type === 'SALARY') {
        classification = 'Executive Salary (Compensation for Work — Not Debt/ROI)';
      } else if (tx.sub_type === 'DIVIDEND') {
        classification = 'Dividend / Profit Distribution (Return on Equity Investment)';
      } else if (tx.sub_type === 'OWNER_DRAWING') {
        classification = 'Owner Drawing (Equity Withdrawal)';
      }

      runningBizOwesAmos = round2(runningBizOwesAmos + deltaBizOwesAmos);
      runningAmosOwesBiz = round2(runningAmosOwesBiz + deltaAmosOwesBiz);

      currentAccountHistory.push({
        id: tx.id,
        tx_code: tx.tx_code,
        date: tx.date,
        business_unit_id: tx.business_unit_id,
        business_unit_name: u.name,
        flow_type: tx.flow_type,
        sub_type: tx.sub_type,
        reason: tx.reason,
        amount_ghs: amt,
        payment_method: tx.payment_method,
        settlement_status: tx.settlement_status || 'OPEN',
        settled_amount: round2(Number(tx.settled_amount || 0)),
        classification,
        delta_biz_owes_amos: deltaBizOwesAmos,
        delta_amos_owes_biz: deltaAmosOwesBiz,
        running_biz_owes_amos: runningBizOwesAmos,
        running_amos_owes_biz: runningAmosOwesBiz,
        running_net_position: round2(runningBizOwesAmos - runningAmosOwesBiz)
      });
    }
  }

  // Attribute assets to units
  for (const asset of valuedAssets) {
    const u = ensureUnit(asset.using_unit_id);
    if (asset.legal_owner_type === 'AMOS_PERSONAL') {
      u.amos_personal_assets_used_cost = round2(u.amos_personal_assets_used_cost + asset.purchase_cost);
      u.amos_personal_assets_used_value = round2(u.amos_personal_assets_used_value + asset.effective_value);
    } else {
      u.business_owned_assets_cost = round2(u.business_owned_assets_cost + asset.purchase_cost);
      u.business_owned_assets_value = round2(u.business_owned_assets_value + asset.effective_value);
    }
  }

  // Finalize per-unit derived metrics
  const unitSummaries = Object.values(unitMap).map((u) => {
    const totalCash = round2(u.cash_on_hand + u.bank_balance + u.momo_balance);
    const loanBalanceOwedToAmos = round2(Math.max(0, u.owner_loans_in - u.loan_repayments_to_amos));
    const reimbBalanceOwedToAmos = round2(Math.max(0, u.expenses_paid_personally - u.reimbursements_to_amos));
    const totalBusinessOwesAmos = round2(loanBalanceOwedToAmos + reimbBalanceOwedToAmos);
    const totalAmosOwesBusiness = round2(Math.max(0, u.personal_expenses_by_business - u.amos_repayments_to_business));
    const netCurrentAccount = round2(totalBusinessOwesAmos - totalAmosOwesBusiness);

    // Total invested by Amos in this unit:
    // Cash Capital + Contributed Equity Assets + Owner Loans + Out-of-Pocket Business Expenses + Personal Assets Used by Unit
    const totalEquityInvested = round2(u.capital_cash + u.capital_assets_contributed);
    const totalCashAndCreditPutIn = round2(u.capital_cash + u.owner_loans_in + u.expenses_paid_personally);
    const totalAssetsProvided = round2(u.capital_assets_contributed + u.amos_personal_assets_used_value);
    const totalInvestedOverall = round2(totalCashAndCreditPutIn + totalAssetsProvided);

    // Total money received back by Amos from this unit (broken down by type)
    const totalReceivedBack = round2(
      u.reimbursements_to_amos +
      u.loan_repayments_to_amos +
      u.salary_to_amos +
      u.dividends_to_amos +
      u.drawings_by_amos
    );

    // Net Profit (True Accounting Profit = Operating Revenue - Operating Expenses)
    // Note: Internal transfers, capital contributions, loans, and dividends are excluded from Net Profit.
    const netProfit = round2(u.revenue - u.operating_expenses);

    // Return on Investment (ROI):
    // 1. Business Accounting ROI % = (Net Profit / Total Invested Overall) * 100
    // 2. Realized Cash Return on Equity (Dividends / Equity & Capital Invested)
    const capitalBaseForRoi = totalInvestedOverall > 0 ? totalInvestedOverall : 1;
    const accountingRoiPct = totalInvestedOverall > 0 ? round2((netProfit / capitalBaseForRoi) * 100) : 0;
    const dividendYieldPct = totalEquityInvested > 0 ? round2((u.dividends_to_amos / totalEquityInvested) * 100) : 0;

    return {
      ...u,
      total_cash: totalCash,
      loan_balance_owed_to_amos: loanBalanceOwedToAmos,
      reimb_balance_owed_to_amos: reimbBalanceOwedToAmos,
      total_business_owes_amos: totalBusinessOwesAmos,
      total_amos_owes_business: totalAmosOwesBusiness,
      net_current_account: netCurrentAccount,
      total_equity_invested: totalEquityInvested,
      total_cash_and_credit_put_in: totalCashAndCreditPutIn,
      total_assets_provided: totalAssetsProvided,
      total_invested_overall: totalInvestedOverall,
      total_received_back: totalReceivedBack,
      net_profit: netProfit,
      accounting_roi_pct: accountingRoiPct,
      dividend_yield_pct: dividendYieldPct,
      net_interunit_funding: round2(u.transfers_in - u.transfers_out)
    };
  });

  // Scope selection (Either ALL consolidated or a single unit)
  const scopedUnits = filterUnitId === 'ALL'
    ? unitSummaries
    : unitSummaries.filter((u) => String(u.unit_id) === String(filterUnitId));

  const sumField = (field) => round2(scopedUnits.reduce((acc, u) => acc + (Number(u[field]) || 0), 0));

  const consolidated = {
    scope: filterUnitId === 'ALL' ? 'CONSOLIDATED_AMOZTECH' : `UNIT_${filterUnitId}`,
    capital_cash: sumField('capital_cash'),
    capital_assets_contributed: sumField('capital_assets_contributed'),
    owner_loans_in: sumField('owner_loans_in'),
    expenses_paid_personally: sumField('expenses_paid_personally'),
    amos_repayments_to_business: sumField('amos_repayments_to_business'),
    reimbursements_to_amos: sumField('reimbursements_to_amos'),
    loan_repayments_to_amos: sumField('loan_repayments_to_amos'),
    salary_to_amos: sumField('salary_to_amos'),
    dividends_to_amos: sumField('dividends_to_amos'),
    drawings_by_amos: sumField('drawings_by_amos'),
    personal_expenses_by_business: sumField('personal_expenses_by_business'),
    revenue: sumField('revenue'),
    operating_expenses: sumField('operating_expenses'),
    business_paid_expenses: sumField('business_paid_expenses'),
    asset_purchases: sumField('asset_purchases'),
    opening_balance: sumField('opening_balance'),
    // In consolidated view, internal transfers_in and transfers_out are tracked for visibility
    // but eliminated from consolidated income/expense so there is ZERO double counting!
    transfers_in: sumField('transfers_in'),
    transfers_out: sumField('transfers_out'),
    cash_on_hand: sumField('cash_on_hand'),
    bank_balance: sumField('bank_balance'),
    momo_balance: sumField('momo_balance'),
    total_cash: sumField('total_cash'),
    business_owned_assets_cost: sumField('business_owned_assets_cost'),
    business_owned_assets_value: sumField('business_owned_assets_value'),
    amos_personal_assets_used_cost: sumField('amos_personal_assets_used_cost'),
    amos_personal_assets_used_value: sumField('amos_personal_assets_used_value'),
    loan_balance_owed_to_amos: sumField('loan_balance_owed_to_amos'),
    reimb_balance_owed_to_amos: sumField('reimb_balance_owed_to_amos'),
    total_business_owes_amos: sumField('total_business_owes_amos'),
    total_amos_owes_business: sumField('total_amos_owes_business'),
    net_current_account: sumField('net_current_account'),
    total_equity_invested: sumField('total_equity_invested'),
    total_cash_and_credit_put_in: sumField('total_cash_and_credit_put_in'),
    total_assets_provided: sumField('total_assets_provided'),
    total_invested_overall: sumField('total_invested_overall'),
    total_received_back: sumField('total_received_back'),
    net_profit: sumField('net_profit')
  };

  consolidated.accounting_roi_pct = consolidated.total_invested_overall > 0
    ? round2((consolidated.net_profit / consolidated.total_invested_overall) * 100)
    : 0;
  consolidated.dividend_yield_pct = consolidated.total_equity_invested > 0
    ? round2((consolidated.dividends_to_amos / consolidated.total_equity_invested) * 100)
    : 0;

  // Identify top revenue generator & top money consumer across all units
  const topGenerator = [...unitSummaries].sort((a, b) => b.revenue - a.revenue)[0] || null;
  const topConsumer = [...unitSummaries].sort((a, b) => b.operating_expenses - a.operating_expenses)[0] || null;
  const mostProfitable = [...unitSummaries].sort((a, b) => b.net_profit - a.net_profit)[0] || null;

  // Compute Trial Balance from Journal Lines of active transactions in scope
  const trialBalanceMap = {};
  for (const acc of CHART_OF_ACCOUNTS) {
    trialBalanceMap[acc.code] = {
      code: acc.code,
      name: acc.name,
      type: acc.type,
      debit: 0,
      credit: 0
    };
  }

  for (const tx of activeTxs) {
    const lines = generateJournalLines(tx);
    for (const line of lines) {
      if (filterUnitId !== 'ALL' && String(line.business_unit_id) !== String(filterUnitId)) {
        continue;
      }
      if (!trialBalanceMap[line.account_code]) {
        trialBalanceMap[line.account_code] = {
          code: line.account_code,
          name: `Account ${line.account_code}`,
          type: 'OTHER',
          debit: 0,
          credit: 0
        };
      }
      trialBalanceMap[line.account_code].debit = round2(trialBalanceMap[line.account_code].debit + line.debit);
      trialBalanceMap[line.account_code].credit = round2(trialBalanceMap[line.account_code].credit + line.credit);
    }
  }

  const trialBalance = Object.values(trialBalanceMap).filter((row) => row.debit > 0 || row.credit > 0);
  const totalTrialDebit = round2(trialBalance.reduce((s, r) => s + r.debit, 0));
  const totalTrialCredit = round2(trialBalance.reduce((s, r) => s + r.credit, 0));

  // Build structured answers to the 9 Essential Financial Questions
  const personalAssetsUsedList = valuedAssets.filter((a) => a.legal_owner_type === 'AMOS_PERSONAL');
  const essentialQuestions = [
    {
      number: 1,
      question: 'How much money and assets has Amos invested in each business and overall?',
      headline_value: `GH₵ ${formatNumber(consolidated.total_invested_overall)}`,
      summary: `Amos has put in GH₵ ${formatNumber(consolidated.capital_cash)} as Cash Equity Capital, GH₵ ${formatNumber(consolidated.owner_loans_in)} in Owner Loans, GH₵ ${formatNumber(consolidated.expenses_paid_personally)} in Out-of-Pocket Business Expenses, plus GH₵ ${formatNumber(consolidated.total_assets_provided)} in Assets (GH₵ ${formatNumber(consolidated.capital_assets_contributed)} contributed equity assets and GH₵ ${formatNumber(consolidated.amos_personal_assets_used_value)} in personally owned assets used by the businesses).`,
      breakdown: unitSummaries.map((u) => ({
        label: u.name,
        value: u.total_invested_overall,
        detail: `Capital: GH₵ ${formatNumber(u.capital_cash)} | Loans: GH₵ ${formatNumber(u.owner_loans_in)} | Paid Personally: GH₵ ${formatNumber(u.expenses_paid_personally)} | Assets: GH₵ ${formatNumber(u.total_assets_provided)}`
      }))
    },
    {
      number: 2,
      question: 'How much money has Amos received back, broken down by type?',
      headline_value: `GH₵ ${formatNumber(consolidated.total_received_back)}`,
      summary: `Every payment to Amos is strictly separated so repayments and salary are never confused with profit: Reimbursements (GH₵ ${formatNumber(consolidated.reimbursements_to_amos)}), Loan Principal Repayments (GH₵ ${formatNumber(consolidated.loan_repayments_to_amos)}), Executive Salary (GH₵ ${formatNumber(consolidated.salary_to_amos)}), Dividends/Profit Distributions (GH₵ ${formatNumber(consolidated.dividends_to_amos)}), and Owner Drawings (GH₵ ${formatNumber(consolidated.drawings_by_amos)}).`,
      breakdown: [
        { label: 'Expense Reimbursements (Debt Settlement)', value: consolidated.reimbursements_to_amos },
        { label: 'Owner Loan Repayments (Principal Return)', value: consolidated.loan_repayments_to_amos },
        { label: 'Executive Salary (Labor Compensation)', value: consolidated.salary_to_amos },
        { label: 'Dividends / Profit Distributions (True ROI)', value: consolidated.dividends_to_amos },
        { label: 'Owner Drawings / Withdrawals (Equity Reduction)', value: consolidated.drawings_by_amos }
      ]
    },
    {
      number: 3,
      question: 'What assets does Amos personally own that the businesses use?',
      headline_value: `${personalAssetsUsedList.length} Assets (GH₵ ${formatNumber(consolidated.amos_personal_assets_used_value)})`,
      summary: personalAssetsUsedList.length > 0
        ? `Amos retains personal legal ownership of ${personalAssetsUsedList.length} asset(s) currently deployed across AmozTech units, with original cost GH₵ ${formatNumber(consolidated.amos_personal_assets_used_cost)} and current book/market value GH₵ ${formatNumber(consolidated.amos_personal_assets_used_value)}.`
        : 'No personally owned assets are currently registered as being used by the businesses.',
      breakdown: personalAssetsUsedList.map((a) => ({
        label: a.name,
        value: a.effective_value,
        detail: `Used by ${unitMap[a.using_unit_id]?.name || 'AmozTech'} | Cost: GH₵ ${formatNumber(a.purchase_cost)} | Condition: ${a.condition}`
      }))
    },
    {
      number: 4,
      question: 'How much does each business owe Amos?',
      headline_value: `GH₵ ${formatNumber(consolidated.total_business_owes_amos)}`,
      summary: `Across all units, AmozTech owes Amos GH₵ ${formatNumber(consolidated.total_business_owes_amos)} consisting of unpaid Owner Loans (GH₵ ${formatNumber(consolidated.loan_balance_owed_to_amos)}) and unpaid Expense Reimbursements (GH₵ ${formatNumber(consolidated.reimb_balance_owed_to_amos)}). Permanent equity capital is excluded from debt.`,
      breakdown: unitSummaries.map((u) => ({
        label: u.name,
        value: u.total_business_owes_amos,
        detail: `Unpaid Loans: GH₵ ${formatNumber(u.loan_balance_owed_to_amos)} | Unreimbursed Expenses: GH₵ ${formatNumber(u.reimb_balance_owed_to_amos)}`
      }))
    },
    {
      number: 5,
      question: 'How much does Amos owe each business?',
      headline_value: `GH₵ ${formatNumber(consolidated.total_amos_owes_business)}`,
      summary: `Amos owes the businesses GH₵ ${formatNumber(consolidated.total_amos_owes_business)} (Personal expenses paid by business of GH₵ ${formatNumber(consolidated.personal_expenses_by_business)} minus GH₵ ${formatNumber(consolidated.amos_repayments_to_business)} already repaid by Amos).`,
      breakdown: unitSummaries.map((u) => ({
        label: u.name,
        value: u.total_amos_owes_business,
        detail: `Paid for Amos: GH₵ ${formatNumber(u.personal_expenses_by_business)} | Repaid by Amos: GH₵ ${formatNumber(u.amos_repayments_to_business)}`
      }))
    },
    {
      number: 6,
      question: 'How much has Amos personally paid on behalf of the businesses?',
      headline_value: `GH₵ ${formatNumber(consolidated.expenses_paid_personally)}`,
      summary: `Amos has personally paid GH₵ ${formatNumber(consolidated.expenses_paid_personally)} for business expenses out of pocket. Of this, GH₵ ${formatNumber(consolidated.reimbursements_to_amos)} has been reimbursed and GH₵ ${formatNumber(consolidated.reimb_balance_owed_to_amos)} remains outstanding.`,
      breakdown: unitSummaries.map((u) => ({
        label: u.name,
        value: u.expenses_paid_personally,
        detail: `Reimbursed: GH₵ ${formatNumber(u.reimbursements_to_amos)} | Still Owed: GH₵ ${formatNumber(u.reimb_balance_owed_to_amos)}`
      }))
    },
    {
      number: 7,
      question: "How much have the businesses paid on Amos's behalf?",
      headline_value: `GH₵ ${formatNumber(consolidated.personal_expenses_by_business)}`,
      summary: `The businesses have paid GH₵ ${formatNumber(consolidated.personal_expenses_by_business)} for Amos's personal expenses/advances. Amos has repaid GH₵ ${formatNumber(consolidated.amos_repayments_to_business)}, leaving a receivable due from Amos of GH₵ ${formatNumber(consolidated.total_amos_owes_business)}.`,
      breakdown: unitSummaries.map((u) => ({
        label: u.name,
        value: u.personal_expenses_by_business,
        detail: `Repaid by Amos: GH₵ ${formatNumber(u.amos_repayments_to_business)} | Balance Due: GH₵ ${formatNumber(u.total_amos_owes_business)}`
      }))
    },
    {
      number: 8,
      question: 'Has Amos received a financial return on his investment?',
      headline_value: consolidated.net_profit > 0
        ? `Yes — ${consolidated.accounting_roi_pct}% Accounting ROI (GH₵ ${formatNumber(consolidated.dividends_to_amos)} Dividends Paid)`
        : `Not Yet (${consolidated.accounting_roi_pct}% ROI)`,
      summary: `Distinguishing cash returned from profit earned: The businesses generated GH₵ ${formatNumber(consolidated.net_profit)} in Net Profit on GH₵ ${formatNumber(consolidated.total_invested_overall)} total capital/resources (${consolidated.accounting_roi_pct}% Accounting ROI). In realized cash returns, Amos has received GH₵ ${formatNumber(consolidated.dividends_to_amos)} in Dividends (${consolidated.dividend_yield_pct}% yield on equity), separate from GH₵ ${formatNumber(consolidated.salary_to_amos)} salary for his labor and GH₵ ${formatNumber(consolidated.reimbursements_to_amos + consolidated.loan_repayments_to_amos)} debt repayments.`,
      breakdown: [
        { label: 'Net Accounting Profit Earned by Businesses', value: consolidated.net_profit, detail: `${consolidated.accounting_roi_pct}% ROI on total resources committed` },
        { label: 'Realized Profit Distributions (Dividends Paid to Amos)', value: consolidated.dividends_to_amos, detail: `${consolidated.dividend_yield_pct}% cash dividend yield on equity` },
        { label: 'Retained Profit Reinvested in Business Growth', value: round2(consolidated.net_profit - consolidated.dividends_to_amos - consolidated.drawings_by_amos), detail: 'Builds business equity value' }
      ]
    },
    {
      number: 9,
      question: 'Where does every cedi go, and which business generates or consumes the most money?',
      headline_value: topGenerator ? `Top Generator: ${topGenerator.name} | Top Consumer: ${topConsumer?.name}` : 'N/A',
      summary: `Top revenue generator is ${topGenerator?.name || 'N/A'} (GH₵ ${formatNumber(topGenerator?.revenue || 0)}), while ${topConsumer?.name || 'N/A'} consumes the most operating spend (GH₵ ${formatNumber(topConsumer?.operating_expenses || 0)}). Most profitable unit is ${mostProfitable?.name || 'N/A'} (Net Profit GH₵ ${formatNumber(mostProfitable?.net_profit || 0)}). Total liquid cash across all units is GH₵ ${formatNumber(consolidated.total_cash)}.`,
      breakdown: unitSummaries.map((u) => ({
        label: u.name,
        value: u.net_profit,
        detail: `Revenue: GH₵ ${formatNumber(u.revenue)} | Spend: GH₵ ${formatNumber(u.operating_expenses)} | Cash Position: GH₵ ${formatNumber(u.total_cash)}`
      }))
    }
  ];

  return {
    consolidated,
    unitSummaries,
    currentAccountHistory,
    valuedAssets,
    trialBalance,
    trialBalanceTotals: {
      debit: totalTrialDebit,
      credit: totalTrialCredit,
      isBalanced: totalTrialDebit === totalTrialCredit
    },
    essentialQuestions,
    highlights: {
      topGenerator,
      topConsumer,
      mostProfitable
    }
  };
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function formatNumber(n) {
  return round2(n || 0).toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const _exports = {
  CHART_OF_ACCOUNTS,
  generateJournalLines,
  calculateAssetValuation,
  computeFinancialState,
  round2,
  formatNumber
};


if (typeof module !== 'undefined' && module.exports) {
  module.exports = _exports;
} else {
  window.accountingEngine = _exports;
}
