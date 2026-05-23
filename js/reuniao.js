// ======================================================
// SINTAXEHUB - REUNIAO.JS
// PAUTA E ATA DE REUNIÃO DE EQUIPE
// ======================================================

function abrirModuloReuniao() {
    carregarHistoricoReunioes();
}

function adicionarItemPauta() {
    const lista = document.getElementById('listaItensPauta');

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
            <textarea class="pauta-observacao" rows="2" placeholder="Descreva os pontos discutidos..."></textarea>
        </div>
    `;

    lista.appendChild(item);
}

function adicionarEncaminhamento() {
    const lista = document.getElementById('listaEncaminhamentos');

    const item = document.createElement('div');
    item.className = 'form-grid item-encaminhamento';
    item.style.marginBottom = '10px';

    item.innerHTML = `
        <div style="grid-column: span 2;">
            <label>Ação / Encaminhamento</label>
            <input type="text" class="enc-acao" placeholder="Ex: ACS realizar visita domiciliar">
        </div>

        <div>
            <label>Responsável</label>
            <input type="text" class="enc-responsavel" placeholder="Nome">
        </div>

        <div>
            <label>Prazo</label>
            <input type="date" class="enc-prazo">
        </div>
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

    return {
        id: Date.now(),
        data: document.getElementById('reuniaoData')?.value || '',
        horario: document.getElementById('reuniaoHorario')?.value || '',
        local: document.getElementById('reuniaoLocal')?.value || '',
        coordenador: document.getElementById('reuniaoCoordenador')?.value || '',
        participantes: document.getElementById('reuniaoParticipantes')?.value || '',
        informes: document.getElementById('reuniaoInformes')?.value || '',
        pautas,
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
        mostrarToast('Reunião salva com sucesso.');
    } else {
        alert('Reunião salva com sucesso.');
    }
}

function gerarAtaReuniao(reuniao = null) {
    if (!reuniao) {
        reuniao = coletarDadosReuniao();
    }

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

function copiarAtaReuniao() {
    const campo = document.getElementById('ataReuniaoGerada');

    if (!campo || !campo.value.trim()) {
        gerarAtaReuniao();
    }

    campo.select();
    document.execCommand('copy');

    if (typeof mostrarToast === 'function') {
        mostrarToast('Ata copiada.');
    } else {
        alert('Ata copiada.');
    }
}

function limparFormularioReuniao() {
    document.querySelectorAll('#view-reuniao input, #view-reuniao textarea').forEach(el => {
        el.value = '';
    });

    document.getElementById('listaItensPauta').innerHTML = '';
    document.getElementById('listaEncaminhamentos').innerHTML = '';
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
                            <button class="btn-table-action btn-edit" onclick="visualizarReuniao(${r.id})">
                                Ver ata
                            </button>
                            <button class="btn-table-action btn-del" onclick="excluirReuniao(${r.id})">
                                Excluir
                            </button>
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

    if (!reuniao) return;

    gerarAtaReuniao(reuniao);
}

function excluirReuniao(id) {
    if (!confirm('Deseja excluir esta reunião?')) return;

    let historico = JSON.parse(localStorage.getItem('reunioesEquipe') || '[]');
    historico = historico.filter(r => r.id !== id);

    localStorage.setItem('reunioesEquipe', JSON.stringify(historico));

    carregarHistoricoReunioes();
}

// Expor globalmente
window.abrirModuloReuniao = abrirModuloReuniao;
window.adicionarItemPauta = adicionarItemPauta;
window.adicionarEncaminhamento = adicionarEncaminhamento;
window.salvarReuniaoEquipe = salvarReuniaoEquipe;
window.gerarAtaReuniao = gerarAtaReuniao;
window.copiarAtaReuniao = copiarAtaReuniao;
window.limparFormularioReuniao = limparFormularioReuniao;
window.carregarHistoricoReunioes = carregarHistoricoReunioes;
window.visualizarReuniao = visualizarReuniao;
window.excluirReuniao = excluirReuniao;

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('listaItensPauta')) adicionarItemPauta();
    if (document.getElementById('listaEncaminhamentos')) adicionarEncaminhamento();
    carregarHistoricoReunioes();
});
