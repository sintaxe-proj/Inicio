// ======================================================
// APP.JS — SINTAXEHUB
// Navegação + sessão + estoque Supabase + inicialização
// ======================================================


// ======================================================
// NAVEGAÇÃO
// ======================================================

function navigate(view) {

    if (
        typeof podeAcessar === "function" &&
        !podeAcessar(view)
    ) {
        alert("Você não possui permissão para acessar esta área.");
        return;
    }

    document.querySelectorAll(".view").forEach(v => {
        v.style.display = "none";
    });

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.remove("active");
    });

    const tela = document.getElementById("view-" + view);

    if (!tela) {
        console.error("Tela não encontrada:", "view-" + view);
        return;
    }

    tela.style.display = "block";

    const menu = Array.from(
        document.querySelectorAll(".nav-link")
    ).find(link =>
        link.getAttribute("onclick")?.includes(`'${view}'`) ||
        link.getAttribute("onclick")?.includes(`"${view}"`) ||
        link.getAttribute("data-view") === view
    );

    if (menu) {
        menu.classList.add("active");
    }

    // ==================================================
    // MÓDULOS POR VIEW
    // ==================================================

    if (
        view === "banco" &&
        typeof carregarTabelaBanco === "function"
    ) {
        carregarTabelaBanco();

        if (
            typeof aplicarFiltrosBaseTerritorial === "function"
        ) {
            setTimeout(
                aplicarFiltrosBaseTerritorial,
                500
            );
        }
    }

    if (
        view === "reuniao" &&
        typeof abrirModuloReuniao === "function"
    ) {
        abrirModuloReuniao();
    }

    if (view === "prontuario") {

        if (typeof carregarDatalistCIAP === "function") {
            carregarDatalistCIAP();
        }

        const cpf =
            document.getElementById("cpfPaciente")?.value ||
            window.pacienteAtual?.cpf ||
            window.pacienteSelecionado?.cpf ||
            "";

        const cns =
            document.getElementById("cnsPaciente")?.value ||
            window.pacienteAtual?.cns ||
            window.pacienteSelecionado?.cns ||
            "";

        if (
            (cpf || cns) &&
            typeof carregarHistoricoClinicoPaciente === "function"
        ) {
            carregarHistoricoClinicoPaciente(cpf, cns);
        }
    }

    if (
        view === "estoque" &&
        typeof carregarHistoricoSolicitacoes === "function"
    ) {
        carregarHistoricoSolicitacoes();

        if (typeof atualizarDashboardEstoque === "function") {
            atualizarDashboardEstoque();
        }
    }

    if (view === "config") {

        console.log("⚙️ Configurações & Carga aberta.");

        if (typeof listarUsuariosSistema === "function") {
            listarUsuariosSistema();
        }
    }
}


// ======================================================
// LOGIN AUTOMÁTICO / RESTAURAÇÃO DE SESSÃO
// ======================================================

async function verificarLoginSalvo() {

    const loginScreen =
        document.getElementById("loginScreen");

    const app =
        document.getElementById("app");

    try {

        // 1. Confere sessão Supabase real
        if (
            typeof supabaseClient !== "undefined" &&
            supabaseClient?.auth
        ) {
            const { data, error } =
                await supabaseClient.auth.getSession();

            if (
                !error &&
                data?.session?.user
            ) {
                if (loginScreen) {
                    loginScreen.style.display = "none";
                }

                if (app) {
                    app.style.display = "block";
                }

                if (
                    typeof buscarPerfilUsuarioLogado === "function"
                ) {
                    await buscarPerfilUsuarioLogado();
                }

                if (
                    typeof aplicarPermissoesUsuario === "function"
                ) {
                    aplicarPermissoesUsuario();
                }

                atualizarDadosIniciais();

                navigate("inicio");

                console.log("✅ Sessão Supabase restaurada.");
                return;
            }
        }

        // 2. Fallback: sessão local antiga
        const sessaoLocal =
            localStorage.getItem("sintaxehub_usuario_logado");

        if (sessaoLocal) {
            const dados = JSON.parse(sessaoLocal);

            if (loginScreen) {
                loginScreen.style.display = "none";
            }

            if (app) {
                app.style.display = "block";
            }

            const nomeUsuario =
                document.getElementById("nomeUsuarioLogado");

            if (nomeUsuario) {
                nomeUsuario.innerText =
                    "👤 " + (dados.nome || dados.usuario || dados.email || "Usuário");
            }

            if (
                typeof aplicarPermissoesUsuario === "function"
            ) {
                aplicarPermissoesUsuario();
            }

            atualizarDadosIniciais();

            navigate("inicio");

            console.log("✅ Sessão local restaurada.");
            return;
        }

    } catch (erro) {
        console.warn("Erro ao restaurar sessão:", erro);
    }

    // 3. Sem sessão
    if (loginScreen) {
        loginScreen.style.display = "flex";
    }

    if (app) {
        app.style.display = "none";
    }
}


// ======================================================
// ATUALIZAÇÕES INICIAIS
// ======================================================

function atualizarDadosIniciais() {

    if (
        typeof atualizarIndicatorsDashboard === "function"
    ) {
        atualizarIndicatorsDashboard();
    }

    if (
        typeof atualizarCentralAvisosSininho === "function"
    ) {
        atualizarCentralAvisosSininho();
    }

    if (
        typeof atualizarDashboardEstoque === "function"
    ) {
        atualizarDashboardEstoque();
    }
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
        if (
            typeof supabaseClient !== "undefined" &&
            supabaseClient?.auth
        ) {
            await supabaseClient.auth.signOut();
        }
    } catch (erro) {
        console.warn(
            "Erro ao sair do Supabase:",
            erro
        );
    }

    localStorage.removeItem("usuarioLogado");
    localStorage.removeItem("sintaxehub_usuario_logado");
    localStorage.removeItem("pep_sessao_ativa");

    if (typeof mostrarToast === "function") {
        mostrarToast("👋 Sessão encerrada.");
    }

    location.reload();
}


// ======================================================
// DASHBOARD ESTOQUE SUPABASE
// ======================================================

async function atualizarDashboardEstoque() {

    if (typeof supabaseClient === "undefined") {
        console.warn("Supabase não carregado para estoque.");
        return;
    }

    const { data, error } = await supabaseClient
        .from("solicitacoes_materiais")
        .select("status");

    if (error) {
        console.error("Erro ao buscar solicitações:", error);
        return;
    }

    const banco = data || [];

    const pendentes =
        banco.filter(x => x.status === "PENDENTE").length;

    const aprovadas =
        banco.filter(x =>
            x.status === "APROVADO" ||
            x.status === "AUTORIZADO"
        ).length;

    const entregues =
        banco.filter(x =>
            x.status === "ENTREGUE"
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

    if (dashPend) dashPend.innerText = pendentes;
    if (dashAprov) dashAprov.innerText = aprovadas;
    if (dashEntr) dashEntr.innerText = entregues;
}


// ======================================================
// UTILITÁRIOS DE VISIBILIDADE
// ======================================================

function atualizarVisibilidadeDiscadorApp() {
    const app =
        document.getElementById("app");

    const botao =
        document.querySelector(".btn-flutuante-discador");

    const painel =
        document.getElementById("painelDiscagemContainer");

    const appVisivel =
        app && app.style.display !== "none";

    if (botao) {
        botao.style.display = appVisivel ? "flex" : "none";
    }

    if (!appVisivel && painel) {
        painel.style.display = "none";
    }
}


// ======================================================
// START APP
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    verificarLoginSalvo();

    atualizarVisibilidadeDiscadorApp();

    const app =
        document.getElementById("app");

    if (app) {
        const observer =
            new MutationObserver(
                atualizarVisibilidadeDiscadorApp
            );

        observer.observe(
            app,
            {
                attributes: true,
                attributeFilter: ["style"]
            }
        );
    }

    setInterval(
        atualizarVisibilidadeDiscadorApp,
        500
    );

    console.log("✅ SintaxeHub iniciado.");
});


// ======================================================
// GLOBAL
// ======================================================

window.navigate = navigate;
window.verificarLoginSalvo = verificarLoginSalvo;
window.efetuarLogout = efetuarLogout;
window.atualizarDashboardEstoque = atualizarDashboardEstoque;
window.atualizarDadosIniciais = atualizarDadosIniciais;
window.atualizarVisibilidadeDiscadorApp = atualizarVisibilidadeDiscadorApp;
