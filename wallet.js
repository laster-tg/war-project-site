(() => {
  'use strict';
  const api = String(window.WAR_PROJECT_API_URL || '').replace(/\/$/, '');
  const key = 'war-project-session';
  const token = () => sessionStorage.getItem(key) || localStorage.getItem(key) || '';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = value => new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
  const localCatalog = [
    { id: 'fighter', title: 'Боец', price: 50, role: 'fighter', tag: 'БОЕЦ', description: 'Название команды, расширенный кит, личный флаг и доступ к закрытым Discord-разделам.' },
    { id: 'scout', title: 'Разведчик', price: 75, role: 'scout', tag: 'РАЗВЕДЧИК', description: 'Камуфляжный костюм, особое вооружение и обвесы, уникальный тег, команда, кит, флаг и Discord.' },
    { id: 'commander', title: 'Командир', price: 150, role: 'commander', tag: 'КОМАНДИР', description: 'Уникальное вооружение, особая броня и лечение, камуфляж, тег, команда, расширенный кит, флаг и Discord.' }
  ];
  let catalog = localCatalog;
  let wallet = { balance: 0, transactions: [], orders: [] };
  const walletKey = name => 'war-project-wallet:' + String(name || '').trim().toLowerCase();
  const readLocalWallet = name => { try { return JSON.parse(localStorage.getItem(walletKey(name)) || '{}'); } catch { return {}; } };
  const writeLocalWallet = (name, state) => localStorage.setItem(walletKey(name), JSON.stringify(state));
  const currentUser = async () => (await request('/account/me')).user;

  const request = async (path, options = {}) => {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token()) headers.Authorization = 'Bearer ' + token();
    const response = await fetch(api + path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Ошибка сервера');
    return data;
  };

  const setMessage = (text = '', type = '') => {
    ['#walletMessage', '#shopMessage'].forEach(selector => {
      const node = $(selector);
      if (!node) return;
      node.textContent = text;
      node.className = 'form-message ' + type;
    });
  };

  const renderBalance = () => {
    $$('[data-wallet-balance]').forEach(node => { node.textContent = money(wallet.balance); });
    $$('[data-wallet-auth]').forEach(node => { node.hidden = !token(); });
    $$('.wallet-panel').forEach(panel => {
      if ($('.wallet-coin-video', panel)) return;
      const video = document.createElement('video');
      video.className = 'wallet-coin-video';
      video.src = 'assets/coin_spin.gif.mp4';
      video.autoplay = true; video.loop = true; video.muted = true; video.playsInline = true;
      panel.prepend(video);
    });
  };

  const renderCatalog = () => {
    const box = $('#privilegeCatalog');
    if (!box) return;
    box.setAttribute('aria-busy', 'false');
    box.replaceChildren(...catalog.map((item, index) => {
      const article = document.createElement('article');
      article.className = 'tier';
      article.innerHTML = `<p>УРОВЕНЬ ${String(index + 1).padStart(2, '0')}</p><h3></h3><span></span><strong></strong><button type="button"></button>`;
      $('h3', article).textContent = item.title;
      $('span', article).textContent = item.description;
      $('strong', article).textContent = money(item.price) + ' WP Coins';
      const button = $('button', article);
      button.textContent = token() ? 'Купить →' : 'Войти для покупки';
      button.disabled = false;
      button.addEventListener('click', () => purchase(item.id, button));
      return article;
    }));
  };

  const row = (title, meta, value, tone = '') => {
    const node = document.createElement('article');
    node.className = 'wallet-row ' + tone;
    node.innerHTML = '<div><b></b><small></small></div><strong></strong>';
    $('b', node).textContent = title;
    $('small', node).textContent = meta;
    $('strong', node).textContent = value;
    return node;
  };

  const renderHistory = () => {
    const txBox = $('#walletTransactions');
    if (txBox) {
      txBox.replaceChildren(...(wallet.transactions || []).map(tx => row(tx.description, new Date(tx.created_at).toLocaleString('ru-RU'), (tx.amount > 0 ? '+' : '') + money(tx.amount), tx.amount > 0 ? 'positive' : 'negative')));
      if (!txBox.children.length) txBox.innerHTML = '<p class="wallet-empty">Операций пока нет.</p>';
    }
    const orderBox = $('#walletOrders');
    if (orderBox) {
      orderBox.replaceChildren(...(wallet.orders || []).map(order => row(order.item_title, new Date(order.created_at).toLocaleString('ru-RU') + ' · ' + order.status, money(order.price) + ' WP', 'order')));
      if (!orderBox.children.length) orderBox.innerHTML = '<p class="wallet-empty">Покупок пока нет.</p>';
    }
  };

  const loadWallet = async () => {
    if (!token()) { wallet = { balance: 0, transactions: [], orders: [] }; renderBalance(); renderCatalog(); renderHistory(); return; }
    try {
      const user = await currentUser();
      const state = readLocalWallet(user.username);
      wallet = { balance: Number(state.balance) || 0, transactions: state.transactions || [], orders: state.orders || [] };
    } catch {
      wallet = { balance: 0, transactions: [], orders: [] };
    }
    renderBalance();
    renderHistory();
  };

  const loadCatalog = async () => {
    catalog = localCatalog;
    renderCatalog();
  };

  async function purchase(itemId, button) {
    if (!token()) { location.hash = '#account'; document.querySelector('[data-open="#accountModal"]')?.click(); return; }
    const item = catalog.find(entry => entry.id === itemId);
    if (!item) return;
    button.disabled = true;
    setMessage('Покупка выполняется…');
    try {
      const user = await currentUser();
      const state = readLocalWallet(user.username);
      const balance = Number(state.balance) || 0;
      if (balance < item.price) throw new Error('Недостаточно WP Coins.');
      const next = {
        balance: balance - item.price,
        transactions: [{ description: 'Покупка привилегии: ' + item.title, amount: -item.price, created_at: new Date().toISOString() }, ...(state.transactions || [])].slice(0, 20),
        orders: [{ item_title: item.title, price: item.price, status: 'paid', created_at: new Date().toISOString() }, ...(state.orders || [])].slice(0, 20)
      };
      writeLocalWallet(user.username, next);
      await request('/admin/commands', { method: 'POST', body: JSON.stringify({ action: 'role', nickname: user.username, role: item.role }) }).catch(() => {});
      await loadWallet();
      setMessage('Привилегия куплена. Команда выдачи отправлена на сервер.', 'success');
    } catch (error) {
      setMessage(error.message || 'Не удалось купить привилегию.', 'error');
    } finally {
      button.disabled = false;
    }
  }

  window.WarProjectWallet = { load: loadWallet, catalog: loadCatalog };
  window.addEventListener('auth:changed', () => { loadWallet().catch(() => {}); renderCatalog(); });
  document.addEventListener('click', event => {
    if (event.target.closest('[data-wallet-refresh]')) loadWallet().catch(error => setMessage(error.message, 'error'));
  });

  loadCatalog().catch(() => {});
  loadWallet().catch(() => {});
})();
