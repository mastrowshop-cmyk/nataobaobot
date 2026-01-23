const tg = window.Telegram.WebApp;
tg.ready();

// ✅ ТВОЙ API (Render)
const API = "https://nataobao-api.onrender.com";

// initData для авторизации пользователя в WebApp
const initData = tg.initData;

const splash = document.getElementById("splash");
const app = document.getElementById("app");
const splashText = document.getElementById("splashText");

let ME = null;
let PARCELS = [];

// utils
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

async function post(url, data){
  const res = await fetch(`${API}${url}`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(data)
  });
  const json = await res.json().catch(()=>({}));
  if (!res.ok) {
    const msg = json?.detail || json?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
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

function calcToPay(){
  return PARCELS
    .filter(p => p.status === "pay" && !p.paid)
    .reduce((a,p)=>a+(p.price_rub||0),0);
}

async function refreshParcels(){
  PARCELS = await post("/parcels/list", { initData });
  const toPay = calcToPay();
  qs("#openPayBtn").disabled = (toPay <= 0);
}

// ---------- RENDER PAGES ----------

function renderProfile(){
  const el = qs("#page-profile");
  el.innerHTML = `
    <div class="grid">
      <div class="card">
        <div class="card-title">Персональный код</div>
        <div class="card-value">${ME.code}</div>
        <div class="small">Сканы/посылки привязываются к вашему коду</div>
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

    <div class="card" style="margin-top:12px">
      <div class="card-title">Информация</div>
      <div class="small" style="margin-top:8px">
        Трекинг отображается по точкам: Китай → Уссурийск → Якутск.<br/>
        Фактическая работа идёт через Якутск: там сканы и взвешивание.
      </div>
    </div>
  `;

  qs("#saveProfile").onclick = async () => {
    const first_name = qs("#fn").value.trim();
    const last_name  = qs("#ln").value.trim();

    const msg = qs("#profileMsg");
    msg.textContent = "Сохраняем…";

    try{
      await post("/profile/update", { initData, first_name, last_name });
      ME.first_name = first_name;
      ME.last_name = last_name;
      qs("#sbUser").textContent = `${ME.first_name} ${ME.last_name}`.trim();
      qs("#topName").textContent = `${ME.first_name} ${ME.last_name}`.trim();
      msg.textContent = "✅ Сохранено";
    }catch(e){
      msg.textContent = `❌ ${e.message}`;
    }
  };
}

function renderDeliveries(){
  const el = qs("#page-deliveries");
  const toPay = calcToPay();

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
  if (!PARCELS.length){
    list.innerHTML = `<div class="small">
      Пока нет доставок. Они появятся после привязки сканов по вашему коду <b>${ME.code}</b>.
    </div>`;
    return;
  }

  list.innerHTML = PARCELS.map(p=>{
    const t = trackState(p.status);
    const right = p.status === "pay"
      ? `<div class="badge">К оплате: ${money(p.price_rub)}</div>`
      : `<div class="badge">${money(p.price_rub)}</div>`;

    return `
      <div class="parcel">
        <div class="parcel-top">
          <div>
            <div class="parcel-title">${escapeHtml(p.title)}</div>
            <div class="parcel-meta">${statusLabel(p.status)} • ID: ${p.id}</div>
          </div>
          ${right}
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
          ${p.track ? ` • Скан/трек: <b>${escapeHtml(p.track)}</b>` : ``}
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
        Нажмите кнопку, чтобы открыть чат поддержки в Telegram.
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
      <div class="small" style="margin-top:8px">
        Введите код клиента + ID посылки + вес (кг). Система выставит статус “К оплате”.
      </div>
      <hr class="sep"/>

      <div class="row">
        <input class="input" id="wCode" placeholder="Код клиента (например NTB123)">
        <input class="input" id="wParcelId" placeholder="ID посылки (например 12)">
      </div>

      <div class="row" style="margin-top:10px">
        <input class="input" id="wKg" placeholder="Вес (кг) например 2.35">
        <button class="btn primary" id="wGo">Рассчитать и поставить “К оплате”</button>
      </div>

      <div class="small" id="wMsg" style="margin-top:10px"></div>
    </div>
  `;

  qs("#wGo").onclick = async () => {
    const code = qs("#wCode").value.trim();
    const parcel_id = parseInt(qs("#wParcelId").value.trim(),10);
    const weight_kg = parseFloat(qs("#wKg").value.trim());

    const msg = qs("#wMsg");
    msg.textContent = "Считаем…";

    try{
      const res = await post("/operator/weigh", { initData, code, parcel_id, weight_kg });
      msg.textContent = `✅ Готово. Сумма: ${money(res.price_rub)}`;

      // обновим список (чтобы клиент потом увидел)
      await refreshParcels();
    }catch(e){
      msg.textContent = `❌ ${e.message}`;
    }
  };
}

async function renderPayment(){
  const el = qs("#page-payment");
  el.innerHTML = `<div class="card"><div class="small">Загрузка…</div></div>`;

  const info = await post("/payment/info", { initData });
  const toPay = calcToPay();

  el.innerHTML = `
    <div class="grid">
      <div class="card">
        <div class="card-title">К оплате сейчас</div>
        <div class="card-value">${money(toPay)}</div>
        <div class="small">Сумма считается по статусам “К оплате”</div>
      </div>
      <div class="card">
        <div class="card-title">Важно</div>
        <div class="card-value">Оплата</div>
        <div class="small">Инструкции ниже</div>
      </div>
    </div>

    <div class="card" style="margin-top:12px">
      <div class="card-title">Инструкция оплаты</div>
      <hr class="sep"/>
      <div class="small" style="white-space:pre-wrap">${escapeHtml(info.pay_text || "")}</div>
    </div>
  `;
}

async function renderAdminSettings(){
  const el = qs("#page-settings");
  el.innerHTML = `<div class="card"><div class="small">Загрузка…</div></div>`;

  const s = await post("/admin/settings/get", { initData });

  el.innerHTML = `
    <div class="card">
      <div class="card-title">Настройки (админ)</div>
      <div class="small" style="margin-top:8px">
        Тариф за кг, текст оплаты, username поддержки.
      </div>
      <hr class="sep"/>

      <div class="row">
        <input class="input" id="ppk" placeholder="Цена за кг (руб)" value="${s.price_per_kg}">
        <input class="input" id="sup" placeholder="Поддержка (username без @)" value="${escapeHtml(s.support_username || "")}">
      </div>

      <div style="margin-top:10px">
        <div class="small">Текст оплаты (видно клиентам на странице оплаты)</div>
        <textarea class="textarea" id="paytext">${escapeHtml(s.pay_text || "")}</textarea>
      </div>

      <div style="margin-top:10px" class="row">
        <button class="btn primary" id="saveSettings">Сохранить</button>
        <span class="small" id="sMsg"></span>
      </div>
    </div>
  `;

  qs("#saveSettings").onclick = async () => {
    const price_per_kg = parseFloat(qs("#ppk").value);
    const support_username = qs("#sup").value.trim().replace("@","");
    const pay_text = qs("#paytext").value;

    const msg = qs("#sMsg");
    msg.textContent = "Сохраняем…";

    try{
      await post("/admin/settings/save", { initData, price_per_kg, support_username, pay_text });
      msg.textContent = "✅ Сохранено";

      // обновим локально поддержку (чтобы вкладка Support сразу)
      ME.support_username = support_username || ME.support_username;
    }catch(e){
      msg.textContent = `❌ ${e.message}`;
    }
  };
}

async function renderAdminVerify(){
  const el = qs("#page-verify");
  el.innerHTML = `<div class="card"><div class="small">Загрузка заявок…</div></div>`;

  const list = await post("/admin/users/pending", { initData });

  if (!list.length){
    el.innerHTML = `
      <div class="card">
        <div class="card-title">Верификация</div>
        <div class="small" style="margin-top:8px">Заявок нет</div>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="card">
      <div class="card-title">Верификация пользователей</div>
      <div class="small" style="margin-top:8px">Одобрить или отклонить заявки.</div>
      <hr class="sep"/>
      <div id="vList"></div>
    </div>
  `;

  const vList = qs("#vList");
  vList.innerHTML = list.map(u=>`
    <div class="parcel">
      <div class="parcel-top">
        <div>
          <div class="parcel-title">${escapeHtml(u.first_name)} ${escapeHtml(u.last_name)}</div>
          <div class="small">
            Код: <b>${escapeHtml(u.code)}</b> • tg_id: ${u.tg_id} ${u.username ? `• @${escapeHtml(u.username)}` : ""}
          </div>
        </div>
        <div class="row" style="max-width:220px">
          <button class="btn ok" data-appr="${u.tg_id}">Одобрить</button>
          <button class="btn danger" data-rej="${u.tg_id}">Отклонить</button>
        </div>
      </div>
    </div>
  `).join("");

  qsa("[data-appr]").forEach(btn=>{
    btn.onclick = async () => {
      const tg_id = parseInt(btn.getAttribute("data-appr"),10);
      btn.disabled = true;
      try{
        await post("/admin/users/approve", { initData, tg_id });
        await renderAdminVerify();
      }catch(e){
        btn.disabled = false;
        alert(e.message);
      }
    };
  });

  qsa("[data-rej]").forEach(btn=>{
    btn.onclick = async () => {
      const tg_id = parseInt(btn.getAttribute("data-rej"),10);
      btn.disabled = true;
      try{
        await post("/admin/users/reject", { initData, tg_id });
        await renderAdminVerify();
      }catch(e){
        btn.disabled = false;
        alert(e.message);
      }
    };
  });
}

function renderAdminExcel(){
  const el = qs("#page-excel");
  el.innerHTML = `
    <div class="card">
      <div class="card-title">Импорт Excel</div>
      <div class="small" style="margin-top:8px">
        Формат колонок: <b>CODE | TITLE | TRACK (опц) | STATUS (опц)</b><br/>
        Пример STATUS: china / ussuriysk / yakutsk / pay / paid / shipped
      </div>
      <hr class="sep"/>
      <input type="file" id="excelFile" class="input" accept=".xlsx"/>
      <div style="margin-top:10px">
        <button class="btn primary" id="uploadExcel">Загрузить</button>
        <span class="small" id="eMsg" style="margin-left:10px"></span>
      </div>
      <div class="small" style="margin-top:10px">
        После импорта клиентам придёт уведомление (когда запустишь Worker-бота).
      </div>
    </div>
  `;

  qs("#uploadExcel").onclick = async () => {
    const msg = qs("#eMsg");
    const f = qs("#excelFile").files[0];
    if (!f){ msg.textContent = "❌ Выберите .xlsx файл"; return; }

    msg.textContent = "Загрузка…";

    const form = new FormData();
    form.append("initData", initData);
    form.append("file", f);

    try{
      const res = await fetch(`${API}/admin/excel/import`, {
        method:"POST",
        body: form
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`);
      msg.textContent = "✅ Импорт выполнен";
      await refreshParcels();
    }catch(e){
      msg.textContent = `❌ ${e.message}`;
    }
  };
}

// ---------- MENU / INIT ----------

function wireMenu(){
  qsa(".sb-item").forEach(btn=>{
    btn.onclick = async () => {
      const page = btn.getAttribute("data-page");
      showPage(page);

      try{
        if (page === "profile") renderProfile();
        if (page === "deliveries") { await refreshParcels(); renderDeliveries(); }
        if (page === "support") renderSupport();
        if (page === "weigh") renderWeigh();
        if (page === "settings") await renderAdminSettings();
        if (page === "verify") await renderAdminVerify();
        if (page === "excel") renderAdminExcel();
      }catch(e){
        alert(e.message);
      }
    };
  });

  qs("#openPayBtn").onclick = async () => {
    showPage("payment");
    try{
      await refreshParcels();
      await renderPayment();
    }catch(e){
      alert(e.message);
    }
  };
}

function applyRoleMenus(role){
  // скрываем всё, потом включаем
  qs("#menu-operator").classList.add("hidden");
  qs("#menu-admin").classList.add("hidden");

  if (role === "operator" || role === "admin") {
    qs("#menu-operator").classList.remove("hidden");
  }
  if (role === "admin") {
    qs("#menu-admin").classList.remove("hidden");
  }

  // если pending — покажем только поддержку и профиль (без доставок)
  if (role === "pending") {
    // уберём “Мои доставки”
    qsa('#menu-client .sb-item[data-page="deliveries"]').forEach(x => x.classList.add("hidden"));
    qs("#openPayBtn").disabled = true;
    qs("#topSub").textContent = "Ожидание подтверждения админом";
  } else {
    qsa('#menu-client .sb-item[data-page="deliveries"]').forEach(x => x.classList.remove("hidden"));
    qs("#topSub").textContent = "Личный кабинет";
  }
}

async function init(){
  try{
    const first = tg.initDataUnsafe?.user?.first_name || "";
    splashText.textContent = first ? `Добро пожаловать, ${first}!` : "Добро пожаловать!";
    await new Promise(r=>setTimeout(r, 900));

    // 1) авторизация пользователя в API
    ME = await post("/me", { initData });

    // 2) роли
    applyRoleMenus(ME.role);

    // 3) имя в шапке
    qs("#sbUser").textContent = `${ME.first_name} ${ME.last_name}`.trim();
    qs("#topName").textContent = `${ME.first_name} ${ME.last_name}`.trim();

    // 4) грузим посылки (если не pending)
    if (ME.role !== "pending") {
      await refreshParcels();
    } else {
      PARCELS = [];
    }

    // 5) кнопка оплаты
    qs("#openPayBtn").disabled = (calcToPay() <= 0);

    // 6) стартовая страница
    renderProfile();
    wireMenu();

    splash.classList.add("hidden");
    app.classList.remove("hidden");
    showPage("profile");
  }catch(e){
    // чаще всего: 403 Not registered (не зарегался через бота)
    splashText.textContent = `Нет доступа: ${e.message}`;
  }
}

function escapeHtml(str){
  if (str === null || str === undefined) return "";
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

init();
