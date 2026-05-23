/* ==========================================================================
   🗄️ CORE CONFIG: BANCO DE DADOS LOCAL (INDEXEDDB) & SESSÃO PEP
   ========================================================================== */
let db;
const DB_NAME = "SintaxeHubDB";
const DB_VERSION = 2; 

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
        console.log("🗄️ IndexedDB conectado com sucesso.");
        
        if (localStorage.getItem("pep_sessao_ativa")) {
            vincularCatalogoCipeJS();
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
            console.log("🗄️ ObjectStore 'pacientes' criada.");
        }
    };
}

/* ==========================================================================
   🔐 CONTROLE DE ACESSO: PERFIS E ISOLAMENTO DE DADOS POR EQUIPE
   ========================================================================== */
// Base de dados local com vínculo compulsório de Equipe
let USUARIOS_SISTEMA = JSON.parse(localStorage.getItem("pep_usuarios_painel")) || {
    "440129": { nome: "Enf. Josimar Kapps", perfil: "admin", equipe: "Todas" },
    "123456": { nome: "Enfª. Alessandra Cruz", perfil: "assistencial", equipe: "Equipe Verde" },
    "789012": { nome: "Técnico João Silva", perfil: "visualizador", equipe: "Equipe Azul" }
};

function autenticarUsuario() {
    const matricula = document.getElementById("loginUser").value.trim();
    const senha = document.getElementById("loginSenha").value;
    const erroDiv = document.getElementById("loginErro");

    if (USUARIOS_SISTEMA[matricula] && senha === "senha123") {
        const user = USUARIOS_SISTEMA[matricula];
        localStorage.setItem("pep_sessao_ativa", JSON.stringify(user));
        erroDiv.style.display = "none";
        verificarSessao();
        
        vincularCatalogoCipeJS();
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
        document.getElementById("nomeUsuarioLogado").innerText = `👤 ${user.nome} [${user.perfil.toUpperCase()} - ${user.equipe}]`;

        aplicarRestricoesDePerfil(user.perfil, user.equipe);
        navigate('inicio');
    } else {
        document.getElementById("loginScreen").style.display = "flex";
        document.getElementById("app").style.display = "none";
    }
}

function aplicarRestricoesDePerfil(perfil, equipe) {
    const seletorAcesso = document.getElementById("seletorNivelAcesso");
    const btnAuditoria = document.getElementById("btnAuditoria");
    const linkNovoProntuario = document.getElementById("navLinkNovoProntuario");
    const painelAdminVisual = document.getElementById("blocoConfigAdmin");

    // Controle de telas administrativas
    if (perfil === "admin") {
        if (seletorAcesso) seletorAcesso.style.display = "inline-block";
        if (btnAuditoria) btnAuditoria.style.display = "inline-block";
        if (painelAdminVisual) painelAdminVisual.style.display = "block";
    } else {
        if (seletorAcesso) seletorAcesso.style.display = "none";
        if (btnAuditoria) btnAuditoria.style.display = "none";
        if (painelAdminVisual) painelAdminVisual.style.display = "none";
    }

    // Regra estrita de bloqueio clínico para Visualizador
    if (perfil === "visualizador") {
        if (linkNovoProntuario) linkNovoProntuario.style.display = "none";
        mostrarToast(`🔒 Modo Visualizador: Acesso restrito aos dados de monitoramento da ${equipe}.`);
    } else {
        if (linkNovoProntuario) linkNovoProntuario.style.display = "inline-block";
    }
}

/**
 * PAINEL ADMINISTRATIVO: Criação de novos perfis amarrados à equipe
 */
function criarNovoUsuarioPainel() {
    const matricula = document.getElementById("adminMatricula").value.trim();
    const nome = document.getElementById("adminNome").value.trim();
    const perfil = document.getElementById("adminPerfil").value;
    const equipe = document.getElementById("adminEquipe").value;

    if (!matricula || !nome || !perfil || !equipe) {
        mostrarToast("❌ Preencha todos os campos do formulário de usuário.");
        return;
    }

    USUARIOS_SISTEMA[matricula] = { nome: nome, perfil: perfil, equipe: equipe };
    localStorage.setItem("pep_usuarios_painel", JSON.stringify(USUARIOS_SISTEMA));
    
    mostrarToast(`✅ Usuário ${nome} cadastrado com sucesso na ${equipe}!`);
    
    // Limpa campos do painel administrador
    document.getElementById("adminMatricula").value = "";
    document.getElementById("adminNome").value = "";
}

function efetuarLogout() {
    localStorage.removeItem("pep_sessao_ativa");
    window.location.reload();
}

/* ==========================================================================
   🗺️ ROTAS NATIVAS E COMPORTAMENTO DE TELA
   ========================================================================== */
function navigate(viewName) {
    const sessao = localStorage.getItem("pep_sessao_ativa");
    const user = sessao ? JSON.parse(sessao) : null;

    if (user && user.perfil === "visualizador" && viewName === "prontuario") {
        mostrarToast("🚫 Permissão negada: Seu perfil não possui atribuições assistenciais.");
        return;
    }

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
   🧬 INTEGRAÇÃO CIPE.JS VIA ESCOPO GLOBAL WINDOW
   ========================================================================== */
function vincularCatalogoCipeJS() {
    const datalist = document.getElementById("listaCIPE");
    if (!datalist) return;

    datalist.innerHTML = "";
    const catalogoOrigem = window.CATALOGO_CIPE || window.cipe || null;

    if (!catalogoOrigem) {
        console.warn("⚠️ Arquivo 'cipe.js' ausente ou objeto não inicializado.");
        return;
    }

    Object.entries(catalogoOrigem).forEach(([codigo, descricao]) => {
        const option = document.createElement("option");
        option.value = `${codigo} - ${descricao}`;
        datalist.appendChild(option);
    });
}

/* ==========================================================================
   🩺 LÓGICA CLÍNICA E SUPORTE DINÂMICO AO REGISTRO S.O.A.P.
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
   🔔 CENTRAL DE AVISOS TERRITORIAIS COM ISOLAMENTO DE FILTRO
   ========================================================================== */
function atualizarCentralAvisosSininho() {
    if (!db) return;

    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.getAll();

    request.onsuccess = function() {
        const sessao = localStorage.getItem("pep_sessao_ativa");
        const user = sessao ? JSON.parse(sessao) : null;
        if (!user) return;

        // Regra de Isolamento Territorial: Filtra os pacientes antes de calcular os avisos
        let pacientesFiltrados = request.result;
        if (user.perfil !== "admin") {
            pacientesFiltrados = pacientesFiltrados.filter(p => p.equipe === user.equipe);
        }

        const expirados = pacientesFiltrados.filter(p => p.reavaliacaoDias !== undefined && parseInt(p.reavaliacaoDias) === 0);

        const contador = document.getElementById("contadorAvisosSininho");
        const container = document.getElementById("centralAvisosContainer");
        
        if (contador && container) {
            contador.innerText = expirados.length;
            if (expirados.length > 0) {
                container.style.background = "var(--danger)";
                container.style.animation = "pulse 1.5s infinite";
            } else {
                container.style.background = "#334155";
                container.style.animation = "none";
            }
        }
    };
}

/* ==========================================================================
   💾 OPERAÇÕES DE PERSISTÊNCIA E VALIDAÇÃO DE SEGURANÇA
   ========================================================================== */
function salvarProntuario() {
    const cpf = document.getElementById("cpfPaciente").value.trim();
    const nome = document.getElementById("nomePaciente").value.trim();
    const equipePaciente = document.getElementById("equipePaciente").value;

    const sessao = localStorage.getItem("pep_sessao_ativa");
    const user = sessao ? JSON.parse(sessao) : null;

    if (!cpf || !nome || !equipePaciente) {
        mostrarToast("❌ Erro: Nome, CPF e Equipe são obrigatórios para salvar.");
        return;
    }

    // Trava de segurança: impede que profissional insira dados fora de sua equipe de atuação
    if (user && user.perfil !== "admin" && equipePaciente !== user.equipe) {
        mostrarToast(`🚫 Operação Negada: Você só pode registrar pacientes para a sua equipe (${user.equipe}).`);
        return;
    }

    const sub = document.getElementById("soapSubjetivo").value;
    const pa = document.getElementById("objPA").value;
    const fc = document.getElementById("objFC").value;
    const fr = document.getElementById("objFR").value;
    const sat = document.getElementById("objSatO2").value;
    const dor = document.getElementById("objDor").value;

    const examenStatus = document.querySelector('input[name="exameFisicoStatus"]:checked').value;
    const exameDetalhe = document.getElementById("soapObjetivoAlterado").value;
    const cipeSelecionada = document.getElementById("inputBuscaCIPE").value;
    const plano = document.getElementById("soapPlanoConduta").value;
    const diasPrazo = document.getElementById("soapReavaliacaoDias").value;

    const exameFisicoTexto = examenStatus === "Normal" ? "Normal / Sem particularidades" : `ALTERADO: ${exameDetalhe}`;

    const novaEvolucaoFormatada = `--- ATENDIMENTO MUNICIPAL EM ${new Date().toLocaleDateString('pt-BR')} ---\n` +
                                  `S: ${sub || "Sem queixas."}\n` +
                                  `O: [SSVV -> PA: ${pa || 'N/I'} | FC: ${fc || 'N/I'} bpm | SatO₂: ${sat || 'N/I'}%]\n` +
                                  `   Exame: ${exameFisicoTexto}\n` +
                                  `A: CIPE: ${cipeSelecionada || "Não mapeado."}\n` +
                                  `P: Conduta: ${plano || "Plano padrão."} | Prazo: ${diasPrazo} dias.`;

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
            nascimento: document.getElementById("nascPaciente").value,
            idade: document.getElementById("idadePaciente").value,
            telefone: document.getElementById("telPaciente").value,
            cep: document.getElementById("CEP").value,
            endereco: document.getElementById("endPaciente").value,
            numero: document.getElementById("endNumero").value,
            complemento: document.getElementById("endComplemento").value,
            ubs: document.getElementById("unidadePaciente").value,
            equipe: equipePaciente,
            
            has: document.getElementById("hasSN").value,
            hasPAS: document.getElementById("hasPAS").value,
            hasPAD: document.getElementById("hasPAD").value,
            classifHas: document.getElementById("hasClassif").value,
            
            dm: document.getElementById("dmSN").value,
            hba1c: document.getElementById("dmHbA1c").value,
            classifDm: document.getElementById("dmClassif").value,
            
            gestante: document.getElementById("gestanteSN").value,
            gestDUM: document.getElementById("gestDUM").value,
            gestIG: document.getElementById("gestIG").value,
            gestDPP: document.getElementById("gestDPP").value,
            
            tuberculose: document.getElementById("tbSN").checked ? "Sim" : "Não",
            hanseniase: document.getElementById("hansenSN").checked ? "Sim" : "Não",
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
            mostrarToast("💾 Registro Clínico territorial salvo.");
            limparFormularioProntuario();
            atualizarIndicadoresDashboard();
            atualizarCentralAvisosSininho();
            listarTodosBanco();
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
    const radNormal = document.querySelector('input[name="exameFisicoStatus"][value="Normal"]');
    if (radNormal) radNormal.checked = true;
    document.getElementById("blocoExameAlterado").style.display = "none";
    document.getElementById("soapObjetivoAlterado").value = "";
    document.getElementById("soapPlanoConduta").value = "";
    document.getElementById("soapReavaliacaoDias").value = "0";
    document.getElementById("inputBuscaCIPE").value = "";

    const campos = ["nomePaciente", "cpfPaciente", "nascPaciente", "idadePaciente", "telPaciente", "CEP", "endPaciente", "endNumero", "endComplemento", "hasPAS", "hasPAD", "hasClassif", "dmHbA1c", "dmClassif", "gestDUM", "gestIG", "gestDPP"];
    campos.forEach(c => { const el = document.getElementById(c); if(el) el.value = ""; });

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
   🔍 CONSULTA EPIDEMIOLÓGICA COM ISOLAMENTO DE ACESSO GEOGRÁFICO
   ========================================================================== */
function buscarInicio() {
    const termo = document.getElementById("buscaNomeInicio").value.toLowerCase().trim();
    const container = document.getElementById("resultadoInicio");

    if (!termo) {
        container.innerHTML = `<em style="color: #94a3b8;">Introduza um critério acima para pesquisar.</em>`;
        return;
    }

    const sessao = localStorage.getItem("pep_sessao_ativa");
    const user = sessao ? JSON.parse(sessao) : null;
    if (!user) return;

    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.getAll();

    request.onsuccess = function() {
        // Aplicação do filtro geográfico e de busca simultaneamente
        const resultados = request.result.filter(p => {
            const nomeMatch = p.nome.toLowerCase().includes(termo);
            const cpfMatch = p.cpf.includes(termo);
            
            // Administrador vê tudo, equipes específicas têm escopo fechado
            const equipeMatch = (user.perfil === "admin") || (p.equipe === user.equipe);
            
            return (nomeMatch || cpfMatch) && equipeMatch;
        });
        
        if (resultados.length === 0) {
            container.innerHTML = `<p style="color: var(--danger); font-weight:600;">⚠️ Nenhum prontuário localizado nesta área de abrangência.</p>`;
            return;
        }

        let html = '<table><thead><tr><th>Cidadão / CPF</th><th>Vínculo Operacional</th><th>Linhas Ativas</th><th>Ações</th></tr></thead><tbody>';
        resultados.forEach(p => {
            let tags = "";
            
            if (user.perfil !== "visualizador") {
                if (p.has === "Sim") tags += `<span class="tag-clinica" style="background:var(--danger); margin-right:4px;">HAS</span> `;
                if (p.dm === "Sim") tags += `<span class="tag-clinica" style="background:var(--success-dark); margin-right:4px;">DM</span> `;
                if (p.gestante === "Sim") tags += `<span class="tag-clinica" style="background:var(--warning); color:#000; margin-right:4px;">PRÉ-NATAL</span> `;
                if (p.tuberculose === "Sim") tags += `<span class="tag-clinica" style="background:#a21caf; margin-right:4px;">TB</span> `;
                if (p.hanseniase === "Sim") tags += `<span class="tag-clinica" style="background:var(--primary-neon); margin-right:4px;">HANSEN</span> `;
            } else {
                tags = `<span class="tag-clinica" style="background:#475569;">[PROTEGIDO]</span>`;
            }

            const botaoAcao = (user.perfil === "visualizador") 
                ? `<span style="color:var(--text-muted); font-size:12px;">Visualização</span>`
                : `<button class="btn-table-action btn-edit" onclick="carregarPacienteProntuario('${p.cpf}')">🩺 Abrir SOAP</button>`;

            html += `
                <tr>
                    <td><b>${p.nome}</b><br><small style="color:var(--text-muted);">${p.cpf}</small></td>
                    <td><small style="display:block; font-weight:600;">${p.ubs || "N/V"}</small><small style="color:var(--text-muted);">${p.equipe}</small></td>
                    <td>${tags}</td>
                    <td>${botaoAcao}</td>
                </tr>
            `;
        });
        html += `</tbody></table>`;
        container.innerHTML = html;
    };
}

function carregarPacienteProntuario(cpf) {
    const sessao = localStorage.getItem("pep_sessao_ativa");
    const user = sessao ? JSON.parse(sessao) : null;

    if (user && user.perfil === "visualizador") {
        mostrarToast("🚫 Acesso negado: Perfil sem credencial clínica.");
        return;
    }

    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.get(cpf);

    request.onsuccess = function() {
        const p = request.result;
        if (!p) return;

        // Camada dupla de proteção territorial na abertura direta por URL/Chamada
        if (user && user.perfil !== "admin" && p.equipe !== user.equipe) {
            mostrarToast("🚫 Violação de Acesso: Este paciente pertence a outro território.");
            return;
        }

        navigate('prontuario');
        limparFormularioProntuario();

        document.getElementById("nomePaciente").value = p.nome;
        document.getElementById("cpfPaciente").value = p.cpf;
        document.getElementById("nascPaciente").value = p.nascimento || "";
        document.getElementById("idadePaciente").value = p.idade || "";
        document.getElementById("telPaciente").value = p.telefone || "";
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
            document.querySelector('input[name="exameFisicoStatus"][value="Alterado"]').checked = true;
            document.getElementById("blocoExameAlterado").style.display = "block";
            document.getElementById("soapObjetivoAlterado").value = p.soapObjetivoAlterado || "";
        }

        document.getElementById("hasSN").value = p.has || "Não";
        mostrarCard('cardHAS', p.has || "Não");
        document.getElementById("hasPAS").value = p.hasPAS || "";
        document.getElementById("hasPAD").value = p.hasPAD || "";
        document.getElementById("hasClassif").value = p.classifHas || "";

        document.getElementById("dmSN").value = p.dm || "Não";
        mostrarCard('cardDM', p.dm || "Não");
        document.getElementById("dmHbA1c").value = p.hba1c || "";
        document.getElementById("dmClassif").value = p.classifDm || "";

        document.getElementById("gestanteSN").value = p.gestante || "Não";
        mostrarCard('cardGestante', p.gestante || "Não");
        document.getElementById("gestDUM").value = p.gestDUM || "";
        document.getElementById("gestIG").value = p.gestIG || "";
        document.getElementById("gestDPP").value = p.gestDPP || "";

        document.getElementById("tbSN").checked = (p.tuberculose === "Sim");
        document.getElementById("hansenSN").checked = (p.hanseniase === "Sim");
        document.getElementById("ampiPaciente").value = p.ampi || "Idoso Robusto";

        if (p.historicoEvolucoes && p.historicoEvolucoes.length > 0) {
            let htmlTimeline = `<label style='font-weight:700;'>⏳ Histórico Clínico Digital CIPE:</label><div class='timeline'>`;
            p.historicoEvolucoes.forEach(evo => {
                htmlTimeline += `<div class='timeline-item'><div class='timeline-body'>${evo}</div></div>`;
            });
            htmlTimeline += `</div>`;
            document.getElementById("linhaTempoEvolucoes").innerHTML = htmlTimeline;
        }

        document.getElementById("cabecalhoNome").innerText = `👤 UTENTE EM ATENDIMENTO ATIVO: ${p.nome.toUpperCase()}`;
        document.getElementById("cabecalhoProntuario").style.display = "block";
    };
}

/* ==========================================================================
   📊 DASHBOARD TERRITORIAL (SÓ SOMA O QUE FOR DA PRÓPRIA EQUIPE)
   ========================================================================== */
function atualizarIndicadoresDashboard() {
    if (!db) return;
    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.getAll();

    request.onsuccess = function() {
        const sessao = localStorage.getItem("pep_sessao_ativa");
        const user = sessao ? JSON.parse(sessao) : null;
        if (!user) return;

        // Se for visualizador, os cards mantêm blindagem de dados cega
        if (user.perfil === "visualizador") {
            ["dashHAS", "dashDM", "dashGest", "dashTB", "dashHansen"].forEach(id => {
                document.getElementById(id).innerText = "🔒";
            });
            return;
        }

        // Aplicação do filtro de territorialização na somatória de indicadores
        let dadosFiltrados = request.result;
        if (user.perfil !== "admin") {
            dadosFiltrados = dadosFiltrados.filter(p => p.equipe === user.equipe);
        }

        document.getElementById("dashHAS").innerText = dadosFiltrados.filter(p => p.has === "Sim").length;
        document.getElementById("dashDM").innerText = dadosFiltrados.filter(p => p.dm === "Sim").length;
        document.getElementById("dashGest").innerText = dadosFiltrados.filter(p => p.gestante === "Sim").length;
        document.getElementById("dashTB").innerText = dadosFiltrados.filter(p => p.tuberculose === "Sim").length;
        document.getElementById("dashHansen").innerText = dadosFiltrados.filter(p => p.hanseniase === "Sim").length;
    };
}

function listarTodosBanco() {
    if (!db) return;
    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.getAll();

    request.onsuccess = function() {
        const container = document.getElementById("tabelaBancoContainer");
        const sessao = localStorage.getItem("pep_sessao_ativa");
        const user = sessao ? JSON.parse(sessao) : null;
        if (!user) return;

        // Filtro territorial compulsório para a listagem interna do banco
        let dadosExibicao = request.result;
        if (user.perfil !== "admin") {
            dadosExibicao = dadosExibicao.filter(p => p.equipe === user.equipe);
        }

        if (dadosExibicao.length === 0) {
            container.innerHTML = `<p style="color:#64748b;">Nenhum prontuário residente na área desta equipe.</p>`;
            return;
        }

        let html = `<table><thead><tr><th>Nome do Utente</th><th>CPF</th><th>Idade</th><th>Equipe Vinculada</th><th>Linhas Ativas</th><th>Ações</th></tr></thead><tbody>`;

        dadosExibicao.forEach(p => {
            let linhas = [];
            if (user.perfil !== "visualizador") {
                if (p.has === "Sim") linhas.push("HAS");
                if (p.dm === "Sim") linhas.push("DM");
                if (p.gestante === "Sim") linhas.push("PN");
                if (p.tuberculose === "Sim") linhas.push("TB");
                if (p.hanseniase === "Sim") linhas.push("HANSEN");
            } else {
                linhas.push("Ocultado");
            }

            const botaoRemover = (user.perfil === "admin") 
                ? `<button class="btn-table-action btn-del" onclick="removerPacienteDoTerritorio('${p.cpf}')">Excluir</button>`
                : "";

            const botaoAbrir = (user.perfil === "visualizador")
                ? `<span style="color:var(--text-muted);">Apenas Leitura</span>`
                : `<button class="btn-table-action btn-edit" onclick="carregarPacienteProntuario('${p.cpf}')">Abrir</button>`;

            html += `
                <tr>
                    <td><strong>${p.nome}</strong></td>
                    <td>${p.cpf}</td>
                    <td>${p.idade} Anos</td>
                    <td><span class="tag-clinica" style="background:#1e293b;">${p.equipe}</span></td>
                    <td>${linhas.join(", ") || "Nenhuma"}</td>
                    <td class="action-buttons">${botaoAbrir} ${botaoRemover}</td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    };
}

function removerPacienteDoTerritorio(cpf) {
    const sessao = localStorage.getItem("pep_sessao_ativa");
    const user = sessao ? JSON.parse(sessao) : null;

    if (!user || user.perfil !== "admin") {
        mostrarToast("🚫 Operação negada: Apenas administradores globais podem expurgar dados.");
        return;
    }

    if (!confirm("Remover definitivamente o utente do banco local?")) return;
    
    const transaction = db.transaction(["pacientes"], "readwrite");
    const store = transaction.objectStore("pacientes");
    const request = store.delete(cpf);

    request.onsuccess = function() {
        mostrarToast("🗑️ Registro de cidadão removido.");
        listarTodosBanco();
        atualizarIndicadoresDashboard();
        atualizarCentralAvisosSininho();
    };
}

/* ==========================================================================
   ⚙️ GESTÃO DE ESTRESSE DE MEMÓRIA (INJETA BALANCEADO ENTRE AS EQUIPES)
   ========================================================================== */
function gerarCargaMassaOitoMil() {
    if (!db) {
        mostrarToast("❌ Erro: Banco não conectado.");
        return;
    }

    if (!confirm("Esta ação injetará 8.000 cadastros distribuídos igualmente entre as equipes (Verde, Azul, Esmeralda e Rubi). Continuar?")) return;
    
    mostrarToast("⏳ Processando volumetria em lote distribuído... Aguarde.");
    
    const nomesFalsos = ["Ana", "Bruno", "Carlos", "Daniela", "Eduardo", "Fernanda", "Gabriel", "Helena", "Igor", "Juliana", "Marcos", "Letícia", "Lucas", "Beatriz", "Rodrigo", "Amanda", "Ricardo", "Camila", "Larissa", "Gustavo"];
    const sobrenomesFalsos = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Almeida", "Pereira", "Lima"];
    const equipesFalsas = ["Equipe Verde", "Equipe Azul", "Equipe Esmeralda", "Equipe Rubi"];

    const transaction = db.transaction(["pacientes"], "readwrite");
    const store = transaction.objectStore("pacientes");

    let inseridosComSucesso = 0;

    for (let i = 0; i < 8000; i++) {
        const bloco1 = String(100 + Math.floor(Math.random() * 899));
        const bloco2 = String(100 + Math.floor(Math.random() * 899));
        const finalCpf = String(i).padStart(5, '0'); 
        const cpfSimulado = `888.${bloco1}.${bloco2}-${finalCpf.substring(3,5)}`;
        
        const indexNome = Math.floor(Math.random() * nomesFalsos.length);
        const nomeCompleto = `${nomesFalsos[indexNome]} ${sobrenomesFalsos[Math.floor(Math.random() * sobrenomesFalsos.length)]}`;
        const ehFeminino = indexNome % 2 === 0;

        const idadeAleatoria = Math.floor(Math.random() * 85) + 1;
        const dataNascimento = `${2026 - idadeAleatoria}-01-15`;

        const temHAS = Math.random() < 0.25 ? "Sim" : "Não";
        const temDM = Math.random() < 0.15 ? "Sim" : "Não";
        const temGestante = (ehFeminino && idadeAleatoria >= 12 && idadeAleatoria <= 49 && Math.random() < 0.08) ? "Sim" : "Não";
        const temTB = Math.random() < 0.03 ? "Sim" : "Não";
        const temHansen = Math.random() < 0.02 ? "Sim" : "Não";

        const payload = {
            cpf: cpfSimulado,
            nome: nomeCompleto,
            nascimento: dataNascimento,
            idade: String(idadeAleatoria),
            telefone: `(21) 98000-${String(i).padStart(4, '0')}`,
            cep: "21000-000",
            endereco: "Logradouro Territorializado",
            numero: String(i),
            complemento: "",
            ubs: "Complexo de Saúde Municipal",
            equipe: equipesFalsas[i % equipesFalsas.length], // Distribuição balanceada exata entre as 4 equipes
            
            has: temHAS,
            hasPAS: temHAS === "Sim" ? "145" : "120",
            hasPAD: temHAS === "Sim" ? "95" : "80",
            classifHas: temHAS === "Sim" ? "Hipertensão Descontrolada" : "Alvo Terapêutico",
            
            dm: temDM,
            hba1c: temDM === "Sim" ? "7.9" : "",
            classifDm: temDM === "Sim" ? "Controle Limítrofe" : "",
            
            gestante: temGestante,
            gestDUM: temGestante === "Sim" ? "2025-11-10" : "",
            gestIG: temGestante === "Sim" ? "24 Semanas" : "",
            gestDPP: temGestante === "Sim" ? "2026-08-17" : "",
            
            tuberculose: temTB,
            hanseniase: temHansen,
            ampi: "Idoso Robusto",
            
            objPA: "120x80",
            objFC: "76",
            objFR: "16",
            objSatO2: "98",
            objDor: "0",
            exameFisicoStatus: "Normal",
            soapObjetivoAlterado: "",
            
            reavaliacaoDias: Math.random() < 0.08 ? 0 : 30,
            historicoEvolucoes: [`--- CARGA SINTAXEHUB ---`]
        };

        const requestPut = store.put(payload);
        requestPut.onsuccess = function() { inseridosComSucesso++; };
    }

    transaction.oncomplete = function() {
        mostrarToast(`🚀 Sucesso: ${inseridosComSucesso} cadastros injetados e distribuídos por Equipe!`);
        atualizarIndicadoresDashboard();
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
            if (!dadosImportados.cpf || !dadosImportados.nome || !dadosImportados.equipe) {
                mostrarToast("❌ Falha de validação: JSON necessita de Nome, CPF e Equipe.");
                return;
            }

            const transaction = db.transaction(["pacientes"], "readwrite");
            const store = transaction.objectStore("pacientes");
            dadosImportados.reavaliacaoDias = dadosImportados.reavaliacaoDias !== undefined ? parseInt(dadosImportados.reavaliacaoDias) : 30;
            store.put(dadosImportados);

            transaction.oncomplete = function() {
                mostrarToast(`📥 Utente ${dadosImportados.nome} importado.`);
                atualizarIndicadoresDashboard();
                atualizarCentralAvisosSininho();
                input.value = "";
            };
        } catch (err) {
            mostrarToast("❌ Erro ao ler JSON.");
        }
    };
    reader.readAsText(file);
}

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
