(() => {
  'use strict';
  const api = String(window.WAR_PROJECT_API_URL || '').replace(/\/$/, '');
  const key = 'war-project-session';
  const token = () => sessionStorage.getItem(key) || localStorage.getItem(key);
  const $ = selector => document.querySelector(selector);
  const request = async (path, options = {}) => {
    const response = await fetch(api + path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(), ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Ошибка сервера');
    return data;
  };
  const say = (text, type = '') => { const node = $('#emailMessage'); node.textContent = text; node.className = 'form-message ' + type; };
  const numericId = value => { let hash = 2166136261; for (const char of String(value || '')) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); } return String((hash >>> 0) % 900000000 + 100000000); };
  const roleLabel = value => String(value || '').toLowerCase() === 'admin' ? 'Админ' : 'Игрок';
  let activeUser = null; let pendingTotp = '';
  const totpSay = (text, type = '') => { const node = $('#twoFactorMessage'); node.textContent = text; node.className = 'form-message ' + type; };
  const renderTwoFactor = user => {
    const enabled = user.twoFactorEnabled === true; $('#twoFactorStatus').textContent = enabled ? 'Защита включена. При каждом входе понадобится код из Google Authenticator.' : 'Подключи Google Authenticator для защиты входа в аккаунт.';
    $('#twoFactorButton').textContent = enabled ? 'ОТКЛЮЧИТЬ 2FA →' : (pendingTotp ? 'ПОДТВЕРДИТЬ КОД →' : 'ПОДКЛЮЧИТЬ 2FA →');
    $('#twoFactorSetup').hidden = !pendingTotp;
  };
  const render = user => {
    activeUser = user;
    $('#profileLocked').hidden = true; $('#profileContent').hidden = false;
    $('#profileUsername').textContent = user.username; $('#accountNick').textContent = user.username;
    $('#accountId').textContent = numericId(user.id); const role = $('#accountRole'); role.textContent = roleLabel(user.role); role.classList.toggle('role-admin', String(user.role || '').toLowerCase() === 'admin');
    $('#profileCreated').textContent = 'Создан: ' + (user.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : '—');
    $('#accountEmail').value = user.email || ''; renderTwoFactor(user);
    const avatar = $('#profileAvatar'); avatar.replaceChildren();
    if (typeof user.avatarData === 'string' && /^data:image\/(png|jpeg|webp);base64,/i.test(user.avatarData)) { const image = new Image(); image.src = user.avatarData; image.alt = ''; avatar.append(image); } else avatar.textContent = user.username.slice(0, 1).toUpperCase();
  };
  const load = async () => { if (!token()) return; try { render((await request('/account/me')).user); } catch { sessionStorage.removeItem(key); localStorage.removeItem(key); } };
  $('#emailForm').addEventListener('submit', async event => { event.preventDefault(); const email = $('#accountEmail').value.trim(); if (!/^.{1,64}@[^\s@]+\.[^\s@]+$/.test(email)) return say('Введи корректный email.', 'error'); try { const data = await request('/account/email', { method: 'POST', body: JSON.stringify({ email }) }); $('#accountEmail').value = data.user.email || email; say('Почта привязана.', 'success'); } catch (error) { say(error.message || 'Не удалось сохранить почту.', 'error'); } });
  $('#twoFactorButton').addEventListener('click', async () => {
    if (!activeUser) return; const code = $('#totpCode').value.trim();
    try {
      if (activeUser.twoFactorEnabled) { if (!/^\d{6}$/.test(code)) return totpSay('Введи 6-значный код для отключения.', 'error'); const data = await request('/account/2fa/disable', { method: 'POST', body: JSON.stringify({ code }) }); pendingTotp = ''; $('#totpCode').value = ''; render(data.user); totpSay('Двухфакторная защита отключена.', 'success'); return; }
      if (!pendingTotp) { const data = await request('/account/2fa/setup', { method: 'POST' }); pendingTotp = data.secret; const qr = qrcode(0, 'M'); qr.addData(data.otpauthUri); qr.make(); $('#totpQr').src = qr.createDataURL(5, 0); $('#totpSecret').textContent = pendingTotp; renderTwoFactor(activeUser); return totpSay('Отсканируй QR-код в Google Authenticator, затем введи код.', 'success'); }
      if (!/^\d{6}$/.test(code)) return totpSay('Введи 6-значный код из приложения.', 'error'); const data = await request('/account/2fa/enable', { method: 'POST', body: JSON.stringify({ secret: pendingTotp, code }) }); pendingTotp = ''; $('#totpCode').value = ''; render(data.user); totpSay('Двухфакторная защита включена.', 'success');
    } catch (error) { totpSay(error.message || 'Не удалось изменить настройки 2FA.', 'error'); }
  });
  $('#profileLogout').addEventListener('click', () => { sessionStorage.removeItem(key); localStorage.removeItem(key); location.href = 'index.html'; });
  load();
})();