document.addEventListener('DOMContentLoaded', () => {
    carregarDatalistCIAP();

    setTimeout(() => {
        if (typeof atualizarIndicatorsDashboard === 'function') {
            atualizarIndicatorsDashboard();
        }

        if (typeof atualizarCentralAvisosSininho === 'function') {
            atualizarCentralAvisosSininho();
        }
    }, 1000);
});

function navigate(view) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    const tela = document.getElementById('view-' + view);
    if (tela) tela.style.display = 'block';

    const menu = [...document.querySelectorAll('.nav-link')]
        .find(el => el.getAttribute('onclick')?.includes(view));

    if (menu) menu.classList.add('active');

    if (view === 'banco') carregarTabelaBanco();
    if (view === 'prontuario') carregarDatalistCIAP();
}

function carregarDatalistCIAP() {
    const lista = document.getElementById('listaCIAP');
    const catalogo = window.CATALOGO_CIAPS2 || {};

    if (!lista) return;

    lista.innerHTML = '';

    Object.entries(catalogo).forEach(([codigo, descricao]) => {
        const option = document.createElement('option');
        option.value = `${codigo} - ${descricao}`;
        lista.appendChild(option);
    });
}

async function carregarTabelaBanco() {
    const container = document.getElementById('tabelaBancoContainer');
    if (!container) return;

    container.innerHTML = `<p style="color:var(--text-muted);">Carregando registros...</p>`;

    try {
        let pacientes = [];

        if (typeof listarTodosProntuarios === 'function') {
            pacientes = await listarTodosProntuarios();
        } else if (typeof listarTodosPacientes === 'function') {
            pacientes = await listarTodosPacientes();
        } else if (typeof listarPacientes === 'function') {
            pacientes = await listarPacientes();
        } else if (typeof buscarTodosPacientes === 'function') {
            pacientes = await buscarTodosPacientes();
        } else if (typeof db !== 'undefined' && db) {
            pacientes = await new Promise((resolve, reject) => {
                const tx = db.transaction(['pacientes'], 'readonly');
                const store = tx.objectStore('pacientes');
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => reject(req.error);
            });
        }

        if (!pacientes || pacientes.length === 0) {
            container.innerHTML = `<p style="color:var(--text-muted);">Nenhum cidadão cadastrado.</p>`;
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>CPF</th>
                        <th>Telefone</th>
                        <th>UBS</th>
                        <th>Equipe</th>
                    </tr>
                </thead>
                <tbody>
                    ${pacientes.map(p => `
                        <tr>
                            <td>${p.nomePaciente || p.nome || p.nomeCompleto || '-'}</td>
                            <td>${p.cpfPaciente || p.cpf || '-'}</td>
                            <td>${p.telPaciente || p.telefone || p.celular || '-'}</td>
                            <td>${p.unidadePaciente || p.unidade || p.ubs || '-'}</td>
                            <td>${p.equipePaciente || p.equipe || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

    } catch (erro) {
        console.error('Erro ao carregar Base Territorial:', erro);
        container.innerHTML = `<p style="color:#ef4444;font-weight:bold;">Erro ao carregar a Base Territorial.</p>`;
    }
}

function mostrarToast(msg) {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;

    toast.innerText = msg;
    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function efetuarLogout() {
    document.getElementById('app').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
}
