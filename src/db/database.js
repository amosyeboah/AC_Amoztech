const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const {
  CHART_OF_ACCOUNTS,
  generateJournalLines,
  round2
} = require('../engine/accountingEngine');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'amoztech.sqlite');

let SQL = null;
let db = null;

async function getDb() {
  if (db) return db;
  if (!SQL) {
    SQL = await initSqlJs();
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
    initializeSchema(db);
    seedDatabase(db);
    persistDb();
  }
  return db;
}

function persistDb() {
  if (!db) return;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const data = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

function queryAll(database, sql, params = []) {
  const stmt = database.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(database, sql, params = []) {
  const rows = queryAll(database, sql, params);
  return rows[0] || null;
}

function runStmt(database, sql, params = []) {
  database.run(sql, params);
}

function initializeSchema(database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      title TEXT NOT NULL,
      avatar TEXT,
      permissions_json TEXT NOT NULL,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS currencies (
      code TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      exchange_rate_to_ghs REAL NOT NULL DEFAULT 1.0,
      is_default INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS business_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_parent INTEGER DEFAULT 0,
      manager TEXT,
      color TEXT DEFAULT '#0052CC',
      opening_balance_ghs REAL DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS accounts (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      subtype TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      flow_type TEXT NOT NULL,
      default_sub_type TEXT NOT NULL,
      account_code TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tx_code TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'GHS',
      exchange_rate REAL NOT NULL DEFAULT 1.0,
      amount_ghs REAL NOT NULL,
      flow_type TEXT NOT NULL,
      sub_type TEXT NOT NULL,
      sender TEXT NOT NULL,
      receiver TEXT NOT NULL,
      business_unit_id INTEGER NOT NULL,
      counterparty_unit_id INTEGER,
      category_name TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      reference TEXT,
      reason TEXT NOT NULL,
      notes TEXT,
      attachment_name TEXT,
      attachment_url TEXT,
      settlement_status TEXT DEFAULT 'OPEN',
      settled_amount REAL DEFAULT 0,
      parent_tx_id INTEGER,
      status TEXT DEFAULT 'ACTIVE',
      created_by TEXT DEFAULT 'Amos (Owner)',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      tx_code TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS journal_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      journal_entry_id INTEGER NOT NULL,
      transaction_id INTEGER NOT NULL,
      account_code TEXT NOT NULL,
      business_unit_id INTEGER NOT NULL,
      debit REAL NOT NULL DEFAULT 0,
      credit REAL NOT NULL DEFAULT 0,
      memo TEXT
    );

    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      purchase_cost REAL NOT NULL,
      salvage_value REAL DEFAULT 0,
      useful_life_years REAL DEFAULT 4,
      current_value REAL,
      legal_owner_type TEXT NOT NULL,
      legal_owner_name TEXT NOT NULL,
      using_unit_id INTEGER NOT NULL,
      acquisition_mode TEXT NOT NULL,
      purchase_date TEXT NOT NULL,
      condition TEXT NOT NULL DEFAULT 'Excellent',
      depreciation_method TEXT NOT NULL DEFAULT 'STRAIGHT_LINE',
      serial_number TEXT,
      supporting_doc TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      actor TEXT NOT NULL,
      role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      summary TEXT NOT NULL,
      before_snapshot TEXT,
      after_snapshot TEXT
    );
  `);
}

function recordAudit(database, { actor = 'Amos (Owner)', role = 'OWNER_ADMIN', action, entityType, entityId, summary, before = null, after = null }) {
  runStmt(
    database,
    `INSERT INTO audit_logs (timestamp, actor, role, action, entity_type, entity_id, summary, before_snapshot, after_snapshot)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      new Date().toISOString(),
      actor,
      role,
      action,
      entityType,
      String(entityId),
      summary,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null
    ]
  );
}

function insertTransactionWithJournal(database, txInput, actor = 'Amos (Owner)', role = 'OWNER_ADMIN') {
  const amount = round2(Number(txInput.amount || 0));
  const rate = Number(txInput.exchange_rate || 1.0);
  const amountGhs = round2(amount * rate);

  if (amount <= 0) {
    throw new Error('Transaction amount must be greater than zero.');
  }

  // Duplicate check: same date, amount, flow_type, sub_type, business_unit_id, and reference/reason
  if (!txInput.allow_duplicate) {
    const dup = queryOne(
      database,
      `SELECT tx_code FROM transactions
       WHERE status = 'ACTIVE'
         AND date = ?
         AND amount_ghs = ?
         AND flow_type = ?
         AND sub_type = ?
         AND business_unit_id = ?
         AND LOWER(reason) = LOWER(?)`,
      [txInput.date, amountGhs, txInput.flow_type, txInput.sub_type, txInput.business_unit_id, txInput.reason]
    );
    if (dup) {
      throw new Error(`Duplicate entry prevented: An identical transaction (${dup.tx_code}) already exists on ${txInput.date} for GH₵ ${amountGhs}.`);
    }
  }

  // Validate journal lines before inserting
  const lines = generateJournalLines({
    ...txInput,
    amount_ghs: amountGhs
  });

  const countRow = queryOne(database, `SELECT COUNT(*) AS cnt FROM transactions`);
  const nextNum = (countRow ? Number(countRow.cnt) : 0) + 1001;
  const txCode = txInput.tx_code || `AMZ-${nextNum}`;

  runStmt(
    database,
    `INSERT INTO transactions (
      tx_code, date, amount, currency, exchange_rate, amount_ghs,
      flow_type, sub_type, sender, receiver, business_unit_id, counterparty_unit_id,
      category_name, payment_method, reference, reason, notes,
      attachment_name, attachment_url, settlement_status, settled_amount, parent_tx_id,
      status, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`,
    [
      txCode,
      txInput.date,
      amount,
      txInput.currency || 'GHS',
      rate,
      amountGhs,
      txInput.flow_type,
      txInput.sub_type,
      txInput.sender,
      txInput.receiver,
      Number(txInput.business_unit_id),
      txInput.counterparty_unit_id ? Number(txInput.counterparty_unit_id) : null,
      txInput.category_name || 'General',
      txInput.payment_method || 'BANK',
      txInput.reference || `REF-${nextNum}`,
      txInput.reason,
      txInput.notes || '',
      txInput.attachment_name || '',
      txInput.attachment_url || '',
      txInput.settlement_status || 'OPEN',
      round2(Number(txInput.settled_amount || 0)),
      txInput.parent_tx_id || null,
      actor,
      new Date().toISOString(),
      new Date().toISOString()
    ]
  );

  const insertedTx = queryOne(database, `SELECT * FROM transactions WHERE tx_code = ?`, [txCode]);

  // Create balanced double-entry journal entry
  runStmt(
    database,
    `INSERT INTO journal_entries (transaction_id, tx_code, date, description, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [insertedTx.id, txCode, insertedTx.date, `${insertedTx.flow_type} / ${insertedTx.sub_type}: ${insertedTx.reason}`, new Date().toISOString()]
  );

  const je = queryOne(database, `SELECT id FROM journal_entries WHERE transaction_id = ? ORDER BY id DESC LIMIT 1`, [insertedTx.id]);

  for (const line of lines) {
    runStmt(
      database,
      `INSERT INTO journal_lines (journal_entry_id, transaction_id, account_code, business_unit_id, debit, credit, memo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [je.id, insertedTx.id, line.account_code, Number(line.business_unit_id), line.debit, line.credit, line.memo]
    );
  }

  recordAudit(database, {
    actor,
    role,
    action: 'CREATE_TRANSACTION',
    entityType: 'TRANSACTION',
    entityId: txCode,
    summary: `Recorded ${txCode} (${insertedTx.sub_type}) of GH₵ ${amountGhs.toLocaleString()} — ${insertedTx.reason}`,
    before: null,
    after: insertedTx
  });

  return insertedTx;
}

function seedStructure(database) {
  // 1. Users & RBAC
  const users = [
    {
      name: 'Amos (Founder & CEO)',
      email: 'amos@amoztech.com',
      role: 'OWNER_ADMIN',
      title: 'Owner & Managing Director',
      avatar: 'AM',
      permissions: ['ALL', 'CREATE_TX', 'EDIT_TX', 'VOID_TX', 'SETTLE_ACCOUNT', 'MANAGE_ASSETS', 'MANAGE_SETTINGS', 'EXPORT_REPORTS']
    },
    {
      name: 'Akosua Mensah',
      email: 'akosua.finance@amoztech.com',
      role: 'ACCOUNTANT',
      title: 'Group Chartered Accountant',
      avatar: 'AK',
      permissions: ['CREATE_TX', 'EDIT_TX', 'SETTLE_ACCOUNT', 'MANAGE_ASSETS', 'EXPORT_REPORTS']
    },
    {
      name: 'Kwame Boateng',
      email: 'kwame@paylite.gh',
      role: 'UNIT_MANAGER',
      title: 'PayLite Unit Lead',
      avatar: 'KB',
      permissions: ['CREATE_TX', 'EXPORT_REPORTS']
    },
    {
      name: 'Esi Owusu',
      email: 'esi.audit@amoztech.com',
      role: 'AUDITOR',
      title: 'External Compliance Auditor',
      avatar: 'EO',
      permissions: ['EXPORT_REPORTS']
    }
  ];

  for (const u of users) {
    runStmt(
      database,
      `INSERT INTO users (name, email, role, title, avatar, permissions_json, active) VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [u.name, u.email, u.role, u.title, u.avatar, JSON.stringify(u.permissions)]
    );
  }

  // 2. Currencies
  const currencies = [
    { code: 'GHS', symbol: 'GH₵', name: 'Ghana Cedi', rate: 1.0, isDefault: 1 },
    { code: 'USD', symbol: '$', name: 'US Dollar', rate: 15.8, isDefault: 0 },
    { code: 'EUR', symbol: '€', name: 'Euro', rate: 17.1, isDefault: 0 },
    { code: 'GBP', symbol: '£', name: 'British Pound', rate: 20.2, isDefault: 0 }
  ];
  for (const c of currencies) {
    runStmt(
      database,
      `INSERT INTO currencies (code, symbol, name, exchange_rate_to_ghs, is_default) VALUES (?, ?, ?, ?, ?)`,
      [c.code, c.symbol, c.name, c.rate, c.isDefault]
    );
  }

  // 3. Chart of Accounts
  for (const acc of CHART_OF_ACCOUNTS) {
    runStmt(
      database,
      `INSERT INTO accounts (code, name, type, subtype) VALUES (?, ?, ?, ?)`,
      [acc.code, acc.name, acc.type, acc.subtype]
    );
  }

  // 4. Business Units
  const units = [
    {
      code: 'AMOZ-HQ',
      name: 'AmozTech (Parent HQ)',
      description: 'Parent holding & shared technology operations across the AmozTech group',
      isParent: 1,
      manager: 'Amos',
      color: '#0052CC',
      openingBalance: 0
    },
    {
      code: 'PAYLITE',
      name: 'PayLite',
      description: 'Fintech payment gateway, merchant collections & Mobile Money settlement platform',
      isParent: 0,
      manager: 'Kwame Boateng',
      color: '#00A8E8',
      openingBalance: 0
    },
    {
      code: 'ENGAGE-AI',
      name: 'Engage AI',
      description: 'AI customer engagement, WhatsApp automation & enterprise LLM workflows',
      isParent: 0,
      manager: 'Ama Serwaa',
      color: '#7C3AED',
      openingBalance: 0
    },
    {
      code: 'CUSTOM-PROJ',
      name: 'Custom Projects',
      description: 'Bespoke enterprise software development, government & corporate contracts',
      isParent: 0,
      manager: 'Kofi Mensah',
      color: '#F59E0B',
      openingBalance: 0
    }
  ];

  for (const unit of units) {
    runStmt(
      database,
      `INSERT INTO business_units (code, name, description, is_parent, manager, color, opening_balance_ghs, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [unit.code, unit.name, unit.description, unit.isParent, unit.manager, unit.color, unit.openingBalance]
    );
  }

  // 5. Categories
  const categories = [
    { name: 'Equity Capital Contribution', flow: 'AMOS_TO_BUSINESS', sub: 'CAPITAL_CONTRIBUTION', acc: '3010', desc: 'Permanent cash capital invested by Amos' },
    { name: 'Owner Loan to Business', flow: 'AMOS_TO_BUSINESS', sub: 'OWNER_LOAN', acc: '2100', desc: 'Repayable loan from Amos to a business unit' },
    { name: 'Business Expense Paid by Amos', flow: 'AMOS_TO_BUSINESS', sub: 'EXPENSE_PAID_PERSONALLY', acc: '2110', desc: 'Amos pays a business cost from personal funds' },
    { name: 'Asset Contributed by Amos', flow: 'AMOS_TO_BUSINESS', sub: 'ASSET_CONTRIBUTED', acc: '3020', desc: 'Equipment or property contributed as equity' },
    { name: 'Amos Repays Business Receivable', flow: 'AMOS_TO_BUSINESS', sub: 'AMOS_REPAYS_BUSINESS', acc: '1300', desc: 'Amos settles personal spend paid by business' },
    { name: 'Expense Reimbursement to Amos', flow: 'BUSINESS_TO_AMOS', sub: 'REIMBURSEMENT', acc: '2110', desc: 'Repaying Amos for out-of-pocket business expenses' },
    { name: 'Owner Loan Principal Repayment', flow: 'BUSINESS_TO_AMOS', sub: 'LOAN_REPAYMENT', acc: '2100', desc: 'Repaying principal on Amos owner loan' },
    { name: 'Executive Management Salary (Amos)', flow: 'BUSINESS_TO_AMOS', sub: 'SALARY', acc: '5200', desc: 'Contracted salary for Amos work (not ROI)' },
    { name: 'Dividend / Profit Distribution', flow: 'BUSINESS_TO_AMOS', sub: 'DIVIDEND', acc: '3300', desc: 'Formal ROI profit distribution to Amos' },
    { name: 'Owner Drawing / Withdrawal', flow: 'BUSINESS_TO_AMOS', sub: 'OWNER_DRAWING', acc: '3200', desc: 'Owner equity withdrawal' },
    { name: 'Personal Expense Paid for Amos', flow: 'BUSINESS_TO_AMOS', sub: 'PERSONAL_EXPENSE_BY_BUSINESS', acc: '1300', desc: 'Business pays Amos personal expense (Amos owes business)' },
    { name: 'SaaS & Subscription Revenue', flow: 'INCOME_EXPENSE', sub: 'REVENUE', acc: '4010', desc: 'Recurring software and AI subscription income' },
    { name: 'Payment Gateway Commissions', flow: 'INCOME_EXPENSE', sub: 'REVENUE', acc: '4020', desc: 'PayLite transaction fees and merchant commissions' },
    { name: 'Client Project Milestone Revenue', flow: 'INCOME_EXPENSE', sub: 'REVENUE', acc: '4030', desc: 'Custom software development contract revenue' },
    { name: 'Cloud Hosting & Infrastructure', flow: 'INCOME_EXPENSE', sub: 'OPERATING_EXPENSE', acc: '5010', desc: 'AWS, GCP, servers, and database hosting' },
    { name: 'Software Subscriptions & AI APIs', flow: 'INCOME_EXPENSE', sub: 'OPERATING_EXPENSE', acc: '5020', desc: 'OpenAI, Anthropic, GitHub, Figma, SaaS tools' },
    { name: 'Project & Contractor Costs', flow: 'INCOME_EXPENSE', sub: 'OPERATING_EXPENSE', acc: '5030', desc: 'Direct engineering & design contractors' },
    { name: 'Staff Payroll & Operations', flow: 'INCOME_EXPENSE', sub: 'OPERATING_EXPENSE', acc: '5210', desc: 'Team salaries, office utilities & operations' },
    { name: 'Corporate Taxes & Statutory (GRA)', flow: 'INCOME_EXPENSE', sub: 'OPERATING_EXPENSE', acc: '5300', desc: 'VAT, withholding tax, corporate income tax' },
    { name: 'Inter-Unit Funding Transfer', flow: 'UNIT_TRANSFER', sub: 'INTERNAL_TRANSFER', acc: '1400', desc: 'Internal transfer between AmozTech business units' }
  ];

  for (const cat of categories) {
    runStmt(
      database,
      `INSERT INTO categories (name, flow_type, default_sub_type, account_code, description) VALUES (?, ?, ?, ?, ?)`,
      [cat.name, cat.flow, cat.sub, cat.acc, cat.desc]
    );
  }
}

function seedDatabase(database) {
  seedStructure(database);

  // Unit IDs: 1 = AmozTech HQ, 2 = PayLite, 3 = Engage AI, 4 = Custom Projects
  const sampleTransactions = [
    // --- AMOS -> BUSINESS (Capital, Loans, Personal Out-of-Pocket Business Spend, Assets Contributed) ---
    {
      date: '2026-01-05',
      amount: 120000,
      flow_type: 'AMOS_TO_BUSINESS',
      sub_type: 'CAPITAL_CONTRIBUTION',
      sender: 'Amos (Personal Ecobank)',
      receiver: 'AmozTech (Parent HQ)',
      business_unit_id: 1,
      category_name: 'Equity Capital Contribution',
      payment_method: 'BANK',
      reference: 'CAP-2026-001',
      reason: 'Core seed equity capital injection into AmozTech Parent HQ',
      notes: 'Permanent owner equity — separate from repayable loans',
      settlement_status: 'NOT_APPLICABLE'
    },
    {
      date: '2026-01-10',
      amount: 65000,
      flow_type: 'AMOS_TO_BUSINESS',
      sub_type: 'CAPITAL_CONTRIBUTION',
      sender: 'Amos (Personal Ecobank)',
      receiver: 'PayLite',
      business_unit_id: 2,
      category_name: 'Equity Capital Contribution',
      payment_method: 'BANK',
      reference: 'CAP-2026-002',
      reason: 'Direct equity capital investment into PayLite gateway unit',
      notes: 'Ring-fenced capital for PayLite regulatory capital requirement',
      settlement_status: 'NOT_APPLICABLE'
    },
    {
      date: '2026-01-14',
      amount: 45000,
      flow_type: 'AMOS_TO_BUSINESS',
      sub_type: 'CAPITAL_CONTRIBUTION',
      sender: 'Amos (Personal GCB)',
      receiver: 'Engage AI',
      business_unit_id: 3,
      category_name: 'Equity Capital Contribution',
      payment_method: 'BANK',
      reference: 'CAP-2026-003',
      reason: 'Seed equity investment for Engage AI product launch',
      notes: 'Permanent equity contribution',
      settlement_status: 'NOT_APPLICABLE'
    },
    {
      date: '2026-02-02',
      amount: 40000,
      flow_type: 'AMOS_TO_BUSINESS',
      sub_type: 'OWNER_LOAN',
      sender: 'Amos (Personal Ecobank)',
      receiver: 'PayLite',
      business_unit_id: 2,
      category_name: 'Owner Loan to Business',
      payment_method: 'BANK',
      reference: 'LN-2026-001',
      reason: 'Short-term owner bridge loan for PayLite instant settlement float',
      notes: '0% interest director loan; partially repaid GH₵ 15,000 in June',
      settlement_status: 'PARTIAL',
      settled_amount: 15000
    },
    {
      date: '2026-02-18',
      amount: 25000,
      flow_type: 'AMOS_TO_BUSINESS',
      sub_type: 'OWNER_LOAN',
      sender: 'Amos (Personal MoMo)',
      receiver: 'Engage AI',
      business_unit_id: 3,
      category_name: 'Owner Loan to Business',
      payment_method: 'MOMO',
      reference: 'LN-2026-002',
      reason: 'Owner loan to Engage AI for enterprise GPU inference cluster deposit',
      notes: 'Repayable from Q4 SaaS collections',
      settlement_status: 'OPEN',
      settled_amount: 0
    },
    {
      date: '2026-03-04',
      amount: 32000,
      flow_type: 'AMOS_TO_BUSINESS',
      sub_type: 'ASSET_CONTRIBUTED',
      sender: 'Amos (Personal Hardware)',
      receiver: 'AmozTech (Parent HQ)',
      business_unit_id: 1,
      category_name: 'Asset Contributed by Amos',
      payment_method: 'BANK',
      reference: 'AST-EQ-001',
      reason: 'Contributed Dell PowerEdge R750 Server Rack to AmozTech HQ as in-kind equity',
      notes: 'Legal title transferred to AmozTech HQ; recorded in Asset Register',
      settlement_status: 'NOT_APPLICABLE'
    },
    {
      date: '2026-03-19',
      amount: 14500,
      flow_type: 'AMOS_TO_BUSINESS',
      sub_type: 'EXPENSE_PAID_PERSONALLY',
      sender: 'Amos (Personal Visa Card)',
      receiver: 'AWS & OpenAI (For Engage AI)',
      business_unit_id: 3,
      category_name: 'Software Subscriptions & AI APIs',
      payment_method: 'BANK',
      reference: 'EXP-PERS-001',
      reason: 'Amos paid Engage AI AWS & OpenAI API production invoice using personal card',
      notes: 'GH₵ 10,000 reimbursed on 2026-06-15; GH₵ 4,500 still owed to Amos',
      settlement_status: 'PARTIAL',
      settled_amount: 10000
    },
    {
      date: '2026-04-08',
      amount: 8200,
      flow_type: 'AMOS_TO_BUSINESS',
      sub_type: 'EXPENSE_PAID_PERSONALLY',
      sender: 'Amos (Personal MTN MoMo)',
      receiver: 'Cybersecurity Authority / Compliance (For PayLite)',
      business_unit_id: 2,
      category_name: 'Cloud Hosting & Infrastructure',
      payment_method: 'MOMO',
      reference: 'EXP-PERS-002',
      reason: 'Amos personally paid PayLite PCI-DSS & sandbox compliance renewal fee',
      notes: 'Full amount GH₵ 8,200 awaiting reimbursement from PayLite',
      settlement_status: 'OPEN',
      settled_amount: 0
    },
    {
      date: '2026-04-22',
      amount: 6800,
      flow_type: 'AMOS_TO_BUSINESS',
      sub_type: 'EXPENSE_PAID_PERSONALLY',
      sender: 'Amos (Personal MTN MoMo)',
      receiver: 'UI/UX Contractor (For Custom Projects)',
      business_unit_id: 4,
      category_name: 'Project & Contractor Costs',
      payment_method: 'MOMO',
      reference: 'EXP-PERS-003',
      reason: 'Amos paid urgent frontend contractor milestone on behalf of Custom Projects',
      notes: 'Fully reimbursed on 2026-05-28',
      settlement_status: 'SETTLED',
      settled_amount: 6800
    },

    // --- OPERATING REVENUE & OPERATING EXPENSES BY UNIT ---
    {
      date: '2026-05-03',
      amount: 148000,
      flow_type: 'INCOME_EXPENSE',
      sub_type: 'REVENUE',
      sender: 'PayLite Merchant Settlement Pool',
      receiver: 'PayLite',
      business_unit_id: 2,
      category_name: 'Payment Gateway Commissions',
      payment_method: 'BANK',
      reference: 'REV-PAY-001',
      reason: 'PayLite Q1-Q2 merchant payment processing & MoMo gateway commissions',
      notes: 'Settled via GCB Merchant Settlement Account'
    },
    {
      date: '2026-05-12',
      amount: 96500,
      flow_type: 'INCOME_EXPENSE',
      sub_type: 'REVENUE',
      sender: 'Enterprise SaaS Clients (14 Banks & Retailers)',
      receiver: 'Engage AI',
      business_unit_id: 3,
      category_name: 'SaaS & Subscription Revenue',
      payment_method: 'BANK',
      reference: 'REV-ENG-001',
      reason: 'Engage AI annual & quarterly conversational AI subscription licenses',
      notes: 'Includes 8 enterprise WhatsApp AI deployments'
    },
    {
      date: '2026-05-19',
      amount: 115000,
      flow_type: 'INCOME_EXPENSE',
      sub_type: 'REVENUE',
      sender: 'Tema Logistics & AgroExport Consortium',
      receiver: 'Custom Projects',
      business_unit_id: 4,
      category_name: 'Client Project Milestone Revenue',
      payment_method: 'BANK',
      reference: 'REV-CUS-001',
      reason: 'Custom Projects ERP & fleet tracking platform delivery milestone 1 & 2',
      notes: 'Contract #CP-2026-09'
    },
    {
      date: '2026-05-25',
      amount: 38000,
      flow_type: 'INCOME_EXPENSE',
      sub_type: 'REVENUE',
      sender: 'Corporate Digital Advisory Retainers',
      receiver: 'AmozTech (Parent HQ)',
      business_unit_id: 1,
      category_name: 'Client Project Milestone Revenue',
      payment_method: 'BANK',
      reference: 'REV-HQ-001',
      reason: 'AmozTech HQ technical architecture & CTO advisory retainer fees',
      notes: 'Direct parent company consulting revenue'
    },
    {
      date: '2026-05-28',
      amount: 6800,
      flow_type: 'BUSINESS_TO_AMOS',
      sub_type: 'REIMBURSEMENT',
      sender: 'Custom Projects',
      receiver: 'Amos (Personal MTN MoMo)',
      business_unit_id: 4,
      category_name: 'Expense Reimbursement to Amos',
      payment_method: 'MOMO',
      reference: 'RMB-2026-001',
      reason: 'Full reimbursement to Amos for UI/UX contractor milestone (EXP-PERS-003)',
      notes: 'Settles Custom Projects reimbursable balance to zero',
      settlement_status: 'SETTLED',
      settled_amount: 6800
    },
    {
      date: '2026-06-05',
      amount: 34000,
      flow_type: 'INCOME_EXPENSE',
      sub_type: 'OPERATING_EXPENSE',
      sender: 'PayLite',
      receiver: 'AWS Africa (Cape Town) & Telco Aggregators',
      business_unit_id: 2,
      category_name: 'Cloud Hosting & Infrastructure',
      payment_method: 'BANK',
      reference: 'OPEX-PAY-001',
      reason: 'PayLite dedicated cloud nodes, USSD shortcode rental & ISO security audit',
      notes: 'Direct operating expense of PayLite'
    },
    {
      date: '2026-06-10',
      amount: 26400,
      flow_type: 'INCOME_EXPENSE',
      sub_type: 'OPERATING_EXPENSE',
      sender: 'Engage AI',
      receiver: 'Anthropic, OpenAI & Pinecone Cloud',
      business_unit_id: 3,
      category_name: 'Software Subscriptions & AI APIs',
      payment_method: 'BANK',
      reference: 'OPEX-ENG-001',
      reason: 'Engage AI production LLM token usage & vector database cluster costs',
      notes: 'Paid directly from Engage AI bank account'
    },
    {
      date: '2026-06-15',
      amount: 10000,
      flow_type: 'BUSINESS_TO_AMOS',
      sub_type: 'REIMBURSEMENT',
      sender: 'Engage AI',
      receiver: 'Amos (Personal Ecobank)',
      business_unit_id: 3,
      category_name: 'Expense Reimbursement to Amos',
      payment_method: 'BANK',
      reference: 'RMB-2026-002',
      reason: 'Partial reimbursement to Amos for March AWS/OpenAI bill (EXP-PERS-001)',
      notes: 'Leaves GH₵ 4,500 remaining balance owed to Amos on EXP-PERS-001',
      settlement_status: 'SETTLED',
      settled_amount: 10000
    },
    {
      date: '2026-06-22',
      amount: 15000,
      flow_type: 'BUSINESS_TO_AMOS',
      sub_type: 'LOAN_REPAYMENT',
      sender: 'PayLite',
      receiver: 'Amos (Personal Ecobank)',
      business_unit_id: 2,
      category_name: 'Owner Loan Principal Repayment',
      payment_method: 'BANK',
      reference: 'LNR-2026-001',
      reason: 'Partial repayment of Amos owner bridge loan (LN-2026-001)',
      notes: 'Reduces PayLite loan liability from GH₵ 40,000 to GH₵ 25,000',
      settlement_status: 'SETTLED',
      settled_amount: 15000
    },
    {
      date: '2026-07-02',
      amount: 42000,
      flow_type: 'INCOME_EXPENSE',
      sub_type: 'OPERATING_EXPENSE',
      sender: 'Custom Projects',
      receiver: 'Engineering & QA Delivery Squad',
      business_unit_id: 4,
      category_name: 'Project & Contractor Costs',
      payment_method: 'BANK',
      reference: 'OPEX-CUS-001',
      reason: 'Custom Projects software developers, QA engineers & DevOps milestone payouts',
      notes: 'Direct project delivery cost'
    },
    {
      date: '2026-07-15',
      amount: 41500,
      flow_type: 'INCOME_EXPENSE',
      sub_type: 'OPERATING_EXPENSE',
      sender: 'AmozTech (Parent HQ)',
      receiver: 'East Legon HQ Office, Staff & GRA',
      business_unit_id: 1,
      category_name: 'Staff Payroll & Operations',
      payment_method: 'BANK',
      reference: 'OPEX-HQ-001',
      reason: 'AmozTech HQ shared staff payroll, East Legon office lease & GRA statutory taxes',
      notes: 'Includes GH₵ 8,500 GRA quarterly tax remittance'
    },

    // --- BUSINESS -> AMOS (Salary, Dividends, Drawings, Personal Spend by Business) ---
    {
      date: '2026-07-30',
      amount: 12000,
      flow_type: 'BUSINESS_TO_AMOS',
      sub_type: 'SALARY',
      sender: 'AmozTech (Parent HQ)',
      receiver: 'Amos (Personal Ecobank)',
      business_unit_id: 1,
      category_name: 'Executive Management Salary (Amos)',
      payment_method: 'BANK',
      reference: 'SAL-2026-001',
      reason: 'Executive CEO/CTO management salary paid to Amos for operational leadership',
      notes: 'Classified strictly as management compensation (operating expense), NOT investment return',
      settlement_status: 'NOT_APPLICABLE'
    },
    {
      date: '2026-08-12',
      amount: 18000,
      flow_type: 'BUSINESS_TO_AMOS',
      sub_type: 'DIVIDEND',
      sender: 'PayLite',
      receiver: 'Amos (Personal Ecobank)',
      business_unit_id: 2,
      category_name: 'Dividend / Profit Distribution',
      payment_method: 'BANK',
      reference: 'DIV-2026-001',
      reason: 'Interim profit distribution / dividend paid to Amos from PayLite net earnings',
      notes: 'True financial return on Amos equity investment in PayLite',
      settlement_status: 'NOT_APPLICABLE'
    },
    {
      date: '2026-08-20',
      amount: 4500,
      flow_type: 'BUSINESS_TO_AMOS',
      sub_type: 'OWNER_DRAWING',
      sender: 'AmozTech (Parent HQ)',
      receiver: 'Amos (Personal MTN MoMo)',
      business_unit_id: 1,
      category_name: 'Owner Drawing / Withdrawal',
      payment_method: 'MOMO',
      reference: 'DRW-2026-001',
      reason: 'Owner equity drawing by Amos from AmozTech HQ',
      notes: 'Recorded against Owner Drawings (3200), separate from salary and loans',
      settlement_status: 'NOT_APPLICABLE'
    },
    {
      date: '2026-09-03',
      amount: 9500,
      flow_type: 'BUSINESS_TO_AMOS',
      sub_type: 'PERSONAL_EXPENSE_BY_BUSINESS',
      sender: 'AmozTech (Parent HQ)',
      receiver: 'Emirates / Personal Home Fiber (For Amos)',
      business_unit_id: 1,
      category_name: 'Personal Expense Paid for Amos',
      payment_method: 'BANK',
      reference: 'PER-BIZ-001',
      reason: 'AmozTech HQ corporate card used for Amos personal family flight & residential fiber',
      notes: 'Creates receivable: Amos owes AmozTech HQ GH₵ 9,500 (GH₵ 5,500 repaid on 2026-09-18)',
      settlement_status: 'PARTIAL',
      settled_amount: 5500
    },
    {
      date: '2026-09-10',
      amount: 4200,
      flow_type: 'BUSINESS_TO_AMOS',
      sub_type: 'PERSONAL_EXPENSE_BY_BUSINESS',
      sender: 'PayLite',
      receiver: 'Enterprise Insurance (For Amos Personal Car)',
      business_unit_id: 2,
      category_name: 'Personal Expense Paid for Amos',
      payment_method: 'MOMO',
      reference: 'PER-BIZ-002',
      reason: 'PayLite MoMo wallet paid Amos personal vehicle comprehensive insurance renewal',
      notes: 'Creates receivable: Amos owes PayLite GH₵ 4,200',
      settlement_status: 'OPEN',
      settled_amount: 0
    },
    {
      date: '2026-09-18',
      amount: 5500,
      flow_type: 'AMOS_TO_BUSINESS',
      sub_type: 'AMOS_REPAYS_BUSINESS',
      sender: 'Amos (Personal MTN MoMo)',
      receiver: 'AmozTech (Parent HQ)',
      business_unit_id: 1,
      category_name: 'Amos Repays Business Receivable',
      payment_method: 'MOMO',
      reference: 'RPY-AMOS-001',
      reason: 'Amos partial repayment to AmozTech HQ for personal flight & fiber spend (PER-BIZ-001)',
      notes: 'Reduces what Amos owes AmozTech HQ from GH₵ 9,500 to GH₵ 4,000',
      settlement_status: 'SETTLED',
      settled_amount: 5500
    },

    // --- INTERNAL BUSINESS TRANSFERS (Between AmozTech HQ, PayLite, Engage AI, Custom Projects) ---
    {
      date: '2026-09-25',
      amount: 30000,
      flow_type: 'UNIT_TRANSFER',
      sub_type: 'INTERNAL_TRANSFER',
      sender: 'AmozTech (Parent HQ)',
      receiver: 'Engage AI',
      business_unit_id: 1,
      counterparty_unit_id: 3,
      category_name: 'Inter-Unit Funding Transfer',
      payment_method: 'BANK',
      reference: 'TRF-2026-001',
      reason: 'Internal R&D liquidity allocation from AmozTech HQ to Engage AI',
      notes: 'Inter-company transfer: Excluded from consolidated income/expense to prevent double counting'
    },
    {
      date: '2026-10-04',
      amount: 18500,
      flow_type: 'UNIT_TRANSFER',
      sub_type: 'INTERNAL_TRANSFER',
      sender: 'PayLite',
      receiver: 'AmozTech (Parent HQ)',
      business_unit_id: 2,
      counterparty_unit_id: 1,
      category_name: 'Inter-Unit Funding Transfer',
      payment_method: 'BANK',
      reference: 'TRF-2026-002',
      reason: 'PayLite internal treasury transfer to AmozTech HQ shared infrastructure pool',
      notes: 'Zero P&L impact; tracked via Inter-Unit Clearing accounts 1400/2400'
    },
    {
      date: '2026-10-15',
      amount: 12000,
      flow_type: 'UNIT_TRANSFER',
      sub_type: 'INTERNAL_TRANSFER',
      sender: 'Custom Projects',
      receiver: 'PayLite',
      business_unit_id: 4,
      counterparty_unit_id: 2,
      category_name: 'Inter-Unit Funding Transfer',
      payment_method: 'BANK',
      reference: 'TRF-2026-003',
      reason: 'Short-term working capital transfer from Custom Projects to PayLite settlement float',
      notes: 'Internal business unit transfer'
    }
  ];

  for (const tx of sampleTransactions) {
    insertTransactionWithJournal(database, tx, 'Amos (Owner)', 'OWNER_ADMIN');
  }

  // 6. Seed Asset Register (Personal Assets Used by Business vs. Business-Owned Assets)
  const sampleAssets = [
    {
      asset_code: 'AST-001',
      name: 'MacBook Pro 16" (M3 Max, 64GB RAM)',
      category: 'Computing & Engineering',
      description: 'Primary AI model training & full-stack engineering workstation owned personally by Amos, used daily by Engage AI lead engineering.',
      purchase_cost: 42000,
      salvage_value: 8000,
      useful_life_years: 4,
      current_value: 35000,
      legal_owner_type: 'AMOS_PERSONAL',
      legal_owner_name: 'Amos (Personal Property)',
      using_unit_id: 3,
      acquisition_mode: 'PERSONAL_ASSET_USED_BY_BUSINESS',
      purchase_date: '2025-11-10',
      condition: 'Excellent',
      depreciation_method: 'STRAIGHT_LINE',
      serial_number: 'C02M3MAX9981',
      supporting_doc: 'iStore_Accra_Receipt_9981.pdf',
      notes: 'Title remains with Amos personally; deployed for Engage AI operations.'
    },
    {
      asset_code: 'AST-002',
      name: 'Toyota RAV4 Hybrid (Executive & Enterprise Field Vehicle)',
      category: 'Vehicles & Logistics',
      description: 'Amos personal vehicle used 75% for client executive meetings, bank integrations, and merchant onboarding across AmozTech & PayLite.',
      purchase_cost: 280000,
      salvage_value: 90000,
      useful_life_years: 6,
      current_value: 245000,
      legal_owner_type: 'AMOS_PERSONAL',
      legal_owner_name: 'Amos (Personal Property)',
      using_unit_id: 1,
      acquisition_mode: 'PERSONAL_ASSET_USED_BY_BUSINESS',
      purchase_date: '2025-08-15',
      condition: 'Excellent',
      depreciation_method: 'STRAIGHT_LINE',
      serial_number: 'JTMWRREV-GH-2025',
      supporting_doc: 'DVLA_Title_Amos_RAV4.pdf',
      notes: 'Personally owned by Amos; used by AmozTech HQ and client teams.'
    },
    {
      asset_code: 'AST-003',
      name: 'Starlink Enterprise High-Performance Kit + 5kVA EcoFlow Solar Backup',
      category: 'Power & Connectivity',
      description: 'High-availability internet & lithium backup power owned by Amos personally and installed at PayLite NOC room.',
      purchase_cost: 28500,
      salvage_value: 4500,
      useful_life_years: 4,
      current_value: 24000,
      legal_owner_type: 'AMOS_PERSONAL',
      legal_owner_name: 'Amos (Personal Property)',
      using_unit_id: 2,
      acquisition_mode: 'PERSONAL_ASSET_USED_BY_BUSINESS',
      purchase_date: '2026-01-20',
      condition: 'Excellent',
      depreciation_method: 'STRAIGHT_LINE',
      serial_number: 'STL-GH-88342',
      supporting_doc: 'Starlink_EcoFlow_Invoice.pdf',
      notes: 'Personally owned by Amos; provides 99.99% uptime for PayLite.'
    },
    {
      asset_code: 'AST-004',
      name: 'Dell PowerEdge R750 Dual-Xeon Server Rack',
      category: 'Servers & Infrastructure',
      description: 'Contributed by Amos as in-kind equity capital (AST-EQ-001); legal ownership transferred to AmozTech HQ.',
      purchase_cost: 32000,
      salvage_value: 4000,
      useful_life_years: 5,
      current_value: 27200,
      legal_owner_type: 'BUSINESS',
      legal_owner_name: 'AmozTech (Parent HQ)',
      using_unit_id: 1,
      acquisition_mode: 'CAPITAL_CONTRIBUTION',
      purchase_date: '2026-03-04',
      condition: 'Excellent',
      depreciation_method: 'STRAIGHT_LINE',
      serial_number: 'DELL-R750-AMZ01',
      supporting_doc: 'Deed_Of_Contribution_AST004.pdf',
      notes: 'Business-owned asset via Amos equity contribution.'
    },
    {
      asset_code: 'AST-005',
      name: 'Smart Android POS & NFC Terminal Fleet (25 Devices)',
      category: 'FinTech Hardware',
      description: 'Purchased directly by PayLite for merchant pilot deployments in Accra & Kumasi.',
      purchase_cost: 37500,
      salvage_value: 5000,
      useful_life_years: 3,
      current_value: 31000,
      legal_owner_type: 'BUSINESS',
      legal_owner_name: 'PayLite',
      using_unit_id: 2,
      acquisition_mode: 'BUSINESS_PURCHASE',
      purchase_date: '2026-04-12',
      condition: 'Good',
      depreciation_method: 'STRAIGHT_LINE',
      serial_number: 'PAYL-POS-BATCH01',
      supporting_doc: 'Supplier_Commercial_Invoice_POS.pdf',
      notes: '100% owned by PayLite business unit.'
    },
    {
      asset_code: 'AST-006',
      name: 'NVIDIA Dual RTX-4090 Local AI Inference Workstation',
      category: 'Computing & Engineering',
      description: 'Purchased by Engage AI for local voice/twi NLP fine-tuning and low-latency testing.',
      purchase_cost: 54000,
      salvage_value: 10000,
      useful_life_years: 4,
      current_value: 46500,
      legal_owner_type: 'BUSINESS',
      legal_owner_name: 'Engage AI',
      using_unit_id: 3,
      acquisition_mode: 'BUSINESS_PURCHASE',
      purchase_date: '2026-05-20',
      condition: 'Excellent',
      depreciation_method: 'STRAIGHT_LINE',
      serial_number: 'NV-AI-ENG-009',
      supporting_doc: 'B&H_Pro_Invoice_4090.pdf',
      notes: '100% owned by Engage AI business unit.'
    }
  ];

  for (const a of sampleAssets) {
    runStmt(
      database,
      `INSERT INTO assets (
        asset_code, name, category, description, purchase_cost, salvage_value,
        useful_life_years, current_value, legal_owner_type, legal_owner_name,
        using_unit_id, acquisition_mode, purchase_date, condition,
        depreciation_method, serial_number, supporting_doc, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        a.asset_code, a.name, a.category, a.description, a.purchase_cost, a.salvage_value,
        a.useful_life_years, a.current_value, a.legal_owner_type, a.legal_owner_name,
        a.using_unit_id, a.acquisition_mode, a.purchase_date, a.condition,
        a.depreciation_method, a.serial_number, a.supporting_doc, a.notes
      ]
    );
  }

  recordAudit(database, {
    actor: 'System Bootstrap',
    role: 'OWNER_ADMIN',
    action: 'INITIALIZE_LEDGER',
    entityType: 'SYSTEM',
    entityId: 'AMOZTECH-CORE',
    summary: 'Initialized AmozTech Separate Entity Ledger with 4 Business Units, 23 Transactions, 6 Assets, and Double-Entry Chart of Accounts.'
  });
}

function resetToSampleData() {
  if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
  }
  db = new SQL.Database();
  initializeSchema(db);
  seedDatabase(db);
  persistDb();
  return db;
}

function clearToCleanData() {
  if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
  }
  db = new SQL.Database();
  initializeSchema(db);
  seedStructure(db);
  recordAudit(db, {
    actor: 'Amos (Owner)',
    role: 'OWNER_ADMIN',
    action: 'INITIALIZE_CLEAN_LEDGER',
    entityType: 'SYSTEM',
    entityId: 'AMOZTECH-CORE',
    summary: 'Clean ledger initialized on device storage. Ready for real company transactions.'
  });
  persistDb();
  return db;
}

module.exports = {
  getDb,
  persistDb,
  queryAll,
  queryOne,
  runStmt,
  recordAudit,
  insertTransactionWithJournal,
  resetToSampleData,
  clearToCleanData,
  DB_FILE
};

