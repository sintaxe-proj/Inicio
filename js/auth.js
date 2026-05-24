/* ==========================================================
   AUTH SUPABASE — LOGIN + PERMISSÕES
   ========================================================== */

let usuarioLogado = null;

/* ==========================================================
   INICIAR
   ========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    await verificarSessao();
});

/* ==========================================================
   LOGIN
   ========================================================== */

async function autenticarUsuario() {
    const email = document.getElementById("loginUser")?.value.trim();
    const senha = document.getElementById("loginSenha")?.value.trim();

    if (!email || !senha) {
        mostrarErroLogin("Informe e-mail e senha.");
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password: senha
    });

    if (error) {
        console.error("Erro no login:", error);
        mostrarErroLogin("Login inválido.");
        return;
    }

    const perfil = await buscarPerfilUsuario(data.user.id);

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
        nome: perfil.nome,
        perfil: perfil.perfil
    };

    window.usuarioLogado = usuarioLogado;

    localStorage.setItem(
        "pep_sessao_ativa",
        JSON.stringify(usuarioLogado)
    );

    aplicarPermissoes(perfil.perfil);
    mostrarSistema();

    mostrarToast?.(`✅ Bem-vindo(a), ${perfil.nome || data.user.email}`);
}

/* ==========================================================
   BUSCAR PERFIL NA TABELA public.users
   ========================================================== */

async function buscarPerfilUsuario(userId) {
    const { data, error } = await supabaseClient
        .from("users")
        .select("id, nome, email, perfil, ativo")
        .eq("id", userId)
        .maybeSingle();

    if (error) {
        console.error("Erro ao buscar perfil do usuário:", error);
        return null;
    }

    return data;
}

/* ==========================================================
   VERIFICAR SESSÃO
   ========================================================== */

async function verificarSessao() {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data?.user) {
        limparSessaoLocal();
        mostrarTelaLogin();
        return;
    }

    const perfil = await buscarPerfilUsuario(data.user.id);

    if (!perfil || !perfil.ativo) {
        await supabaseClient.auth.signOut();
        limparSessaoLocal();
        mostrarTelaLogin();
        return;
    }

    usuarioLogado = {
        id: data.user.id,
        email: data.user.email,
        nome: perfil.nome,
        perfil: perfil.perfil
    };

    window.usuarioLogado = usuarioLogado;

    localStorage.setItem(
        "pep_sessao_ativa",
        JSON.stringify(usuarioLogado)
    );

    aplicarPermissoes(perfil.perfil);
    mostrarSistema();
}

/* ==========================================================
   PERMISSÕES
   ========================================================== */

function aplicarPermissoes(perfil) {
    const btnAuditoria = document.getElementById("btnAuditoria");
    const abaProntuario = document.querySelector('[onclick="navigate(\'prontuario\')"]');
    const btnConfig = document.getElementById("btnConfiguracoes");

    if (btnAuditoria) {
        btnAuditoria.style.display =
            perfil === "admin" ? "inline-block" : "none";
    }

    if (btnConfig) {
        btnConfig.style.display =
            perfil === "admin" ? "inline-block" : "none";
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
            usuarioLogado?.nome ||
            usuarioLogado?.email ||
            "Usuário";
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
   CONTROLE DE TELAS
   ========================================================== */

function mostrarSistema() {
    const loginScreen = document.getElementById("loginScreen");
    const app = document.getElementById("app");

    if (loginScreen) loginScreen.style.display = "none";
    if (app) app.style.display = "block";

    navigate?.("inicio");
    atualizarIndicatorsDashboard?.();
    atualizarCentralAvisosSininho?.();
}

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

    await supabaseClient.auth.signOut();

    limparSessaoLocal();

    mostrarToast?.("👋 Sessão encerrada.");

    mostrarTelaLogin();
}

/* ==========================================================
   LIMPAR SESSÃO LOCAL
   ========================================================== */

function limparSessaoLocal() {
    usuarioLogado = null;
    window.usuarioLogado = null;

    localStorage.removeItem("pep_sessao_ativa");
}

/* ==========================================================
   ENTER PARA LOGIN
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
