const tg = window.Telegram.WebApp;
tg.ready();

setTimeout(() => {
  document.getElementById("splash").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
}, 1200);

const API = "https://api.nataobao.ru"; // твой backend
const user = tg.initDataUnsafe.user;

document.getElementById("userName").innerText = user.first_name;

function go(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
  document.getElementById(page).classList.remove("hidden");

  document.querySelectorAll(".tabbar button").forEach(b => b.classList.remove("active"));
  event.target.classList.add("active");
}

// Загрузка данных
fetch(`${API}/me/${user.id}`)
  .then(r => r.json())
  .then(u => fetch(`${API}/parcels/${u.code}`))
  .then(r => r.json())
  .then(list => {

    document.getElementById("parcelCount").innerText = list.length;

    let sum = 0;
    const box = document.getElementById("parcelList");

    list.forEach(p => {
      if (p.status === "pay" && p.
