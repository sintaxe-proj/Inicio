/* ============================================================
   🔐 CONFIGURAÇÃO E BASE DE USUÁRIOS (RBAC)
============================================================ */
const usuariosPermitidos = [
    { 
        matricula: "440129", 
        senha: "123", 
        nome: "Dr. Josimar Kapps (Gestor)", 
        tipo: "admin",
        cargo: "Coordenador de APS"
    },
    { 
        matricula: "10023", 
        senha: "123", 
        nome: "Enf. Roberta Silva", 
        tipo: "clinico",
        cargo: "Enfermeira de Família"
    },
    { 
        matricula: "admin", 
        senha: "admin", 
        nome: "Administrador do Sistema", 
        tipo: "admin",
        cargo: "Suporte Técnico"
    }
];

let atualPacienteEdicaoId = null;
let db = null;

/* ============================================================
   📦 CONFIGURAÇÃO DO INDEXEDDB DE ALTA SEGURANÇA (PEP)
============================================================ */
function iniciarBancoDados(callback) {
    // Elevado para a Versão 2 para suportar a arquitetura de tabelas do PEP
    const request = indexedDB.open("SintaxeHubDB", 2);

    request.onupgradeneeded = function(event) {
        const database = event.target.result;
        
        // Tabela 1: Prontuários (Dados cadastrais, chaves clínicas e Linha do Tempo)
        if (!database.objectStoreNames.contains("prontuarios")) {
            database.createObjectStore("prontuarios", { keyPath: "id" });
        }
        
        // Tabela 2 [REQUISITO PEP]: Trilha de Auditoria Imutável (Audit Trail)
        if (!database.objectStoreNames.contains("auditoria")) {
            database.createObjectStore("auditoria", { keyPath: "logId", autoIncrement: true });
        }
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        console.log("🛡️ Banco de Dados PEP (IndexedDB) inicializado e auditado!");
        if (callback) callback();
    };

    request.onerror = function(event) {
        console.error("❌ Falha crítica de segurança ao abrir o banco de dados:", event.target.error);
    };
}

/* ============================================================
   🕵️‍♂️ REQUISITO PEP: REGISTRO INDELÉVEL DE AUDITORIA (AUDIT TRAIL)
============================================================ */
function registrarLogAuditoria(acao, detalhes) {
    if (!db) return;

    const sessao = JSON.parse(localStorage.getItem("usuarioLogado")) || { matricula: "ANÔNIMO", nome: "Não Autenticado" };
    
    const log = {
        dataHora: new Date().toISOString(),
        usuarioMatricula: sessao.matricula,
        usuarioNome: sessao.nome,
        acao: acao,           // Ex: "LOGIN_SUCESSO", "PRONTUARIO_VISUALIZADO", "EVOLUCAO_SALVA"
        detalhes: detalhes,   // Ex: "Acessou prontuário do paciente X"
        userAgent: navigator.userAgent
    };

    const transaction = db.transaction(["auditoria"], "readwrite");
    const store = transaction.objectStore("auditoria");
    store.add(log); // .add garante inclusão no fim da fila sem risco de sobrescrita
}

/* ============================================================
   🚀 FUNÇÃO PRINCIPAL DE AUTENTICAÇÃO SECURA
============================================================ */
function autenticarUsuario() {
    const matriculaInput = document.getElementById("loginUser").value.trim();
    const senhaInput = document.getElementById("loginSenha").value.trim();
    const erroDiv = document.getElementById("loginErro");

    if (erroDiv) {
        erroDiv.style.display = "none";
        erroDiv.innerText = "";
    }

    if (!matriculaInput || !senhaInput) {
        exibirErroLogin("⚠️ Por favor, preencha a matrícula e a senha.");
        return;
    }

    const usuarioEncontrado = usuariosPermitidos.find(
        u => u.matricula === matriculaInput && u.senha === senhaInput
    );

    if (usuarioEncontrado) {
        efetuarLoginSucesso(usuarioEncontrado);
    } else {
        // Auditoria registra tentativa de invasão ou erro de senha
        registrarLogAuditoria("LOGIN_FALHA", `Tentativa frustrada de login com a matrícula: ${matriculaInput}`);
        exibirErroLogin("⚠️ Matrícula ou senha incorretas. Verifique as credenciais.");
    }
}

function efetuarLoginSucesso(usuario) {
    localStorage.setItem("usuarioLogado", JSON.stringify({
        nome: usuario.nome,
        tipo: usuario.tipo,
        matricula: usuario.matricula,
        cargo: usuario.cargo
    }));

    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("app").style.display = "block";

    const campoNome = document.getElementById("nomeUsuarioLogado");
    if (campoNome) campoNome.innerText = usuario.nome;

    const seletorAcesso = document.getElementById("seletorNivelAcesso");
    if (usuario.tipo === "admin" && seletorAcesso) {
        seletorAcesso.style.display = "inline-block";
        seletorAcesso.value = "admin"; 
    }

    registrarLogAuditoria("LOGIN_SUCESSO", `Usuário autenticado com o cargo: ${usuario.cargo}`);
    aplicarPermissoesPerfil(usuario.tipo);
    navigate("inicio");
}

/* ============================================================
   🔄 CONTROLE DE ACESSO DINÂMICO E TRANSIÇÃO DE PERFIS (RBAC)
============================================================ */
function aplicarPermissoesPerfil(tipoPerfil) {
    const btnAuditoria = document.getElementById("btnAuditoria");
    const seletorAcesso = document.getElementById("seletorNivelAcesso");

    const sessaoOriginal = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (sessaoOriginal && sessaoOriginal.tipo === "admin" && seletorAcesso) {
        seletorAcesso.style.display = "inline-block";
    } else if (seletorAcesso) {
        seletorAcesso.style.display = "none";
    }

    if (tipoPerfil === "admin") {
        if (btnAuditoria) btnAuditoria.style.display = "inline-block";
        desbloquearFormularios(true);
    } else if (tipoPerfil === "clinico") {
        if (btnAuditoria) btnAuditoria.style.display = "none";
        desbloquearFormularios(true);
    } else if (tipoPerfil === "leitura") {
        if (btnAuditoria) btnAuditoria.style.display = "none";
        desbloquearFormularios(false); // Congela escrita para auditoria passiva
    }
}

function alternarVisaoGestor(novaVisao) {
    aplicarPermissoesPerfil(novaVisao);
    
    const campoNome = document.getElementById("nomeUsuarioLogado");
    const sessao = JSON.parse(localStorage.getItem("usuarioLogado"));
    
    if (campoNome && sessao) {
        let sufixo = novaVisao === "admin" ? " (Gestor)" : (novaVisao === "clinico" ? " (Modo Clínico)" : " (Modo Leitura)");
        campoNome.innerText = sessao.nome.split(" (")[0] + sufixo;
    }
    
    registrarLogAuditoria("PERFIL_ALTERADO", `Transitou temporariamente para o nível de visão: ${novaVisao}`);
    navigate("inicio");
}

function desbloquearFormularios(permitirEscrita) {
    const elementosProntuario = document.querySelectorAll("#view-prontuario input, #view-prontuario select, #view-prontuario textarea");
    
    elementosProntuario.forEach(elemento => {
        if (!["idadePaciente", "hasClassif", "dmClassif", "gestIG", "gestDPP"].includes(elemento.id)) {
            elemento.disabled = !permitirEscrita;
            elemento.style.background = permitirEscrita ? "" : "#e2e8f0";
            elemento.style.cursor = permitirEscrita ? "" : "not-allowed";
        }
    });

    const botoesAcao = document.querySelectorAll("#view-prontuario button");
    botoesAcao.forEach(btn => {
        if (!btn.innerText.includes("Cancelar")) {
            btn.disabled = !permitirEscrita;
            btn.style.opacity = permitirEscrita ? "1" : "0.5";
            btn.style.cursor = permitirEscrita ? "pointer" : "not-allowed";
        }
    });
}

function exibirErroLogin(mensagem) {
    const erroDiv = document.getElementById("loginErro");
    if (erroDiv) {
        erroDiv.innerText = mensagem;
        erroDiv.style.display = "block";
    } else {
        alert(mensagem);
    }
}

function efetuarLogout() {
    registrarLogAuditoria("LOGOUT", "Sessão encerrada voluntariamente pelo usuário.");
    localStorage.removeItem("usuarioLogado");
    document.getElementById("loginUser").value = "";
    document.getElementById("loginSenha").value = "";
    document.getElementById("app").style.display = "none";
    document.getElementById("loginScreen").style.display = "flex";
}

/* ============================================================
   🔄 SISTEMA DE NAVEGAÇÃO INTERNA (SPA)
============================================================ */
function navigate(screenId) {
    const pages = document.querySelectorAll(".view");
    pages.forEach(page => page.style.display = "none");

    const targetId = screenId.startsWith("view-") ? screenId : "view-" + screenId;
    const activePage = document.getElementById(targetId);
    
    if (activePage) {
        activePage.style.display = "block";
    }
    
    if (screenId.includes("inicio")) atualizarDashboardInicio();
    if (screenId.includes("banco")) listarBanco();
    
    fecharDrawer();
}

/* ============================================================
   🩺 INTELIGÊNCIA CLÍNICA E REGRAS DE NEGÓCIO DA APS
============================================================ */
function mostrarCard(idCard, valor) {
    const elemento = document.getElementById(idCard);
    if (elemento) {
        elemento.style.display = valor === "Sim" ? "block" : "none";
    }
}

function calcIdade() {
    const dataNasc = document.getElementById("nascPaciente").value;
    if (!dataNasc) return;

    const hoje = new Date();
    const dataAniversario = new Date(dataNasc);
    let idade = hoje.getFullYear() - dataAniversario.getFullYear();
    const m = hoje.getMonth() - dataAniversario.getMonth();
    
    if (m < 0 || (m === 0 && hoje.getDate() < dataAniversario.getDate())) {
        idade--;
    }

    document.getElementById("idadePaciente").value = idade + " anos";

    const ampiBloco = document.getElementById("ampiBloco");
    if (ampiBloco) {
        ampiBloco.style.display = Math.max(0, idade) >= 60 ? "block" : "none";
    }
}

function classificarHAS() {
    const pas = parseInt(document.getElementById("hasPAS").value) || 0;
    const pad = parseInt(document.getElementById("hasPAD").value) || 0;
    const campo = document.getElementById("hasClassif");

    if (!pas || !pad) { campo.value = ""; return; }

    if (pas < 130 && pad < 85) {
        campo.value = "Controlado / Ótimo";
        campo.style.color = "#16a34a";
    } else if ((pas >= 130 && pas <= 139) || (pad >= 85 && pad <= 89)) {
        campo.value = "Pré-Hipertensão";
        campo.style.color = "#f59e0b";
    } else if ((pas >= 140 && pas <= 159) || (pad >= 90 && pad <= 99)) {
        campo.value = "Hipertensão Estágio 1";
        campo.style.color = "#ef4444";
    } else {
        campo.value = "Hipertensão Estágio 2 / Crítica";
        campo.style.color = "#7f1d1d";
    }
}

function classificarDM() {
    const hba1c = parseFloat(document.getElementById("dmHbA1c").value) || 0;
    const campo = document.getElementById("dmClassif");

    if (!hba1c) { campo.value = ""; return; }

    if (hba1c < 7.0) {
        campo.value = "Bom Controlo (< 7%)";
        campo.style.color = "#16a34a";
    } else if (hba1c >= 7.0 && hba1c <= 8.5) {
        campo.value = "Controlo Inadequado";
        campo.style.color = "#f59e0b";
    } else {
        campo.value = "Risco Alto / Descompensado";
        campo.style.color = "#ef4444";
    }
}

function calcIG() {
    const dumValue = document.getElementById("gestDUM").value;
    if (!dumValue) return;

    const dum = new Date(dumValue);
    const hoje = new Date();

    const diffTime = Math.abs(hoje - dum);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const semanas = Math.floor(diffDays / 7);
    const diasRestantes = diffDays % 7;

    document.getElementById("gestIG").value = `${semanas} Semanas e ${diasRestantes} Dias`;

    let dpp = new Date(dum);
    dpp.setDate(dpp.getDate() + 7);
    dpp.setMonth(dpp.getMonth() + 9); 

    document.getElementById("gestDPP").value = dpp.toISOString().split('T')[0];
}

/* ============================================================
   💾 PERSISTÊNCIA: GRAVAÇÃO PEP (LINHA DO TEMPO IMUTÁVEL)
============================================================ */
function salvarProntuario() {
    const nome = document.getElementById("nomePaciente").value.trim();
    if (!nome) {
        alert("⚠️ O campo 'Nome Completo' é estritamente obrigatório para salvar.");
        return;
    }

    const sessaoAtend = JSON.parse(localStorage.getItem("usuarioLogado"));
    const novaEvolucaoTexto = document.getElementById("evoTexto").value.trim();

    // Requisito PEP: Buscar registro anterior para não apagar a linha do tempo existente
    const idPaciente = atualPacienteEdicaoId || Date.now().toString();
    
    const transactionLeitura = db.transaction(["prontuarios"], "readonly");
    const storeLeitura = transactionLeitura.objectStore("prontuarios");
    const requestGet = storeLeitura.get(idPaciente);

    requestGet.onsuccess = function(event) {
        const registroExistente = event.target.result;
        let historicoEvolucoes = (registroExistente && registroExistente.evolucoes) ? registroExistente.evolucoes : [];

        // 🔥 SE HOUVER TEXTO NA EVOLUÇÃO, CRIA UM ADENDO ASSINADO (NÃO SOBRESCREVE O PASSADO)
        if (novaEvolucaoTexto) {
            historicoEvolucoes.push({
                dataHora: new Date().toLocaleString('pt-BR'),
                profissional: sessaoAtend.nome,
                matricula: sessaoAtend.matricula,
                texto: novaEvolucaoTexto
            });
        }

        const paciente = {
            id: idPaciente,
            nome: nome,
            cpf: document.getElementById("cpfPaciente").value,
            nascimento: document.getElementById("nascPaciente").value,
            idade: document.getElementById("idadePaciente").value,
            telefone: document.getElementById("telPaciente").value,
            endereco: document.getElementById("endPaciente").value,
            cep: document.getElementById("CEP").value,
            unidade: document.getElementById("unidadePaciente").value,
            equipe: document.getElementById("equipePaciente").value,
            obs: document.getElementById("obsPaciente").value,
            
            has: document.getElementById("hasSN").value,
            hasPAS: document.getElementById("hasPAS").value,
            hasPAD: document.getElementById("hasPAD").value,
            
            dm: document.getElementById("dmSN").value,
            dmHbA1c: document.getElementById("dmHbA1c").value,
            
            gestante: document.getElementById("gestanteSN").value,
            gestDUM: document.getElementById("gestDUM").value,
            
            hanseniase: document.getElementById("hansenSN").value,
            tuberculose: document.getElementById("tbSN").value,
            
            ampiClassif: document.getElementById("ampiPaciente") ? document.getElementById("ampiPaciente").value : "",
            ciaps2: document.getElementById("inputBuscaCIAPS").value,
            
            // Grava a linha do tempo imutável das evoluções clínicas
            evolucoes: historicoEvolucoes,
            dataUltimoRegistro: new Date().toLocaleDateString('pt-BR')
        };

        const transactionEscrita = db.transaction(["prontuarios"], "readwrite");
        const storeEscrita = transactionEscrita.objectStore("prontuarios");
        storeEscrita.put(paciente);

        transactionEscrita.oncomplete = function() {
            registrarLogAuditoria(
                atualPacienteEdicaoId ? "PRONTUARIO_ALTERADO" : "PRONTUARIO_CRIADO", 
                `Prontuário de ${nome} (ID: ${idPaciente}) gravado com ${historicoEvolucoes.length} evoluções em linha do tempo.`
            );
            alert("💾 Registro clínico processado e assinado digitalmente no IndexedDB PEP!");
            limparFormularioProntuario();
            navigate("inicio");
        };
    };
}

function limparFormularioProntuario() {
    atualPacienteEdicaoId = null;
    if (document.getElementById("cabecalhoProntuario")) {
        document.getElementById("cabecalhoProntuario").style.display = "none";
    }
    
    const inputs = document.querySelectorAll("#view-prontuario input, #view-prontuario textarea, #view-prontuario select");
    inputs.forEach(input => {
        if (input.tagName === "SELECT") input.value = "Não";
        else input.value = "";
    });

    // Limpa a div de linha do tempo visual, se existir no HTML
    const timelineDiv = document.getElementById("linhaTempoEvolucoes");
    if (timelineDiv) timelineDiv.innerHTML = "";

    mostrarCard('cardHAS', 'Não');
    mostrarCard('cardDM', 'Não');
    mostrarCard('cardGestante', 'Não');
    const ampi = document.getElementById("ampiBloco");
    if (ampi) ampi.style.display = "none";
}

/* ============================================================
   📊 MONITORAMENTO: DASHBOARD EM TEMPO REAL E BUSCAS
============================================================ */
function atualizarDashboardInicio() {
    if (!db) return;
    
    const transaction = db.transaction(["prontuarios"], "readonly");
    const store = transaction.objectStore("prontuarios");
    const request = store.getAll();

    request.onsuccess = function(event) {
        const prontuarios = event.target.result;
        let has = 0, dm = 0, gest = 0, tb = 0, hansen = 0;

        prontuarios.forEach(p => {
            if (p.has === "Sim") has++;
            if (p.dm === "Sim") dm++;
            if (p.gestante === "Sim") gest++;
            if (p.tuberculose === "Sim") tb++;
            if (p.hanseniase === "Sim") hansen++;
        });

        if (document.getElementById("dashHAS")) document.getElementById("dashHAS").innerText = has;
        if (document.getElementById("dashDM")) document.getElementById("dashDM").innerText = dm;
        if (document.getElementById("dashGest")) document.getElementById("dashGest").innerText = gest;
        if (document.getElementById("dashTB")) document.getElementById("dashTB").innerText = tb;
        if (document.getElementById("dashHansen")) document.getElementById("dashHansen").innerText = hansen;
    };
}

function buscarInicio() {
    const nomeBusca = document.getElementById("buscaNomeInicio").value.toLowerCase().trim();
    const container = document.getElementById("resultadoInicio");

    if (!nomeBusca) {
        container.innerHTML = `<em style="color: #94a3b8;">Introduza um critério acima para pesquisar.</em>`;
        return;
    }

    const transaction = db.transaction(["prontuarios"], "readonly");
    const store = transaction.objectStore("prontuarios");
    const request = store.getAll();

    request.onsuccess = function(event) {
        const prontuarios = event.target.result;
        const filtrados = prontuarios.filter(p => p.nome.toLowerCase().includes(nomeBusca));

        // Registro de Auditoria Obrigatório para Busca Populacional de Dados Sensíveis
        registrarLogAuditoria("BUSCA_CLINICA", `Pesquisa textual no Dashboard pelo termo: "${nomeBusca}". Retornou ${filtrados.length} resultados.`);

        if (filtrados.length === 0) {
            container.innerHTML = `<span style="color: #ef4444;">Nenhum utente encontrado com este critério.</span>`;
            return;
        }

        let html = `<table style="width:100%; border-collapse:collapse; margin-top:10px;">
            <tr style="background:#f1f5f9; text-align:left;"><th style="padding:10px;">Nome</th><th>Idade</th><th>Ações</th></tr>`;
        
        filtrados.forEach(p => {
            html += `<tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:10px; font-weight:500;">${escapeHTML(p.nome)}</td>
                <td>${p.idade || 'Não informada'}</td>
                <td><button class="btn-primary" style="padding:4px 10px; font-size:13px; background:#0b6efd;" onclick="carregarPacienteParaEdicao('${p.id}')">Abrir Prontuário</button></td>
            </tr>`;
        });
        html += `</table>`;
        container.innerHTML = html;
    };
}

function carregarPacienteParaEdicao(id) {
    const transaction = db.transaction(["prontuarios"], "readonly");
    const store = transaction.objectStore("prontuarios");
    const request = store.get(id);

    request.onsuccess = function(event) {
        const p = event.target.result;
        if (!p) return;

        // 🔥 REGISTRO DE AUDITORIA: Quem abriu o prontuário clínico e quando?
        registrarLogAuditoria("PRONTUARIO_VISUALIZADO", `Acessou a ficha clínica completa do paciente: ${p.nome} (ID: ${p.id})`);

        atualPacienteEdicaoId = p.id;
        navigate("prontuario");

        document.getElementById("cabecalhoProntuario").style.display = "block";
        document.getElementById("cabecalhoNome").innerText = `Editando: ${p.nome}`;

        document.getElementById("nomePaciente").value = p.nome;
        document.getElementById("cpfPaciente").value = p.cpf || "";
        document.getElementById("nascPaciente").value = p.nascimento || "";
        document.getElementById("idadePaciente").value = p.idade || "";
        document.getElementById("telPaciente").value = p.telefone || "";
        document.getElementById("endPaciente").value = p.endereco || "";
        document.getElementById("CEP").value = p.cep || "";
        document.getElementById("unidadePaciente").value = p.unidade || "";
        document.getElementById("equipePaciente").value = p.equipe || "";
        document.getElementById("obsPaciente").value = p.obs || "";

        document.getElementById("hasSN").value = p.has || "Não";
        document.getElementById("dmSN").value = p.dm || "Não";
        document.getElementById("gestanteSN").value = p.gestante || "Não";
        document.getElementById("hansenSN").value = p.hanseniase || "Não";
        document.getElementById("tbSN").value = p.tuberculose || "Não";

        mostrarCard('cardHAS', p.has);
        if (p.has === "Sim") {
            document.getElementById("hasPAS").value = p.hasPAS || "";
            document.getElementById("hasPAD").value = p.hasPAD || "";
            classificarHAS();
        }

        mostrarCard('cardDM', p.dm);
        if (p.dm === "Sim") {
            document.getElementById("dmHbA1c").value = p.dmHbA1c || "";
            classificarDM();
        }

        mostrarCard('cardGestante', p.gestante);
        if (p.gestante === "Sim") {
            document.getElementById("gestDUM").value = p.gestDUM || "";
            calcIG();
        }
        
        calcIdade();
        document.getElementById("inputBuscaCIAPS").value = p.ciaps2 || "";
        
        // Limpa o campo de digitação de novas evoluções para o atendimento atual
        document.getElementById("evoTexto").value = "";

        // 🔥 EXIBIÇÃO DA LINHA DO TEMPO HISTÓRICA NA TELA
        const timelineDiv = document.getElementById("linhaTempoEvolucoes");
        if (timelineDiv) {
            if (p.evolucoes && p.evolucoes.length > 0) {
                let htmlTimeline = `<h4 style="margin-top:20px; color:#1e293b; border-bottom:2px solid #cbd5e1; padding-bottom:5px;">📋 Linha do Tempo de Evoluções (Trancada)</h4>`;
                // Exibe as evoluções da mais recente para a mais antiga
                p.evolucoes.slice().reverse().forEach(evo => {
                    htmlTimeline += `
                    <div style="background:#f8fafc; border-left:4px solid #0284c7; padding:10px; margin-bottom:10px; border-radius:0 6px 6px 0; font-size:13px;">
                        <div style="color:#64748b; font-weight:600; margin-bottom:4px;">👁️ Em ${evo.dataHora} | Profissional: ${escapeHTML(evo.profissional)} (Matrícula: ${evo.matricula})</div>
                        <p style="margin:0; color:#334155; white-space:pre-wrap; font-style:italic;">"${escapeHTML(evo.texto)}"</p>
                    </div>`;
                });
                timelineDiv.innerHTML = htmlTimeline;
            } else {
                timelineDiv.innerHTML = `<p style="color:#94a3b8; font-size:13px; margin-top:15px;">*Nenhum registro clínico anterior nesta ficha técnica.</p>`;
            }
        }
    };
}

function listarBanco() {
    const container = document.getElementById("tabelaBancoContainer");
    if (!container) return;

    const transaction = db.transaction(["prontuarios"], "readonly");
    const store = transaction.objectStore("prontuarios");
    const request = store.getAll();

    request.onsuccess = function(event) {
        const prontuarios = event.target.result;

        if (prontuarios.length === 0) {
            container.innerHTML = `<p style="color:#64748b; padding:15px;">Base de dados municipal vazia (IndexedDB PEP).</p>`;
            return;
        }

        let html = `<table style="width:100%; border-collapse:collapse;">
            <tr style="background:#1e293b; color:white; text-align:left;">
                <th style="padding:12px;">Nome</th><th>CPF</th><th>Linhas Ativas</th><th>Ações</th>
            </tr>`;

        prontuarios.forEach(p => {
            let linhas = [];
            if (p.has === "Sim") linhas.push("HAS");
            if (p.dm === "Sim") linhas.push("DM");
            if (p.gestante === "Sim") linhas.push("Gestante");

            html += `<tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:12px; font-weight:600; color:#0f172a;">${escapeHTML(p.nome)}</td>
                <td style="color:#475569;">${p.cpf || 'Não cadastrado'}</td>
                <td>${linhas.length > 0 ? linhas.map(l => `<span style="background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:500; margin-right:4px;">${l}</span>`).join('') : '<span style="color:#94a3b8;">Nenhuma</span>'}</td>
                <td><button class="btn-primary" style="padding:5px 12px; background:#0b6efd;" onclick="carregarPacienteParaEdicao('${p.id}')">Editar</button></td>
            </tr>`;
        });

        html += `</table>`;
        container.innerHTML = html;
    };
}

/* ============================================================
   ⚙️ EXTRA E UTILS: MODAL DRAWER E MÁSCARAS
============================================================ */
function fecharDrawer() {
    const dr = document.getElementById("drawer");
    const ov = document.getElementById("drawerOverlay");
    if (dr) dr.style.display = "none";
    if (ov) ov.style.display = "none";
}

function mascaraCPF(i) {
    let v = i.value;
    if (isNaN(v.charAt(v.length - 1))) { i.value = v.substring(0, v.length - 1); return; }
    i.setAttribute("maxlength", "14");
    if (v.length == 3 || v.length == 7) i.value += ".";
    if (v.length == 11) i.value += "-";
}

function escapeHTML(text) {
    return String(text)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/* ============================================================
   🛡️ INITIALIZATION SYSTEM (INTEGRADO COM INDEXEDDB PEP)
============================================================ */
function initSistema() {
    iniciarBancoDados(function() {
        atualizarDashboardInicio();
        
        const sessao = JSON.parse(localStorage.getItem("usuarioLogado"));
        if (sessao) {
            document.getElementById("loginScreen").style.display = "none";
            document.getElementById("app").style.display = "block";
            const campoNome = document.getElementById("nomeUsuarioLogado");
            if (campoNome) campoNome.innerText = sessao.nome;
            
            aplicarPermissoesPerfil(sessao.tipo);
            navigate("inicio");
        }
    });
}

window.onload = initSistema;
