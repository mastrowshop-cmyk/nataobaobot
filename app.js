const tg = window.Telegram.WebApp;
tg.ready();

setTimeout(()=>{
  document.getElementById("loader").style.display="none";
  document.getElementById("app").classList.remove("hidden");
},1000);

function openPage(id){
  document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

document.getElementById("profile").innerHTML =
  `<h2>👤 Профиль</h2>
   <p>Имя: ${tg.initDataUnsafe.user.first_name}</p>`;

document.getElementById("support").innerHTML =
  `<h2>💬 Поддержка</h2>
   <a href="https://t.me/YOUR_SUPPORT" target="_blank">Написать</a>`;
