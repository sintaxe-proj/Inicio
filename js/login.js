/* ==========================================================================
   🔐 LOGIN, SESSÃO E CONTROLE DE ACESSO
   ========================================================================== */

const USUARIOS_MUNICIPAIS = {
    "5132": {
        nome: "Enf. Josimar Kapps",
        perfil: "admin"
    },
    "123456": {
        nome: "Dr. Alexandre Silva",
        perfil: "user"
    }
};

function autenticarUsuario() {
    const matricula = document.getElementById("loginUser").value.trim();
    const senha = document.getElementById("loginSenha").value.trim();
    const erroDiv = document.getElementById("loginErro");

    if (USUARIOS_MUNICIPAIS[matricula] && senha === "senha123") {
        const user = USUARIOS_MUNICIPAIS[matricula];

        localStorage.setItem(
            "pep_sessao_ativa",
            JSON.stringify(user)
        );

        erroDiv.style.display = "none";

        verificarSessao();

        if (typeof inicializarAutocompleteCIAP === "function") {
            inicializarAutocompleteCIAP();
        }

        if (typeof atualizarIndicatorsDashboard === "function") {
            atualizarIndicatorsDashboard();
        }

        if (typeof atualizarCentralAvisosSininho === "function") {
            atualizarCentralAvisosSininho();
        }

        if (typeof listarTodosBanco === "function") {
            listarTodosBanco();
        }

    } else {
        erroDiv.innerText =
            "Matrícula ou senha inválida no cadastro municipal.";
        erroDiv.style.display = "block";
    }
}

function verificarSessao() {
    const sessao = localStorage.getItem("pep_sessao_ativa");

    if (sessao) {
        const user = JSON.parse(sessao);

        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("app").style.display = "block";

        const nomeUsuario =
            document.getElementById("nomeUsuarioLogado");

        if (nomeUsuario) {
            nomeUsuario.innerText = `👤 ${user.nome}`;
        }

        const seletorAcesso =
            document.getElementById("seletorNivelAcesso");

        const btnAuditoria =
            document.getElementById("btnAuditoria");

        if (seletorAcesso && btnAuditoria) {
            if (user.perfil === "admin") {
                seletorAcesso.style.display = "inline-block";
                btnAuditoria.style.display = "inline-block";
            } else {
                seletorAcesso.style.display = "none";
                btnAuditoria.style.display = "none";
            }
        }

        if (typeof navigate === "function") {
            navigate("inicio");
        }

    } else {
        document.getElementById("loginScreen").style.display = "flex";
        document.getElementById("app").style.display = "none";
    }
}

function efetuarLogout() {
    localStorage.removeItem("pep_sessao_ativa");
    window.location.reload();
}

function BowserSessao() {
    efetuarLogout();
}

function alternarVisaoGestor(perfil) {
    const btnAuditoria =
        document.getElementById("btnAuditoria");

    if (!btnAuditoria) return;

    if (perfil === "admin") {
        btnAuditoria.style.display = "inline-block";

        if (typeof mostrarToast === "function") {
            mostrarToast("🔄 Mudança para Perfil de Gestor/Coordenador.");
        }

    } else {
        btnAuditoria.style.display = "none";

        const viewConfig =
            document.getElementById("view-config");

        if (
            viewConfig &&
            viewConfig.style.display === "block" &&
            typeof navigate === "function"
        ) {
            navigate("inicio");
        }

        if (typeof mostrarToast === "function") {
            mostrarToast("🔄 Mudança para Perfil Assistencial.");
        }
    }
}
