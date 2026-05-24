/* ==========================================================
   AUTH SUPABASE — LOGIN + PERMISSÕES
   Busca perfil por E-MAIL
   ========================================================== */

let usuarioLogado = null;

document.addEventListener("DOMContentLoaded", async () => {
    console.log("🔐 Inicializando autenticação...");
    await verificarSessao();
});

/* ==========================================================
   LOGIN
   ========================================================== */

async function autenticarUsuario() {
    const email = document.getElementById("loginUser")?.value.trim().toLowerCase();
    const senha = document.getElementById("loginSenha")?.value.trim();

    if (!email || !senha) {
        mostrarErroLogin("Informe e-mail e senha.");
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password: senha
        });

        if (error) {
            console.error("Erro login:", error);
            mostrarErroLogin("Login inválido.");
            return;
        }

        const perfil = await buscarPerfilUsuarioPorEmail(data.user.email);

        if (!perfil) {
            await supabaseClient.auth.signOut();
            mostrarErroLogin("Usuário sem permissão cadastrada.");
            return;
        }

        if (!perfil.ativo) {
            await supabaseClient.auth.signOut();
            mostrarErroLogin("Usuário bloqueado.");
            return;
        }

        usuarioLogado = {
            id: data.user.id,
            email: data.user.email,
            login: perfil.login || data.user.email,
            nome: perfil.nome || data.user.email,
            perfil: perfil.perfil || "assistencial",
            logadoEm: new Date().toISOString()
        };

        window.usuarioLogado = usuarioLogado;
        salvarSessaoLocal(usuarioLogado);
        aplicarPermissoes(usuarioLogado.perfil);
        mostrarSistema();

        mostrarToast?.(`✅ Bem-vindo(a), ${usuarioLogado.nome}`);

    } catch (e) {
        console.error("Erro autenticação:", e);
        mostrarErroLogin("Falha no login Supabase.");
    }
}

/* ==========================================================
   BUSCAR PERFIL POR EMAIL
   ========================================================== */

async function buscarPerfilUsuarioPorEmail(email) {
    const { data, error } = await supabaseClient
        .from("users")
        .select("id, login, nome, email, perfil, ativo")
        .ilike("email", email)
        .maybeSingle();

    if (error) {
        console.error("Erro perfil:", error);
        return null;
    }

    return data;
}

/* ==========================================================
   SALVAR SESSÃO
   ========================================================== */

function salvarSessaoLocal(usuario) {
    localStorage.setItem("pep_sessao_ativa", JSON.stringify(usuario));
    localStorage.setItem("sintaxehub_usuario_logado", JSON.stringify(usuario));
    localStorage.setItem("usuarioLogado", JSON.stringify(usuario));
}

/* ==========================================================
   VERIFICAR SESSÃO
   ========================================================== */

async function verificarSessao() {
    try {
        const { data, error } = await supabaseClient.auth.getUser();

        if (error || !data?.user) {
            limparSessaoLocal();
            mostrarTelaLogin();
            return;
        }

        const perfil = await buscarPerfilUsuarioPorEmail(data.user.email);

        if (!perfil || !perfil.ativo) {
            await supabaseClient.auth.signOut();
            limparSessaoLocal();
            mostrarTelaLogin();
            return;
        }

        usuarioLogado = {
            id: data.user.id,
            email: data.user.email,
            login: perfil.login || data.user.email,
            nome: perfil.nome || data.user.email,
            perfil: perfil.perfil || "assistencial",
            logadoEm: new Date().toISOString()
        };

        window.usuarioLogado = usuarioLogado;
        salvarSessaoLocal(usuarioLogado);
        aplicarPermissoes(usuarioLogado.perfil);
        mostrarSistema();

        console.log("✅ Sessão restaurada.");

    } catch (e) {
        console.error("Erro sessão:", e);
        limparSessaoLocal();
        mostrarTelaLogin();
    }
}

/* ==========================================================
   PERMISSÕES
   ========================================================== */

function aplicarPermissoes(perfil) {
    const btnAuditoria = document.getElementById("btnAuditoria");
    const abaProntuario = document.querySelector('[onclick="navigate(\'prontuario\')"]');
    const btnConfig = document.getElementById("btnConfiguracoes");

    if (btnAuditoria) {
        btnAuditoria.style.display = perfil === "admin" ? "inline-block" : "none";
    }

    if (btnConfig) {
        btnConfig.style.display = perfil === "admin" ? "inline-block" : "none";
    }

    if (abaProntuario) {
        if (perfil === "recepcao") {
            abaProntuario.style.opacity = ".5";
            abaProntuario.style.pointerEvents = "none";
            abaProntuario.title = "Recepção sem acesso SOAP";
        } else {
            abaProntuario.style.opacity = "1";
            abaProntuario.style.pointerEvents = "auto";
            abaProntuario.title = "";
        }
    }

    atualizarCabecalhoUsuario();
}

/* ==========================================================
   CABEÇALHO
   ========================================================== */

function atualizarCabecalhoUsuario() {
    const nomeUsuario = document.getElementById("nomeUsuarioLogado");
    const cargoUsuario = document.getElementById("cargoUsuarioLogado");

    if (nomeUsuario) {
        nomeUsuario.innerText =
            "👤 " + (usuarioLogado?.nome || usuarioLogado?.email || "Usuário");
    }

    if (cargoUsuario) {
        if (usuarioLogado?.perfil === "admin") {
            cargoUsuario.innerText = "Administrador";
        } else if (usuarioLogado?.perfil === "recepcao") {
            cargoUsuario.innerText = "Recepção";
        } else {
            cargoUsuario.innerText = "Assistencial";
        }
    }
}

/* ==========================================================
   MOSTRAR SISTEMA
   ========================================================== */

function mostrarSistema() {
    const loginScreen = document.getElementById("loginScreen");
    const app = document.getElementById("app");

    if (loginScreen) loginScreen.style.display = "none";
    if (app) app.style.display = "block";

    atualizarIndicatorsDashboard?.();
    atualizarCentralAvisosSininho?.();
    navigate?.("inicio");
}

/* ==========================================================
   MOSTRAR LOGIN
   ========================================================== */

function mostrarTelaLogin() {
    const loginScreen = document.getElementById("loginScreen");
    const app = document.getElementById("app");

    if (loginScreen) loginScreen.style.display = "flex";
    if (app) app.style.display = "none";
}

/* ==========================================================
   ERRO LOGIN
   ========================================================== */

function mostrarErroLogin(mensagem) {
    const erro = document.getElementById("loginErro");

    if (erro) {
        erro.innerText = mensagem;
        erro.style.display = "block";
    } else {
        alert(mensagem);
    }
}

/* ==========================================================
   LOGOUT
   ========================================================== */

async function efetuarLogout() {
    const confirmar = confirm("Deseja realmente sair do sistema?");
    if (!confirmar) return;

    try {
        await supabaseClient.auth.signOut();
    } catch (e) {
        console.warn("Erro logout:", e);
    }

    limparSessaoLocal();
    mostrarToast?.("👋 Sessão encerrada.");
    mostrarTelaLogin();
}

/* ==========================================================
   LIMPAR SESSÃO
   ========================================================== */

function limparSessaoLocal() {
    usuarioLogado = null;
    window.usuarioLogado = null;

    localStorage.removeItem("pep_sessao_ativa");
    localStorage.removeItem("sintaxehub_usuario_logado");
    localStorage.removeItem("usuarioLogado");
}

/* ==========================================================
   ENTER LOGIN
   ========================================================== */

document.addEventListener("keydown", function (e) {
    const loginScreen = document.getElementById("loginScreen");

    if (
        e.key === "Enter" &&
        loginScreen &&
        loginScreen.style.display !== "none"
    ) {
        autenticarUsuario();
    }
});

/* ==========================================================
   GLOBAL
   ========================================================== */

window.autenticarUsuario = autenticarUsuario;
window.verificarSessao = verificarSessao;
window.efetuarLogout = efetuarLogout;
