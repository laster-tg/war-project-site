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
  const render = user => {
    $('#profileLocked').hidden = true; $('#profileContent').hidden = false;
    $('#profileUsername').textContent = user.username; $('#accountNick').textContent = user.username;
    $('#accountId').textContent = numericId(user.id); const role = $('#accountRole'); role.textContent = roleLabel(user.role); role.classList.toggle('role-admin', String(user.role || '').toLowerCase() === 'admin');
    $('#profileCreated').textContent = 'Создан: ' + (user.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : '—');

    const avatar = $('#profileAvatar'); avatar.replaceChildren();
    if (typeof user.avatarData === 'string' && /^data:image\/(png|jpeg|webp);base64,/i.test(user.avatarData)) { const image = new Image(); image.src = user.avatarData; image.alt = ''; avatar.append(image); } else avatar.textContent = user.username.slice(0, 1).toUpperCase();
  };
  const load = async () => { if (!token()) return; try { render((await request('/account/me')).user); } catch { sessionStorage.removeItem(key); localStorage.removeItem(key); } };
  $('#profileLogout').addEventListener('click', () => { sessionStorage.removeItem(key); localStorage.removeItem(key); location.href = 'index.html'; });
  load();
})();