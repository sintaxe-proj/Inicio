/* ==========================================================
   🔐 AUTH SUPABASE — LOGIN + PERMISSÕES
   ADMIN = acesso total
   ASSISTENCIAL = sem configurações/estoque
   RECEPÇÃO = sem SOAP/Clínico
   ========================================================== */

let usuarioLogado = null;

/* ==========================================================
   START
   ========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "🔐 Auth carregado"
        );

        await verificarSessao();
    }
);

/* ==========================================================
   LOGIN
   ========================================================== */

async function autenticarUsuario() {

    const email =
        document.getElementById("loginUser")
            ?.value
            ?.trim()
            ?.toLowerCase();

    const senha =
        document.getElementById("loginSenha")
            ?.value
            ?.trim();

    if (!email || !senha) {

        mostrarErroLogin(
            "Informe e-mail e senha."
        );

        return;
    }

    try {

        const {
            data,
            error
        } =
        await supabaseClient.auth.signInWithPassword({
            email,
            password: senha
        });

        if (error) {

            console.error(
                "Erro login:",
                error
            );

            mostrarErroLogin(
                "Login inválido."
            );

            return;
        }

        const perfil =
            await buscarPerfilUsuarioPorEmail(
                data.user.email
            );

        if (!perfil) {

            await supabaseClient.auth.signOut();

            mostrarErroLogin(
                "Usuário sem permissão cadastrada."
            );

            return;
        }

        if (!perfil.ativo) {

            await supabaseClient.auth.signOut();

            mostrarErroLogin(
                "Usuário bloqueado."
            );

            return;
        }

        usuarioLogado = montarUsuarioLogado(
            data.user,
            perfil
        );

        window.usuarioLogado =
            usuarioLogado;

        salvarSessaoLocal(
            usuarioLogado
        );

        aplicarPermissoes(
            usuarioLogado.perfil
        );

        mostrarSistema();

        mostrarToast?.(
            `✅ Bem-vindo(a), ${usuarioLogado.nome}`
        );

        console.log(
            "✅ Login realizado."
        );

    } catch (e) {

        console.error(
            "Erro autenticação:",
            e
        );

        mostrarErroLogin(
            "Falha no login Supabase."
        );
    }
}

/* ==========================================================
   MONTAR USUÁRIO
   ========================================================== */

function montarUsuarioLogado(user, perfil) {

    return {
        id:
            user.id,

        login:
            perfil.email ||
            user.email,

        email:
            user.email,

        nome:
            perfil.nome ||
            user.email,

        perfil:
            normalizarPerfil(
                perfil.perfil || "assistencial"
            ),

        ativo:
            perfil.ativo,

        logadoEm:
            new Date().toISOString()
    };
}

/* ==========================================================
   NORMALIZAR PERFIL
   ========================================================== */

function normalizarPerfil(perfil) {

    const p =
        String(perfil || "")
            .trim()
            .toLowerCase();

    if (
        p === "admin" ||
        p === "administrador" ||
        p === "gestor" ||
        p === "coordenador"
    ) {
        return "admin";
    }

    if (
        p === "recepcao" ||
        p === "recepção" ||
        p === "observador"
    ) {
        return "recepcao";
    }

    return "assistencial";
}

/* ==========================================================
   BUSCAR PERFIL
   ========================================================== */

async function buscarPerfilUsuarioPorEmail(email) {

    const emailLimpo =
        String(email || "")
            .trim()
            .toLowerCase();

    console.log(
        "🔎 Buscando perfil:",
        emailLimpo
    );

    if (!emailLimpo) {
        return null;
    }

    try {

        /*
           IMPORTANTE:
           Não selecionar a coluna "login".
           Se ela não existir no Supabase, a API REST retorna 400.
        */

        const {
            data,
            error
        } =
        await supabaseClient
            .from("users")
            .select("id, nome, email, perfil, ativo")
            .eq("email", emailLimpo)
            .maybeSingle();

        console.log(
            "👤 Perfil encontrado:",
            data,
            error
        );

        if (error) {

            console.error(
                "Erro perfil:",
                error
            );

            return null;
        }

        if (!data) {
            return null;
        }

        return {
            id: data.id,
            login: data.email,
            nome: data.nome || data.email,
            email: data.email,
            perfil: data.perfil || "assistencial",
            ativo: data.ativo !== false
        };

    } catch (erro) {

        console.error(
            "Erro inesperado ao buscar perfil:",
            erro
        );

        return null;
    }
}

/* ==========================================================
   SESSÃO LOCAL
   ========================================================== */

function salvarSessaoLocal(usuario) {

    localStorage.setItem(
        "pep_sessao_ativa",
        JSON.stringify(usuario)
    );

    localStorage.setItem(
        "sintaxehub_usuario_logado",
        JSON.stringify(usuario)
    );

    localStorage.setItem(
        "usuarioLogado",
        JSON.stringify(usuario)
    );
}

/* ==========================================================
   RESTAURAR SESSÃO
   ========================================================== */

async function verificarSessao() {

    try {

        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient?.auth
        ) {
            mostrarTelaLogin();
            return;
        }

        const {
            data,
            error
        } =
        await supabaseClient.auth.getUser();

        if (
            error ||
            !data?.user
        ) {

            limparSessaoLocal();

            mostrarTelaLogin();

            return;
        }

        const perfil =
            await buscarPerfilUsuarioPorEmail(
                data.user.email
            );

        if (
            !perfil ||
            !perfil.ativo
        ) {

            await supabaseClient.auth.signOut();

            limparSessaoLocal();

            mostrarTelaLogin();

            return;
        }

        usuarioLogado =
            montarUsuarioLogado(
                data.user,
                perfil
            );

        window.usuarioLogado =
            usuarioLogado;

        salvarSessaoLocal(
            usuarioLogado
        );

        aplicarPermissoes(
            usuarioLogado.perfil
        );

        mostrarSistema();

        console.log(
            "✅ Sessão restaurada."
        );

    } catch (e) {

        console.error(
            "Erro sessão:",
            e
        );

        limparSessaoLocal();

        mostrarTelaLogin();
    }
}

/* ==========================================================
   CONTROLE DE ACESSO
   ========================================================== */

function podeAcessar(view) {

    const perfil =
        normalizarPerfil(
            usuarioLogado?.perfil ||
            window.usuarioLogado?.perfil
        );

    if (perfil === "admin") {
        return true;
    }

    if (perfil === "assistencial") {

        if (
            view === "config" ||
            view === "configuracoes" ||
            view === "auditoria" ||
            view === "estoque"
        ) {
            return false;
        }

        return true;
    }

    if (perfil === "recepcao") {

        return [
            "inicio",
            "banco"
        ].includes(view);
    }

    return false;
}

window.podeAcessar =
    podeAcessar;

/* ==========================================================
   APLICAR PERMISSÕES
   ========================================================== */

function aplicarPermissoes(perfilRecebido) {

    const perfil =
        normalizarPerfil(
            perfilRecebido ||
            usuarioLogado?.perfil
        );

    const btnAuditoria =
        document.getElementById("btnAuditoria");

    const btnConfiguracoes =
        document.getElementById("btnConfiguracoes") ||
        document.querySelector('[onclick="navigate(\'config\')"]') ||
        document.querySelector('[onclick="navigate(\'configuracoes\')"]');

    const abaProntuario =
        document.querySelector('[onclick="navigate(\'prontuario\')"]');

    const abaBanco =
        document.querySelector('[onclick="navigate(\'banco\')"]');

    const abaReuniao =
        document.querySelector('[onclick="navigate(\'reuniao\')"]');

    const abaMateriais =
        document.querySelector('[onclick="navigate(\'estoque\')"]') ||
        document.querySelector('[onclick="navigate(\'materiais\')"]');

    const seletorNivel =
        document.getElementById("seletorNivelAcesso");

    if (perfil === "admin") {

        if (btnAuditoria) {
            btnAuditoria.style.display = "inline-block";
        }

        if (btnConfiguracoes) {
            btnConfiguracoes.style.display = "inline-block";
        }

        [
            abaProntuario,
            abaBanco,
            abaReuniao,
            abaMateriais
        ].forEach(aba => {
            if (aba) {
                aba.style.display = "inline-block";
            }
        });

        if (seletorNivel) {
            seletorNivel.style.display = "inline-block";
            seletorNivel.value = "admin";
        }
    }

    if (perfil === "assistencial") {

        if (btnAuditoria) {
            btnAuditoria.style.display = "none";
        }

        if (btnConfiguracoes) {
            btnConfiguracoes.style.display = "none";
        }

        if (abaProntuario) {
            abaProntuario.style.display = "inline-block";
        }

        if (abaBanco) {
            abaBanco.style.display = "inline-block";
        }

        if (abaReuniao) {
            abaReuniao.style.display = "inline-block";
        }

        if (abaMateriais) {
            abaMateriais.style.display = "none";
        }

        if (seletorNivel) {
            seletorNivel.style.display = "none";
            seletorNivel.value = "assistencial";
        }

        redirecionarSeViewRestrita();
    }

    if (perfil === "recepcao") {

        if (btnAuditoria) {
            btnAuditoria.style.display = "none";
        }

        if (btnConfiguracoes) {
            btnConfiguracoes.style.display = "none";
        }

        if (abaProntuario) {
            abaProntuario.style.display = "none";
        }

        if (abaReuniao) {
            abaReuniao.style.display = "none";
        }

        if (abaMateriais) {
            abaMateriais.style.display = "none";
        }

        if (abaBanco) {
            abaBanco.style.display = "inline-block";
        }

        if (seletorNivel) {
            seletorNivel.style.display = "none";
            seletorNivel.value = "recepcao";
        }

        redirecionarSeViewRestrita();
    }

    atualizarCabecalhoUsuario();
}

/* Alias para o app.js */
function aplicarPermissoesUsuario() {
    aplicarPermissoes(
        usuarioLogado?.perfil ||
        window.usuarioLogado?.perfil
    );
}

window.aplicarPermissoesUsuario =
    aplicarPermissoesUsuario;

/* ==========================================================
   REDIRECIONAR SE VIEW RESTRITA
   ========================================================== */

function redirecionarSeViewRestrita() {

    const viewAberta =
        Array.from(
            document.querySelectorAll(".view")
        ).find(v => v.style.display === "block");

    if (!viewAberta) return;

    const id =
        viewAberta.id || "";

    const view =
        id.replace("view-", "");

    if (
        view &&
        typeof podeAcessar === "function" &&
        !podeAcessar(view)
    ) {
        navigate?.("inicio");
    }
}

/* ==========================================================
   CABEÇALHO
   ========================================================== */

function atualizarCabecalhoUsuario() {

    const nomeUsuario =
        document.getElementById(
            "nomeUsuarioLogado"
        );

    const cargoUsuario =
        document.getElementById(
            "cargoUsuarioLogado"
        );

    if (nomeUsuario) {

        nomeUsuario.innerText =
            "👤 " +
            (
                usuarioLogado?.nome ||
                usuarioLogado?.email ||
                "Usuário"
            );
    }

    if (cargoUsuario) {

        const perfil =
            normalizarPerfil(
                usuarioLogado?.perfil
            );

        if (perfil === "admin") {

            cargoUsuario.innerText =
                "Coordenador/Gestor";

        } else if (perfil === "recepcao") {

            cargoUsuario.innerText =
                "Recepção";

        } else {

            cargoUsuario.innerText =
                "Assistencial";
        }
    }
}

/* ==========================================================
   MOSTRAR SISTEMA
   ========================================================== */

function mostrarSistema() {

    const loginScreen =
        document.getElementById(
            "loginScreen"
        );

    const app =
        document.getElementById(
            "app"
        );

    if (loginScreen) {
        loginScreen.style.display =
            "none";
    }

    if (app) {
        app.style.display =
            "block";
    }

    navigate?.("inicio");

    if (
        typeof atualizarDadosIniciais === "function"
    ) {
        atualizarDadosIniciais();
    } else {
        setTimeout(() => {
            atualizarIndicatorsDashboard?.();
            atualizarCentralAvisosSininho?.();
            atualizarDashboardEstoque?.();
        }, 500);
    }
}

/* ==========================================================
   MOSTRAR LOGIN
   ========================================================== */

function mostrarTelaLogin() {

    const loginScreen =
        document.getElementById(
            "loginScreen"
        );

    const app =
        document.getElementById(
            "app"
        );

    if (loginScreen) {
        loginScreen.style.display =
            "flex";
    }

    if (app) {
        app.style.display =
            "none";
    }
}

/* ==========================================================
   ERRO LOGIN
   ========================================================== */

function mostrarErroLogin(mensagem) {

    const erro =
        document.getElementById(
            "loginErro"
        );

    if (erro) {

        erro.innerText =
            mensagem;

        erro.style.display =
            "block";

    } else {

        alert(mensagem);
    }
}

/* ==========================================================
   LOGOUT
   ========================================================== */

async function efetuarLogout() {

    const confirmar =
        confirm(
            "Deseja realmente sair do sistema?"
        );

    if (!confirmar) {
        return;
    }

    try {

        if (
            typeof supabaseClient !== "undefined" &&
            supabaseClient?.auth
        ) {
            await supabaseClient.auth.signOut();
        }

    } catch (e) {

        console.warn(
            "Erro logout:",
            e
        );
    }

    limparSessaoLocal();

    mostrarToast?.(
        "👋 Sessão encerrada."
    );

    mostrarTelaLogin();
}

/* ==========================================================
   LIMPAR SESSÃO
   ========================================================== */

function limparSessaoLocal() {

    usuarioLogado = null;

    window.usuarioLogado = null;

    localStorage.removeItem(
        "pep_sessao_ativa"
    );

    localStorage.removeItem(
        "sintaxehub_usuario_logado"
    );

    localStorage.removeItem(
        "usuarioLogado"
    );
}

/* ==========================================================
   ENTER LOGIN
   ========================================================== */

document.addEventListener(
    "keydown",
    function (e) {

        const loginScreen =
            document.getElementById(
                "loginScreen"
            );

        if (
            e.key === "Enter" &&
            loginScreen &&
            loginScreen.style.display !== "none"
        ) {

            autenticarUsuario();
        }
    }
);

/* ======================================================
   RECUPERAÇÃO DE SENHA SUPABASE
   ====================================================== */

async function verificarRecuperacaoSenha() {

    const hash =
        window.location.hash;

    if (
        !hash.includes("type=recovery")
    ) {
        return;
    }

    const novaSenha =
        prompt(
            "Digite sua nova senha:"
        );

    if (
        !novaSenha ||
        novaSenha.length < 6
    ) {

        alert(
            "Senha inválida."
        );

        return;
    }

    const {
        error
    } =
    await supabaseClient.auth.updateUser({
        password: novaSenha
    });

    if (error) {

        console.error(
            "Erro redefinir senha:",
            error
        );

        alert(
            "Erro ao redefinir senha."
        );

        return;
    }

    alert(
        "Senha alterada com sucesso."
    );

    window.location.hash = "";
    window.location.reload();
}

document.addEventListener(
    "DOMContentLoaded",
    verificarRecuperacaoSenha
);

/* ==========================================================
   ALTERNAR VISÃO GESTOR / ASSISTENCIAL
   ========================================================== */

function alternarVisaoGestor(perfilSelecionado) {

    const perfilNormalizado =
        normalizarPerfil(perfilSelecionado);

    if (
        usuarioLogado?.perfil !== "admin" &&
        window.usuarioLogado?.perfil !== "admin"
    ) {
        aplicarPermissoes(
            usuarioLogado?.perfil ||
            window.usuarioLogado?.perfil
        );

        return;
    }

    const btnAuditoria =
        document.getElementById("btnAuditoria");

    const btnConfiguracoes =
        document.getElementById("btnConfiguracoes") ||
        document.querySelector('[onclick="navigate(\'config\')"]');

    const abaEstoque =
        document.querySelector('[onclick="navigate(\'estoque\')"]') ||
        document.querySelector('[onclick="navigate(\'materiais\')"]');

    const viewConfig =
        document.getElementById("view-config");

    const viewEstoque =
        document.getElementById("view-estoque");

    if (perfilNormalizado === "admin") {

        if (btnAuditoria) {
            btnAuditoria.style.display = "inline-block";
        }

        if (btnConfiguracoes) {
            btnConfiguracoes.style.display = "inline-block";
        }

        if (abaEstoque) {
            abaEstoque.style.display = "inline-block";
        }

        return;
    }

    if (btnAuditoria) {
        btnAuditoria.style.display = "none";
    }

    if (btnConfiguracoes) {
        btnConfiguracoes.style.display = "none";
    }

    if (abaEstoque) {
        abaEstoque.style.display = "none";
    }

    if (
        viewConfig?.style.display === "block" ||
        viewEstoque?.style.display === "block"
    ) {
        navigate?.("inicio");
    }
}

/* ==========================================================
   BUSCAR PERFIL USUÁRIO LOGADO
   Compatibilidade com app.js novo
   ========================================================== */

async function buscarPerfilUsuarioLogado() {

    try {

        const {
            data,
            error
        } =
        await supabaseClient.auth.getUser();

        if (
            error ||
            !data?.user
        ) {
            return null;
        }

        const perfil =
            await buscarPerfilUsuarioPorEmail(
                data.user.email
            );

        if (!perfil) {
            return null;
        }

        usuarioLogado =
            montarUsuarioLogado(
                data.user,
                perfil
            );

        window.usuarioLogado =
            usuarioLogado;

        salvarSessaoLocal(
            usuarioLogado
        );

        aplicarPermissoes(
            usuarioLogado.perfil
        );

        return usuarioLogado;

    } catch (erro) {

        console.error(
            "Erro ao buscar perfil do usuário logado:",
            erro
        );

        return null;
    }
}

/* ==========================================================
   GLOBAL
   ========================================================== */

window.autenticarUsuario =
    autenticarUsuario;

window.verificarSessao =
    verificarSessao;

window.efetuarLogout =
    efetuarLogout;

window.alternarVisaoGestor =
    alternarVisaoGestor;

window.normalizarPerfil =
    normalizarPerfil;

window.aplicarPermissoes =
    aplicarPermissoes;

window.buscarPerfilUsuarioLogado =
    buscarPerfilUsuarioLogado;

window.buscarPerfilUsuarioPorEmail =
    buscarPerfilUsuarioPorEmail;

window.mostrarTelaLogin =
    mostrarTelaLogin;

window.mostrarSistema =
    mostrarSistema;
