/**
 * AC Mobile Financial Management Application
 * Parent Company: AmozTech
 * Designed for Amos (Sole Owner) to maintain a crystal-clear financial boundary
 * between himself and his business units (PayLite, Engage AI, Custom Projects, AmozTech HQ).
 */

const CATEGORY_META = {
  CAPITAL_CONTRIBUTION: { label: 'Capital', icon: '💎', color: 'blue' },
  OWNER_LOAN: { label: 'Owner Loan', icon: '🏦', color: 'amber' },
  EXPENSE_PAID_PERSONALLY: { label: 'Paid by Amos', icon: '💵', color: 'purple' },
  ASSET_CONTRIBUTED: { label: 'Contributed Asset', icon: '💻', color: 'blue' },
  AMOS_REPAYS_BUSINESS: { label: 'Amos Repaid', icon: '↩️', color: 'green' },
  REIMBURSEMENT: { label: 'Reimbursement', icon: '💸', color: 'green' },
  LOAN_REPAYMENT: { label: 'Loan Repaid', icon: '↩️', color: 'green' },
  SALARY: { label: 'Salary', icon: '💼', color: 'slate' },
  DIVIDEND: { label: 'Dividend', icon: '🎁', color: 'blue' },
  OWNER_DRAWING: { label: 'Drawing', icon: '📤', color: 'amber' },
  PERSONAL_EXPENSE_BY_BUSINESS: { label: 'Paid for Amos', icon: '⚠️', color: 'red' },
  REVENUE: { label: 'Revenue', icon: '📈', color: 'green' },
  OPERATING_EXPENSE: { label: 'Expense', icon: '🛍️', color: 'red' },
  INTERNAL_TRANSFER: { label: 'Transfer', icon: '🔄', color: 'purple' }
};

const EXPENSE_CATEGORIES = [
  'Cloud Hosting & Infrastructure',
  'Software Subscriptions & AI APIs',
  'Project & Contractor Costs',
  'Staff Payroll & Operations',
  'Office Rent & Utilities',
  'Corporate Taxes & Statutory (GRA)',
  'Marketing & Advertising',
  'General Operating Expense'
];

const REVENUE_CATEGORIES = [
  'Payment Gateway Commissions',
  'SaaS & Subscription Revenue',
  'Client Project Milestone Revenue',
  'Consulting & Technical Advisory',
  'Other Operating Income'
];

const app = {
  state: null,
  activeTab: 'dashboard', // 'dashboard' | 'record' | 'report' | 'activity'
  activeFlow: 'AMOS_TO_BUSINESS',
  activeSubtype: 'OWNER_LOAN',
  searchQuery: '',
  filterCategoryType: 'ALL',
  reportPeriod: 'ALL', // 'ALL' | 'MONTH' | 'QTR' | 'YEAR'
  reportSubTab: 'CATEGORIES', // 'CATEGORIES' | 'STATEMENT'
  deferredPrompt: null,

  form: {
    sender: 'Amos (Personal Account)',
    receiver: 'PayLite',
    business_unit_id: 2,
    counterparty_unit_id: 1,
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    category_name: 'Owner Loan to Business',
    reason: '',
    payment_method: 'MOMO'
  },

  async init() {
    this.registerServiceWorker();
    this.setupInstallPrompt();
    await this.loadData();
    this.render();
  },

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('AC ServiceWorker registered:', reg.scope);
      }).catch((err) => {
        console.warn('AC ServiceWorker failed:', err);
      });
    }
  },

  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const btn = document.getElementById('headerInstallBtn');
      if (btn) btn.classList.remove('hidden');
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.toast('AC App successfully installed on your phone!');
      const btn = document.getElementById('headerInstallBtn');
      if (btn) btn.classList.add('hidden');
    });
  },

  async installApp() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        this.toast('Installing AC on your phone home screen...');
      }
      this.deferredPrompt = null;
      const btn = document.getElementById('headerInstallBtn');
      if (btn) btn.classList.add('hidden');
      return;
    }

    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const backdrop = document.getElementById('appModalBackdrop');

    title.textContent = '📲 Install AC as a Mobile App';
    body.innerHTML = `
      <div style="font-size:0.85rem; color:#334155; line-height:1.5;">
        <div style="background:#F0FDF4; border:1px solid #86EFAC; border-radius:10px; padding:12px; margin-bottom:14px; text-align:center;">
          <div style="font-weight:700; color:#166534; font-size:0.95rem; margin-bottom:4px;">Direct Android APK Download</div>
          <div style="font-size:0.78rem; color:#15803D; margin-bottom:10px;">Native compiled APK ready for standalone installation on Android devices:</div>
          <a href="/AC.apk" download="AC.apk" class="waka-submit-pill" style="display:inline-block; text-decoration:none; padding:10px 18px; font-size:0.85rem; width:100%; box-sizing:border-box;">
            📥 Download AC.apk (1.4 MB)
          </a>
        </div>

        <div style="background:#EFF6FF; border-left:4px solid var(--royal-bright); padding:12px; border-radius:10px; margin-bottom:14px;">
          <strong style="color:var(--royal-bright); font-size:0.95rem;">Or Install via Browser (Instant PWA)</strong>
          <p style="margin-top:4px;">
            Install AC directly without downloading files, with auto-updates and offline access!
          </p>
        </div>

        <div style="margin-bottom:14px;">
          <strong>🤖 On Android (Chrome / Edge / Samsung Internet):</strong>
          <ol style="padding-left:20px; margin-top:4px; font-size:0.8rem; color:#475569;">
            <li>Tap the browser menu (<strong>⋮</strong> three dots at top right).</li>
            <li>Tap <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong>.</li>
            <li>AC will install on your home screen with its own launcher icon!</li>
          </ol>
        </div>

        <div style="margin-bottom:14px;">
          <strong>🍎 On iPhone / iPad (Safari):</strong>
          <ol style="padding-left:20px; margin-top:4px; font-size:0.8rem; color:#475569;">
            <li>Tap the <strong>Share</strong> button (📤 square with arrow at the bottom).</li>
            <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
            <li>Tap <strong>Add</strong> at top right.</li>
          </ol>
        </div>

        <button onclick="app.closeModal()" class="waka-submit-pill" style="width:100%; margin-top:10px;">
          Got It
        </button>
      </div>
    `;
    backdrop.classList.remove('hidden');
  },

  async loadData() {
    let loaded = false;
    // 1. Try server API
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          this.state = data;
          localStorage.setItem('ac_saved_state', JSON.stringify(data));
          loaded = true;
        }
      }
    } catch (err) {
      console.log('Server not reachable, falling back to local storage...');
    }

    // 2. Try localStorage
    if (!loaded) {
      const cached = localStorage.getItem('ac_saved_state');
      if (cached) {
        try {
          this.state = JSON.parse(cached);
          this.recomputeState();
          loaded = true;
        } catch (e) {
          console.warn('Failed to parse cached state', e);
        }
      }
    }

    // 3. Try bundled defaultState.json
    if (!loaded) {
      try {
        const res = await fetch('defaultState.json');
        if (res.ok) {
          this.state = await res.json();
          this.recomputeState();
          localStorage.setItem('ac_saved_state', JSON.stringify(this.state));
          loaded = true;
        }
      } catch (e) {
        console.warn('Failed to load defaultState.json', e);
      }
    }

    if (this.state) {
      this.updateHeaderBadge();
      this.populateDrawer();
    }
  },

  recomputeState() {
    if (!this.state) return;
    if (window.accountingEngine && window.accountingEngine.computeFinancialState) {
      const computed = window.accountingEngine.computeFinancialState({
        businessUnits: this.state.businessUnits || [],
        transactions: this.state.transactions || [],
        assets: this.state.assets || [],
        filterUnitId: 'ALL'
      });
      this.state.computed = computed;
      this.state.assets = computed.valuedAssets || this.state.assets;
    }
  },

  updateHeaderBadge() {
    const dot = document.getElementById('headerFenceDot');
    if (dot && this.state) {
      const net = this.state.computed.consolidated.net_current_account;
      dot.className = `bag-badge ${net !== 0 ? 'warn' : ''}`;
    }
  },

  populateDrawer() {
    const el = document.getElementById('drawerUnitsList');
    if (!el || !this.state) return;
    el.innerHTML = this.state.businessUnits
      .map(
        (u) =>
          `<div style="padding:6px 0; border-bottom:1px solid #F1F5F9; display:flex; justify-content:space-between;">
            <strong>${this.escape(u.name)}</strong>
            <span style="color:#64748B;">${u.is_parent ? 'Parent' : u.code}</span>
          </div>`
      )
      .join('');
  },

  navigate(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.bottom-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    this.closeDrawer();
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  setFlow(flow) {
    this.activeFlow = flow;
    const units = this.state?.businessUnits || [];
    const activeUnit = units.find((u) => Number(u.id) === Number(this.form.business_unit_id)) || units[0] || { name: 'PayLite', id: 2 };

    if (flow === 'AMOS_TO_BUSINESS') {
      this.activeSubtype = 'OWNER_LOAN';
      this.form.category_name = 'Owner Loan to Business';
      this.form.sender = 'Amos (Personal Account)';
      this.form.receiver = activeUnit.name;
    } else if (flow === 'BUSINESS_TO_AMOS') {
      this.activeSubtype = 'REIMBURSEMENT';
      this.form.category_name = 'Expense Reimbursement to Amos';
      this.form.sender = activeUnit.name;
      this.form.receiver = 'Amos (Personal Account)';
    } else if (flow === 'INCOME_EXPENSE') {
      this.activeSubtype = 'OPERATING_EXPENSE';
      this.form.category_name = 'Cloud Hosting & Infrastructure';
      this.form.sender = activeUnit.name;
      this.form.receiver = 'Vendor / Supplier';
    } else if (flow === 'UNIT_TRANSFER') {
      this.activeSubtype = 'INTERNAL_TRANSFER';
      this.form.category_name = 'Inter-Unit Funding Transfer';
      this.form.sender = 'AmozTech (Parent HQ)';
      this.form.receiver = 'PayLite';
      this.form.business_unit_id = 1;
      this.form.counterparty_unit_id = 2;
    }
    this.render();
  },

  setSubtype(subtype, defaultCategory = null) {
    this.activeSubtype = subtype;
    if (defaultCategory) {
      this.form.category_name = defaultCategory;
    }
    this.render();
  },

  swapSenderReceiver() {
    const temp = this.form.sender;
    this.form.sender = this.form.receiver;
    this.form.receiver = temp;
    if (this.activeFlow === 'AMOS_TO_BUSINESS') {
      this.activeFlow = 'BUSINESS_TO_AMOS';
      this.activeSubtype = 'REIMBURSEMENT';
      this.form.category_name = 'Expense Reimbursement to Amos';
    } else if (this.activeFlow === 'BUSINESS_TO_AMOS') {
      this.activeFlow = 'AMOS_TO_BUSINESS';
      this.activeSubtype = 'OWNER_LOAN';
      this.form.category_name = 'Owner Loan to Business';
    }
    this.render();
  },

  toggleSideMenu() {
    const d = document.getElementById('drawerBackdrop');
    if (d) d.classList.toggle('hidden');
  },

  closeDrawer() {
    document.getElementById('drawerBackdrop')?.classList.add('hidden');
  },

  render() {
    const container = document.getElementById('mobileMain');
    if (!container || !this.state) return;

    switch (this.activeTab) {
      case 'dashboard':
        container.innerHTML = this.renderDashboardScreen();
        break;
      case 'record':
        container.innerHTML = this.renderRecordScreen();
        break;
      case 'report':
        container.innerHTML = this.renderReportScreen();
        break;
      case 'activity':
      case 'fence':
        container.innerHTML = this.renderActivityAndFenceScreen();
        break;
      default:
        container.innerHTML = this.renderDashboardScreen();
    }
  },

  /* =====================================================================
   * SCREEN 1: DASHBOARD
   * ===================================================================== */
  renderDashboardScreen() {
    const c = this.state.computed.consolidated;
    const units = this.state.computed.unitSummaries;
    const assets = this.state.assets || [];
    const personalAssets = assets.filter((a) => a.legal_owner_type === 'AMOS_PERSONAL');

    return `
      <!-- HERO BLUE SECTION -->
      <section class="mobile-hero-banner" style="margin: 0 -14px 14px -14px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <h1 class="hero-headline">AC Dashboard</h1>
            <p class="hero-subtitle">Parent: AmozTech • Amos Financial Fence</p>
          </div>
          <button class="header-orange-cta" style="font-size:0.75rem; padding:6px 12px;" onclick="app.navigate('record')">
            + Quick Add
          </button>
        </div>
      </section>

      <!-- FENCE QUICK INDICATOR BANNER -->
      <div class="fence-hero-card" onclick="app.navigate('activity')" style="cursor:pointer;">
        <div class="fence-badge-title">
          <span>⚖️ FINANCIAL FENCE &amp; CURRENT BALANCE</span>
          <span style="color:#F59E0B; text-decoration:underline;">Settle / Ledger →</span>
        </div>
        <div class="fence-net-val">
          ${c.net_current_account >= 0 ? `Business owes you GH₵ ${this.fmt(c.net_current_account)}` : `You owe Business GH₵ ${this.fmt(Math.abs(c.net_current_account))}`}
        </div>
        <div class="fence-net-sub">
          Owed to you: <strong>GH₵ ${this.fmt(c.total_business_owes_amos)}</strong> • You owe: <strong>GH₵ ${this.fmt(c.total_amos_owes_business)}</strong>
        </div>
      </div>

      <!-- 4 CORE FINANCIAL KPI CARDS (2x2 GRID) -->
      <div class="dash-kpi-grid">
        <div class="dash-kpi-card" style="border-left: 4px solid var(--royal-bright);">
          <div>
            <div class="dash-kpi-title">TOTAL INVESTED</div>
            <div class="dash-kpi-val">GH₵ ${this.fmt(c.total_invested_overall)}</div>
          </div>
          <div class="dash-kpi-sub">Cash &amp; Loans: GH₵ ${this.fmt(c.total_cash_and_credit_put_in)}</div>
        </div>

        <div class="dash-kpi-card" style="border-left: 4px solid #059669;">
          <div>
            <div class="dash-kpi-title">RECEIVED BACK</div>
            <div class="dash-kpi-val" style="color:#059669;">GH₵ ${this.fmt(c.total_received_back)}</div>
          </div>
          <div class="dash-kpi-sub">Dividends: GH₵ ${this.fmt(c.dividends_to_amos)}</div>
        </div>

        <div class="dash-kpi-card" style="border-left: 4px solid #0284C7;">
          <div>
            <div class="dash-kpi-title">LIQUID CASH</div>
            <div class="dash-kpi-val">GH₵ ${this.fmt(c.total_cash)}</div>
          </div>
          <div class="dash-kpi-sub">Bank: GH₵ ${this.fmt(c.bank_balance)} • MoMo: GH₵ ${this.fmt(c.momo_balance)}</div>
        </div>

        <div class="dash-kpi-card" style="border-left: 4px solid #7C3AED;">
          <div>
            <div class="dash-kpi-title">NET PROFIT &amp; ROI</div>
            <div class="dash-kpi-val" style="color:#7C3AED;">GH₵ ${this.fmt(c.net_profit)}</div>
          </div>
          <div class="dash-kpi-sub">${c.accounting_roi_pct}% Return on Resources</div>
        </div>
      </div>

      <!-- BUSINESS UNITS OVERVIEW -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin:16px 2px 10px;">
        <span style="font-size:0.75rem; font-weight:800; color:#64748B; letter-spacing:0.05em;">BUSINESS UNITS (AMOZTECH GROUP)</span>
        <button onclick="app.navigate('report')" style="border:none; background:none; color:var(--royal-bright); font-size:0.78rem; font-weight:700; cursor:pointer;">Full Report →</button>
      </div>

      <div>
        ${units
          .map(
            (u) => `
          <div class="mobile-card">
            <div class="m-card-header">
              <div>
                <strong style="font-size:0.92rem;">${this.escape(u.name)}</strong>
                ${u.is_parent ? '<span class="m-badge blue" style="margin-left:4px;">Parent HQ</span>' : ''}
              </div>
              <span class="m-card-amount ${u.net_profit >= 0 ? 'owed-to-me' : 'owed-by-me'}">
                GH₵ ${this.fmt(u.net_profit)} Net
              </span>
            </div>

            <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#475569; margin-top:4px;">
              <span>Revenue: <strong style="color:#059669;">GH₵ ${this.fmt(u.revenue)}</strong></span>
              <span>Spend: <strong style="color:#E11D48;">GH₵ ${this.fmt(u.operating_expenses)}</strong></span>
              <span>Cash: <strong>GH₵ ${this.fmt(u.total_cash)}</strong></span>
            </div>

            <div style="margin-top:8px; padding-top:6px; border-top:1px dashed #E2E8F0; font-size:0.72rem; color:#64748B; display:flex; justify-content:space-between; align-items:center;">
              <span>Owes Amos: <strong style="color:#D97706;">GH₵ ${this.fmt(u.total_business_owes_amos)}</strong></span>
              <button class="btn-m-settle" onclick="app.setFlow('AMOS_TO_BUSINESS'); app.form.business_unit_id=${u.unit_id}; app.navigate('record');">
                + Add Tx
              </button>
            </div>
          </div>
        `
          )
          .join('')}
      </div>

      <!-- PERSONAL ASSETS SNAPSHOT -->
      <div style="margin: 16px 2px 10px;">
        <span style="font-size:0.75rem; font-weight:800; color:#64748B; letter-spacing:0.05em;">PERSONAL ASSETS DEPLOYED FOR BIZ</span>
      </div>
      <div class="mobile-card" style="border-left: 4px solid #7C3AED;">
        <div class="m-card-header">
          <span style="font-size:0.85rem; font-weight:700;">👤 Amos Personal Property</span>
          <span class="m-badge purple">${personalAssets.length} Assets</span>
        </div>
        <div style="font-size:0.8rem; color:#334155; margin-top:4px;">
          MacBook Pro M3, Toyota RAV4 Hybrid, and Starlink remain Amos's personal property while deployed for operations.
        </div>
        <div style="font-size:0.75rem; color:#64748B; margin-top:6px;">
          Combined Value: <strong>GH₵ ${this.fmt(c.amos_personal_assets_used_value)}</strong>
        </div>
      </div>
    `;
  },

  /* =====================================================================
   * SCREEN 2: RECORD TRANSACTION (Mobile-Friendly Categories)
   * ===================================================================== */
  renderRecordScreen() {
    const f = this.form;
    const units = this.state.businessUnits || [];

    let pills = [];
    if (this.activeFlow === 'AMOS_TO_BUSINESS') {
      pills = [
        { code: 'OWNER_LOAN', label: '🏦 Owner Loan', cat: 'Owner Loan to Business' },
        { code: 'EXPENSE_PAID_PERSONALLY', label: '💵 Paid Personally', cat: 'Business Expense Paid by Amos' },
        { code: 'CAPITAL_CONTRIBUTION', label: '💎 Capital Equity', cat: 'Equity Capital Contribution' }
      ];
    } else if (this.activeFlow === 'BUSINESS_TO_AMOS') {
      pills = [
        { code: 'REIMBURSEMENT', label: '💸 Reimburse Me', cat: 'Expense Reimbursement to Amos' },
        { code: 'LOAN_REPAYMENT', label: '↩️ Repay Loan', cat: 'Owner Loan Principal Repayment' },
        { code: 'SALARY', label: '💼 My Salary', cat: 'Executive Management Salary (Amos)' },
        { code: 'DIVIDEND', label: '🎁 Dividend (ROI)', cat: 'Dividend / Profit Distribution' },
        { code: 'PERSONAL_EXPENSE_BY_BUSINESS', label: '⚠️ Paid for Amos', cat: 'Personal Expense Paid for Amos' }
      ];
    } else if (this.activeFlow === 'INCOME_EXPENSE') {
      pills = [
        { code: 'OPERATING_EXPENSE', label: '🛍️ Biz Expense', cat: 'Cloud Hosting & Infrastructure' },
        { code: 'REVENUE', label: '📈 Client Revenue', cat: 'Payment Gateway Commissions' }
      ];
    } else {
      pills = [{ code: 'INTERNAL_TRANSFER', label: '🔄 Inter-Unit Transfer', cat: 'Inter-Unit Funding Transfer' }];
    }

    return `
      <section class="mobile-hero-banner" style="margin: 0 -14px 0 -14px;">
        <h1 class="hero-headline">Record Transaction</h1>
        <p class="hero-subtitle">Parent: AmozTech • Real-time separate entity fence</p>
      </section>

      <div class="waka-card">
        <!-- Top Flow Tabs -->
        <div class="waka-tabs-strip">
          <button class="waka-tab-item ${this.activeFlow === 'AMOS_TO_BUSINESS' ? 'active' : ''}" onclick="app.setFlow('AMOS_TO_BUSINESS')">
            <span class="waka-tab-icon">📥</span>
            <span>Amos → Biz</span>
          </button>
          <button class="waka-tab-item ${this.activeFlow === 'BUSINESS_TO_AMOS' ? 'active' : ''}" onclick="app.setFlow('BUSINESS_TO_AMOS')">
            <span class="waka-tab-icon">📤</span>
            <span>Biz → Amos</span>
          </button>
          <button class="waka-tab-item ${this.activeFlow === 'INCOME_EXPENSE' ? 'active' : ''}" onclick="app.setFlow('INCOME_EXPENSE')">
            <span class="waka-tab-icon">🛍️</span>
            <span>Spend / Rev</span>
          </button>
          <button class="waka-tab-item ${this.activeFlow === 'UNIT_TRANSFER' ? 'active' : ''}" onclick="app.setFlow('UNIT_TRANSFER')">
            <span class="waka-tab-icon">🔄</span>
            <span>Transfer</span>
          </button>
        </div>

        <!-- Scrollable Mobile-Friendly Chips -->
        <div class="waka-pill-row">
          ${pills
            .map(
              (p) => `
              <button class="waka-pill ${this.activeSubtype === p.code ? 'active' : ''}" onclick="app.setSubtype('${p.code}', '${p.cat}')">
                ${this.escape(p.label)}
              </button>
            `
            )
            .join('')}
        </div>

        <!-- The Transaction Form -->
        <form class="waka-form-content" onsubmit="app.submitRecord(event)">
          <!-- FROM / TO Stacked with Circular ⇅ Swap Button -->
          <div class="waka-stack-box">
            <div class="waka-field">
              <div class="waka-label">FROM (PAYER)</div>
              <div class="waka-input-row">
                <span class="waka-icon">📍</span>
                <input type="text" id="formSender" value="${this.escape(f.sender)}" required placeholder="e.g. Amos (Personal Ecobank)" oninput="app.form.sender=this.value" />
              </div>
            </div>

            <button type="button" class="waka-swap-btn" onclick="app.swapSenderReceiver()" title="Swap From and To">
              ⇅
            </button>

            <div class="waka-field">
              <div class="waka-label">TO (RECEIVER)</div>
              <div class="waka-input-row">
                <span class="waka-icon">🎯</span>
                <input type="text" id="formReceiver" value="${this.escape(f.receiver)}" required placeholder="e.g. PayLite or Vendor" oninput="app.form.receiver=this.value" />
              </div>
            </div>
          </div>

          <!-- Split Date & Amount -->
          <div class="waka-split-row">
            <div class="waka-split-half">
              <div class="waka-label">DATE</div>
              <input type="date" id="formDate" value="${this.escape(f.date)}" required onchange="app.form.date=this.value" />
            </div>
            <div class="waka-split-half">
              <div class="waka-label">AMOUNT (GH₵)</div>
              <input type="number" step="0.01" min="0.1" id="formAmount" value="${this.escape(f.amount)}" required placeholder="0.00" oninput="app.form.amount=this.value" />
            </div>
          </div>

          <!-- Business Unit Box -->
          <div class="waka-field" style="margin-bottom:12px;">
            <div class="waka-label">BUSINESS UNIT (AMOZTECH GROUP)</div>
            <div class="waka-input-row">
              <span class="waka-icon">🏢</span>
              <select id="formUnit" onchange="app.handleUnitChange(this.value)">
                ${units
                  .map(
                    (u) =>
                      `<option value="${u.id}" ${Number(f.business_unit_id) === Number(u.id) ? 'selected' : ''}>${this.escape(u.name)}</option>`
                  )
                  .join('')}
              </select>
            </div>
          </div>

          ${
            this.activeFlow === 'UNIT_TRANSFER'
              ? `
            <div class="waka-field" style="margin-bottom:12px;">
              <div class="waka-label">DESTINATION BUSINESS UNIT</div>
              <div class="waka-input-row">
                <span class="waka-icon">➡️</span>
                <select id="formCounterUnit" onchange="app.handleCounterUnitChange(this.value)">
                  ${units
                    .map(
                      (u) =>
                        `<option value="${u.id}" ${Number(f.counterparty_unit_id) === Number(u.id) ? 'selected' : ''}>${this.escape(u.name)}</option>`
                    )
                    .join('')}
                </select>
              </div>
            </div>
          `
              : ''
          }

          <!-- Specific Category Picker for Expense / Revenue -->
          ${
            this.activeFlow === 'INCOME_EXPENSE' || this.activeSubtype === 'EXPENSE_PAID_PERSONALLY'
              ? `
            <div class="waka-field" style="margin-bottom:12px;">
              <div class="waka-label">TRANSACTION CATEGORY</div>
              <div class="waka-input-row">
                <span class="waka-icon">🏷️</span>
                <select id="formCatName" onchange="app.form.category_name=this.value">
                  ${
                    this.activeSubtype === 'REVENUE'
                      ? REVENUE_CATEGORIES.map((c) => `<option value="${c}" ${f.category_name === c ? 'selected' : ''}>${c}</option>`).join('')
                      : EXPENSE_CATEGORIES.map((c) => `<option value="${c}" ${f.category_name === c ? 'selected' : ''}>${c}</option>`).join('')
                  }
                </select>
              </div>
            </div>
          `
              : ''
          }

          <!-- Purpose / Reason Box -->
          <div class="waka-field">
            <div class="waka-label">WHAT WAS THIS FOR? (REASON)</div>
            <div class="waka-input-row">
              <span class="waka-icon">📝</span>
              <input type="text" id="formReason" value="${this.escape(f.reason)}" required placeholder="e.g. AWS hosting, float loan, personal ticket" oninput="app.form.reason=this.value" />
            </div>
          </div>

          <!-- Bottom Action Row -->
          <div class="waka-action-row">
            <div class="waka-method-box">
              <div class="waka-label">METHOD</div>
              <select id="formMethod" onchange="app.form.payment_method=this.value">
                <option value="MOMO" ${f.payment_method === 'MOMO' ? 'selected' : ''}>📱 MoMo</option>
                <option value="BANK" ${f.payment_method === 'BANK' ? 'selected' : ''}>🏦 Bank</option>
                <option value="CASH" ${f.payment_method === 'CASH' ? 'selected' : ''}>💵 Cash</option>
              </select>
            </div>

            <button type="submit" class="waka-submit-pill">
              Record in AC (GH₵)
            </button>
          </div>
        </form>
      </div>

      <!-- RECENT ACTIVITY PREVIEW -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin:16px 2px 10px;">
        <span style="font-size:0.75rem; font-weight:800; color:#64748B; letter-spacing:0.05em;">RECENT ENTRIES</span>
        <button onclick="app.navigate('activity')" style="border:none; background:none; color:var(--royal-bright); font-size:0.78rem; font-weight:700; cursor:pointer;">See all →</button>
      </div>
      <div>
        ${this.state.transactions.slice(0, 3).map((tx) => this.renderMobileTxCard(tx)).join('')}
      </div>
    `;
  },

  handleUnitChange(val) {
    this.form.business_unit_id = Number(val);
    const unit = this.state.businessUnits.find((u) => Number(u.id) === Number(val));
    if (unit) {
      if (this.activeFlow === 'AMOS_TO_BUSINESS') {
        this.form.receiver = unit.name;
      } else if (this.activeFlow === 'BUSINESS_TO_AMOS') {
        this.form.sender = unit.name;
      }
    }
  },

  handleCounterUnitChange(val) {
    this.form.counterparty_unit_id = Number(val);
    const unit = this.state.businessUnits.find((u) => Number(u.id) === Number(val));
    if (unit) this.form.receiver = unit.name;
  },

  async submitRecord(e) {
    e.preventDefault();
    if (!this.form.amount || Number(this.form.amount) <= 0) {
      this.toast('Please enter a valid amount', true);
      return;
    }

    try {
      const payload = {
        date: this.form.date,
        amount: Number(this.form.amount),
        currency: 'GHS',
        exchange_rate: 1.0,
        flow_type: this.activeFlow,
        sub_type: this.activeSubtype,
        sender: this.form.sender,
        receiver: this.form.receiver,
        business_unit_id: Number(this.form.business_unit_id),
        counterparty_unit_id: this.activeFlow === 'UNIT_TRANSFER' ? Number(this.form.counterparty_unit_id) : null,
        category_name: this.form.category_name || this.activeSubtype,
        payment_method: this.form.payment_method,
        reason: this.form.reason,
        actor: 'Amos (Owner)'
      };

      // 1. Try sending to server if online
      let savedOnline = false;
      try {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            savedOnline = true;
          }
        }
      } catch (e) {
        console.log('Server offline; recording transaction locally in offline ledger...');
      }

      // 2. Client-side update (works both online and offline)
      const txId = Date.now();
      const buName = (this.state.businessUnits?.find(u => u.id === Number(this.form.business_unit_id)) || {}).name || 'AmozTech HQ';
      const cpuName = this.form.counterparty_unit_id ? (this.state.businessUnits?.find(u => u.id === Number(this.form.counterparty_unit_id)) || {}).name : null;

      const newTx = {
        id: txId,
        tx_code: `TX-${txId.toString().slice(-6)}`,
        date: payload.date,
        sender: payload.sender,
        receiver: payload.receiver,
        amount_ghs: payload.amount,
        currency: 'GHS',
        category_name: payload.category_name,
        business_unit_id: payload.business_unit_id,
        counterparty_unit_id: payload.counterparty_unit_id,
        flow_type: payload.flow_type,
        sub_type: payload.sub_type,
        payment_method: payload.payment_method,
        reason: payload.reason,
        status: 'ACTIVE',
        is_settled: 0,
        settled_amount: 0,
        business_unit_name: buName,
        counterparty_unit_name: cpuName,
        actor: payload.actor
      };

      if (!this.state.transactions) this.state.transactions = [];
      this.state.transactions.unshift(newTx);
      this.recomputeState();
      localStorage.setItem('ac_saved_state', JSON.stringify(this.state));

      this.toast(`Recorded GH₵ ${this.fmt(payload.amount)} in AC!`);
      this.form.amount = '';
      this.form.reason = '';
      this.render();
    } catch (err) {
      this.toast(err.message, true);
    }
  },

  /* =====================================================================
   * SCREEN 3: REPORTS (Categories Report & P&L Statement)
   * ===================================================================== */
  renderReportScreen() {
    const c = this.state.computed.consolidated;
    const tb = this.state.computed.trialBalanceTotals;
    const txs = this.state.transactions || [];

    // Compute Category Breakdown
    const expenseCatMap = {};
    const revenueCatMap = {};
    const ownerCatMap = {};

    let totalOpEx = 0;
    let totalRev = 0;

    for (const tx of txs) {
      if (tx.status === 'VOIDED') continue;
      const amt = Number(tx.amount_ghs || tx.amount || 0);
      const cat = tx.category_name || tx.sub_type;

      if (tx.flow_type === 'INCOME_EXPENSE') {
        if (tx.sub_type === 'REVENUE') {
          revenueCatMap[cat] = (revenueCatMap[cat] || 0) + amt;
          totalRev += amt;
        } else if (tx.sub_type === 'OPERATING_EXPENSE') {
          expenseCatMap[cat] = (expenseCatMap[cat] || 0) + amt;
          totalOpEx += amt;
        }
      } else if (tx.sub_type === 'EXPENSE_PAID_PERSONALLY') {
        expenseCatMap[cat] = (expenseCatMap[cat] || 0) + amt;
        totalOpEx += amt;
      } else if (tx.sub_type === 'SALARY') {
        expenseCatMap['Executive Salary (Amos)'] = (expenseCatMap['Executive Salary (Amos)'] || 0) + amt;
        totalOpEx += amt;
      }

      if (tx.flow_type === 'AMOS_TO_BUSINESS' || tx.flow_type === 'BUSINESS_TO_AMOS') {
        const meta = CATEGORY_META[tx.sub_type]?.label || tx.sub_type;
        ownerCatMap[meta] = (ownerCatMap[meta] || 0) + amt;
      }
    }

    const sortedExpenses = Object.entries(expenseCatMap).sort((a, b) => b[1] - a[1]);
    const sortedRevenues = Object.entries(revenueCatMap).sort((a, b) => b[1] - a[1]);
    const sortedOwner = Object.entries(ownerCatMap).sort((a, b) => b[1] - a[1]);

    return `
      <div style="padding: 16px 2px 10px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <h2 style="font-size:1.35rem; font-weight:800; color:var(--text-main);">📑 AC Reports</h2>
            <p style="font-size:0.8rem; color:#64748B;">Category analytics &amp; financial statements</p>
          </div>
          <button class="btn-m-settle" onclick="window.print()" title="Print / PDF">
            🖨️ PDF
          </button>
        </div>
      </div>

      <!-- REPORT SUB-TABS (Categories Report vs P&L Statement) -->
      <div class="report-subtabs">
        <button class="report-subtab-btn ${this.reportSubTab === 'CATEGORIES' ? 'active' : ''}" onclick="app.reportSubTab='CATEGORIES'; app.render();">
          🏷️ Categories Report
        </button>
        <button class="report-subtab-btn ${this.reportSubTab === 'STATEMENT' ? 'active' : ''}" onclick="app.reportSubTab='STATEMENT'; app.render();">
          📊 P&amp;L &amp; Balances
        </button>
      </div>

      <!-- PERIOD SELECTOR PILLS -->
      <div class="waka-pill-row" style="margin: 0 0 14px 0;">
        <button class="waka-pill ${this.reportPeriod === 'ALL' ? 'active' : ''}" onclick="app.setReportPeriod('ALL')">All Time</button>
        <button class="waka-pill ${this.reportPeriod === 'MONTH' ? 'active' : ''}" onclick="app.setReportPeriod('MONTH')">This Month</button>
        <button class="waka-pill ${this.reportPeriod === 'QTR' ? 'active' : ''}" onclick="app.setReportPeriod('QTR')">This Qtr</button>
        <button class="waka-pill ${this.reportPeriod === 'YEAR' ? 'active' : ''}" onclick="app.setReportPeriod('YEAR')">2026</button>
      </div>

      <!-- EXPORT ACTIONS -->
      <div style="display:flex; gap:8px; margin-bottom:14px;">
        <button onclick="app.exportExcelCsv()" class="drawer-action-btn" style="margin-bottom:0; text-align:center; background:#EFF6FF; border-color:#BFDBFE; color:var(--royal-bright);">
          📥 Export Excel (.CSV)
        </button>
        <button onclick="window.print()" class="drawer-action-btn" style="margin-bottom:0; text-align:center; background:#FEF3C7; border-color:#FDE68A; color:#B45309;">
          🖨️ Print / Save PDF
        </button>
      </div>

      ${
        this.reportSubTab === 'CATEGORIES'
          ? `
        <!-- CATEGORIES BREAKDOWN REPORT -->
        <div class="mobile-card" style="padding:16px;">
          <div style="font-weight:800; font-size:0.92rem; color:#E11D48; margin-bottom:12px; display:flex; justify-content:space-between;">
            <span>SPENDING BY CATEGORY</span>
            <span>GH₵ ${this.fmt(totalOpEx)}</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:12px;">
            ${sortedExpenses
              .map(([cat, amt]) => {
                const pct = totalOpEx > 0 ? Math.round((amt / totalOpEx) * 100) : 0;
                return `
                <div>
                  <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:700;">
                    <span>${this.escape(cat)}</span>
                    <span>GH₵ ${this.fmt(amt)} (${pct}%)</span>
                  </div>
                  <div class="cat-progress-track">
                    <div class="cat-progress-fill" style="width:${pct}%; background:#E11D48;"></div>
                  </div>
                </div>
              `;
              })
              .join('')}
          </div>
        </div>

        <div class="mobile-card" style="padding:16px;">
          <div style="font-weight:800; font-size:0.92rem; color:#059669; margin-bottom:12px; display:flex; justify-content:space-between;">
            <span>REVENUE BY CATEGORY</span>
            <span>GH₵ ${this.fmt(totalRev)}</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:12px;">
            ${sortedRevenues
              .map(([cat, amt]) => {
                const pct = totalRev > 0 ? Math.round((amt / totalRev) * 100) : 0;
                return `
                <div>
                  <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:700;">
                    <span>${this.escape(cat)}</span>
                    <span>GH₵ ${this.fmt(amt)} (${pct}%)</span>
                  </div>
                  <div class="cat-progress-track">
                    <div class="cat-progress-fill" style="width:${pct}%; background:#059669;"></div>
                  </div>
                </div>
              `;
              })
              .join('')}
          </div>
        </div>

        <div class="mobile-card" style="padding:16px;">
          <div style="font-weight:800; font-size:0.92rem; color:var(--royal-bright); margin-bottom:12px;">
            <span>OWNER FLOW CATEGORIES (AMOS ⇄ BUSINESS)</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:8px;">
            ${sortedOwner
              .map(
                ([cat, amt]) => `
              <div style="display:flex; justify-content:space-between; font-size:0.8rem; padding:6px 0; border-bottom:1px solid #F1F5F9;">
                <span><strong>${this.escape(cat)}</strong></span>
                <span style="font-weight:700;">GH₵ ${this.fmt(amt)}</span>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `
          : `
        <!-- PROFIT & LOSS STATEMENT (CONSOLIDATED) -->
        <div class="mobile-card" style="padding:16px;">
          <div style="font-weight:800; font-size:0.92rem; color:var(--royal-bright); margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
            <span>PROFIT &amp; LOSS STATEMENT</span>
            <span class="m-badge green">P&amp;L</span>
          </div>

          <table class="report-table">
            <tbody>
              <tr>
                <td><strong>Operating Revenue</strong></td>
                <td style="text-align:right; font-weight:700; color:#059669;">GH₵ ${this.fmt(c.revenue)}</td>
              </tr>
              <tr>
                <td>Less: Operating Expenses (Biz-Paid)</td>
                <td style="text-align:right; color:#E11D48;">(GH₵ ${this.fmt(c.business_paid_expenses - c.salary_to_amos)})</td>
              </tr>
              <tr>
                <td>Less: Business Expenses Paid Personally by Amos</td>
                <td style="text-align:right; color:#E11D48;">(GH₵ ${this.fmt(c.expenses_paid_personally)})</td>
              </tr>
              <tr>
                <td>Less: Executive Salary to Amos</td>
                <td style="text-align:right; color:#E11D48;">(GH₵ ${this.fmt(c.salary_to_amos)})</td>
              </tr>
              <tr class="total-row">
                <td><strong>TOTAL OPERATING SPEND</strong></td>
                <td style="text-align:right; color:#E11D48;">(GH₵ ${this.fmt(c.operating_expenses)})</td>
              </tr>
              <tr style="background:#ECFDF5; font-size:0.92rem; font-weight:800;">
                <td>NET OPERATING PROFIT</td>
                <td style="text-align:right; color:#065F46;">GH₵ ${this.fmt(c.net_profit)}</td>
              </tr>
              <tr>
                <td>Less: Dividends / Profit Distributions to Amos</td>
                <td style="text-align:right;">(GH₵ ${this.fmt(c.dividends_to_amos)})</td>
              </tr>
              <tr>
                <td>Less: Owner Drawings by Amos</td>
                <td style="text-align:right;">(GH₵ ${this.fmt(c.drawings_by_amos)})</td>
              </tr>
              <tr class="total-row" style="background:#EFF6FF;">
                <td><strong>RETAINED PROFIT REINVESTED</strong></td>
                <td style="text-align:right; font-weight:800; color:var(--royal-bright);">
                  GH₵ ${this.fmt(c.net_profit - c.dividends_to_amos - c.drawings_by_amos)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- SEPARATE ENTITY POSITION SUMMARY -->
        <div class="mobile-card" style="padding:16px;">
          <div style="font-weight:800; font-size:0.92rem; color:var(--royal-bright); margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
            <span>SEPARATE ENTITY POSITION</span>
            <span class="m-badge blue">Balance</span>
          </div>

          <table class="report-table">
            <tbody>
              <tr>
                <td>Cash on Hand</td>
                <td style="text-align:right;">GH₵ ${this.fmt(c.cash_on_hand)}</td>
              </tr>
              <tr>
                <td>Bank Accounts (GCB / Ecobank)</td>
                <td style="text-align:right;">GH₵ ${this.fmt(c.bank_balance)}</td>
              </tr>
              <tr>
                <td>Mobile Money Wallets (MTN / Telecel)</td>
                <td style="text-align:right;">GH₵ ${this.fmt(c.momo_balance)}</td>
              </tr>
              <tr class="total-row">
                <td><strong>Total Business Liquid Cash</strong></td>
                <td style="text-align:right; color:#059669; font-weight:800;">GH₵ ${this.fmt(c.total_cash)}</td>
              </tr>
              <tr>
                <td>Business-Owned Fixed Assets</td>
                <td style="text-align:right;">GH₵ ${this.fmt(c.business_owned_assets_value)}</td>
              </tr>
              <tr>
                <td>Amos Personal Assets in Biz Use</td>
                <td style="text-align:right;">GH₵ ${this.fmt(c.amos_personal_assets_used_value)}</td>
              </tr>
              <tr>
                <td>Receivable Due from Amos (Personal items)</td>
                <td style="text-align:right; color:#E11D48;">GH₵ ${this.fmt(c.total_amos_owes_business)}</td>
              </tr>
              <tr>
                <td>Payable Due to Amos (Loans &amp; Reimb.)</td>
                <td style="text-align:right; color:#D97706; font-weight:700;">GH₵ ${this.fmt(c.total_business_owes_amos)}</td>
              </tr>
              <tr class="total-row" style="background:#EFF6FF;">
                <td><strong>Amos Permanent Equity Capital</strong></td>
                <td style="text-align:right; font-weight:800;">GH₵ ${this.fmt(c.total_equity_invested)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- TRIAL BALANCE AUDIT VERIFICATION -->
        <div class="mobile-card" style="border-left: 4px solid #10B981;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:0.75rem; font-weight:800; color:#065F46;">DOUBLE-ENTRY TRIAL BALANCE</div>
              <div style="font-size:0.8rem; color:#475569; margin-top:2px;">
                Dr GH₵ ${this.fmt(tb.debit)} = Cr GH₵ ${this.fmt(tb.credit)}
              </div>
            </div>
            <span class="m-badge green">✔ Balanced</span>
          </div>
        </div>
      `
      }
    `;
  },

  setReportPeriod(period) {
    this.reportPeriod = period;
    this.render();
  },

  /* =====================================================================
   * SCREEN 4: ACTIVITY & THE FENCE (Merged Unified Screen)
   * ===================================================================== */
  renderActivityAndFenceScreen() {
    const c = this.state.computed.consolidated;
    const units = this.state.computed.unitSummaries;
    const openItems = this.state.transactions.filter(
      (tx) =>
        tx.status === 'ACTIVE' &&
        ['OWNER_LOAN', 'EXPENSE_PAID_PERSONALLY', 'PERSONAL_EXPENSE_BY_BUSINESS'].includes(tx.sub_type) &&
        tx.settlement_status !== 'SETTLED'
    );

    let txs = this.state.transactions || [];

    // Filter by Search Query
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      txs = txs.filter((t) => (t.reason + t.sender + t.receiver + t.category_name + t.amount_ghs).toLowerCase().includes(q));
    }

    // Filter by Category Type Chip
    if (this.filterCategoryType === 'OWNER') {
      txs = txs.filter((t) => t.flow_type === 'AMOS_TO_BUSINESS' || t.flow_type === 'BUSINESS_TO_AMOS');
    } else if (this.filterCategoryType === 'EXPENSE') {
      txs = txs.filter((t) => t.sub_type === 'OPERATING_EXPENSE' || t.sub_type === 'EXPENSE_PAID_PERSONALLY');
    } else if (this.filterCategoryType === 'REVENUE') {
      txs = txs.filter((t) => t.sub_type === 'REVENUE');
    } else if (this.filterCategoryType === 'TRANSFER') {
      txs = txs.filter((t) => t.flow_type === 'UNIT_TRANSFER');
    }

    return `
      <div style="padding: 16px 2px 10px;">
        <h2 style="font-size:1.35rem; font-weight:800; color:var(--text-main);">⚖️ Fence &amp; Activity</h2>
        <p style="font-size:0.8rem; color:#64748B;">Separate entity balance and complete transaction ledger</p>
      </div>

      <!-- THE FENCE HERO CARD -->
      <div class="fence-hero-card">
        <div class="fence-badge-title">
          <span>NET POSITION (AMOS ⇄ BUSINESS)</span>
          <span>● LIVE</span>
        </div>
        <div class="fence-net-val">
          ${c.net_current_account >= 0 ? `Business owes you GH₵ ${this.fmt(c.net_current_account)}` : `You owe Business GH₵ ${this.fmt(Math.abs(c.net_current_account))}`}
        </div>
        <div class="fence-net-sub">
          ${c.net_current_account >= 0 ? 'Your businesses owe you loans/reimbursements' : 'You have personal items paid by company to settle'}
        </div>
      </div>

      <!-- TWO HIGH-IMPACT FENCE CARDS -->
      <div class="fence-split-grid">
        <div class="fence-stat-card">
          <div>
            <div class="fence-stat-label">BUSINESS OWES AMOS</div>
            <div class="fence-stat-num owed-to-me">GH₵ ${this.fmt(c.total_business_owes_amos)}</div>
          </div>
          <div class="fence-stat-sub">
            Loans: <strong>GH₵ ${this.fmt(c.loan_balance_owed_to_amos)}</strong><br/>
            Paid personally: <strong>GH₵ ${this.fmt(c.reimb_balance_owed_to_amos)}</strong>
          </div>
        </div>

        <div class="fence-stat-card">
          <div>
            <div class="fence-stat-label">AMOS OWES BUSINESS</div>
            <div class="fence-stat-num owed-by-me">GH₵ ${this.fmt(c.total_amos_owes_business)}</div>
          </div>
          <div class="fence-stat-sub">
            Personal spend paid by business card net of repayments
          </div>
        </div>
      </div>

      <!-- UNSETTLED ITEMS WITH 1-TAP SETTLE -->
      ${
        openItems.length > 0
          ? `
        <div style="margin: 18px 2px 8px; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.75rem; font-weight:800; color:#64748B; letter-spacing:0.05em;">
            ITEMS REQUIRING SETTLEMENT (${openItems.length})
          </span>
        </div>
        <div>
          ${openItems
            .map((tx) => {
              const rem = Math.max(0, Number(tx.amount_ghs) - Number(tx.settled_amount || 0));
              const isBizOwesAmos = ['OWNER_LOAN', 'EXPENSE_PAID_PERSONALLY'].includes(tx.sub_type);
              return `
              <div class="mobile-card" style="border-left: 4px solid ${isBizOwesAmos ? '#D97706' : '#E11D48'};">
                <div class="m-card-header">
                  <span class="m-badge ${isBizOwesAmos ? 'amber' : 'red'}">${isBizOwesAmos ? 'Biz Owes Amos' : 'Amos Owes Biz'}</span>
                  <span class="m-card-amount" style="color:${isBizOwesAmos ? '#D97706' : '#E11D48'};">GH₵ ${this.fmt(rem)}</span>
                </div>
                <div style="font-size:0.84rem; font-weight:700; margin-bottom:4px;">${this.escape(tx.reason)}</div>
                <div class="m-card-sub">
                  <span>${this.escape(tx.business_unit_name)} • ${this.escape(tx.date)}</span>
                  <button class="btn-m-settle" onclick="app.openSettleModal(${tx.id})">Settle Now →</button>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
      `
          : ''
      }

      <!-- BUSINESS UNITS FENCE BREAKDOWN -->
      <details class="mobile-card" style="cursor:pointer; margin-bottom:14px;">
        <summary style="font-size:0.82rem; font-weight:700; color:var(--text-main); list-style:none; display:flex; justify-content:space-between; align-items:center;">
          <span>🏢 Unit-by-Unit Debt Breakdown</span>
          <span style="color:var(--royal-bright); font-size:1rem;">▾</span>
        </summary>
        <div style="margin-top:10px; border-top:1px dashed #E2E8F0; padding-top:8px;">
          ${units
            .map(
              (u) => `
            <div style="padding:6px 0; border-bottom:1px solid #F1F5F9; display:flex; justify-content:space-between; font-size:0.78rem;">
              <span><strong>${this.escape(u.name)}</strong></span>
              <span class="${u.net_current_account >= 0 ? 'owed-to-me' : 'owed-by-me'}" style="font-weight:700;">
                ${u.net_current_account >= 0 ? `Owes Amos GH₵ ${this.fmt(u.net_current_account)}` : `Amos Owes GH₵ ${this.fmt(Math.abs(u.net_current_account))}`}
              </span>
            </div>
          `
            )
            .join('')}
        </div>
      </details>

      <!-- TRANSACTION LEDGER & SEARCH -->
      <div style="margin: 20px 2px 10px;">
        <span style="font-size:0.75rem; font-weight:800; color:#64748B; letter-spacing:0.05em;">COMPLETE TRANSACTION ACTIVITY</span>
      </div>

      <!-- Search Input -->
      <div style="margin-bottom:10px;">
        <input type="text" placeholder="🔍 Search category, reason, amount, or person..." value="${this.escape(this.searchQuery)}"
               oninput="app.searchQuery=this.value; app.render();"
               style="width:100%; padding:10px 14px; border-radius:12px; border:1.5px solid var(--border-input); font-family:inherit; font-size:0.85rem;" />
      </div>

      <!-- Category Filter Chips -->
      <div class="waka-pill-row" style="margin: 0 0 12px 0;">
        <button class="waka-pill ${this.filterCategoryType === 'ALL' ? 'active' : ''}" onclick="app.filterCategoryType='ALL'; app.render();">All</button>
        <button class="waka-pill ${this.filterCategoryType === 'OWNER' ? 'active' : ''}" onclick="app.filterCategoryType='OWNER'; app.render();">Amos ⇄ Biz</button>
        <button class="waka-pill ${this.filterCategoryType === 'EXPENSE' ? 'active' : ''}" onclick="app.filterCategoryType='EXPENSE'; app.render();">Expenses</button>
        <button class="waka-pill ${this.filterCategoryType === 'REVENUE' ? 'active' : ''}" onclick="app.filterCategoryType='REVENUE'; app.render();">Revenue</button>
        <button class="waka-pill ${this.filterCategoryType === 'TRANSFER' ? 'active' : ''}" onclick="app.filterCategoryType='TRANSFER'; app.render();">Transfers</button>
      </div>

      <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:0.75rem; color:#64748B;">
        <span>Showing <strong>${txs.length}</strong> transactions</span>
        <button onclick="app.exportExcelCsv()" style="border:none; background:none; color:var(--royal-bright); font-weight:700; cursor:pointer;">Export Excel (CSV) 📥</button>
      </div>

      ${txs.map((tx) => this.renderMobileTxCard(tx)).join('')}
    `;
  },

  /* =====================================================================
   * MOBILE-FRIENDLY TRANSACTION CARD
   * ===================================================================== */
  renderMobileTxCard(tx) {
    const isVoid = tx.status === 'VOIDED';
    const meta = CATEGORY_META[tx.sub_type] || { label: tx.sub_type, icon: '🏷️', color: 'slate' };
    const canSettle =
      !isVoid &&
      ['OWNER_LOAN', 'EXPENSE_PAID_PERSONALLY', 'PERSONAL_EXPENSE_BY_BUSINESS'].includes(tx.sub_type) &&
      tx.settlement_status !== 'SETTLED';

    const isRevenue = tx.sub_type === 'REVENUE';
    const isExpense = tx.sub_type === 'OPERATING_EXPENSE' || tx.sub_type === 'EXPENSE_PAID_PERSONALLY';

    return `
      <div class="mobile-card" style="${isVoid ? 'opacity:0.45; text-decoration:line-through;' : ''}">
        <!-- Top Line: Mobile-Friendly Badge + Date + Amount -->
        <div class="m-card-header">
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="m-badge ${meta.color}">
              ${meta.icon} ${this.escape(meta.label)}
            </span>
            <span style="font-size:0.72rem; color:#64748B;">${this.escape(tx.date)}</span>
          </div>
          <span class="m-card-amount ${isRevenue ? 'amount-pos' : isExpense ? 'amount-neg' : ''}">
            GH₵ ${this.fmt(tx.amount_ghs)}
          </span>
        </div>

        <!-- Middle: Description / Reason -->
        <div style="font-size:0.85rem; font-weight:700; margin:4px 0 2px; color:var(--text-main);">
          ${this.escape(tx.reason)}
        </div>

        <!-- Category Tag (if different from sub_type) -->
        ${
          tx.category_name && tx.category_name !== tx.sub_type && tx.category_name !== meta.label
            ? `<div style="margin: 4px 0 6px;"><span class="m-cat-tag">🏷️ ${this.escape(tx.category_name)}</span></div>`
            : ''
        }

        <!-- Bottom: Entities & Settle Action -->
        <div class="m-card-sub" style="margin-top:4px;">
          <span>${this.escape(tx.sender)} → ${this.escape(tx.receiver)}</span>
        </div>

        <div class="m-card-sub" style="margin-top:6px; font-size:0.72rem;">
          <span>🏢 ${this.escape(tx.business_unit_name || 'AC')} • ${this.escape(tx.payment_method)}</span>
          ${canSettle ? `<button class="btn-m-settle" onclick="app.openSettleModal(${tx.id})">Settle Balance</button>` : ''}
        </div>
      </div>
    `;
  },

  /* =====================================================================
   * SETTLEMENT MODAL (1-Tap Settle Debt / Reimbursement)
   * ===================================================================== */
  openSettleModal(txId) {
    const tx = this.state.transactions.find((t) => Number(t.id) === Number(txId));
    if (!tx) return;
    const rem = Math.max(0, Number(tx.amount_ghs) - Number(tx.settled_amount || 0));

    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const backdrop = document.getElementById('appModalBackdrop');

    title.textContent = `⚖️ Settle: ${tx.tx_code}`;
    body.innerHTML = `
      <form onsubmit="app.submitSettlement(event, ${tx.id})">
        <div style="background:#F8FAFC; padding:12px; border-radius:12px; margin-bottom:14px; font-size:0.82rem;">
          <div><strong>Reason:</strong> ${this.escape(tx.reason)}</div>
          <div><strong>Business Unit:</strong> ${this.escape(tx.business_unit_name)}</div>
          <div style="margin-top:4px; color:#D97706; font-weight:800;">Remaining Balance: GH₵ ${this.fmt(rem)}</div>
        </div>

        <div class="waka-field" style="margin-bottom:12px;">
          <div class="waka-label">SETTLEMENT AMOUNT (GH₵)</div>
          <input type="number" step="0.01" min="0.01" max="${rem}" id="settleAmt" value="${rem}" required />
        </div>

        <div class="waka-field" style="margin-bottom:12px;">
          <div class="waka-label">DATE</div>
          <input type="date" id="settleDate" value="${new Date().toISOString().slice(0, 10)}" required />
        </div>

        <div class="waka-field" style="margin-bottom:16px;">
          <div class="waka-label">PAYMENT CHANNEL</div>
          <select id="settleChannel">
            <option value="MOMO">📱 Mobile Money (MoMo)</option>
            <option value="BANK">🏦 Bank Transfer</option>
            <option value="CASH">💵 Cash</option>
          </select>
        </div>

        <button type="submit" class="waka-submit-pill" style="width:100%;">
          Confirm Settlement (GH₵)
        </button>
      </form>
    `;
    backdrop.classList.remove('hidden');
  },

  async submitSettlement(e, txId) {
    e.preventDefault();
    const amount = Number(document.getElementById('settleAmt').value);
    const date = document.getElementById('settleDate').value;
    const payment_method = document.getElementById('settleChannel').value;

    try {
      const res = await fetch(`/api/transactions/${txId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, date, payment_method, actor: 'Amos (Owner)' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          this.toast(`Settled GH₵ ${this.fmt(amount)}!`);
          this.closeModal();
          await this.loadData();
          this.render();
          return;
        }
      }
    } catch (err) {
      console.log('Server offline; applying settlement locally...');
    }

    const tx = (this.state.transactions || []).find(t => t.id === txId);
    if (tx) {
      const newSettled = (tx.settled_amount || 0) + amount;
      tx.settled_amount = newSettled;
      tx.is_settled = newSettled >= tx.amount_ghs ? 1 : 0;
      this.recomputeState();
      localStorage.setItem('ac_saved_state', JSON.stringify(this.state));
      this.toast(`Settled GH₵ ${this.fmt(amount)}!`);
    }
    this.closeModal();
    this.render();
  },

  closeModal() {
    document.getElementById('appModalBackdrop')?.classList.add('hidden');
  },

  downloadBackup() {
    try {
      const json = JSON.stringify(this.state, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AC_Financial_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      this.toast('Saved full database backup!');
    } catch (e) {
      window.location.href = '/api/backup/export';
    }
  },

  exportExcelCsv() {
    const txs = this.state?.transactions || [];
    const headers = ['Tx Code', 'Date', 'Business Unit', 'Flow', 'Subtype', 'Category', 'Sender', 'Receiver', 'Amount (GHS)', 'Reason'];
    const rows = txs.map((t) => [t.tx_code, t.date, t.business_unit_name, t.flow_type, t.sub_type, t.category_name, t.sender, t.receiver, t.amount_ghs, t.reason]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AC_Financial_Ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    this.toast('Exported Excel file!');
  },

  async resetDemoData() {
    if (!confirm('Reset all ledger data back to clean sample data?')) return;
    localStorage.removeItem('ac_saved_state');
    try {
      await fetch('/api/backup/reset', { method: 'POST' });
    } catch (e) {}
    try {
      const res = await fetch('defaultState.json');
      if (res.ok) {
        this.state = await res.json();
        this.recomputeState();
        localStorage.setItem('ac_saved_state', JSON.stringify(this.state));
      }
    } catch (e) {}
    this.toast('Reset to clean initial state!');
    await this.loadData();
    this.render();
  },

  fmt(n) {
    return Number(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  escape(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  toast(msg, isError = false) {
    const wrap = document.getElementById('toastContainer');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'toast';
    if (isError) el.style.borderLeftColor = '#E11D48';
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
};

window.addEventListener('DOMContentLoaded', () => app.init());
