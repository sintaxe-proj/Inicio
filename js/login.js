/* ==========================================================================
   🔐 LOGIN / SESSÃO / PERFIS
   ========================================================================== */

/* ==========================================================
   USUÁRIOS MUNICIPAIS
   ========================================================== */

const USUARIOS_MUNICIPAIS = {

    /* ======================================================
       ADMINISTRADORES
       ====================================================== */

    "5132": {
        senha: "123",
        nome: "Josimar Kapps",
        perfil: "admin"
    },

    "9999": {
        senha: "admin",
        nome: "Administrador Master",
        perfil: "admin"
    },

    /* ======================================================
       ASSISTENCIAL
       ====================================================== */

    "2001": {
        senha: "123",
        nome: "Enfermeira APS",
        perfil: "user"
    },

    "2002": {
        senha: "123",
        nome: "Médico APS",
        perfil: "user"
    },

    /* ======================================================
       RECEPÇÃO
       ====================================================== */

    "3001": {
        senha: "123",
        nome: "Recepção UBS",
        perfil: "recepcao"
    }
};

/* ==========================================================================
   🔐 AUTENTICAÇÃO
   ========================================================================== */

function autenticarUsuario() {

    const login =
        document.getElementById("loginUser")
            .value
            .trim();

    const senha =
        document.getElementById("loginSenha")
            .value
            .trim();

    const erro =
        document.getElementById("loginErro");

    erro.style.display = "none";

    if (!login || !senha) {

        erro.innerText =
            "⚠️ Informe usuário e senha.";

        erro.style.display = "block";

        return;
    }

    const usuario =
        USUARIOS_MUNICIPAIS[login];

    if (!usuario) {

        erro.innerText =
            "❌ Usuário não encontrado.";

        erro.style.display = "block";

        return;
    }

    if (usuario.senha !== senha) {

        erro.innerText =
            "❌ Senha inválida.";

        erro.style.display = "block";

        return;
    }

    /* ======================================================
       SALVA SESSÃO
       ====================================================== */

    localStorage.setItem(
        "pep_sessao_ativa",
        JSON.stringify({
            login,
            nome: usuario.nome,
            perfil: usuario.perfil
        })
    );

    mostrarToast(
        `✅ Bem-vindo(a), ${usuario.nome}`
    );

    verificarSessao();
}

/* ==========================================================================
   🔄 VERIFICAR SESSÃO
   ========================================================================== */

function verificarSessao() {

    const sessao =
        localStorage.getItem(
            "pep_sessao_ativa"
        );

    if (!sessao) {

        document.getElementById(
            "loginScreen"
        ).style.display = "flex";

        document.getElementById(
            "app"
        ).style.display = "none";

        return;
    }

    const user = JSON.parse(sessao);

    /* ======================================================
       MOSTRA APP
       ====================================================== */

    document.getElementById(
        "loginScreen"
    ).style.display = "none";

    document.getElementById(
        "app"
    ).style.display = "block";

    /* ======================================================
       NOME USUÁRIO
       ====================================================== */

    const nomeUsuario =
        document.getElementById(
            "nomeUsuarioLogado"
        );

    if (nomeUsuario) {

        nomeUsuario.innerText =
            user.nome || "Usuário";
    }

    /* ======================================================
       CARGO / PERFIL
       ====================================================== */

    const cargoUsuario =
        document.getElementById(
            "cargoUsuarioLogado"
        );

    if (cargoUsuario) {

        if (user.perfil === "admin") {

            cargoUsuario.innerText =
                "Coordenador UBS";
        }

        else if (
            user.perfil === "recepcao"
        ) {

            cargoUsuario.innerText =
                "Recepção";
        }

        else {

            cargoUsuario.innerText =
                "Assistencialista";
        }
    }

    /* ======================================================
       CONFIGURAÇÕES SOMENTE ADMIN
       ====================================================== */

    const btnAuditoria =
        document.getElementById(
            "btnAuditoria"
        );

    if (btnAuditoria) {

        btnAuditoria.style.display =
            user.perfil === "admin"
                ? "inline-block"
                : "none";
    }

    /* ======================================================
       BLOQUEIOS RECEPÇÃO
       ====================================================== */

    const abaProntuario =
        document.querySelector(
            '[onclick="navigate(\'prontuario\')"]'
        );

    if (
        abaProntuario &&
        user.perfil === "recepcao"
    ) {

        abaProntuario.style.opacity = ".5";

        abaProntuario.style.pointerEvents =
            "none";

        abaProntuario.title =
            "Recepção sem acesso SOAP";
    }

    /* ======================================================
       INICIA DASHBOARD
       ====================================================== */

    navigate("inicio");

    atualizarIndicatorsDashboard?.();

    atualizarCentralAvisosSininho?.();
}

/* ==========================================================================
   🚪 LOGOUT
   ========================================================================== */

function efetuarLogout() {

    if (
        !confirm(
            "Deseja realmente sair do sistema?"
        )
    ) {
        return;
    }

    localStorage.removeItem(
        "pep_sessao_ativa"
    );

    mostrarToast(
        "👋 Sessão encerrada."
    );

    location.reload();
}

/* ==========================================================================
   ➕ CRIAR NOVO ADMINISTRADOR
   ========================================================================== */

function criarNovoAdministrador() {

    const matricula =
        prompt(
            "Nova matrícula do administrador:"
        );

    if (!matricula) return;

    const senha =
        prompt(
            "Senha inicial:"
        );

    if (!senha) return;

    const nome =
        prompt(
            "Nome do administrador:"
        );

    if (!nome) return;

    const admins =
        JSON.parse(
            localStorage.getItem(
                "adminsPersonalizados"
            )
        ) || {};

    admins[matricula] = {
        senha,
        nome,
        perfil: "admin"
    };

    localStorage.setItem(
        "adminsPersonalizados",
        JSON.stringify(admins)
    );

    mostrarToast(
        "✅ Administrador criado."
    );
}

/* ==========================================================================
   🔄 CARREGA ADMINS CUSTOMIZADOS
   ========================================================================== */

(function carregarAdminsPersonalizados() {

    const admins =
        JSON.parse(
            localStorage.getItem(
                "adminsPersonalizados"
            )
        ) || {};

    Object.assign(
        USUARIOS_MUNICIPAIS,
        admins
    );

})();

/* ==========================================================================
   ⌨️ ENTER LOGIN
   ========================================================================== */

document.addEventListener(
    "keydown",
    function (e) {

        if (
            e.key === "Enter" &&
            document.getElementById(
                "loginScreen"
            ).style.display !== "none"
        ) {

            autenticarUsuario();
        }
    }
);

/* ==========================================================================
   🚀 AUTO VERIFICA SESSÃO
   ========================================================================== */

document.addEventListener(
    "DOMContentLoaded",
    verificarSessao
);
