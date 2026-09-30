(() => {
  'use strict';
  const api = String(window.WAR_PROJECT_API_URL || '').replace(/\/$/, '');
  const tokenKey = 'war-project-session';
  let authMode = 'login';
  const $ = selector => document.querySelector(selector);
  const token = () => sessionStorage.getItem(tokenKey) || localStorage.getItem(tokenKey);
  const say = (selector, text = '', type = '') => {
    const node = $(selector);
    if (!node) return;
    node.textContent = text;
    node.className = 'form-message ' + type;
  };
  const close = () => document.querySelectorAll('.modal.show').forEach(modal => {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  });
  const open = selector => {
    const modal = $(selector);
    if (!modal) return;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    modal.querySelector('input, textarea, button:not(.close)')?.focus();
    if (selector === '#accountModal') loadProfile();
  };
  const request = async (path, options = {}) => {
    if (!api) throw new Error('Сервер аккаунтов временно недоступен.');
    const response = await fetch(api + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Ошибка сервера');
    return data;
  };
  const signedOut = () => {
    $('#accountNav').textContent = 'Аккаунт';
    $('#authForm').hidden = false;
    $('#profilePanel').hidden = true;
  };
  const applyProfile = user => {
    if (!user || typeof user.username !== 'string') return signedOut();
    $('#accountNav').textContent = user.username;
    $('#profileName').textContent = user.username;
    const avatar = $('#profileInitial');
    avatar.replaceChildren();
    if (typeof user.avatarData === 'string' && /^data:image\/(png|jpeg|webp);base64,/i.test(user.avatarData)) {
      const image = new Image();
      image.src = user.avatarData;
      image.alt = '';
      avatar.append(image);
    } else avatar.textContent = user.username.slice(0, 1).toUpperCase();
    $('#authForm').hidden = true;
    $('#profilePanel').hidden = false;
  };
  const loadProfile = async () => {
    if (!token()) return signedOut();
    try { applyProfile((await request('/account/me', { headers: { Authorization: 'Bearer ' + token() } })).user); }
    catch { sessionStorage.removeItem(tokenKey); localStorage.removeItem(tokenKey); signedOut(); }
  };
  document.querySelectorAll('[data-open]').forEach(node => node.addEventListener('click', event => {
    event.preventDefault(); open(node.dataset.open);
  }));
  document.querySelectorAll('[data-close]').forEach(node => node.addEventListener('click', close));
  document.querySelectorAll('.modal').forEach(modal => modal.addEventListener('click', event => { if (event.target === modal) close(); }));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(button.dataset.copy); button.textContent = 'Адрес скопирован'; setTimeout(() => { button.textContent = 'Скопировать адрес'; }, 1700); }
    catch { button.textContent = button.dataset.copy; }
  }));
  document.querySelectorAll('[data-auth-tab]').forEach(button => button.addEventListener('click', () => {
    authMode = button.dataset.authTab;
    document.querySelectorAll('[data-auth-tab]').forEach(tab => tab.classList.toggle('active', tab === button));
    $('#confirmRow').hidden = authMode !== 'register';
    $('#authPassword').autocomplete = authMode === 'login' ? 'current-password' : 'new-password';
    $('#authSubmit').textContent = authMode === 'login' ? 'Войти →' : 'Создать аккаунт →';
    say('#authMessage');
  }));
  $('#authForm').addEventListener('submit', async event => {
    event.preventDefault();
    const username = $('#authUsername').value.trim();
    const password = $('#authPassword').value;
    const confirmation = $('#authConfirm').value;
    if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) return say('#authMessage', 'Ник: 3–24 символа, только буквы, цифры и _.', 'error');
    if (password.length < 10) return say('#authMessage', 'Пароль должен содержать минимум 10 символов.', 'error');
    if (authMode === 'register' && password !== confirmation) return say('#authMessage', 'Пароли не совпадают.', 'error');
    const submit = $('#authSubmit'); submit.disabled = true; say('#authMessage', 'Проверяем данные…');
    try {
      const data = await request('/auth/' + authMode, { method: 'POST', body: JSON.stringify({ username, password }) });
      sessionStorage.setItem(tokenKey, data.token);
      localStorage.removeItem(tokenKey);
      applyProfile(data.user); say('#authMessage', 'Готово.', 'success');
    } catch (error) { say('#authMessage', error.message || 'Не удалось выполнить запрос.', 'error'); }
    finally { submit.disabled = false; }
  });
  $('#avatarInput').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 128 * 1024) {
      say('#authMessage', 'Выбери PNG, JPG или WEBP до 128 КБ.', 'error'); event.target.value = ''; return;
    }
    const avatarData = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
    try { applyProfile((await request('/account/avatar', { method: 'POST', headers: { Authorization: 'Bearer ' + token() }, body: JSON.stringify({ avatarData }) })).user); say('#authMessage', 'Аватарка обновлена.', 'success'); }
    catch (error) { say('#authMessage', error.message || 'Не удалось загрузить аватарку.', 'error'); }
    finally { event.target.value = ''; }
  });
  $('#logoutButton').addEventListener('click', () => { sessionStorage.removeItem(tokenKey); localStorage.removeItem(tokenKey); signedOut(); say('#authMessage', 'Вы вышли из аккаунта.', 'success'); });
  const actions = { ban: 'Снятие бана', mute: 'Снятие мута', warnings: 'Снятие предупреждений' };
  document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.action;
    $('#modalTitle').textContent = action.startsWith('privilege:') ? 'Покупка привилегии' : (actions[action] || 'Центр поддержки');
    $('#requestType').value = action.startsWith('privilege:') ? 'Привилегия: ' + action.slice(10) : action;
    say('#supportMessage'); open('#supportModal');
  }));
  $('#requestForm').addEventListener('submit', async event => {
    event.preventDefault();
    const details = $('#requestDetails').value.trim();
    if (!token()) return say('#supportMessage', 'Сначала войди в War Project ID.', 'error');
    if (details.length < 5) return say('#supportMessage', 'Опиши ситуацию подробнее.', 'error');
    try {
      await request('/support/requests', { method: 'POST', headers: { Authorization: 'Bearer ' + token() }, body: JSON.stringify({ type: $('#requestType').value || 'other', details }) });
      $('#requestDetails').value = ''; say('#supportMessage', 'Заявка отправлена.', 'success');
    } catch (error) { say('#supportMessage', error.message || 'Не удалось отправить заявку.', 'error'); }
  });
  const setStat = (id, value) => { const node = $(id); if (node) node.textContent = value; };
  const loadStats = async () => {
    if (!api) return;
    try {
      if (token()) await request('/presence', { method: 'POST', headers: { Authorization: 'Bearer ' + token() } });
      const stats = await request('/stats');
      const server = stats.server || {};
      setStat('#serverState', server.online ? 'ОНЛАЙН' : 'ОФФЛАЙН');
      setStat('#serverPlayers', Number.isFinite(server.playersOnline) ? server.playersOnline : '—');
      setStat('#serverMax', server.online && Number.isFinite(server.maxPlayers) ? '/ ' + server.maxPlayers : 'игроков');
      setStat('#siteOnline', Number.isFinite(stats.siteOnline) ? stats.siteOnline : '—');
      setStat('#registeredUsers', Number.isFinite(stats.registeredUsers) ? stats.registeredUsers : '—');
    } catch { setStat('#serverState', 'НЕТ СВЯЗИ'); }
  };
  loadStats();
  setInterval(loadStats, 60000);
  loadProfile();
  if (location.hash === '#account') open('#accountModal');
  if (location.hash === '#support') open('#supportModal');
})();
