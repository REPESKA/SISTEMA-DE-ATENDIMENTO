const API_URL = 'http://localhost:3000/api/atendimentos';
const API_ATENDENTES = 'http://localhost:3000/api/atendentes';

// Utilitários Globais
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.style.backgroundColor = isError ? 'var(--color-danger)' : 'var(--color-success)';
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

// ========================================
// TELA 1: CADASTRO
// ========================================
function initCadastro() {
    const form = document.getElementById('form-cadastro');
    const selectStatus = document.getElementById('status');
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    
    if (!form) return; // Não estamos na página de cadastro

    // Verifica se é modo edição
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('id');
    
    if (editId) {
        document.querySelector('.card-title').textContent = 'Editar Atendimento';
        submitBtn.textContent = 'Salvar Alterações';
        
        // Carregar dados para edição
        fetch(API_URL)
            .then(res => res.json())
            .then(data => {
                const item = data.find(a => a.id == editId);
                if (item) {
                    document.getElementById('data').value = item.data;
                    document.getElementById('atendente').value = item.atendente;
                    document.getElementById('cliente').value = item.cliente;
                    document.getElementById('status').value = item.status;
                    document.getElementById('servico').value = item.servico;
                    document.getElementById('valor').value = item.valor;
                    document.getElementById('cidade').value = item.cidade;
                    document.getElementById('estado').value = item.estado;
                    updateSelectColor();
                }
            })
            .catch(err => console.error('Erro ao carregar dados:', err));
    }

    // Dinâmica de cor do Select de Status
    const updateSelectColor = () => {
        selectStatus.classList.remove('status-pago', 'status-naopago');
        if (selectStatus.value === 'Pago') {
            selectStatus.classList.add('status-pago');
        } else if (selectStatus.value === 'Não Pago') {
            selectStatus.classList.add('status-naopago');
        }
    };
    
    selectStatus.addEventListener('change', updateSelectColor);
    // Chamada inicial para setar a cor padrão, caso tenha um value inicial
    updateSelectColor();

    // Submit do formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        let isValid = true;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Validação
        form.querySelectorAll('input, select').forEach(field => {
            field.classList.remove('input-error');
            if (!field.value.trim()) {
                field.classList.add('input-error');
                isValid = false;
            }
        });

        if (!isValid) {
            showToast('Preencha todos os campos corretamente!', true);
            return;
        }

        // Converter valor para número
        data.valor = parseFloat(data.valor);

        try {
            const method = editId ? 'PUT' : 'POST';
            const url = editId ? `${API_URL}/${editId}` : API_URL;

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                showToast(editId ? 'Atendimento atualizado!' : 'Atendimento salvo!');
                if (editId) {
                    setTimeout(() => window.location.href = 'controle.html', 1500);
                } else {
                    form.reset();
                    updateSelectColor();
                }
            } else {
                showToast('Erro ao salvar no servidor.', true);
            }
        } catch (error) {
            console.error(error);
            showToast('Erro de conexão com a API.', true);
        }
    });
}


// ========================================
// TELA 2: CONTROLE / DASHBOARD
// ========================================
let globalAtendimentos = [];
let chartInstance = null;

async function fetchAtendimentos() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        globalAtendimentos = data.sort((a, b) => new Date(b.data) - new Date(a.data));
        applyFilters();
    } catch (error) {
        console.error("Erro ao buscar dados", error);
    }
}

function initControle() {
    const listContainer = document.getElementById('attendance-list');
    if (!listContainer) return; // Não estamos na página de controle

    // Setup de filtros
    document.getElementById('search-cliente').addEventListener('input', applyFilters);
    document.getElementById('search-atendente').addEventListener('input', applyFilters);
    document.getElementById('filter-data').addEventListener('input', applyFilters);
    
    document.querySelectorAll('.filter-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-toggle').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            applyFilters();
        });
    });

    // Botão de Limpar Filtros
    const btnClear = document.getElementById('btn-clear-filters');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            document.getElementById('search-cliente').value = '';
            document.getElementById('search-atendente').value = '';
            document.getElementById('filter-data').value = '';
            document.querySelectorAll('.filter-toggle').forEach(b => b.classList.remove('active'));
            document.querySelector('.filter-toggle[data-status="Todos"]').classList.add('active');
            applyFilters();
        });
    }

    // Busca inicial
    fetchAtendimentos();
}

function applyFilters() {
    const clienteBusca = document.getElementById('search-cliente').value.toLowerCase();
    const atendenteBusca = document.getElementById('search-atendente').value.toLowerCase();
    const dataBusca = document.getElementById('filter-data').value;
    const statusAtivo = document.querySelector('.filter-toggle.active').dataset.status;

    const filtrados = globalAtendimentos.filter(item => {
        const matchCliente = item.cliente.toLowerCase().includes(clienteBusca);
        const matchAtendente = item.atendente.toLowerCase().includes(atendenteBusca);
        const matchData = !dataBusca || item.data === dataBusca;
        const matchStatus = statusAtivo === 'Todos' || item.status === statusAtivo;

        return matchCliente && matchAtendente && matchData && matchStatus;
    });

    renderList(filtrados);
    updateDashboard(filtrados);
    renderChart(filtrados);
}

function updateDashboard(dados) {
    const total = dados.length;
    const pagos = dados.filter(d => d.status === 'Pago');
    const naoPagos = dados.filter(d => d.status === 'Não Pago');
    
    const valorRecebido = pagos.reduce((acc, curr) => acc + curr.valor, 0);
    const valorReceber = naoPagos.reduce((acc, curr) => acc + curr.valor, 0);

    document.getElementById('metric-total').textContent = total;
    document.getElementById('metric-pagos').textContent = pagos.length;
    document.getElementById('metric-naopagos').textContent = naoPagos.length;
    document.getElementById('metric-recebido').textContent = formatCurrency(valorRecebido);
    document.getElementById('metric-receber').textContent = formatCurrency(valorReceber);
}

function renderList(dados) {
    const container = document.getElementById('attendance-list');
    container.innerHTML = '';

    if (dados.length === 0) {
        container.innerHTML = '<div class="empty-message">Nenhum atendimento encontrado.</div>';
        return;
    }

    dados.forEach(item => {
        const card = document.createElement('div');
        const cardStatusClass = item.status === 'Pago' ? 'card-pago' : 'card-naopago';
        card.className = `card attendance-card ${cardStatusClass}`;
        
        const isPago = item.status === 'Pago';
        const badgeClass = isPago ? 'badge-pago' : 'badge-naopago';
        
        card.innerHTML = `
            <div class="attendance-details">
                <span class="badge ${badgeClass}">${item.status}</span>
                <h3 class="card-title">${item.cliente}</h3>
                <p><strong>Data:</strong> ${formatDate(item.data)}</p>
                <p><strong>Atendente:</strong> ${item.atendente}</p>
                <p><strong>Serviço:</strong> ${item.servico}</p>
                <p><strong>Local:</strong> ${item.cidade} - ${item.estado}</p>
            </div>
            
            <p class="price-value">${formatCurrency(item.valor)}</p>
            
            <div class="attendance-actions">
                ${isPago ? `
                <button class="btn btn-warning" style="padding: 0.5rem 1rem; font-size: 0.9rem;" onclick="togglePaymentStatus(${item.id}, '${item.status}')" title="Revogar Pagamento">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                    Revogar
                </button>
                ` : `
                <button class="btn btn-success" style="padding: 0.5rem 1rem; font-size: 0.9rem;" onclick="togglePaymentStatus(${item.id}, '${item.status}')" title="Marcar como Pago">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Pagar
                </button>
                `}
                
                <button class="btn-action btn-edit" onclick="editAtendimento(${item.id})" title="Editar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </button>
                <button class="btn-action btn-delete" onclick="deleteAtendimento(${item.id})" title="Excluir">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

async function togglePaymentStatus(id, currentStatus) {
    const newStatus = currentStatus === 'Pago' ? 'Não Pago' : 'Pago';
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (response.ok) {
            fetchData();
        } else {
            alert('Erro ao alterar o status.');
        }
    } catch (error) {
        console.error('Erro na requisição de alteração de status:', error);
    }
}

function editAtendimento(id) {
    window.location.href = `index.html?id=${id}`;
}

async function deleteAtendimento(id) {
    if (confirm('Tem certeza que deseja excluir este atendimento?')) {
        try {
            const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            if (res.ok) {
                // Remove localmente sem precisar de novo fetch para otimização
                globalAtendimentos = globalAtendimentos.filter(a => a.id !== id);
                applyFilters();
            } else {
                alert('Erro ao excluir atendimento.');
            }
        } catch (error) {
            console.error('Erro na requisição de delete:', error);
        }
    }
}

function renderChart(dados) {
    const ctx = document.getElementById('chartAtendimentos');
    if (!ctx) return;

    // Agrupar por atendente
    const contagemPorAtendente = {};
    dados.forEach(item => {
        if (!contagemPorAtendente[item.atendente]) {
            contagemPorAtendente[item.atendente] = 0;
        }
        contagemPorAtendente[item.atendente]++;
    });

    const labels = Object.keys(contagemPorAtendente);
    const dataValues = Object.values(contagemPorAtendente);

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Número de Atendimentos',
                data: dataValues,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 159, 64, 0.8)'
                ],
                hoverBackgroundColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderColor: 'hsla(0, 12%, 75%, 0.20)',
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: { color: '#a0aec0' },
                    grid: { color: 'hsla(0, 22%, 97%, 0.05)' }
                },
                y: { 
                    beginAtZero: true, 
                    ticks: { precision: 0, color: '#a0aec0' },
                    grid: { color: 'hsla(0, 22%, 97%, 0.05)' }
                }
            }
        }
    });
}

// ========================================
// TELA 3: ATENDENTES
// ========================================
async function fetchAtendentes() {
    try {
        const res = await fetch(API_ATENDENTES);
        const data = await res.json();
        
        // Popula o datalist se estiver na página de cadastro
        const datalist = document.getElementById('lista-atendentes');
        if (datalist) {
            datalist.innerHTML = '';
            data.forEach(a => {
                const option = document.createElement('option');
                option.value = a.nome;
                datalist.appendChild(option);
            });
        }
        
        // Renderiza a lista se estiver na página de atendentes
        const listContainer = document.getElementById('atendentes-list');
        if (listContainer) {
            listContainer.innerHTML = '';
            if (data.length === 0) {
                listContainer.innerHTML = '<div class="empty-message">Nenhum atendente cadastrado.</div>';
                return;
            }
            data.forEach(item => {
                const card = document.createElement('div');
                card.className = 'card attendance-card';
                card.style.padding = '1rem';
                card.innerHTML = `
                    <button class="btn-action btn-delete" onclick="deleteAtendente(${item.id})" title="Excluir" style="top: 50%; transform: translateY(-50%); right: 1rem;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                    <h3 class="card-title" style="margin-bottom: 0; border: none; padding: 0;">${item.nome}</h3>
                `;
                listContainer.appendChild(card);
            });
        }
    } catch (error) {
        console.error("Erro ao buscar atendentes", error);
    }
}

function initAtendentes() {
    const form = document.getElementById('form-atendente');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('nome-atendente').value.trim();
        if (!nome) return;
        
        try {
            const res = await fetch(API_ATENDENTES, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome })
            });
            if (res.ok) {
                showToast('Atendente cadastrado!');
                form.reset();
                fetchAtendentes();
            } else {
                showToast('Erro ao salvar.', true);
            }
        } catch (error) {
            showToast('Erro de conexão.', true);
        }
    });
}

async function deleteAtendente(id) {
    if (confirm('Tem certeza que deseja excluir este atendente?')) {
        try {
            const res = await fetch(`${API_ATENDENTES}/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchAtendentes();
            } else {
                alert('Erro ao excluir atendente.');
            }
        } catch (error) {
            console.error(error);
        }
    }
}

// Iniciar scripts ao carregar o DOM
document.addEventListener('DOMContentLoaded', () => {
    initCadastro();
    initControle();
    initAtendentes();
    fetchAtendentes();
});
