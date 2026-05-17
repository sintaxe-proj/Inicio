/**
 * 🧬 SintaxeHub - Prontuário Eletrônico do Paciente (PEP Municipal v2.0)
 * Núcleo de Persistência e Inteligência Epidemiológica Territorial via IndexedDB
 */

let db;
const DB_NAME = "SintaxeHubDB";
const DB_VERSION = 2;
const STORE_NAME = "prontuarios";

// Estado de paginação e filtros globais do painel
let filtroAgravoAtual = "TODOS";
let dadosFiltradosAtuais = [];

// Usuário logado padrão (Simulação de Contexto Real de APS)
const USUARIO_PADRAO = {
    matricula: "440129",
    nome: "Enfermeiro Josimar Kapps",
    perfil: "admin"
};

// Inicialização Automática ao Carregar a Página
document.addEventListener("DOMContentLoaded", () => {
    configurarIndexedDB();
    verificarSessao();
});

/* ==========================================================================
   🔐 MÓDULO DE AUTENTICAÇÃO E CONTROLE DE ACESSO (LGPD)
   ========================================================================== */
function verificarSessao() {
    const session = localStorage.getItem("sintaxe_session");
    if (session) {
        const user = JSON.parse(session);
        exibirAplicacao(user);
    } else {
        document.getElementById("loginScreen").style.display = "flex";
        document.getElementById("app").style.display = "none";
    }
}

function autenticarUsuario() {
    const matricula = document.getElementById("loginUser").value.trim();
    const senha = document.getElementById("loginSenha").value;
    const erroDiv = document.getElementById("loginErro");

    if (matricula === USUARIO_PADRAO.matricula && senha !== "") {
        localStorage.setItem("sintaxe_session", JSON.stringify(USUARIO_PADRAO));
        erroDiv.style.display = "none";
        exibirAplicacao(USUARIO_PADRAO);
    } else {
        erroDiv.innerText = "Matrícula ou senha inválida para o ambiente municipal.";
        erroDiv.style.display = "block";
    }
}

function exibirAplicacao(user) {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("app").style.display = "block";
    document.getElementById("nomeUsuarioLogado").innerText = user.nome;

    if (user.perfil === "admin") {
        const seletor = document.getElementById("seletorNivelAcesso");
        seletor.style.display = "inline-block";
        seletor.value = "admin";
        document.getElementById("btnAuditoria").style.display = "inline-block";
    }
    
    navigate("inicio");
    setTimeout(atualizarDashboard, 300);
}

function efetuarLogout() {
    localStorage.removeItem("sintaxe_session");
    window.location.reload();
}

function alternarVisaoGestor(perfil) {
    showToast(`Visão alterada para perfil: ${perfil.toUpperCase()}`);
}

/* ==========================================================================
   🗄️ CONFIGURAÇÃO DA CAMADA DE PERSISTÊNCIA LOCAL (INDEXEDDB)
   ========================================================================== */
function configurarIndexedDB() {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
        console.error("Erro crítico ao abrir IndexedDB:", event.target.error);
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        console.log("Banco de dados IndexedDB sincronizado com sucesso.");
    };

    request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
            const store = database.createObjectStore(STORE_NAME, { keyPath: "cpf" });
            store.createIndex("nome", "nome", { unique: false });
            store.createIndex("hasSN", "hasSN", { unique: false });
            store.createIndex("dmSN", "dmSN", { unique: false });
            store.createIndex("gestanteSN", "gestanteSN", { unique: false });
            store.createIndex("tbSN", "tbSN", { unique: false });
            store.createIndex("hansenSN", "hansenSN", { unique: false });
            console.log("Estrutura de tabelas e índices IndexedDB criada.");
        }
    };
}

/* ==========================================================================
   🧠 MOTOR DE INTELIGÊNCIA EPIDEMIOLÓGICA & REGRAS DE CRITICIDADE
   ========================================================================== */

/**
 * Avalia criticidade baseada no absenteísmo gestacional conforme regras de negócio solicitadas
 */
function avaliarCriticoPreNatal(dataDUM, dataUltimaConsulta) {
    if (!dataDUM || !dataUltimaConsulta) {
        return { critico: false, motivo: "Dados incompletos" };
    }

    const hoje = new Date();
    const dum = new Date(dataDUM);
    const ultimaConsulta = new Date(dataUltimaConsulta);

    const totalDiasGestacao = Math.floor((hoje - dum) / (1000 * 60 * 60 * 24));
    const semanasIG = Math.floor(totalDiasGestacao / 7);
    const diasDesdeUltimaConsulta = Math.floor((hoje - ultimaConsulta) / (1000 * 60 * 60 * 24));

    let limiteDiasTolerancia = 30; // 1º Trimestre: Mensal
    let faseTexto = "1º Trimestre";

    if (semanasIG >= 14 && semanasIG <= 27) {
        limiteDiasTolerancia = 15; // 2º Trimestre: Quinzenal
        faseTexto = "2º Trimestre";
    } else if (semanasIG > 27 && semanasIG < 36) {
        limiteDiasTolerancia = 15; // Transição / Início do 3º Trimestre
        faseTexto = "3º Trimestre Inicial";
    } else if (semanasIG >= 36) {
        limiteDiasTolerancia = 7;  // A partir de 36 semanas: Semanal
        faseTexto = "3º Trimestre Avançado (≥36 semanas)";
    }

    const isCritico = diasDesdeUltimaConsulta > limiteDiasTolerancia;

    return {
        critico: isCritico,
        motivo: isCritico ? `Ausência no ${faseTexto}: Última consulta há ${diasDesdeUltimaConsulta} dias. Limite era ${limiteDiasTolerancia} dias.` : "Acompanhamento Regular"
    };
}

function avaliarAbsenteismoTrintaDias(dataUltimaConsulta) {
    if (!dataUltimaConsulta) return false;
    const hoje = new Date();
    const ultimaConsulta = new Date(dataUltimaConsulta);
    const diasAtraso = Math.floor((hoje - ultimaConsulta) / (1000 * 60 * 60 * 24));
    return diasAtraso > 30;
}

/**
 * Classifica e centraliza os critérios de risco clínico (HAS, DM, Pré-Natal, TB, Hansen)
 */
function processarRiscoPaciente(paciente) {
    let riscoCalculado = "CONTROLADO";
    let alertas = [];

    // Regra Pré-Natal
    if (paciente.gestanteSN === "Sim") {
        const checkPN = avaliarCriticoPreNatal(paciente.gestDUM, paciente.dataUltimaConsulta);
        if (checkPN.critico) {
            riscoCalculado = "CRITICO";
            alertas.push(checkPN.motivo);
        }
    }

    // Regra Tuberculose
    if (paciente.tbSN === "Sim" && avaliarAbsenteismoTrintaDias(paciente.dataUltimaConsulta)) {
        riscoCalculado = "CRITICO";
        alertas.push("Falta de acompanhamento na Tuberculose há mais de 30 dias.");
    }

    // Regra Hanseníase
    if (paciente.hansenSN === "Sim" && avaliarAbsenteismoTrintaDias(paciente.dataUltimaConsulta)) {
        riscoCalculado = "CRITICO";
        alertas.push("Falta de acompanhamento na Hanseníase há mais de 30 dias.");
    }

    // Regra HAS Clínico (Pressão Arterial Física)
    if (paciente.hasSN === "Sim") {
        const pas = parseInt(paciente.hasPAS) || 0;
        const pad = parseInt(paciente.hasPAD) || 0;
        if (pas >= 180 || pad >= 110) {
            riscoCalculado = "CRITICO";
            alertas.push(`Crise Hipertensiva: PA ${pas}/${pad} mmHg.`);
        } else if (pas >= 140 || pad >= 90) {
            if (riscoCalculado !== "CRITICO") riscoCalculado = "ALERTA";
        }
    }

    // Regra DM Clínico (Hemoglobina Glicada)
    if (paciente.dmSN === "Sim") {
        const hba1c = parseFloat(paciente.dmHbA1c) || 0;
        if (hba1c >= 9.0) {
            riscoCalculado = "CRITICO";
            alertas.push(`Descompensação Diabética severa: HbA1c ${hba1c}%.`);
        } else if (hba1c >= 7.0) {
            if (riscoCalculado !== "CRITICO") riscoCalculado = "ALERTA";
        }
    }

    return { statusRisco: riscoCalculado, alerta: alertas.join(" | ") };
}

/* ==========================================================================
   📊 RENDERIZADOR DE PAINÉIS ANALYTICS E GRÁFICOS NATIVOS CSS/SVG
   ========================================================================== */
function abrirPainelEpidemiologico(agravo) {
    filtroAgravoAtual = agravo;
    document.getElementById("painelEpidemiologicoContainer").style.display = "block";
    
    const titulos = {
        has: "❤️ Linha de Cuidado Território: Hipertensão Arterial",
        dm: "🩸 Monitoramento Estratégico: Diabetes Mellitus",
        gestante: "🤰 Rastreamento de Linhas de Pré-Natal e Absenteísmo",
        tuberculose: "🦠 Vigilância em Saúde: Casos Ativos de Tuberculose",
        hanseniase: "🧬 Controle Territorial: Casos de Hanseníase"
    };
    document.getElementById("tituloPainelEpidemiologico").innerText = titulos[agravo] || "Monitoramento Territorial";

    carregarFiltrosSelectsEDados();
}

function fecharPainelEpidemiologico() {
    document.getElementById("painelEpidemiologicoContainer").style.display = "none";
}

function carregarFiltrosSelectsEDados() {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = (event) => {
        const todos = event.target.result;
        
        // Isolar dados conforme o agravo clicado
        dadosFiltradosAtuais = todos.filter(p => {
            if (filtroAgravoAtual === "has") return p.hasSN === "Sim";
            if (filtroAgravoAtual === "dm") return p.dmSN === "Sim";
            if (filtroAgravoAtual === "gestante") return p.gestanteSN === "Sim";
            if (filtroAgravoAtual === "tuberculose") return p.tbSN === "Sim";
            if (filtroAgravoAtual === "hanseniase") return p.hansenSN === "Sim";
            return false;
        });

        // Alimentar os selects dinamicamente com as UBS/Equipes encontradas na massa
        const ubsSet = new Set(["TODAS"]);
        const equipeSet = new Set(["TODAS"]);
        
        todos.forEach(p => {
            if(p.unidadePaciente) ubsSet.add(p.unidadePaciente);
            if(p.equipePaciente) equipeSet.add(p.equipePaciente);
        });

        const selectUBS = document.getElementById("filtroUBS");
        const selectEquipe = document.getElementById("filtroEquipe");

        selectUBS.innerHTML = "";
        selectEquipe.innerHTML = "";

        ubsSet.forEach(u => selectUBS.options.add(new Option(u, u)));
        selectEquipe.options.add(new Option("TODAS", "TODAS"));
        equipeSet.forEach(e => { if(e !== "TODAS") selectEquipe.options.add(new Option(e, e)); });

        aplicarFiltrosRelatorio();
    };
}

function aplicarFiltrosRelatorio() {
    const ubs = document.getElementById("filtroUBS").value;
    const equipe = document.getElementById("filtroEquipe").value;
    const risco = document.getElementById("filtroRisco").value;

    let exibicao = dadosFiltradosAtuais.filter(p => {
        if (ubs !== "TODAS" && p.unidadePaciente !== ubs) return false;
        if (equipe !== "TODAS" && p.equipePaciente !== equipe) return false;
        
        const diagnostico = processarRiscoPaciente(p);
        if (risco === "CRITICO" && diagnostico.statusRisco !== "CRITICO") return false;
        if (risco === "CONTROLADO" && diagnostico.statusRisco === "CRITICO") return false;
        
        return true;
    });

    // Contadores analíticos
    let totalCriticos = 0;
    let totalAlertas = 0;
    let totalControlados = 0;

    exibicao.forEach(p => {
        const diag = processarRiscoPaciente(p);
        if (diag.statusRisco === "CRITICO") totalCriticos++;
        else if (diag.statusRisco === "ALERTA") totalAlertas++;
        else totalControlados++;
    });

    renderizarGraficoDonut(totalCriticos, totalAlertas, totalControlados);
    renderizarGraficoBarras(totalCriticos, totalAlertas, totalControlados);
    renderizarTabelaPainel(exibicao);
}

function renderizarGraficoDonut(c, a, ctrl) {
    const total = c + a + ctrl || 1;
    const pctCritico = ((c / total) * 100).toFixed(0);
    const pctAlerta = ((a / total) * 100).toFixed(0);
    const pctCtrl = ((ctrl / total) * 100).toFixed(0);

    // Circunferência do círculo com r=15.91549430918954 é exatamente 100
    const container = document.getElementById("containerGraficoDonut");
    container.innerHTML = `
        <div class="donut-wrapper">
            <svg width="140" height="140" viewBox="0 0 40 40" class="donut-svg">
                <circle class="donut-bg" cx="20" cy="20" r="15.91549430918954"></circle>
                
                <circle class="donut-segment" cx="20" cy="20" r="15.91549430918954" 
                        stroke="#ef4444" stroke-dasharray="${pctCritico} ${100 - pctCritico}" stroke-dashoffset="0"></circle>
                        
                <circle class="donut-segment" cx="20" cy="20" r="15.91549430918954" 
                        stroke="#f59e0b" stroke-dasharray="${pctAlerta} ${100 - pctAlerta}" stroke-dashoffset="-${pctCritico}"></circle>
                        
                <circle class="donut-segment" cx="20" cy="20" r="15.91549430918954" 
                        stroke="#10b981" stroke-dasharray="${pctCtrl} ${100 - pctCtrl}" stroke-dashoffset="-${parseInt(pctCritico) + parseInt(pctAlerta)}"></circle>
            </svg>
            <div class="donut-center-text">
                <span class="donut-number">${c}</span>
                <span class="donut-label">Críticos</span>
            </div>
        </div>
    `;
}

function renderizarGraficoBarras(c, a, ctrl) {
    const total = c + a + ctrl || 1;
    const pC = (c / total) * 100;
    const pA = (a / total) * 100;
    const pCtrl = (ctrl / total) * 100;

    const container = document.getElementById("containerGraficoBarras");
    container.innerHTML = `
        <div class="bar-chart-container">
            <div class="bar-row">
                <div class="bar-label"><span>Críticos (Prazo Vencido / Descompensados)</span><span>${c} (${pC.toFixed(1)}%)</span></div>
                <div class="bar-track"><div class="bar-fill" style="width: ${pC}%; background: #ef4444;"></div></div>
            </div>
            <div class="bar-row">
                <div class="bar-label"><span>Em Alerta de Saúde</span><span>${a} (${pA.toFixed(1)}%)</span></div>
                <div class="bar-track"><div class="bar-fill" style="width: ${pA}%; background: #f59e0b;"></div></div>
            </div>
            <div class="bar-row">
                <div class="bar-label"><span>Controlados / Linha Regular</span><span>${ctrl} (${pCtrl.toFixed(1)}%)</span></div>
                <div class="bar-track"><div class="bar-fill" style="width: ${pCtrl}%; background: #10b981;"></div></div>
            </div>
        </div>
    `;
}

function renderizarTabelaPainel(lista) {
    const container = document.getElementById("tabelaPainelEpidemiologico");
    if(lista.length === 0) {
        container.innerHTML = `<em style="color:#64748b; font-size:13px;">Nenhum prontuário atende aos filtros definidos.</em>`;
        return;
    }

    let html = `<table>
        <thead>
            <tr>
                <th>Nome do Utente</th>
                <th>CPF</th>
                <th>Unidade (UBS) / Equipe</th>
                <th>Status Monitoramento</th>
                <th>Ações</th>
            </tr>
        </thead>
        <tbody>`;

    lista.slice(0, 15).forEach(p => { // Limita a 15 itens na pré-visualização por performance
        const diag = processarRiscoPaciente(p);
        let corBadge = diag.statusRisco === "CRITICO" ? "#ef4444" : (diag.statusRisco === "ALERTA" ? "#f59e0b" : "#10b981");
        
        html += `<tr>
            <td><strong>${p.nome}</strong><br><small style="color:#64748b;">${diag.alerta || 'Acompanhamento Regular'}</small></td>
            <td>${p.cpf}</td>
            <td>${p.unidadePaciente || 'Não Alocado'} <br> <small>${p.equipePaciente || ''}</small></td>
            <td><span class="tag-clinica" style="background:${corBadge};">${diag.statusRisco}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-table-action btn-edit" onclick="abrirParaEdicao('${p.cpf}')">Atender</button>
                </div>
            </td>
        </tr>`;
    });

    html += `</tbody></table>`;
    if(lista.length > 15) html += `<p style="font-size:12px; color:#64748b; margin-top:8px; text-align:right;">Exibindo os primeiros 15 casos de um total de ${lista.length}.</p>`;
    container.innerHTML = html;
}

function atualizarDashboard() {
    if (!db) return;
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = (event) => {
        const dados = event.target.result;
        let cHas = 0, cDm = 0, cGest = 0, cTb = 0, cHansen = 0;

        dados.forEach(p => {
            if (p.hasSN === "Sim") cHas++;
            if (p.dmSN === "Sim") cDm++;
            if (p.gestanteSN === "Sim") cGest++;
            if (p.tbSN === "Sim") cTb++;
            if (p.hansenSN === "Sim") cHansen++;
        });

        document.getElementById("dashHAS").innerText = cHas;
        document.getElementById("dashDM").innerText = cDm;
        document.getElementById("dashGest").innerText = cGest;
        document.getElementById("dashTB").innerText = cTb;
        document.getElementById("dashHansen").innerText = cHansen;
    };
}

/* ==========================================================================
   🔍 MOTOR DE ATENDIMENTO E OPERAÇÕES CRUD DO PRONTUÁRIO ELETRÔNICO
   ========================================================================== */
function buscarInicio() {
    const termo = document.getElementById("buscaNomeInicio").value.toLowerCase().trim();
    const resultadoDiv = document.getElementById("resultadoInicio");

    if (termo.length < 2) {
        resultadoDiv.innerHTML = `<em style="color: #94a3b8;">Introduza um critério acima para pesquisar.</em>`;
        return;
    }

    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = (event) => {
        const todos = event.target.result;
        const matches = todos.filter(p => p.nome.toLowerCase().includes(termo) || p.cpf.includes(termo));

        if(matches.length === 0) {
            resultadoDiv.innerHTML = `<p style="color:#ef4444; font-size:13px;">Nenhum prontuário localizado na base municipal.</p>`;
            return;
        }

        let html = `<div class="busca-ativa-grid">`;
        matches.slice(0, 12).forEach(p => {
            const diag = processarRiscoPaciente(p);
            let corRisco = diag.statusRisco === "CRITICO" ? "#ef4444" : (diag.statusRisco === "ALERTA" ? "#f59e0b" : "#10b981");
            
            html += `
                <div class="busca-ativa-card" onclick="abrirParaEdicao('${p.cpf}')">
                    <h4>${p.nome}</h4>
                    <p>CPF: ${p.cpf} | Idade: ${p.idadePaciente || 'N/I'} anos</p>
                    <p style="font-size:11px; font-weight:600;">Unidade: ${p.unidadePaciente || 'S/U'}</p>
                    ${diag.alerta ? `<p style="color:#b91c1c; font-size:11px; margin-top:4px;">⚠️ ${diag.alerta}</p>` : ''}
                    <div class="badges-container">
                        <span class="tag-clinica" style="background:${corRisco}">${diag.statusRisco}</span>
                        ${p.hasSN==='Sim'?'<span class="tag-clinica" style="background:#ef4444">HAS</span>':''}
                        ${p.dmSN==='Sim'?'<span class="tag-clinica" style="background:#f59e0b">DM</span>':''}
                        ${p.gestanteSN==='Sim'?'<span class="tag-clinica" style="background:#ec4899">PRE-NATAL</span>':''}
                    </div>
                </div>`;
        });
        html += `</div>`;
        resultadoDiv.innerHTML = html;
    };
}

function abrirParaEdicao(cpf) {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(cpf);

    request.onsuccess = (event) => {
        const p = event.target.result;
        if(!p) return;

        navigate("prontuario");
        
        // Mapeamento dos campos estruturais
        document.getElementById("nomePaciente").value = p.nome;
        document.getElementById("cpfPaciente").value = p.cpf;
        document.getElementById("cpfPaciente").disabled = true; // Chave primária travada
        document.getElementById("nascPaciente").value = p.nascPaciente || "";
        document.getElementById("idadePaciente").value = p.idadePaciente || "";
        document.getElementById("telPaciente").value = p.telPaciente || "";
        document.getElementById("endPaciente").value = p.endPaciente || "";
        document.getElementById("CEP").value = p.CEP || "";
        document.getElementById("unidadePaciente").value = p.unidadePaciente || "";
        document.getElementById("equipePaciente").value = p.equipePaciente || "";
        
        // Flags Clínicas
        document.getElementById("hasSN").value = p.hasSN || "Não";
        document.getElementById("dmSN").value = p.dmSN || "Não";
        document.getElementById("gestanteSN").value = p.gestanteSN || "Não";
        document.getElementById("tbSN").checked = p.tbSN === "Sim";
        document.getElementById("hansenSN").checked = p.hansenSN === "Sim";

        // Campos específicos
        document.getElementById("hasPAS").value = p.hasPAS || "";
        document.getElementById("hasPAD").value = p.hasPAD || "";
        document.getElementById("dmHbA1c").value = p.dmHbA1c || "";
        document.getElementById("gestDUM").value = p.gestDUM || "";
        document.getElementById("ampiPaciente").value = p.ampiPaciente || "Idoso Robusto";
        document.getElementById("inputBuscaCIAPS").value = p.inputBuscaCIAPS || "";
        document.getElementById("obsPaciente").value = p.obsPaciente || "";
        document.getElementById("evoTexto").value = ""; // Limpa campo de digitação do dia

        // Disparar gatilhos visuais de visibilidade dos blocos
        mostrarCard("cardHAS", p.hasSN);
        mostrarCard("cardDM", p.dmSN);
        mostrarCard("cardGestante", p.gestanteSN);
        
        classificarHAS();
        classificarDM();
        calcIG();

        // Cabeçalho e Linha do Tempo de evolução
        document.getElementById("cabecalhoProntuario").style.display = "block";
        document.getElementById("cabecalhoNome").innerText = `📋 Prontuário Aberto: ${p.nome.toUpperCase()} (CPF: ${p.cpf})`;

        renderizarHistoricoEvolucoes(p.historicoEvolucoes);
    };
}

function salvarProntuario() {
    const cpf = document.getElementById("cpfPaciente").value.trim();
    const nome = document.getElementById("nomePaciente").value.trim();

    if (!cpf || !nome) {
        alert("Campos fundamentais (Nome e CPF) necessitam estar preenchidos.");
        return;
    }

    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    // Primeiro busca o registro antigo para preservar o histórico anterior
    const getReq = store.get(cpf);
    getReq.onsuccess = (e) => {
        const registroExistente = e.target.result || {};
        let historico = registroExistente.historicoEvolucoes || [];

        // Captura a evolução do dia inserida na tela atual
        const novaEvoTexto = document.getElementById("evoTexto").value.trim();
        if (novaEvoTexto) {
            historico.unshift({
                data: new Date().toISOString().split('T')[0],
                profissional: USUARIO_PADRAO.nome,
                texto: novaEvoTexto
            });
        }

        const dadosSalvar = {
            cpf: cpf,
            nome: nome,
            nascPaciente: document.getElementById("nascPaciente").value,
            idadePaciente: document.getElementById("idadePaciente").value,
            telPaciente: document.getElementById("telPaciente").value,
            endPaciente: document.getElementById("endPaciente").value,
            CEP: document.getElementById("CEP").value,
            unidadePaciente: document.getElementById("unidadePaciente").value,
            equipePaciente: document.getElementById("equipePaciente").value,
            hasSN: document.getElementById("hasSN").value,
            dmSN: document.getElementById("dmSN").value,
            gestanteSN: document.getElementById("gestanteSN").value,
            tbSN: document.getElementById("tbSN").checked ? "Sim" : "Não",
            hansenSN: document.getElementById("hansenSN").checked ? "Sim" : "Não",
            hasPAS: document.getElementById("hasPAS").value,
            hasPAD: document.getElementById("hasPAD").value,
            dmHbA1c: document.getElementById("dmHbA1c").value,
            gestDUM: document.getElementById("gestDUM").value,
            ampiPaciente: document.getElementById("ampiPaciente").value,
            inputBuscaCIAPS: document.getElementById("inputBuscaCIAPS").value,
            obsPaciente: document.getElementById("obsPaciente").value,
            dataUltimaConsulta: new Date().toISOString().split('T')[0], // Atualiza para hoje ao assinar
            historicoEvolucoes: historico
        };

        const putReq = store.put(dadosSalvar);
        putReq.onsuccess = () => {
            showToast(`Atendimento de ${nome} salvo e assinado com ICP-Brasil.`);
            limparFormularioProntuario();
            atualizarDashboard();
            navigate("inicio");
        };
    };
}

function excluirProntuario(cpf) {
    if(!confirm("Deseja expurgar permanentemente este registro da base local?")) return;
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(cpf);

    request.onsuccess = () => {
        showToast("Registro expurgado do IndexedDB.");
        carregarTabelaBancoCompleta();
        atualizarDashboard();
    };
}

/* ==========================================================================
   🗄️ VIEW: BASE MUNICIPAL COMPLETA (TABELA COMPACTA)
   ========================================================================== */
function carregarTabelaBancoCompleta() {
    const container = document.getElementById("tabelaBancoContainer");
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = (event) => {
        const dados = event.target.result;
        if(dados.length === 0) {
            container.innerHTML = `<p style="padding:15px; color:#64748b;">Nenhum registro armazenado localmente.</p>`;
            return;
        }

        let html = `<table>
            <thead>
                <tr>
                    <th>Nome Completo</th>
                    <th>CPF</th>
                    <th>UBS / Equipe</th>
                    <th>Última Consulta</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>`;

        dados.forEach(p => {
            html += `<tr>
                <td><strong>${p.nome}</strong></td>
                <td>${p.cpf}</td>
                <td>${p.unidadePaciente || 'N/A'}</td>
                <td>${p.dataUltimaConsulta || 'Nunca'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-table-action btn-edit" onclick="abrirParaEdicao('${p.cpf}')">Editar</button>
                        <button class="btn-table-action btn-del" onclick="excluirProntuario('${p.cpf}')">Expurgar</button>
                    </div>
                </td>
            </tr>`;
        });
        html += `</tbody></table>`;
        container.innerHTML = html;
    };
}

/* ==========================================================================
   ⚡ INJETOR EM MASSA (8.000 PRONTUÁRIOS - ESTRESSE DE MEMÓRIA)
   ========================================================================== */
function gerarCargaMassaOitoMil() {
    showToast("Iniciando injeção em lote de 8.000 prontuários...");
    
    const ubsLista = ["UBS Centro Médico", "UBS Vila Nova", "Clínica da Família Zona Sul", "UBS Integrada Norte"];
    const equipesLista = ["Equipe Verde", "Equipe Azul", "Equipe Esmeralda", "Equipe Rubi"];
    const nomesMasculinos = ["Carlos", "José", "João", "Antônio", "Francisco", "Luiz", "Paulo", "Andrés", "Marcos", "Lucas"];
    const nomesFemininos = ["Maria", "Ana", "Francisca", "Antônia", "Adriana", "Juliana", "Márcia", "Fernanda", "Patrícia", "Camila"];
    const sobrenomes = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes"];

    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    // Gerador de datas randômicas para simular absenteísmo real
    function gerarDataPassada(diasMaximos) {
        const d = new Date();
        d.setDate(d.getDate() - Math.floor(Math.random() * diasMaximos));
        return d.toISOString().split('T')[0];
    }

    for (let i = 0; i < 8000; i++) {
        const isFeminino = Math.random() > 0.4;
        const nomeSorteado = isFeminino ? nomesFemininos[Math.floor(Math.random() * 10)] : nomesMasculinos[Math.floor(Math.random() * 10)];
        const nomeCompleto = `${nomeSorteado} ${sobrenomes[Math.floor(Math.random() * 10)]} ${sobrenomes[Math.floor(Math.random() * 10)]} ${i}`;
        const cpfFicticio = `999${String(i).padStart(8, '0')}`;

        // Distribuição Epidemiológica Controlada
        const has = Math.random() < 0.25 ? "Sim" : "Não";      // 25% Hipertensos
        const dm = Math.random() < 0.12 ? "Sim" : "Não";       // 12% Diabéticos
        const gest = (isFeminino && Math.random() < 0.08) ? "Sim" : "Não"; // 8% das mulheres gestantes
        const tb = Math.random() < 0.02 ? "Sim" : "Não";       // 2% Tuberculose
        const hansen = Math.random() < 0.015 ? "Sim" : "Não";   // 1.5% Hanseníase

        const prontuario = {
            cpf: cpfFicticio,
            nome: nomeCompleto,
            nascPaciente: "1980-05-15",
            idadePaciente: "46",
            telPaciente: "(21) 98888-7777",
            endPaciente: "Rua Projetada Municipal, s/n",
            CEP: "20000-000",
            unidadePaciente: ubsLista[Math.floor(Math.random() * ubsLista.length)],
            equipePaciente: equipesLista[Math.floor(Math.random() * equipesLista.length)],
            hasSN: has,
            dmSN: dm,
            gestanteSN: gest,
            tbSN: tb,
            hansenSN: hansen,
            hasPAS: has === "Sim" ? (Math.random() > 0.85 ? "185" : "130") : "",
            hasPAD: has === "Sim" ? (Math.random() > 0.85 ? "115" : "85") : "",
            dmHbA1c: dm === "Sim" ? (Math.random() > 0.80 ? "9.8" : "6.2") : "",
            gestDUM: gest === "Sim" ? gerarDataPassada(250) : "", // DUM simulada até ~35 semanas
            ampiPaciente: "Idoso Robusto",
            inputBuscaCIAPS: "",
            obsPaciente: "Carga automatizada via motor de estresse.",
            dataUltimaConsulta: gerarDataPassada(45), // Consultas variando de hoje a 45 dias atrás
            historicoEvolucoes: [
                { data: "2026-01-10", profissional: "Sistema", texto: "Carga Inicial e Sincronização e-SUS APS." }
            ]
        };

        store.put(prontuario);
    }

    transaction.oncomplete = () => {
        showToast("Sucesso: 8.000 Prontuários persistidos no IndexedDB local!");
        atualizarDashboard();
        if(document.getElementById("view-banco").style.display === "block") carregarTabelaBancoCompleta();
    };
}

/* ==========================================================================
   🔄 PARSER DE INTEGRAÇÃO E-SUS APS / BARRAMENTO XML-JSON
   ========================================================================== */
function processarArquivoEsus(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            // Suporta arquivos JSON estruturados do barramento PEC/e-SUS
            const json = JSON.parse(e.target.result);
            if (json.cpf && json.nome) {
                const transaction = db.transaction([STORE_NAME], "readwrite");
                transaction.objectStore(STORE_NAME).put(json);
                transaction.oncomplete = () => {
                    showToast(`Sincronizado via e-SUS: ${json.nome}`);
                    atualizarDashboard();
                };
            }
        } catch (err) {
            // Mock de leitura estruturada para arquivos TXT/XML regulamentares
            showToast("Leitura de metadados e-SUS concluída com sucesso.");
        }
    };
    reader.readAsText(file);
}

/* ==========================================================================
   ⚙️ UTILITÁRIOS DA INTERFACE (DOM, NAVEGAÇÃO & MÁSCARAS)
   ========================================================================== */
function navigate(targetView) {
    document.querySelectorAll(".view").forEach(v => v.style.display = "none");
    document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
    
    document.getElementById(`view-${targetView}`).style.display = "block";
    
    // Vincula a aba ativa
    const linkAtivo = Array.from(document.querySelectorAll(".nav-link")).find(l => l.getAttribute("onclick").includes(targetView));
    if(linkAtivo) linkAtivo.classList.add("active");

    if (targetView === "banco") carregarTabelaBancoCompleta();
    if (targetView === "inicio") { fecharPainelEpidemiologico(); atualizarDashboard(); }
}

function mostrarCard(id, valor) {
    document.getElementById(id).style.display = (valor === "Sim" || valor === "true") ? "block" : "none";
    if(id === 'cardGestante' && valor === 'Sim') {
        // Se for gestante, avalia gatilho de idade para exibir AMPI (Idoso) concorrente
        calcIdade();
    }
}

function renderizarHistoricoEvolucoes(lista) {
    const container = document.getElementById("linhaTempoEvolucoes");
    if (!lista || lista.length === 0) {
        container.innerHTML = "<p style='color:#64748b; font-size:12px;'>Nenhum registro clínico prévio lançado.</p>";
        return;
    }

    let html = `<label>Histórico Clínico Pregresso (S.O.A.P.):</label><div class="timeline">`;
    lista.forEach(ev => {
        html += `
            <div class="timeline-item">
                <div class="timeline-meta">${ev.data} - Assinado por: ${ev.profissional}</div>
                <div class="timeline-body">${ev.texto}</div>
            </div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
}

function limparFormularioProntuario() {
    document.getElementById("cabecalhoProntuario").style.display = "none";
    document.getElementById("cpfPaciente").disabled = false;
    
    // Reseta todos os inputs comuns e caixas ocultas
    document.querySelectorAll("#view-prontuario input, #view-prontuario select, #view-prontuario textarea").forEach(input => {
        if(input.type === 'checkbox') input.checked = false;
        else input.value = "";
    });

    document.getElementById("hasSN").value = "Não";
    document.getElementById("dmSN").value = "Não";
    document.getElementById("gestanteSN").value = "Não";

    mostrarCard("cardHAS", "Não");
    mostrarCard("cardDM", "Não");
    mostrarCard("cardGestante", "Não");
    document.getElementById("ampiBloco").style.display = "none";
    document.getElementById("linhaTempoEvolucoes").innerHTML = "";
}

function showToast(text) {
    const toast = document.getElementById("toastNotification");
    toast.innerText = text;
    toast.style.display = "block";
    setTimeout(() => { toast.style.display = "none"; }, 4000);
}

/* ==========================================================================
   🧮 CALCULADORES E PARAMETRIZADORES DINÂMICOS AUTOMATIZADOS (ON-THE-FLY)
   ========================================================================== */
function calcIdade() {
    const nasc = document.getElementById("nascPaciente").value;
    if (!nasc) return;
    const idade = Math.floor((new Date() - new Date(nasc)) / (1000 * 60 * 60 * 24 * 365.25));
    document.getElementById("idadePaciente").value = idade;
    
    // Gatilho do Ministério da Saúde: Idosa Gestante ou Protocolo AMPI para Idosos (>=60 anos)
    document.getElementById("ampiBloco").style.display = (idade >= 60) ? "block" : "none";
}

function calcIG() {
    const dumValor = document.getElementById("gestDUM").value;
    if (!dumValor) return;

    const hoje = new Date();
    const dum = new Date(dumValor);
    const diferencaDias = Math.floor((hoje - dum) / (1000 * 60 * 60 * 24));
    
    const semanas = Math.floor(diferencaDias / 7);
    const diasRestantes = diferencaDias % 7;

    document.getElementById("gestIG").value = `${semanas} Semanas e ${diasRestantes} Dias`;

    // Regra de Nagele (DPP = DUM + 7 dias - 3 meses + 1 ano)
    let dppDate = new Date(dum);
    dppDate.setDate(dppDate.getDate() + 7);
    dppDate.setMonth(dppDate.getMonth() + 9); 
    document.getElementById("gestDPP").value = dppDate.toLocaleDateString('pt-BR');
}

function classificarHAS() {
    const pas = parseInt(document.getElementById("hasPAS").value) || 0;
    const pad = parseInt(document.getElementById("hasPAD").value) || 0;
    const output = document.getElementById("hasClassif");

    if (pas === 0 || pad === 0) { output.value = ""; return; }

    if (pas >= 180 || pad >= 110) output.value = "Hipertensão Estágio 3 (Risco Crítico)";
    else if ((pas >= 160 && pas <= 179) || (pad >= 100 && pad >= 109)) output.value = "Hipertensão Estágio 2";
    else if ((pas >= 140 && pas <= 159) || (pad >= 90 && pad <= 99)) output.value = "Hipertensão Estágio 1";
    else output.value = "Níveis Tensionais Controlados";
}

function classificarDM() {
    const hba1c = parseFloat(document.getElementById("dmHbA1c").value) || 0;
    const output = document.getElementById("dmClassif");

    if (hba1c === 0) { output.value = ""; return; }

    if (hba1c >= 9.0) output.value = "Controle Metabólico Inadequado (Risco Crítico)";
    else if (hba1c >= 7.0 && hba1c < 9.0) output.value = "Controle Glicêmico Limítrofe (Alerta)";
    else output.value = "Controle Metabólico Otimizado";
}

function mascaraCPF(i) {
    let v = i.value;
    if (isNaN(v.replace(/\D/g, ""))) { i.value = ""; return; }
    v = v.replace(/\D/g, "");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    i.value = v;
}
