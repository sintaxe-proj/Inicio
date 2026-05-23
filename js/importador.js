let dadosImportadosTemp = [];

async function processarArquivoEsus(input) {
    const file = input.files[0];
    if (!file) return;

    const nome = file.name.toLowerCase();

    try {
        if (nome.endsWith('.json')) {
            dadosImportadosTemp = await lerJSON(file);
        } else if (nome.endsWith('.xml')) {
            dadosImportadosTemp = await lerXML(file);
        } else if (nome.endsWith('.xlsx') || nome.endsWith('.xls')) {
            dadosImportadosTemp = await lerXLSX(file);
        } else if (nome.endsWith('.pdf')) {
            dadosImportadosTemp = await lerPDF(file);
        } else {
            mostrarToast('❌ Formato não suportado.');
            return;
        }

        abrirModalConferenciaImportacao();
        input.value = '';

    } catch (err) {
        console.error(err);
        mostrarToast('❌ Erro ao processar arquivo.');
    }
}

async function lerJSON(file) {
    const texto = await file.text();
    const json = JSON.parse(texto);
    const lista = Array.isArray(json) ? json : [json];

    return lista.map(normalizarPaciente);
}

async function lerXML(file) {
    const texto = await file.text();
    const xml = new DOMParser().parseFromString(texto, 'text/xml');

    const registros = Array.from(
        xml.querySelectorAll('paciente, cidadao, cadastro, registro')
    );

    if (!registros.length) {
        return [];
    }

    return registros.map(reg => normalizarPaciente({
        nome: reg.querySelector('nome, nomePaciente, nomeCompleto')?.textContent || '',
        cpf: reg.querySelector('cpf, cpfPaciente')?.textContent || '',
        telefone: reg.querySelector('telefone, celular, telPaciente')?.textContent || '',
        unidade: reg.querySelector('ubs, unidade, unidadePaciente')?.textContent || '',
        equipe: reg.querySelector('equipe, equipePaciente')?.textContent || ''
    }));
}

async function lerXLSX(file) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const linhas = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    return linhas.map(normalizarPaciente);
}

async function lerPDF(file) {
    const buffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
        data: buffer
    }).promise;

    let texto = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        texto += content.items.map(item => item.str).join(' ') + '\n';
    }

    return extrairPacientesTextoPDF(texto);
}

function extrairPacientesTextoPDF(texto) {
    const linhas = texto.split(/\n|;/).map(l => l.trim()).filter(Boolean);

    const pacientes = [];

    linhas.forEach(linha => {
        const cpfMatch = linha.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);

        if (cpfMatch) {
            pacientes.push(normalizarPaciente({
                nome: linha.replace(cpfMatch[0], '').trim(),
                cpf: cpfMatch[0],
                telefone: '',
                unidade: '',
                equipe: '',
                textoOriginal: linha
            }));
        }
    });

    return pacientes;
}

function normalizarPaciente(item) {
    return {
        nomePaciente:
            item.nomePaciente ||
            item.nome ||
            item.nomeCompleto ||
            item.NOME ||
            item.Nome ||
            '',

        cpfPaciente:
            item.cpfPaciente ||
            item.cpf ||
            item.CPF ||
            '',

        telPaciente:
            item.telPaciente ||
            item.telefone ||
            item.celular ||
            item.Telefone ||
            item.CELULAR ||
            '',

        unidadePaciente:
            item.unidadePaciente ||
            item.unidade ||
            item.ubs ||
            item.UBS ||
            '',

        equipePaciente:
            item.equipePaciente ||
            item.equipe ||
            item.EQUIPE ||
            '',

        reavaliacaoDias:
            item.reavaliacaoDias !== undefined
                ? parseInt(item.reavaliacaoDias)
                : 30,

        origemImportacao: 'Importação e-SUS / Universal',
        criadoEm: new Date().toISOString()
    };
}

function abrirModalConferenciaImportacao() {
    if (!dadosImportadosTemp.length) {
        mostrarToast('⚠️ Nenhum registro encontrado.');
        return;
    }

    let modal = document.getElementById('modalConferenciaImportacao');

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalConferenciaImportacao';
        modal.className = 'modal';

        modal.innerHTML = `
            <div class="modal-content">
                <h3>📥 Conferência da Importação</h3>
                <p style="color:var(--text-muted); font-size:13px;">
                    Revise os dados antes de inserir no banco.
                </p>

                <div id="previewImportacao" style="max-height:360px; overflow:auto;"></div>

                <div style="margin-top:20px; display:flex; gap:10px; justify-content:flex-end;">
                    <button onclick="fecharModalConferenciaImportacao()">
                        Cancelar
                    </button>

                    <button onclick="confirmarImportacaoBanco()" style="background:var(--primary-neon); color:white; border:none; padding:8px 16px; border-radius:6px;">
                        Confirmar importação
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    modal.style.display = 'flex';
    renderizarPreviewImportacao();
}

function renderizarPreviewImportacao() {
    const container = document.getElementById('previewImportacao');

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>CPF</th>
                    <th>Telefone</th>
                    <th>UBS</th>
                    <th>Equipe</th>
                    <th>Importar?</th>
                </tr>
            </thead>
            <tbody>
                ${dadosImportadosTemp.map((p, i) => `
                    <tr>
                        <td><input value="${p.nomePaciente || ''}" onchange="dadosImportadosTemp[${i}].nomePaciente=this.value"></td>
                        <td><input value="${p.cpfPaciente || ''}" onchange="dadosImportadosTemp[${i}].cpfPaciente=this.value"></td>
                        <td><input value="${p.telPaciente || ''}" onchange="dadosImportadosTemp[${i}].telPaciente=this.value"></td>
                        <td><input value="${p.unidadePaciente || ''}" onchange="dadosImportadosTemp[${i}].unidadePaciente=this.value"></td>
                        <td><input value="${p.equipePaciente || ''}" onchange="dadosImportadosTemp[${i}].equipePaciente=this.value"></td>
                        <td><input type="checkbox" checked onchange="dadosImportadosTemp[${i}].ignorar=!this.checked"></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function confirmarImportacaoBanco() {
    const selecionados = dadosImportadosTemp.filter(p => !p.ignorar);

    if (!selecionados.length) {
        mostrarToast('⚠️ Nenhum registro selecionado.');
        return;
    }

    for (const paciente of selecionados) {
        paciente.id = paciente.id || Date.now() + Math.floor(Math.random() * 99999);

        if (typeof salvarPaciente === 'function') {
            await salvarPaciente(paciente);
        } else {
            const tx = db.transaction(['pacientes'], 'readwrite');
            tx.objectStore('pacientes').put(paciente);
        }
    }

    fecharModalConferenciaImportacao();

    if (typeof carregarTabelaBanco === 'function') {
        carregarTabelaBanco();
    }

    if (typeof atualizarIndicatorsDashboard === 'function') {
        atualizarIndicatorsDashboard();
    }

    if (typeof atualizarCentralAvisosSininho === 'function') {
        atualizarCentralAvisosSininho();
    }

    mostrarToast(`✅ ${selecionados.length} registro(s) importado(s).`);
}

function fecharModalConferenciaImportacao() {
    const modal = document.getElementById('modalConferenciaImportacao');
    if (modal) modal.style.display = 'none';
}

window.processarArquivoEsus = processarArquivoEsus;
