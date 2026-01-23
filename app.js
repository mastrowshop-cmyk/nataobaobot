const tg = window.Telegram.WebApp;
tg.ready();

// ✅ ВСТАВЬ СВОЙ API
const API = "https://nataobao-api.onrender.com";

// initData для авторизации WebApp (если на сервере будет проверка)
const initData = tg.initData;

const splash = document.getElementById("splash");
const app = document.getElementById("app");
const splashText = document.getElementById("splashText");

let ME = null;
let PARCELS = [];

function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return [...document.querySelectorAll(sel)]; }

function setActiveMenu(page){
  qsa(".sb-item").forEach(b => b.classList.remove("active"));
  qsa(`.sb-item[data-page="${page}"]`).forEach(b => b.classList.add("active"));
}

function showPage(page){
  qsa(".page").forEach(p => p.classList.add("hidden"));
  qs(`#page-${page}`).classList.remove("hidden");
  setActiveMenu(page);
}

function post(url, data){
  return fetch(`${API}${url}`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(data)
  }).then(r => r.json());
}

function money(v){
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("ru-RU").format(Math.round(v)) + " ₽";
}

function statusLabel(s){
  const map = {
    china:"Китай (в пути)",
    ussuriysk:"Уссурийск (транзит)",
    yakutsk:"Якутск (поступило)",
    pay:"Взвешено • К оплате",
    paid:"Оплачено",
    shipped:"Отправлено"
  };
  return map[s] || s;
}

function trackState(status){
  // 3 точки только для отображения
  const chinaOn = ["ussuriysk","yakutsk","pay","paid","shipped"].includes(status);
  const ussOn  = ["yakutsk","pay","paid","shipped"].includes(status);
  const yakOn  = ["yakutsk","pay","paid","shipped"].includes(status);
  return {chinaOn, ussOn, yakOn};
}

async function loadMe(){
  // Если на сервере есть /me POST с initData:
  // return await post("/me", { initData });

  // Если у тебя пока только телеграм-бот + база и нет /me, то временно:
  // Используем Telegram данные (покажем интерфейс, но роль=client)
  const u = tg.initDataUnsafe?.user;
  return {
    role: "client",
    code: "NTB000",
    first_name: u?.first_name || "Клиент",
    last_name: "",
    support_username: "YOUR_SUPPORT"
  };
}

async function loadParcels(){
  // Если на сервере есть /parcels/list:
  // return await post("/parcels/list", { initData });

  // временный демо-список (пока не подключишь эндпоинт)
  return [];
}

function renderProfile(){
  const el = qs("#page-profile");
  el.innerHTML = `
    <div class="grid">
      <div class="card">
        <div class="card-title">Персональный код</div>
        <div class="card-value">${ME.code}</div>
        <div class="small">Сканы привязываются к вашему коду</div>
      </div>
      <div class="card">
        <div class="card-title">Роль</div>
        <div class="card-value">${ME.role}</div>
        <div class="small">client / operator / admin</div>
      </div>
    </div>

    <div class="card" style="margin-top:12px">
      <div class="card-title">Редактировать профиль</div>
      <hr class="sep"/>
      <div class="row">
        <input class="input" id="fn" placeholder="Имя" value="${ME.first_name}">
        <input class="input" id="ln" placeholder="Фамилия" value="${ME.last_name}">
      </div>
      <div style="margin-top:10px" class="row">
        <button class="btn primary" id="saveProfile">Сохранить</button>
      </div>
      <div class="small" id="profileMsg" style="margin-top:8px"></div>
    </div>
  `;

  qs("#saveProfile").onclick = async () => {
    const first_name = qs("#fn").value.trim();
    const last_name  = qs("#ln").value.trim();

    // если на сервере есть /profile/update:
    // const res = await post("/profile/update", { initData, first_name, last_name });

    // пока просто локально:
    ME.first_name = first_name;
    ME.last_name = last_name;
    qs("#profileMsg").textContent = "✅ Сохранено";
    qs("#sbUser").textContent = `${ME.first_name} ${ME.last_name}`.trim();
    qs("#topName").textContent = `${ME.first_name} ${ME.last_name}`.trim();
  };
}

function renderDeliveries(){
  const el = qs("#page-deliveries");
  const toPay = PARCELS.filter(p=>p.status==="pay").reduce((a,p)=>a+(p.price_rub||0),0);

  el.innerHTML = `
    <div class="grid">
      <div class="card">
        <div class="card-title">Всего доставок</div>
        <div class="card-value">${PARCELS.length}</div>
      </div>
      <div class="card">
        <div class="card-title">К оплате</div>
        <div class="card-value">${money(toPay)}</div>
      </div>
    </div>

    <div style="margin-top:12px" class="card">
      <div class="card-title">Мои доставки</div>
      <hr class="sep"/>
      <div id="parcelList"></div>
    </div>
  `;

  const list = qs("#parcelList");
  if (PARCELS.length === 0){
    list.innerHTML = `<div class="small">Пока нет доставок. Они появятся после привязки сканов по коду <b>${ME.code}</b>.</div>`;
    return;
  }

  list.innerHTML = PARCELS.map(p=>{
    const t = trackState(p.status);
    return `
      <div class="parcel">
        <div class="parcel-top">
          <div>
            <div class="parcel-title">${p.title}</div>
            <div class="parcel-meta">${statusLabel(p.status)}</div>
          </div>
          <div class="badge">${money(p.price_rub)}</div>
        </div>

        <div class="trackline">
          <div class="dot ${t.chinaOn?'on':''}"></div>
          <div class="line ${t.ussOn?'on':''}"></div>
          <div class="dot ${t.ussOn?'on':''}"></div>
          <div class="line ${t.yakOn?'on':''}"></div>
          <div class="dot ${t.yakOn?'on':''}"></div>
        </div>

        <div class="small" style="margin-top:8px">
          Китай → Уссурийск → Якутск
          ${p.track ? ` • Скан: <b>${p.track}</b>` : ``}
          ${p.weight_kg ? ` • Вес: <b>${p.weight_kg} кг</b>` : ``}
        </div>
      </div>
    `;
  }).join("");
}

function renderSupport(){
  const el = qs("#page-support");
  el.innerHTML = `
    <div class="card">
      <div class="card-title">Поддержка</div>
      <div class="card-value">@${ME.support_username}</div>
      <div class="small" style="margin-top:8px">
        Нажмите, чтобы открыть чат в Telegram:
      </div>
      <div style="margin-top:10px">
        <a class="btn primary" href="https://t.me/${ME.support_username}" target="_blank">Написать в поддержку</a>
      </div>
    </div>
  `;
}

function renderWeigh(){
  const el = qs("#page-weigh");
  el.innerHTML = `
    <div class="card">
      <div class="card-title">Взвесить товары (Якутск)</div>
      <hr class="sep"/>

      <div class="row">
        <input class="input" id="wCode" placeholder="Персональный код клиента (например NTB123)">
        <input class="input" id="wParcelId" placeholder="ID посылки (из списка клиента)">
      </div>

      <div class="row" style="margin-top:10px">
        <input class="input" id="wKg" placeholder="Вес (кг), например 2.35">
        <button class="btn primary" id="wGo">Рассчитать и поставить “К оплате”</button>
      </div>

      <div class="small" id="wMsg" style="margin-top:10px"></div>
    </div>
  `;

  qs("#wGo").onclick = async () => {
    const code = qs("#wCode").value.trim();
    const parcel_id = parseInt(qs("#wParcelId").value.trim(),10);
    const weight_kg = parseFloat(qs("#wKg").value.trim());

    // если на сервере есть /operator/weigh:
    // const res = await post("/operator/weigh", { initData, code, parcel_id, weight_kg });

    qs("#wMsg").textContent = "⚠️ Подключи endpoint /operator/weigh на сервере (сейчас это макет).";
  };
}

async function renderPayment(){
  const el = qs("#page-payment");

  // если на сервере есть /payment/info:
  // const info = await post("/payment/info", { initData });

  el.innerHTML = `
    <div class="card">
      <div class="card-title">Оплата</div>
      <div class="small" style="margin-top:10px; white-space:pre-wrap">
        Текст оплаты редактируется администратором.
      </div>
    </div>
  `;
}

function renderAdminSettings(){
  const el = qs("#page-settings");
  el.innerHTML = `
    <div class="card">
      <div class="card-title">Настройки (админ)</div>
      <div class="small" style="margin-top:8px">
        Здесь должны быть: тариф за кг, текст оплаты, поддержка.
      </div>
      <hr class="sep"/>
      <div class="small">⚠️ Подключи endpoints /admin/settings/get и /admin/settings/save.</div>
    </div>
  `;
}

function renderAdminVerify(){
  const el = qs("#page-verify");
  el.innerHTML = `
    <div class="card">
      <div class="card-title">Верификация пользователей</div>
      <div class="small" style="margin-top:8px">
        ⚠️ Подключи endpoints /admin/users/pending, /admin/users/approve, /admin/users/reject.
      </div>
    </div>
  `;
}

function renderAdminExcel(){
  const el = qs("#page-excel");
  el.innerHTML = `
    <div class="card">
      <div class="card-title">Импорт Excel</div>
      <div class="small" style="margin-top:8px">
        ⚠️ Подключи endpoint /admin/excel/import.
      </div>
    </div>
  `;
}

function wireMenu(){
  qsa(".sb-item").forEach(btn=>{
    btn.onclick = async () => {
      const page = btn.getAttribute("data-page");
      showPage(page);

      if (page === "deliveries") renderDeliveries();
      if (page === "support") renderSupport();
      if (page === "weigh") renderWeigh();
      if (page === "settings") renderAdminSettings();
      if (page === "verify") renderAdminVerify();
      if (page === "excel") renderAdminExcel();
    };
  });

  qs("#openPayBtn").onclick = async () => {
    showPage("payment");
    await renderPayment();
  };
}

async function init(){
  try{
    const first = tg.initDataUnsafe?.user?.first_name || "";
    splashText.textContent = first ? `Добро пожаловать, ${first}!` : "Добро пожаловать!";
    await new Promise(r=>setTimeout(r, 900));

    ME = await loadMe();

    // показываем меню по ролям
    qs("#menu-operator").classList.toggle("hidden", !(ME.role==="operator" || ME.role==="admin"));
    qs("#menu-admin").classList.toggle("hidden", !(ME.role==="admin"));

    qs("#sbUser").textContent = `${ME.first_name} ${ME.last_name}`.trim();
    qs("#topName").textContent = `${ME.first_name} ${ME.last_name}`.trim();

    PARCELS = await loadParcels();

    // кнопка оплаты активна если есть "pay"
    const toPay = PARCELS.filter(p=>p.status==="pay").reduce((a,p)=>a+(p.price_rub||0),0);
    qs("#openPayBtn").disabled = (toPay <= 0);

    renderProfile();
    wireMenu();

    splash.classList.add("hidden");
    app.classList.remove("hidden");
    showPage("profile");
  }catch(e){
    splashText.textContent = "Нет доступа. Проверь регистрацию / одобрение.";
  }
}

init();
