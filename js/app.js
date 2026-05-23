// Dicionário de Mensagens Padrão para Busca Ativa Territorial via WhatsApp
const SCRIPTS_WHATSAPP_APS = {
    "has_critico": "Olá! Aqui é da sua Equipe de Saúde da Família. Notamos que o seu monitoramento de Pressão Arterial precisa ser atualizado. Poderia comparecer à UBS esta semana para aferição e avaliação?",
    "dm_controle": "Olá! Tudo bem? Passando para lembrar da necessidade de trazer os seus últimos exames de HbA1c (Glicada) para atualizarmos o seu plano de cuidados na unidade.",
    "pn_rotina": "Olá, mamãe! Estamos aguardando você para a sua próxima consulta programada de Pré-Natal. Não falte, o acompanhamento é fundamental para você e para o bebê!",
    "busca_ativa": "Olá! Tentamos contato recente para acompanhamento de saúde, mas não conseguimos. Por favor, responda a esta mensagem ou passe na UBS para podermos atualizar o seu cadastro municipal."
};

// Inicialização Automática ao Carregar a Página
document.addEventListener("DOMContentLoaded", () => {
    verificarSessao();
});

/* ==========================================================================
   🔐 SEGURANÇA: CONTROLE DE ACESSO E SESSÃO MUNICIPAL
   ========================================================================== */
const USUARIOS_MUNICIPAIS = {
    "5132": { nome: "Enf. Josimar Kapps", perfil: "admin" },
    "123456": { nome: "Dr. Alexandre Silva", perfil: "user" }
};

function autenticarUsuario() {
    const matricula = document.getElementById("loginUser").value;
    const senha = document.getElementById("loginSenha").value;
    const erroDiv = document.getElementById("loginErro");

    if (USUARIOS_MUNICIPAIS[matricula] && senha === "senha123") {
        const user = USUARIOS_MUNICIPAIS[matricula];
        localStorage.setItem("pep_sessao_ativa", JSON.stringify(user));
        erroDiv.style.display = "none";
        verificarSessao();
        
        // Inicializa os dados do ecossistema após login
        inicializarAutocompleteCIAP();
        atualizarCentralAvisosSininho();
    } else {
        erroDiv.innerText = "Matrícula ou senha inválida no cadastro municipal.";
        erroDiv.style.display = "block";
    }
}

function verificarSessao() {
    const sessao = localStorage.getItem("pep_sessao_ativa");
    if (sessao) {
        const user = JSON.parse(sessao);
        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("app").style.display = "block";
        document.getElementById("nomeUsuarioLogado").innerText = `👤 ${user.nome}`;

        const seletorAcesso = document.getElementById("seletorNivelAcesso");
        if (user.perfil === "admin") {
            seletorAcesso.style.display = "inline-block";
            document.getElementById("btnAuditoria").style.display = "inline-block";
        } else {
            seletorAcesso.style.display = "none";
            document.getElementById("btnAuditoria").style.display = "none";
        }
        navigate('inicio');
    } else {
        document.getElementById("loginScreen").style.display = "flex";
        document.getElementById("app").style.display = "none";
    }
}

function BowserSessao() {
    localStorage.removeItem("pep_sessao_ativa");
    window.location.reload();
}

function efetuarLogout() {
    localStorage.removeItem("pep_sessao_ativa");
    window.location.reload();
}

function alternarVisaoGestor(perfil) {
    const btnAuditoria = document.getElementById("btnAuditoria");
    if (perfil === "admin") {
        btnAuditoria.style.display = "inline-block";
        mostrarToast("🔄 Mudança para Perfil de Gestor/Coordenador.");
    } else {
        btnAuditoria.style.display = "none";
        if (document.getElementById("view-config").style.display === "block") {
            navigate('inicio');
        }
        mostrarToast("🔄 Mudança para Perfil Assistencial.");
    }
}

/* ==========================================================================
   🗺️ ROTAS NATIVAS E COMPORTAMENTO DE TELA
   ========================================================================== */
function navigate(viewName) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    const viewAlvo = document.getElementById(`view-${viewName}`);
    if (viewAlvo) viewAlvo.style.display = 'block';

    const linkAtivo = Array.from(document.querySelectorAll('.nav-link')).find(l => l.innerText.toLowerCase().includes(viewName === 'prontuario' ? 'novo' : viewName));
    if (linkAtivo) linkAtivo.classList.add('active');

    if (viewName === 'banco') listarTodosBanco();
}

function mostrarCard(id, valor) {
    document.getElementById(id).style.display = (valor === "Sim") ? "block" : "none";
}

/* ==========================================================================
   🧬 MOTOR DE AUTOCOMPLETAR: INTEGRALIZAÇÃO DO CATÁLOGO CIAP-2
   ========================================================================== */
function inicializarAutocompleteCIAP() {
    const datalist = document.getElementById("listaCIAP");
    if (!datalist) return;

    if (typeof CATALOGO_CIAPS2 === "undefined") {
        console.error("Erro: CATALOGO_CIAPS2 não está acessível no escopo global.");
        return;
    }

    datalist.innerHTML = "";
    Object.entries(CATALOGO_CIAPS2).forEach(([codigo, descricao]) => {
        const option = document.createElement("option");
        option.value = `${codigo} - ${descricao}`;
        datalist.appendChild(option);
    });
    console.log(`🧬 Autocomplete CIAP-2 carregado: ${Object.keys(CATALOGO_CIAPS2).length} códigos cadastrados.`);
}

/* ==========================================================================
   🩺 LÓGICA CLÍNICA E SUPORTE DINÂMICO AO REGISTRO S.O.A.P.
   ========================================================================== */

/**
 * Alterna a visibilidade da caixa de texto detalhada para o exame físico alterado
 */
function alternarExameFisico(status) {
    const bloco = document.getElementById("blocoExameAlterado");
    if (status === "Alterado") {
        bloco.style.display = "block";
        document.getElementById("soapObjetivoAlterado").focus();
    } else {
        bloco.style.display = "none";
        document.getElementById("soapObjetivoAlterado").value = "";
    }
}

function calcIdade() {
    const nasc = document.getElementById("nascPaciente").value;
    if (!nasc) return;
    const hoje = new Date();
    const dataNasc = new Date(nasc);
    let idade = hoje.getFullYear() - dataNasc.getFullYear();
    const m = hoje.getMonth() - dataNasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) {
        idade--;
    }
    document.getElementById("idadePaciente").value = idade;
    document.getElementById("ampiBloco").style.display = (idade >= 60) ? "block" : "none";
}

function classificarHAS() {
    const pas = parseInt(document.getElementById("hasPAS").value);
    const pad = parseInt(document.getElementById("hasPAD").value);
    const campo = document.getElementById("hasClassif");

    if (!pas || !pad) { campo.value = ""; return; }

    if (pas >= 180 || pad >= 110) { campo.value = "Crise Hipertensiva (Prioridade Máxima)"; campo.style.color = "var(--danger)"; }
    else if (pas >= 140 || pad >= 90) { campo.value = "Hipertensão Estágio 1 ou 2 (Descontrolada)"; campo.style.color = "var(--warning)"; }
    else { campo.value = "Pressão Controlada / Alvo Terapêutico"; campo.style.color = "var(--success)"; }
}

function classificarDM() {
    const hba1c = parseFloat(document.getElementById("dmHbA1c").value);
    const campo = document.getElementById("dmClassif");

    if (!hba1c) { campo.value = ""; return; }

    if (hba1c >= 8.0) { campo.value = "Controle Metabólico Ruim (Alto Risco)"; campo.style.color = "var(--danger)"; }
    else if (hba1c >= 7.0) { campo.value = "Controle Limítrofe"; campo.style.color = "var(--warning)"; }
    else { campo.value = "Excelente Controle Glicêmico"; campo.style.color = "var(--success)"; }
}

function calcIG() {
    const dum = document.getElementById("gestDUM").value;
    if (!dum) return;
    const dataDum = new Date(dum);
    const hoje = new Date();
    
    const diffTime = Math.abs(hoje - dataDum);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const semanas = Math.floor(diffDays / 7);
    const dias = diffDays % 7;

    document.getElementById("gestIG").value = `${semanas} Semanas e ${dias} Dias`;

    const dpp = new Date(dataDum);
    dpp.setDate(dpp.getDate() + 280);
    document.getElementById("gestDPP").value = dpp.toLocaleDateString('pt-BR');
}

/* ==========================================================================
   📍 GEOLOCALIZAÇÃO: CONSUMO INTEGRADO DA API VIACEP
   ========================================================================== */
function buscarCEP() {
    const cep = document.getElementById("CEP").value.replace(/\D/g, '');
    if (cep.length !== 8) return;

    document.getElementById("endPaciente").value = "Buscando endereço nos servidores dos Correios...";

    fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(res => res.json())
        .then(dados => {
            if (!dados.erro) {
                document.getElementById("endPaciente").value = `${dados.logradouro}, ${dados.bairro}, ${dados.localidade} - ${dados.uf}`;
                document.getElementById("endNumero").focus();
            } else {
                document.getElementById("endPaciente").value = "";
                mostrarToast("❌ CEP não localizado na base nacional.");
            }
        })
        .catch(() => {
            document.getElementById("endPaciente").value = "";
            mostrarToast("⚠️ Falha de conexão ao validar o CEP.");
        });
}

/* ==========================================================================
   🔔 CENTRAL DE AVISOS TERRITORIAIS (SISTEMA DE MONITORAMENTO)
   ========================================================================== */

/**
 * Varre o banco local e atualiza o contador e a cor do sininho se houver reavaliação para 0 dias
 */
function atualizarCentralAvisosSininho() {
    if (!db) return;

    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.getAll();

    request.onsuccess = function() {
        const todosPacientes = request.result;
        // Filtra os utentes que possuem o contador de reavaliação em exatamente 0
        const expirados = todosPacientes.filter(p => p.reavaliacaoDias !== undefined && parseInt(p.reavaliacaoDias) === 0);

        const contador = document.getElementById("contadorAvisosSininho");
        const container = document.getElementById("centralAvisosContainer");
        
        if (contador && container) {
            contador.innerText = expirados.length;
            
            if (expirados.length > 0) {
                container.style.background = "var(--danger)";
                container.style.animation = "pulse 1.5s infinite";
                container.title = `${expirados.length} Cidadãos precisam de reavaliação imediata da equipe!`;
            } else {
                container.style.background = "#334155";
                container.style.animation = "none";
                container.title = "Nenhuma pendência crítica de prazos no território.";
            }
        }
    };
}

/* ==========================================================================
   💾 OPERAÇÕES DE PERSISTÊNCIA: GRAVAÇÃO E TRATAMENTO DE ATENDIMENTOS
   ========================================================================== */

function salvarProntuario() {
    const cpf = document.getElementById("cpfPaciente").value;
    const nome = document.getElementById("nomePaciente").value;

    if (!cpf || !nome) {
        mostrarToast("❌ Erro: O preenchimento do Nome e do CPF é obrigatório.");
        return;
    }

    // Coleta do Registro Clínico Estruturado (S.O.A.P.)
    const sub = document.getElementById("soapSubjetivo").value;
    
    // Novos campos estruturados da Seção O - Objetivo (Sinais Vitais)
    const pa = document.getElementById("objPA").value;
    const fc = document.getElementById("objFC").value;
    const fr = document.getElementById("objFR").value;
    const sat = document.getElementById("objSatO2").value;
    const dor = document.getElementById("objDor").value;

    const exameStatus = document.querySelector('input[name="exameFisicoStatus"]:checked').value;
    const exameDetalhe = document.getElementById("soapObjetivoAlterado");
    
    const ciap = document.getElementById("inputBuscaCIAPS").value;
    const plano = document.getElementById("soapPlanoConduta").value;
    const diasPrazo = document.getElementById("soapReavaliacaoDias").value;

    const exameFisicoTexto = exameStatus === "Normal" ? "Normal / Sem particularidades" : `ALTERADO: ${exameDetalhe}`;

    // Concatenação formatada da evolução para persistência na Linha do Tempo histórica
    const novaEvolucaoFormatada = `--- ATENDIMENTO MUNICIPAL EM ${new Date().toLocaleDateString('pt-BR')} ---\n` +
                                  `S: ${sub || "Sem queixas registradas."}\n` +
                                  `O: [SSVV -> PA: ${pa || 'N/I'} | FC: ${fc || 'N/I'} bpm | FR: ${fr || 'N/I'} irpm | SatO₂: ${sat || 'N/I'}% | Dor: ${dor}/10]\n` +
                                  `   Exame Físico Geral: ${exameFisicoTexto}\n` +
                                  `A: CIAP-2 Selecionado: ${ciap || "Não classificado."}\n` +
                                  `P: Plano de Cuidados: ${plano || "Conduta padrão."} | Reavaliação: em ${diasPrazo} dias.`;

    // Resgata se o paciente já possui histórico para acumular evoluções
    const transactionBuscar = db.transaction(["pacientes"], "readonly");
    const storeBuscar = transactionBuscar.objectStore("pacientes");
    const requestBuscar = storeBuscar.get(cpf);

    requestBuscar.onsuccess = function() {
        let historicoEvolucoes = [];
        if (requestBuscar.result && requestBuscar.result.historicoEvolucoes) {
            historicoEvolucoes = requestBuscar.result.historicoEvolucoes;
        }
        historicoEvolucoes.unshift(novaEvolucaoFormatada); // Adiciona a mais recente no início

        // Montagem do payload completo do Utente com os sinais vitais persistidos individualmente
        const pacientePayload = {
            cpf: cpf,
            nome: nome,
            nasc: document.getElementById("nascPaciente").value,
            idade: document.getElementById("idadePaciente").value,
            tel: document.getElementById("telPaciente").value,
            cep: document.getElementById("CEP").value,
            endereco: document.getElementById("endPaciente").value,
            numero: document.getElementById("endNumero").value,
            complemento: document.getElementById("endComplemento").value,
            ubs: document.getElementById("unidadePaciente").value,
            equipe: document.getElementById("equipePaciente").value,
            
            has: document.getElementById("hasSN").value,
            pas: document.getElementById("hasPAS").value,
            pad: document.getElementById("hasPAD").value,
            classifHas: document.getElementById("hasClassif").value,
            
            dm: document.getElementById("dmSN").value,
            hba1c: document.getElementById("dmHbA1c").value,
            classifDm: document.getElementById("dmClassif").value,
            
            gestante: document.getElementById("gestanteSN").value,
            dum: document.getElementById("gestDUM").value,
            ig: document.getElementById("gestIG").value,
            dpp: document.getElementById("gestDPP").value,
            
            tb: document.getElementById("tbSN").checked ? "Sim" : "Não",
            hansen: document.getElementById("hansenSN").checked ? "Sim" : "Não",
            ampi: document.getElementById("ampiPaciente").value,
            
            // Persistência dos campos de Sinais Vitais no objeto
            objPA: pa,
            objFC: fc,
            objFR: fr,
            objSatO2: sat,
            objDor: dor,
            exameFisicoStatus: exameStatus,
            soapObjetivoAlterado: exameDetalhe,
            
            reavaliacaoDias: parseInt(diasPrazo) || 0, // Metadado indexador do sininho
            historicoEvolucoes: historicoEvolucoes
        };

        const transactionSalvar = db.transaction(["pacientes"], "readwrite");
        const storeSalvar = transactionSalvar.objectStore("pacientes");
        const requestSalvar = storeSalvar.put(pacientePayload);

        requestSalvar.onsuccess = function() {
            mostrarToast("💾 Prontuário SOAP gravado na base territorial!");
            atualizarCentralAvisosSininho();
            navigate('inicio');
        };
    };
}

function limparFormularioProntuario() {
    // Limpeza dos inputs de texto e áreas estruturadas SOAP
    document.getElementById("soapSubjetivo").value = "";
    
    // Limpeza da grade de sinais vitais e exame físico
    document.getElementById("objPA").value = "";
    document.getElementById("objFC").value = "";
    document.getElementById("objFR").value = "";
    document.getElementById("objSatO2").value = "";
    document.getElementById("objDor").value = "0";
    document.querySelector('input[name="exameFisicoStatus"][value="Normal"]').checked = true;
    document.getElementById("blocoExameAlterado").style.display = "none";
    document.getElementById("soapObjetivoAlterado").value = "";
    
    document.getElementById("soapPlanoConduta").value = "";
    document.getElementById("soapReavaliacaoDias").value = "0";
    document.getElementById("inputBuscaCIAPS").value = "";

    // Campos cadastrais e de endereço
    const campos = ["nomePaciente", "cpfPaciente", "nascPaciente", "idadePaciente", "telPaciente", "CEP", "endPaciente", "endNumero", "endComplemento", "hasPAS", "hasPAD", "hasClassif", "dmHbA1c", "dmClassif", "gestDUM", "gestIG", "gestDPP"];
    campos.forEach(c => document.getElementById(c).value = "");

    document.getElementById("hasSN").value = "Não";
    document.getElementById("dmSN").value = "Não";
    document.getElementById("gestanteSN").value = "Não";
    document.getElementById("tbSN").checked = false;
    document.getElementById("hansenSN").checked = false;
    document.getElementById("unidadePaciente").value = "";
    document.getElementById("equipePaciente").value = "";
    document.getElementById("ampiPaciente").value = "Idoso Robusto";

    document.getElementById("cardHAS").style.display = "none";
    document.getElementById("cardDM").style.display = "none";
    document.getElementById("cardGestante").style.display = "none";
    document.getElementById("ampiBloco").style.display = "none";
    document.getElementById("cabecalhoProntuario").style.display = "none";
    
    document.getElementById("linhaTempoEvolucoes").innerHTML = "";
}

/* ==========================================================================
   📊 VIGILÂNCIA EPIDEMIOLÓGICA & ATUALIZAÇÃO DO DASHBOARD CENTRAL
   ========================================================================== */

function listarTodosBanco() {
    if (!db) return;
    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.getAll();

    request.onsuccess = function() {
        const dados = request.result;
        const container = document.getElementById("tabelaBancoContainer");

        if (dados.length === 0) {
            container.innerHTML = `<p style="color:#64748b;">Nenhum prontuário residente no banco local.</p>`;
            return;
        }

        let html = `
            <table>
                <thead>
                    <tr>
                        <th>Nome do Utente</th>
                        <th>CPF</th>
                        <th>Idade</th>
                        <th>UBS Vinculada</th>
                        <th>Linhas Ativas</th>
                        <th>Prazo (Dias)</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;

        dados.forEach(p => {
            let linhas = [];
            if (p.has === "Sim") linhas.push("HAS");
            if (p.dm === "Sim") linhas.push("DM");
            if (p.gestante === "Sim") linhas.push("PN");
            if (p.tb === "Sim") linhas.push("TB");
            if (p.hansen === "Sim") linhas.push("HANSEN");

            const badgePrazo = p.reavaliacaoDias === 0 ? `<b style="color:var(--danger)">🔔 0 Dias</b>` : `${p.reavaliacaoDias} Dias`;

            html += `
                <tr>
                    <td><strong>${p.nome}</strong></td>
                    <td>${p.cpf}</td>
                    <td>${p.idade} Anos</td>
                    <td>${p.ubs || "Não informada"}</td>
                    <td>${linhas.join(", ") || "Nenhuma"}</td>
                    <td>${badgePrazo}</td>
                    <td class="action-buttons">
                        <button class="btn-table-action btn-edit" onclick="abrirAtendimentoExistente('${p.cpf}')">Abrir</button>
                        <button class="btn-table-action btn-del" onclick="removerPacienteDoTerritorio('${p.cpf}')">Excluir</button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    };
}

/* ==========================================================================
   📈 MODAL ANALYTICS: MONITORAMENTO EM SAÚDE DA FAMÍLIA
   ========================================================================== */
let linhaCuidadoAtualVisualizacao = "has";

function abrirPainelEpidemiologico(linhaCuidado) {
    linhaCuidadoAtualVisualizacao = linhaCuidado;
    document.getElementById("painelEpidemiologicoContainer").style.display = "block";
    
    const titulos = {
        has: "Monitoramento Territorial: Hipertensão Arterial Sistêmica (HAS)",
        dm: "Monitoramento Territorial: Diabetes Mellitus (DM)",
        gestante: "Monitoramento Territorial: Vigilância de Pré-Natal (Cegonha)",
        tuberculose: "Monitoramento Epidemiológico: Tuberculose",
        hanseniase: "Monitoramento Epidemiológico: Hanseníase",
        criticos: "🚨 Central de Alertas Rápidos: Utentes com Prazo Expirado (0 Dias)"
    };
    
    document.getElementById("tituloPainelEpidemiologico").innerText = titulos[linhaCuidado] || "Vigilância em Saúde";
    carregarFiltrosModalUBS();
}

function fecharPainelEpidemiologico() {
    document.getElementById("painelEpidemiologicoContainer").style.display = "none";
}

function carregarFiltrosModalUBS() {
    const ubsSelect = document.getElementById("filtroUBS");
    const equipeSelect = document.getElementById("filtroEquipe");
    
    ubsSelect.innerHTML = "<option value='TODAS'>Todas as Unidades</option><option value='UBS Centro Médico'>UBS Centro Médico</option><option value='UBS Vila Nova'>UBS Vila Nova</option><option value='Clínica da Família Zona Sul'>Clínica da Família Zona Sul</option><option value='UBS Integrada Norte'>UBS Integrada Norte</option>";
    equipeSelect.innerHTML = "<option value='TODAS'>Todas as Equipes</option><option value='Equipe Verde'>Equipe Verde</option><option value='Equipe Azul'>Equipe Azul</option><option value='Equipe Esmeralda'>Equipe Esmeralda</option><option value='Equipe Rubi'>Equipe Rubi</option>";
    
    document.getElementById("filtroRisco").value = "TODOS";
    aplicarFiltrosRelatorio();
}

function aplicarFiltrosRelatorio() {
    if (!db) return;
    const ubs = document.getElementById("filtroUBS").value;
    const equipe = document.getElementById("filtroEquipe").value;
    const risco = document.getElementById("filtroRisco").value;

    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.getAll();

    request.onsuccess = function() {
        let filtrados = request.result;

        // Filtro por Linha de Cuidado / Sininho Crítico
        if (linhaCuidadoAtualVisualizacao === "has") filtrados = filtrados.filter(p => p.has === "Sim");
        else if (linhaCuidadoAtualVisualizacao === "dm") filtrados = filtrados.filter(p => p.dm === "Sim");
        else if (linhaCuidadoAtualVisualizacao === "gestante") filtrados = filtrados.filter(p => p.gestante === "Sim");
        else if (linhaCuidadoAtualVisualizacao === "tuberculose") filtrados = filtrados.filter(p => p.tb === "Sim");
        else if (linhaCuidadoAtualVisualizacao === "hanseniase") filtrados = filtrados.filter(p => p.hansen === "Sim");
        else if (linhaCuidadoAtualVisualizacao === "criticos") filtrados = filtrados.filter(p => p.reavaliacaoDias === 0);

        // Filtros de Localidade/UBS/Equipe
        if (ubs !== "TODAS") filtrados = filtrados.filter(p => p.ubs === ubs);
        if (equipe !== "TODAS") filtrados = filtrados.filter(p => p.equipe === equipe);
        
        // Filtros Rápidos de Risco
        if (risco === "CRITICO") filtrados = filtrados.filter(p => p.reavaliacaoDias === 0);
        else if (risco === "CONTROLADO") filtrados = filtrados.filter(p => p.reavaliacaoDias > 0);

        // Renderiza Gráficos Nativos SVG/CSS baseados nos filtrados
        renderizarGraficosModal(filtrados);

        // Constrói tabela interna do modal
        const tabela = document.getElementById("tabelaPainelEpidemiologico");
        if (filtrados.length === 0) {
            tabela.innerHTML = "<p style='color:#64748b; padding:10px;'>Nenhum utente localizado sob estes critérios de filtro territorial.</p>";
            return;
        }

        let html = "<table><thead><tr><th>Nome</th><th>CPF</th><th>UBS</th><th>Equipe</th><th>Monitoramento</th></tr></thead><tbody>";
        filtrados.forEach(p => {
            html += `<tr>
                <td><b>${p.nome}</b></td>
                <td>${p.cpf}</td>
                <td>${p.ubs || "Pendente"}</td>
                <td>${p.equipe || "Pendente"}</td>
                <td>${p.reavaliacaoDias === 0 ? "🚨 Reavaliação Urgente" : `Acompanhamento em ${p.reavaliacaoDias}d`}</td>
            </tr>`;
        });
        html += "</tbody></table>";
        tabela.innerHTML = html;
    };
}

function renderizarGraficosModal(lista) {
    const total = lista.length;
    const criticos = lista.filter(p => p.reavaliacaoDias === 0).length;
    const controlados = total - criticos;
    
    const pctCritico = total > 0 ? Math.round((criticos / total) * 100) : 0;

    // Donut de Criticidade
    document.getElementById("containerGraficoDonut").innerHTML = `
        <div class="donut-wrapper">
            <svg width="100%" height="100%" viewBox="0 0 42 42" class="donut-svg">
                <circle class="donut-bg" cx="21" cy="21" r="15.915"></circle>
                <circle class="donut-segment" cx="21" cy="21" r="15.915" stroke="var(--danger)" stroke-dasharray="${pctCritico} ${100 - pctCritico}" stroke-dashoffset="0"></circle>
            </svg>
            <div class="donut-center-text">
                <span class="donut-number">${pctCritico}%</span>
                <span class="donut-label">Críticos</span>
            </div>
        </div>
    `;

    // Barras de Volumetria
    document.getElementById("containerGraficoBarras").innerHTML = `
        <div class="bar-chart-container">
            <div class="bar-row">
                <div class="bar-label"><span>Críticos (0 Dias)</span><span>${criticos} Utentes</span></div>
                <div class="bar-track"><div class="bar-fill" style="width: ${pctCritico}%; background: var(--danger)"></div></div>
            </div>
            <div class="bar-row" style="margin-top:10px;">
                <div class="bar-label"><span>Controlados / Monitorados</span><span>${controlados} Utentes</span></div>
                <div class="bar-track"><div class="bar-fill" style="width: ${total > 0 ? 100 - pctCritico : 0}%; background: var(--success)"></div></div>
            </div>
        </div>
    `;
}

/* ==========================================================================
   ⚙️ GESTÃO DE ESTRESSE DE MEMÓRIA & INTEROPERABILIDADE ACADÉMICA
   ========================================================================== */
function gerarCargaMassaOitoMil() {
    if (!confirm("Esta ação injetará 8.000 cadastros simulados com strings SOAP completas no seu IndexedDB local para testes de latência. Continuar?")) return;
    
    mostrarToast("⏳ Processando matriz de dados... Aguarde.");
    
    const nomesFalsos = ["Ana", "Bruno", "Carlos", "Daniela", "Eduardo", "Fernanda", "Gabriel", "Helena", "Igor", "Juliana"];
    const sobrenomesFalsos = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Almeida", "Pereira", "Lima", "Costa"];
    const ubsFalsas = ["UBS Centro Médico", "UBS Vila Nova", "Clínica da Família Zona Sul", "UBS Integrada Norte"];
    const equipesFalsas = ["Equipe Verde", "Equipe Azul", "Equipe Esmeralda", "Equipe Rubi"];

    const transaction = db.transaction(["pacientes"], "readwrite");
    const store = transaction.objectStore("pacientes");

    for (let i = 0; i < 8000; i++) {
        const cpfSimulado = `999.${String(i).padStart(3, '0')}.778-${String(i % 100).padStart(2, '0')}`;
        const nomeCompleto = `${nomesFalsos[i % 10]} ${sobrenomesFalsos[(i + 3) % 10]} ${sobrenomesFalsos[(i + 7) % 10]}`;
        const prazoSimulado = i % 15 === 0 ? 0 : Math.floor(Math.random() * 90) + 1;

        const payload = {
            cpf: cpfSimulado,
            nome: nomeCompleto,
            nasc: "1985-06-15",
            idade: "41",
            tel: "(21) 98888-7711",
            cep: "20000-000",
            endereco: "Avenida Central do Município Simulador",
            numero: String(i),
            complemento: "Lote Acadêmico",
            ubs: ubsFalsas[i % 4],
            equipe: equipesFalsas[i % 4],
            has: i % 2 === 0 ? "Sim" : "Não",
            pas: i % 2 === 0 ? "145" : "",
            pad: i % 2 === 0 ? "95" : "",
            classifHas: i % 2 === 0 ? "Hipertensão Estágio 1 ou 2" : "",
            dm: i % 3 === 0 ? "Sim" : "Não",
            hba1c: i % 3 === 0 ? "7.5" : "",
            classifDm: i % 3 === 0 ? "Controle Limítrofe" : "",
            gestante: "Não",
            tb: "Não",
            hansen: "Não",
            ampi: "Idoso Robusto",
            
            objPA: i % 2 === 0 ? "140x90" : "120x80",
            objFC: "76",
            objFR: "16",
            objSatO2: "98",
            objDor: "0",
            exameFisicoStatus: "Normal",
            soapObjetivoAlterado: "",

            reavaliacaoDias: prazoSimulado,
            historicoEvolucoes: [
                `--- ATENDIMENTO SIMULADO DE ESTRESSE DE MEMÓRIA (LOTE ${i}) ---\nS: Sem queixas aparentes.\nO: [SSVV -> PA: 120x80 | FC: 76 bpm] Exame Físico Normal.\nA: Registro inserido via robô de simulação acadêmica municipal.\nP: Manter monitoramento do território. Prazo: ${prazoSimulado} dias.`
            ]
        };
        store.put(payload);
    }

    transaction.oncomplete = function() {
        mostrarToast("🚀 Injeção de 8.000 cadastros concluída com sucesso!");
        atualizarIndicatorsDashboard();
        atualizarCentralAvisosSininho();
        if (document.getElementById("view-banco").style.display === "block") listarTodosBanco();
    };
}

function processarArquivoEsus(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dadosImportados = JSON.parse(e.target.result);
            if (!dadosImportados.cpf || !dadosImportados.nome) {
                mostrarToast("❌ Falha de interoperabilidade: Estrutura inválida ou sem CPF.");
                return;
            }

            const transaction = db.transaction(["pacientes"], "readwrite");
            const store = transaction.objectStore("pacientes");
            
            if (dadosImportados.reavaliacaoDias !== undefined) {
                dadosImportados.reavaliacaoDias = parseInt(dadosImportados.reavaliacaoDias);
            } else {
                dadosImportados.reavaliacaoDias = 30;
            }

            store.put(dadosImportados);

            transaction.oncomplete = function() {
                mostrarToast(`📥 Cidadão ${dadosImportados.nome} importado para a base!`);
                atualizarIndicatorsDashboard();
                atualizarCentralAvisosSininho();
                input.value = "";
            };
        } catch (err) {
            mostrarToast("❌ Erro ao decodificar a sintaxe JSON do arquivo e-SUS.");
        }
    };
    reader.readAsText(file);
}

/* ==========================================================================
   📞 CENTRAL OPERACIONAL DE BUSCA ATIVA & MENSAGENS TELEFÓNICAS (WHATSAPP)
   ========================================================================== */
function alternarCentralDiscagem() {
    const painel = document.getElementById("painelDiscagemContainer");
    if (!painel) return;
    
    if (painel.style.display === "block") {
        painel.style.display = "none";
    } else {
        painel.style.display = "block";
        prepararDiscagemPacienteAtivo();
        escutarTecladoDiscador(); // Inicializa o monitor inteligente do input
    }
}

function prepararDiscagemPacienteAtivo() {
    const displayStatus = document.getElementById("statusDiscadorPaciente");
    const nomeAtivo = document.getElementById("nomePaciente").value;
    const telAtivo = document.getElementById("telPaciente").value;

    if (!displayStatus) return;

    if (nomeAtivo && telAtivo) {
        displayStatus.innerHTML = `
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px;">
                <p style="margin: 0; font-size: 11px; color: #166534; font-weight: bold;">👤 Utente Ativo no Prontuário:</p>
                <strong style="font-size: 13px; color: #14532d; display:block;">${nomeAtivo}</strong>
                <span style="font-size: 12px; color: #166534;">📞 Contato: ${telAtivo}</span>
            </div>
        `;
    } else {
        displayStatus.innerHTML = `<em style="color:#94a3b8; font-size:12px;">Nenhum paciente selecionado no prontuário. Digite abaixo para pesquisar no território.</em>`;
    }
}

/**
 * Transforma o campo do discador numa barra de filtragem e envio um por um
 */
function escutarTecladoDiscador() {
    const inputDiscador = document.getElementById("inputNumeroDiscador");
    if (!inputDiscador) return;

    inputDiscador.addEventListener("input", () => {
        const termo = inputDiscador.value.toLowerCase().trim();
        const displayStatus = document.getElementById("statusDiscadorPaciente");
        
        if (!displayStatus) return;

        if (!termo) {
            prepararDiscagemPacienteAtivo();
            return;
        }

        // Se for inserção manual de um número telefónico avulso longo
        if (/^\d+$/.test(termo) && termo.length > 5) {
            renderizarCardMensagemUnica("Usuário Manual", termo, displayStatus);
            return;
        }

        // Busca Ativa Multicritério dentro do Widget
        const transaction = db.transaction(["pacientes"], "readonly");
        const store = transaction.objectStore("pacientes");
        const request = store.getAll();

        request.onsuccess = function() {
            const todosPacientes = request.result;
            const termoNumerico = termo.replace(/\D/g, "");

            const desejaCritico = termo.includes("critico") || termo.includes("crítico");
            const desejaHAS = termo.includes("has") || termo.includes("hipertens");
            const desejaDM = termo.includes("dm") || termo.includes("diabet");
            const desejaPN = termo.includes("pn") || termo.includes("gestant");

            const filtrados = todosPacientes.filter(p => {
                if (desejaHAS && p.has !== "Sim") return false;
                if (desejaDM && p.dm !== "Sim") return false;
                if (desejaPN && p.gestante !== "Sim") return false;
                if (desejaCritico && p.reavaliacaoDias !== 0) return false;

                const temFiltroClinico = desejaHAS || desejaDM || desejaPN || desejaCritico;
                if (!temFiltroClinico) {
                    const nomeBate = p.nome.toLowerCase().includes(termo);
                    const cpfLimpo = p.cpf.replace(/\D/g, "");
                    const cpfBate = termoNumerico !== "" && cpfLimpo.includes(termoNumerico);
                    return nomeBate || cpfBate;
                }
                return true;
            });

            if (filtrados.length === 0) {
                displayStatus.innerHTML = `<p style="color:var(--danger); font-size:12px; margin:5px 0;">Nenhum contacto localizado.</p>`;
                return;
            }

            // Renderiza um por um com ferramentas individuais de WhatsApp
            let htmlContatos = `<div style="max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 4px;">`;
            
            filtrados.forEach((p, index) => {
                const foneLimpo = p.tel ? p.tel.replace(/\D/g, '') : '';
                const prazoTexto = p.reavaliacaoDias === 0 ? '⚠️ CRÍTICO' : `⏱️ ${p.reavaliacaoDias}d`;
                const corStatus = p.reavaliacaoDias === 0 ? '#b91c1c' : '#475569';

                htmlContatos += `
                    <div class="card-wpp-individual" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 6px; text-align: left;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <strong style="font-size: 13px; color: #1e293b; display: block;">${p.nome}</strong>
                                <span style="font-size: 11px; color: #64748b;">📞 Tel: ${p.tel || 'Não cadastrado'}</span>
                            </div>
                            <span style="font-size: 10px; font-weight: bold; background: ${corStatus}; color: white; padding: 2px 6px; border-radius: 4px;">${prazoTexto}</span>
                        </div>
                        
                        ${p.tel ? `
                            <select id="selectMsg_${index}" onchange="atualizarTextoMensagem(${index})" style="width: 100%; font-size: 11px; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px; background: white; color: #334155;">
                                <option value="">-- Selecione uma Mensagem Padrão --</option>
                                <option value="has_critico">🚨 Alerta de HAS Crítico</option>
                                <option value="dm_controle">🩺 Solicitação de Exames DM</option>
                                <option value="pn_rotina">🤰 Agendamento de Pré-Natal</option>
                                <option value="busca_ativa">🏃 Busca Ativa Geral</option>
                                <option value="custom">✍️ Criar Nova Mensagem / Texto Livre</option>
                            </select>

                            <textarea id="textMsg_${index}" placeholder="Selecione um padrão ou escreva a mensagem personalizada..." style="width: 100%; height: 50px; font-size: 11px; padding: 5px; border: 1px solid #cbd5e1; border-radius: 4px; resize: none; font-family: sans-serif;"></textarea>

                            <button onclick="enviarWhatsAppTerritorial('${foneLimpo}', ${index})" style="background: #25d366; color: white; border: none; padding: 6px; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                                💬 Enviar via WhatsApp
                            </button>
                        ` : `
                            <span style="font-size: 11px; color: var(--danger); font-weight: 500;">🚫 Sem telefone no prontuário.</span>
                        `}
                    </div>
                `;
            });

            htmlContatos += `</div>`;
            displayStatus.innerHTML = htmlContatos;
        };
    });
}

function atualizarTextoMensagem(index) {
    const seletor = document.getElementById(`selectMsg_${index}`);
    const areaTexto = document.getElementById(`textMsg_${index}`);
    
    if (!seletor || !areaTexto) return;

    const chave = seletor.value;
    if (chave && chave !== "custom") {
        areaTexto.value = SCRIPTS_WHATSAPP_APS[chave];
    } else {
        areaTexto.value = "";
        if (chave === "custom") areaTexto.focus();
    }
}

function enviarWhatsAppTerritorial(telefonePuro, index) {
    const areaTexto = document.getElementById(`textMsg_${index}`);
    if (!areaTexto) return;

    const mensagem = encodeURIComponent(areaTexto.value.trim());
    
    if (!mensagem) {
        mostrarToast("⚠️ Insira uma mensagem válida antes de enviar.");
        return;
    }

    let telefoneFinal = telefonePuro;
    if (telefoneFinal.length === 11 || telefoneFinal.length === 10) {
        telefoneFinal = "55" + telefoneFinal;
    }

    const urlApiWhatsApp = `https://api.whatsapp.com/send?phone=${telefoneFinal}&text=${mensagem}`;
    window.open(urlApiWhatsApp, '_blank');
}

function renderizarCardMensagemUnica(nome, telefone, container) {
    container.innerHTML = `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 6px; text-align: left;">
            <strong style="font-size:12px; color:#1e293b;">📞 Discagem Manual Externa</strong>
            <span style="font-size:11px; color:#64748b;">Número: ${telefone}</span>
            <textarea id="textMsg_manual" placeholder="Escreva a mensagem personalizada para este número..." style="width: 100%; height: 50px; font-size: 11px; padding: 5px; border: 1px solid #cbd5e1; border-radius: 4px; resize: none;"></textarea>
            <button onclick="enviarWhatsAppTerritorial('${telefone}', 'manual')" style="background: #25d366; color: white; border: none; padding: 6px; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; width: 100%;">
                💬 Enviar para Número Avulso
            </button>
        </div>
    `;
}

/* ==========================================================================
   🍞 UTILS: UI INTERFACE NOTIFICATIONS & MASCARAS
   ========================================================================== */
function mostrarToast(mensagem) {
    const toast = document.getElementById("toastNotification");
    if (!toast) return;
    toast.innerText = mensagem;
    toast.style.display = "block";
    setTimeout(() => { toast.style.display = "none"; }, 3500);
}

function mascaraCPF(campo) {
    let v = campo.value.replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    campo.value = v;
}
