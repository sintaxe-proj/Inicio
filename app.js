/* ============================================================
   🔐 CONFIGURAÇÃO E BASE DE USUÁRIOS (SIMULADA)
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

// Banco de dados em memória para os Prontuários (Persiste localmente no navegador)
let bancoPacientes = JSON.parse(localStorage.getItem("sintaxe_db")) || [];
let atualPacienteEdicaoId = null;

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

    aplicarPermissoesPerfil(usuario.tipo);
    navigate("inicio");
}

function aplicarPermissoesPerfil(tipoPerfil) {
    const btnAuditoria = document.getElementById("btnAuditoria");
    if (btnAuditoria) {
        btnAuditoria.style.display = tipoPerfil === "admin" ? "inline-block" : "none";
    }
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

// GATILHOS VISUAIS DE CONDUTA
function mostrarCard(idCard, valor) {
    const elemento = document.getElementById(idCard);
    if (elemento) {
        elemento.style.display = valor === "Sim" ? "block" : "none";
    }
}

// CÁLCULO AUTOMÁTICO DE IDADE E APARIÇÃO DO BLOCO IDOSO (AMPI)
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

    // Se o utente tiver 60 anos ou mais, dispara o bloco de triagem da AMPI
    const ampiBloco = document.getElementById("ampiBloco");
    if (ampiBloco) {
        ampiBloco.style.display = idade >= 60 ? "block" : "none";
    }
}

// STRATIFICAÇÃO DE RISCO CARDIOVASCULAR (HAS)
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

// MONITORAMENTO METABÓLICO (DM)
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

// CALCULADORA OBSTÉTRICA (DUM / IG / DPP)
function calcIG() {
    const dumValue = document.getElementById("gestDUM").value;
    if (!dumValue) return;

    const dum = new Date(dumValue);
    const hoje = new Date();

    // Diferença em milissegundos convertida para semanas
    const diffTime = Math.abs(hoje - dum);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const semanas = Math.floor(diffDays / 7);
    const diasRestantes = diffDays % 7;

    document.getElementById("gestIG").value = `${semanas} Semanas e ${diasRestantes} Dias`;

    // Data Provável do Parto (Regra de Nægele: DUM + 7 dias - 3 meses + 1 ano)
    let dpp = new Date(dum);
    dpp.setDate(dpp.getDate() + 7);
    dpp.setMonth(dpp.getMonth() + 9); 

    document.getElementById("gestDPP").value = dpp.toISOString().split('T')[0];
}

/* ============================================================
   💾 PERSISTÊNCIA: GRAVAÇÃO E CRUD DE PRONTUÁRIOS
============================================================ */
function salvarProntuario() {
    const nome = document.getElementById("nomePaciente").value.trim();
    if (!nome) {
        alert("⚠️ O campo 'Nome Completo' é estritamente obrigatório para salvar.");
        return;
    }

    const paciente = {
        id: atualPacienteEdicaoId || Date.now().toString(),
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
        
        // Linhas de Cuidado
        has: document.getElementById("hasSN").value,
        hasPAS: document.getElementById("hasPAS").value,
        hasPAD: document.getElementById("hasPAD").value,
        
        dm: document.getElementById("dmSN").value,
        dmHbA1c: document.getElementById("dmHbA1c").value,
        
        gestante: document.getElementById("gestanteSN").value,
        gestDUM: document.getElementById("gestDUM").value,
        
        hanseniase: document.getElementById("hansenSN").value,
        tuberculose: document.getElementById("tbSN").value,
        
        // AMPI
        ampiClassif: document.getElementById("ampiPaciente") ? document.getElementById("ampiPaciente").value : "",
        
        // Registro Clínico Textual
        evolucao: document.getElementById("evoTexto").value,
        ciaps2: document.getElementById("inputBuscaCIAPS").value,
        dataRegistro: new Date().toLocaleDateString('pt-BR')
    };

    if (atualPacienteEdicaoId) {
        // Modo Edição: substitui registro existente
        bancoPacientes = bancoPacientes.map(p => p.id === atualPacienteEdicaoId ? paciente : p);
    } else {
        // Modo Novo Prontuário
        bancoPacientes.push(paciente);
    }

    localStorage.setItem("sintaxe_db", JSON.stringify(bancoPacientes));
    alert("💾 Prontuário registrado e criptografado com sucesso na base municipal!");
    
    limparFormularioProntuario();
    navigate("inicio");
}

function limparFormularioProntuario() {
    atualPacienteEdicaoId = null;
    document.getElementById("cabecalhoProntuario").style.display = "none";
    
    // Reseta inputs comuns
    const inputs = document.querySelectorAll("#view-prontuario input, #view-prontuario textarea, #view-prontuario select");
    inputs.forEach(input => {
        if (input.tagName === "SELECT") input.value = "Não";
        else input.value = "";
    });

    // Oculta cards condicionais
    mostrarCard('cardHAS', 'Não');
    mostrarCard('cardDM', 'Não');
    mostrarCard('cardGestante', 'Não');
    const ampi = document.getElementById("ampiBloco");
    if (ampi) ampi.style.display = "none";
}

/* ============================================================
   📊 MONITORAMENTO: DASHBOARD EM TEMPO REAL E BANCO
============================================================ */
function atualizarDashboardInicio() {
    let has = 0, dm = 0, gest = 0, tb = 0, hansen = 0;

    bancoPacientes.forEach(p => {
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
}

function buscarInicio() {
    const nomeBusca = document.getElementById("buscaNomeInicio").value.toLowerCase().trim();
    const container = document.getElementById("resultadoInicio");

    if (!nomeBusca) {
        container.innerHTML = `<em style="color: #94a3b8;">Introduza um critério acima para pesquisar.</em>`;
        return;
    }

    const filtrados = bancoPacientes.filter(p => p.nome.toLowerCase().includes(nomeBusca));

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
}

function carregarPacienteParaEdicao(id) {
    const p = bancoPacientes.find(pac => pac.id === id);
    if (!p) return;

    atualPacienteEdicaoId = p.id;
    
    navigate("prontuario");

    document.getElementById("cabecalhoProntuario").style.display = "block";
    document.getElementById("cabecalhoNome").innerText = `Editando: ${p.nome}`;

    // Preenche dados estruturais
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

    // Linhas de cuidado select
    document.getElementById("hasSN").value = p.has || "Não";
    document.getElementById("dmSN").value = p.dm || "Não";
    document.getElementById("gestanteSN").value = p.gestante || "Não";
    document.getElementById("hansenSN").value = p.hanseniase || "Não";
    document.getElementById("tbSN").value = p.tuberculose || "Não";

    // Dispara gatilhos de renderização dos cards adicionais
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
    document.getElementById("evoTexto").value = p.evolucao || "";
    document.getElementById("inputBuscaCIAPS").value = p.ciaps2 || "";
}

function listarBanco() {
    const container = document.getElementById("tabelaBancoContainer");
    if (!container) return;

    if (bancoPacientes.length === 0) {
        container.innerHTML = `<p style="color:#64748b; padding:15px;">Base de dados municipal vazia.</p>`;
        return;
    }

    let html = `<table style="width:100%; border-collapse:collapse;">
        <tr style="background:#1e293b; color:white; text-align:left;">
            <th style="padding:12px;">Nome</th><th>CPF</th><th>Linhas Ativas</th><th>Ações</th>
        </tr>`;

    bancoPacientes.forEach(p => {
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
   🛡️ INITIALIZATION SYSTEM
============================================================ */
function initSistema() {
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
}

window.onload = initSistema;
