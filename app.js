/* ==========================================================================
   🗄️ CORE CONFIG: BANCO DE DADOS LOCAL (INDEXEDDB) & SESSÃO PEP
   ========================================================================== */
let db;
const DB_NAME = "SintaxeHubDB";
const DB_VERSION = 2; // Mantido em 2 para suportar a estrutura SOAP estendida

// Inicialização Automática ao Carregar a Página
document.addEventListener("DOMContentLoaded", () => {
    configurarIndexedDB();
    verificarSessao();
});

/**
 * Inicializa e configura a estrutura de tabelas do IndexedDB
 */
function configurarIndexedDB() {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = function(event) {
        console.error("Erro crítico ao abrir o IndexedDB:", event.target.error);
        mostrarToast("❌ Erro ao carregar banco de dados local.");
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        console.log("🗄️ IndexedDB conectado com sucesso.");
        
        // Verifica se o usuário já está logado para inicializar os dados da tela principal
        if (localStorage.getItem("pep_sessao_ativa")) {
            inicializarAutocompleteCIAP();
            atualizarIndicadoresDashboard();
            atualizarCentralAvisosSininho();
            listarTodosBanco();
        }
    };

    request.onupgradeneeded = function(event) {
        const dbInstance = event.target.result;
        
        // Cria a store de pacientes caso ela não exista
        if (!dbInstance.objectStoreNames.contains("pacientes")) {
            const store = dbInstance.createObjectStore("pacientes", { keyPath: "cpf" });
            store.createIndex("nome", "nome", { unique: false });
            store.createIndex("ubs", "ubs", { unique: false });
            store.createIndex("equipe", "equipe", { unique: false });
            console.log("🗄️ ObjectStore 'pacientes' criada com sucesso.");
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
        
        // Inicializa os dados do ecossistema após login
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
    const cpf = document.getElementById("cpfPaciente").value.trim();
    const nome = document.getElementById("nomePaciente").value.trim();

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

    const examenStatus = document.querySelector('input[name="exameFisicoStatus"]:checked').value;
    const exameDetalhe = document.getElementById("soapObjetivoAlterado").value;
    
    const ciap = document.getElementById("inputBuscaCIAPS").value;
    const plano = document.getElementById("soapPlanoConduta").value;
    const diasPrazo = document.getElementById("soapReavaliacaoDias").value;

    const exameFisicoTexto = examenStatus === "Normal" ? "Normal / Sem particularidades" : `ALTERADO: ${exameDetalhe}`;

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

        // Montagem do payload completo do Utente mapeado com chaves padronizadas
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
            equipe: document.getElementById("equipePaciente").value,
            
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
            
            // Persistência dos campos de Sinais Vitais no objeto
            objPA: pa,
            objFC: fc,
            objFR: fr,
            objSatO2: sat,
            objDor: dor,
            exameFisicoStatus: examenStatus,
            soapObjetivoAlterado: exameDetalhe,
            
            reavaliacaoDias: parseInt(diasPrazo) || 0, // Metadado indexador do sininho
            historicoEvolucoes: historicoEvolucoes
        };

        const transactionSalvar = db.transaction(["pacientes"], "readwrite");
        const storeSalvar = transactionSalvar.objectStore("pacientes");
        const requestSalvar = storeSalvar.put(pacientePayload);

        requestSalvar.onsuccess = function() {
            mostrarToast("💾 Prontuário SOAP gravado na base territorial!");
            limparFormularioProntuario();
            atualizarIndicadoresDashboard();
            atualizarCentralAvisosSininho();
            listarTodosBanco();
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
   🔍 MECANISMO DE CONSULTA E BUSCA ATIVA EPIDEMIOLÓGICA
   ========================================================================== */
function buscarInicio() {
    const termo = document.getElementById("buscaNomeInicio").value.toLowerCase().trim();
    const container = document.getElementById("resultadoInicio");

    if (!termo) {
        container.innerHTML = `<em style="color: #94a3b8;">Introduza um critério acima para pesquisar.</em>`;
        return;
    }

    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.getAll();

    request.onsuccess = function() {
        const resultados = request.result.filter(p => {
            const nomeMatch = p.nome.toLowerCase().includes(termo);
            const cpfMatch = p.cpf.includes(termo);
            const hasMatch = (termo === "has" || termo === "hipertensão") && p.has === "Sim";
            const dmMatch = (termo === "dm" || termo === "diabetes") && p.dm === "Sim";
            const pnMatch = (termo === "pn" || termo === "pré-natal" || termo === "gestante") && p.gestante === "Sim";
            const tbMatch = (termo === "tb" || termo === "tuberculose") && p.tuberculose === "Sim";
            const hansenMatch = (termo === "hansen" || termo === "hanseníase") && p.hanseniase === "Sim";
            const criticoMatch = termo === "crítico" && p.reavaliacaoDias === 0;

            return nomeMatch || cpfMatch || hasMatch || dmMatch || pnMatch || tbMatch || hansenMatch || criticoMatch;
        });
        
        if (resultados.length === 0) {
            container.innerHTML = `<p style="color: var(--danger); font-weight:600;">⚠️ Nenhum cidadão localizado com este critério no território.</p>`;
            return;
        }

        let html = '<table><thead><tr><th>Cidadão / CPF</th><th>Vínculo Operacional</th><th>Linhas de Cuidado Ativas</th><th>Ações</th></tr></thead><tbody>';
        resultados.forEach(p => {
            let tags = "";
            if (p.has === "Sim") tags += `<span class="tag-clinica" style="background:var(--danger); margin-right:4px;">HAS</span> `;
            if (p.dm === "Sim") tags += `<span class="tag-clinica" style="background:var(--success-dark); margin-right:4px;">DM</span> `;
            if (p.gestante === "Sim") tags += `<span class="tag-clinica" style="background:var(--warning); color:#000; margin-right:4px;">PRÉ-NATAL</span> `;
            if (p.tuberculose === "Sim") tags += `<span class="tag-clinica" style="background:#a21caf; margin-right:4px;">TB</span> `;
            if (p.hanseniase === "Sim") tags += `<span class="tag-clinica" style="background:var(--primary-neon); margin-right:4px;">HANSEN</span> `;
            if (p.reavaliacaoDias === 0) tags += `<span class="tag-clinica" style="background:#7c2d12; margin-right:4px;">🔔 CRÍTICO</span> `;

            html += `
                <tr>
                    <td>
                        <b>${p.nome}</b><br>
                        <small style="color:var(--text-muted); font-mono">${p.cpf}</small>
                    </td>
                    <td>
                        <small style="display:block; font-weight:600;">${p.ubs || "Não vinculada"}</small>
                        <small style="color:var(--text-muted);">${p.equipe || "Sem equipe"}</small>
                    </td>
                    <td>${tags || '<span class="tag-clinica" style="background:var(--bg-input); color:var(--text-muted);">Geral</span>'}</td>
                    <td>
                        <button class="btn-table-action btn-edit" onclick="carregarPacienteProntuario('${p.cpf}')">🩺 Abrir SOAP</button>
                    </td>
                </tr>
            `;
        });
        html += `</tbody></table>`;
        container.innerHTML = html;
    };
}

function carregarPacienteProntuario(cpf) {
    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.get(cpf);

    request.onsuccess = function() {
        const p = request.result;
        if (!p) return;

        navigate('prontuario');
        limparFormularioProntuario();

        // Vinculação de dados cadastrais
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

        // Repovoamento dos Sinais Vitais Estruturados (O)
        document.getElementById("objPA").value = p.objPA || "";
        document.getElementById("objFC").value = p.objFC || "";
        document.getElementById("objFR").value = p.objFR || "";
        document.getElementById("objSatO2").value = p.objSatO2 || "";
        document.getElementById("objDor").value = p.objDor || "0";

        // Comportamento dinâmico do Exame Físico Geral
        if (p.exameFisicoStatus === "Alterado") {
            document.querySelector('input[name="exameFisicoStatus"][value="Alterado"]').checked = true;
            document.getElementById("blocoExameAlterado").style.display = "block";
            document.getElementById("soapObjetivoAlterado").value = p.soapObjetivoAlterado || "";
        } else {
            document.querySelector('input[name="exameFisicoStatus"][value="Normal"]').checked = true;
            document.getElementById("blocoExameAlterado").style.display = "none";
        }

        // Configuração de Linhas de cuidado
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
        if (parseInt(p.idade) >= 60) document.getElementById("ampiBloco").style.display = "block";

        // Montagem da Linha de Tempo de Atendimentos Anteriores
        if (p.historicoEvolucoes && p.historicoEvolucoes.length > 0) {
            let htmlTimeline = `<label style='font-weight:700;'>⏳ Histórico Clínico Digital (Últimas Evoluções):</label><div class='timeline'>`;
            p.historicoEvolucoes.forEach(evo => {
                htmlTimeline += `
                    <div class='timeline-item'>
                        <div class='timeline-body'>${evo}</div>
                    </div>
                `;
            });
            htmlTimeline += `</div>`;
            document.getElementById("linhaTempoEvolucoes").innerHTML = htmlTimeline;
        }

        // Cabeçalho azul informativo de prontuário ativo
        document.getElementById("cabecalhoNome").innerText = `👤 UTENTE EM ATENDIMENTO ATIVO: ${p.nome.toUpperCase()} (${p.cpf})`;
        document.getElementById("cabecalhoProntuario").style.display = "block";
    };
}

// Apelido para manter compatibilidade com cliques antigos do card de busca
function abrirAtendimentoExistente(cpf) {
    carregarPacienteProntuario(cpf);
}

/* ==========================================================================
   📊 VIGILÂNCIA EPIDEMIOLÓGICA & ATUALIZAÇÃO DO DASHBOARD CENTRAL
   ========================================================================== */
function atualizarIndicadoresDashboard() {
    if (!db) return;
    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.getAll();

    request.onsuccess = function() {
        const dados = request.result;
        document.getElementById("dashHAS").innerText = dados.filter(p => p.has === "Sim").length;
        document.getElementById("dashDM").innerText = dados.filter(p => p.dm === "Sim").length;
        document.getElementById("dashGest").innerText = dados.filter(p => p.gestante === "Sim").length;
        document.getElementById("dashTB").innerText = dados.filter(p => p.tuberculose === "Sim").length;
        document.getElementById("dashHansen").innerText = dados.filter(p => p.hanseniase === "Sim").length;
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
            if (p.tuberculose === "Sim") linhas.push("TB");
            if (p.hanseniase === "Sim") linhas.push("HANSEN");

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
                        <button class="btn-table-action btn-edit" onclick="carregarPacienteProntuario('${p.cpf}')">Abrir</button>
                        <button class="btn-table-action btn-del" onclick="removerPacienteDoTerritorio('${p.cpf}')">Excluir</button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    };
}

function removerPacienteDoTerritorio(cpf) {
    if (!confirm("Tem certeza de que deseja remover permanentemente este utente da base territorial municipal?")) return;
    
    const transaction = db.transaction(["pacientes"], "readwrite");
    const store = transaction.objectStore("pacientes");
    const request = store.delete(cpf);

    request.onsuccess = function() {
        mostrarToast("🗑️ Registro de cidadão removido com sucesso.");
        listarTodosBanco();
        atualizarIndicadoresDashboard();
        atualizarCentralAvisosSininho();
    };
}

/* ==========================================================================
   📈 MODAL ANALYTICS: MONITORAMENTO EM SAÚDE DA FAMÍLIA (EXEMPLO DE FILTRO)
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
        else if (linhaCuidadoAtualVisualizacao === "tuberculose") filtrados = filtrados.filter(p => p.tuberculose === "Sim");
        else if (linhaCuidadoAtualVisualizacao === "hanseniase") filtrados = filtrados.filter(p => p.hanseniase === "Sim");
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
        const prazoSimulado = i % 15 === 0 ? 0 : Math.floor(Math.random() * 90) + 1; // Distribui alguns críticos

        const payload = {
            cpf: cpfSimulado,
            nome: nomeCompleto,
            nascimento: "1985-06-15",
            idade: "41",
            telefone: "(21) 98888-7711",
            cep: "20000-000",
            endereco: "Avenida Central do Município Simulador",
            numero: String(i),
            complemento: "Lote Acadêmico",
            ubs: ubsFalsas[i % 4],
            equipe: equipesFalsas[i % 4],
            has: i % 2 === 0 ? "Sim" : "Não",
            hasPAS: i % 2 === 0 ? "145" : "",
            hasPAD: i % 2 === 0 ? "95" : "",
            classifHas: i % 2 === 0 ? "Hipertensão Estágio 1 ou 2" : "",
            dm: i % 3 === 0 ? "Sim" : "Não",
            hba1c: i % 3 === 0 ? "7.5" : "",
            classifDm: i % 3 === 0 ? "Controle Limítrofe" : "",
            gestante: "Não",
            gestDUM: "",
            gestIG: "",
            gestDPP: "",
            tuberculose: "Não",
            hanseniase: "Não",
            ampi: "Idoso Robusto",
            
            // Sinais Vitais Falsos para Massa de Teste
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
            if (!dadosImportados.cpf || !dadosImportados.nome) {
                mostrarToast("❌ Falha de interoperabilidade: Estrutura inválida ou sem CPF.");
                return;
            }

            const transaction = db.transaction(["pacientes"], "readwrite");
            const store = transaction.objectStore("pacientes");
            
            // Força o tipo numérico do aprazamento para indexação correta
            if (dadosImportados.reavaliacaoDias !== undefined) {
                dadosImportados.reavaliacaoDias = parseInt(dadosImportados.reavaliacaoDias);
            } else {
                dadosImportados.reavaliacaoDias = 30; // Padrão se ausente
            }

            store.put(dadosImportados);

            transaction.oncomplete = function() {
                mostrarToast(`📥 Cidadão ${dadosImportados.nome} importado para a base!`);
                atualizarIndicadoresDashboard();
                atualizarCentralAvisosSininho();
                input.value = ""; // Limpa campo de arquivo
            };
        } catch (err) {
            mostrarToast("❌ Erro ao decodificar a sintaxe JSON do arquivo e-SUS.");
        }
    };
    reader.readAsText(file);
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
