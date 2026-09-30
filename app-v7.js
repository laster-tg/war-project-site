const API = (window.WAR_PROJECT_API_URL || '').replace(/\/$/, '');
const tokenKey = 'war-project-session';
const closeAll = () => document.querySelectorAll('.modal').forEach(x => x.classList.remove('show'));
const message = (id, text = '', type = '') => { const el = document.querySelector(id); if (el) { el.textContent = text; el.className = `form-message ${type}`; } };
const friendlyError = (error) => error?.message || 'Не удалось выполнить запрос. Повтори позже.';
const request = async (path, options = {}) => {
  if (!API) throw new Error('Сервер аккаунтов готовится к запуску. Попробуй немного позже.');
  const response = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Ошибка сервера');
  return data;
};
const accountNav = document.querySelector('#accountNav');
const authForm = document.querySelector('#authForm');
const profilePanel = document.querySelector('#profilePanel');
const authTabs = document.querySelectorAll('[data-auth-tab]');
let authMode = 'login';
const token = () => localStorage.getItem(tokenKey);
const applyProfile = (user) => {
  document.querySelector('#profileName').textContent = user.username;
  document.querySelector('#profileInitial').textContent = user.username.slice(0, 1).toUpperCase();
  accountNav.textContent = user.username;
  authForm.hidden = true; profilePanel.hidden = false;
  const admin = document.querySelector('#adminLink'); if (admin) admin.hidden = user.role !== 'admin';
};
const signedOut = () => { accountNav.textContent = 'Аккаунт'; authForm.hidden = false; profilePanel.hidden = true; };
document.querySelectorAll('[data-action^="privilege:"]').forEach(button => button.addEventListener('click', () => { document.querySelector('#requestType').value = button.dataset.action; document.querySelector('#modalTitle').textContent = 'Заявка на привилегию'; document.querySelector('#supportModal').classList.add('show'); }));
const loadProfile = async () => {
  if (!token()) return signedOut();
  try { const { user } = await request('/account/me', { headers: { Authorization: `Bearer ${token()}` } }); applyProfile(user); }
  catch { localStorage.removeItem(tokenKey); signedOut(); }
};
document.querySelectorAll('[data-open]').forEach(x => x.addEventListener('click', e => { e.preventDefault(); document.querySelector(x.dataset.open)?.classList.add('show'); if (x.dataset.open === '#accountModal') loadProfile(); }));
document.querySelectorAll('[data-close]').forEach(x => x.addEventListener('click', closeAll));
document.querySelectorAll('.modal').forEach(x => x.addEventListener('click', e => { if (e.target === x) closeAll(); }));
authTabs.forEach(button => button.addEventListener('click', () => { authMode = button.dataset.authTab; authTabs.forEach(x => x.classList.toggle('active', x === button)); document.querySelector('#confirmRow').hidden = authMode !== 'register'; document.querySelector('#authSubmit').textContent = authMode === 'login' ? 'Войти →' : 'Создать аккаунт →'; document.querySelector('#authPassword').autocomplete = authMode === 'login' ? 'current-password' : 'new-password'; message('#authMessage'); }));
authForm.addEventListener('submit', async e => {
  e.preventDefault(); const username = document.querySelector('#authUsername').value.trim(); const password = document.querySelector('#authPassword').value; const confirm = document.querySelector('#authConfirm').value;
  if (authMode === 'register' && password !== confirm) return message('#authMessage', 'Пароли не совпадают.', 'error');
  const submit = document.querySelector('#authSubmit'); submit.disabled = true; message('#authMessage', 'Проверяем данные…');
  try { const data = await request(`/auth/${authMode}`, { method: 'POST', body: JSON.stringify({ username, password }) }); localStorage.setItem(tokenKey, data.token); applyProfile(data.user); message('#authMessage'); }
  catch (error) { message('#authMessage', friendlyError(error), 'error'); }
  finally { submit.disabled = false; }
});
document.querySelector('#logoutButton').addEventListener('click', () => { localStorage.removeItem(tokenKey); signedOut(); message('#authMessage', 'Вы вышли из аккаунта.', 'success'); });const actionNames = { ban: 'Снятие бана', mute: 'Снятие мута', warnings: 'Снятие предупреждений', 'privilege:Боец': 'Привилегия: Боец', 'privilege:Разведчик': 'Привилегия: Разведчик', 'privilege:Завоеватель': 'Привилегия: Завоеватель', 'privilege:Командир': 'Привилегия: Командир', 'privilege:Генерал': 'Привилегия: Генерал' };
document.querySelectorAll('[data-action]').forEach(x => x.addEventListener('click', () => { document.querySelector('#supportModal').classList.add('show'); document.querySelector('#modalTitle').textContent = actionNames[x.dataset.action]; document.querySelector('#requestType').value = x.dataset.action; message('#supportMessage'); }));
document.querySelector('#requestForm').addEventListener('submit', async e => {
  e.preventDefault(); if (!token()) { message('#supportMessage', 'Сначала войди или зарегистрируйся в War Project ID.', 'error'); return; }
  const type = document.querySelector('#requestType').value || 'other'; const details = document.querySelector('#requestDetails').value.trim();
  try { await request('/support/requests', { method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: JSON.stringify({ type, details }) }); message('#supportMessage', 'Заявка отправлена администрации.', 'success'); document.querySelector('#requestDetails').value = ''; }
  catch (error) { message('#supportMessage', friendlyError(error), 'error'); }
});
loadProfile();
