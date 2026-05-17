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

function facebookLogout() {
    efetuarLogout();
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
    if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then(granted => {
            if (granted) console.log("Armazenamento definido como PERSISTENTE pelo navegador.");
        });
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
        console.error("Erro crítico ao abrir IndexedDB:", event.target.error);
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        console.log("Banco de dados IndexedDB sincronizado com sucesso.");
        atualizarDashboard();
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

    let limiteDiasTolerancia = 30; 
    let faseTexto = "1º Trimestre";

    if (semanasIG >= 14 && semanasIG <= 27) {
        limiteDiasTolerancia = 15; 
        faseTexto = "2º Trimestre";
    } else if (semanasIG > 27 && semanasIG < 36) {
        limiteDiasTolerancia = 15; 
        faseTexto = "3º Trimestre Inicial";
    } else if (semanasIG >= 36) {
        limiteDiasTolerancia = 7;  
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

function processarRiscoPaciente(paciente) {
    let riscoCalculado = "CONTROLADO";
    let alertas = [];

    const checarValor = (campo) => {
        if (!campo) return false;
        return String(campo).trim().toLowerCase() === "sim" || String(campo).trim().toLowerCase() === "true";
    };

    // Regra Pré-Natal
    if (checarValor(paciente.gestanteSN)) {
        const checkPN = avaliarCriticoPreNatal(paciente.gestDUM, paciente.dataUltimaConsulta);
        if (checkPN.critico) {
            riscoCalculado = "CRITICO";
            alertas.push(checkPN.motivo);
        }
    }

    // Regra Tuberculose
    if (checarValor(paciente.tbSN) && avaliarAbsenteismoTrintaDias(paciente.dataUltimaConsulta)) {
        riscoCalculado = "CRITICO";
        alertas.push("Falta de acompanhamento na Tuberculose há mais de 30 dias.");
    }

    // Regra Hanseníase
    if (checarValor(paciente.hansenSN) && avaliarAbsenteismoTrintaDias(paciente.dataUltimaConsulta)) {
        riscoCalculado = "CRITICO";
        alertas.push("Falta de acompanhamento na Hanseníase há mais de 30 dias.");
    }

    // Regra HAS Clínico
    if (checarValor(paciente.hasSN)) {
        const pas = parseInt(paciente.hasPAS) || 0;
        const pad = parseInt(paciente.hasPAD) || 0;
        if (pas >= 180 || pad >= 110) {
            riscoCalculado = "CRITICO";
            alertas.push(`Crise Hipertensiva: PA ${pas}/${pad} mmHg.`);
        } else if (pas >= 140 || pad >= 90) {
            if (riscoCalculado !== "CRITICO") riscoCalculado = "ALERTA";
        }
    }

    // Regra DM Clínico
    if (checarValor(paciente.dmSN)) {
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
        
        const checarValor = (campo) => {
            if (!campo) return false;
            return String(campo).trim().toLowerCase() === "sim" || String(campo).trim().toLowerCase() === "true";
        };

        dadosFiltradosAtuais = todos.filter(p => {
            if (filtroAgravoAtual === "has") return checarValor(p.hasSN);
            if (filtroAgravoAtual === "dm") return checarValor(p.dmSN);
            if (filtroAgravoAtual === "gestante") return checarValor(p.gestanteSN);
            if (filtroAgravoAtual === "tuberculose") return checarValor(p.tbSN);
            if (filtroAgravoAtual === "hanseniase") return checarValor(p.hansenSN);
            return false;
        });

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

    // 1. Filtramos por território para amparar a volumetria correta dos gráficos (Donut/Barras)
    let dadosTerritorio = dadosFiltradosAtuais.filter(p => {
        if (ubs !== "TODAS" && p.unidadePaciente !== ubs) return false;
        if (equipe !== "TODAS" && p.equipePaciente !== equipe) return false;
        return true;
    });

    // 2. Contabilizamos os riscos reais desse recorte territorial
    let totalCriticos = 0;
    let totalAlertas = 0;
    let totalControlados = 0;

    dadosTerritorio.forEach(p => {
        const diag = processarRiscoPaciente(p);
        if (diag.statusRisco === "CRITICO") totalCriticos++;
        else if (diag.statusRisco === "ALERTA") totalAlertas++;
        else totalControlados++;
    });

    renderizarGraficoDonut(totalCriticos, totalAlertas, totalControlados);
    renderizarGraficoBarras(totalCriticos, totalAlertas, totalControlados);

    // 3. Aplica o filtro de risco especificamente para desenhar as linhas visíveis da tabela
    let exibicaoTabela = dadosTerritorio.filter(p => {
        const diagnostico = processarRiscoPaciente(p);
        if (risco === "CRITICO" && diagnostico.statusRisco !== "CRITICO") return false;
        if (risco === "CONTROLADO" && diagnostico.statusRisco === "CRITICO") return false;
        return true;
    });

    renderizarTabelaPainel(exibicaoTabela);
}

function renderizarGraficoDonut(c, a, ctrl) {
    const total = c + a + ctrl || 1;
    const pctCritico = ((c / total) * 100).toFixed(0);
    const pctAlerta = ((a / total) * 100).toFixed(0);
    const pctCtrl = ((ctrl / total) * 100).toFixed(0);

    const container = document.getElementById("containerGraficoDonut");
    container.innerHTML = `
        <div class="donut-wrapper">
            <svg width="140" height="140" viewBox="0 0 40 40" class="donut-svg">
                <circle class="donut-bg" cx="20" cy="20" r="15.91549430918954"></circle>
                <circle class="donut-segment" cx="20" cy="20" r="15.91549430918954" stroke="#ef4444" stroke-dasharray="${pctCritico} ${100 - pctCritico}" stroke-dashoffset="0"></circle>
                <circle class="donut-segment" cx="20" cy="20" r="15.91549430918954" stroke="#f59e0b" stroke-dasharray="${pctAlerta} ${100 - pctAlerta}" stroke-dashoffset="-${pctCritico}"></circle>
                <circle class="donut-segment" cx="20" cy="20" r="15.91549430918954" stroke="#10b981" stroke-dasharray="${pctCtrl} ${100 - pctCtrl}" stroke-dashoffset="-${parseInt(pctCritico) + parseInt(pctAlerta)}"></circle>
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
                <div class="bar-label"><span>Críticos (Atrasados / Descompensados)</span><span>${c} (${pC.toFixed(1)}%)</span></div>
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

    lista.slice(0, 15).forEach(p => {
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
    if (!db) {
        console.warn("Aviso: Tentativa de atualizar dashboard antes da abertura do IndexedDB. Retentando em 200ms...");
        setTimeout(atualizarDashboard, 200);
        return;
    }

    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = (event) => {
        const dados = event.target.result;
        let cHas = 0, cDm = 0, cGest = 0, cTb = 0, cHansen = 0;

        const checarCondicao = (campo) => {
            if (!campo) return false;
            const valor = String(campo).trim().toLowerCase();
            return valor === "sim" || valor === "true";
        };

        dados.forEach(p => {
            if (checarCondicao(p.hasSN)) cHas++;
            if (checarCondicao(p.dmSN)) cDm++;
            if (checarCondicao(p.gestanteSN)) cGest++;
            if (checarCondicao(p.tbSN)) cTb++;
            if (checarCondicao(p.hansenSN)) cHansen++;
        });

        console.log(`[Dashboard Sync] Processados ${dados.length} registros. HAS: ${cHas}, DM: ${cDm}, Gestantes: ${cGest}, TB: ${cTb}, Hansen: ${cHansen}`);

        if(document.getElementById("dashHAS")) document.getElementById("dashHAS").innerText = cHas;
        if(document.getElementById("dashDM")) document.getElementById("dashDM").innerText = cDm;
        if(document.getElementById("dashGest")) document.getElementById("dashGest").innerText = cGest;
        if(document.getElementById("dashTB")) document.getElementById("dashTB").innerText = cTb;
        if(document.getElementById("dashHansen")) document.getElementById("dashHansen").innerText = cHansen;
    };

    request.onerror = (event) => {
        console.error("Erro ao ler registros para o Dashboard:", event.target.error);
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
        
        document.getElementById("nomePaciente").value = p.nome;
        document.getElementById("cpfPaciente").value = p.cpf;
        document.getElementById("cpfPaciente").disabled = true;
        document.getElementById("nascPaciente").value = p.nascPaciente || "";
        document.getElementById("idadePaciente").value = p.idadePaciente || "";
        document.getElementById("telPaciente").value = p.telPaciente || "";
        document.getElementById("endPaciente").value = p.endPaciente || "";
        document.getElementById("CEP").value = p.CEP || "";
        document.getElementById("unidadePaciente").value = p.unidadePaciente || "";
        document.getElementById("equipePaciente").value = p.equipePaciente || "";
        
        document.getElementById("hasSN").value = p.hasSN || "Não";
        document.getElementById("dmSN").value = p.dmSN || "Não";
        document.getElementById("gestanteSN").value = p.gestanteSN || "Não";
        document.getElementById("tbSN").checked = p.tbSN === "sim" || p.tbSN === "Sim";
        document.getElementById("hansenSN").checked = p.hansenSN === "sim" || p.hansenSN === "Sim";

        document.getElementById("hasPAS").value = p.hasPAS || "";
        document.getElementById("hasPAD").value = p.hasPAD || "";
        document.getElementById("dmHbA1c").value = p.dmHbA1c || "";
        document.getElementById("gestDUM").value = p.gestDUM || "";
        document.getElementById("ampiPaciente").value = p.ampiPaciente || "Idoso Robusto";
        document.getElementById("inputBuscaCIAPS").value = p.inputBuscaCIAPS || "";
        document.getElementById("obsPaciente").value = p.obsPaciente || "";
        document.getElementById("evoTexto").value = "";

        mostrarCard("cardHAS", p.hasSN);
        mostrarCard("cardDM", p.dmSN);
        mostrarCard("cardGestante", p.gestanteSN);
        
        classificarHAS();
        classificarDM();
        calcIG();

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

    const getReq = store.get(cpf);
    getReq.onsuccess = (e) => {
        const registroExistente = e.target.result || {};
        let historico = registroExistente.historicoEvolucoes || [];

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
            hasSN: document.getElementById("hasSN").value.toLowerCase(),
            dmSN: document.getElementById("dmSN").value.toLowerCase(),
            gestanteSN: document.getElementById("gestanteSN").value.toLowerCase(),
            tbSN: document.getElementById("tbSN").checked ? "sim" : "não",
            hansenSN: document.getElementById("hansenSN").checked ? "sim" : "não",
            hasPAS: document.getElementById("hasPAS").value,
            hasPAD: document.getElementById("hasPAD").value,
            dmHbA1c: document.getElementById("dmHbA1c").value,
            gestDUM: document.getElementById("gestDUM").value,
            ampiPaciente: document.getElementById("ampiPaciente").value,
            inputBuscaCIAPS: document.getElementById("inputBuscaCIAPS").value,
            obsPaciente: document.getElementById("obsPaciente").value,
            dataUltimaConsulta: new Date().toISOString().split('T')[0],
            historicoEvolucoes: historico
        };

        const putReq = store.put(dadosSalvar);
        putReq.onsuccess = () => {
            showToast(`Atendimento de ${nome} salvo com sucesso.`);
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
   ⚡ INJETOR EM MASSA (8.000 PRONTUÁRIOS - ESTRESSE DE MEMÓRIA SANITIZADO)
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

        const has = Math.random() < 0.25 ? "sim" : "não";
        const dm = Math.random() < 0.12 ? "sim" : "não";
        const gest = (isFeminino && Math.random() < 0.08) ? "sim" : "não";
        const tb = Math.random() < 0.02 ? "sim" : "não";
        const hansen = Math.random() < 0.015 ? "sim" : "não";

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
            hasPAS: has === "sim" ? (Math.random() > 0.85 ? "185" : "130") : "",
            hasPAD: has === "sim" ? (Math.random() > 0.85 ? "115" : "85") : "",
            dmHbA1c: dm === "sim" ? (Math.random() > 0.80 ? "9.8" : "6.2") : "",
            gestDUM: gest === "sim" ? gerarDataPassada(250) : "",
            ampiPaciente: "Idoso Robusto",
            inputBuscaCIAPS: "",
            obsPaciente: "Carga automatizada via motor de estresse.",
            dataUltimaConsulta: gerarDataPassada(45),
            historicoEvolucoes: [
                { data: "2026-01-10", profissional: "Sistema", texto: "Carga Inicial e Sincronização e-SUS APS." }
            ]
        };

        store.put(prontuario);
    }

    transaction.oncomplete = () => {
        showToast("Sucesso: 8.000 Prontuários gerados com chaves sanitizadas!");
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
    
    const linkAtivo = Array.from(document.querySelectorAll(".nav-link")).find(l => l.getAttribute("onclick").includes(targetView));
    if(linkAtivo) linkAtivo.classList.add("active");

    if (targetView === "banco") carregarTabelaBancoCompleta();
    if (targetView === "inicio") { fecharPainelEpidemiologico(); atualizarDashboard(); }
}

function mostrarCard(id, valor) {
    const v = String(valor).trim().toLowerCase();
    document.getElementById(id).style.display = (v === "sim" || v === "true") ? "block" : "none";
    if(id === 'cardGestante' && (v === 'sim' || v === 'true')) {
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

/**
 * 🗺️ INTEGRAÇÃO TERRITORIAL: Busca de Endereço Automática via API ViaCEP
 * Executada automaticamente no evento onblur do input de CEP
 */
function buscarCEP() {
    const campoCEP = document.getElementById("CEP");
    const cep = campoCEP.value.replace(/\D/g, "");
    
    if (cep.length !== 8) return;

    showToast("Mapeando território pelo CEP...");

    fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(response => response.json())
        .then(dados => {
            if (dados.erro) {
                showToast("⚠️ CEP não localizado na base dos Correios.");
                return;
            }

            const enderecoFormatado = `${dados.logradouro}, ${dados.bairro} - ${dados.localidade}/${dados.uf}`;
            const campoEndereco = document.getElementById("endPaciente");
            campoEndereco.value = enderecoFormatado;

            // Feedback tátil visual temporário de sucesso no campo
            campoEndereco.style.backgroundColor = "#f0fdf4";
            setTimeout(() => { campoEndereco.style.backgroundColor = ""; }, 1500);

            showToast("📍 Endereço territorial preenchido!");
        })
        .catch(err => {
            console.error("Erro na requisição do ViaCEP:", err);
            showToast("Não foi possível conectar ao serviço de CEP. Preencha manualmente.");
        });
}
