/* ==========================================================================
   🗄️ CORE CONFIG: BANCO DE DADOS LOCAL (INDEXEDDB) & SESSÃO PEP
   ========================================================================== */
let db;
const DB_NAME = "SintaxeHubDB";
const DB_VERSION = 3;

document.addEventListener("DOMContentLoaded", () => {
    configurarIndexedDB();
    verificarSessao();
});

function configurarIndexedDB() {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = function(event) {
        console.error("Erro crítico ao abrir o IndexedDB:", event.target.error);
        mostrarToast("❌ Erro ao carregar banco de dados local.");
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        console.log("🗄️ IndexedDB conectado na versão " + DB_VERSION);
        
        if (localStorage.getItem("pep_sessao_ativa")) {
            inicializarAutocompleteCIAP();
            atualizarIndicadoresDashboard();
            atualizarCentralAvisosSininho();
            listarTodosBanco();
        }
    };

    request.onupgradeneeded = function(event) {
        const dbInstance = event.target.result;
        if (!dbInstance.objectStoreNames.contains("pacientes")) {
            const store = dbInstance.createObjectStore("pacientes", { keyPath: "cpf" });
            store.createIndex("nome", "nome", { unique: false });
            store.createIndex("ubs", "ubs", { unique: false });
            store.createIndex("equipe", "equipe", { unique: false });
        }
    };
}

/* ==========================================================================
   🔐 SEGURANÇA: CONTROLE DE ACESSO E SESSÃO MUNICIPAL
   ========================================================================== */
const USUARIOS_MUNICIPAIS = {
    "440129": { nome: "Enf. Josimar Kapps", perfil: "admin" },
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
        
        inicializarAutocompleteCIAP();
        atualizarIndicadoresDashboard();
        atualizarCentralAvisosSininho();
        listarTodosBanco();
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

function ServerLogout() {
    localStorage.removeItem("pep_sessao_ativa");
    window.location.reload();
}

function efetuarLogout() {
    ServerLogout();
}

function alternarVisaoGestor(perfil) {
    const btnAuditoria = document.getElementById("btnAuditoria");
    if (perfil === "admin") {
        btnAuditoria.style.display = "inline-block";
        mostrarToast("🔄 Perfil de Gestor/Coordenador ativo.");
    } else {
        btnAuditoria.style.display = "none";
        if (document.getElementById("view-config").style.display === "block") {
            navigate('inicio');
        }
        mostrarToast("🔄 Perfil Assistencial ativo.");
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

    const linkAtivo = Array.from(document.querySelectorAll('.nav-link')).find(l => {
        const txt = l.innerText.toLowerCase();
        if (viewName === 'prontuario') return txt.includes('novo');
        if (viewName === 'banco') return txt.includes('base');
        if (viewName === 'discador') return txt.includes('busca');
        return txt.includes(viewName);
    });
    if (linkAtivo) linkAtivo.classList.add('active');

    if (viewName === 'banco') listarTodosBanco();
    if (viewName === 'discador') renderizarAbaDiscador();
}

function mostrarCard(id, valor) {
    const alvo = document.getElementById(id);
    if (alvo) {
        alvo.style.display = (valor === "Sim") ? "block" : "none";
    }
}

/* ==========================================================================
   🧬 MOTOR DE AUTOCOMPLETAR: CIAP-2
   ========================================================================== */
function inicializarAutocompleteCIAP() {
    const datalist = document.getElementById("listaCIAP");
    if (!datalist) return;
    datalist.innerHTML = "";
    Object.entries(CATALOGO_CIAPS2).forEach(([codigo, descricao]) => {
        const option = document.createElement("option");
        option.value = `${codigo} - ${descricao}`;
        datalist.appendChild(option);
    });
}

/* ==========================================================================
   🩺 LÓGICA CLÍNICA E REGRAS DE NEGÓCIO
   ========================================================================== */
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
    
    const blocoAmpi = document.getElementById("ampiBloco");
    if (blocoAmpi) {
        blocoAmpi.style.display = (idade >= 60) ? "block" : "none";
    }
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
   📍 GEOLOCALIZAÇÃO: API VIACEP
   ========================================================================== */
function buscarCEP() {
    const cep = document.getElementById("CEP").value.replace(/\D/g, '');
    if (cep.length !== 8) return;

    document.getElementById("endPaciente").value = "Buscando endereço...";

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
   🔔 CENTRAL DE AVISOS TERRITORIAIS
   ========================================================================== */
function atualizarCentralAvisosSininho() {
    if (!db) return;
    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.getAll();

    request.onsuccess = function() {
        const todosPacientes = request.result;
        const expirados = todosPacientes.filter(p => p.reavaliacaoDias !== undefined && parseInt(p.reavaliacaoDias) === 0);
        const contador = document.getElementById("contadorAvisosSininho");
        const container = document.getElementById("centralAvisosContainer");
        
        if (contador && container) {
            contador.innerText = expirados.length;
            if (expirados.length > 0) {
                container.style.background = "var(--danger)";
                container.style.animation = "pulse 1.5s infinite";
            } else {
                container.style.background = "#1f2937";
                container.style.animation = "none";
            }
        }
    };
}

/* ==========================================================================
   💾 OPERAÇÕES DE PERSISTÊNCIA (SOAP)
   ========================================================================== */
function salvarProntuario() {
    const cpf = document.getElementById("cpfPaciente").value;
    const nome = document.getElementById("nomePaciente").value;

    if (!cpf || !nome) {
        mostrarToast("❌ Erro: O preenchimento do Nome e do CPF é obrigatório.");
        return;
    }

    const sub = document.getElementById("soapSubjetivo").value;
    const pa = document.getElementById("objPA").value;
    const fc = document.getElementById("objFC").value;
    const fr = document.getElementById("objFR").value;
    const sat = document.getElementById("objSatO2").value;
    const dor = document.getElementById("objDor").value;

    const elExameStatus = document.querySelector('input[name="exameFisicoStatus"]:checked');
    const examenStatus = elExameStatus ? elExameStatus.value : "Normal";
    const exameDetalhe = document.getElementById("soapObjetivoAlterado").value;
    
    const ciap = document.getElementById("inputBuscaCIAPS").value;
    const plano = document.getElementById("soapPlanoConduta").value;
    const diasPrazo = document.getElementById("soapReavaliacaoDias").value;

    const exameFisicoTexto = examenStatus === "Normal" ? "Normal" : `ALTERADO: ${exameDetalhe}`;

    const novaEvolucaoFormatada = `--- ATENDIMENTO EM ${new Date().toLocaleDateString('pt-BR')} ---\n` +
                                  `S: ${sub || "Sem queixas."}\n` +
                                  `O: [PA: ${pa || 'N/I'} | FC: ${fc || 'N/I'} bpm | SatO₂: ${sat || 'N/I'}%]\n` +
                                  `   Exame Físico: ${exameFisicoTexto}\n` +
                                  `A: CIAP: ${ciap || "N/C"}\n` +
                                  `P: ${plano || "Padrão."} | Retorno: ${diasPrazo}d`;

    const transactionBuscar = db.transaction(["pacientes"], "readonly");
    const storeBuscar = transactionBuscar.objectStore("pacientes");
    const requestBuscar = storeBuscar.get(cpf);

    requestBuscar.onsuccess = function() {
        let historicoEvolucoes = [];
        if (requestBuscar.result && requestBuscar.result.historicoEvolucoes) {
            historicoEvolucoes = requestBuscar.result.historicoEvolucoes;
        }
        historicoEvolucoes.unshift(novaEvolucaoFormatada);

        const pacientePayload = {
            cpf: cpf,
            nome: nome,
            nasc: document.getElementById("nascPaciente").value,
            id: cpf,
            idade: document.getElementById("idadePaciente").value,
            tel: document.getElementById("telPaciente").value,
            cep: document.getElementById("CEP").value,
            endereco: document.getElementById("endPaciente").value,
            numero: document.getElementById("endNumero").value,
            complemento: document.getElementById("endComplemento").value,
            ubs: document.getElementById("unidadePaciente").value,
            equipe: document.getElementById("equipePaciente").value,
            
            has: document.getElementById("hasSN").value,
            hasSN: document.getElementById("hasSN").value,
            pas: document.getElementById("hasPAS").value,
            pad: document.getElementById("hasPAD").value,
            classifHas: document.getElementById("hasClassif").value,
            
            dm: document.getElementById("dmSN").value,
            dmSN: document.getElementById("dmSN").value,
            hba1c: document.getElementById("dmHbA1c").value,
            classifDm: document.getElementById("dmClassif").value,
            
            gestante: document.getElementById("gestanteSN").value,
            gestanteSN: document.getElementById("gestanteSN").value,
            dum: document.getElementById("gestDUM").value,
            ig: document.getElementById("gestIG").value,
            dpp: document.getElementById("gestDPP").value,
            
            tb: document.getElementById("tbSN").checked ? "Sim" : "Não",
            tbSN: document.getElementById("tbSN").checked ? "Sim" : "Não",
            hansen: document.getElementById("hansenSN").checked ? "Sim" : "Não",
            hansenSN: document.getElementById("hansenSN").checked ? "Sim" : "Não",
            ampi: document.getElementById("ampiPaciente").value,
            
            objPA: pa,
            objFC: fc,
            objFR: fr,
            objSatO2: sat,
            objDor: dor,
            exameFisicoStatus: examenStatus,
            soapObjetivoAlterado: exameDetalhe,
            
            reavaliacaoDias: parseInt(diasPrazo) || 0,
            historicoEvolucoes: historicoEvolucoes
        };

        const transactionSalvar = db.transaction(["pacientes"], "readwrite");
        const storeSalvar = transactionSalvar.objectStore("pacientes");
        const requestSalvar = storeSalvar.put(pacientePayload);

        requestSalvar.onsuccess = function() {
            mostrarToast("💾 Prontuário gravado na base territorial!");
            limparFormularioProntuario();
            atualizarIndicadoresDashboard();
            atualizarCentralAvisosSininho();
            navigate('inicio');
        };
    };
}

function limparFormularioProntuario() {
    document.getElementById("soapSubjetivo").value = "";
    document.getElementById("objPA").value = "";
    document.getElementById("objFC").value = "";
    document.getElementById("objFR").value = "";
    document.getElementById("objSatO2").value = "";
    document.getElementById("objDor").value = "0";
    
    const rdbNormal = document.querySelector('input[name="exameFisicoStatus"][value="Normal"]');
    if (rdbNormal) rdbNormal.checked = true;
    document.getElementById("blocoExameAlterado").style.display = "none";
    document.getElementById("soapObjetivoAlterado").value = "";
    document.getElementById("soapPlanoConduta").value = "";
    document.getElementById("soapReavaliacaoDias").value = "30";
    document.getElementById("inputBuscaCIAPS").value = "";

    const campos = ["nomePaciente", "cpfPaciente", "nascPaciente", "idadePaciente", "telPaciente", "CEP", "endPaciente", "endNumero", "endComplemento", "hasPAS", "hasPAD", "hasClassif", "dmHbA1c", "dmClassif", "gestDUM", "gestIG", "gestDPP"];
    campos.forEach(c => { const el = document.getElementById(c); if (el) el.value = ""; });

    document.getElementById("hasSN").value = "Não";
    document.getElementById("dmSN").value = "Não";
    document.getElementById("gestanteSN").value = "Não";
    document.getElementById("tbSN").checked = false;
    document.getElementById("hansenSN").checked = false;
    document.getElementById("unidadePaciente").value = "";
    document.getElementById("equipePaciente").value = "";

    document.getElementById("cardHAS").style.display = "none";
    document.getElementById("cardDM").style.display = "none";
    document.getElementById("cardGestante").style.display = "none";
    if (document.getElementById("ampiBloco")) document.getElementById("ampiBloco").style.display = "none";
    document.getElementById("cabecalhoProntuario").style.display = "none";
    document.getElementById("linhaTempoEvolucoes").innerHTML = "";
}

/* ==========================================================================
   🔍 MECANISMO DE BUSCA ATIVA (CORRIGIDO)
   ========================================================================== */
function buscarInicio() {
    const termo = document.getElementById("buscaNomeInicio").value.toLowerCase();
    const container = document.getElementById("resultadoInicio");

    if (!termo) {
        container.innerHTML = `<em style="color: #94a3b8;">Introduza um critério acima para pesquisar.</em>`;
        return;
    }

    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.getAll();

    request.onsuccess = function() {
        const resultados = request.result.filter(p => p.nome.toLowerCase().includes(termo) || p.cpf.includes(termo));
        
        if (resultados.length === 0) {
            container.innerHTML = `<p style="color: var(--danger); font-weight:600;">⚠️ Nenhum cidadão localizado.</p>`;
            return;
        }

        // CORREÇÃO DA SINTAXE DE RENDERIZAÇÃO: Monta o HTML string perfeitamente estruturado
        let htmlGrid = `<div class="busca-ativa-grid">`;
        resultados.forEach(p => {
            let badges = "";
            if (p.has === "Sim" || p.hasSN === "Sim") badges += `<span class="tag-clinica" style="background:var(--danger)">HAS</span> `;
            if (p.dm === "Sim" || p.dmSN === "Sim") badges += `<span class="tag-clinica" style="background:var(--success)">DM</span> `;
            if (p.gestante === "Sim" || p.gestanteSN === "Sim") badges += `<span class="tag-clinica" style="background:var(--warning)">PN</span> `;
            if (p.reavaliacaoDias === 0) badges += `<span class="tag-clinica" style="background:#7c2d12">🔔 CRÍTICO</span> `;

            htmlGrid += `
                <div class="busca-ativa-card" onclick="abrirAtendimentoExistente('${p.cpf}')">
                    <h4>${p.nome}</h4>
                    <p><strong>CPF:</strong> ${p.cpf} | <strong>Idade:</strong> ${p.idade || 'N/I'} anos</p>
                    <p><strong>UBS:</strong> ${p.ubs || "Não vinculada"} | ${p.equipe || "Sem equipe"}</p>
                    <div class="badges-container" style="margin-top:8px;">${badges}</div>
                </div>
            `;
        });
        htmlGrid += `</div>`;
        container.innerHTML = htmlGrid;
    };
}

function abrirAtendimentoExistente(cpf) {
    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.get(cpf);

    request.onsuccess = function() {
        const p = request.result;
        if (!p) return;

        navigate('prontuario');
        limparFormularioProntuario();

        document.getElementById("nomePaciente").value = p.nome;
        document.getElementById("cpfPaciente").value = p.cpf;
        document.getElementById("nascPaciente").value = p.nasc;
        document.getElementById("idadePaciente").value = p.idade;
        document.getElementById("telPaciente").value = p.tel;
        document.getElementById("CEP").value = p.cep || "";
        document.getElementById("endPaciente").value = p.endereco || "";
        document.getElementById("endNumero").value = p.numero || "";
        document.getElementById("endComplemento").value = p.complemento || "";
        document.getElementById("unidadePaciente").value = p.ubs || "";
        document.getElementById("equipePaciente").value = p.equipe || "";

        document.getElementById("objPA").value = p.objPA || "";
        document.getElementById("objFC").value = p.objFC || "";
        document.getElementById("objFR").value = p.objFR || "";
        document.getElementById("objSatO2").value = p.objSatO2 || "";
        document.getElementById("objDor").value = p.objDor || "0";

        if (p.exameFisicoStatus === "Alterado") {
            const rdbAlterado = document.querySelector('input[name="exameFisicoStatus"][value="Alterado"]');
            if (rdbAlterado) rdbAlterado.checked = true;
            document.getElementById("blocoExameAlterado").style.display = "block";
            document.getElementById("soapObjetivoAlterado").value = p.soapObjetivoAlterado || "";
        }

        const valHas = p.has || p.hasSN || "Não";
        document.getElementById("hasSN").value = valHas;
        mostrarCard('cardHAS', valHas);
        document.getElementById("hasPAS").value = p.pas || "";
        document.getElementById("hasPAD").value = p.pad || "";
        document.getElementById("hasClassif").value = p.classifHas || "";

        const valDm = p.dm || p.dmSN || "Não";
        document.getElementById("dmSN").value = valDm;
        mostrarCard('cardDM', valDm);
        document.getElementById("dmHbA1c").value = p.hba1c || "";
        document.getElementById("dmClassif").value = p.classifDm || "";

        const valGest = p.gestante || p.gestanteSN || "Não";
        document.getElementById("gestanteSN").value = valGest;
        mostrarCard('cardGestante', valGest);
        document.getElementById("gestDUM").value = p.dum || "";
        document.getElementById("gestIG").value = p.ig || "";
        document.getElementById("gestDPP").value = p.dpp || "";

        document.getElementById("tbSN").checked = (p.tb === "Sim" || p.tbSN === "Sim");
        document.getElementById("hansenSN").checked = (p.hansen === "Sim" || p.hansenSN === "Sim");
        
        const bAmpi = document.getElementById("ampiBloco");
        if (bAmpi) bAmpi.style.display = (parseInt(p.idade) >= 60) ? "block" : "none";

        if (p.historicoEvolucoes && p.historicoEvolucoes.length > 0) {
            let htmlTimeline = `<label style='font-weight:700;'>⏳ Histórico Clínico Digital:</label><div class='timeline'>`;
            p.historicoEvolucoes.forEach(evo => {
                htmlTimeline += `<div class='timeline-item'><div class='timeline-body' style='white-space:pre-wrap;'>${evo}</div></div>`;
            });
            htmlTimeline += `</div>`;
            document.getElementById("linhaTempoEvolucoes").innerHTML = htmlTimeline;
        }

        document.getElementById("cabecalhoNome").innerText = `📋 Prontuário Ativo: ${p.nome} (CPF: ${p.cpf})`;
        document.getElementById("cabecalhoProntuario").style.display = "block";
    };
}

/* ==========================================================================
   📊 VIGILÂNCIA EPIDEMIOLÓGICA & RELATÓRIOS
   ========================================================================== */
function atualizarIndicadoresDashboard() {
    if (!db) return;
    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.getAll();

    request.onsuccess = function() {
        const dados = request.result;
        document.getElementById("dashHAS").innerText = dados.filter(p => p.has === "Sim" || p.hasSN === "Sim").length;
        document.getElementById("dashDM").innerText = dados.filter(p => p.dm === "Sim" || p.dmSN === "Sim").length;
        document.getElementById("dashGest").innerText = dados.filter(p => p.gestante === "Sim" || p.gestanteSN === "Sim").length;
        document.getElementById("dashTB").innerText = dados.filter(p => p.tb === "Sim" || p.tbSN === "Sim").length;
        document.getElementById("dashHansen").innerText = dados.filter(p => p.hansen === "Sim" || p.hansenSN === "Sim").length;
    };
}

function listarTodosBanco() {
    if (!db) return;
    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.getAll();

    request.onsuccess = function() {
        const dados = request.result;
        const container = document.getElementById("tabelaBancoContainer");

        if (dados.length === 0) {
            container.innerHTML = `<p style="color:#9ca3af;">Nenhum prontuário residente no banco local.</p>`;
            return;
        }

        let html = `<table><thead><tr><th>Nome do Utente</th><th>CPF</th><th>Idade</th><th>UBS</th><th>Linhas Ativas</th><th>Prazo</th><th>Ações</th></tr></thead><tbody>`;
        dados.forEach(p => {
            let lines = [];
            if (p.has === "Sim" || p.hasSN === "Sim") lines.push("HAS");
            if (p.dm === "Sim" || p.dmSN === "Sim") lines.push("DM");
            if (p.gestante === "Sim" || p.gestanteSN === "Sim") lines.push("PN");
            if (p.tb === "Sim" || p.tbSN === "Sim") lines.push("TB");
            if (p.hansen === "Sim" || p.hansenSN === "Sim") lines.push("HANSEN");

            const badgePrazo = p.reavaliacaoDias === 0 ? `<b style="color:var(--danger)">🔔 0 Dias</b>` : `${p.reavaliacaoDias} Dias`;
            html += `
                <tr>
                    <td><strong>${p.nome}</strong></td>
                    <td>${p.cpf}</td>
                    <td>${p.idade || 'N/I'} Anos</td>
                    <td>${p.ubs || "Não informada"}</td>
                    <td>${lines.join(", ") || "Nenhuma"}</td>
                    <td>${badgePrazo}</td>
                    <td>
                        <button style="padding:4px 8px; font-size:12px;" onclick="abrirAtendimentoExistente('${p.cpf}')">Abrir</button>
                        <button style="padding:4px 8px; font-size:12px; background:var(--danger);" onclick="removerPacienteDoTerritorio('${p.cpf}')">Excluir</button>
                    </td>
                </tr>
            `;
        });
        html += `</tbody></table>`;
        container.innerHTML = html;
    };
}

function removerPacienteDoTerritorio(cpf) {
    if (!confirm("Remover este utente do território?")) return;
    const transaction = db.transaction(["pacientes"], "readwrite");
    const store = transaction.objectStore("pacientes");
    request = store.delete(cpf);
    request.onsuccess = function() {
        mostrarToast("🗑️ Registro removido.");
        listarTodosBanco();
        atualizarIndicadoresDashboard();
        atualizarCentralAvisosSininho();
    };
}

/* ==========================================================================
   📊 MODAL ANALYTICS
   ========================================================================== */
let linhaCuidadoAtualVisualizacao = "has";
function abrirPainelEpidemiologico(linhaCuidado) {
    linhaCuidadoAtualVisualizacao = linhaCuidado;
    document.getElementById("painelEpidemiologicoContainer").style.display = "block";
    carregarFiltrosModalUBS();
}

function fecharPainelEpidemiologico() {
    document.getElementById("painelEpidemiologicoContainer").style.display = "none";
}

function carregarFiltrosModalUBS() {
    document.getElementById("filtroUBS").innerHTML = "<option value='TODAS'>Todas Unidades</option><option value='UBS Centro Médico'>UBS Centro Médico</option><option value='UBS Vila Nova'>UBS Vila Nova</option>";
    document.getElementById("filtroEquipe").innerHTML = "<option value='TODAS'>Todas Equipes</option><option value='Equipe Verde'>Equipe Verde</option><option value='Equipe Azul'>Equipe Azul</option>";
    document.getElementById("filtroRisco").value = "TODOS";
    aplicarFiltrosRelatorio();
}

function aplicarFiltrosRelatorio() {
    if (!db) return;
    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.getAll();

    request.onsuccess = function() {
        let filtrados = request.result;
        renderizarGraficosModal(filtrados);
    };
}

function renderizarGraficosModal(lista) {
    const total = lista.length;
    const criticos = lista.filter(p => p.reavaliacaoDias === 0).length;
    const pctCritico = total > 0 ? Math.round((criticos / total) * 100) : 0;

    document.getElementById("containerGraficoDonut").innerHTML = `<b>${pctCritico}% Críticos</b>`;
    document.getElementById("containerGraficoBarras").innerHTML = `Total analisado: ${total} utentes.`;
}

/* ==========================================================================
   ⚙️ GESTÃO DE ESTRESSE DE MEMÓRIA & INTEROPERABILIDADE
   ========================================================================== */
function gerarCargaMassaOitoMil() {
    if (!confirm("Injetar 8.000 cadastros para teste de latência?")) return;
    mostrarToast("⏳ Injetando matriz epidemiológica...");
    // Loop de stress omitido por concisão de escopo acadêmico
}

function processarArquivoEsus(input) {
    // Processamento do barramento e-SUS JSON
}

/* ==========================================================================
   📞 BUSCA ATIVA: DISCADOR AUTOMÁTICO (CORRIGIDO E EXIBINDO LINHA DE CUIDADO)
   ========================================================================== */
function discador(paciente) {
    if (!paciente || !paciente.tel) {
        mostrarToast("❌ Erro: Utente sem telefone cadastrado.");
        return;
    }

    const diasPrazo = parseInt(paciente.reavaliacaoDias);
    const ehCritico = (diasPrazo === 0);

    const sessao = localStorage.getItem("pep_sessao_ativa");
    const enfermeiro = sessao ? JSON.parse(sessao).nome : "Enfermeiro da Família";

    let linhasAtivas = [];
    if (paciente.has === "Sim" || paciente.hasSN === "Sim") linhasAtivas.push("Hipertensão");
    if (paciente.dm === "Sim" || paciente.dmSN === "Sim") linhasAtivas.push("Diabetes");
    if (paciente.gestante === "Sim" || paciente.gestanteSN === "Sim") linhasAtivas.push("Pré-Natal");
    if (paciente.tb === "Sim" || paciente.tbSN === "Sim") linhasAtivas.push("Tuberculose");
    if (paciente.hansen === "Sim" || paciente.hansenSN === "Sim") linhasAtivas.push("Hanseníase");
    
    const contextoClinico = linhasAtivas.length > 0 ? `acompanhamento de ${linhasAtivas.join(" e ")}` : "monitoramento de saúde";

    let mensagem = `Olá, *${paciente.nome}*! Aqui é o *${enfermeiro}* da sua equipe de Atenção Primária à Saúde (APS).\n\n`;
    if (ehCritico) {
        mensagem += `🚨 Constatamos no nosso sistema territorial que o prazo para a sua *reavaliação clínica urgente ou renovação de receita venceu*.\n\n`;
    } else {
        mensagem += `⏳ Faz mais de *90 dias* desde o seu último registro de monitoramento para o ${contextoClinico}.\n\n`;
    }
    mensagem += `Por favor, responda a esta mensagem para agendarmos o seu atendimento na sua UBS de vínculo (*${paciente.ubs || 'Unidade Local'}*).\n\n`;

    let telefoneLimpo = paciente.tel.replace(/\D/g, "");
    if (telefoneLimpo.length === 11 || telefoneLimpo.length === 10) telefoneLimpo = "55" + telefoneLimpo;

    const urlWhatsapp = `https://api.whatsapp.com/send?phone=${telefoneLimpo}&text=${encodeURIComponent(mensagem)}`;
    window.open(urlWhatsapp, "_blank");
}

function renderizarAbaDiscador() {
    if (!db) return;
    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.getAll();

    request.onsuccess = function() {
        const dados = request.result;
        const alvosBuscaAtiva = dados.filter(p => {
            const dias = parseInt(p.reavaliacaoDias);
            return (dias === 0 || dias > 90);
        });

        const container = document.getElementById("tabelaDiscadorContainer");
        if (!container) return;

        if (alvosBuscaAtiva.length === 0) {
            container.innerHTML = `<p style="color:var(--success); font-weight:600; padding:15px;">🎉 Nenhum utente em estado crítico no território.</p>`;
            return;
        }

        // ALTERAÇÃO ENCOMENDADA: Inclusão da coluna "Motivo / Linha de Cuidado" na tabela
        let htmlTable = `<table>
            <thead>
                <tr>
                    <th>Utente Vulnerável</th>
                    <th>Motivo / Linha de Cuidado</th>
                    <th>Telefone</th>
                    <th>Vínculo UBS</th>
                    <th>Status Territorial</th>
                    <th>Ação Instantânea</th>
                </tr>
            </thead>
            <tbody>`;

        alvosBuscaAtiva.forEach(p => {
            const dias = parseInt(p.reavaliacaoDias);
            const statusBadge = dias === 0 
                ? `<span style="color:white; background:var(--danger); padding:2px 6px; border-radius:4px; font-size:11px; font-weight:700;">🚨 PRAZO EXPIRADO</span>`
                : `<span style="color:white; background:#7c2d12; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:700;">⏳ ABANDONO (+${dias}d)</span>`;

            // Mapeando o motivo clínico para exibir na tela
            let linhasAlvo = [];
            if (p.has === "Sim" || p.hasSN === "Sim") linhasAlvo.push("Hipertensão (HAS)");
            if (p.dm === "Sim" || p.dmSN === "Sim") linhasAlvo.push("Diabetes (DM)");
            if (p.gestante === "Sim" || p.gestanteSN === "Sim") linhasAlvo.push("Pré-Natal (PN)");
            if (p.tb === "Sim" || p.tbSN === "Sim") linhasAlvo.push("Tuberculose");
            if (p.hansen === "Sim" || p.hansenSN === "Sim") linhasAlvo.push("Hanseníase");
            const motivoExibicao = linhasAlvo.length > 0 ? linhasAlvo.join(", ") : "Monitoramento Geral Geral";

            const stringObjetoSafe = encodeURIComponent(JSON.stringify(p));

            htmlTable += `
                <tr>
                    <td><strong>${p.nome}</strong><br><small style="color:#9ca3af">CPF: ${p.cpf}</small></td>
                    <td style="color:var(--success); font-weight:600;">${motivoExibicao}</td>
                    <td>${p.tel || "<i>Sem telefone</i>"}</td>
                    <td>${p.ubs || "Não cadastrada"}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button style="background:#25D366; color:white; border-color:#25D366; padding:4px 10px; font-size:12px; font-weight:600;" 
                                onclick="discador(JSON.parse(decodeURIComponent('${stringObjetoSafe}')))">
                            💬 Chamar no WhatsApp
                        </button>
                    </td>
                </tr>
            `;
        });

        htmlTable += `</tbody></table>`;
        container.innerHTML = htmlTable;
    };
}

/* ==========================================================================
   🍞 UTILS & MASCARAS
   ========================================================================== */
function mostrarToast(mensagem) {
    const toast = document.getElementById("toastNotification");
    if (!toast) return;
    toast.innerText = mensagem; // Correção do bug de atribuição colidida anterior
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
