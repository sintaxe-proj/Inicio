// ======================================================
// NAVEGAÇÃO
// ======================================================

function navigate(view) {

    // verifica permissões
    if (
        typeof podeAcessar === 'function' &&
        !podeAcessar(view)
    ) {
        alert('Você não possui permissão para acessar esta área.');
        return;
    }

    // esconde views
    document.querySelectorAll('.view').forEach(v => {
        v.style.display = 'none';
    });

    // remove menu ativo
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // localiza view
    const tela = document.getElementById('view-' + view);

    if (!tela) {
        console.error('Tela não encontrada:', 'view-' + view);
        return;
    }

    // mostra view
    tela.style.display = 'block';

    // ativa menu
    const menu = Array.from(
        document.querySelectorAll('.nav-link')
    ).find(link =>
        link.getAttribute('onclick')?.includes(view)
    );

    if (menu) {
        menu.classList.add('active');
    }

    // ==================================================
    // MÓDULOS
    // ==================================================

    // banco territorial
    if (
        view === 'banco' &&
        typeof carregarTabelaBanco === 'function'
    ) {
        carregarTabelaBanco();
    }

    // reunião
    if (
        view === 'reuniao' &&
        typeof abrirModuloReuniao === 'function'
    ) {
        abrirModuloReuniao();
    }

    // prontuário
    if (
        view === 'prontuario' &&
        typeof carregarDatalistCIAP === 'function'
    ) {
        carregarDatalistCIAP();
    }

    // estoque
    if (
        view === 'estoque' &&
        typeof carregarHistoricoSolicitacoes === 'function'
    ) {
        carregarHistoricoSolicitacoes();

        atualizarDashboardEstoque();
    }

    // configurações
    if (view === 'config') {

        console.log('Configurações & Carga aberta.');

        if (
            typeof listarUsuariosSistema === 'function'
        ) {
            listarUsuariosSistema();
        }
    }
}

// ======================================================
// LOGIN
// ======================================================

function autenticarUsuario() {

    const usuario =
        document.getElementById("loginUser")
        .value
        .trim();

    const senha =
        document.getElementById("loginSenha")
        .value
        .trim();

    const erro =
        document.getElementById("loginErro");

    if (!usuario || !senha) {

        erro.style.display = "block";

        erro.innerText =
            "Informe usuário e senha.";

        return;
    }

    // salva sessão
    localStorage.setItem(
        "usuarioLogado",
        JSON.stringify({
            usuario: usuario,
            nome: usuario,
            nivel: "admin",
            logadoEm: new Date().toISOString()
        })
    );

    // esconde login
    document.getElementById("loginScreen")
        .style.display = "none";

    // mostra sistema
    document.getElementById("app")
        .style.display = "block";

    // nome usuário
    const nomeUsuario =
        document.getElementById("nomeUsuarioLogado");

    if (nomeUsuario) {

        nomeUsuario.innerText =
            "Usuário: " + usuario;
    }

    // abre tela inicial
    navigate('inicio');
}

// ======================================================
// VERIFICAR LOGIN
// ======================================================

function verificarLoginSalvo() {

    const sessao =
        localStorage.getItem("usuarioLogado");

    if (sessao) {

        const dados =
            JSON.parse(sessao);

        document.getElementById("loginScreen")
            .style.display = "none";

        document.getElementById("app")
            .style.display = "block";

        const nomeUsuario =
            document.getElementById("nomeUsuarioLogado");

        if (nomeUsuario) {

            nomeUsuario.innerText =
                "Usuário: " + dados.usuario;
        }

        navigate('inicio');

    } else {

        document.getElementById("loginScreen")
            .style.display = "flex";

        document.getElementById("app")
            .style.display = "none";
    }
}

// ======================================================
// LOGOUT
// ======================================================

async function efetuarLogout() {

    if (
        !confirm(
            "Deseja realmente sair do sistema?"
        )
    ) {
        return;
    }

    await supabaseClient.auth.signOut();

    localStorage.removeItem(
        "pep_sessao_ativa"
    );

    mostrarToast(
        "👋 Sessão encerrada."
    );

    location.reload();
}

// ======================================================
// DASHBOARD ESTOQUE
// ======================================================

function atualizarDashboardEstoque() {

    let banco =
        JSON.parse(
            localStorage.getItem("solicitacoesMateriais")
        ) || [];

    const pendentes =
        banco.filter(x => x.status === 'PENDENTE').length;

    const aprovadas =
        banco.filter(x => x.status === 'APROVADO').length;

    const entregues =
        banco.filter(x => x.status === 'ENTREGUE').length;

    const dashPend =
        document.getElementById(
            "dashSolicitacoesPendentes"
        );

    const dashAprov =
        document.getElementById(
            "dashSolicitacoesAprovadas"
        );

    const dashEntr =
        document.getElementById(
            "dashSolicitacoesEntregues"
        );

    if (dashPend) {
        dashPend.innerText = pendentes;
    }

    if (dashAprov) {
        dashAprov.innerText = aprovadas;
    }

    if (dashEntr) {
        dashEntr.innerText = entregues;
    }
}

// ======================================================
// START APP
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    verificarLoginSalvo
);
