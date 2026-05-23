// ======================================================
// SINTAXEHUB - APP.JS
// CONTROLE GERAL DA APLICAÇÃO
// ======================================================

document.addEventListener('DOMContentLoaded', async () => {

    try {

        // Inicializa banco local
        if (typeof inicializarBanco === 'function') {
            await inicializarBanco();
        }

        // Carrega CIAP
        carregarDatalistCIAP();

        // Atualiza dashboard
        atualizarDashboard();

        // Atualiza notificações
        atualizarCentralAvisos();

        // Carrega banco automaticamente
        carregarTabelaBanco();

    } catch (erro) {

        console.error('Erro na inicialização:', erro);

        mostrarToast('Erro ao iniciar sistema.');

    }

});

// ======================================================
// NAVEGAÇÃO
// ======================================================

function navigate(view) {

    // Esconde views
    document.querySelectorAll('.view').forEach(v => {
        v.style.display = 'none';
    });

    // Remove ativo menu
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Mostra tela
    const tela = document.getElementById('view-' + view);

    if (tela) {
        tela.style.display = 'block';
    }

    // Ativa menu
    const menu = [...document.querySelectorAll('.nav-link')]
        .find(el => el.getAttribute('onclick')?.includes(view));

    if (menu) {
        menu.classList.add('active');
    }

    // Eventos específicos
    switch(view) {

        case 'inicio':
            atualizarDashboard();
            break;

        case 'banco':
            carregarTabelaBanco();
            break;

        case 'prontuario':
            carregarDatalistCIAP();
            break;
    }

}

// ======================================================
// CIAP-2
// ======================================================

function carregarDatalistCIAP() {

    const lista = document.getElementById('listaCIAP');

    if (!lista) return;

    lista.innerHTML = '';

    const catalogo = window.CATALOGO_CIAPS2 || {};

    Object.entries(catalogo).forEach(([codigo, descricao]) => {

        const option = document.createElement('option');

        option.value = `${codigo} - ${descricao}`;

        lista.appendChild(option);

    });

}

// ======================================================
// TABELA DO BANCO
// ======================================================

async function carregarTabelaBanco() {

    const container = document.getElementById('tabelaBancoContainer');

    if (!container) return;

    container.innerHTML = `
        <p style="color:var(--text-muted);">
            Carregando registros...
        </p>
    `;

    try {

        let pacientes = [];

        // Busca IndexedDB
        if (typeof listarPacientes === 'function') {

            pacientes = await listarPacientes();

        } else {

            // fallback localStorage
            pacientes = JSON.parse(
                localStorage.getItem('pacientes') || '[]'
            );

        }

        if (!pacientes || pacientes.length === 0) {

            container.innerHTML = `
                <p style="color:var(--text-muted);">
                    Nenhum cidadão cadastrado.
                </p>
            `;

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
                        <th>Ações</th>
                    </tr>
                </thead>

                <tbody>

                    ${pacientes.map(p => `

                        <tr>

                            <td>${p.nomePaciente || '-'}</td>

                            <td>${p.cpfPaciente || '-'}</td>

                            <td>${p.telPaciente || '-'}</td>

                            <td>${p.unidadePaciente || '-'}</td>

                            <td>${p.equipePaciente || '-'}</td>

                            <td>

                                <button
                                    class="btn-table-action btn-edit"
                                    onclick="editarPaciente('${p.id}')"
                                >
                                    Editar
                                </button>

                                <button
                                    class="btn-table-action btn-del"
                                    onclick="excluirPaciente('${p.id}')"
                                >
                                    Excluir
                                </button>

                            </td>

                        </tr>

                    `).join('')}

                </tbody>

            </table>
        `;

    } catch (erro) {

        console.error(erro);

        container.innerHTML = `
            <p style="color:#ef4444; font-weight:bold;">
                Erro ao carregar IndexedDB.
            </p>
        `;

    }

}

// ======================================================
// DASHBOARD
// ======================================================

function atualizarDashboard() {

    try {

        const pacientes = JSON.parse(
            localStorage.getItem('pacientes') || '[]'
        );

        document.getElementById('dashHAS').innerText =
            pacientes.filter(p => p.hasSN === 'Sim').length;

        document.getElementById('dashDM').innerText =
            pacientes.filter(p => p.dmSN === 'Sim').length;

        document.getElementById('dashGest').innerText =
            pacientes.filter(p => p.gestanteSN === 'Sim').length;

        document.getElementById('dashTB').innerText =
            pacientes.filter(p => p.tbSN).length;

        document.getElementById('dashHansen').innerText =
            pacientes.filter(p => p.hansenSN).length;

    } catch(e) {

        console.error(e);

    }

}

// ======================================================
// CENTRAL DE AVISOS
// ======================================================

function atualizarCentralAvisos() {

    try {

        const pacientes = JSON.parse(
            localStorage.getItem('pacientes') || '[]'
        );

        const criticos = pacientes.filter(p => {

            return (
                p.hasClassif?.includes('CRÍTICA') ||
                p.dmClassif?.includes('DESCONTROLADO')
            );

        });

        document.getElementById('contadorAvisosSininho')
            .innerText = criticos.length;

    } catch(e) {

        console.error(e);

    }

}

// ======================================================
// TOAST
// ======================================================

function mostrarToast(msg) {

    const toast = document.getElementById('toastNotification');

    if (!toast) return;

    toast.innerText = msg;

    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);

}

// ======================================================
// LOGOUT
// ======================================================

function efetuarLogout() {

    document.getElementById('app').style.display = 'none';

    document.getElementById('loginScreen').style.display = 'flex';

}

// ======================================================
// PLACEHOLDERS
// ======================================================

function editarPaciente(id) {

    mostrarToast('Abrindo prontuário...');

}

function excluirPaciente(id) {

    if (!confirm('Deseja excluir este cidadão?')) return;

    let pacientes = JSON.parse(
        localStorage.getItem('pacientes') || '[]'
    );

    pacientes = pacientes.filter(p => p.id != id);

    localStorage.setItem(
        'pacientes',
        JSON.stringify(pacientes)
    );

    carregarTabelaBanco();

    atualizarDashboard();

    mostrarToast('Registro excluído.');

}
