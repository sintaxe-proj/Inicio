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

    const matricula =
        document.getElementById("loginUser").value;

    const senha =
        document.getElementById("loginSenha").value;

    const erroDiv =
        document.getElementById("loginErro");

    if (
        USUARIOS_MUNICIPAIS[matricula] &&
        senha === "senha123"
    ) {

        const user =
            USUARIOS_MUNICIPAIS[matricula];

        localStorage.setItem(
            "pep_sessao_ativa",
            JSON.stringify(user)
        );

        erroDiv.style.display = "none";

        verificarSessao();

    } else {

        erroDiv.innerText =
            "Matrícula ou senha inválida.";

        erroDiv.style.display = "block";
    }
}

function verificarSessao() {

    const sessao =
        localStorage.getItem("pep_sessao_ativa");

    if (sessao) {

        const user = JSON.parse(sessao);

        document.getElementById(
            "loginScreen"
        ).style.display = "none";

        document.getElementById(
            "app"
        ).style.display = "block";

        const nomeUsuario =
            document.getElementById(
                "nomeUsuarioLogado"
            );

        if (nomeUsuario) {
            nomeUsuario.innerText =
                `👤 ${user.nome}`;
        }

        if (typeof navigate === "function") {
            navigate("inicio");
        }

    } else {

        document.getElementById(
            "loginScreen"
        ).style.display = "flex";

        document.getElementById(
            "app"
        ).style.display = "none";
    }
}

function efetuarLogout() {

    localStorage.removeItem(
        "pep_sessao_ativa"
    );

    window.location.reload();
}
