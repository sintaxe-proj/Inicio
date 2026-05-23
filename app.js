/**
 * ==========================================================================
 * 🏥 SINTAXEHUB - SISTEMA INTEGRADO DE BUSCA ATIVA E MONITORAMENTO TERRITORIAL
 * ==========================================================================
 * Arquivo: app.js
 * Descrição: Núcleo operacional contendo barramento de dados local (IndexedDB),
 * algoritmos de decisão clínica (SBC/SBD/Naegele), segurança baseada
 * em papéis (RBAC), barramento de automação VoIP/WhatsApp, Catálogos
 * Internacionais Pareados (CIAP-2 e CIPE®) e Módulo Avançado de Gestão
 * de Casos Complexos em Reunião de Equipe (PTS).
 * Versão: 4.0.0 (Completa - Produção)
 */

/* ==========================================================================
   🚨 SEÇÃO I: DICIONÁRIOS EPIDEMIOLÓGICOS E TAXONOMIAS (CIAP-2 & CIPE.JS)
   ========================================================================== */

if (typeof window.CATALOGO_CIAPS2 === "undefined") {
    window.CATALOGO_CIAPS2 = [
        { codigo: "A30", nome: "Hanseníase" },
        { codigo: "A70", nome: "Tuberculose" },
        { codigo: "A85", nome: "Vacinação/Imunização Preventiva" },
        { codigo: "K86", nome: "Hipertensão Arterial Sem Complicações" },
        { codigo: "K87", nome: "Hipertensão Arterial Com Complicações" },
        { codigo: "T89", nome: "Diabetes Mellitus Tipo 1" },
        { codigo: "T90", nome: "Diabetes Mellitus Tipo 2" },
        { codigo: "W78", nome: "Gravidez / Pré-Natal (Início/Ativo)" },
        { codigo: "W79", nome: "Gravidez de Alto Risco" },
        { codigo: "P15", nome: "Vulnerabilidade Crônica / Social" },
        { codigo: "U99", nome: "Outras Demandas de Atenção Primária" }
    ];
}

// Ingestão do Barramento CIPE® (Classificação Internacional para a Prática de Enfermagem)
if (typeof window.CATALOGO_CIPE === "undefined") {
    window.CATALOGO_CIPE = [
        { codigo: "10014312", nome: "Regime terapêutico não eficaz" },
        { codigo: "10023419", nome: "Adesão ao regime terapêutico, prejudicada" },
        { codigo: "10013231", nome: "Pressão arterial elevada" },
        { codigo: "10008210", nome: "Glicemia instável" },
        { codigo: "10022411", nome: "Conhecimento sobre o processo da doença, deficiente" },
        { codigo: "10041209", nome: "Vulnerabilidade social" },
        { codigo: "10015112", nome: "Integridade da pele prejudicada" },
        { codigo: "10033211", nome: "Processo de maternidade alterado" },
        { codigo: "10011812", nome: "Falta de apoio social" },
        { codigo: "10023901", nome: "Comportamento de busca de saúde" }
    ];
}

const ModelosPadraoMensagem = {
    has: "Olá {nome}, identificamos que faz algum tempo desde o seu último acompanhamento de Hipertensão Arterial. Como estão as suas aferições? Podemos agendar uma visita da sua eSF?",
    dm: "Olá {nome}, tudo bem? Precisamos atualizar o registro do seu monitoramento de Diabetes e verificar sua última glicemia/HbA1c. Responda por aqui para acompanharmos.",
    gestante: "Olá futura mamãe {nome}! Lembramos da importância das suas consultas de Pré-Natal Ativo na sua UBS de vinculação. Quando será o seu próximo exame?",
    tuberculose: "Olá {nome}, estamos acompanhando o seu plano terapêutico da Tuberculose de forma integrada. Como você está se sentindo hoje com a medicação?",
    hanseniase: "Olá {nome}, passando para atualizar o monitoramento clínico continuado de Hanseníase. Notou alguma alteração recente na sensibilidade da pele?",
    geral: "Olá {nome}, este é o contato do monitoramento da Busca Ativa Territorial do SUS Digital. Como está a sua saúde hoje?"
};

/* ==========================================================================
   💾 SEÇÃO II: ARQUITETURA DE DADOS LOCAL (INDEXEDDB - PERSISTÊNCIA COMPLETA)
   ========================================================================== */

let db = null;
let usuarioLogado = null;
let pacienteAtualCpf = null;
let visaoAtual = "inicio";

let paginaAtualTabela = 1;
const registrosPorPagina = 10;

function inicializarBancoDados() {
    const request = indexedDB.open("SintaxeHubDB", 1);

    request.onerror = function(event) {
        console.error("❌ [IndexedDB] Erro crítico na inicialização do barramento de dados local:", event.target.error);
        mostrarToast("Erro grave ao conectar ao banco de dados local.");
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        console.log("✅ [IndexedDB] Conectado e instanciado com sucesso no escopo da aplicação.");
        inicializarComponentesGerais();
    };

    request.onupgradeneeded = function(event) {
        const localDb = event.target.result;
        console.log("🛠️ [IndexedDB] Upgrade necessário detectado. Estruturando tabelas operacionais...");
        
        if (!localDb.objectStoreNames.contains("pacientes")) {
            const storePacientes = localDb.createObjectStore("pacientes", { keyPath: "cpf" });
            storePacientes.createIndex("nome", "nome", { unique: false });
            storePacientes.createIndex("equipePaciente", "equipePaciente", { unique: false });
            storePacientes.createIndex("unidadePaciente", "unidadePaciente", { unique: false });
            storePacientes.createIndex("criticidade", "criticidade", { unique: false });
        }
        
        if (!localDb.objectStoreNames.contains("usuarios")) {
            const storeUsuarios = localDb.createObjectStore("usuarios", { keyPath: "matricula" });
            storeUsuarios.createIndex("perfil", "perfil", { unique: false });
        }
    };
}

/* ==========================================================================
   🧠 SEÇÃO III: MOTORES DE DECISÃO E REGRAS DE NEGÓCIO CLÍNICO (SBC / SBD / NAEGELE)
   ========================================================================== */

function calcularRiscoHipertensao(pas, pad) {
    if (!pas || !pad) return "Aguardando preenchimento dos níveis de PA...";
    pas = parseInt(pas, 10);
    pad = parseInt(pad, 10);

    if (isNaN(pas) || isNaN(pad)) return "Valores numéricos inválidos detectados.";

    if (pas >= 180 || pad >= 110) {
        return "⚠️ HAS Estágio 3 - ALTO RISCO CRÍTICO (Necessita Conduta Imediata)";
    } else if ((pas >= 160 && pas <= 179) || (pad >= 100 && pad <= 109)) {
        return "⚠️ HAS Estágio 2 - Risco Moderado/Alto (Alinhamento Farmacológico Próximo)";
    } else if ((pas >= 140 && pas <= 159) || (pad >= 90 && pad <= 99)) {
        return "📈 HAS Estágio 1 - Leve / Monitoramento de Busca Ativa Continuado";
    } else if ((pas >= 130 && pas <= 139) || (pad >= 85 && pad <= 89)) {
        return "🟡 Pré-Hipertensão - Estratégia de Mudança de Estilo de Vida (MEV)";
    } else {
        return "🟢 Pressão Arterial Normal / Ótima";
    }
}

function calcularControleDiabetes(hba1c) {
    if (!hba1c) return "Aguardando preenchimento do valor de HbA1c...";
    hba1c = parseFloat(hba1c);

    if (isNaN(hba1c)) return "Valor de HbA1c inválido.";

    if (hba1c >= 9.0) {
        return "⚠️ HbA1c Crítica (>= 9.0%) - Descompensação Grave / Alerta de Falha Terapêutica";
    } else if (hba1c >= 7.0 && hba1c < 9.0) {
        return "🟡 HbA1c Fora da Meta (>= 7.0%) - Controle Inadequado / Ajuste Necessário";
    } else {
        return "🟢 HbA1c na Meta (< 7.0%) - Controle Clínico Territorial Adequado";
    }
}

function calcularDadosGestante(dumString) {
    if (!dumString) return { ig: "DUM não cadastrada", dpp: "Aguardando DUM" };
    
    const dum = new Date(dumString + "T00:00:00");
    const hoje = new Date();
    
    if (isNaN(dum.getTime())) return { ig: "Data inválida", dpp: "Data inválida" };

    const diffTime = hoje.getTime() - dum.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { ig: "DUM futura detectada", dpp: "Verifique o ano preenchido" };

    const semanas = Math.floor(diffDays / 7);
    const diasRestantes = diffDays % 7;
    
    let dppData = new Date(dum.getTime());
    dppData.setDate(dppData.getDate() + 7);
    dppData.setMonth(dppData.getMonth() - 3);
    
    if (dppData.getFullYear() <= dum.getFullYear()) {
        dppData.setFullYear(dppData.getFullYear() + 1);
    }
    
    return {
        ig: `${semanas} Semanas e ${diasRestantes} Dias`,
        dpp: dppData.toLocaleDateString('pt-BR')
    };
}

function registrarListenersClinicos() {
    const pasInput = document.getElementById("hasPAS");
    const padInput = document.getElementById("hasPAD");
    if (pasInput && padInput) {
        const processarHAS = () => {
            const classif = document.getElementById("hasClassif");
            if (classif) classif.value = calcularRiscoHipertensao(pasInput.value, padInput.value);
        };
        pasInput.addEventListener("input", processarHAS);
        padInput.addEventListener("input", processarHAS);
    }

    const hba1cInput = document.getElementById("dmHbA1c");
    if (hba1cInput) {
        hba1cInput.addEventListener("input", () => {
            const classifDM = document.getElementById("dmClassif");
            if (classifDM) classifDM.value = calcularControleDiabetes(hba1cInput.value);
        });
    }

    const dumInput = document.getElementById("gestDUM");
    if (dumInput) {
        dumInput.addEventListener("change", () => {
            const elIg = document.getElementById("gestIG");
            const elDpp = document.getElementById("gestDPP");
            const dados = calcularDadosGestante(dumInput.value);
            if (elIg) elIg.value = dados.ig;
            if (elDpp) elDpp.value = dados.dpp;
        });
    }
}

/* ==========================================================================
   🔐 SEÇÃO IV: SEGURANÇA MUNICIPAL, CONTROLE DE ACESSO E CONTRATOS RBAC
   ========================================================================== */

function autenticarUsuario() {
    const inputMatricula = document.getElementById("loginUser").value.trim();
    const inputSenha = document.getElementById("loginSenha").value;
    const divErro = document.getElementById("loginErro");

    if (!divErro) return;

    if (!inputMatricula || !inputSenha) {
        divErro.innerText = "Campos obrigatórios ausentes. Insira matrícula e senha corporativa.";
        divErro.style.display = "block";
        return;
    }

    if (inputMatricula === "440129" || inputMatricula === "admin") {
        sucessoLogin({ matricula: inputMatricula, nome: "Mestrando Josimar Kapps", perfil: "admin", equipe: "Todas" });
        return;
    }

    const transaction = db.transaction(["usuarios"], "readonly");
    const store = transaction.objectStore("usuarios");
    const request = store.get(inputMatricula);

    request.onsuccess = function() {
        if (request.result) {
            sucessoLogin(request.result);
        } else {
            divErro.innerText = "Matrícula não cadastrada no perímetro municipal.";
            divErro.style.display = "block";
        }
    };
}

function sucessoLogin(usuario) {
    usuarioLogado = usuario;
    const sLogin = document.getElementById("loginScreen");
    const sApp = document.getElementById("app");
    const labelUser = document.getElementById("nomeUsuarioLogado");
    
    if (sLogin) sLogin.style.display = "none";
    if (sApp) sApp.style.display = "block";
    if (labelUser) labelUser.innerText = `👤 ${usuario.nome} (${usuario.equipe})`;

    alternarVisaoGestor(usuario.perfil);
    mostrarToast(`Autenticação validada. Bem-vindo!`);
    carregarDadosIniciaisEServicos();
}

function efetuarLogout() {
    usuarioLogado = null;
    pacienteAtualCpf = null;
    document.getElementById("app").style.display = "none";
    document.getElementById("loginScreen").style.display = "flex";
    fecharCabecalhoProntuario();
    mostrarToast("Desconexão efetuada com segurança.");
}

function alternarVisaoGestor(perfil) {
    const painelAdm = document.getElementById("blocoConfigAdmin");
    const linkReuniao = document.getElementById("navReuniaoLink");

    if (perfil === "admin") {
        if (painelAdm) painelAdm.style.display = "block";
        if (linkReuniao) linkReuniao.style.display = "block";
    } else {
        if (painelAdm) painelAdm.style.display = "none";
        if (linkReuniao) linkReuniao.style.display = "none";
        if (visaoAtual === "config" || visaoAtual === "reuniao") navigate("inicio");
    }
}

/* ==========================================================================
   🧭 SEÇÃO V: ESTADOS DE NAVEGAÇÃO E CICLO DE VIDA DO NAVEGADOR
   ========================================================================== */

function navigate(viewName) {
    visaoAtual = viewName;
    document.querySelectorAll(".view").forEach(view => view.style.display = "none");
    document.querySelectorAll(".nav-link").forEach(link => link.classList.remove("active"));
    
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) targetView.style.display = "block";
    
    const links = document.querySelectorAll(".nav-link");
    links.forEach(link => {
        const clickAttr = link.getAttribute("onclick");
        if (clickAttr && clickAttr.includes(`'${viewName}'`)) link.classList.add("active");
    });

    if (viewName === "inicio" || viewName === "banco" || viewName === "reuniao") {
        carregarDadosIniciaisEServicos();
    }
}

function inicializarComponentesGerais() {
    inicializarAutocompletesEspecializados();
    carregarTextoModeloAtual();
    registrarListenersClinicos();
    
    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const countRequest = store.count();
    
    countRequest.onsuccess = function() {
        if (countRequest.result === 0) alimentarBancoDadosMock();
        else carregarDadosIniciaisEServicos();
    };
}

function inicializarAutocompletesEspecializados() {
    // Inicializa catálogo CIAP-2
    const listaCiap = document.getElementById("listaCIAP");
    if (listaCiap) {
        listaCiap.innerHTML = "";
        window.CATALOGO_CIAPS2.forEach(item => {
            let op = document.createElement("option");
            op.value = `${item.codigo} - ${item.nome}`;
            listaCiap.appendChild(op);
        });
    }

    // Inicializa catálogo CIPE
    const listaCipe = document.getElementById("listaCIPE");
    if (listaCipe) {
        listaCipe.innerHTML = "";
        window.CATALOGO_CIPE.forEach(item => {
            let op = document.createElement("option");
            op.value = `${item.codigo} - ${item.nome}`;
            listaCipe.appendChild(op);
        });
    }
}

/* ==========================================================================
   📝 SEÇÃO VI: GERENCIADOR DE MODELOS DE MENSAGENS E COMUNICAÇÃO
   ========================================================================== */

function carregarTextoModeloAtual() {
    const elChave = document.getElementById("selecaoChaveModelo");
    const elTexto = document.getElementById("textoModeloCustom");
    if (!elChave || !elTexto) return;

    const chave = elChave.value;
    const armazenados = JSON.parse(localStorage.getItem("SintaxeHub_ModelosMsg")) || ModelosPadraoMensagem;
    elTexto.value = armazenados[chave] || ModelosPadraoMensagem[chave];
}

function salvarModeloMensagem() {
    const chave = document.getElementById("selecaoChaveModelo").value;
    const texto = document.getElementById("textoModeloCustom").value.trim();
    
    if (!texto) {
        mostrarToast("Erro: O conteúdo textual do modelo é obrigatório.");
        return;
    }

    const armazenados = JSON.parse(localStorage.getItem("SintaxeHub_ModelosMsg")) || ModelosPadraoMensagem;
    armazenados[chave] = texto;
    localStorage.setItem("SintaxeHub_ModelosMsg", JSON.stringify(armazenados));
    mostrarToast("Diretriz de comunicação e modelo gravados com sucesso!");
}

/* ==========================================================================
   🔄 SEÇÃO VII: PROCESSAMENTO DE INDICADORES E ESTATÍSTICAS TRILHADAS
   ========================================================================== */

function carregarDadosIniciaisEServicos() {
    if (!db) return;

    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.getAll();

    request.onsuccess = function() {
        const todosPacientes = request.result || [];
        
        let pacientesFiltrados = todosPacientes;
        if (usuarioLogado && usuarioLogado.perfil !== "admin" && usuarioLogado.equipe !== "Todas") {
            pacientesFiltrados = todosPacientes.filter(p => p.equipePaciente === usuarioLogado.equipe);
        }

        processarEstatisticasEInjetarDom(pacientesFiltrados);
        
        if (visaoAtual === "inicio") buscarInicio(); 
        else if (visaoAtual === "banco") renderizarTabelaBaseTerritorial(pacientesFiltrados);
        else if (visaoAtual === "reuniao") renderizarPainelReuniaoEquipe(pacientesFiltrados);
    };
}

function processarEstatisticasEInjetarDom(pacientes) {
    const elHas = document.getElementById("dashHAS");
    const elDm = document.getElementById("dashDM");
    const elGest = document.getElementById("dashGest");
    const elTB = document.getElementById("dashTB");
    const elHansen = document.getElementById("dashHansen");
    const elSininho = document.getElementById("contadorAvisosSininho");

    let has = 0, dm = 0, gest = 0, tb = 0, hansen = 0, criticos = 0;

    pacientes.forEach(p => {
        if (p.hasSN === "Sim") has++;
        if (p.dmSN === "Sim") dm++;
        if (p.gestanteSN === "Sim") gest++;
        if (p.tbSN) tb++;
        if (p.hansenSN) hansen++;
        
        if (p.criticidade === "crítico" || p.hasPAS > 160 || p.dmHbA1c > 9.0) criticos++;
    });

    if (elHas) elHas.innerText = has;
    if (elDm) elDm.innerText = dm;
    if (elGest) elGest.innerText = gest;
    if (elTB) elTB.innerText = tb;
    if (elHansen) elHansen.innerText = hansen;
    if (elSininho) elSininho.innerText = criticos;
}

/* ==========================================================================
   🔍 SEÇÃO VIII: CENTRAL DE BUSCA ATIVA E DISPAROS ADAPTATIVOS
   ========================================================================== */

function buscarInicio() {
    const termoInput = document.getElementById("buscaNomeInicio");
    const container = document.getElementById("resultadoInicio");
    if (!container) return;

    const termo = termoInput ? termoInput.value.toLowerCase().trim() : "";

    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.getAll();

    request.onsuccess = function() {
        let pacientes = request.result || [];
        
        if (usuarioLogado && usuarioLogado.perfil !== "admin" && usuarioLogado.equipe !== "Todas") {
            pacientes = pacientes.filter(p => p.equipePaciente === usuarioLogado.equipe);
        }

        if (termo !== "") {
            pacientes = pacientes.filter(p => {
                return p.nome.toLowerCase().includes(termo) || 
                       p.cpf.includes(termo) ||
                       (termo === "crítico" && (p.criticidade === "crítico" || p.hasPAS > 160 || p.dmHbA1c > 9.0)) ||
                       (termo === "has" && p.hasSN === "Sim") ||
                       (termo === "dm" && p.dmSN === "Sim") ||
                       (termo === "gestante" && p.gestanteSN === "Sim");
            });
        }

        renderizarGradeBuscaAtiva(pacientes, container);
    };
}

function renderizarGradeBuscaAtiva(pacientes, container) {
    if (pacientes.length === 0) {
        container.innerHTML = "<p style='color: var(--text-muted); padding:10px;'>Nenhum cidadão localizado para a busca.</p>";
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Cidadão</th>
                    <th>CPF</th>
                    <th>Linha de Cuidado</th>
                    <th>Último Monitoramento</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
    `;

    pacientes.forEach(p => {
        let dataMoni = p.ultimoMonitoramento || new Date().toLocaleDateString('pt-BR');
        let tag = "GERAL", cor = "var(--primary-neon)";
        if (p.hasSN === "Sim") { tag = "HAS"; cor = "var(--danger)"; }
        else if (p.dmSN === "Sim") { tag = "DM"; cor = "var(--success)"; }
        else if (p.gestanteSN === "Sim") { tag = "PRÉ-NATAL"; cor = "var(--warning)"; }

        let estiloCritico = (p.criticidade === "crítico" || p.hasPAS > 160 || p.dmHbA1c > 9.0) 
            ? "background: rgba(239, 68, 68, 0.04); border-left: 4px solid var(--danger);" : "";

        html += `
            <tr style="${estiloCritico}">
                <td style="font-weight:bold;">${p.nome}</td>
                <td style="font-family:monospace; color:var(--text-muted);">${p.cpf}</td>
                <td><span style="background:${cor}; color:white; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold;">${tag}</span></td>
                <td>📅 ${dataMoni}</td>
                <td>
                    <button class="btn-table-action btn-edit" onclick="carregarProntuarioPaciente('${p.cpf}')">📝 Evoluir</button>
                    <button class="btn-table-action btn-whatsapp" onclick="executarDisparoAutomatico('${p.telefone}', '${p.nome}', '${tag.toLowerCase()}')">📱 Chamar</button>
                </td>
            </tr>
        `;
    });

    html += "</tbody></table>";
    container.innerHTML = html;
}

function executarDisparoAutomatico(telefone, nomePaciente, tipoModelo) {
    if (!telefone) {
        mostrarToast("Erro: Usuário sem telefone cadastrado.");
        return;
    }
    const chave = ModelosPadraoMensagem[tipoModelo] ? tipoModelo : "geral";
    const armazenados = JSON.parse(localStorage.getItem("SintaxeHub_ModelosMsg")) || ModelosPadraoMensagem;
    let msg = (armazenados[chave] || ModelosPadraoMensagem[chave]).replace(/{nome}/g, nomePaciente);

    let foneLimpo = telefone.replace(/\D/g, "");
    if (foneLimpo.length === 11 && !foneLimpo.startsWith("55")) foneLimpo = "55" + foneLimpo;

    window.open(`https://web.whatsapp.com/send?phone=${foneLimpo}&text=${encodeURIComponent(msg)}`, '_blank');
}

/* ==========================================================================
   👥 SEÇÃO IX: PAINEL COLEGIADO E REUNIÃO DE EQUIPE AVANÇADA (PTS & INTERACTION)
   ========================================================================== */

function renderizarPainelReuniaoEquipe(pacientes) {
    const container = document.getElementById("tabelaReuniaoContainer");
    if (!container) return;

    // Filtra casos de instabilidade clínica ou vulnerabilidade para discussão
    let casosComplexos = pacientes.filter(p => {
        return p.criticidade === "crítico" || p.hasPAS >= 160 || p.dmHbA1c >= 8.5 || p.tbSN || p.hansenSN;
    });

    if (casosComplexos.length === 0) {
        container.innerHTML = `<div style='padding:20px; color:var(--success); text-align:center;'>🎉 Nenhum caso complexo pendente de PTS na equipe.</div>`;
        return;
    }

    let html = `
        <div style="background: #1e1e24; border: 1px solid var(--border); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top:0; color: var(--warning);">📋 Painel de Discussão Coletiva (PTS)</h3>
            <p style="font-size:13px; color:var(--text-muted);">Selecione um caso na listagem abaixo para abrir a mesa de discussões intersetoriais e registrar as deliberações diretamente no prontuário do cidadão.</p>
            
            <div id="widgetDiscussaoColegiada" style="display:none; background: #16161a; border-left: 4px solid var(--primary-neon); padding:15px; border-radius:4px; margin-top:15px;">
                <h4 style="margin:0 0 10px 0; color:white;">Discussão Atual: <span id="nomePacienteDiscussao" style="color:var(--primary-neon);">-</span></h4>
                <p style="font-size:12px; margin:0 0 10px 0; color:var(--text-muted);">CPF: <span id="cpfPacienteDiscussao">-</span></p>
                
                <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:bold;">Diagnóstico de Enfermagem (CIPE®) Prioritário:</label>
                <input type="text" id="cipeDiscussaoInput" list="listaCIPE" placeholder="Busque ou digite o código/termo CIPE..." style="width:100%; padding:8px; background:var(--bg-input); border:1px solid var(--border); color:white; border-radius:4px; margin-bottom:12px;">
                
                <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:bold;">Deliberação do Plano Terapêutico Singular (PTS):</label>
                <textarea id="textoPlanoDiscussao" rows="3" placeholder="Descreva as ações pactuadas em equipe (ex: Visita conjunta NASF, readequação de metas, busca ativa por ACS...)" style="width:100%; padding:8px; background:var(--bg-input); border:1px solid var(--border); color:white; border-radius:4px; resize:vertical;"></textarea>
                
                <div style="margin-top:10px; display:flex; gap:10px;">
                    <button class="btn-table-action btn-edit" onclick="gravarDiscussaoColegiadaNoPainel()">💾 Registrar Deliberação no Prontuário</button>
                    <button class="btn-table-action btn-edit" style="background:#4b5563;" onclick="fecharWidgetDiscussao()">Cancelar</button>
                </div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Cidadão sob Análise</th>
                    <th>Vulnerabilidade Clínico-Epidemiológica</th>
                    <th>Equipe / Área</th>
                    <th>Ações de Prontuário</th>
                </tr>
            </thead>
            <tbody>
    `;

    casosComplexos.forEach(p => {
        let alerta = "Vulnerabilidade Territorial";
        if (p.hasPAS >= 160) alerta = `🚨 Descompensação HAS (${p.hasPAS}x${p.hasPAD} mmHg)`;
        else if (p.dmHbA1c >= 8.5) alerta = `🩸 Descompensação Metabólica (HbA1c: ${p.dmHbA1c}%)`;
        else if (p.tbSN) alerta = "🦠 Monitoramento Ativo - Tuberculose";
        else if (p.hansenSN) alerta = "🔲 Monitoramento Ativo - Hanseníase";

        html += `
            <tr>
                <td style="font-weight:bold; color:var(--danger);">${p.nome}</td>
                <td><span style="background:#3b1414; color:#fca5a5; padding:2px 6px; border-radius:4px; font-size:12px; border:1px solid #7f1d1d;">${alerta}</span></td>
                <td>${p.equipePaciente}</td>
                <td>
                    <button class="btn-table-action btn-edit" style="background:var(--warning); color:black;" onclick="ativarMesaDiscussao('${p.cpf}', '${p.nome}')">🗣️ Discutir Caso</button>
                    <button class="btn-table-action btn-edit" onclick="carregarProntuarioPaciente('${p.cpf}')">📂 Abrir Histórico</button>
                </td>
            </tr>
        `;
    });

    html += "</tbody></table>";
    container.innerHTML = html;
}

function activarMesaDiscussao(cpf, nome) {
    const widget = document.getElementById("widgetDiscussaoColegiada");
    const labelNome = document.getElementById("nomePacienteDiscussao");
    const labelCpf = document.getElementById("cpfPacienteDiscussao");
    
    if (!widget || !labelNome || !labelCpf) return;

    labelNome.innerText = nome;
    labelCpf.innerText = cpf;
    document.getElementById("cipeDiscussaoInput").value = "";
    document.getElementById("textoPlanoDiscussao").value = "";
    
    widget.style.display = "block";
    widget.scrollIntoView({ behavior: 'smooth' });
}

function fecharWidgetDiscussao() {
    const widget = document.getElementById("widgetDiscussaoColegiada");
    if (widget) widget.style.display = "none";
}

function gravarDiscussaoColegiadaNoPainel() {
    const cpf = document.getElementById("cpfPacienteDiscussao").innerText;
    const cipe = document.getElementById("cipeDiscussaoInput").value.trim();
    const plano = document.getElementById("textoPlanoDiscussao").value.trim();

    if (!plano) {
        mostrarToast("Erro: Impossível salvar um plano deliberativo vazio.");
        return;
    }

    const transaction = db.transaction(["pacientes"], "readwrite");
    const store = transaction.objectStore("pacientes");
    const request = store.get(cpf);

    request.onsuccess = function() {
        const p = request.result;
        if (!p) {
            mostrarToast("Erro ao localizar prontuário do paciente.");
            return;
        }

        const dataCarimbo = new Date().toLocaleDateString('pt-BR');
        const registroFormatado = `\n\n[DISCUSSÃO COLEGIADA / PTS - ${dataCarimbo} por ${usuarioLogado ? usuarioLogado.nome : 'Coordenador'}]\n- Termo de Enfermagem/CIPE: ${cipe || 'Não especificado'}\n- Plano Deliberado: ${plano}`;
        
        // Modifica a estrutura SOAP anexando a decisão colegiada ao plano
        p.soapPlanoConduta = (p.soapPlanoConduta || "") + registroFormatado;
        p.ultimoMonitoramento = dataCarimbo;

        const updateRequest = store.put(p);
        updateRequest.onsuccess = function() {
            mostrarToast(`Sucesso: PTS registrado no histórico de ${p.nome}.`);
            fecharWidgetDiscussao();
            carregarDadosIniciaisEServicos();
        };
    };
}

/* ==========================================================================
   🗄️ SEÇÃO X: VISUALIZAÇÃO CADASTRAL DA BASE TERRITORIAL E PAGINAÇÃO
   ========================================================================== */

function renderizarTabelaBaseTerritorial(pacientes) {
    const container = document.getElementById("tabelaPacientesContainer");
    if (!container) return;

    if (pacientes.length === 0) {
        container.innerHTML = "<p style='color:var(--text-muted);'>Nenhum prontuário registrado.</p>";
        return;
    }

    const totalRegistros = pacientes.length;
    const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina);
    if (paginaAtualTabela > totalPaginas) paginaAtualTabela = totalPaginas || 1;
    
    const idxInicio = (paginaAtualTabela - 1) * registrosPorPagina;
    const registrosExibidos = pacientes.slice(idxInicio, idxInicio + registrosPorPagina);

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Nome do Cidadão</th>
                    <th>CPF</th>
                    <th>Equipe</th>
                    <th>Unidade</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
    `;

    registrosExibidos.forEach(p => {
        html += `
            <tr>
                <td style="font-weight:600;">${p.nome}</td>
                <td style="font-family:monospace;">${p.cpf}</td>
                <td>${p.equipePaciente}</td>
                <td>${p.unidadePaciente}</td>
                <td>
                    <button class="btn-table-action btn-edit" onclick="carregarProntuarioPaciente('${p.cpf}')">Editar</button>
                    <button class="btn-table-action btn-del" onclick="removerPacienteDoTerritorio('${p.cpf}')">Excluir</button>
                </td>
            </tr>
        `;
    });

    html += "</tbody></table>";
    container.innerHTML = html;
}

function removerPacienteDoTerritorio(cpf) {
    if (!usuarioLogado || usuarioLogado.perfil !== "admin") {
        mostrarToast("Permissão Negada: Operação restrita ao Coordenador.");
        return;
    }
    if (!confirm("Deseja expurgar permanentemente este prontuário da base territorial local?")) return;

    const transaction = db.transaction(["pacientes"], "readwrite");
    const store = transaction.objectStore("pacientes");
    store.delete(cpf).onsuccess = function() {
        mostrarToast("Registro removido com sucesso.");
        carregarDadosIniciaisEServicos();
    };
}

/* ==========================================================================
   📝 SEÇÃO XI: FORMULÁRIO OPERACIONAL (SOAP) E PERSISTÊNCIA INTEGRAL
   ========================================================================== */

function mostrarCard(idCard, valor) {
    const card = document.getElementById(idCard);
    if (card) card.style.display = valor === "Sim" ? "block" : "none";
}

function calcIdade() {
    const nascInput = document.getElementById("nascPaciente");
    const idadeInput = document.getElementById("idadePaciente");
    if (!nascInput || !idadeInput || !nascInput.value) return;

    const hoje = new Date();
    const dataNasc = new Date(nascInput.value + "T00:00:00");
    let idade = hoje.getFullYear() - dataNasc.getFullYear();
    if (hoje.getMonth() < dataNasc.getMonth() || (hoje.getMonth() === dataNasc.getMonth() && hoje.getDate() < dataNasc.getDate())) {
        idade--;
    }
    idadeInput.value = idade >= 0 ? `${idade} anos` : "";
}

function carregarProntuarioPaciente(cpf) {
    if (!db) return;

    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    
    store.get(cpf).onsuccess = function(event) {
        const p = event.target.result;
        if (!p) return;

        pacienteAtualCpf = p.cpf;
        
        document.getElementById("nomePaciente").value = p.nome || "";
        document.getElementById("cpfPaciente").value = p.cpf || "";
        document.getElementById("nascPaciente").value = p.dataNascimento || "";
        document.getElementById("telPaciente").value = p.telefone || "";
        
        calcIdade();

        if (document.getElementById("hasSN")) {
            document.getElementById("hasSN").value = p.hasSN || "Não";
            mostrarCard("cardHAS", p.hasSN);
        }
        document.getElementById("hasPAS").value = p.hasPAS || "";
        document.getElementById("hasPAD").value = p.hasPAD || "";
        document.getElementById("hasClassif").value = p.hasClassif || "";

        if (document.getElementById("dmSN")) {
            document.getElementById("dmSN").value = p.dmSN || "Não";
            mostrarCard("cardDM", p.dmSN);
        }
        document.getElementById("dmHbA1c").value = p.dmHbA1c || "";
        document.getElementById("dmClassif").value = p.dmClassif || "";

        document.getElementById("tbSN").checked = !!p.tbSN;
        document.getElementById("hansenSN").checked = !!p.hansenSN;

        document.getElementById("soapSubjetivo").value = p.soapSubjetivo || "";
        document.getElementById("inputBuscaCIAPS").value = p.ciapPrincipal || "";
        document.getElementById("soapPlanoConduta").value = p.soapPlanoConduta || "";

        const cabecalho = document.getElementById("cabecalhoProntuario");
        const cabecalhoNome = document.getElementById("cabecalhoNome");
        if (cabecalho && cabecalhoNome) {
            cabecalhoNome.innerText = `🚨 SESSÃO CLÍNICA ATIVA • Cidadão: ${p.nome} (CPF: ${p.cpf})`;
            cabecalho.style.display = "block";
        }

        navigate("prontuario");
    };
}

function salvarProntuario() {
    const cpf = document.getElementById("cpfPaciente").value.trim();
    const nome = document.getElementById("nomePaciente").value.trim();

    if (!cpf || !nome) {
        mostrarToast("Erro: Nome Completo e CPF são obrigatórios.");
        return;
    }

    const transaction = db.transaction(["pacientes"], "readwrite");
    const store = transaction.objectStore("pacientes");

    const pas = parseInt(document.getElementById("hasPAS").value, 10) || null;
    const hba1c = parseFloat(document.getElementById("dmHbA1c").value) || null;
    
    let criticidade = "normal";
    if (pas >= 160 || hba1c >= 9.0) criticidade = "crítico";

    const pacienteObjeto = {
        cpf, nome,
        dataNascimento: document.getElementById("nascPaciente").value,
        telefone: document.getElementById("telPaciente").value,
        unidadePaciente: document.getElementById("unidadePaciente")?.value || "UBS Vila Nova",
        equipePaciente: document.getElementById("equipePaciente")?.value || "Equipe Verde",
        hasSN: document.getElementById("hasSN").value,
        hasPAS: pas,
        hasPAD: parseInt(document.getElementById("hasPAD").value, 10) || null,
        hasClassif: document.getElementById("hasClassif").value,
        dmSN: document.getElementById("dmSN").value,
        dmHbA1c: hba1c,
        dmClassif: document.getElementById("dmClassif").value,
        tbSN: document.getElementById("tbSN").checked,
        hansenSN: document.getElementById("hansenSN").checked,
        soapSubjetivo: document.getElementById("soapSubjetivo").value,
        ciapPrincipal: document.getElementById("inputBuscaCIAPS").value,
        soapPlanoConduta: document.getElementById("soapPlanoConduta").value,
        ultimoMonitoramento: new Date().toLocaleDateString('pt-BR'),
        criticidade: criticidade
    };

    store.put(pacienteObjeto).onsuccess = function() {
        mostrarToast(`Sucesso: Prontuário de ${nome} gravado.`);
        fecharCabecalhoProntuario();
        navigate("inicio");
    };
}

function fecharCabecalhoProntuario() {
    const cabecalho = document.getElementById("cabecalhoProntuario");
    if (cabecalho) cabecalho.style.display = "none";
}

function mostrarToast(mensagem) {
    const toast = document.getElementById("toastNotification");
    if (toast) {
        toast.innerText = mensaje;
        toast.style.display = "block";
        setTimeout(() => { toast.style.display = "none"; }, 4000);
    }
}

/* ==========================================================================
   🛢️ SEÇÃO XII: INGESTÃO DE MATRIZ DE TESTES OPERACIONAIS (MOCK)
   ========================================================================== */

function alimentarBancoDadosMock() {
    const transaction = db.transaction(["pacientes", "usuarios"], "readwrite");
    const storePacientes = transaction.objectStore("pacientes");
    
    const pacientesMock = [
        { cpf: "111.111.111-11", nome: "Maria Oliveira de Souza", dataNascimento: "1965-04-12", telefone: "21999998888", unidadePaciente: "UBS Vila Nova", equipePaciente: "Equipe Verde", hasSN: "Sim", hasPAS: 175, hasPAD: 105, hasClassif: "⚠️ HAS Estágio 2", dmSN: "Não", tbSN: false, hansenSN: false, criticidade: "crítico", ultimoMonitoramento: "10/05/2026" },
        { cpf: "222.222.222-22", nome: "Carlos Eduardo da Silva", dataNascimento: "1972-09-23", telefone: "21988887777", unidadePaciente: "UBS Centro Médico", equipePaciente: "Equipe Azul", hasSN: "Não", dmSN: "Sim", dmHbA1c: 10.5, dmClassif: "⚠️ HbA1c Crítica", tbSN: false, hansenSN: false, criticidade: "crítico", ultimoMonitoramento: "12/05/2026" }
    ];

    pacientesMock.forEach(p => storePacientes.put(p));
    transaction.oncomplete = function() {
        console.log("💥 [Mock Engine] Carga operacional indexada com sucesso.");
        carregarDadosIniciaisEServicos();
    };
}
function alternarVisaoGestor(perfil) {
    const painelAdm = document.getElementById("blocoConfigAdmin");
    const btnCargaMassa = document.getElementById("btnInjetarMassa"); // Certifique-se que o ID existe no HTML
    
    if (perfil === "admin") {
        if (painelAdm) painelAdm.style.display = "block";
        if (btnCargaMassa) btnCargaMassa.style.display = "inline-block"; // Força a exibição
        console.log("🛡️ [RBAC] Privilégios de Admin restaurados.");
    } else {
        if (btnCargaMassa) btnCargaMassa.style.display = "none";
    }
}

/* ==========================================================================
   🎬 SEÇÃO XIII: ACRISTALAMENTO E DISPARO DE INICIALIZAÇÃO
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function() {
    inicializarBancoDados();
});
