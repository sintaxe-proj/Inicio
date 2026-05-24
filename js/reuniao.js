// ======================================================
// SINTAXEHUB - REUNIAO.JS
// REUNIÃO DE EQUIPE + DISCUSSÃO DE CASOS
// ======================================================

let pacientesReuniao = [];

async function abrirModuloReuniao() {
    await carregarPacientesParaDiscussao();
    carregarHistoricoReunioes();
}

async function carregarPacientesParaDiscussao() {
    const select = document.getElementById('reuniaoPacienteCaso');
    if (!select) return;

    select.innerHTML = '<option value="">Carregando pacientes...</option>';

    try {
        if (typeof listarPacientes === 'function') {
            pacientesReuniao = await listarPacientes();
        } else if (typeof listarTodosPacientes === 'function') {
            pacientesReuniao = await listarTodosPacientes();
        } else {
            pacientesReuniao = [];
        }

        select.innerHTML = '<option value="">-- Selecione um paciente --</option>';

        pacientesReuniao.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = `${p.nomePaciente || p.nome || 'Sem nome'} - ${p.cpfPaciente || p.cpf || 'Sem CPF'}`;
            select.appendChild(option);
        });

    } catch (erro) {
        console.error('Erro ao carregar pacientes:', erro);
        select.innerHTML = '<option value="">Erro ao carregar pacientes</option>';
    }
}

function adicionarItemPauta() {
    const lista = document.getElementById('listaItensPauta');
    if (!lista) return;

    const item = document.createElement('div');
    item.className = 'form-grid item-pauta';
    item.style.marginBottom = '10px';

    item.innerHTML = `
        <div style="grid-column: span 3;">
            <label>Tema da pauta</label>
            <input type="text" class="pauta-tema" placeholder="Ex: Busca ativa de hipertensos críticos">
        </div>

        <div>
            <label>Prioridade</label>
            <select class="pauta-prioridade">
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
                <option value="Crítica">Crítica</option>
            </select>
        </div>

        <div style="grid-column: span 4;">
            <label>Discussão / Observações</label>
            <textarea class="pauta-observacao" rows="2"></textarea>
        </div>
    `;

    lista.appendChild(item);
}

function adicionarEncaminhamento() {
    const lista = document.getElementById('listaEncaminhamentos');
    if (!lista) return;

    const item = document.createElement('div');
    item.className = 'form-grid item-encaminhamento';
    item.style.marginBottom = '10px';

    item.innerHTML = `
        <div style="grid-column: span 2;">
            <label>Ação / Encaminhamento</label>
            <input type="text" class="enc-acao">
        </div>

        <div>
            <label>Responsável</label>
            <input type="text" class="enc-responsavel">
        </div>

        <div>
            <label>Prazo</label>
            <input type="date" class="enc-prazo">
        </div>
    `;

    lista.appendChild(item);
}

async function registrarDiscussaoCasoNoProntuario() {
    const pacienteId = document.getElementById('reuniaoPacienteCaso')?.value;
    const discussao = document.getElementById('reuniaoDiscussaoCaso')?.value || '';
    const conduta = document.getElementById('reuniaoCondutaCaso')?.value || '';

    if (!pacienteId) {
        alert('Selecione um paciente.');
        return;
    }

    if (!discussao.trim()) {
        alert('Descreva a discussão do caso.');
        return;
    }

    const paciente = pacientesReuniao.find(p => String(p.id) === String(pacienteId));

    if (!paciente) {
        alert('Paciente não encontrado.');
        return;
    }

    const evolucao = {
        id: Date.now(),
        tipo: 'Discussão de caso em reunião de equipe',
        data: new Date().toISOString(),
        subjetivo: 'Discussão realizada em reunião de equipe.',
        objetivo: 'Caso avaliado pela equipe multiprofissional.',
        avaliacao: discussao,
        plano: conduta || 'Conduta a definir conforme equipe.',
        origem: 'Reunião de Equipe'
    };

    if (!Array.isArray(paciente.evolucoes)) {
        paciente.evolucoes = [];
    }

    paciente.evolucoes.push(evolucao);
    paciente.ultimaDiscussaoEquipe = evolucao.data;

    if (typeof salvarPaciente === 'function') {
        await salvarPaciente(paciente);
    } else {
        alert('Função salvarPaciente não encontrada no database.js');
        return;
    }

    adicionarCasoNaAta(paciente, discussao, conduta);

    document.getElementById('reuniaoDiscussaoCaso').value = '';
    document.getElementById('reuniaoCondutaCaso').value = '';

    if (typeof mostrarToast === 'function') {
        mostrarToast('Discussão registrada no prontuário.');
    } else {
        alert('Discussão registrada no prontuário.');
    }
}

function adicionarCasoNaAta(paciente, discussao, conduta) {
    const lista = document.getElementById('listaCasosDiscussao');
    if (!lista) return;

    const item = document.createElement('div');
    item.className = 'item-caso-discutido';
    item.style.background = '#111c2e';
    item.style.border = '1px solid var(--border)';
    item.style.borderRadius = '6px';
    item.style.padding = '10px';
    item.style.marginBottom = '10px';

    item.innerHTML = `
        <strong>${paciente.nomePaciente || paciente.nome || 'Paciente sem nome'}</strong><br>
        <small>CPF: ${paciente.cpfPaciente || paciente.cpf || '-'}</small>
        <p><b>Discussão:</b> ${discussao}</p>
        <p><b>Conduta:</b> ${conduta || '-'}</p>

        <input type="hidden" class="caso-nome" value="${paciente.nomePaciente || paciente.nome || ''}">
        <input type="hidden" class="caso-cpf" value="${paciente.cpfPaciente || paciente.cpf || ''}">
        <input type="hidden" class="caso-discussao" value="${discussao}">
        <input type="hidden" class="caso-conduta" value="${conduta}">
    `;

    lista.appendChild(item);
}

function coletarDadosReuniao() {
    const pautas = Array.from(document.querySelectorAll('.item-pauta')).map(item => ({
        tema: item.querySelector('.pauta-tema')?.value || '',
        prioridade: item.querySelector('.pauta-prioridade')?.value || '',
        observacao: item.querySelector('.pauta-observacao')?.value || ''
    })).filter(p => p.tema.trim() !== '');

    const encaminhamentos = Array.from(document.querySelectorAll('.item-encaminhamento')).map(item => ({
        acao: item.querySelector('.enc-acao')?.value || '',
        responsavel: item.querySelector('.enc-responsavel')?.value || '',
        prazo: item.querySelector('.enc-prazo')?.value || ''
    })).filter(e => e.acao.trim() !== '');

    const casos = Array.from(document.querySelectorAll('.item-caso-discutido')).map(item => ({
        nome: item.querySelector('.caso-nome')?.value || '',
        cpf: item.querySelector('.caso-cpf')?.value || '',
        discussao: item.querySelector('.caso-discussao')?.value || '',
        conduta: item.querySelector('.caso-conduta')?.value || ''
    }));

    return {
        id: Date.now(),
        data: document.getElementById('reuniaoData')?.value || '',
        horario: document.getElementById('reuniaoHorario')?.value || '',
        local: document.getElementById('reuniaoLocal')?.value || '',
        coordenador: document.getElementById('reuniaoCoordenador')?.value || '',
        participantes: document.getElementById('reuniaoParticipantes')?.value || '',
        informes: document.getElementById('reuniaoInformes')?.value || '',
        pautas,
        casos,
        encaminhamentos,
        consideracoes: document.getElementById('reuniaoConsideracoes')?.value || '',
        criadoEm: new Date().toISOString()
    };
}

function salvarReuniaoEquipe() {
    const reuniao = coletarDadosReuniao();

    if (!reuniao.data) {
        alert('Informe a data da reunião.');
        return;
    }

    const historico = JSON.parse(localStorage.getItem('reunioesEquipe') || '[]');
    historico.push(reuniao);
    localStorage.setItem('reunioesEquipe', JSON.stringify(historico));

    gerarAtaReuniao(reuniao);
    carregarHistoricoReunioes();

    if (typeof mostrarToast === 'function') {
        mostrarToast('Reunião salva.');
    }
}

function gerarAtaReuniao(reuniao = null) {
    if (!reuniao) reuniao = coletarDadosReuniao();

    const ata = `
ATA / PAUTA DE REUNIÃO DE EQUIPE

Data: ${reuniao.data || '-'}
Horário: ${reuniao.horario || '-'}
Local: ${reuniao.local || '-'}
Coordenação: ${reuniao.coordenador || '-'}

PARTICIPANTES:
${reuniao.participantes || '-'}

INFORMES GERAIS:
${reuniao.informes || '-'}

PAUTAS DISCUTIDAS:
${reuniao.pautas.length ? reuniao.pautas.map((p, i) => `
${i + 1}. ${p.tema}
Prioridade: ${p.prioridade}
Observações: ${p.observacao || '-'}
`).join('\n') : '-'}

DISCUSSÃO DE CASOS:
${reuniao.casos.length ? reuniao.casos.map((c, i) => `
${i + 1}. ${c.nome}
CPF: ${c.cpf || '-'}
Discussão: ${c.discussao}
Conduta: ${c.conduta || '-'}
`).join('\n') : '-'}

ENCAMINHAMENTOS:
${reuniao.encaminhamentos.length ? reuniao.encaminhamentos.map((e, i) => `
${i + 1}. ${e.acao}
Responsável: ${e.responsavel || '-'}
Prazo: ${e.prazo || '-'}
`).join('\n') : '-'}

CONSIDERAÇÕES FINAIS:
${reuniao.consideracoes || '-'}
    `.trim();

    const saida = document.getElementById('ataReuniaoGerada');
    if (saida) saida.value = ata;
}

function imprimirAtaReuniao() {
    gerarAtaReuniao();

    const ata = document.getElementById('ataReuniaoGerada')?.value || '';

    const janela = window.open('', '_blank');

    janela.document.write(`
        <html>
        <head>
            <title>Ata de Reunião de Equipe</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 30px;
                    line-height: 1.5;
                    color: #111;
                }
                h1 {
                    text-align: center;
                    font-size: 20px;
                }
                pre {
                    white-space: pre-wrap;
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <h1>Ata de Reunião de Equipe</h1>
            <pre>${ata}</pre>
        </body>
        </html>
    `);

    janela.document.close();
    janela.print();
}

function copiarAtaReuniao() {
    const campo = document.getElementById('ataReuniaoGerada');

    if (!campo.value.trim()) gerarAtaReuniao();

    campo.select();
    document.execCommand('copy');

    if (typeof mostrarToast === 'function') {
        mostrarToast('Ata copiada.');
    }
}

function limparFormularioReuniao() {
    document.querySelectorAll('#view-reuniao input, #view-reuniao textarea').forEach(el => {
        el.value = '';
    });

    document.getElementById('listaItensPauta').innerHTML = '';
    document.getElementById('listaEncaminhamentos').innerHTML = '';
    document.getElementById('listaCasosDiscussao').innerHTML = '';
    document.getElementById('ataReuniaoGerada').value = '';

    adicionarItemPauta();
    adicionarEncaminhamento();
}

function carregarHistoricoReunioes() {
    const container = document.getElementById('historicoReunioes');
    if (!container) return;

    const historico = JSON.parse(localStorage.getItem('reunioesEquipe') || '[]');

    if (historico.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);">Nenhuma reunião registrada ainda.</p>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Horário</th>
                    <th>Local</th>
                    <th>Coordenação</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${historico.slice().reverse().map(r => `
                    <tr>
                        <td>${r.data || '-'}</td>
                        <td>${r.horario || '-'}</td>
                        <td>${r.local || '-'}</td>
                        <td>${r.coordenador || '-'}</td>
                        <td>
                            <button class="btn-table-action btn-edit" onclick="visualizarReuniao(${r.id})">Ver ata</button>
                            <button class="btn-table-action btn-edit" onclick="imprimirAtaHistorico(${r.id})">Imprimir</button>
                            <button class="btn-table-action btn-del" onclick="excluirReuniao(${r.id})">Excluir</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function visualizarReuniao(id) {
    const historico = JSON.parse(localStorage.getItem('reunioesEquipe') || '[]');
    const reuniao = historico.find(r => r.id === id);
    if (reuniao) gerarAtaReuniao(reuniao);
}

function imprimirAtaHistorico(id) {
    visualizarReuniao(id);
    imprimirAtaReuniao();
}

function excluirReuniao(id) {
    if (!confirm('Deseja excluir esta reunião?')) return;

    let historico = JSON.parse(localStorage.getItem('reunioesEquipe') || '[]');
    historico = historico.filter(r => r.id !== id);

    localStorage.setItem('reunioesEquipe', JSON.stringify(historico));

    carregarHistoricoReunioes();
}

window.abrirModuloReuniao = abrirModuloReuniao;
window.adicionarItemPauta = adicionarItemPauta;
window.adicionarEncaminhamento = adicionarEncaminhamento;
window.registrarDiscussaoCasoNoProntuario = registrarDiscussaoCasoNoProntuario;
window.salvarReuniaoEquipe = salvarReuniaoEquipe;
window.gerarAtaReuniao = gerarAtaReuniao;
window.imprimirAtaReuniao = imprimirAtaReuniao;
window.copiarAtaReuniao = copiarAtaReuniao;
window.limparFormularioReuniao = limparFormularioReuniao;
window.visualizarReuniao = visualizarReuniao;
window.imprimirAtaHistorico = imprimirAtaHistorico;
window.excluirReuniao = excluirReuniao;

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('listaItensPauta')) adicionarItemPauta();
    if (document.getElementById('listaEncaminhamentos')) adicionarEncaminhamento();
    carregarHistoricoReunioes();
});
async function salvarReuniaoEquipe() {

    const usuarioAtual =
        await supabaseClient.auth.getUser();

    if (
        usuarioAtual.error ||
        !usuarioAtual.data.user
    ) {

        alert("Faça login novamente.");
        return;

    }

    const usuario = usuarioAtual.data.user;

    const reuniao = {

        usuario_id: usuario.id,

        data_reuniao:
            document.getElementById("reuniaoData")?.value || "",

        horario:
            document.getElementById("reuniaoHorario")?.value || "",

        local:
            document.getElementById("reuniaoLocal")?.value || "",

        coordenador:
            document.getElementById("reuniaoCoordenador")?.value || "",

        participantes:
            document.getElementById("reuniaoParticipantes")?.value || "",

        informes:
            document.getElementById("reuniaoInformes")?.value || "",

        pautas:
            JSON.stringify(window.listaPautas || []),

        discussoes:
            JSON.stringify(window.listaCasos || []),

        encaminhamentos:
            JSON.stringify(window.listaEncaminhamentos || []),

        consideracoes:
            document.getElementById("reuniaoConsideracoes")?.value || ""

    };

    const resultado =
        await supabaseClient
            .from("reunioes")
            .insert([reuniao]);

    if (resultado.error) {

        console.error(resultado.error);

        alert("Erro ao salvar reunião.");
        return;

    }

    mostrarToast("✅ Reunião salva.");

}
