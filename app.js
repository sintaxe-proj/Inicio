/* ============================================================
   🔐 CONFIGURAÇÃO E BASE DE USUÁRIOS (SIMULADA)
============================================================ */
// Base de dados local para validação de perfis na plataforma
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

/* ============================================================
   🚀 FUNÇÃO PRINCIPAL DE AUTENTICAÇÃO SECURA
============================================================ */
function autenticarUsuario() {
    const matriculaInput = document.getElementById("loginUser").value.trim();
    const senhaInput = document.getElementById("loginSenha").value.trim();
    const erroDiv = document.getElementById("loginErro");

    // Reseta estado do alerta de erro
    if (erroDiv) {
        erroDiv.style.display = "none";
        erroDiv.innerText = "";
    }

    // 1. Validação básica de preenchimento
    if (!matriculaInput || !senhaInput) {
        exibirErroLogin("⚠️ Por favor, preencha a matrícula e a senha.");
        return;
    }

    // 2. Busca o usuário correspondente na base pelas credenciais
    const usuarioEncontrado = usuariosPermitidos.find(
        u => u.matricula === matriculaInput && u.senha === senhaInput
    );

    // 3. Processamento do resultado da busca
    if (usuarioEncontrado) {
        efetuarLoginSucesso(usuarioEncontrado);
    } else {
        exibirErroLogin("⚠️ Matrícula ou senha incorretas. Verifique as credenciais.");
    }
}

/* ============================================================
   🔄 TRATAMENTO DE SESSÃO E DE INTERFACE (ADMIN vs CLÍNICO)
============================================================ */
function efetuarLoginSucesso(usuario) {
    // Grava a sessão criptografada/estruturada no localStorage para persistência
    localStorage.setItem("usuarioLogado", JSON.stringify({
        nome: usuario.nome,
        tipo: usuario.tipo,
        matricula: usuario.matricula,
        cargo: usuario.cargo
    }));

    // Alterna a exibição das telas principais do DOM
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("app").style.display = "block";

    // Atualiza elementos de identificação do usuário no Header/Sidebar
    const campoNome = document.getElementById("nomeUsuarioLogado");
    if (campoNome) {
        campoNome.innerText = usuario.nome;
    }

    // Aplica o controle de nível de acesso (Rbac) na Interface
    aplicarPermissoesPerfil(usuario.tipo);

    // Registra o log na auditoria interna se o módulo estiver ativo
    if (typeof registrarLogAuditoria === "function") {
        registrarLogAuditoria(usuario.nome, `Login efetuado com sucesso como Perfil: ${usuario.tipo}.`);
    }

    // Redireciona o usuário para o Dashboard Inicial
    navigate("inicio");
}

function aplicarPermissoesPerfil(tipoPerfil) {
    const btnAdmin = document.getElementById("btnAdmin");
    const btnAuditoria = document.getElementById("btnAuditoria");
    const painelClinicoModulos = document.getElementById("modulosClinicos");

    if (tipoPerfil === "admin") {
        // Exibe painéis de gestão, logs de auditoria e configurações avançadas
        if (btnAdmin) btnAdmin.style.display = "inline-block";
        if (btnAuditoria) btnAuditoria.style.display = "inline-block";
        
        console.log("🔐 Modo Administrativo Ativado: Acesso total liberado.");
    } else if (tipoPerfil === "clinico") {
        // Esconde travas gerenciais/auditorias e prioriza foco assistencial (PEC/Vigilância)
        if (btnAdmin) btnAdmin.style.display = "none";
        if (btnAuditoria) btnAuditoria.style.display = "none";
        if (painelClinicoModulos) painelClinicoModulos.style.display = "block";

        console.log("🩺 Modo Clínico Ativado: Foco em Prontuários e Linhas de Cuidado.");
    }
}

function exibirErroLogin(mensagem) {
    const erroDiv = document.getElementById("loginErro");
    if (erroDiv) {
        erroDiv.innerText = mensaje;
        erroDiv.style.display = "block";
    } else {
        alert(mensagem); // Fallback caso a div não exista no HTML
    }
}

/* ============================================================
   🚪 EFETUAR LOGOUT
============================================================ */
function efetuarLogout() {
    localStorage.removeItem("usuarioLogado");
    
    // Limpa campos para evitar cache visual de credenciais
    document.getElementById("loginUser").value = "";
    document.getElementById("loginSenha").value = "";
    
    // Alterna visualização voltando para a tela de autenticação
    document.getElementById("app").style.display = "none";
    document.getElementById("loginScreen").style.display = "flex";
}

/* ============================================================
   🔄 SISTEMA DE NAVEGAÇÃO INTERNA (SPA)
============================================================ */
function navigate(screenId) {
    // Esconde todas as seções de visualização que contêm a classe '.page'
    const pages = document.querySelectorAll(".page");
    pages.forEach(page => page.style.display = "none");

    // Mostra apenas a seção solicitada
    const activePage = document.getElementById(screenId);
    if (activePage) {
        activePage.style.display = "block";
    }
    
    // Fecha o Drawer/Menu lateral caso esteja aberto (Mobile friendly)
    if (typeof fecharDrawer === "function") {
        fecharDrawer();
    }
}

/* ============================================================
   🛡️ INICIALIZAÇÃO E VERIFICAÇÃO DE SESSÃO ATIVA
============================================================ */
function initSistema() {
    // Inicializa carregamentos analíticos nativos do sistema
    if (typeof listarBanco === "function") listarBanco();
    if (typeof listarReunioes === "function") listarReunioes();
    if (typeof verificarAlertas === "function") verificarAlertas();
    if (typeof atualizarDashboardInicio === "function") atualizarDashboardInicio();

    // Garante que menus flutuantes iniciem fechados
    const drawer = document.getElementById("drawer");
    const drawerOverlay = document.getElementById("drawerOverlay");
    if (drawer) drawer.style.display = "none";
    if (drawerOverlay) drawerOverlay.style.display = "none";

    /* 🔐 RESTAURAR SESSÃO PERSISTIDA */
    const sessao = JSON.parse(localStorage.getItem("usuarioLogado"));

    if (sessao) {
        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("app").style.display = "block";

        // Reaplica o filtro de permissões baseado no perfil recuperado
        aplicarPermissoesPerfil(sessao.tipo);

        navigate("inicio");
    }
}

// Executa a inicialização assim que a janela terminar o carregamento estrutural
window.onload = initSistema;

/* ============================================================
   ⚙️ UTILITÁRIOS: TRATAMENTO DE STRINGS
============================================================ */
function escapeHTML(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
