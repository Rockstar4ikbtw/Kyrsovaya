const API = window.location.port === '3000'
    ? 'http://localhost:8080/api'
    : 'http://localhost:5155/api';
let currentUser = null;
let modalEntity = null; 
let editId = null;      
let carsCache    = [];
let usersCache   = [];
let salesCache   = [];
let reportsCache = [];
let selectedRole = 1;

const PROTECTED_ROLES = [2, 3, 4, 5];

// Секретные коды для каждой роли
const ROLE_CODES = {
    2: 'admin123',
    3: 'manager123',
    4: 'accountant123',
    5: 'director123'
};

// Названия периодов для отчётов
const PERIOD_LABELS = {
    1: 'Ежедневный',
    2: 'Месячный',
    3: 'Квартальный',
    4: 'Годовой',
    5: 'Произвольный'
};

// ХЕШИРОВАНИЕ ПАРОЛЯ
async function hashPassword(plainText) {
    const msgBuffer = new TextEncoder().encode(plainText);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}


// ВАЛИДАЦИЯ EMAIL
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function applyEmailValidation(input) {
    let hint = input.parentElement.querySelector('.email-hint');
    if (!hint) {
        hint = document.createElement('div');
        hint.className = 'email-hint';
        hint.style.cssText = 'font-size:11px;color:#e74c3c;margin-top:5px;display:none';
        hint.textContent = 'Некорректный формат — например: mail@example.com';
        input.parentElement.appendChild(hint);
    }
    input.addEventListener('input', function () {
        const val = this.value.trim();
        if (val && !EMAIL_RE.test(val)) {
            this.style.borderColor = '#e74c3c';
            this.style.boxShadow   = '0 0 0 2px rgba(231,76,60,0.25)';
            hint.style.display = 'block';
        } else {
            this.style.borderColor = '';
            this.style.boxShadow   = '';
            hint.style.display = 'none';
        }
    });
    input.addEventListener('blur', function () {
        const val = this.value.trim();
        if (val && !EMAIL_RE.test(val)) {
            this.style.borderColor = '#e74c3c';
            this.style.boxShadow   = '0 0 0 2px rgba(231,76,60,0.25)';
            hint.style.display = 'block';
        }
    });
}

// МАСКА ТЕЛЕФОНА
function applyPhoneMask(input) {
    input.addEventListener('input', function (e) {
        let digits = this.value.replace(/\D/g, '');
        if (digits.startsWith('8')) digits = '7' + digits.slice(1);
        if (!digits.startsWith('7')) digits = '7' + digits;
        digits = digits.slice(0, 11);
        let result = '+7';
        if (digits.length > 1) result += ' (' + digits.slice(1, 4);
        if (digits.length >= 4) result += ') ' + digits.slice(4, 7);
        if (digits.length >= 7) result += '-' + digits.slice(7, 9);
        if (digits.length >= 9) result += '-' + digits.slice(9, 11);
        this.value = result;
    });
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace') {
            const pos = this.selectionStart;
            const special = ['(', ')', '-', ' '];
            if (special.includes(this.value[pos - 1])) {
                this.value = this.value.slice(0, pos - 1);
                e.preventDefault();
            }
        }
    });
}
document.addEventListener('DOMContentLoaded', () => {
    const phoneInput = document.getElementById('regPhone');
    if (phoneInput) applyPhoneMask(phoneInput);
    const emailInput = document.getElementById('regEmail');
    if (emailInput) applyEmailValidation(emailInput);
});

// ВКЛАДКИ ВХОДА / РЕГИСТРАЦИИ
function switchAuthTab(tab) {
    document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
    document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
    document.getElementById('panelLogin').classList.toggle('active', tab === 'login');
    document.getElementById('panelRegister').classList.toggle('active', tab === 'register');
}
// ВЫБОР РОЛИ ПРИ РЕГИСТРАЦИИ
function selectRole(num) {
    selectedRole = num;
    for (let i = 1; i <= 5; i++) {
        document.getElementById('rc' + i)?.classList.toggle('selected', i === num);
    }
    const wrap = document.getElementById('roleConfirmWrap');
    const needsCode = PROTECTED_ROLES.includes(num);
    wrap.classList.toggle('visible', needsCode);
    if (needsCode) {
        const names = { 2: 'Администратор', 3: 'Менеджер', 4: 'Бухгалтер', 5: 'Руководитель' };
        document.getElementById('confirmRoleName').textContent = names[num];
    }
}

// ВХОД В СИСТЕМУ
async function login() {
    const loginVal = document.getElementById('loginInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    if (!loginVal || !password) {
        showLoginError('Введите логин и пароль');
        return;
    }
    try {
        const hashedPwd = await hashPassword(password);
        const res = await fetch(`${API}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: loginVal, password: hashedPwd })
        });
        if (!res.ok) {
            showLoginError('Неверный логин или пароль');
            return;
        }
        currentUser = await res.json();
        enterApp();
    } catch (e) {
        showLoginError('Ошибка подключения к серверу');
    }
}

// РЕГИСТРАЦИЯ НОВОГО ПОЛЬЗОВАТЕЛЯ
async function register() {
    const name     = document.getElementById('regName').value.trim();
    const loginVal = document.getElementById('regLogin').value.trim();
    const password = document.getElementById('regPassword').value;
    const phone    = document.getElementById('regPhone').value.trim();
    const email    = document.getElementById('regEmail').value.trim();
    const role     = selectedRole;
    if (!name || !loginVal || !password) {
        showRegisterError('Заполните обязательные поля: имя, логин, пароль');
        return;
    }
    if (email && !EMAIL_RE.test(email)) {
        showRegisterError('Введите корректный email — например: mail@example.com');
        const emailEl = document.getElementById('regEmail');
        if (emailEl) { emailEl.style.borderColor = '#e74c3c'; emailEl.focus(); }
        return;
    }
    if (PROTECTED_ROLES.includes(role)) {
        const code = document.getElementById('roleConfirmCode').value;
        if (code !== ROLE_CODES[role]) {
            showRegisterError('Неверный код подтверждения для выбранной роли');
            return;
        }
    }
    try {
        const checkRes = await fetch(`${API}/users`);
        const allUsers = await checkRes.json();
        const loginTaken = allUsers.some(u => u.login === loginVal);
        if (loginTaken) {
            showRegisterError('Такой логин уже занят. Придумайте другой.');
            return;
        }
        if (email) {
            const emailTaken = allUsers.some(u => u.email && u.email.toLowerCase() === email.toLowerCase());
            if (emailTaken) {
                showRegisterError('Этот email уже зарегистрирован.');
                return;
            }
        }
        if (phone) {
            const phoneTaken = allUsers.some(u => u.phone && u.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
            if (phoneTaken) {
                showRegisterError('Этот номер телефона уже используется.');
                return;
            }
        }
    } catch (e) {
    }
    const hashedPwd = await hashPassword(password);
    try {
        const res = await fetch(`${API}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                login: loginVal,
                password: hashedPwd, 
                phone,
                email,
                role
            })
        });
        if (!res.ok) {
            showRegisterError('Ошибка регистрации. Попробуйте другой логин.');
            return;
        }
        currentUser = await res.json();
        enterApp(); 
    } catch (e) {
        showRegisterError('Ошибка подключения к серверу');
    }
}

// ВХОД В ПРИЛОЖЕНИЕ после успешной авторизации
function enterApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appShell').classList.add('visible');
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('roleBadge').textContent = roleLabel(currentUser.role);
    buildNav();
    showSection('dashboard');
}

// ВЫХОД ИЗ СИСТЕМЫ
function logout() {
    currentUser = null; 
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('appShell').classList.remove('visible');
    document.getElementById('loginInput').value = '';
    document.getElementById('passwordInput').value = '';
    document.getElementById('loginError').textContent = '';
}
function showLoginError(msg) {
    document.getElementById('loginError').textContent = msg;
}
function showRegisterError(msg) {
    document.getElementById('registerError').textContent = msg;
}
document.getElementById('passwordInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') login();
});
document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('registerBtn').addEventListener('click', register);
document.getElementById('logoutBtn').addEventListener('click', logout);

// РОЛИ ПОЛЬЗОВАТЕЛЕЙ
function roleLabel(role) {
    const map = {
        1: 'Пользователь',
        2: 'Администратор',
        3: 'Менеджер',
        4: 'Бухгалтер',
        5: 'Руководитель'
    };
    return map[role] || role;
}
function isAdmin()          { return currentUser?.role === 2; }
function isManager()        { return currentUser?.role === 3; }
function isAccountant()     { return currentUser?.role === 4; }
function isDirector()       { return currentUser?.role === 5; }
function isAdminOrDirector(){ return isAdmin() || isDirector(); }
function canModifyCars()  { return isAdmin() || isManager() || isDirector(); }
function canSell()        { return isAdmin() || isManager() || isDirector(); }
function canPayments()    { return isAdmin() || isManager(); }
function canReports()     { return isAdmin() || isAccountant() || isDirector(); }
function canManageUsers() { return isAdmin(); }

// НАВИГАЦИЯ
const NAV_ITEMS = [
    { id: 'dashboard',    label: 'Главная',      always: true },
    { id: 'cars',         label: 'Автомобили',   always: true },
    { id: 'sales',        label: 'Продажи',      check: () => canSell() },
    { id: 'applications', label: 'Заявки',       always: true },
    { id: 'payments',     label: 'Платежи',      check: () => canPayments() },
    { id: 'reports',      label: 'Отчётность',   check: () => canReports() },
    { id: 'users',        label: 'Пользователи', check: () => canManageUsers() },
];
function buildNav() {
    const nav = document.getElementById('mainNav');
    nav.innerHTML = '';
    NAV_ITEMS.forEach(item => {
        if (!item.always && !item.check()) return;
        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        btn.id = 'nav-' + item.id;
        btn.textContent = item.label;
        btn.onclick = () => showSection(item.id);
        nav.appendChild(btn);
    });
}
function showSection(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('section-' + name)?.classList.add('active');
    document.getElementById('nav-' + name)?.classList.add('active');
    const showIfCan = (btnId, condition) => {
        const btn = document.getElementById(btnId);
        if (btn) btn.style.display = condition ? '' : 'none';
    };

    showIfCan('addCarBtn',         canModifyCars());
    showIfCan('addSaleBtn',        canSell());
    showIfCan('addPaymentBtn',     canPayments());
    showIfCan('addReportBtn',      canReports());
    showIfCan('addUserBtn',        canManageUsers());
    showIfCan('addApplicationBtn', true);
    if      (name === 'dashboard')    loadDashboard();
    else if (name === 'cars')         loadCars();
    else if (name === 'sales')        loadSales();
    else if (name === 'applications') loadApplications();
    else if (name === 'payments')     loadPayments();
    else if (name === 'reports')      loadReports();
    else if (name === 'users')        loadUsers();
}

// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
async function apiFetch(path, options = {}) {
    return fetch(`${API}${path}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
    });
}
function fmt(n) {
    return Number(n).toLocaleString('ru-RU');
}
function fmtDate(d) {
    return d ? new Date(d).toLocaleDateString('ru-RU') : '—';
}
async function parseApiError(res) {
    const text = await res.text();
    try {
        const json = JSON.parse(text);
        if (json.errors) {
            const fieldNames = {
                'brand': 'Марка', 'year': 'Год', 'price': 'Цена',
                'state': 'Состояние', 'date': 'Дата',
                'clientId': 'Клиент', 'managerId': 'Менеджер',
                'saleId': 'Продажа', 'sum': 'Сумма'
            };
            const msgs = Object.entries(json.errors).map(([field, errs]) => {
                const label = fieldNames[field] || field;
                return label + ': ' + (Array.isArray(errs) ? errs.join(', ') : errs);
            });
            return msgs.join(' | ');
        }

        if (json.title)   return json.title;
        if (json.message) return json.message;
    } catch (_) {}

    return text || 'Неизвестная ошибка';
}

// ОШИБКИ В МОДАЛЬНОМ ОКНЕ
function showModalError(msg) {
    let el = document.getElementById('modalError');
    if (!el) {
        el = document.createElement('div');
        el.id = 'modalError';
        el.style.cssText = [
            'color:#e74c3c',
            'background:rgba(231,76,60,0.1)',
            'border:1px solid rgba(231,76,60,0.35)',
            'border-radius:6px',
            'padding:10px 14px',
            'margin-top:12px',
            'font-size:13.5px',
            'line-height:1.5',
            'white-space:pre-wrap'
        ].join(';');
        const saveBtn = document.getElementById('modalSave');
        if (saveBtn?.parentElement) {
            saveBtn.parentElement.before(el);
        } else {
            document.getElementById('modalFields').after(el);
        }
    }
    el.textContent = msg;
    el.style.display = 'block';
}
function highlightField(id) {
    const el = document.getElementById(id);
    if (!el) return;

    el.style.borderColor = '#e74c3c';
    el.style.boxShadow   = '0 0 0 2px rgba(231,76,60,0.25)';
    const clear = () => {
        el.style.borderColor = '';
        el.style.boxShadow   = '';
        el.removeEventListener('input',  clear);
        el.removeEventListener('change', clear);
    };
    el.addEventListener('input',  clear);
    el.addEventListener('change', clear);
}
function clearModalError() {
    const el = document.getElementById('modalError');
    if (el) el.style.display = 'none';

    document.querySelectorAll('#modalFields input, #modalFields select').forEach(el => {
        el.style.borderColor = '';
        el.style.boxShadow   = '';
    });
}

// ДАШБОРД — главная страница со статистикой
async function loadDashboard() {
    const grid = document.getElementById('statsGrid');
    grid.innerHTML = '<div class="loader"></div>'; 
    try {
        const [salesRes, carsRes, usersRes, paymentsRes] = await Promise.all([
            apiFetch('/sales'), apiFetch('/cars'), apiFetch('/users'), apiFetch('/payments')
        ]);
        const sales    = await salesRes.json();
        const cars     = await carsRes.json();
        const users    = await usersRes.json();
        const payments = await paymentsRes.json();
        salesCache = sales;
        carsCache  = cars;
        usersCache = users;
        const totalRevenue = sales.reduce((sum, s) => sum + (s.price || s.Price || 0), 0);
        const totalPaid    = payments.reduce((sum, p) => sum + (p.sum || p.Sum || 0), 0);
        const managers     = users.filter(u => (u.role || u.Role) === 3);
        grid.innerHTML = `
            <div class="stat-card featured">
                <div>
                    <div class="stat-label">Общая выручка</div>
                    <div class="stat-value">${fmt(totalRevenue)} ₽</div>
                    <div class="stat-sublabel">Оплачено: ${fmt(totalPaid)} ₽ · Долг: ${fmt(totalRevenue - totalPaid)} ₽</div>
                </div>
                <div class="stat-badge">Активно</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z"/>
                    </svg>
                </div>
                <div class="stat-body">
                    <div class="stat-label">Продажи</div>
                    <div class="stat-value">${sales.length}</div>
                    <div class="stat-sublabel">Всего сделок</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="1" y="3" width="15" height="13"/><path d="M16 8l5 0"/><path d="M16 11l5 0"/><path d="M16 14l5 0"/>
                    </svg>
                </div>
                <div class="stat-body">
                    <div class="stat-label">Автомобили</div>
                    <div class="stat-value">${cars.length}</div>
                    <div class="stat-sublabel">В каталоге</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="7" r="4"/><path d="M5.5 20a8.38 8.38 0 0113 0"/>
                    </svg>
                </div>
                <div class="stat-body">
                    <div class="stat-label">Менеджеры</div>
                    <div class="stat-value">${managers.length}</div>
                    <div class="stat-sublabel">Активных</div>
                </div>
            </div>
        `;
        if (isAdminOrDirector()) {
            const managerSales = {};
            sales.forEach(s => {
                const mid = s.managerId || s.ManagerId;
                if (mid) managerSales[mid] = (managerSales[mid] || 0) + 1;
            });
            const topManagers = Object.entries(managerSales)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            const topMgrHtml = topManagers.map(([mid, cnt]) => {
                const mgr = users.find(u => u.id === parseInt(mid));
                return `<tr>
                    <td style="color:var(--text)">${mgr?.name || 'Менеджер #' + mid}</td>
                    <td style="color:var(--accent2);font-weight:600">${cnt}</td>
                </tr>`;
            }).join('') || `<tr><td colspan="2" style="color:var(--muted)">Нет данных</td></tr>`;
            const recentSales = [...sales]
                .sort((a, b) => new Date(b.date || b.Date) - new Date(a.date || a.Date))
                .slice(0, 6);

            const recentHtml = recentSales.map(s => `<tr>
                <td style="color:var(--text)">${s.brand || s.Brand}</td>
                <td>${fmtDate(s.date || s.Date)}</td>
                <td style="color:var(--accent2)">${fmt(s.price || s.Price)} ₽</td>
            </tr>`).join('') || `<tr><td colspan="3" style="color:var(--muted)">Нет продаж</td></tr>`;

            const extra = document.createElement('div');
            extra.style.cssText = 'grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:4px';
            extra.innerHTML = `
                <div class="table-wrap" style="padding:20px 24px">
                    <div style="font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:14px">ТОП МЕНЕДЖЕРЫ</div>
                    <table><tbody>${topMgrHtml}</tbody></table>
                </div>
                <div class="table-wrap" style="padding:20px 24px">
                    <div style="font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:14px">ПОСЛЕДНИЕ ПРОДАЖИ</div>
                    <table><tbody>${recentHtml}</tbody></table>
                </div>
            `;
            grid.appendChild(extra);
        }

    } catch (e) {
        grid.innerHTML = '<div class="empty">Ошибка загрузки данных</div>';
        showToast('Ошибка загрузки дашборда', 'error');
    }
}

// АВТОМОБИЛИ
async function loadCars() {
    document.getElementById('carsBody').innerHTML = '<tr><td colspan="6"><div class="loader"></div></td></tr>';

    const res = await apiFetch('/cars');
    carsCache = await res.json();

    if (!carsCache.length) {
        document.getElementById('carsBody').innerHTML = '<tr><td colspan="6"><div class="empty">Нет автомобилей</div></td></tr>';
        return;
    }

    document.getElementById('carsBody').innerHTML = carsCache.map(c => `
        <tr>
            <td>${c.id}</td>
            <td style="color:var(--text)">${c.brand || c.Brand || '—'}</td>
            <td>${c.year ? new Date(c.year).getFullYear() : (c.Year ? new Date(c.Year).getFullYear() : '—')}</td>
            <td>${fmt(c.price || c.Price || 0)} ₽</td>
            <td>${c.state || c.State || '—'}</td>
            <td>
                <button class="btn-sm" onclick="openApplicationModalForCar(${c.id})">Заявка</button>
                ${canModifyCars() ? `
                    <button class="btn-sm" onclick="openCarModal(${c.id})">Изм.</button>
                    <button class="btn-sm danger" onclick="deleteCar(${c.id})">Удал.</button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

async function deleteCar(id) {
    if (!confirm('Удалить автомобиль?')) return;
    await apiFetch(`/cars/${id}`, { method: 'DELETE' });
    showToast('Автомобиль удалён');
    loadCars();
}
function openCarModal(id = null) {
    modalEntity = 'car';
    editId = id;
    const car = id ? carsCache.find(c => c.id === id) : null;

    openModal(id ? 'Редактировать автомобиль' : 'Добавить автомобиль', `
        <div class="field-group">
            <label>Марка <span style="color:#e74c3c">*</span></label>
            <input id="fBrand" value="${car?.brand || car?.Brand || ''}" placeholder="Toyota Camry" />
        </div>
        <div class="field-group">
            <label>Год выпуска <span style="color:#e74c3c">*</span></label>
            <input type="date" id="fYear" value="${car ? new Date(car.year || car.Year).toISOString().slice(0,10) : ''}" />
        </div>
        <div class="field-group">
            <label>Цена (₽) <span style="color:#e74c3c">*</span></label>
            <input type="number" id="fPrice" value="${car?.price || car?.Price || ''}" placeholder="1500000" />
        </div>
        <div class="field-group">
            <label>Состояние</label>
            <select id="fState">
                <option value="Новый"      ${(car?.state || car?.State) === 'Новый'      ? 'selected' : ''}>Новый</option>
                <option value="С пробегом" ${(car?.state || car?.State) === 'С пробегом' ? 'selected' : ''}>С пробегом</option>
            </select>
        </div>
    `);
}

async function saveCar() {
    const brand = document.getElementById('fBrand').value.trim();
    const year  = document.getElementById('fYear').value;
    const price = document.getElementById('fPrice').value;
    const errors = [];
    if (!brand) { highlightField('fBrand'); errors.push('Введите марку автомобиля'); }
    if (!year)  { highlightField('fYear');  errors.push('Укажите год выпуска'); }
    if (!price || Number(price) <= 0) {
        highlightField('fPrice');
        errors.push('Введите корректную цену (больше 0)');
    }
    if (errors.length) throw new Error(errors.join('\n'));

    const body = {
        brand,
        year:  year,
        price: parseFloat(price),
        state: document.getElementById('fState').value
    };

    const res = await apiFetch(editId ? `/cars/${editId}` : '/cars', {
        method: editId ? 'PUT' : 'POST',
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await parseApiError(res));
}
// ПРОДАЖИ
async function loadSales() {
    document.getElementById('salesBody').innerHTML = '<tr><td colspan="7"><div class="loader"></div></td></tr>';
    const [sRes, uRes, cRes] = await Promise.all([
        apiFetch('/sales'), apiFetch('/users'), apiFetch('/cars')
    ]);
    salesCache = await sRes.json();
    usersCache = await uRes.json();
    carsCache  = await cRes.json();
    if (!salesCache.length) {
        document.getElementById('salesBody').innerHTML = '<tr><td colspan="7"><div class="empty">Нет продаж</div></td></tr>';
        return;
    }
    document.getElementById('salesBody').innerHTML = salesCache.map(s => {
        const client = usersCache.find(u => u.id === (s.clientId  || s.ClientId));
        const mgr    = usersCache.find(u => u.id === (s.managerId || s.ManagerId));

        return `<tr>
            <td>${s.id}</td>
            <td style="color:var(--text)">${s.brand || s.Brand || '—'}</td>
            <td>${fmtDate(s.date || s.Date)}</td>
            <td>${fmt(s.price || s.Price || 0)} ₽</td>
            <td>${client?.name || s.clientId || '—'}</td>
            <td>${mgr?.name    || s.managerId || '—'}</td>
            <td>
                ${canSell() ? `<button class="btn-sm danger" onclick="deleteSale(${s.id})">Удал.</button>` : '—'}
            </td>
        </tr>`;
    }).join('');
}
async function deleteSale(id) {
    if (!confirm('Удалить продажу?')) return;
    await apiFetch(`/sales/${id}`, { method: 'DELETE' });
    showToast('Продажа удалена');
    loadSales();
}
function onSaleCarChange(selectEl) {
    const carId = parseInt(selectEl.value);
    const car   = carsCache.find(c => c.id === carId);
    if (!car) return;
    document.getElementById('fSaleBrand').value = car.brand || car.Brand || '';
    document.getElementById('fSalePrice').value = car.price || car.Price || '';
}
async function openSaleModal() {
    modalEntity = 'sale';
    editId = null;
    const [uRes, cRes] = await Promise.all([apiFetch('/users'), apiFetch('/cars')]);
    const users = await uRes.json();
    const cars  = await cRes.json();
    carsCache   = cars;
    const clients  = users.filter(u => (u.role || u.Role) === 1);
    const managers = users.filter(u => (u.role || u.Role) === 3);
    const first    = cars[0] || null;
    openModal('Новая продажа', `
        <div class="field-group">
            <label>Автомобиль <span style="color:#e74c3c">*</span></label>
            <select id="fSaleCarId" onchange="onSaleCarChange(this)">
                ${cars.length
                    ? cars.map(c => `<option value="${c.id}">${c.brand || c.Brand} — ${fmt(c.price || c.Price || 0)} ₽ (${c.state || c.State})</option>`).join('')
                    : '<option value="">Нет автомобилей</option>'}
            </select>
        </div>
        <div class="field-group">
            <label>Марка автомобиля</label>
            <input id="fSaleBrand" value="${first ? (first.brand || first.Brand || '') : ''}"
                   placeholder="Заполняется автоматически" readonly style="opacity:0.7;cursor:default" />
        </div>
        <div class="field-group">
            <label>Цена (₽)</label>
            <input type="number" id="fSalePrice" value="${first ? (first.price || first.Price || '') : ''}"
                   placeholder="Заполняется автоматически" readonly style="opacity:0.7;cursor:default" />
        </div>
        <div class="field-group">
            <label>Дата <span style="color:#e74c3c">*</span></label>
            <input type="date" id="fSaleDate" value="${new Date().toISOString().slice(0,10)}" />
        </div>
        <div class="field-group">
            <label>Клиент <span style="color:#e74c3c">*</span></label>
            <select id="fSaleClientId">
                ${clients.length
                    ? clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')
                    : '<option value="">Нет клиентов</option>'}
            </select>
        </div>
        <div class="field-group">
            <label>Менеджер <span style="color:#e74c3c">*</span></label>
            <select id="fSaleManagerId">
                ${managers.length
                    ? managers.map(m => `<option value="${m.id}" ${m.id === currentUser?.id ? 'selected' : ''}>${m.name}</option>`).join('')
                    : '<option value="">Нет менеджеров</option>'}
            </select>
        </div>
    `);
}
async function saveSale() {
    const carId     = document.getElementById('fSaleCarId')?.value;
    const clientId  = document.getElementById('fSaleClientId')?.value;
    const managerId = document.getElementById('fSaleManagerId')?.value;
    const date      = document.getElementById('fSaleDate')?.value;
    const price     = document.getElementById('fSalePrice')?.value;
    const brand     = document.getElementById('fSaleBrand')?.value?.trim();
    const errors = [];
    if (!carId)     { highlightField('fSaleCarId');     errors.push('Выберите автомобиль'); }
    if (!date)      { highlightField('fSaleDate');      errors.push('Укажите дату продажи'); }
    if (!clientId)  { highlightField('fSaleClientId');  errors.push('Выберите клиента'); }
    if (!managerId) { highlightField('fSaleManagerId'); errors.push('Выберите менеджера'); }
    if (!price || Number(price) <= 0) errors.push('Цена не определена — выберите автомобиль из списка');
    if (errors.length) throw new Error(errors.join('\n'));
    const res = await apiFetch('/sales', {
        method: 'POST',
        body: JSON.stringify({
            brand,
            date,
            price:     parseInt(price),
            carId:     parseInt(carId),
            clientId:  parseInt(clientId),
            managerId: parseInt(managerId)
        })
    });
    if (!res.ok) throw new Error(await parseApiError(res));
}

// ЗАЯВКИ
async function loadApplications() {
    document.getElementById('applicationsBody').innerHTML = '<tr><td colspan="4"><div class="loader"></div></td></tr>';

    const [aRes, cRes] = await Promise.all([apiFetch('/applications'), apiFetch('/cars')]);
    const apps = await aRes.json();
    carsCache  = await cRes.json();

    if (!apps.length) {
        document.getElementById('applicationsBody').innerHTML = '<tr><td colspan="4"><div class="empty">Нет заявок</div></td></tr>';
        return;
    }

    document.getElementById('applicationsBody').innerHTML = apps.map(a => {
        const car = carsCache.find(c => c.id === (a.carId || a.CarId));
        return `<tr>
            <td>${a.id}</td>
            <td>${fmtDate(a.dateTime || a.DateTime)}</td>
            <td style="color:var(--text)">${car ? (car.brand || car.Brand) : '—'}</td>
            <td>
                <button class="btn-sm danger" onclick="deleteApplication(${a.id})">Удал.</button>
            </td>
        </tr>`;
    }).join('');
}
async function deleteApplication(id) {
    if (!confirm('Удалить заявку?')) return;
    await apiFetch(`/applications/${id}`, { method: 'DELETE' });
    showToast('Заявка удалена');
    loadApplications();
}
async function openApplicationModal() {
    modalEntity = 'application';
    editId = null;
    const cRes = await apiFetch('/cars');
    const cars = await cRes.json();
    openModal('Новая заявка', `
        <div class="field-group">
            <label>Дата и время <span style="color:#e74c3c">*</span></label>
            <input type="datetime-local" id="fAppDate" value="${new Date().toISOString().slice(0,16)}" />
        </div>
        <div class="field-group">
            <label>Автомобиль <span style="color:#e74c3c">*</span></label>
            <select id="fAppCarId">
                ${cars.length
                    ? cars.map(c => `<option value="${c.id}">${c.brand || c.Brand} (${c.state || c.State})</option>`).join('')
                    : '<option value="">Нет автомобилей</option>'}
            </select>
        </div>
    `);
}
async function openApplicationModalForCar(carId) {
    modalEntity = 'application';
    editId = null;
    const cRes = await apiFetch('/cars');
    const cars = await cRes.json();
    carsCache = cars;
    openModal('Заявка на автомобиль', `
        <div class="field-group">
            <label>Дата и время <span style="color:#e74c3c">*</span></label>
            <input type="datetime-local" id="fAppDate" value="${new Date().toISOString().slice(0,16)}" />
        </div>
        <div class="field-group">
            <label>Автомобиль <span style="color:#e74c3c">*</span></label>
            <select id="fAppCarId">
                ${cars.length
                    ? cars.map(c => `<option value="${c.id}" ${c.id === carId ? 'selected' : ''}>${c.brand || c.Brand} — ${fmt(c.price || c.Price || 0)} ₽ (${c.state || c.State})</option>`).join('')
                    : '<option value="">Нет автомобилей</option>'}
            </select>
        </div>
    `);
}
async function saveApplication() {
    const dateTime = document.getElementById('fAppDate')?.value;
    const carId    = document.getElementById('fAppCarId')?.value;
    const errors = [];
    if (!dateTime) { highlightField('fAppDate');   errors.push('Укажите дату и время'); }
    if (!carId)    { highlightField('fAppCarId');  errors.push('Выберите автомобиль'); }
    if (errors.length) throw new Error(errors.join('\n'));
    const res = await apiFetch('/applications', {
        method: 'POST',
        body: JSON.stringify({ dateTime, carId: parseInt(carId) })
    });
    if (!res.ok) throw new Error(await parseApiError(res));
}

// ПЛАТЕЖИ
async function loadPayments() {
    document.getElementById('paymentsBody').innerHTML = '<tr><td colspan="6"><div class="loader"></div></td></tr>';
    const [pRes, sRes, uRes] = await Promise.all([
        apiFetch('/payments'), apiFetch('/sales'), apiFetch('/users')
    ]);
    const payments = await pRes.json();
    salesCache     = await sRes.json();
    usersCache     = await uRes.json();
    if (!payments.length) {
        document.getElementById('paymentsBody').innerHTML = '<tr><td colspan="6"><div class="empty">Нет платежей</div></td></tr>';
        return;
    }
    document.getElementById('paymentsBody').innerHTML = payments.map(p => {
        const mgr = usersCache.find(u => u.id === (p.managerId || p.ManagerId));
        return `<tr>
            <td>${p.id}</td>
            <td style="color:var(--accent2);font-weight:600">${fmt(p.sum || p.Sum || 0)} ₽</td>
            <td>${fmtDate(p.dateTime || p.DateTime)}</td>
            <td>#${p.saleId || p.SaleId}</td>
            <td>${mgr?.name || '—'}</td>
            <td>
                ${canPayments() ? `<button class="btn-sm danger" onclick="deletePayment(${p.id})">Удал.</button>` : '—'}
            </td>
        </tr>`;
    }).join('');
}
async function deletePayment(id) {
    if (!confirm('Удалить платёж?')) return;
    await apiFetch(`/payments/${id}`, { method: 'DELETE' });
    showToast('Платёж удалён');
    loadPayments();
}
function onPaySaleChange(selectEl) {
    const saleId = parseInt(selectEl.value);
    const sale   = salesCache.find(s => s.id === saleId);
    if (!sale) return;
    const sumField = document.getElementById('fPaySum');
    if (sumField) sumField.value = sale.price || sale.Price || '';
}
async function openPaymentModal() {
    modalEntity = 'payment';
    editId = null;
    const [sRes, uRes] = await Promise.all([apiFetch('/sales'), apiFetch('/users')]);
    const sales    = await sRes.json();
    const users    = await uRes.json();
    salesCache     = sales;
    const managers = users.filter(u => (u.role || u.Role) === 3);
    const first    = sales[0] || null;
    openModal('Принять оплату', `
        <div class="field-group">
            <label>Продажа <span style="color:#e74c3c">*</span></label>
            <select id="fPaySaleId" onchange="onPaySaleChange(this)">
                ${sales.length
                    ? sales.map(s => `<option value="${s.id}">#${s.id} — ${s.brand || s.Brand} — ${fmt(s.price || s.Price || 0)} ₽ (${fmtDate(s.date || s.Date)})</option>`).join('')
                    : '<option value="">Нет продаж</option>'}
            </select>
        </div>
        <div class="field-group">
            <label>Менеджер <span style="color:#e74c3c">*</span></label>
            <select id="fPayManagerId">
                ${managers.length
                    ? managers.map(m => `<option value="${m.id}" ${m.id === currentUser?.id ? 'selected' : ''}>${m.name}</option>`).join('')
                    : '<option value="">Нет менеджеров</option>'}
            </select>
        </div>
        <div class="field-group">
            <label>Сумма (₽)</label>
            <input type="number" id="fPaySum"
                   value="${first ? (first.price || first.Price || '') : ''}"
                   placeholder="Заполняется автоматически" readonly style="opacity:0.7;cursor:default" />
        </div>
        <div class="field-group">
            <label>Дата <span style="color:#e74c3c">*</span></label>
            <input type="datetime-local" id="fPayDate" value="${new Date().toISOString().slice(0,16)}" />
        </div>
        <div class="field-group">
            <label>Примечание</label>
            <input id="fPayNote" placeholder="Комментарий..." />
        </div>
    `);
}
async function savePayment() {
    const saleId    = document.getElementById('fPaySaleId')?.value;
    const managerId = document.getElementById('fPayManagerId')?.value;
    const sum       = document.getElementById('fPaySum')?.value;
    const dateTime  = document.getElementById('fPayDate')?.value;
    const errors = [];
    if (!saleId)    { highlightField('fPaySaleId');    errors.push('Выберите продажу'); }
    if (!managerId) { highlightField('fPayManagerId'); errors.push('Выберите менеджера'); }
    if (!sum || Number(sum) <= 0) errors.push('Сумма не определена — выберите продажу из списка');
    if (!dateTime)  { highlightField('fPayDate');      errors.push('Укажите дату платежа'); }
    if (errors.length) throw new Error(errors.join('\n'));
    const res = await apiFetch('/payments', {
        method: 'POST',
        body: JSON.stringify({
            saleId:    parseInt(saleId),
            managerId: parseInt(managerId),
            sum:       parseInt(sum),
            dateTime,
            note: document.getElementById('fPayNote').value
        })
    });
    if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Ошибка сохранения платежа');
    }
}

// ОТЧЁТЫ
async function loadReports() {
    document.getElementById('reportsBody').innerHTML = '<tr><td colspan="10"><div class="loader"></div></td></tr>';
    const res = await apiFetch('/reports');
    reportsCache = await res.json();
    if (!reportsCache.length) {
        document.getElementById('reportsBody').innerHTML = '<tr><td colspan="10"><div class="empty">Нет отчётов</div></td></tr>';
        return;
    }
    document.getElementById('reportsBody').innerHTML = reportsCache.map(r => `
        <tr>
            <td>${r.id}</td>
            <td>${fmtDate(r.createdAt || r.CreatedAt)}</td>
            <td>${PERIOD_LABELS[r.period || r.Period] || r.period}</td>
            <td>${fmtDate(r.dateFrom || r.DateFrom)}</td>
            <td>${fmtDate(r.dateTo   || r.DateTo)}</td>
            <td>${r.totalSales    || r.TotalSales    || 0}</td>
            <td style="color:var(--accent2)">${fmt(r.totalRevenue  || r.TotalRevenue  || 0)} ₽</td>
            <td>${fmt(r.totalPayments || r.TotalPayments || 0)} ₽</td>
            <td>
                <button class="btn-sm" onclick="exportReport(${r.id},'xlsx')" title="Excel">XLS</button>
                <button class="btn-sm" onclick="exportReport(${r.id},'csv')"  title="CSV">CSV</button>
                <button class="btn-sm" onclick="exportReport(${r.id},'txt')"  title="Текст">TXT</button>
            </td>
            <td>
                <button class="btn-sm danger" onclick="deleteReport(${r.id})">Удал.</button>
            </td>
        </tr>
    `).join('');
}
async function deleteReport(id) {
    if (!confirm('Удалить отчёт?')) return;
    await apiFetch(`/reports/${id}`, { method: 'DELETE' });
    showToast('Отчёт удалён');
    loadReports();
}
async function openReportModal() {
    modalEntity = 'report';
    editId = null;
    const now          = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
    const today        = now.toISOString().slice(0,10);
    openModal('Сформировать отчёт', `
        <div class="field-group">
            <label>Период <span style="color:#e74c3c">*</span></label>
            <select id="fRepPeriod" onchange="autoFillDates(this.value)">
                <option value="2">Месячный</option>
                <option value="3">Квартальный</option>
                <option value="4">Годовой</option>
                <option value="5">Произвольный</option>
            </select>
        </div>
        <div class="field-group">
            <label>Дата с <span style="color:#e74c3c">*</span></label>
            <input type="date" id="fRepFrom" value="${firstOfMonth}" />
        </div>
        <div class="field-group">
            <label>Дата по <span style="color:#e74c3c">*</span></label>
            <input type="date" id="fRepTo" value="${today}" />
        </div>
        <div class="field-group">
            <label>Примечание</label>
            <input id="fRepNotes" placeholder="Комментарий к отчёту..." />
        </div>
    `);
}
function autoFillDates(period) {
    const now = new Date();
    const to  = now.toISOString().slice(0,10);
    let from;
    if (period == 2) {
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
    } else if (period == 3) {
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        from = new Date(now.getFullYear(), quarterStart, 1).toISOString().slice(0,10);
    } else if (period == 4) {
        from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0,10);
    } else {
        return;
    }
    document.getElementById('fRepFrom').value = from;
    document.getElementById('fRepTo').value   = to;
}
async function saveReport() {
    const period   = document.getElementById('fRepPeriod')?.value;
    const dateFrom = document.getElementById('fRepFrom')?.value;
    const dateTo   = document.getElementById('fRepTo')?.value;
    const errors = [];
    if (!period)   { highlightField('fRepPeriod'); errors.push('Выберите период'); }
    if (!dateFrom) { highlightField('fRepFrom');   errors.push('Укажите начальную дату'); }
    if (!dateTo)   { highlightField('fRepTo');     errors.push('Укажите конечную дату'); }
    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
        highlightField('fRepFrom');
        highlightField('fRepTo');
        errors.push('Дата начала не может быть позже даты окончания');
    }
    if (errors.length) throw new Error(errors.join('\n'));
    const from = new Date(dateFrom);
    const to   = new Date(dateTo);
    to.setHours(23, 59, 59, 999); 
    let totalSales = 0, totalRevenue = 0, totalPayments = 0;
    try {
        const [sRes, pRes] = await Promise.all([apiFetch('/sales'), apiFetch('/payments')]);
        const sales    = await sRes.json();
        const payments = await pRes.json();
        const salesInPeriod = sales.filter(s => {
            const d = new Date(s.date || s.Date);
            return d >= from && d <= to;
        });
        totalSales   = salesInPeriod.length;
        totalRevenue = salesInPeriod.reduce((sum, s) => sum + (s.price || s.Price || 0), 0);
        const paymentsInPeriod = payments.filter(p => {
            const d = new Date(p.dateTime || p.DateTime);
            return d >= from && d <= to;
        });
        totalPayments = paymentsInPeriod.reduce((sum, p) => sum + (p.sum || p.Sum || 0), 0);
    } catch (_) {
    }
    const res = await apiFetch('/reports', {
        method: 'POST',
        body: JSON.stringify({
            createdAt:    new Date().toISOString(),
            period:       parseInt(period),
            dateFrom,
            dateTo,
            accountantId: currentUser.id,
            totalSales,
            totalRevenue,
            totalPayments,
            notes: document.getElementById('fRepNotes').value
        })
    });
    if (!res.ok) throw new Error(await parseApiError(res));
}

// ЭКСПОРТ ОТЧЁТОВ
function exportReport(id, format) {
    const r = reportsCache.find(x => x.id === id);
    if (!r) { showToast('Отчёт не найден', 'error'); return; }
    const period   = PERIOD_LABELS[r.period || r.Period] || '—';
    const created  = fmtDate(r.createdAt  || r.CreatedAt);
    const dateFrom = fmtDate(r.dateFrom   || r.DateFrom);
    const dateTo   = fmtDate(r.dateTo     || r.DateTo);
    const sales    = r.totalSales    || r.TotalSales    || 0;
    const revenue  = r.totalRevenue  || r.TotalRevenue  || 0;
    const payments = r.totalPayments || r.TotalPayments || 0;
    const notes    = r.notes         || r.Notes         || '';
    const filename = `report_${id}_${dateFrom.replace(/\./g,'-')}_${dateTo.replace(/\./g,'-')}`;
    if (format === 'csv') {
        
        // CSV 
        const rows = [
            ['Поле', 'Значение'],
            ['ID отчёта', id], ['Создан', created], ['Период', period],
            ['Дата с', dateFrom], ['Дата по', dateTo],
            ['Кол-во продаж', sales], ['Выручка (руб)', revenue],
            ['Оплачено (руб)', payments], ['Задолженность (руб)', revenue - payments],
            ['Примечание', notes]
        ];
        const csv = rows.map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(';')).join('\r\n');
        downloadBlob(csv, filename + '.csv', 'text/csv;charset=utf-8;');
    } else if (format === 'txt') {
        
        // TXT 
        const line = '─'.repeat(44);
        const txt = [
            '  АВТОЛАЙН — ФИНАНСОВЫЙ ОТЧЁТ', line,
            `  ID отчёта      : ${id}`,
            `  Создан         : ${created}`,
            `  Период         : ${period}`,
            `  Дата с         : ${dateFrom}`,
            `  Дата по        : ${dateTo}`, line,
            `  Кол-во продаж  : ${sales}`,
            `  Выручка        : ${fmt(revenue)} руб.`,
            `  Оплачено       : ${fmt(payments)} руб.`,
            `  Задолженность  : ${fmt(revenue - payments)} руб.`, line,
            notes ? `  Примечание: ${notes}` : '',
            '', `  Сформировано: ${new Date().toLocaleString('ru-RU')}`
        ].join('\r\n');
        downloadBlob(txt, filename + '.txt', 'text/plain;charset=utf-8;');
    } else if (format === 'xlsx') {
       
        // XLS 
        const cell = (v, type = 'String') =>
            `<Cell><Data ss:Type="${type}">${String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</Data></Cell>`;

        const rows = [
            ['ID отчёта', id, 'Number'], ['Создан', created, 'String'],
            ['Период', period, 'String'], ['Дата с', dateFrom, 'String'],
            ['Дата по', dateTo, 'String'], ['Кол-во продаж', sales, 'Number'],
            ['Выручка (руб)', revenue, 'Number'], ['Оплачено (руб)', payments, 'Number'],
            ['Задолженность (руб)', revenue - payments, 'Number'], ['Примечание', notes, 'String']
        ].map(([k, v, t]) => `<Row>${cell(k)}${cell(v, t)}</Row>`).join('\n');
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles><Style ss:ID="h"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#C0392B" ss:Pattern="Solid"/></Style></Styles>
 <Worksheet ss:Name="Отчёт"><Table>
  <Column ss:Width="180"/><Column ss:Width="200"/>
  <Row ss:StyleID="h">${cell('АВТОЛАЙН — Отчёт #' + id)}${cell('')}</Row>
  <Row>${cell('Поле')}${cell('Значение')}</Row>
  ${rows}
 </Table></Worksheet>
</Workbook>`;
        downloadBlob(xml, filename + '.xls', 'application/vnd.ms-excel;charset=utf-8;');
    }
    showToast(`Отчёт #${id} экспортирован в ${format.toUpperCase()}`);
}
function downloadBlob(content, filename, mimeType) {
    const bom  = mimeType.includes('utf-8') ? '\uFEFF' : ''; 
    const blob = new Blob([bom + content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ПОЛЬЗОВАТЕЛИ
function canEditUser(targetRole) {
    if (isDirector()) return false;                        
    if (isAdmin())    return targetRole !== 2 && targetRole !== 5; 
    return false;
}
function canDeleteUser(targetRole) {
    if (isDirector()) return targetRole === 2;            
    if (isAdmin())    return targetRole !== 2 && targetRole !== 5;
    return false;
}
async function loadUsers() {
    document.getElementById('usersBody').innerHTML = '<tr><td colspan="7"><div class="loader"></div></td></tr>';
    const res = await apiFetch('/users');
    usersCache = await res.json();
    if (!usersCache.length) {
        document.getElementById('usersBody').innerHTML = '<tr><td colspan="7"><div class="empty">Нет пользователей</div></td></tr>';
        return;
    }
    const roleColors = {
        1: 'rgba(100,100,100,0.3)', 2: 'rgba(192,57,43,0.25)',
        3: 'rgba(41,128,185,0.25)', 4: 'rgba(39,174,96,0.25)',
        5: 'rgba(142,68,173,0.25)'
    };
    const roleTextColors = {
        1: '#aaa', 2: 'var(--accent2)', 3: '#5dade2', 4: '#58d68d', 5: '#c39bd3'
    };
    document.getElementById('usersBody').innerHTML = usersCache.map(u => {
        const role        = u.role || u.Role;
        const bg          = roleColors[role]      || 'rgba(192,57,43,0.15)';
        const clr         = roleTextColors[role]  || 'var(--accent2)';
        const isProtected = role === 2 || role === 5;
        const lockIcon    = `<span title="Защищённая роль" style="color:var(--muted);font-size:16px;cursor:default">🔒</span>`;
        const editBtn   = canEditUser(role)   ? `<button class="btn-sm" onclick="openUserModal(${u.id})">Изм.</button>` : '';
        const deleteBtn = canDeleteUser(role) ? `<button class="btn-sm danger" onclick="deleteUser(${u.id})">Удал.</button>` : '';
        const actions   = (editBtn || deleteBtn) ? editBtn + deleteBtn : (isProtected ? lockIcon : '—');
        return `<tr>
            <td>${u.id}</td>
            <td style="color:var(--text)">${u.name}</td>
            <td>${u.login}</td>
            <td>${u.phone || '—'}</td>
            <td>${u.email || '—'}</td>
            <td>
                <span style="background:${bg};color:${clr};font-size:11px;padding:3px 10px;border-radius:4px;font-family:'Barlow Condensed',sans-serif;letter-spacing:1.5px;font-weight:700">
                    ${isProtected ? '🔐 ' : ''}${roleLabel(role)}
                </span>
            </td>
            <td>${actions}</td>
        </tr>`;
    }).join('');
}
async function deleteUser(id) {
    const u    = usersCache.find(x => x.id === id);
    const role = u?.role || u?.Role;
    if (!canDeleteUser(role)) {
        showToast('Нет прав для удаления этого пользователя', 'error');
        return;
    }
    const label = u?.name || `пользователя #${id}`;
    if (!confirm(`Удалить ${label}?`)) return;
    const res = await apiFetch(`/users/${id}`, { method: 'DELETE' });
    if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast(d.message || 'Ошибка удаления', 'error');
    } else {
        showToast(`${label} удалён`);
        loadUsers();
    }
}
function openUserModal(id = null) {
    const user = id ? usersCache.find(u => u.id === id) : null;
    const role = user?.role || user?.Role;
    if (id && !canEditUser(role)) {
        showToast('Нет прав для редактирования этого пользователя', 'error');
        return;
    }
    modalEntity = 'user';
    editId = id;
    const roleOptions = [
        { v: 1, l: 'Пользователь' },
        { v: 2, l: 'Администратор', hideFor: [5] },
        { v: 3, l: 'Менеджер' },
        { v: 4, l: 'Бухгалтер' },
        { v: 5, l: 'Руководитель', hideFor: [2, 5] }
    ]
    .filter(o => !o.hideFor?.includes(currentUser.role))
    .map(o => `<option value="${o.v}" ${role === o.v ? 'selected' : ''}>${o.l}</option>`)
    .join('');

    openModal(id ? 'Редактировать пользователя' : 'Добавить пользователя', `
        <div class="field-group">
            <label>Имя <span style="color:#e74c3c">*</span></label>
            <input id="fUserName" value="${user?.name || ''}" placeholder="Иван Иванов" />
        </div>
        <div class="field-group">
            <label>Логин <span style="color:#e74c3c">*</span></label>
            <input id="fUserLogin" value="${user?.login || ''}" placeholder="iivanov" />
        </div>
        <div class="field-group">
            <label>Пароль ${id ? '' : '<span style="color:#e74c3c">*</span>'}</label>
            <input type="password" id="fUserPassword"
                   placeholder="${id ? 'Оставьте пустым — без изменений' : 'Придумайте пароль'}" />
        </div>
        <div class="field-group">
            <label>Email</label>
            <input id="fUserEmail" value="${user?.email || ''}" placeholder="mail@example.com" />
        </div>
        <div class="field-group">
            <label>Телефон</label>
            <input id="fUserPhone" value="${user?.phone || ''}" placeholder="+7 (999) 000-00-00" />
        </div>
        <div class="field-group">
            <label>Роль</label>
            <select id="fUserRole">${roleOptions}</select>
        </div>
    `);
    setTimeout(() => {
        const phoneField = document.getElementById('fUserPhone');
        if (phoneField) applyPhoneMask(phoneField);
    }, 50);
}
async function saveUser() {
    const name  = document.getElementById('fUserName')?.value?.trim();
    const login = document.getElementById('fUserLogin')?.value?.trim();
    const pwd   = document.getElementById('fUserPassword')?.value;
    const email = document.getElementById('fUserEmail')?.value?.trim();
    const phone = document.getElementById('fUserPhone')?.value?.trim();
    const errors = [];
    if (!name)  { highlightField('fUserName');  errors.push('Введите имя пользователя'); }
    if (!login) { highlightField('fUserLogin'); errors.push('Введите логин'); }
    if (!editId && !pwd) { highlightField('fUserPassword'); errors.push('Придумайте пароль'); }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        highlightField('fUserEmail');
        errors.push('Введите корректный email (mail@example.com)');
    }
    if (errors.length) throw new Error(errors.join('\n'));
    let hashedPwd = pwd ? await hashPassword(pwd) : null;
    const body = {
        name, login, email, phone,
        role: parseInt(document.getElementById('fUserRole').value)
    };
    if (hashedPwd) {
        body.password = hashedPwd;
    } else if (!editId) {
        throw new Error('Введите пароль');
    } else {
        const existing = usersCache.find(u => u.id === editId);
        body.password = existing?.password || '';
    }
    const res = await apiFetch(editId ? `/users/${editId}` : '/users', {
        method: editId ? 'PUT' : 'POST',
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await parseApiError(res));
}

// МОДАЛЬНОЕ ОКНО 
function openModal(title, fieldsHtml) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalFields').innerHTML  = fieldsHtml;
    document.getElementById('modalError')?.remove();
    document.getElementById('modalOverlay').classList.add('open');
}
function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    document.getElementById('modalError')?.remove();
}
async function saveModal() {
    clearModalError();
    try {
        if      (modalEntity === 'car')         await saveCar();
        else if (modalEntity === 'sale')         await saveSale();
        else if (modalEntity === 'application')  await saveApplication();
        else if (modalEntity === 'payment')      await savePayment();
        else if (modalEntity === 'report')       await saveReport();
        else if (modalEntity === 'user')         await saveUser();
        closeModal();
        showToast('Сохранено успешно');
        const active = document.querySelector('.section.active')?.id?.replace('section-', '');
        if (active) showSection(active);
    } catch (e) {
        showModalError(e.message);
    }
}
document.getElementById('modalCancel').addEventListener('click', closeModal);
document.getElementById('modalSave').addEventListener('click', saveModal);
document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
});
document.getElementById('addCarBtn').addEventListener('click',         () => openCarModal());
document.getElementById('addSaleBtn').addEventListener('click',        () => openSaleModal());
document.getElementById('addApplicationBtn').addEventListener('click', () => openApplicationModal());
document.getElementById('addPaymentBtn').addEventListener('click',     () => openPaymentModal());
document.getElementById('addReportBtn').addEventListener('click',      () => openReportModal());
document.getElementById('addUserBtn').addEventListener('click',        () => openUserModal());

// ВСПЛЫВАЮЩЕЕ УВЕДОМЛЕНИЕ
let toastTimer;
function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className   = 'show' + (type === 'error' ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = ''; }, 3500);
}