(() => {
  'use strict';
  const api = String(window.WAR_PROJECT_API_URL || '').replace(/\/$/, '');
  const walletApi = String(window.WAR_PROJECT_WALLET_API_URL || window.WAR_PROJECT_API_URL || '').replace(/\/$/, '');
  const key = 'war-project-session';
  const token = () => sessionStorage.getItem(key) || localStorage.getItem(key) || '';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = value => new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
  let catalog = [];
  let wallet = { balance: 0, transactions: [], orders: [] };
  const currentUser = async () => (await request('/account/me')).user;

  const request = async (path, options = {}) => {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token()) headers.Authorization = 'Bearer ' + token();
    const response = await fetch(api + path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Ошибка сервера');
    return data;
  };

  const walletRequest = async (path, options = {}) => {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token()) headers.Authorization = 'Bearer ' + token();
    const response = await fetch(walletApi + path, { ...options, headers });
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
    const data = await walletRequest('/wallet/me');
    wallet = data.wallet || wallet;
    renderBalance();
    renderHistory();
  };

  const loadCatalog = async () => {
    const data = await walletRequest('/wallet/catalog');
    catalog = data.items || [];
    renderCatalog();
  };

  async function purchase(itemId, button) {
    if (!token()) { location.hash = '#account'; document.querySelector('[data-open="#accountModal"]')?.click(); return; }
    button.disabled = true;
    setMessage('Покупка выполняется…');
    try {
      const data = await walletRequest('/wallet/purchase', { method: 'POST', body: JSON.stringify({ itemId }) });
      wallet.balance = data.balance;
      await loadWallet();
      setMessage('Привилегия куплена. Команда выдачи отправлена на сервер.', 'success');
    } catch (error) {
      setMessage(error.message || 'Не удалось купить привилегию.', 'error');
    } finally {
      button.disabled = false;
    }
  }

  window.WarProjectWallet = { load: loadWallet, catalog: loadCatalog };
  window.addEventListener('auth:changed', () => { loadWallet().catch(error => setMessage(error.message || 'Не удалось загрузить кошелёк.', 'error')); renderCatalog(); });
  document.addEventListener('click', event => {
    if (event.target.closest('[data-wallet-refresh]')) loadWallet().catch(error => setMessage(error.message, 'error'));
  });

  loadCatalog().catch(error => setMessage(error.message || 'Не удалось загрузить привилегии.', 'error'));
  loadWallet().catch(error => setMessage(error.message || 'Не удалось загрузить кошелёк.', 'error'));
})();
