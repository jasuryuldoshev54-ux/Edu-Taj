const ROLES = [
  { name: "Ученик", icon: "🎓", instant: true },
  { name: "Родитель", icon: "👪", instant: true },
  { name: "Учитель", icon: "📖", instant: false },
  { name: "Директор", icon: "💼", instant: false },
  { name: "Завуч", icon: "📋", instant: false },
  { name: "Библиотекарь", icon: "📚", instant: false },
  { name: "Классный руководитель", icon: "🧑‍🏫", instant: false },
  { name: "Заместитель директора", icon: "🏛️", instant: false },
  { name: "Секретарь", icon: "🗂️", instant: false },
  { name: "Технический персонал", icon: "🔧", instant: false }
];

let appData = null;
let currentUser = null;
let selectedRole = "Ученик";
let currentQuarter = 1;
let selectedDiscCategory = "Опоздание";

// Инициализация
document.addEventListener("DOMContentLoaded", async () => {
  renderRolesGrid();
  await loadData();

  const savedUser = localStorage.getItem("edutaj_user");
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    enterApp();
  }
});

async function loadData() {
  const cached = localStorage.getItem("edutaj_data");
  if (cached) {
    appData = JSON.parse(cached);
    return;
  }
  try {
    const res = await fetch("data.json");
    appData = await res.json();
    saveData();
  } catch (e) {
    console.error("Ошибка загрузки data.json:", e);
  }
}

function saveData() {
  localStorage.setItem("edutaj_data", JSON.stringify(appData));
}

// Сетка 10 ролей при регистрации
function renderRolesGrid() {
  const grid = document.getElementById("roles-grid");
  grid.innerHTML = ROLES.map(r => `
    <div class="role-card ${r.name === selectedRole ? "active" : ""}" onclick="selectRole('${r.name}', ${r.instant})">
      <span>${r.icon}</span>
      ${r.name}
    </div>
  `).join("");
}

function selectRole(roleName, isInstant) {
  selectedRole = roleName;
  renderRolesGrid();
  const hint = document.getElementById("role-hint");
  hint.textContent = isInstant
    ? `Роль «${roleName}»: аккаунт создаётся сразу, доступ к оценкам откроется после проверки связи со школьной базой.`
    : `Роль «${roleName}»: после регистрации статус будет «Ожидает одобрения» директором или администратором.`;
}

function toggleAuthMode(mode) {
  document.getElementById("login-box").style.display = mode === "login" ? "block" : "none";
  document.getElementById("register-box").style.display = mode === "register" ? "block" : "none";
}

function handleLogin() {
  const phone = document.getElementById("login-phone").value.trim();
  const pass = document.getElementById("login-pass").value.trim();

  const user = appData.users.find(u => u.phone === phone && u.password === pass);
  if (!user) {
    alert("Неверный номер телефона или пароль. Используйте кнопки быстрого входа ниже.");
    return;
  }
  if (user.status === "pending") {
    alert("Ваш аккаунт ожидает одобрения администрацией школы.");
    return;
  }
  currentUser = user;
  localStorage.setItem("edutaj_user", JSON.stringify(user));
  enterApp();
}

function quickLogin(role) {
  const user = appData.users.find(u => u.role === role);
  if (user) {
    currentUser = user;
    localStorage.setItem("edutaj_user", JSON.stringify(user));
    enterApp();
  }
}

function handleRegister() {
  const fio = document.getElementById("reg-fio").value.trim();
  const phone = document.getElementById("reg-phone").value.trim();
  const pass = document.getElementById("reg-pass").value.trim();

  if (!fio || !phone || !pass) {
    alert("Пожалуйста, заполните все поля.");
    return;
  }

  const roleObj = ROLES.find(r => r.name === selectedRole);
  const status = roleObj && roleObj.instant ? "approved" : "pending";

  const newUser = {
    id: Date.now(),
    fio,
    phone,
    password: pass,
    role: selectedRole,
    class: "8-А",
    birthDate: "01.01.2010",
    status
  };

  appData.users.push(newUser);
  saveData();

  if (status === "approved") {
    currentUser = newUser;
    localStorage.setItem("edutaj_user", JSON.stringify(newUser));
    enterApp();
  } else {
    alert("Заявка отправлена! Статус: Ожидает одобрения администратором.");
    toggleAuthMode("login");
  }
}

function logout() {
  localStorage.removeItem("edutaj_user");
  currentUser = null;
  toggleDrawer(false);
  document.getElementById("screen-main").classList.remove("active");
  document.getElementById("screen-auth").classList.add("active");
}

function enterApp() {
  document.getElementById("screen-auth").classList.remove("active");
  document.getElementById("screen-main").classList.add("active");

  document.getElementById("home-user-name").textContent = currentUser.fio;
  document.getElementById("home-user-role").textContent =
    currentUser.role === "Ученик" ? `${currentUser.role} • ${currentUser.class || "8-А"} класс` : currentUser.role;

  document.getElementById("prof-name").textContent = currentUser.fio;
  document.getElementById("prof-role").textContent =
    currentUser.role === "Ученик" ? `${currentUser.role} • ${currentUser.class || "8-А"} класс` : currentUser.role;
  document.getElementById("prof-phone").textContent = currentUser.phone;
  document.getElementById("prof-birth").textContent = currentUser.birthDate || "15.05.2010";

  // Показать панель выставления оценок для Учителя / Директора / Завуча
  const canEditGrades = ["Учитель", "Директор", "Завуч", "Классный руководитель"].includes(currentUser.role);
  document.getElementById("teacher-grade-panel").style.display = canEditGrades ? "block" : "none";

  renderGrades();
  renderAttendance();
  renderDiscipline();
  renderSchedule("Пн");
  renderHomework();
  renderNotifications();
  renderLibrary();
  renderUsers();
}

function toggleDrawer(open) {
  document.getElementById("drawer").classList.toggle("open", open);
  document.getElementById("drawer-overlay").classList.toggle("open", open);
}

function navigate(pageId, subTab) {
  toggleDrawer(false);
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(`page-${pageId}`).classList.add("active");

  document.querySelectorAll(".bnav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === pageId);
  });

  if (pageId === "journal" && subTab) {
    switchJournalTab(subTab);
  }
}

// ЖУРНАЛ: ОЦЕНКИ И ПОСЕЩАЕМОСТЬ
function switchJournalTab(tab) {
  document.getElementById("tab-btn-grades").classList.toggle("active", tab === "grades");
  document.getElementById("tab-btn-att").classList.toggle("active", tab === "attendance");
  document.getElementById("journal-grades-view").style.display = tab === "grades" ? "block" : "none";
  document.getElementById("journal-att-view").style.display = tab === "attendance" ? "block" : "none";
}

function selectQuarter(q, btn) {
  currentQuarter = q;
  document.querySelectorAll(".q-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderGrades();
}

function renderGrades() {
  const studentGrades = (appData.grades["1"] && appData.grades["1"][String(currentQuarter)]) || {};
  const listEl = document.getElementById("grades-list");

  const subjects = Object.keys(studentGrades);
  if (subjects.length === 0) {
    listEl.innerHTML = `<p class="muted" style="padding:14px 0;">В ${currentQuarter} четверти оценок пока нет.</p>`;
    document.getElementById("avg-score").textContent = "—";
    return;
  }

  let sum = 0, count = 0;
  listEl.innerHTML = subjects.map(subj => {
    const marks = studentGrades[subj];
    marks.forEach(m => { sum += m; count++; });
    return `
      <div class="grade-row">
        <span>${subj}</span>
        <div class="grade-circles">
          ${marks.map(m => `<span class="g-circle ${m >= 10 ? "high" : ""}">${m}</span>`).join("")}
        </div>
      </div>
    `;
  }).join("");

  document.getElementById("avg-score").textContent = count ? (sum / count).toFixed(1) : "—";
}

function addGrade() {
  const subj = document.getElementById("grade-subject-select").value;
  const val = Number(document.getElementById("grade-val-select").value);
  const qKey = String(currentQuarter);

  if (!appData.grades["1"][qKey]) appData.grades["1"][qKey] = {};
  if (!appData.grades["1"][qKey][subj]) appData.grades["1"][qKey][subj] = [];
  appData.grades["1"][qKey][subj].push(val);

  saveData();
  renderGrades();
}

function renderAttendance() {
  const listEl = document.getElementById("attendance-list");
  let present = 21, absent = 1;

  listEl.innerHTML = appData.attendance.map((item, idx) => {
    if (item.status === "Присутствует") present++;
    if (item.status === "Отсутствует") absent++;

    const pillClass = item.status === "Присутствует" ? "pill-green"
      : item.status === "Отсутствует" ? "pill-red" : "pill-orange";

    return `
      <div class="list-item">
        <span>${item.fio}</span>
        <span class="${pillClass}" onclick="cycleAttendance(${idx})">${item.status}</span>
      </div>
    `;
  }).join("");

  document.getElementById("att-present-count").textContent = present;
  document.getElementById("att-absent-count").textContent = absent;
}

function cycleAttendance(idx) {
  const states = ["Присутствует", "Отсутствует", "Опоздала", "Уважительная"];
  const cur = appData.attendance[idx].status;
  const next = states[(states.indexOf(cur) + 1) % states.length];
  appData.attendance[idx].status = next;
  saveData();
  renderAttendance();
}

// ПОВЕДЕНИЕ И ДИСЦИПЛИНА
function selectDiscCat(btn) {
  document.querySelectorAll("#disc-cats .chip").forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
  selectedDiscCategory = btn.textContent;
}

function addDiscipline() {
  const note = document.getElementById("disc-note").value.trim() || selectedDiscCategory;
  appData.discipline.unshift({
    id: Date.now(),
    student: "Алиев Фарид",
    class: "8-А",
    category: selectedDiscCategory,
    date: "Сегодня",
    note
  });
  document.getElementById("disc-note").value = "";
  saveData();
  renderDiscipline();
}

function renderDiscipline() {
  document.getElementById("disc-count").textContent = `${appData.discipline.length} замечания`;
  document.getElementById("discipline-list").innerHTML = appData.discipline.map(d => `
    <div class="list-item">
      <div>
        <strong>${d.student}</strong>
        <div class="muted">${d.date} • ${d.note}</div>
      </div>
      <span class="pill-orange">${d.category}</span>
    </div>
  `).join("");
}

// РАСПИСАНИЕ, ДЗ, УВЕДОМЛЕНИЯ, БИБЛИОТЕКА, ПОЛЬЗОВАТЕЛИ
function renderSchedule(day, btn) {
  if (btn) {
    document.querySelectorAll(".day-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }
  const lessons = appData.schedule[day] || [];
  document.getElementById("schedule-list").innerHTML = lessons.map(l => `
    <div class="list-item">
      <span><strong>${l.num}.</strong> ${l.subject}</span>
      <span class="muted">${l.time}</span>
    </div>
  `).join("");
}

function renderHomework() {
  document.getElementById("homework-list").innerHTML = appData.homework.map(h => `
    <div class="card-box">
      <div class="section-row">
        <strong>📘 ${h.subject} (${h.class})</strong>
        <span class="muted">на ${h.date}</span>
      </div>
      <p>${h.task}</p>
    </div>
  `).join("");
}

function renderNotifications() {
  document.getElementById("notifications-list").innerHTML = appData.notifications.map(n => `
    <div class="list-item">
      <div>
        <strong>${n.title}</strong>
        <div class="muted">${n.text}</div>
      </div>
      <small class="muted">${n.time}</small>
    </div>
  `).join("");
}

function renderLibrary() {
  document.getElementById("library-list").innerHTML = appData.library.map(item => `
    <div class="list-item">
      <div>
        <strong>📄 ${item.title}</strong>
        <div class="muted">${item.info}</div>
      </div>
      <button class="btn-primary sm" onclick="alert('Скачивание: ${item.title}')">Скачать</button>
    </div>
  `).join("");
}

function renderUsers() {
  document.getElementById("users-list").innerHTML = appData.users.map((u, idx) => `
    <div class="list-item">
      <div>
        <strong>${u.fio}</strong>
        <div class="muted">${u.role} • ${u.phone}</div>
      </div>
      ${u.status === "approved"
        ? `<span class="pill-green">Сразу доступ</span>`
        : `<span class="pill-orange" onclick="approveUser(${idx})">Ожидает одобрения ✓</span>`}
    </div>
  `).join("");
}

function approveUser(idx) {
  appData.users[idx].status = "approved";
  saveData();
  renderUsers();
      }

