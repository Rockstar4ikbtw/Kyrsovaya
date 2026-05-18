// ─────────────────────────────────────────────
//  КОНФИГУРАЦИЯ
// ─────────────────────────────────────────────
const API = 'http://localhost:5155/api';

const ROLES      = { 1: 'Пользователь', 2: 'Админ', 3: 'Менеджер', 4: 'Бухгалтер' };
const ROLE       = { USER: 1, ADMIN: 2, MANAGER: 3, ACCOUNTANT: 4 };
const ROLE_CODES = { 2: 'admin123', 3: 'manager123', 4: 'accountant123' };

const ACCESS = {
  dashboard:    { read: [1,2,3,4], write: [] },
  cars:         { read: [1,2,3,4], write: [2,3] },
  users:        { read: [2],       write: [2] },
  sales:        { read: [2,3,4],   write: [2,3] },
  payments:     { read: [2,4],     write: [2,4] },
  applications: { read: [1,2,3],   write: [1,2,3] },
};

const NAV_LABELS = {
  dashboard:    'Главная',
  cars:         'Автомобили',
  users:        'Пользователи',
  sales:        'Продажи',
  payments:     'Платежи',
  applications: 'Заявки',
};

// ─────────────────────────────────────────────
//  СОСТОЯНИЕ
// ─────────────────────────────────────────────
let currentUser   = null;
let activeSection = 'dashboard';
let modalMode     = null;
let modalEntity   = null;
let editId        = null;
let selectedRole  = 1;

let _carsCache  = null;
let _usersCache = null;
let _salesCache = null;

// ─────────────────────────────────────────────
//  DOM / TOAST
// ─────────────────────────────────────────────
const $ = id => document.getElementById(id);

function toast(msg, isError = false) {
  const el = $('toast');
  el.textContent = msg;
  el.className = 'show' + (isError ? ' error' : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = ''; }, 3000);
}

function showLoader(tbodyId) {
  $(tbodyId).innerHTML = `<tr><td colspan="99"><div class="loader">Загрузка...</div></td></tr>`;
}
function showEmpty(tbodyId) {
  $(tbodyId).innerHTML = `<tr><td colspan="99"><div class="empty">Нет данных</div></td></tr>`;
}

// ─────────────────────────────────────────────
//  КЭШИ
// ─────────────────────────────────────────────
async function getCars(force = false) {
  if (!_carsCache || force) _carsCache = await api('GET', '/cars').catch(() => []);
  return _carsCache;
}
async function getUsers(force = false) {
  if (!_usersCache || force) _usersCache = await api('GET', '/users').catch(() => []);
  return _usersCache;
}
async function getSales(force = false) {
  if (!_salesCache || force) _salesCache = await api('GET', '/sales').catch(() => []);
  return _salesCache;
}
function invalidateCache() { _carsCache = null; _usersCache = null; _salesCache = null; }

// ─────────────────────────────────────────────
//  SELECT HELPERS
// ─────────────────────────────────────────────
function buildSelect(id, options, currentVal, placeholder = '— Выберите —') {
  const opts = options.map(o =>
    `<option value="${o.value}" ${o.value == currentVal ? 'selected' : ''}>${o.label}</option>`
  ).join('');
  return `<select id="${id}"><option value="">${placeholder}</option>${opts}</select>`;
}
function selectLoading(id) {
  return `<select id="${id}" disabled><option>Загрузка...</option></select>`;
}

// ─────────────────────────────────────────────
//  РОЛИ (регистрация)
// ─────────────────────────────────────────────
function selectRole(roleId) {
  selectedRole = roleId;
  [1,2,3,4].forEach(i => {
    const card = $('rc' + i);
    if (!card) return;
    card.classList.toggle('selected', i === roleId);
    const radio = card.querySelector('input[type=radio]');
    if (radio) radio.checked = (i === roleId);
  });
  const wrap = $('roleConfirmWrap');
  if (!wrap) return;
  const needsCode = roleId !== 1;
  wrap.classList.toggle('visible', needsCode);
  if (needsCode) $('confirmRoleName').textContent = ROLES[roleId];
  else { const inp = $('roleConfirmCode'); if (inp) inp.value = ''; }
}

// ─────────────────────────────────────────────
//  API
// ─────────────────────────────────────────────
async function api(method, path, body) {
  try {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API + path, opts);
    if (res.status === 204) return true;
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message || res.statusText);
    return json;
  } catch (e) {
    toast(e.message || 'Ошибка сети', true);
    throw e;
  }
}

// ─────────────────────────────────────────────
//  АВТОРИЗАЦИЯ
// ─────────────────────────────────────────────
async function doLogin() {
  const login    = $('loginInput').value.trim();
  const password = $('passwordInput').value.trim();
  $('loginError').textContent = '';
  if (!login || !password) { $('loginError').textContent = 'Заполните все поля'; return; }
  try {
    const user = await api('POST', '/users/login', { login, password });
    currentUser = user;
    sessionStorage.setItem('autosalon_user', JSON.stringify(user));
    initApp();
  } catch {
    $('loginError').textContent = 'Неверный логин или пароль';
  }
}

function doLogout() {
  currentUser = null;
  invalidateCache();
  sessionStorage.removeItem('autosalon_user');
  $('appShell').classList.remove('visible');
  $('loginScreen').classList.remove('hidden');
  $('loginInput').value = '';
  $('passwordInput').value = '';
  selectRole(1);
}

function switchAuthTab(tab) {
  $('tabLogin').classList.toggle('active', tab === 'login');
  $('tabRegister').classList.toggle('active', tab === 'register');
  $('panelLogin').classList.toggle('active', tab === 'login');
  $('panelRegister').classList.toggle('active', tab === 'register');
  $('loginError').textContent = '';
  $('registerError').textContent = '';
}

async function doRegister() {
  const name     = $('regName').value.trim();
  const login    = $('regLogin').value.trim();
  const password = $('regPassword').value.trim();
  const phone    = $('regPhone').value.trim();
  const email    = $('regEmail').value.trim();
  const role     = selectedRole;
  $('registerError').textContent = '';

  if (!name || !login || !password || !phone || !email) {
    $('registerError').textContent = 'Заполните все поля'; return;
  }
  if (role !== 1) {
    const code = ($('roleConfirmCode')?.value || '').trim();
    if (!code) { $('registerError').textContent = 'Введите код подтверждения'; return; }
    if (code !== ROLE_CODES[role]) { $('registerError').textContent = 'Неверный код'; return; }
  }
  try {
    const user = await api('POST', '/users', { name, login, password, phone, email, role });
    currentUser = user;
    sessionStorage.setItem('autosalon_user', JSON.stringify(user));
    ['regName','regLogin','regPassword','regPhone','regEmail'].forEach(id => $(id).value = '');
    if ($('roleConfirmCode')) $('roleConfirmCode').value = '';
    selectRole(1);
    initApp();
    toast('Добро пожаловать, ' + user.name + '!');
  } catch {
    $('registerError').textContent = 'Ошибка регистрации. Возможно, логин уже занят.';
  }
}

// ─────────────────────────────────────────────
//  ИНИЦИАЛИЗАЦИЯ
// ─────────────────────────────────────────────
function initApp() {
  $('loginScreen').classList.add('hidden');
  $('appShell').classList.add('visible');
  $('userName').textContent  = currentUser.name;
  $('roleBadge').textContent = ROLES[currentUser.role] || 'Пользователь';
  buildNav();
  switchSection('dashboard');
}

function buildNav() {
  const nav = $('mainNav');
  nav.innerHTML = '';
  for (const [key, label] of Object.entries(NAV_LABELS)) {
    if (!ACCESS[key].read.includes(currentUser.role)) continue;
    const btn = document.createElement('button');
    btn.className = 'nav-btn';
    btn.dataset.section = key;
    btn.textContent = label;
    btn.onclick = () => switchSection(key);
    nav.appendChild(btn);
  }
}

function switchSection(id) {
  activeSection = id;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.section === id));
  document.querySelectorAll('.section').forEach(s => s.classList.toggle('active', s.id === 'section-' + id));

  const canWrite = ACCESS[id]?.write.includes(currentUser.role);
  const addBtns  = { cars: 'addCarBtn', users: 'addUserBtn', sales: 'addSaleBtn', payments: 'addPaymentBtn', applications: 'addApplicationBtn' };
  for (const [k, v] of Object.entries(addBtns)) {
    const el = $(v);
    if (el) el.style.display = (k === id && canWrite) ? '' : (k === id ? 'none' : el.style.display);
  }

  ({ cars: loadCars, users: loadUsers, sales: loadSales, payments: loadPayments, applications: loadApplications, dashboard: loadDashboard })[id]?.();
}

// ─────────────────────────────────────────────
//  DASHBOARD
// ─────────────────────────────────────────────
async function loadDashboard() {
  const grid = $('statsGrid');
  grid.innerHTML = '';
  try {
    const [cars, users, sales, payments, apps] = await Promise.all([
      api('GET', '/cars'),
      currentUser.role === ROLE.ADMIN ? api('GET', '/users') : Promise.resolve(null),
      ACCESS.sales.read.includes(currentUser.role)        ? api('GET', '/sales')        : Promise.resolve(null),
      ACCESS.payments.read.includes(currentUser.role)     ? api('GET', '/payments')     : Promise.resolve(null),
      ACCESS.applications.read.includes(currentUser.role) ? api('GET', '/applications') : Promise.resolve(null),
    ]);

    _carsCache = cars;
    if (users)  _usersCache = users;
    if (sales)  _salesCache = sales;

    const icon = paths => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
    const icons = {
      cars:         icon('<path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h16a2 2 0 012 2v6a2 2 0 01-2 2h-2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 9l2-4h10l2 4"/>'),
      users:        icon('<circle cx="12" cy="7" r="4"/><path d="M5.5 20a8.38 8.38 0 0113 0"/>'),
      sales:        icon('<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>'),
      payments:     icon('<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>'),
      applications: icon('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>'),
    };

    const statDefs = [
      { key: 'sales',        label: 'Продажи',     sub: 'сделок за всё время', val: sales,    featured: true },
      { key: 'cars',         label: 'Автомобили',   sub: 'в каталоге',          val: cars,     wide: true },
      { key: 'users',        label: 'Пользователи', sub: 'зарегистрировано',    val: users },
      { key: 'payments',     label: 'Платежи',      sub: 'транзакций',          val: payments },
      { key: 'applications', label: 'Заявки',       sub: 'на рассмотрении',     val: apps },
    ].filter(s => s.val !== null);

    grid.innerHTML = statDefs.map(s => {
      const count = Array.isArray(s.val) ? s.val.length : 0;
      if (s.featured) return `
        <div class="stat-card featured">
          <div style="display:flex;align-items:center;gap:20px;">
            <div class="stat-icon large" style="color:var(--accent)">${icons[s.key]}</div>
            <div class="stat-body">
              <div class="stat-label">${s.label}</div>
              <div class="stat-value">${count}</div>
              <div class="stat-sublabel">${s.sub}</div>
            </div>
          </div>
          <span class="stat-badge">Активно</span>
        </div>`;
      if (s.wide) return `
        <div class="stat-card wide">
          <div class="stat-icon large" style="color:var(--accent)">${icons[s.key]}</div>
          <div class="stat-divider"></div>
          <div class="stat-body">
            <div class="stat-label">${s.label}</div>
            <div class="stat-value">${count}</div>
            <div class="stat-sublabel">${s.sub}</div>
          </div>
        </div>`;
      return `
        <div class="stat-card">
          <div class="stat-icon" style="color:var(--accent)">${icons[s.key]}</div>
          <div class="stat-body">
            <div class="stat-label">${s.label}</div>
            <div class="stat-value" style="font-size:46px">${count}</div>
            <div class="stat-sublabel">${s.sub}</div>
          </div>
        </div>`;
    }).join('');
  } catch { grid.innerHTML = '<div class="empty">Не удалось загрузить данные</div>'; }
}

// ─────────────────────────────────────────────
//  CARS  
// ─────────────────────────────────────────────
async function loadCars() {
  showLoader('carsBody');
  try {
    const cars = await api('GET', '/cars');
    _carsCache = cars;
    if (!cars.length) { showEmpty('carsBody'); return; }
    const canWrite = ACCESS.cars.write.includes(currentUser.role);
    $('carsBody').innerHTML = cars.map(c => `
      <tr>
        <td>${c.id}</td>
        <td>${c.brand}</td>
        <td>${c.year ? new Date(c.year).getFullYear() : '—'}</td>
        <td>${Number(c.price).toLocaleString('ru')} ₽</td>
        <td>${c.state}</td>
        <td>${canWrite ? `
          <button class="btn-sm" onclick="editCar(${c.id})">Ред.</button>
          <button class="btn-sm danger" onclick="deleteCar(${c.id})">Удал.</button>
        ` : '—'}</td>
      </tr>`).join('');
  } catch { showEmpty('carsBody'); }
}

// Открываем окно с реальными данными
async function editCar(id) {
  try {
    const car = await api('GET', `/cars/${id}`);
    openCarModal(car);
  } catch {}
}

function openCarModal(car = null) {
  modalMode   = car ? 'edit' : 'create';
  modalEntity = 'cars';
  editId      = car?.id ?? null;

  $('modalTitle').textContent = car ? 'Редактировать автомобиль' : 'Новый автомобиль';

  const yearVal = car?.year
    ? new Date(car.year).getFullYear()
    : new Date().getFullYear();

  $('modalFields').innerHTML = `
    <div class="field-group">
      <label>Марка / Модель</label>
      <input id="f_brand" value="${car?.brand ?? ''}" placeholder="Toyota Camry"/>
      <div class="field-error" id="err_brand"></div>
    </div>
    <div class="field-group">
      <label>Год выпуска</label>
      <input id="f_year" type="number" min="1900" max="2100" value="${yearVal}"/>
      <div class="field-error" id="err_year"></div>
    </div>
    <div class="field-group">
      <label>Цена (₽)</label>
      <input id="f_price" type="number" min="0" max="999999999" value="${car?.price ?? ''}" placeholder="1500000"
             oninput="validateCarPrice()"/>
      <div class="field-error" id="err_price"></div>
    </div>
    <div class="field-group">
      <label>Состояние</label>
      <input id="f_state" value="${car?.state ?? ''}" placeholder="Новый / Б/у"/>
      <div class="field-error" id="err_state"></div>
    </div>`;

  openModal();
}

function validateCarPrice() {
  const el  = $('f_price');
  const err = $('err_price');
  if (!el || !err) return true;
  const raw = el.value;
  el.value = raw.replace(/[^0-9]/g, '');
  const val = +el.value;
  if (el.value === '') { err.textContent = 'Введите цену'; return false; }
  if (val < 0)         { err.textContent = 'Цена не может быть отрицательной'; return false; }
  if (val > 999999999) { err.textContent = 'Цена слишком большая (макс. 999 999 999)'; return false; }
  err.textContent = '';
  return true;
}

async function deleteCar(id) {
  if (!confirm('Удалить автомобиль?')) return;
  await api('DELETE', `/cars/${id}`);
  _carsCache = null;
  toast('Автомобиль удалён');
  loadCars();
}

// ─────────────────────────────────────────────
//  USERS
// ─────────────────────────────────────────────
async function loadUsers() {
  showLoader('usersBody');
  try {
    const users = await api('GET', '/users');
    _usersCache = users;
    if (!users.length) { showEmpty('usersBody'); return; }
    $('usersBody').innerHTML = users.map(u => `
      <tr>
        <td>${u.id}</td><td>${u.name}</td><td>${u.login}</td>
        <td>${u.phone}</td><td>${u.email}</td><td>${ROLES[u.role] ?? u.role}</td>
        <td>
          <button class="btn-sm" onclick="editUser(${u.id})">Ред.</button>
          <button class="btn-sm danger" onclick="deleteUser(${u.id})">Удал.</button>
        </td>
      </tr>`).join('');
  } catch { showEmpty('usersBody'); }
}

function openUserModal(user = null) {
  modalMode = user ? 'edit' : 'create'; modalEntity = 'users'; editId = user?.id ?? null;
  $('modalTitle').textContent = user ? 'Редактировать пользователя' : 'Новый пользователь';
  const roleOpts = Object.entries(ROLES).map(([v,n]) =>
    `<option value="${v}" ${user?.role == v ? 'selected' : ''}>${n}</option>`).join('');
  $('modalFields').innerHTML = `
    <div class="field-group"><label>Имя</label><input id="f_name" value="${user?.name ?? ''}"/></div>
    <div class="field-group"><label>Логин</label><input id="f_login" value="${user?.login ?? ''}"/></div>
    <div class="field-group"><label>Пароль</label><input id="f_password" type="password" value="${user?.password ?? ''}"/></div>
    <div class="field-group"><label>Телефон</label><input id="f_phone" value="${user?.phone ?? ''}"/></div>
    <div class="field-group"><label>Email</label><input id="f_email" type="email" value="${user?.email ?? ''}"/></div>
    <div class="field-group"><label>Роль</label><select id="f_role">${roleOpts}</select></div>`;
  openModal();
}

async function editUser(id) { try { openUserModal(await api('GET', `/users/${id}`)); } catch {} }
async function deleteUser(id) {
  if (!confirm('Удалить пользователя?')) return;
  await api('DELETE', `/users/${id}`);
  _usersCache = null;
  toast('Пользователь удалён');
  loadUsers();
}

// ─────────────────────────────────────────────
//  SALES
// ─────────────────────────────────────────────
async function loadSales() {
  showLoader('salesBody');
  try {
    const sales = await api('GET', '/sales');
    _salesCache = sales;
    if (!sales.length) { showEmpty('salesBody'); return; }
    const canWrite = ACCESS.sales.write.includes(currentUser.role);
    $('salesBody').innerHTML = sales.map(s => `
      <tr>
        <td>${s.id}</td><td>${s.brand}</td>
        <td>${s.date ? new Date(s.date).toLocaleDateString('ru') : '—'}</td>
        <td>${Number(s.price).toLocaleString('ru')} ₽</td>
        <td>${s.clientId}</td><td>${s.managerId}</td>
        <td>${canWrite ? `
          <button class="btn-sm" onclick="editSale(${s.id})">Ред.</button>
          <button class="btn-sm danger" onclick="deleteSale(${s.id})">Удал.</button>
        ` : '—'}</td>
      </tr>`).join('');
  } catch { showEmpty('salesBody'); }
}

async function openSaleModal(sale = null) {
  modalMode = sale ? 'edit' : 'create'; modalEntity = 'sales'; editId = sale?.id ?? null;
  $('modalTitle').textContent = sale ? 'Редактировать продажу' : 'Новая продажа';
  $('modalFields').innerHTML = `
    <div class="field-group"><label>Дата</label><input id="f_date" type="date" value="${sale?.date ? sale.date.substring(0,10) : new Date().toISOString().substring(0,10)}"/></div>
    <div class="field-group"><label>Клиент</label><div id="wrap_clientId">${selectLoading('f_clientId')}</div></div>
    <div class="field-group"><label>Автомобиль</label><div id="wrap_carId">${selectLoading('f_carId')}</div></div>
    <div class="field-group"><label>Марка / Модель</label><input id="f_brand" value="${sale?.brand ?? ''}" placeholder="Заполнится автоматически"/></div>
    <div class="field-group"><label>Цена (₽)</label><input id="f_price" type="number" value="${sale?.price ?? ''}" placeholder="Заполнится автоматически"/></div>
    <div class="field-group"><label>Менеджер</label><div id="wrap_managerId">${selectLoading('f_managerId')}</div></div>`;
  openModal();
  try {
    const [users, cars] = await Promise.all([getUsers(), getCars()]);
    const clients  = users
      .filter(u => u.role === ROLE.USER)
      .map(u => ({ value: u.id, label: `${u.name} (${u.login})` }));
    const managers = users
      .filter(u => u.role === ROLE.MANAGER)
      .map(u => ({ value: u.id, label: `${u.name} (${ROLES[u.role]})` }));
    const carOpts  = cars.map(c => ({
      value: c.id,
      label: `${c.brand}, ${c.year ? new Date(c.year).getFullYear() : '?'} — ${Number(c.price).toLocaleString('ru')} ₽ [${c.state}]`,
      brand: c.brand,
      price: c.price,
    }));

    $('wrap_clientId').innerHTML  = buildSelect('f_clientId',  clients,  sale?.clientId,  '— Выберите клиента —');
    $('wrap_managerId').innerHTML = buildSelect('f_managerId', managers, sale?.managerId, '— Выберите менеджера —');
    const carSelectHtml = `<select id="f_carId">
      <option value="">— Выберите автомобиль —</option>
      ${carOpts.map(o => `<option value="${o.value}" data-brand="${o.brand}" data-price="${o.price}" ${o.value == sale?.carId ? 'selected' : ''}>${o.label}</option>`).join('')}
    </select>`;
    $('wrap_carId').innerHTML = carSelectHtml;
    $('f_carId').addEventListener('change', function() {
      const opt = this.options[this.selectedIndex];
      if (opt.value) {
        $('f_brand').value = opt.dataset.brand || '';
        $('f_price').value = opt.dataset.price || '';
      }
    });
    if (sale?.carId) {
      const found = carOpts.find(o => o.value == sale.carId);
      if (found) {
        $('f_brand').value = sale.brand || found.brand;
        $('f_price').value = sale.price || found.price;
      }
    }
  } catch {
    $('wrap_clientId').innerHTML  = `<input id="f_clientId"  type="number" value="${sale?.clientId  ?? ''}" placeholder="ID клиента"/>`;
    $('wrap_carId').innerHTML     = `<input id="f_carId"     type="number" value="${sale?.carId     ?? ''}" placeholder="ID автомобиля"/>`;
    $('wrap_managerId').innerHTML = `<input id="f_managerId" type="number" value="${sale?.managerId ?? ''}" placeholder="ID менеджера"/>`;
  }
}

async function editSale(id) { try { await openSaleModal(await api('GET', `/sales/${id}`)); } catch {} }
async function deleteSale(id) {
  if (!confirm('Удалить продажу?')) return;
  await api('DELETE', `/sales/${id}`);
  _salesCache = null;
  toast('Продажа удалена');
  loadSales();
}

// ─────────────────────────────────────────────
//  PAYMENTS
// ─────────────────────────────────────────────
async function loadPayments() {
  showLoader('paymentsBody');
  try {
    const payments = await api('GET', '/payments');
    if (!payments.length) { showEmpty('paymentsBody'); return; }
    const canWrite = ACCESS.payments.write.includes(currentUser.role);
    $('paymentsBody').innerHTML = payments.map(p => `
      <tr>
        <td>${p.id}</td>
        <td>${Number(p.sum).toLocaleString('ru')} ₽</td>
        <td>${p.dateTime ? new Date(p.dateTime).toLocaleString('ru') : '—'}</td>
        <td>${p.saleId}</td>
        <td>${canWrite ? `
          <button class="btn-sm" onclick="editPayment(${p.id})">Ред.</button>
          <button class="btn-sm danger" onclick="deletePayment(${p.id})">Удал.</button>
        ` : '—'}</td>
      </tr>`).join('');
  } catch { showEmpty('paymentsBody'); }
}

async function openPaymentModal(p = null) {
  modalMode = p ? 'edit' : 'create'; modalEntity = 'payments'; editId = p?.id ?? null;
  $('modalTitle').textContent = p ? 'Редактировать платёж' : 'Новый платёж';
  $('modalFields').innerHTML = `
    <div class="field-group"><label>Сумма</label><input id="f_sum" type="number" value="${p?.sum ?? ''}"/></div>
    <div class="field-group"><label>Дата и время</label><input id="f_dateTime" type="datetime-local" value="${p?.dateTime ? p.dateTime.substring(0,16) : new Date().toISOString().substring(0,16)}"/></div>
    <div class="field-group"><label>Продажа</label><div id="wrap_saleId">${selectLoading('f_saleId')}</div></div>`;
  openModal();
  try {
    const sales = await getSales();
    const saleOpts = sales.map(s => ({ value: s.id, label: `#${s.id} — ${s.brand}, ${s.date ? new Date(s.date).toLocaleDateString('ru') : '?'}, ${Number(s.price).toLocaleString('ru')} ₽` }));
    $('wrap_saleId').innerHTML = buildSelect('f_saleId', saleOpts, p?.saleId, '— Выберите продажу —');
  } catch {
    $('wrap_saleId').innerHTML = `<input id="f_saleId" type="number" value="${p?.saleId ?? ''}" placeholder="ID продажи"/>`;
  }
}

async function editPayment(id) { try { await openPaymentModal(await api('GET', `/payments/${id}`)); } catch {} }
async function deletePayment(id) {
  if (!confirm('Удалить платёж?')) return;
  await api('DELETE', `/payments/${id}`);
  toast('Платёж удалён');
  loadPayments();
}

// ─────────────────────────────────────────────
//  APPLICATIONS
// ─────────────────────────────────────────────
async function loadApplications() {
  showLoader('applicationsBody');
  try {
    const apps = await api('GET', '/applications');
    if (!apps.length) { showEmpty('applicationsBody'); return; }
    const canWrite = ACCESS.applications.write.includes(currentUser.role);
    $('applicationsBody').innerHTML = apps.map(a => `
      <tr>
        <td>${a.id}</td>
        <td>${a.dateTime ? new Date(a.dateTime).toLocaleString('ru') : '—'}</td>
        <td>${a.saleId ?? '—'}</td>
        <td>${canWrite ? `
          <button class="btn-sm" onclick="editApplication(${a.id})">Ред.</button>
          <button class="btn-sm danger" onclick="deleteApplication(${a.id})">Удал.</button>
        ` : '—'}</td>
      </tr>`).join('');
  } catch { showEmpty('applicationsBody'); }
}

async function openApplicationModal(a = null) {
  modalMode = a ? 'edit' : 'create'; modalEntity = 'applications'; editId = a?.id ?? null;
  $('modalTitle').textContent = a ? 'Редактировать заявку' : 'Новая заявка';
  $('modalFields').innerHTML = `
    <div class="field-group"><label>Дата и время</label><input id="f_dateTime" type="datetime-local" value="${a?.dateTime ? a.dateTime.substring(0,16) : new Date().toISOString().substring(0,16)}"/></div>
    <div class="field-group"><label>Продажа (необязательно)</label><div id="wrap_saleId">${selectLoading('f_saleId')}</div></div>`;
  openModal();
  try {
    const sales = await getSales();
    const opts = sales.map(s =>
      `<option value="${s.id}" ${s.id == a?.saleId ? 'selected' : ''}>#${s.id} — ${s.brand}, ${s.date ? new Date(s.date).toLocaleDateString('ru') : '?'}</option>`
    ).join('');
    $('wrap_saleId').innerHTML = `<select id="f_saleId"><option value="">— Без привязки к продаже —</option>${opts}</select>`;
  } catch {
    $('wrap_saleId').innerHTML = `<input id="f_saleId" type="number" value="${a?.saleId ?? ''}" placeholder="ID продажи (необязательно)"/>`;
  }
}

async function editApplication(id) { try { await openApplicationModal(await api('GET', `/applications/${id}`)); } catch {} }
async function deleteApplication(id) {
  if (!confirm('Удалить заявку?')) return;
  await api('DELETE', `/applications/${id}`);
  toast('Заявка удалена');
  loadApplications();
}

// ─────────────────────────────────────────────
//  MODAL SAVE
// ─────────────────────────────────────────────
function getVal(id) { const el = document.getElementById(id); return el ? el.value : undefined; }

async function saveModal() {
  const method = modalMode === 'create' ? 'POST' : 'PUT';
  let body = {}, path = '';
  try {
    if (modalEntity === 'cars') {
      const brand = getVal('f_brand');
      const year  = getVal('f_year');
      const price = getVal('f_price');
      const state = getVal('f_state');
      if (!brand) { $('err_brand') && ($('err_brand').textContent = 'Введите марку'); return; }
      if (!year || +year < 1900 || +year > 2100) { $('err_year') && ($('err_year').textContent = 'Введите корректный год'); return; }
      if (!validateCarPrice()) return;
      if (!state) { $('err_state') && ($('err_state').textContent = 'Введите состояние'); return; }
      body = {
        brand,
        year:  new Date(Date.UTC(+year, 0, 1)).toISOString(),
        price: +price,
        state,
      };
      path = modalMode === 'edit' ? `/cars/${editId}` : '/cars';

    } else if (modalEntity === 'users') {
      body = { name: getVal('f_name'), login: getVal('f_login'), password: getVal('f_password'), phone: getVal('f_phone'), email: getVal('f_email'), role: +getVal('f_role') };
      path = modalMode === 'edit' ? `/users/${editId}` : '/users';

    } else if (modalEntity === 'sales') {
      const clientId  = getVal('f_clientId');
      const carId     = getVal('f_carId');
      const managerId = getVal('f_managerId');
      const brand     = getVal('f_brand');
      const price     = getVal('f_price');
      const date      = getVal('f_date');
      if (!clientId)  { toast('Выберите клиента', true); return; }
      if (!carId)     { toast('Выберите автомобиль', true); return; }
      if (!managerId) { toast('Выберите менеджера', true); return; }
      if (!brand)     { toast('Марка не заполнена', true); return; }
      if (!price)     { toast('Цена не заполнена', true); return; }
      body = {
        brand,
        date:      new Date(date).toISOString(),
        price:     Math.round(+price),   // Sale.Price — int
        clientId:  +clientId,
        carId:     +carId,
        managerId: +managerId,
      };
      path = modalMode === 'edit' ? `/sales/${editId}` : '/sales';

    } else if (modalEntity === 'payments') {
      const saleId = getVal('f_saleId');
      if (!saleId) { toast('Выберите продажу', true); return; }
      body = { sum: +getVal('f_sum'), dateTime: new Date(getVal('f_dateTime')).toISOString(), saleId: +saleId };
      path = modalMode === 'edit' ? `/payments/${editId}` : '/payments';

    } else if (modalEntity === 'applications') {
      body = { dateTime: new Date(getVal('f_dateTime')).toISOString() };
      const saleId = getVal('f_saleId');
      if (saleId) body.saleId = +saleId;
      path = modalMode === 'edit' ? `/applications/${editId}` : '/applications';
    }

    await api(method, path, body);

    if (modalEntity === 'cars')  _carsCache  = null;
    if (modalEntity === 'users') _usersCache = null;
    if (modalEntity === 'sales') _salesCache = null;

    toast(modalMode === 'create' ? 'Успешно создано' : 'Успешно обновлено');
    closeModal();
    ({ cars: loadCars, users: loadUsers, sales: loadSales, payments: loadPayments, applications: loadApplications })[modalEntity]?.();
  } catch {}
}

// ─────────────────────────────────────────────
//  MODAL OPEN / CLOSE
// ─────────────────────────────────────────────
function openModal() {
  $('modalOverlay').classList.add('open');
  setTimeout(() => { const first = $('modalFields').querySelector('input,select'); if (first) first.focus(); }, 200);
}
function closeModal() { $('modalOverlay').classList.remove('open'); }

// ─────────────────────────────────────────────
//  BOOT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('autosalon_user');
  if (saved) { currentUser = JSON.parse(saved); initApp(); }

  $('loginBtn').onclick    = doLogin;
  $('registerBtn').onclick = doRegister;
  $('logoutBtn').onclick   = doLogout;

  $('loginInput').onkeydown    = e => { if (e.key === 'Enter') $('passwordInput').focus(); };
  $('passwordInput').onkeydown = e => { if (e.key === 'Enter') doLogin(); };
  $('regEmail').onkeydown      = e => { if (e.key === 'Enter') doRegister(); };

  $('addCarBtn').onclick         = () => openCarModal();
  $('addUserBtn').onclick        = () => openUserModal();
  $('addSaleBtn').onclick        = () => openSaleModal();
  $('addPaymentBtn').onclick     = () => openPaymentModal();
  $('addApplicationBtn').onclick = () => openApplicationModal();

  $('modalCancel').onclick  = closeModal;
  $('modalSave').onclick    = saveModal;
  $('modalOverlay').onclick = e => { if (e.target === $('modalOverlay')) closeModal(); };
});