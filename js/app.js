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

        if (typeof atualizarDashboardEstoque === 'function') {
            atualizarDashboardEstoque();
        }
    }

    // configurações
    if (view === 'config') {

        console.log('⚙️ Configurações & Carga aberta.');

        if (
            typeof listarUsuariosSistema === 'function'
        ) {
            listarUsuariosSistema();
        }
    }
}

// ======================================================
// LOGIN AUTOMÁTICO
// ======================================================

function verificarLoginSalvo() {

    const sessaoLocal =
        localStorage.getItem(
            "sintaxehub_usuario_logado"
        );

    if (!sessaoLocal) {

        document.getElementById("loginScreen")
            .style.display = "flex";

        document.getElementById("app")
            .style.display = "none";

        return;
    }

    const dados =
        JSON.parse(sessaoLocal);

    document.getElementById("loginScreen")
        .style.display = "none";

    document.getElementById("app")
        .style.display = "block";

    const nomeUsuario =
        document.getElementById(
            "nomeUsuarioLogado"
        );

    if (nomeUsuario) {

        nomeUsuario.innerText =
            "👤 " + (dados.nome || dados.usuario);
    }

    // permissões
    if (
        typeof aplicarPermissoesUsuario === 'function'
    ) {
        aplicarPermissoesUsuario();
    }

    // dashboard
    if (
        typeof atualizarIndicatorsDashboard === 'function'
    ) {
        atualizarIndicatorsDashboard();
    }

    // sininho
    if (
        typeof atualizarCentralAvisosSininho === 'function'
    ) {
        atualizarCentralAvisosSininho();
    }

    navigate('inicio');
}

// ======================================================
// LOGOUT
// ======================================================

async function efetuarLogout() {

    const confirmar = confirm(
        "Deseja realmente sair do sistema?"
    );

    if (!confirmar) {
        return;
    }

    try {

        // logout supabase
        if (
            typeof supabaseClient !== 'undefined' &&
            supabaseClient?.auth
        ) {
            await supabaseClient.auth.signOut();
        }

    } catch (erro) {

        console.warn(
            'Erro ao sair do Supabase:',
            erro
        );
    }

    // limpa sessões locais
    localStorage.removeItem(
        "usuarioLogado"
    );

    localStorage.removeItem(
        "sintaxehub_usuario_logado"
    );

    localStorage.removeItem(
        "pep_sessao_ativa"
    );

    // toast opcional
    if (typeof mostrarToast === 'function') {

        mostrarToast(
            "👋 Sessão encerrada."
        );
    }

    // reinicia
    location.reload();
}

// ======================================================
// DASHBOARD ESTOQUE
// ======================================================

function atualizarDashboardEstoque() {

    let banco =
        JSON.parse(
            localStorage.getItem(
                "solicitacoesMateriais"
            )
        ) || [];

    const pendentes =
        banco.filter(
            x => x.status === 'PENDENTE'
        ).length;

    const aprovadas =
        banco.filter(
            x => x.status === 'APROVADO'
        ).length;

    const entregues =
        banco.filter(
            x => x.status === 'ENTREGUE'
        ).length;

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
    () => {

        verificarLoginSalvo();

        console.log(
            "✅ SintaxeHub iniciado."
        );
    }
);
