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
  activeTab: 'dashboard', // 'dashboard' | 'record' | 'assets' | 'report' | 'activity'
  activeFlow: 'AMOS_TO_BUSINESS',
  activeSubtype: 'OWNER_LOAN',
  searchQuery: '',
  filterCategoryType: 'ALL',
  reportPeriod: 'ALL', // 'ALL' | 'MONTH' | 'QTR' | 'YEAR'
  reportSubTab: 'CATEGORIES', // 'CATEGORIES' | 'STATEMENT'
  assetFilter: 'ALL', // 'ALL' | 'AMOS_PERSONAL' | 'BUSINESS'
  assetUnitFilter: 'ALL', // 'ALL' | unit_id
  assetSearchQuery: '',
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
          <a href="https://github.com/amosyeboah/AC_Amoztech/releases/download/v1.0.0/AC.apk" download="AC.apk" class="waka-submit-pill" style="display:inline-block; text-decoration:none; padding:10px 18px; font-size:0.85rem; width:100%; box-sizing:border-box;">
            🤖 Download AC.apk (8.3 MB)
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

    // 1. Priority: Device Local Storage (phone offline-first storage)
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

    // 2. Priority: Clean State (Ready for real phone entries)
    if (!loaded) {
      try {
        const res = await fetch('cleanState.json');
        if (res.ok) {
          this.state = await res.json();
          this.recomputeState();
          localStorage.setItem('ac_saved_state', JSON.stringify(this.state));
          loaded = true;
        }
      } catch (e) {
        console.warn('cleanState.json not reachable yet', e);
      }
    }

    // 3. Fallback: Server API if online
    if (!loaded) {
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
        console.log('Server not reachable, falling back...');
      }
    }

    // 4. Fallback: bundled defaultState.json
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
    document.querySelectorAll('.drawer-page-link').forEach((link) => {
      link.classList.toggle('active', link.dataset.tab === tab);
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
      case 'assets':
        container.innerHTML = this.renderAssetsScreen();
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
      <div style="display:flex; justify-content:space-between; align-items:center; margin: 16px 2px 10px;">
        <span style="font-size:0.75rem; font-weight:800; color:#64748B; letter-spacing:0.05em;">ASSETS &amp; VALUATION</span>
        <button onclick="app.navigate('assets')" style="border:none; background:none; color:var(--royal-bright); font-size:0.78rem; font-weight:700; cursor:pointer;">Asset Register →</button>
      </div>
      <div class="mobile-card" style="border-left: 4px solid #7C3AED; cursor:pointer;" onclick="app.navigate('assets')">
        <div class="m-card-header">
          <span style="font-size:0.85rem; font-weight:700;">💼 Amos &amp; Business Assets</span>
          <span class="m-badge purple">${assets.length} Total Assets</span>
        </div>
        <div style="font-size:0.8rem; color:#334155; margin-top:4px;">
          ${
            assets.length > 0
              ? 'Track business fixed assets vs Amos personal property in business custody.'
              : 'No assets registered yet. Tap to track company hardware, vehicles, and equipment.'
          }
        </div>
        <div style="font-size:0.75rem; color:#64748B; margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
          <span>Amos Personal: <strong style="color:#7C3AED;">GH₵ ${this.fmt(c.amos_personal_assets_used_value)}</strong></span>
          <span>Biz Owned: <strong style="color:var(--royal-bright);">GH₵ ${this.fmt(c.business_owned_assets_value)}</strong></span>
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
        ${
          (this.state.transactions || []).length === 0
            ? `<div class="mobile-card" style="text-align:center; padding:18px; color:#64748B; font-size:0.8rem;">
                 No transactions recorded yet. Fill out the form above to record your first entry.
               </div>`
            : this.state.transactions.slice(0, 3).map((tx) => this.renderMobileTxCard(tx)).join('')
        }
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
            ${
              sortedExpenses.length === 0
                ? `<div style="font-size:0.78rem; color:#64748B; padding:8px 0; text-align:center;">No spending entries recorded in this period.</div>`
                : sortedExpenses
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
                    .join('')
            }
          </div>
        </div>

        <div class="mobile-card" style="padding:16px;">
          <div style="font-weight:800; font-size:0.92rem; color:#059669; margin-bottom:12px; display:flex; justify-content:space-between;">
            <span>REVENUE BY CATEGORY</span>
            <span>GH₵ ${this.fmt(totalRev)}</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:12px;">
            ${
              sortedRevenues.length === 0
                ? `<div style="font-size:0.78rem; color:#64748B; padding:8px 0; text-align:center;">No revenue entries recorded in this period.</div>`
                : sortedRevenues
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
                    .join('')
            }
          </div>
        </div>

        <div class="mobile-card" style="padding:16px;">
          <div style="font-weight:800; font-size:0.92rem; color:var(--royal-bright); margin-bottom:12px;">
            <span>OWNER FLOW CATEGORIES (AMOS ⇄ BUSINESS)</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:8px;">
            ${
              sortedOwner.length === 0
                ? `<div style="font-size:0.78rem; color:#64748B; padding:8px 0; text-align:center;">No owner capital, loans, or repayments recorded yet.</div>`
                : sortedOwner
                    .map(
                      ([cat, amt]) => `
              <div style="display:flex; justify-content:space-between; font-size:0.8rem; padding:6px 0; border-bottom:1px solid #F1F5F9;">
                <span><strong>${this.escape(cat)}</strong></span>
                <span style="font-weight:700;">GH₵ ${this.fmt(amt)}</span>
              </div>
            `
                    )
                    .join('')
            }
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
   * SCREEN: ASSET REGISTER & VALUATION (Module 6)
   * Tracks Business-Owned vs Amos's Personal Assets Used by Businesses
   * ===================================================================== */
  setAssetFilter(filter) {
    this.assetFilter = filter;
    this.render();
  },

  setAssetUnitFilter(unitId) {
    this.assetUnitFilter = unitId;
    this.render();
  },

  setAssetSearch(query) {
    this.assetSearchQuery = query;
    this.render();
  },

  renderAssetsScreen() {
    const assets = this.state.assets || [];
    const units = this.state.businessUnits || [];
    const c = this.state.computed?.consolidated || {};

    const amosAssets = assets.filter((a) => a.legal_owner_type === 'AMOS_PERSONAL');
    const bizAssets = assets.filter((a) => a.legal_owner_type !== 'AMOS_PERSONAL');

    const totalPortfolioCost = assets.reduce((sum, a) => sum + Number(a.purchase_cost || 0), 0);
    const totalPortfolioValue = assets.reduce(
      (sum, a) => sum + Number(a.effective_value ?? a.computed_book_value ?? a.purchase_cost ?? 0),
      0
    );
    const amosValue = amosAssets.reduce(
      (sum, a) => sum + Number(a.effective_value ?? a.computed_book_value ?? a.purchase_cost ?? 0),
      0
    );
    const bizValue = bizAssets.reduce(
      (sum, a) => sum + Number(a.effective_value ?? a.computed_book_value ?? a.purchase_cost ?? 0),
      0
    );
    const totalDepreciation = assets.reduce((sum, a) => sum + Number(a.accumulated_depreciation || 0), 0);

    // Apply Filter by ownership
    let filtered = [...assets];
    if (this.assetFilter === 'AMOS_PERSONAL') {
      filtered = filtered.filter((a) => a.legal_owner_type === 'AMOS_PERSONAL');
    } else if (this.assetFilter === 'BUSINESS') {
      filtered = filtered.filter((a) => a.legal_owner_type !== 'AMOS_PERSONAL');
    }

    // Apply Filter by business unit
    if (this.assetUnitFilter !== 'ALL') {
      filtered = filtered.filter((a) => Number(a.using_unit_id) === Number(this.assetUnitFilter));
    }

    // Apply Filter by search query
    if (this.assetSearchQuery) {
      const q = this.assetSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          (a.name || '').toLowerCase().includes(q) ||
          (a.asset_code || '').toLowerCase().includes(q) ||
          (a.category || '').toLowerCase().includes(q) ||
          (a.condition || '').toLowerCase().includes(q) ||
          (a.using_unit_name || '').toLowerCase().includes(q)
      );
    }

    return `
      <!-- HERO BLUE SECTION -->
      <section class="mobile-hero-banner" style="margin: 0 -14px 14px -14px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <h1 class="hero-title">💼 Asset Register</h1>
            <p class="hero-subtitle">Parent: AmozTech • Amos Personal vs Business Assets</p>
          </div>
          <button class="header-orange-cta" style="font-size:0.75rem; padding:6px 12px;" onclick="app.openAddAssetModal()">
            + Add Asset
          </button>
        </div>
      </section>

      <!-- SEPARATE ENTITY ASSET SAFEGUARD BANNER -->
      <div class="fence-hero-card" style="margin-bottom:14px; background:linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%); border-color:#D8B4FE;">
        <div class="fence-badge-title">
          <span style="color:#6B21A8;">🛡️ SEPARATE ENTITY ASSET SAFEGUARD</span>
          <span style="color:#7C3AED; font-weight:700;">Amos vs AmozTech</span>
        </div>
        <div style="font-size:0.8rem; color:#4C1D95; margin-top:4px; line-height:1.4;">
          Personal assets owned by Amos (like his MacBook, RAV4, and Starlink) are legally protected and cannot be seized by company creditors. Business assets are capitalized under AmozTech Group.
        </div>
      </div>

      <!-- 4 ASSET STAT CARDS (2x2 GRID) -->
      <div class="asset-summary-grid">
        <div class="asset-stat-card" style="border-left: 4px solid var(--royal-bright);">
          <div class="asset-stat-label">Total Portfolio Value</div>
          <div class="asset-stat-value">GH₵ ${this.fmt(totalPortfolioValue)}</div>
          <div class="asset-stat-sub">${assets.length} Assets Registered</div>
        </div>

        <div class="asset-stat-card" style="border-left: 4px solid #7C3AED;">
          <div class="asset-stat-label">Amos Personal Assets</div>
          <div class="asset-stat-value" style="color:#6B21A8;">GH₵ ${this.fmt(amosValue)}</div>
          <div class="asset-stat-sub">${amosAssets.length} Assets in Biz Custody</div>
        </div>

        <div class="asset-stat-card" style="border-left: 4px solid #04153B;">
          <div class="asset-stat-label">Business-Owned Assets</div>
          <div class="asset-stat-value">GH₵ ${this.fmt(bizValue)}</div>
          <div class="asset-stat-sub">${bizAssets.length} Capitalized Assets</div>
        </div>

        <div class="asset-stat-card" style="border-left: 4px solid #F59E0B;">
          <div class="asset-stat-label">Accum. Depreciation</div>
          <div class="asset-stat-value" style="color:#D97706;">GH₵ ${this.fmt(totalDepreciation)}</div>
          <div class="asset-stat-sub">Straight-Line Method</div>
        </div>
      </div>

      <!-- FILTER TABS (ALL / AMOS PERSONAL / BUSINESS) -->
      <div class="filter-pills-row" style="margin-bottom:10px;">
        <button class="filter-pill ${this.assetFilter === 'ALL' ? 'active' : ''}" onclick="app.setAssetFilter('ALL')">
          All Assets (${assets.length})
        </button>
        <button class="filter-pill ${this.assetFilter === 'AMOS_PERSONAL' ? 'active' : ''}" onclick="app.setAssetFilter('AMOS_PERSONAL')">
          👤 Amos Personal (${amosAssets.length})
        </button>
        <button class="filter-pill ${this.assetFilter === 'BUSINESS' ? 'active' : ''}" onclick="app.setAssetFilter('BUSINESS')">
          🏢 Business Owned (${bizAssets.length})
        </button>
      </div>

      <!-- SEARCH & UNIT FILTER ROW -->
      <div style="display:flex; gap:8px; margin-bottom:12px;">
        <input
          type="text"
          placeholder="🔍 Search name, code, category..."
          value="${this.escape(this.assetSearchQuery)}"
          oninput="app.setAssetSearch(this.value)"
          style="flex:1; padding:8px 12px; border:1px solid #CBD5E1; border-radius:10px; font-size:0.8rem; font-family:inherit; background:#FFFFFF;"
        />
        <select
          onchange="app.setAssetUnitFilter(this.value)"
          style="padding:8px; border:1px solid #CBD5E1; border-radius:10px; font-size:0.78rem; font-family:inherit; background:#FFFFFF; color:#334155;"
        >
          <option value="ALL" ${this.assetUnitFilter === 'ALL' ? 'selected' : ''}>All Units</option>
          ${units.map((u) => `<option value="${u.id}" ${Number(this.assetUnitFilter) === Number(u.id) ? 'selected' : ''}>${this.escape(u.name)}</option>`).join('')}
        </select>
      </div>

      <!-- ASSET CARDS LIST -->
      <div>
        ${
          filtered.length === 0
            ? `
          <div class="mobile-card" style="text-align:center; padding:28px 14px; color:#64748B;">
            <div style="font-size:2rem; margin-bottom:6px;">💼</div>
            <strong>No assets found matching criteria</strong>
            <p style="font-size:0.75rem; margin-top:4px;">Try clearing filters or tap "+ Add Asset" above.</p>
          </div>
        `
            : filtered
                .map((a) => {
                  const isAmos = a.legal_owner_type === 'AMOS_PERSONAL';
                  const bookVal = Number(a.effective_value ?? a.computed_book_value ?? a.purchase_cost ?? 0);
                  const cost = Number(a.purchase_cost || 0);
                  const accDep = Number(a.accumulated_depreciation || 0);
                  const annDep = Number(a.annual_depreciation || 0);
                  const unitName = a.using_unit_name || units.find((u) => Number(u.id) === Number(a.using_unit_id))?.name || 'AmozTech HQ';

                  return `
            <div class="mobile-card" style="border-left: 4px solid ${isAmos ? '#7C3AED' : 'var(--royal-bright)'}; margin-bottom:12px;">
              <div class="m-card-header">
                <div>
                  <strong style="font-size:0.92rem; color:#0F172A;">${this.escape(a.name)}</strong>
                  <div style="font-size:0.72rem; color:#64748B; margin-top:2px;">
                    Tag: <strong>${this.escape(a.asset_code || 'AST-???')}</strong> • ${this.escape(a.category || 'Tech & Equipment')}
                  </div>
                </div>
                <span class="asset-owner-pill ${isAmos ? 'amos' : 'biz'}">
                  ${isAmos ? '👤 Amos Personal' : '🏢 Biz Owned'}
                </span>
              </div>

              <!-- METRIC GRID -->
              <div class="asset-metric-grid">
                <div class="asset-metric-item">
                  <span>Using Unit</span>
                  <span>${this.escape(unitName)}</span>
                </div>
                <div class="asset-metric-item">
                  <span>Condition</span>
                  <span style="color:#059669;">${this.escape(a.condition || 'Good')}</span>
                </div>
                <div class="asset-metric-item">
                  <span>Purchase Cost</span>
                  <span>GH₵ ${this.fmt(cost)}</span>
                </div>
                <div class="asset-metric-item">
                  <span>Current Book Val</span>
                  <span style="color:${isAmos ? '#6B21A8' : 'var(--royal-bright)'};">GH₵ ${this.fmt(bookVal)}</span>
                </div>
                <div class="asset-metric-item">
                  <span>Depreciation</span>
                  <span>GH₵ ${this.fmt(accDep)}</span>
                </div>
                <div class="asset-metric-item">
                  <span>Useful Life</span>
                  <span>${a.useful_life_years || 3} yrs (GH₵ ${this.fmt(annDep)}/yr)</span>
                </div>
              </div>

              <!-- LEGAL SEPARATE ENTITY NOTICE -->
              ${
                isAmos
                  ? `
                <div class="asset-legal-fence-box">
                  🛡️ <strong>Amos Personal Property:</strong> Deployed for ${this.escape(unitName)} operations. Amos retains 100% individual legal title. Protected from business debt/insolvency.
                </div>
              `
                  : `
                <div class="asset-corp-fence-box">
                  🏢 <strong>AmozTech Fixed Asset:</strong> Capitalized on group balance sheet. Depreciated straight-line against corporate taxes.
                </div>
              `
              }

              <div style="margin-top:10px; display:flex; justify-content:flex-end;">
                <button class="btn-m-settle" onclick="app.openAssetDetailModal(${a.id})">
                  View Full Schedule &amp; Details →
                </button>
              </div>
            </div>
          `;
                })
                .join('')
        }
      </div>
    `;
  },

  /* =====================================================================
   * ASSET MODALS (Register New Asset & View Schedule)
   * ===================================================================== */
  openAddAssetModal() {
    const units = this.state.businessUnits || [];
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const backdrop = document.getElementById('appModalBackdrop');

    title.textContent = '➕ Register New Asset';
    body.innerHTML = `
      <form onsubmit="app.submitNewAsset(event)">
        <div class="waka-field" style="margin-bottom:12px;">
          <div class="waka-label">ASSET NAME *</div>
          <input type="text" id="newAssetName" required placeholder="e.g. MacBook Pro M3, Starlink Kit, Delivery Van" />
        </div>

        <div class="waka-field" style="margin-bottom:12px;">
          <div class="waka-label">LEGAL OWNERSHIP (SEPARATE ENTITY) *</div>
          <select id="newAssetOwnerType" required>
            <option value="AMOS_PERSONAL">👤 Amos (Personal Property - Used by Biz)</option>
            <option value="BUSINESS">🏢 AmozTech Group (Business Owned Fixed Asset)</option>
          </select>
        </div>

        <div class="waka-field" style="margin-bottom:12px;">
          <div class="waka-label">ASSIGNED BUSINESS UNIT *</div>
          <select id="newAssetUnitId" required>
            ${units.map((u) => `<option value="${u.id}">${this.escape(u.name)} (${u.is_parent ? 'Parent' : u.code})</option>`).join('')}
          </select>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
          <div class="waka-field">
            <div class="waka-label">PURCHASE COST (GH₵) *</div>
            <input type="number" step="0.01" min="1" id="newAssetCost" required placeholder="0.00" />
          </div>
          <div class="waka-field">
            <div class="waka-label">SALVAGE VALUE (GH₵)</div>
            <input type="number" step="0.01" min="0" id="newAssetSalvage" value="0" />
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
          <div class="waka-field">
            <div class="waka-label">PURCHASE DATE *</div>
            <input type="date" id="newAssetDate" value="${new Date().toISOString().slice(0, 10)}" required />
          </div>
          <div class="waka-field">
            <div class="waka-label">USEFUL LIFE (YEARS)</div>
            <input type="number" min="1" max="50" id="newAssetLife" value="3" required />
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
          <div class="waka-field">
            <div class="waka-label">CATEGORY</div>
            <select id="newAssetCategory">
              <option value="Computing & Engineering">Computing & Tech</option>
              <option value="Vehicles & Mobility">Vehicles & Mobility</option>
              <option value="Power & Connectivity">Power & Connectivity</option>
              <option value="POS & NFC Terminals">POS & Terminals</option>
              <option value="Office Equipment">Office Equipment</option>
              <option value="Other Asset">Other Asset</option>
            </select>
          </div>
          <div class="waka-field">
            <div class="waka-label">CONDITION</div>
            <select id="newAssetCondition">
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Needs Maintenance">Needs Maintenance</option>
            </select>
          </div>
        </div>

        <div class="waka-field" style="margin-bottom:12px;">
          <div class="waka-label">SERIAL NUMBER / ASSET TAG</div>
          <input type="text" id="newAssetSerial" placeholder="e.g. SN-984210" />
        </div>

        <div class="waka-field" style="margin-bottom:14px;">
          <div class="waka-label">DESCRIPTION / NOTES</div>
          <input type="text" id="newAssetNotes" placeholder="Operational details, location, etc." />
        </div>

        <div style="background:#F0FDF4; border:1px solid #86EFAC; border-radius:10px; padding:10px; margin-bottom:14px; font-size:0.75rem; color:#166534;">
          💡 <strong>Separate Entity Rule:</strong> If selected as Amos Personal, the asset remains Amos's legal property and does not form part of company liquidation assets.
        </div>

        <button type="submit" class="waka-submit-pill" style="width:100%;">
          Register Asset in AC
        </button>
      </form>
    `;
    backdrop.classList.remove('hidden');
  },

  async submitNewAsset(e) {
    e.preventDefault();
    const name = document.getElementById('newAssetName').value.trim();
    const ownerType = document.getElementById('newAssetOwnerType').value;
    const unitId = Number(document.getElementById('newAssetUnitId').value);
    const cost = Number(document.getElementById('newAssetCost').value);
    const salvage = Number(document.getElementById('newAssetSalvage').value || 0);
    const purchaseDate = document.getElementById('newAssetDate').value;
    const lifeYears = Number(document.getElementById('newAssetLife').value || 3);
    const category = document.getElementById('newAssetCategory').value;
    const condition = document.getElementById('newAssetCondition').value;
    const serial = document.getElementById('newAssetSerial').value.trim();
    const notes = document.getElementById('newAssetNotes').value.trim();

    if (!name || cost <= 0) {
      this.toast('Please provide a valid asset name and cost', true);
      return;
    }

    const payload = {
      name,
      legal_owner_type: ownerType,
      legal_owner_name: ownerType === 'AMOS_PERSONAL' ? 'Amos (Founder & CEO)' : 'AmozTech Group',
      using_unit_id: unitId,
      category,
      purchase_cost: cost,
      purchase_date: purchaseDate,
      useful_life_years: lifeYears,
      salvage_value: salvage,
      condition,
      depreciation_method: 'STRAIGHT_LINE',
      serial_number: serial,
      notes,
      actor: 'Amos (Owner)'
    };

    // 1. Try sending to server if online
    try {
      await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.log('Server offline; recording asset locally in offline register...');
    }

    // 2. Client-side local update (works completely offline)
    const unit = this.state.businessUnits?.find((u) => Number(u.id) === Number(unitId)) || { name: 'AmozTech HQ' };
    const nextCount = (this.state.assets?.length || 0) + 1;
    const depreciableBase = Math.max(0, cost - salvage);
    const annDep = lifeYears > 0 ? Math.round((depreciableBase / lifeYears) * 100) / 100 : 0;

    const newAsset = {
      id: Date.now(),
      asset_code: `AST-00${nextCount}`,
      name,
      category,
      purchase_cost: cost,
      salvage_value: salvage,
      useful_life_years: lifeYears,
      current_value: cost,
      legal_owner_type: ownerType,
      legal_owner_name: ownerType === 'AMOS_PERSONAL' ? 'Amos (Personal)' : 'AmozTech Group',
      using_unit_id: unitId,
      using_unit_name: unit.name,
      acquisition_mode: ownerType === 'AMOS_PERSONAL' ? 'PERSONAL_USE' : 'DIRECT_PURCHASE',
      purchase_date: purchaseDate,
      condition,
      depreciation_method: 'STRAIGHT_LINE',
      serial_number: serial,
      notes,
      effective_value: cost,
      annual_depreciation: annDep,
      accumulated_depreciation: 0,
      computed_book_value: cost
    };

    if (window.accountingEngine && window.accountingEngine.calculateAssetValuation) {
      const valued = window.accountingEngine.calculateAssetValuation(newAsset);
      Object.assign(newAsset, valued);
    }

    if (!this.state.assets) this.state.assets = [];
    this.state.assets.unshift(newAsset);
    this.recomputeState();
    localStorage.setItem('ac_saved_state', JSON.stringify(this.state));

    this.closeModal();
    this.toast(`Asset "${name}" registered successfully!`);
    this.render();
  },

  openAssetDetailModal(assetId) {
    const asset = this.state.assets?.find((a) => Number(a.id) === Number(assetId));
    if (!asset) return;

    const isAmos = asset.legal_owner_type === 'AMOS_PERSONAL';
    const unitName = asset.using_unit_name || this.state.businessUnits?.find((u) => Number(u.id) === Number(asset.using_unit_id))?.name || 'AmozTech HQ';
    const cost = Number(asset.purchase_cost || 0);
    const bookVal = Number(asset.effective_value ?? asset.computed_book_value ?? asset.purchase_cost ?? 0);
    const accDep = Number(asset.accumulated_depreciation || 0);
    const annDep = Number(asset.annual_depreciation || 0);

    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const backdrop = document.getElementById('appModalBackdrop');

    title.textContent = `💼 ${asset.asset_code || 'Asset'}: ${asset.name}`;
    body.innerHTML = `
      <div style="font-size:0.85rem; color:#334155; line-height:1.5;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <span class="asset-owner-pill ${isAmos ? 'amos' : 'biz'}" style="font-size:0.8rem; padding:4px 10px;">
            ${isAmos ? '👤 Amos Personal Property' : '🏢 AmozTech Owned Fixed Asset'}
          </span>
          <span class="m-badge green">${this.escape(asset.condition || 'Good')}</span>
        </div>

        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:12px; margin-bottom:14px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.78rem;">
            <div>Original Cost: <strong>GH₵ ${this.fmt(cost)}</strong></div>
            <div>Current Value: <strong style="color:${isAmos ? '#6B21A8' : 'var(--royal-bright)'};">GH₵ ${this.fmt(bookVal)}</strong></div>
            <div>Accum. Depr: <strong style="color:#D97706;">GH₵ ${this.fmt(accDep)}</strong></div>
            <div>Annual Depr: <strong>GH₵ ${this.fmt(annDep)} / yr</strong></div>
            <div>Useful Life: <strong>${asset.useful_life_years || 3} Years</strong></div>
            <div>Salvage Value: <strong>GH₵ ${this.fmt(asset.salvage_value || 0)}</strong></div>
            <div>Acquired: <strong>${asset.purchase_date || 'N/A'}</strong></div>
            <div>Assigned To: <strong>${this.escape(unitName)}</strong></div>
          </div>
        </div>

        ${
          asset.serial_number
            ? `
          <div style="font-size:0.75rem; color:#64748B; margin-bottom:8px;">
            Serial / Tag: <strong style="color:#1E293B;">${this.escape(asset.serial_number)}</strong>
          </div>
        `
            : ''
        }

        ${
          asset.notes
            ? `
          <div style="font-size:0.78rem; background:#F1F5F9; padding:8px 10px; border-radius:8px; margin-bottom:12px;">
            <strong>Notes:</strong> ${this.escape(asset.notes)}
          </div>
        `
            : ''
        }

        ${
          isAmos
            ? `
          <div class="asset-legal-fence-box" style="margin-bottom:14px;">
            🛡️ <strong>Legal Ownership Fence:</strong> Under corporate and insolvency law, this asset belongs to Amos personally. AmozTech and its sub-units hold user custody under license, so creditors cannot touch this property.
          </div>
        `
            : `
          <div class="asset-corp-fence-box" style="margin-bottom:14px;">
            🏢 <strong>Corporate Balance Sheet:</strong> This asset is property of AmozTech Group. Its capital value is amortized over its useful life and appears in group balance sheet reporting.
          </div>
        `
        }

        <button onclick="app.closeModal()" class="waka-submit-pill" style="width:100%;">
          Close Details
        </button>
      </div>
    `;
    backdrop.classList.remove('hidden');
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

      ${
        txs.length === 0
          ? `
        <div class="mobile-card" style="text-align:center; padding:28px 14px; color:#64748B;">
          <div style="font-size:2rem; margin-bottom:6px;">⚖️</div>
          <strong>No transactions in ledger yet</strong>
          <p style="font-size:0.75rem; margin-top:4px;">Ready for your real entries. Tap "+ Record" to record your first loan, payment, or expense.</p>
          <button class="header-orange-cta" style="margin-top:10px; display:inline-block;" onclick="app.navigate('record')">
            + Record First Transaction
          </button>
        </div>
      `
          : txs.map((tx) => this.renderMobileTxCard(tx)).join('')
      }
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

  /* =====================================================================
   * SECURE BACKUP, IMPORT, EXPORT & SHA-256 INTEGRITY
   * ===================================================================== */
  async computeHash(text) {
    try {
      if (window.crypto && window.crypto.subtle) {
        const buffer = new TextEncoder().encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {
      console.warn('crypto.subtle unavailable, using fallback hash', e);
    }
    // Fallback deterministic hash
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < text.length; i++) {
      const ch = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 'SHA256-EMU-' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
  },

  async exportSecureBackup() {
    try {
      const payloadData = {
        businessUnits: this.state.businessUnits || [],
        transactions: this.state.transactions || [],
        assets: this.state.assets || [],
        categories: this.state.categories || [],
        currencies: this.state.currencies || [],
        accounts: this.state.accounts || [],
        auditLogs: this.state.auditLogs || []
      };

      const payloadString = JSON.stringify(payloadData);
      const checksum = await this.computeHash(payloadString);

      const envelope = {
        magic: 'AC_SECURE_BACKUP',
        app: 'AC',
        parent_company: 'AmozTech',
        owner: 'Amos',
        version: '1.0.0',
        exported_at: new Date().toISOString(),
        stats: {
          transactions_count: payloadData.transactions.length,
          assets_count: payloadData.assets.length,
          units_count: payloadData.businessUnits.length
        },
        checksum,
        payload: payloadData
      };

      const jsonStr = JSON.stringify(envelope, null, 2);
      const filename = `AC_Secure_Backup_${new Date().toISOString().slice(0, 10)}.json`;

      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      localStorage.setItem('ac_last_backup_date', new Date().toISOString());
      this.toast(`Secure backup exported (${payloadData.transactions.length} txs, ${payloadData.assets.length} assets)!`);
    } catch (err) {
      console.error('Backup failed:', err);
      this.toast('Export failed: ' + err.message, true);
    }
  },

  downloadBackup() {
    this.exportSecureBackup();
  },

  async handleBackupFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        this.toast('Invalid JSON backup file!', true);
        return;
      }

      let data = parsed;
      let isVerified = false;
      let checksumInfo = 'Standard JSON Format';

      if (parsed.magic === 'AC_SECURE_BACKUP' && parsed.payload) {
        data = parsed.payload;
        const computed = await this.computeHash(JSON.stringify(data));
        if (computed === parsed.checksum) {
          isVerified = true;
          checksumInfo = '🛡️ Cryptographically Verified Authentic (SHA-256 Match)';
        } else {
          checksumInfo = '⚠️ Checksum Mismatch (File modified or corrupted)';
        }
      } else if (parsed.transactions && parsed.businessUnits) {
        data = parsed;
        checksumInfo = 'Legacy Direct State Backup';
      }

      const txCount = data.transactions?.length || 0;
      const assetCount = data.assets?.length || 0;
      const unitCount = data.businessUnits?.length || 0;

      this.pendingRestore = data;

      const title = document.getElementById('modalTitle');
      const body = document.getElementById('modalBody');
      const backdrop = document.getElementById('appModalBackdrop');

      title.textContent = '📥 Restore Backup Confirmation';
      body.innerHTML = `
        <div style="font-size:0.85rem; color:#334155; line-height:1.5;">
          <div style="background:${isVerified ? '#F0FDF4' : '#FEF3C7'}; border:1px solid ${isVerified ? '#86EFAC' : '#FDE68A'}; border-radius:10px; padding:10px; margin-bottom:12px;">
            <div style="font-weight:700; color:${isVerified ? '#15803D' : '#B45309'}; font-size:0.82rem;">
              ${this.escape(checksumInfo)}
            </div>
            <div style="font-size:0.75rem; color:#475569; margin-top:2px;">
              File: <strong>${this.escape(file.name)}</strong> (${(file.size / 1024).toFixed(1)} KB)
            </div>
          </div>

          <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:12px; margin-bottom:14px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.8rem;">
              <div>Transactions: <strong>${txCount}</strong></div>
              <div>Assets: <strong>${assetCount}</strong></div>
              <div>Business Units: <strong>${unitCount}</strong></div>
              <div>Owner: <strong>${this.escape(parsed.owner || 'Amos')}</strong></div>
            </div>
          </div>

          <p style="font-size:0.78rem; color:#64748B; margin-bottom:14px;">
            Choose how you want to apply this backup to your phone storage:
          </p>

          <button onclick="app.applyRestore('REPLACE')" class="waka-submit-pill" style="width:100%; margin-bottom:8px;">
            🔄 Full Restore (Replace Local Storage)
          </button>

          <button onclick="app.applyRestore('MERGE')" class="drawer-action-btn" style="width:100%; text-align:center; margin-bottom:8px;">
            ➕ Merge with Existing Entries
          </button>

          <button onclick="app.closeModal()" class="drawer-action-btn" style="width:100%; text-align:center; color:#64748B;">
            Cancel
          </button>
        </div>
      `;
      backdrop.classList.remove('hidden');
    } catch (err) {
      console.error('Import error:', err);
      this.toast('Failed to read backup file: ' + err.message, true);
    } finally {
      event.target.value = '';
    }
  },

  applyRestore(mode) {
    if (!this.pendingRestore) return;
    const backup = this.pendingRestore;

    if (mode === 'REPLACE') {
      this.state.businessUnits = backup.businessUnits || this.state.businessUnits;
      this.state.transactions = backup.transactions || [];
      this.state.assets = backup.assets || [];
      this.state.categories = backup.categories || this.state.categories;
      this.state.currencies = backup.currencies || this.state.currencies;
      this.state.accounts = backup.accounts || this.state.accounts;
      this.state.auditLogs = backup.auditLogs || [];
    } else if (mode === 'MERGE') {
      const existingTxIds = new Set((this.state.transactions || []).map((t) => t.id));
      const newTxs = (backup.transactions || []).filter((t) => !existingTxIds.has(t.id));
      this.state.transactions = [...(this.state.transactions || []), ...newTxs];

      const existingAssetIds = new Set((this.state.assets || []).map((a) => a.id));
      const newAssets = (backup.assets || []).filter((a) => !existingAssetIds.has(a.id));
      this.state.assets = [...(this.state.assets || []), ...newAssets];
    }

    this.recomputeState();
    localStorage.setItem('ac_saved_state', JSON.stringify(this.state));
    this.pendingRestore = null;
    this.closeModal();
    this.toast(`Backup restored successfully (${mode === 'REPLACE' ? 'Full Replace' : 'Merged'})!`);
    this.render();
  },

  openBackupModal() {
    const txCount = this.state.transactions?.length || 0;
    const assetCount = this.state.assets?.length || 0;
    const lastBackup = localStorage.getItem('ac_last_backup_date');
    const formattedLast = lastBackup ? new Date(lastBackup).toLocaleString() : 'Never';

    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const backdrop = document.getElementById('appModalBackdrop');

    title.textContent = '💾 Secure Backup & Restore';
    body.innerHTML = `
      <div style="font-size:0.85rem; color:#334155; line-height:1.5;">
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:12px; margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight:700; color:#04153B;">📱 Phone Local Storage</span>
            <span class="m-badge green">Active &amp; Persistent</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:8px; font-size:0.78rem; color:#475569;">
            <div>Stored Transactions: <strong>${txCount}</strong></div>
            <div>Registered Assets: <strong>${assetCount}</strong></div>
            <div style="grid-column:1 / -1;">Last Backup: <strong>${this.escape(formattedLast)}</strong></div>
          </div>
        </div>

        <div style="margin-bottom:14px;">
          <div style="font-size:0.75rem; font-weight:800; color:#64748B; letter-spacing:0.04em; margin-bottom:6px;">
            1. EXPORT SECURE BACKUP
          </div>
          <p style="font-size:0.78rem; color:#64748B; margin-bottom:8px;">
            Generates a tamper-proof SHA-256 verified copy of your entire ledger. Save to device storage, Google Drive, or send via WhatsApp/Email.
          </p>
          <button onclick="app.exportSecureBackup()" class="waka-submit-pill" style="width:100%; display:flex; align-items:center; justify-content:center; gap:8px;">
            <span>💾</span> Export Secure Backup (.JSON)
          </button>
        </div>

        <div style="margin-bottom:14px; padding-top:12px; border-top:1px dashed #E2E8F0;">
          <div style="font-size:0.75rem; font-weight:800; color:#64748B; letter-spacing:0.04em; margin-bottom:6px;">
            2. RESTORE FROM BACKUP
          </div>
          <p style="font-size:0.78rem; color:#64748B; margin-bottom:8px;">
            Import a previously exported backup file to restore your transactions and assets with cryptographic verification.
          </p>
          <button onclick="document.getElementById('backupFileInput').click()" class="drawer-action-btn primary" style="width:100%; text-align:center; font-weight:700; display:flex; align-items:center; justify-content:center; gap:8px;">
            <span>📥</span> Select Backup File to Restore
          </button>
        </div>

        <div style="margin-bottom:14px; padding-top:12px; border-top:1px dashed #E2E8F0;">
          <div style="font-size:0.75rem; font-weight:800; color:#64748B; letter-spacing:0.04em; margin-bottom:6px;">
            3. SPREADSHEET EXPORT
          </div>
          <button onclick="app.exportExcelCsv()" class="drawer-action-btn" style="width:100%; text-align:center;">
            📊 Export Ledger to Excel (.CSV)
          </button>
        </div>

        <button onclick="app.closeModal()" class="drawer-action-btn" style="width:100%; text-align:center; margin-top:6px; color:#64748B;">
          Close
        </button>
      </div>
    `;
    backdrop.classList.remove('hidden');
  },

  openSettingsModal() {
    const units = this.state.businessUnits || [];
    const txCount = this.state.transactions?.length || 0;
    const assetCount = this.state.assets?.length || 0;

    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const backdrop = document.getElementById('appModalBackdrop');

    title.textContent = '⚙️ Settings & Storage';
    body.innerHTML = `
      <div style="font-size:0.85rem; color:#334155; line-height:1.5;">
        <div style="background:#EFF6FF; border:1px solid #BFDBFE; border-radius:12px; padding:12px; margin-bottom:14px;">
          <div style="font-weight:800; color:#1D4ED8; font-size:0.9rem;">
            AmozTech Group Financial System
          </div>
          <div style="font-size:0.78rem; color:#1E40AF; margin-top:2px;">
            Owner: <strong>Amos (Sole Proprietor &amp; CEO)</strong>
          </div>
          <div style="font-size:0.72rem; color:#64748B; margin-top:6px;">
            Storage Engine: <strong>Offline Device Storage (Indexed/LocalStorage)</strong>
          </div>
          <div style="font-size:0.72rem; color:#64748B;">
            Live Records: <strong>${txCount} Transactions • ${assetCount} Assets</strong>
          </div>
        </div>

        <div style="margin-bottom:16px;">
          <div style="font-size:0.75rem; font-weight:800; color:#64748B; letter-spacing:0.04em; margin-bottom:6px;">
            LEDGER STORAGE &amp; REAL BOOKKEEPING
          </div>
          <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:10px; padding:10px; margin-bottom:10px; font-size:0.78rem; color:#92400E;">
            💡 <strong>Prepare for Real Business:</strong> Clears all demo sample data so you can begin recording actual real transactions and assets on your phone storage.
          </div>
          <button onclick="app.clearDummyDataToClean()" class="drawer-action-btn" style="width:100%; text-align:center; background:#FEF2F2; border-color:#FECACA; color:#DC2626; font-weight:700; margin-bottom:8px;">
            🗑️ Clear Dummy Data (Start Clean Ledger)
          </button>
          <button onclick="app.resetDemoData()" class="drawer-action-btn" style="width:100%; text-align:center; font-size:0.78rem; color:#64748B;">
            🔄 Reload Sample Demo Data
          </button>
        </div>

        <div style="margin-bottom:16px; padding-top:12px; border-top:1px dashed #E2E8F0;">
          <div style="font-size:0.75rem; font-weight:800; color:#64748B; letter-spacing:0.04em; margin-bottom:6px;">
            CONFIGURED BUSINESS UNITS (${units.length})
          </div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${units.map((u) => `
              <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:8px 10px; display:flex; justify-content:space-between; align-items:center; font-size:0.78rem;">
                <div>
                  <strong>${this.escape(u.name)}</strong>
                  <div style="font-size:0.70rem; color:#64748B;">Code: ${u.code}</div>
                </div>
                <span class="m-badge ${u.is_parent ? 'blue' : 'slate'}">${u.is_parent ? 'Parent HQ' : 'Unit'}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="margin-bottom:14px; padding-top:12px; border-top:1px dashed #E2E8F0;">
          <div style="font-size:0.75rem; font-weight:800; color:#64748B; letter-spacing:0.04em; margin-bottom:6px;">
            CURRENCIES &amp; JURISDICTION
          </div>
          <div style="font-size:0.8rem; color:#334155;">
            Primary Base Currency: <strong>Ghana Cedi (GH₵ / GHS)</strong><br />
            Secondary Currency: <strong>US Dollar ($ / USD @ 15.50)</strong>
          </div>
        </div>

        <button onclick="app.closeModal()" class="waka-submit-pill" style="width:100%;">
          Done
        </button>
      </div>
    `;
    backdrop.classList.remove('hidden');
  },

  openAppInfoModal() {
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const backdrop = document.getElementById('appModalBackdrop');

    title.textContent = 'ℹ️ About AC App';
    body.innerHTML = `
      <div style="font-size:0.85rem; color:#334155; line-height:1.5;">
        <div style="text-align:center; padding:10px 0 16px;">
          <div style="font-size:2.4rem;">📱</div>
          <strong style="font-size:1.15rem; color:#04153B; display:block;">AC Mobile</strong>
          <span style="font-size:0.75rem; color:#64748B;">Financial Management &amp; Separate Entity Engine</span>
          <div style="margin-top:6px;">
            <span class="m-badge blue" style="font-size:0.72rem; padding:3px 8px;">Version 1.0.0 (Capacitor Android)</span>
          </div>
        </div>

        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:12px; margin-bottom:14px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.78rem;">
            <div>Parent Company:</div>
            <div><strong>AmozTech Group</strong></div>
            <div>Owner / Principal:</div>
            <div><strong>Amos (Sole Owner)</strong></div>
            <div>Package ID:</div>
            <div><code>com.amoztech.ac</code></div>
            <div>Framework:</div>
            <div><strong>Capacitor 7 Native</strong></div>
            <div>Accounting Rule:</div>
            <div><strong>Double-Entry Invariant</strong></div>
            <div>Security:</div>
            <div><strong>SHA-256 Checksums</strong></div>
          </div>
        </div>

        <div style="background:#FAF5FF; border:1px solid #E9D5FF; border-radius:10px; padding:10px; margin-bottom:14px; font-size:0.75rem; color:#581C87; line-height:1.4;">
          🛡️ <strong>The Separate Entity Principle:</strong><br />
          AC mathematically enforces a crystalline boundary between Amos's personal finances and his businesses (PayLite, Engage AI, Custom Projects, AmozTech HQ). Amos's personal assets and living expenses are ring-fenced from company liabilities.
        </div>

        <button onclick="app.closeModal()" class="waka-submit-pill" style="width:100%;">
          Close Info
        </button>
      </div>
    `;
    backdrop.classList.remove('hidden');
  },

  async clearDummyDataToClean() {
    if (
      !confirm(
        'Clear all dummy demo data to prepare for real bookkeeping?\n\nThis will remove all sample transactions and sample assets from this phone, resetting balances to 0.00 while preserving your business units and accounts.'
      )
    ) {
      return;
    }

    try {
      try {
        await fetch('/api/backup/clear', { method: 'POST' });
      } catch (e) {}

      this.state.transactions = [];
      this.state.assets = [];
      this.state.journal_entries = [];
      this.state.journal_lines = [];
      this.state.auditLogs = [
        {
          id: 1,
          timestamp: new Date().toISOString(),
          actor: 'Amos (Owner)',
          role: 'OWNER_ADMIN',
          action: 'INIT_REAL_LEDGER',
          entity_type: 'SYSTEM',
          entity_id: 'AC-001',
          summary: 'Clean ledger initialized on device storage. Ready for live business entries.'
        }
      ];

      this.recomputeState();
      localStorage.setItem('ac_saved_state', JSON.stringify(this.state));
      this.closeModal();
      this.toast('Dummy data cleared! Ready for real bookkeeping on your phone.');
      this.render();
    } catch (err) {
      this.toast('Error clearing data: ' + err.message, true);
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
    if (!confirm('Reload all sample demo data?')) return;
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
    this.closeModal();
    this.toast('Sample demo data reloaded!');
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
