const express = require('express');
const cors = require('cors');
const path = require('path');
const {
  getDb,
  persistDb,
  queryAll,
  queryOne,
  runStmt,
  recordAudit,
  insertTransactionWithJournal,
  resetToSampleData,
  clearToCleanData
} = require('./src/db/database');
const {
  computeFinancialState,
  generateJournalLines,
  round2
} = require('./src/engine/accountingEngine');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function checkPermission(role, action) {
  if (role === 'AUDITOR' && action !== 'READ') {
    const err = new Error('Role AUDITOR has read-only access and cannot modify financial records.');
    err.status = 403;
    throw err;
  }
  if (role === 'UNIT_MANAGER' && (action === 'VOID' || action === 'SETTINGS')) {
    const err = new Error('Role UNIT_MANAGER cannot void transactions or modify group settings.');
    err.status = 403;
    throw err;
  }
}

// GET /api/state -> Full computed state for Dashboard & all 10 modules
app.get('/api/state', async (req, res) => {
  try {
    const db = await getDb();
    const filterUnitId = req.query.unitId || 'ALL';
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;

    const businessUnits = queryAll(db, `SELECT * FROM business_units WHERE active = 1 ORDER BY is_parent DESC, id ASC`);
    const transactions = queryAll(
      db,
      `SELECT t.*, b.name AS business_unit_name, b.code AS business_unit_code,
              c.name AS counterparty_unit_name
       FROM transactions t
       LEFT JOIN business_units b ON b.id = t.business_unit_id
       LEFT JOIN business_units c ON c.id = t.counterparty_unit_id
       ORDER BY t.date DESC, t.id DESC`
    );
    const assets = queryAll(
      db,
      `SELECT a.*, b.name AS using_unit_name
       FROM assets a
       LEFT JOIN business_units b ON b.id = a.using_unit_id
       ORDER BY a.id DESC`
    );
    const categories = queryAll(db, `SELECT * FROM categories ORDER BY id ASC`);
    const currencies = queryAll(db, `SELECT * FROM currencies ORDER BY is_default DESC, code ASC`);
    const users = queryAll(db, `SELECT * FROM users WHERE active = 1 ORDER BY id ASC`);
    const accounts = queryAll(db, `SELECT * FROM accounts ORDER BY code ASC`);
    const auditLogs = queryAll(db, `SELECT * FROM audit_logs ORDER BY id DESC LIMIT 120`);
    const journalLines = queryAll(
      db,
      `SELECT jl.*, je.tx_code, je.date, je.description, a.name AS account_name, a.type AS account_type, b.name AS unit_name
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.journal_entry_id
       JOIN transactions t ON t.id = jl.transaction_id
       LEFT JOIN accounts a ON a.code = jl.account_code
       LEFT JOIN business_units b ON b.id = jl.business_unit_id
       WHERE t.status = 'ACTIVE'
       ORDER BY je.date DESC, jl.id ASC`
    );

    const computed = computeFinancialState({
      businessUnits,
      transactions,
      assets,
      filterUnitId,
      startDate,
      endDate
    });

    res.json({
      ok: true,
      filters: { unitId: filterUnitId, startDate, endDate },
      businessUnits,
      transactions,
      assets: computed.valuedAssets,
      categories,
      currencies,
      users,
      accounts,
      auditLogs,
      journalLines,
      computed
    });
  } catch (err) {
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

// POST /api/transactions -> Record new transaction with double-entry journal & audit log
app.post('/api/transactions', async (req, res) => {
  try {
    const db = await getDb();
    const actor = req.body.actor || 'Amos (Founder & CEO)';
    const role = req.body.role || 'OWNER_ADMIN';
    checkPermission(role, 'CREATE');

    const inserted = insertTransactionWithJournal(db, req.body, actor, role);
    persistDb();
    res.json({ ok: true, transaction: inserted });
  } catch (err) {
    res.status(err.status || 400).json({ ok: false, error: err.message });
  }
});

// PUT /api/transactions/:id -> Edit transaction with immutable before/after audit log & journal regeneration
app.put('/api/transactions/:id', async (req, res) => {
  try {
    const db = await getDb();
    const txId = Number(req.params.id);
    const actor = req.body.actor || 'Amos (Founder & CEO)';
    const role = req.body.role || 'OWNER_ADMIN';
    checkPermission(role, 'EDIT');

    const existing = queryOne(db, `SELECT * FROM transactions WHERE id = ?`, [txId]);
    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Transaction not found.' });
    }

    const amount = round2(Number(req.body.amount ?? existing.amount));
    const rate = Number(req.body.exchange_rate ?? existing.exchange_rate ?? 1);
    const amountGhs = round2(amount * rate);

    const updatedPayload = {
      ...existing,
      date: req.body.date || existing.date,
      amount,
      currency: req.body.currency || existing.currency,
      exchange_rate: rate,
      amount_ghs: amountGhs,
      flow_type: req.body.flow_type || existing.flow_type,
      sub_type: req.body.sub_type || existing.sub_type,
      sender: req.body.sender || existing.sender,
      receiver: req.body.receiver || existing.receiver,
      business_unit_id: Number(req.body.business_unit_id || existing.business_unit_id),
      counterparty_unit_id: req.body.counterparty_unit_id ? Number(req.body.counterparty_unit_id) : existing.counterparty_unit_id,
      category_name: req.body.category_name || existing.category_name,
      payment_method: req.body.payment_method || existing.payment_method,
      reference: req.body.reference ?? existing.reference,
      reason: req.body.reason || existing.reason,
      notes: req.body.notes ?? existing.notes
    };

    const newLines = generateJournalLines(updatedPayload);

    runStmt(
      db,
      `UPDATE transactions
       SET date = ?, amount = ?, currency = ?, exchange_rate = ?, amount_ghs = ?,
           flow_type = ?, sub_type = ?, sender = ?, receiver = ?, business_unit_id = ?,
           counterparty_unit_id = ?, category_name = ?, payment_method = ?,
           reference = ?, reason = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [
        updatedPayload.date,
        updatedPayload.amount,
        updatedPayload.currency,
        updatedPayload.exchange_rate,
        updatedPayload.amount_ghs,
        updatedPayload.flow_type,
        updatedPayload.sub_type,
        updatedPayload.sender,
        updatedPayload.receiver,
        updatedPayload.business_unit_id,
        updatedPayload.counterparty_unit_id,
        updatedPayload.category_name,
        updatedPayload.payment_method,
        updatedPayload.reference,
        updatedPayload.reason,
        updatedPayload.notes,
        new Date().toISOString(),
        txId
      ]
    );

    // Rebuild journal lines
    const je = queryOne(db, `SELECT id FROM journal_entries WHERE transaction_id = ?`, [txId]);
    if (je) {
      runStmt(db, `DELETE FROM journal_lines WHERE transaction_id = ?`, [txId]);
      for (const l of newLines) {
        runStmt(
          db,
          `INSERT INTO journal_lines (journal_entry_id, transaction_id, account_code, business_unit_id, debit, credit, memo)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [je.id, txId, l.account_code, Number(l.business_unit_id), l.debit, l.credit, l.memo]
        );
      }
    }

    const afterTx = queryOne(db, `SELECT * FROM transactions WHERE id = ?`, [txId]);
    recordAudit(db, {
      actor,
      role,
      action: 'EDIT_TRANSACTION',
      entityType: 'TRANSACTION',
      entityId: existing.tx_code,
      summary: `Edited ${existing.tx_code}: amount GH₵ ${existing.amount_ghs} -> GH₵ ${afterTx.amount_ghs}, reason "${afterTx.reason}"`,
      before: existing,
      after: afterTx
    });

    persistDb();
    res.json({ ok: true, transaction: afterTx });
  } catch (err) {
    res.status(err.status || 400).json({ ok: false, error: err.message });
  }
});

// POST /api/transactions/:id/settle -> Partial or Full Settlement of Loan, Reimbursement, or Amos Receivable
app.post('/api/transactions/:id/settle', async (req, res) => {
  try {
    const db = await getDb();
    const txId = Number(req.params.id);
    const actor = req.body.actor || 'Amos (Founder & CEO)';
    const role = req.body.role || 'OWNER_ADMIN';
    checkPermission(role, 'SETTLE');

    const parentTx = queryOne(db, `SELECT * FROM transactions WHERE id = ? AND status = 'ACTIVE'`, [txId]);
    if (!parentTx) {
      return res.status(404).json({ ok: false, error: 'Original transaction not found.' });
    }

    const settleAmount = round2(Number(req.body.amount || 0));
    const remaining = round2(parentTx.amount_ghs - Number(parentTx.settled_amount || 0));
    if (settleAmount <= 0 || settleAmount > remaining) {
      return res.status(400).json({
        ok: false,
        error: `Settlement amount must be between GH₵ 0.01 and the remaining balance of GH₵ ${remaining}.`
      });
    }

    const unit = queryOne(db, `SELECT * FROM business_units WHERE id = ?`, [parentTx.business_unit_id]);
    const unitName = unit ? unit.name : 'AmozTech';

    let settlementFlow = 'BUSINESS_TO_AMOS';
    let settlementSub = 'REIMBURSEMENT';
    let settlementCategory = 'Expense Reimbursement to Amos';
    let sender = unitName;
    let receiver = 'Amos (Personal Account)';

    if (parentTx.sub_type === 'OWNER_LOAN') {
      settlementFlow = 'BUSINESS_TO_AMOS';
      settlementSub = 'LOAN_REPAYMENT';
      settlementCategory = 'Owner Loan Principal Repayment';
    } else if (parentTx.sub_type === 'EXPENSE_PAID_PERSONALLY') {
      settlementFlow = 'BUSINESS_TO_AMOS';
      settlementSub = 'REIMBURSEMENT';
      settlementCategory = 'Expense Reimbursement to Amos';
    } else if (parentTx.sub_type === 'PERSONAL_EXPENSE_BY_BUSINESS') {
      settlementFlow = 'AMOS_TO_BUSINESS';
      settlementSub = 'AMOS_REPAYS_BUSINESS';
      settlementCategory = 'Amos Repays Business Receivable';
      sender = 'Amos (Personal Account)';
      receiver = unitName;
    } else {
      return res.status(400).json({
        ok: false,
        error: 'Only Owner Loans, Reimbursable Business Expenses, or Amos Personal Spend receivables can be settled.'
      });
    }

    const newSettledTotal = round2(Number(parentTx.settled_amount || 0) + settleAmount);
    const newStatus = newSettledTotal >= parentTx.amount_ghs ? 'SETTLED' : 'PARTIAL';

    const settlementTx = insertTransactionWithJournal(
      db,
      {
        date: req.body.date || new Date().toISOString().slice(0, 10),
        amount: settleAmount,
        currency: 'GHS',
        exchange_rate: 1.0,
        flow_type: settlementFlow,
        sub_type: settlementSub,
        sender,
        receiver,
        business_unit_id: parentTx.business_unit_id,
        category_name: settlementCategory,
        payment_method: req.body.payment_method || parentTx.payment_method || 'BANK',
        reference: `STL-${parentTx.tx_code}`,
        reason: `${newStatus === 'SETTLED' ? 'Full' : 'Partial'} settlement of ${parentTx.tx_code} (${parentTx.reason})`,
        notes: req.body.notes || `Settled GH₵ ${settleAmount} against ${parentTx.tx_code}`,
        settlement_status: 'SETTLED',
        settled_amount: settleAmount,
        parent_tx_id: parentTx.id,
        allow_duplicate: true
      },
      actor,
      role
    );

    runStmt(
      db,
      `UPDATE transactions SET settled_amount = ?, settlement_status = ?, updated_at = ? WHERE id = ?`,
      [newSettledTotal, newStatus, new Date().toISOString(), parentTx.id]
    );

    const updatedParent = queryOne(db, `SELECT * FROM transactions WHERE id = ?`, [parentTx.id]);
    recordAudit(db, {
      actor,
      role,
      action: 'SETTLE_CURRENT_ACCOUNT',
      entityType: 'TRANSACTION',
      entityId: parentTx.tx_code,
      summary: `Settled GH₵ ${settleAmount} on ${parentTx.tx_code} -> status is now ${newStatus} (Settled: GH₵ ${newSettledTotal} / GH₵ ${parentTx.amount_ghs})`,
      before: parentTx,
      after: updatedParent
    });

    persistDb();
    res.json({ ok: true, parentTransaction: updatedParent, settlementTransaction: settlementTx });
  } catch (err) {
    res.status(err.status || 400).json({ ok: false, error: err.message });
  }
});

// POST /api/transactions/:id/void -> Void a transaction with immutable audit record
app.post('/api/transactions/:id/void', async (req, res) => {
  try {
    const db = await getDb();
    const txId = Number(req.params.id);
    const actor = req.body.actor || 'Amos (Founder & CEO)';
    const role = req.body.role || 'OWNER_ADMIN';
    checkPermission(role, 'VOID');

    const existing = queryOne(db, `SELECT * FROM transactions WHERE id = ?`, [txId]);
    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Transaction not found.' });
    }

    runStmt(db, `UPDATE transactions SET status = 'VOIDED', updated_at = ? WHERE id = ?`, [new Date().toISOString(), txId]);
    const after = queryOne(db, `SELECT * FROM transactions WHERE id = ?`, [txId]);

    recordAudit(db, {
      actor,
      role,
      action: 'VOID_TRANSACTION',
      entityType: 'TRANSACTION',
      entityId: existing.tx_code,
      summary: `Voided transaction ${existing.tx_code} (GH₵ ${existing.amount_ghs}) — Reason: ${req.body.void_reason || 'Administrative reversal'}`,
      before: existing,
      after
    });

    persistDb();
    res.json({ ok: true, transaction: after });
  } catch (err) {
    res.status(err.status || 400).json({ ok: false, error: err.message });
  }
});

// POST /api/assets -> Add Asset to Asset Register
app.post('/api/assets', async (req, res) => {
  try {
    const db = await getDb();
    const actor = req.body.actor || 'Amos (Founder & CEO)';
    const role = req.body.role || 'OWNER_ADMIN';
    checkPermission(role, 'CREATE');

    const countRow = queryOne(db, `SELECT COUNT(*) AS cnt FROM assets`);
    const nextNum = (countRow ? Number(countRow.cnt) : 0) + 1;
    const assetCode = req.body.asset_code || `AST-00${nextNum}`;
    const cost = round2(Number(req.body.purchase_cost || 0));
    if (cost <= 0) {
      return res.status(400).json({ ok: false, error: 'Asset purchase cost must be greater than zero.' });
    }

    runStmt(
      db,
      `INSERT INTO assets (
        asset_code, name, category, description, purchase_cost, salvage_value,
        useful_life_years, current_value, legal_owner_type, legal_owner_name,
        using_unit_id, acquisition_mode, purchase_date, condition,
        depreciation_method, serial_number, supporting_doc, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assetCode,
        req.body.name,
        req.body.category || 'Computing & Tech',
        req.body.description || '',
        cost,
        round2(Number(req.body.salvage_value || 0)),
        Number(req.body.useful_life_years || 4),
        req.body.current_value ? round2(Number(req.body.current_value)) : cost,
        req.body.legal_owner_type || 'BUSINESS',
        req.body.legal_owner_name || 'AmozTech',
        Number(req.body.using_unit_id || 1),
        req.body.acquisition_mode || 'BUSINESS_PURCHASE',
        req.body.purchase_date || new Date().toISOString().slice(0, 10),
        req.body.condition || 'Excellent',
        req.body.depreciation_method || 'STRAIGHT_LINE',
        req.body.serial_number || '',
        req.body.supporting_doc || '',
        req.body.notes || ''
      ]
    );

    const insertedAsset = queryOne(db, `SELECT * FROM assets WHERE asset_code = ?`, [assetCode]);

    // Optionally record corresponding transaction if requested
    if (req.body.record_ledger_entry) {
      const unit = queryOne(db, `SELECT * FROM business_units WHERE id = ?`, [Number(req.body.using_unit_id || 1)]);
      if (req.body.acquisition_mode === 'CAPITAL_CONTRIBUTION') {
        insertTransactionWithJournal(
          db,
          {
            date: insertedAsset.purchase_date,
            amount: cost,
            currency: 'GHS',
            exchange_rate: 1,
            flow_type: 'AMOS_TO_BUSINESS',
            sub_type: 'ASSET_CONTRIBUTED',
            sender: 'Amos (Personal Property)',
            receiver: unit ? unit.name : 'AmozTech',
            business_unit_id: insertedAsset.using_unit_id,
            category_name: 'Asset Contributed by Amos',
            payment_method: 'BANK',
            reference: assetCode,
            reason: `In-kind asset contribution: ${insertedAsset.name} (${assetCode})`,
            notes: insertedAsset.description,
            settlement_status: 'NOT_APPLICABLE',
            allow_duplicate: true
          },
          actor,
          role
        );
      } else if (req.body.acquisition_mode === 'BUSINESS_PURCHASE') {
        insertTransactionWithJournal(
          db,
          {
            date: insertedAsset.purchase_date,
            amount: cost,
            currency: 'GHS',
            exchange_rate: 1,
            flow_type: 'INCOME_EXPENSE',
            sub_type: 'ASSET_PURCHASE',
            sender: unit ? unit.name : 'AmozTech',
            receiver: 'Equipment Vendor',
            business_unit_id: insertedAsset.using_unit_id,
            category_name: 'Asset Purchase',
            payment_method: req.body.payment_method || 'BANK',
            reference: assetCode,
            reason: `Purchased business asset: ${insertedAsset.name} (${assetCode})`,
            notes: insertedAsset.description,
            allow_duplicate: true
          },
          actor,
          role
        );
      }
    }

    recordAudit(db, {
      actor,
      role,
      action: 'REGISTER_ASSET',
      entityType: 'ASSET',
      entityId: assetCode,
      summary: `Registered asset ${assetCode} (${insertedAsset.name}) — Legal Owner: ${insertedAsset.legal_owner_name} (${insertedAsset.legal_owner_type}), Cost: GH₵ ${cost}`,
      after: insertedAsset
    });

    persistDb();
    res.json({ ok: true, asset: insertedAsset });
  } catch (err) {
    res.status(err.status || 400).json({ ok: false, error: err.message });
  }
});

// POST /api/business-units -> Create a new Sub-Company / Business Unit
app.post('/api/business-units', async (req, res) => {
  try {
    const db = await getDb();
    const actor = req.body.actor || 'Amos (Founder & CEO)';
    const role = req.body.role || 'OWNER_ADMIN';
    checkPermission(role, 'SETTINGS');

    const code = String(req.body.code || '').toUpperCase().trim();
    const name = String(req.body.name || '').trim();
    if (!code || !name) {
      return res.status(400).json({ ok: false, error: 'Business unit code and name are required.' });
    }

    const openingBal = round2(Number(req.body.opening_balance_ghs || 0));
    runStmt(
      db,
      `INSERT INTO business_units (code, name, description, is_parent, manager, color, opening_balance_ghs, active)
       VALUES (?, ?, ?, 0, ?, ?, ?, 1)`,
      [code, name, req.body.description || '', req.body.manager || 'Amos', req.body.color || '#0052CC', openingBal]
    );

    const created = queryOne(db, `SELECT * FROM business_units WHERE code = ?`, [code]);

    if (openingBal > 0) {
      insertTransactionWithJournal(
        db,
        {
          date: new Date().toISOString().slice(0, 10),
          amount: openingBal,
          currency: 'GHS',
          exchange_rate: 1.0,
          flow_type: 'INCOME_EXPENSE',
          sub_type: 'OPENING_BALANCE',
          sender: 'Opening Balance Reserve',
          receiver: created.name,
          business_unit_id: created.id,
          category_name: 'Opening Balance',
          payment_method: 'BANK',
          reference: `OB-${code}`,
          reason: `Opening balance configured for ${created.name}`,
          allow_duplicate: true
        },
        actor,
        role
      );
    }

    recordAudit(db, {
      actor,
      role,
      action: 'CREATE_BUSINESS_UNIT',
      entityType: 'BUSINESS_UNIT',
      entityId: code,
      summary: `Created sub-company / business unit "${name}" (${code}) with opening balance GH₵ ${openingBal}`,
      after: created
    });

    persistDb();
    res.json({ ok: true, businessUnit: created });
  } catch (err) {
    res.status(err.status || 400).json({ ok: false, error: err.message });
  }
});

// POST /api/categories -> Add custom transaction category
app.post('/api/categories', async (req, res) => {
  try {
    const db = await getDb();
    const actor = req.body.actor || 'Amos (Founder & CEO)';
    const role = req.body.role || 'OWNER_ADMIN';
    checkPermission(role, 'SETTINGS');

    runStmt(
      db,
      `INSERT INTO categories (name, flow_type, default_sub_type, account_code, description) VALUES (?, ?, ?, ?, ?)`,
      [
        req.body.name,
        req.body.flow_type || 'INCOME_EXPENSE',
        req.body.default_sub_type || 'OPERATING_EXPENSE',
        req.body.account_code || '5100',
        req.body.description || ''
      ]
    );
    const cat = queryOne(db, `SELECT * FROM categories WHERE name = ?`, [req.body.name]);
    recordAudit(db, {
      actor,
      role,
      action: 'CREATE_CATEGORY',
      entityType: 'CATEGORY',
      entityId: req.body.name,
      summary: `Added transaction category "${req.body.name}" (${cat.flow_type} / ${cat.default_sub_type})`,
      after: cat
    });
    persistDb();
    res.json({ ok: true, category: cat });
  } catch (err) {
    res.status(err.status || 400).json({ ok: false, error: err.message });
  }
});

// POST /api/currencies -> Add or update currency exchange rate
app.post('/api/currencies', async (req, res) => {
  try {
    const db = await getDb();
    const actor = req.body.actor || 'Amos (Founder & CEO)';
    const role = req.body.role || 'OWNER_ADMIN';
    checkPermission(role, 'SETTINGS');

    const code = String(req.body.code || '').toUpperCase().trim();
    const symbol = req.body.symbol || code;
    const name = req.body.name || code;
    const rate = Number(req.body.exchange_rate_to_ghs || 1.0);

    runStmt(
      db,
      `INSERT INTO currencies (code, symbol, name, exchange_rate_to_ghs, is_default)
       VALUES (?, ?, ?, ?, 0)
       ON CONFLICT(code) DO UPDATE SET symbol = excluded.symbol, name = excluded.name, exchange_rate_to_ghs = excluded.exchange_rate_to_ghs`,
      [code, symbol, name, rate]
    );
    const updated = queryOne(db, `SELECT * FROM currencies WHERE code = ?`, [code]);
    recordAudit(db, {
      actor,
      role,
      action: 'UPSERT_CURRENCY',
      entityType: 'CURRENCY',
      entityId: code,
      summary: `Updated currency ${code} (${symbol}) exchange rate to 1 ${code} = GH₵ ${rate}`,
      after: updated
    });
    persistDb();
    res.json({ ok: true, currency: updated });
  } catch (err) {
    res.status(err.status || 400).json({ ok: false, error: err.message });
  }
});

// POST /api/users -> Add user with RBAC role
app.post('/api/users', async (req, res) => {
  try {
    const db = await getDb();
    const actor = req.body.actor || 'Amos (Founder & CEO)';
    const role = req.body.role || 'OWNER_ADMIN';
    checkPermission(role, 'SETTINGS');

    const rolePerms = {
      OWNER_ADMIN: ['ALL', 'CREATE_TX', 'EDIT_TX', 'VOID_TX', 'SETTLE_ACCOUNT', 'MANAGE_ASSETS', 'MANAGE_SETTINGS', 'EXPORT_REPORTS'],
      ACCOUNTANT: ['CREATE_TX', 'EDIT_TX', 'SETTLE_ACCOUNT', 'MANAGE_ASSETS', 'EXPORT_REPORTS'],
      UNIT_MANAGER: ['CREATE_TX', 'EXPORT_REPORTS'],
      AUDITOR: ['EXPORT_REPORTS']
    };
    const userRole = req.body.user_role || 'UNIT_MANAGER';
    const initials = String(req.body.name || 'US')
      .split(' ')
      .map((s) => s[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    runStmt(
      db,
      `INSERT INTO users (name, email, role, title, avatar, permissions_json, active) VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        req.body.name,
        req.body.email,
        userRole,
        req.body.title || userRole,
        initials,
        JSON.stringify(rolePerms[userRole] || ['EXPORT_REPORTS'])
      ]
    );
    const createdUser = queryOne(db, `SELECT * FROM users WHERE email = ?`, [req.body.email]);
    recordAudit(db, {
      actor,
      role,
      action: 'CREATE_USER',
      entityType: 'USER',
      entityId: req.body.email,
      summary: `Created user ${req.body.name} with role ${userRole}`,
      after: createdUser
    });
    persistDb();
    res.json({ ok: true, user: createdUser });
  } catch (err) {
    res.status(err.status || 400).json({ ok: false, error: err.message });
  }
});

// GET /api/backup/export -> Download full database JSON backup
app.get('/api/backup/export', async (req, res) => {
  try {
    const db = await getDb();
    const payload = {
      exported_at: new Date().toISOString(),
      system: 'AmozTech Separate Entity Financial Management System',
      business_units: queryAll(db, `SELECT * FROM business_units`),
      currencies: queryAll(db, `SELECT * FROM currencies`),
      categories: queryAll(db, `SELECT * FROM categories`),
      transactions: queryAll(db, `SELECT * FROM transactions`),
      journal_entries: queryAll(db, `SELECT * FROM journal_entries`),
      journal_lines: queryAll(db, `SELECT * FROM journal_lines`),
      assets: queryAll(db, `SELECT * FROM assets`),
      audit_logs: queryAll(db, `SELECT * FROM audit_logs`)
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="amoztech_backup_${new Date().toISOString().slice(0, 10)}.json"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/backup/reset -> Reset database to sample demo state
app.post('/api/backup/reset', async (req, res) => {
  try {
    await getDb();
    resetToSampleData();
    res.json({ ok: true, message: 'Sample demo data restored successfully.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/backup/clear -> Clear all dummy data and start fresh for real bookkeeping
app.post('/api/backup/clear', async (req, res) => {
  try {
    await getDb();
    clearToCleanData();
    res.json({ ok: true, message: 'All dummy data cleared. Ready for real phone bookkeeping.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';
if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`AmozTech Financial Management Server running on http://localhost:${PORT} and http://127.0.0.1:${PORT}`);
  });
}

module.exports = app;

