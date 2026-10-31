const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generateJournalLines,
  calculateAssetValuation,
  computeFinancialState
} = require('../src/engine/accountingEngine');
const {
  getDb,
  queryAll,
  insertTransactionWithJournal,
  resetToSampleData
} = require('../src/db/database');

test('1. Double-Entry Invariant: Every transaction flow & subtype produces balanced Debits and Credits', () => {
  const sampleCases = [
    { flow_type: 'AMOS_TO_BUSINESS', sub_type: 'CAPITAL_CONTRIBUTION', amount_ghs: 50000, business_unit_id: 1, payment_method: 'BANK', reason: 'Seed capital' },
    { flow_type: 'AMOS_TO_BUSINESS', sub_type: 'OWNER_LOAN', amount_ghs: 20000, business_unit_id: 2, payment_method: 'MOMO', reason: 'Bridge loan' },
    { flow_type: 'AMOS_TO_BUSINESS', sub_type: 'EXPENSE_PAID_PERSONALLY', amount_ghs: 4500, business_unit_id: 3, payment_method: 'BANK', reason: 'AWS hosting paid personally' },
    { flow_type: 'AMOS_TO_BUSINESS', sub_type: 'ASSET_CONTRIBUTED', amount_ghs: 15000, business_unit_id: 1, payment_method: 'BANK', reason: 'Server rack contributed' },
    { flow_type: 'AMOS_TO_BUSINESS', sub_type: 'AMOS_REPAYS_BUSINESS', amount_ghs: 3000, business_unit_id: 1, payment_method: 'MOMO', reason: 'Repaid personal flight' },
    { flow_type: 'BUSINESS_TO_AMOS', sub_type: 'REIMBURSEMENT', amount_ghs: 4500, business_unit_id: 3, payment_method: 'BANK', reason: 'Reimburse AWS bill' },
    { flow_type: 'BUSINESS_TO_AMOS', sub_type: 'LOAN_REPAYMENT', amount_ghs: 10000, business_unit_id: 2, payment_method: 'BANK', reason: 'Loan principal repayment' },
    { flow_type: 'BUSINESS_TO_AMOS', sub_type: 'SALARY', amount_ghs: 12000, business_unit_id: 1, payment_method: 'BANK', reason: 'CEO Salary' },
    { flow_type: 'BUSINESS_TO_AMOS', sub_type: 'DIVIDEND', amount_ghs: 18000, business_unit_id: 2, payment_method: 'BANK', reason: 'Profit distribution' },
    { flow_type: 'BUSINESS_TO_AMOS', sub_type: 'OWNER_DRAWING', amount_ghs: 2500, business_unit_id: 1, payment_method: 'CASH', reason: 'Owner drawing' },
    { flow_type: 'BUSINESS_TO_AMOS', sub_type: 'PERSONAL_EXPENSE_BY_BUSINESS', amount_ghs: 6000, business_unit_id: 1, payment_method: 'BANK', reason: 'Personal car insurance' },
    { flow_type: 'INCOME_EXPENSE', sub_type: 'REVENUE', amount_ghs: 85000, business_unit_id: 2, payment_method: 'BANK', reason: 'Gateway commissions' },
    { flow_type: 'INCOME_EXPENSE', sub_type: 'OPERATING_EXPENSE', amount_ghs: 22000, business_unit_id: 2, payment_method: 'BANK', reason: 'Cloud infrastructure' },
    { flow_type: 'UNIT_TRANSFER', sub_type: 'INTERNAL_TRANSFER', amount_ghs: 15000, business_unit_id: 1, counterparty_unit_id: 3, payment_method: 'BANK', reason: 'Internal R&D transfer' }
  ];

  for (const tx of sampleCases) {
    const lines = generateJournalLines(tx);
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    assert.equal(totalDebit, totalCredit, `Imbalance on ${tx.flow_type}/${tx.sub_type}`);
    assert.ok(totalDebit > 0);
  }
});

test('2. Separate Entity Concept: Capital vs. Loans vs. Reimbursable Spend vs. Payments to Amos', () => {
  const units = [
    { id: 1, name: 'AmozTech HQ', code: 'AMOZ', is_parent: 1 },
    { id: 2, name: 'PayLite', code: 'PAYL', is_parent: 0 }
  ];

  const txs = [
    // Amos puts in GH₵ 100,000 Equity Capital -> NOT owed back as debt
    { id: 1, date: '2026-01-01', amount_ghs: 100000, flow_type: 'AMOS_TO_BUSINESS', sub_type: 'CAPITAL_CONTRIBUTION', business_unit_id: 1, payment_method: 'BANK', reason: 'Equity', status: 'ACTIVE' },
    // Amos lends GH₵ 30,000 Owner Loan to PayLite -> PayLite owes Amos GH₵ 30,000
    { id: 2, date: '2026-01-05', amount_ghs: 30000, flow_type: 'AMOS_TO_BUSINESS', sub_type: 'OWNER_LOAN', business_unit_id: 2, payment_method: 'BANK', reason: 'Loan', status: 'ACTIVE' },
    // Amos pays GH₵ 5,000 business expense personally for PayLite -> PayLite owes Amos GH₵ 5,000 + records GH₵ 5,000 OpEx
    { id: 3, date: '2026-01-10', amount_ghs: 5000, flow_type: 'AMOS_TO_BUSINESS', sub_type: 'EXPENSE_PAID_PERSONALLY', business_unit_id: 2, payment_method: 'MOMO', reason: 'Server bill', status: 'ACTIVE' },
    // PayLite repays GH₵ 10,000 of loan and reimburses GH₵ 2,000 of expense
    { id: 4, date: '2026-02-01', amount_ghs: 10000, flow_type: 'BUSINESS_TO_AMOS', sub_type: 'LOAN_REPAYMENT', business_unit_id: 2, payment_method: 'BANK', reason: 'Loan repay', status: 'ACTIVE' },
    { id: 5, date: '2026-02-05', amount_ghs: 2000, flow_type: 'BUSINESS_TO_AMOS', sub_type: 'REIMBURSEMENT', business_unit_id: 2, payment_method: 'MOMO', reason: 'Partial reimb', status: 'ACTIVE' },
    // AmozTech HQ pays Amos GH₵ 8,000 Salary (OpEx) and GH₵ 15,000 Dividend (ROI)
    { id: 6, date: '2026-02-15', amount_ghs: 8000, flow_type: 'BUSINESS_TO_AMOS', sub_type: 'SALARY', business_unit_id: 1, payment_method: 'BANK', reason: 'Salary', status: 'ACTIVE' },
    { id: 7, date: '2026-02-20', amount_ghs: 15000, flow_type: 'BUSINESS_TO_AMOS', sub_type: 'DIVIDEND', business_unit_id: 1, payment_method: 'BANK', reason: 'Dividend', status: 'ACTIVE' },
    // AmozTech HQ pays GH₵ 4,000 personal flight for Amos -> Amos owes AmozTech HQ GH₵ 4,000
    { id: 8, date: '2026-03-01', amount_ghs: 4000, flow_type: 'BUSINESS_TO_AMOS', sub_type: 'PERSONAL_EXPENSE_BY_BUSINESS', business_unit_id: 1, payment_method: 'BANK', reason: 'Personal ticket', status: 'ACTIVE' },
    // Amos repays GH₵ 1,500 to AmozTech HQ -> Amos now owes GH₵ 2,500
    { id: 9, date: '2026-03-10', amount_ghs: 1500, flow_type: 'AMOS_TO_BUSINESS', sub_type: 'AMOS_REPAYS_BUSINESS', business_unit_id: 1, payment_method: 'MOMO', reason: 'Partial repay', status: 'ACTIVE' }
  ];

  const state = computeFinancialState({ businessUnits: units, transactions: txs, assets: [] });
  const c = state.consolidated;

  // Verify Capital is separate from debt
  assert.equal(c.capital_cash, 100000);
  // Unpaid loan = 30,000 - 10,000 = 20,000
  assert.equal(c.loan_balance_owed_to_amos, 20000);
  // Unpaid reimbursement = 5,000 - 2,000 = 3,000
  assert.equal(c.reimb_balance_owed_to_amos, 3000);
  // Total business owes Amos = 20,000 + 3,000 = 23,000
  assert.equal(c.total_business_owes_amos, 23000);
  // Total Amos owes business = 4,000 - 1,500 = 2,500
  assert.equal(c.total_amos_owes_business, 2500);
  // Net Current Account = 23,000 - 2,500 = 20,500 owed to Amos
  assert.equal(c.net_current_account, 20500);

  // Verify payments to Amos are broken down accurately
  assert.equal(c.salary_to_amos, 8000);
  assert.equal(c.dividends_to_amos, 15000);
  assert.equal(c.reimbursements_to_amos, 2000);
  assert.equal(c.loan_repayments_to_amos, 10000);
  assert.equal(c.total_received_back, 35000);
});

test('3. Internal Business Transfers: Zero double-counting in consolidated revenue, expenses, and cash', () => {
  const units = [
    { id: 1, name: 'AmozTech HQ', code: 'AMOZ', is_parent: 1 },
    { id: 2, name: 'PayLite', code: 'PAYL', is_parent: 0 }
  ];

  const txs = [
    { id: 1, date: '2026-01-01', amount_ghs: 50000, flow_type: 'INCOME_EXPENSE', sub_type: 'REVENUE', business_unit_id: 1, payment_method: 'BANK', reason: 'Client revenue', status: 'ACTIVE' },
    // Transfer GH₵ 20,000 from AmozTech HQ (1) to PayLite (2)
    { id: 2, date: '2026-01-05', amount_ghs: 20000, flow_type: 'UNIT_TRANSFER', sub_type: 'INTERNAL_TRANSFER', business_unit_id: 1, counterparty_unit_id: 2, payment_method: 'BANK', reason: 'Seed allocation', status: 'ACTIVE' }
  ];

  const state = computeFinancialState({ businessUnits: units, transactions: txs, assets: [] });
  const hq = state.unitSummaries.find((u) => u.unit_id === 1);
  const paylite = state.unitSummaries.find((u) => u.unit_id === 2);

  // Unit cash positions reflect the transfer
  assert.equal(hq.total_cash, 30000);
  assert.equal(paylite.total_cash, 20000);

  // Consolidated cash is still exactly GH₵ 50,000, and consolidated revenue is still GH₵ 50,000 (no double-counting!)
  assert.equal(state.consolidated.total_cash, 50000);
  assert.equal(state.consolidated.revenue, 50000);
  assert.equal(state.consolidated.operating_expenses, 0);
  assert.equal(state.consolidated.net_profit, 50000);
});

test('4. Seeded SQLite Database & Duplicate Prevention Verification', async () => {
  await getDb();
  const db = resetToSampleData();
  const businessUnits = queryAll(db, `SELECT * FROM business_units`);
  const transactions = queryAll(db, `SELECT * FROM transactions`);
  const assets = queryAll(db, `SELECT * FROM assets`);

  assert.equal(businessUnits.length, 4);
  assert.ok(transactions.length >= 20);
  assert.equal(assets.length, 6);

  const computed = computeFinancialState({ businessUnits, transactions, assets });
  assert.equal(computed.trialBalanceTotals.isBalanced, true);
  assert.equal(computed.essentialQuestions.length, 9);

  // Verify duplicate prevention throws on identical transaction
  assert.throws(() => {
    insertTransactionWithJournal(db, {
      date: '2026-01-05',
      amount: 120000,
      currency: 'GHS',
      exchange_rate: 1.0,
      flow_type: 'AMOS_TO_BUSINESS',
      sub_type: 'CAPITAL_CONTRIBUTION',
      sender: 'Amos (Personal Ecobank)',
      receiver: 'AmozTech (Parent HQ)',
      business_unit_id: 1,
      category_name: 'Equity Capital Contribution',
      payment_method: 'BANK',
      reason: 'Core seed equity capital injection into AmozTech Parent HQ'
    });
  }, /Duplicate entry prevented/);
});

