const closeAll=()=>document.querySelectorAll('.modal').forEach(x=>x.classList.remove('show'));
document.querySelectorAll('[data-open]').forEach(x=>x.addEventListener('click',e=>{e.preventDefault();document.querySelector(x.dataset.open)?.classList.add('show')}));
document.querySelectorAll('[data-action]').forEach(x=>x.addEventListener('click',()=>{document.querySelector('#supportModal')?.classList.add('show');document.querySelector('#modalTitle').textContent=x.dataset.action;document.querySelector('#requestType').value=x.dataset.action}));
document.querySelectorAll('[data-close]').forEach(x=>x.addEventListener('click',closeAll));
document.querySelectorAll('.modal').forEach(x=>x.addEventListener('click',e=>{if(e.target===x)closeAll()}));
document.querySelector('#requestForm')?.addEventListener('submit',e=>{e.preventDefault();alert('Заявка подготовлена. Подключение платежей и проверки аккаунта появится после настройки серверного API.');closeAll()});
