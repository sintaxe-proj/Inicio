/* ==========================================================
   🔐 AUTH SUPABASE — LOGIN + PERMISSÕES
   ADMIN = acesso total
   ASSISTENCIAL = sem configurações
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
            "🔐 Autenticado"
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

        /* ==================================================
           LOGIN SUPABASE
           ================================================== */

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

        /* ==================================================
           PERFIL
           ================================================== */

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

        /* ==================================================
           OBJETO GLOBAL
           ================================================== */

        usuarioLogado = {

            id:
                data.user.id,

            login:
                perfil.login ||
                data.user.email,

            email:
                data.user.email,

            nome:
                perfil.nome ||
                data.user.email,

            perfil:
                perfil.perfil || "assistencial",

            logadoEm:
                new Date().toISOString()
        };

        window.usuarioLogado =
            usuarioLogado;

        /* ==================================================
           SESSÃO
           ================================================== */

        salvarSessaoLocal(
            usuarioLogado
        );

        /* ==================================================
           PERMISSÕES
           ================================================== */

        aplicarPermissoes(
            usuarioLogado.perfil
        );

        /* ==================================================
           SISTEMA
           ================================================== */

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
   BUSCAR PERFIL
   ========================================================== */

async function buscarPerfilUsuarioPorEmail(email) {
    const emailLimpo = String(email || "").trim().toLowerCase();

    console.log("🔎 Buscando perfil:", emailLimpo);

    const { data, error } = await supabaseClient
        .from("users")
        .select("id, login, nome, email, perfil, ativo")
        .eq("email", emailLimpo)
        .maybeSingle();

    console.log("👤 Perfil encontrado:", data, error);

    if (error) {
        console.error("Erro perfil:", error);
        return null;
    }

    return data;
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

        usuarioLogado = {

            id:
                data.user.id,

            login:
                perfil.login ||
                data.user.email,

            email:
                data.user.email,

            nome:
                perfil.nome ||
                data.user.email,

            perfil:
                perfil.perfil || "assistencial",

            logadoEm:
                new Date().toISOString()
        };

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
        usuarioLogado?.perfil;

    // ADMIN
    if (perfil === "admin") {
        return true;
    }

    // ASSISTENCIAL
    if (perfil === "assistencial") {

        if (
            view === "configuracoes" ||
            view === "auditoria"
        ) {

            return false;
        }

        return true;
    }

    // RECEPÇÃO
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

function aplicarPermissoes(perfil) {

    const btnAuditoria =
        document.getElementById(
            "btnAuditoria"
        );

    const btnConfiguracoes =
        document.getElementById(
            "btnConfiguracoes"
        );

    const abaProntuario =
        document.querySelector(
            '[onclick="navigate(\'prontuario\')"]'
        );

    const abaReuniao =
        document.querySelector(
            '[onclick="navigate(\'reuniao\')"]'
        );

    const abaMateriais =
        document.querySelector(
            '[onclick="navigate(\'estoque\')"]'
        );

    /* ==================================================
       ADMIN
       ================================================== */

    if (perfil === "admin") {

        if (btnAuditoria)
            btnAuditoria.style.display =
                "inline-block";

        if (btnConfiguracoes)
            btnConfiguracoes.style.display =
                "inline-block";

        [
            abaProntuario,
            abaReuniao,
            abaMateriais
        ].forEach(aba => {

            if (aba) {
                aba.style.display =
                    "inline-block";
            }
        });
    }

    /* ==================================================
       ASSISTENCIAL
       ================================================== */

    if (perfil === "assistencial") {

        if (btnAuditoria)
            btnAuditoria.style.display =
                "none";

        if (btnConfiguracoes)
            btnConfiguracoes.style.display =
                "none";

        [
            abaProntuario,
            abaReuniao,
            abaMateriais
        ].forEach(aba => {

            if (aba) {
                aba.style.display =
                    "inline-block";
            }
        });
    }

    /* ==================================================
       RECEPÇÃO
       ================================================== */

    if (perfil === "recepcao") {

        if (btnAuditoria)
            btnAuditoria.style.display =
                "none";

        if (btnConfiguracoes)
            btnConfiguracoes.style.display =
                "none";

        [
            abaProntuario,
            abaReuniao,
            abaMateriais
        ].forEach(aba => {

            if (aba) {
                aba.style.display =
                    "none";
            }
        });
    }

    atualizarCabecalhoUsuario();
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

        if (
            usuarioLogado?.perfil ===
            "admin"
        ) {

            cargoUsuario.innerText =
                "Administrador";

        } else if (
            usuarioLogado?.perfil ===
            "recepcao"
        ) {

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

setTimeout(() => {
    atualizarIndicatorsDashboard?.();
    atualizarCentralAvisosSininho?.();
}, 500);


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

        await supabaseClient.auth.signOut();

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
   GLOBAL
   ========================================================== */

window.autenticarUsuario =
    autenticarUsuario;

window.verificarSessao =
    verificarSessao;

window.efetuarLogout =
    efetuarLogout;
