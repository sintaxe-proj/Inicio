/* ==========================================================================
   🔐 LOGIN, SESSÃO E CONTROLE DE ACESSO
   ========================================================================== */

const USUARIOS_MUNICIPAIS = {
    "5132": { nome: "Enf. Josimar Kapps", perfil: "admin" },
    "123456": { nome: "Dr. Alexandre Silva", perfil: "user" }
};

function autenticarUsuario() {
    const matricula = document.getElementById("loginUser").value;
    const senha = document.getElementById("loginSenha").value;
    const erroDiv = document.getElementById("loginErro");

    if (USUARIOS_MUNICIPAIS[matricula] && senha === "senha123") {
        const user = USUARIOS_MUNICIPAIS[matricula];

        localStorage.setItem(
            "pep_sessao_ativa",
            JSON.stringify(user)
        );

        erroDiv.style.display = "none";

        verificarSessao();

        // Inicializações após login
        if (typeof inicializarAutocompleteCIAP === "function") {
            inicializarAutocompleteCIAP();
        }

        if (typeof atualizarIndicatorsDashboard === "function") {
            atualizarIndicatorsDashboard();
        }

        if (typeof atualizarCentralAvisosSininho === "function") {
            atualizarCentralAvisosSininho();
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

        document.getElementById(
            "nomeUsuarioLogado"
        ).innerText = `👤 ${user.nome}`;

        const seletorAcesso =
            document.getElementById("seletorNivelAcesso");

        const btnAuditoria =
            document.getElementById("btnAuditoria");

        if (user.perfil === "admin") {
            seletorAcesso.style.display = "inline-block";
            btnAuditoria.style.display = "inline-block";
        } else {
            seletorAcesso.style.display = "none";
            btnAuditoria.style.display = "none";
        }

        navigate("inicio");

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

    if (perfil === "admin") {
        btnAuditoria.style.display = "inline-block";

        mostrarToast(
            "🔄 Mudança para Perfil de Gestor/Coordenador."
        );

    } else {
        btnAuditoria.style.display = "none";

        if (
            document.getElementById("view-config")
            ?.style.display === "block"
        ) {
            navigate("inicio");
        }

        mostrarToast(
            "🔄 Mudança para Perfil Assistencial."
        );
    }
}

/* Inicialização automática */

document.addEventListener(
    "DOMContentLoaded",
    verificarSessao
);
});
