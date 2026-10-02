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
  const numericId = value => { let hash = 2166136261; for (const char of String(value || '')) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); } return String((hash >>> 0) % 900000000 + 100000000); };
  const roleLabel = value => ({ owner: 'Владелец', tech_admin: 'Техадмин' }[String(value || '').toLowerCase()] || 'Игрок');
  const render = user => {
    $('#profileLocked').hidden = true; $('#profileContent').hidden = false;
    $('#profileUsername').textContent = user.username; $('#accountNick').textContent = user.username;
    $('#accountId').textContent = numericId(user.id); const role = $('#accountRole'); role.textContent = roleLabel(user.role); const roleKey = String(user.role || '').toLowerCase(); role.classList.toggle('role-gold', roleKey === 'owner' || roleKey === 'tech_admin');
    $('#profileCreated').textContent = 'Создан: ' + (user.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : '—');

    const avatar = $('#profileAvatar');
    const initial = avatar.querySelector('.avatar-initial'); initial.replaceChildren();
    if (typeof user.avatarData === 'string' && /^data:image\/(png|jpeg|webp);base64,/i.test(user.avatarData)) { const image = new Image(); image.src = user.avatarData; image.alt = ''; initial.append(image); } else initial.textContent = user.username.slice(0, 1).toUpperCase();
    window.dispatchEvent(new CustomEvent('auth:changed', { detail: { user } }));
  };
  const resizeAvatar = file => new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return reject(new Error('Выбери PNG, JPG или WEBP.'));
    const image = new Image(); const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать изображение.'));
    reader.onload = () => {
      if (String(reader.result).length <= 170000) return resolve(String(reader.result));
      image.src = reader.result;
    };
    image.onerror = () => reject(new Error('Не удалось открыть изображение.'));
    image.onload = () => {
      const maxSide = 320; const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale)); const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, 0, 0, width, height);
      let quality = .86, data = canvas.toDataURL('image/webp', quality);
      while (data.length > 170000 && quality > .42) { quality -= .1; data = canvas.toDataURL('image/webp', quality); }
      if (data.length > 180000) return reject(new Error('Изображение слишком большое.'));
      resolve(data);
    };
    reader.readAsDataURL(file);
  });
  const load = async () => { if (!token()) return; try { render((await request('/account/me')).user); } catch { sessionStorage.removeItem(key); localStorage.removeItem(key); window.dispatchEvent(new CustomEvent('auth:changed', { detail: { user: null } })); } };
  $('#profileLogout').addEventListener('click', () => { sessionStorage.removeItem(key); localStorage.removeItem(key); window.dispatchEvent(new CustomEvent('auth:changed', { detail: { user: null } })); location.href = 'index.html'; });
  $('#avatarInput').addEventListener('change', async event => {
    const input = event.currentTarget; const file = input.files && input.files[0]; if (!file || !token()) return;
    const avatar = $('#profileAvatar'); avatar.classList.add('saving');
    try {
      const avatarData = await resizeAvatar(file); const response = await request('/account/avatar', { method: 'POST', body: JSON.stringify({ avatarData }) });
      render(response.user); avatar.classList.add('saved'); setTimeout(() => avatar.classList.remove('saved'), 1800);
    } catch (error) { alert(error.message || 'Не удалось изменить аватар.'); }
    finally { input.value = ''; avatar.classList.remove('saving'); }
  });
  $('#skinInput').addEventListener('change', async event => { const file = event.currentTarget.files?.[0]; if (!file || !token()) return; if (file.type !== 'image/png' || file.size > 128 * 1024) { $('#skinStatus').textContent = 'Нужен PNG до 128 КБ.'; return; } const reader = new FileReader(); reader.onload = async () => { try { const response = await request('/account/skin', { method: 'POST', body: JSON.stringify({ skinData: String(reader.result) }) }); render(response.user); $('#skinStatus').textContent = 'Скин сохранён.'; } catch (error) { $('#skinStatus').textContent = error.message || 'Не удалось сохранить скин.'; } }; reader.readAsDataURL(file); event.currentTarget.value = ''; });
  load();
})();



