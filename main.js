// main.js - comportamento do front (fetch API + manipulação do DOM)
// Suporte a override de API: defina window.API_BASE_URL antes de carregar este arquivo
const API_BASE = (() => {
  const base = (window.API_BASE_URL ? window.API_BASE_URL.replace(/\/$/, '') : window.location.origin);
  return base + '/api';
})();

/* ---------- helper para chamadas API (retorna JSON ou lança erro) ---------- */
async function apiRequest(path, opts = {}) {
  const res = await fetch(API_BASE + path, opts);
  // tenta extrair JSON (se houver)
  const json = await res.text().then(t => {
    try { return t ? JSON.parse(t) : {}; } catch { return {}; }
  });
  if (!res.ok) {
    const msg = (json && (json.error || json.message)) || `Erro ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

/* ---------- escape para inserir texto em HTML de forma segura ---------- */
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[s]);
}

/* ---------- AGENDAR (AGENDAR.html) ---------- */
(function setupAgendar() {
  // detecta formulário de agendamento buscando inputs específicos
  const nomeEl = document.getElementById('nome');
  const servicosEl = document.getElementById('servicos');
  if (!nomeEl || !servicosEl) return;

  const form = nomeEl.closest('form') || document.querySelector('form');
  if (!form) return;

  const idadeEl = document.getElementById('idade');
  const foneEl = document.getElementById('fone');
  const diaEl = document.getElementById('dia');
  const horarioEl = document.getElementById('horario');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      name: nomeEl ? nomeEl.value.trim() : '',
      age: idadeEl ? Number(idadeEl.value) || null : null,
      phone: foneEl ? foneEl.value.trim() : '',
      service: servicosEl ? servicosEl.value : '',
      date: diaEl ? diaEl.value : '',
      time: horarioEl ? horarioEl.value : ''
    };

    if (!payload.name || !payload.service || !payload.date) {
      alert('Por favor preencha Nome, Serviço e Data.');
      return;
    }

    try {
      await apiRequest('/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      // leva para a página de confirmação
      window.location.href = 'AGENDAR2.html';
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar agendamento: ' + err.message);
    }
  });
})();

/* ---------- ADMIN: listar agendamentos e excluir (admin.html) ---------- */
(async function setupAdmin() {
  const tableBody = document.querySelector('.agenda tbody');
  if (!tableBody) return;

  async function refresh() {
    try {
      const data = await apiRequest('/appointments');
      const rows = data.appointments || [];

      tableBody.innerHTML = '';
      if (rows.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6">Nenhum agendamento encontrado.</td></tr>`;
        return;
      }

      for (const a of rows) {
        const date = a.date ? (() => {
          try { return new Date(a.date).toLocaleDateString('pt-BR'); } catch { return a.date; }
        })() : '';
        const time = a.time ? (a.time.slice ? a.time.slice(0,5) : a.time) : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(a.name || '')}</td>
          <td>${escapeHtml(a.phone || '')}</td>
          <td>${escapeHtml(a.service || '')}</td>
          <td>${escapeHtml(date)}</td>
          <td>${escapeHtml(time)}</td>
          <td><button class="btn-excluir" data-id="${a.id}">Excluir</button></td>
        `;
        tableBody.appendChild(tr);
      }

      // attach handlers
      tableBody.querySelectorAll('.btn-excluir').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          if (!id) return;
          if (!confirm('Confirma exclusão deste agendamento?')) return;
          try {
            await apiRequest(`/appointments/${id}`, { method: 'DELETE' });
            alert('Agendamento excluído.');
            refresh();
          } catch (err) {
            console.error(err);
            alert('Erro ao excluir: ' + err.message);
          }
        });
      });

    } catch (err) {
      console.error(err);
      tableBody.innerHTML = `<tr><td colspan="6">Não foi possível carregar agendamentos.</td></tr>`;
    }
  }

  // inicializa
  refresh();
})();

/* ---------- AVALIAÇÕES: listar e enviar (Avaliações.html) ---------- */
(function setupReviews() {
  // tenta descobrir o container onde injetar avaliações:
  const reviewsContainer = document.getElementById('reviews-list') || document.querySelector('.containerava') || null;
  const reviewForm = document.getElementById('reviewForm') || (function(){
    // fallback: formulário com textarea name="content"
    return Array.from(document.forms).find(f => f.querySelector('textarea[name="content"], input[name="content"]')) || null;
  })();

  async function load() {
    try {
      const data = await apiRequest('/reviews');
      const reviews = data.reviews || [];
      if (!reviewsContainer) return;
      // render simples: cada review em um bloco
      reviewsContainer.innerHTML = reviews.map(r => {
        const name = r.author_name || r.author || 'Anônimo';
        const content = r.content || '';
        return `<div class="review-card"><div class="review-author">${escapeHtml(name)}</div><div class="review-content">${escapeHtml(content)}</div></div>`;
      }).join('');
    } catch (err) {
      console.error('Erro ao carregar avaliações:', err);
    }
  }

  if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const author_name = reviewForm.querySelector('[name="author_name"]')?.value || reviewForm.querySelector('[name="nome"]')?.value || '';
      const content = reviewForm.querySelector('[name="content"]')?.value || reviewForm.querySelector('textarea')?.value || '';

      if (!content || content.trim() === '') {
        alert('Escreva uma avaliação antes de enviar.');
        return;
      }

      try {
        await apiRequest('/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author_name: author_name.trim(), content: content.trim() })
        });
        alert('Avaliação enviada. Obrigado!');
        reviewForm.reset();
        load();
      } catch (err) {
        console.error(err);
        alert('Erro ao enviar avaliação: ' + err.message);
      }
    });
  }

  // sempre tenta carregar as avaliações (se houver container)
  load();
})();

/* ---------- CADASTRO / LOGIN (cadastro.html e criandoconta.html) ---------- */
(function setupAuthForms() {
  // identifica formulários de cadastro/login automaticamente
  const signupForm = document.querySelector('form#signup') ||
                     document.querySelector('form.signup') ||
                     Array.from(document.forms).find(f =>
                       (f.querySelector('input[name="email"], input[type="email"]') &&
                        (f.querySelector('input[name="password"], input[type="password"], input[name="senha"]') ||
                         f.querySelector('input[name="nome"], input[name="name"]')))
                     ) || null;

  if (!signupForm) return;

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    // tenta extrair campos comuns
    const name = signupForm.querySelector('[name="name"]')?.value ||
                 signupForm.querySelector('[name="nome"]')?.value || '';
    const email = signupForm.querySelector('[name="email"]')?.value || '';
    const password = signupForm.querySelector('[name="password"]')?.value ||
                     signupForm.querySelector('[name="senha"]')?.value || '';
    const phone = signupForm.querySelector('[name="phone"]')?.value ||
                  signupForm.querySelector('[name="fone"]')?.value || '';

    if (!name || !password) {
      alert('Nome e senha são obrigatórios.');
      return;
    }

    try {
      await apiRequest('/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password: password, phone: phone.trim() })
      });
      alert('Conta criada com sucesso!');
      // redireciona para home ou outra página conforme fluxo
      window.location.href = 'index.html';
    } catch (err) {
      console.error(err);
      alert('Erro ao criar conta: ' + err.message);
    }
  });
})();

/* ---------- CARTÃO FIDELIDADE / PONTOS (pontos.html e cartaofidelidade.html) ---------- */
(function setupFidelity() {
  // tenta achar botão(s) que representam cancelar cartão
  const cancelBtn = document.querySelector('.botao8') || document.querySelector('.botao3') || null;
  if (!cancelBtn) return;

  cancelBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    // procura um userId em dataset do botão, input hidden, ou localStorage
    const userId = cancelBtn.dataset.userId ||
                   document.querySelector('input[name="userId"]')?.value ||
                   localStorage.getItem('vipcortes_user_id') || null;

    if (!userId) {
      alert('Usuário não identificado. Faça login para gerenciar o cartão fidelidade.');
      return;
    }

    if (!confirm('Deseja realmente cancelar o cartão fidelidade?')) return;

    try {
      await apiRequest(`/fidelities/${encodeURIComponent(userId)}/cancel`, { method: 'POST' });
      alert('Cartão cancelado com sucesso.');
      // opcional: desativar botão
      cancelBtn.disabled = true;
      cancelBtn.textContent = 'CANCELADO';
    } catch (err) {
      console.error(err);
      alert('Erro ao cancelar cartão: ' + err.message);
    }
  });
})();

/* ---------- Utility: salva userId localmente (opcional) ---------- */
/* 
  Se você quiser que o login salve userId para ações posteriores, utilize:
  localStorage.setItem('vipcortes_user_id', '<id>')
  e remova quando fizer logout localStorage.removeItem('vipcortes_user_id')
*/

/* ---------- fim do main.js ---------- */
