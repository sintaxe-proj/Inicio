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

    if (
        view === "auditoria-estoque" &&
        typeof carregarAuditoriaEstoque === "function"
    ) {
        carregarAuditoriaEstoque();
    }

    if (
        view === "mapa-territorial" &&
        typeof carregarMapaTerritorialAPS === "function"
    ) {
        carregarMapaTerritorialAPS();
    }

    if (
        view === "central-aps" &&
        typeof carregarCentralAPS === "function"
    ) {
        carregarCentralAPS();
    }

    if (
        view === "relatorios" &&
        typeof carregarRelatorioAPS === "function"
    ) {
        carregarRelatorioAPS();
    }

    if (
        view === "georreferenciamento" &&
        typeof carregarGeorreferenciamentoAPS === "function"
    ) {
        carregarGeorreferenciamentoAPS();
    }

    if (
        view === "gestor-executivo" &&
        typeof carregarPainelGestorExecutivo === "function"
    ) {
        carregarPainelGestorExecutivo();
    }

    if (
        view === "pendencias-clinicas" &&
        typeof carregarPendenciasClinicasAPS === "function"
    ) {
        carregarPendenciasClinicasAPS();
    }

    if (
        view === "linha-tempo-territorial" &&
        typeof carregarLinhaTempoTerritorialAPS === "function"
    ) {
        carregarLinhaTempoTerritorialAPS();
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

    const { data: solicitacoes, error: erroSolicitacoes } =
        await supabaseClient
            .from("solicitacoes_materiais")
            .select("status");

    if (erroSolicitacoes) {
        console.error("Erro ao buscar solicitações:", erroSolicitacoes);
        return;
    }

    const bancoSolicitacoes =
        solicitacoes || [];

    const pendentes =
        bancoSolicitacoes.filter(x => x.status === "PENDENTE").length;

    const aprovadas =
        bancoSolicitacoes.filter(x =>
            x.status === "APROVADO" ||
            x.status === "AUTORIZADO"
        ).length;

    const entregues =
        bancoSolicitacoes.filter(x =>
            x.status === "ENTREGUE"
        ).length;

    const negadas =
        bancoSolicitacoes.filter(x =>
            x.status === "NEGADO"
        ).length;

    setTextoApp("dashSolicitacoesPendentes", pendentes);
    setTextoApp("dashSolicitacoesAprovadas", aprovadas);
    setTextoApp("dashSolicitacoesEntregues", entregues);
    setTextoApp("dashSolicitacoesNegadas", negadas);

    // Cards inteligentes de estoque, se existirem no HTML.
    const cardsEstoqueInteligente =
        document.getElementById("dashItensEstoque") ||
        document.getElementById("dashEstoqueBaixo") ||
        document.getElementById("dashItensVencidos") ||
        document.getElementById("dashItensVencem30");

    if (!cardsEstoqueInteligente) {
        return;
    }

    const { data: estoque, error: erroEstoque } =
        await supabaseClient
            .from("estoque_itens")
            .select(`
                id,
                quantidade_atual,
                quantidade_minima,
                data_validade,
                status
            `);

    if (erroEstoque) {
        console.warn("Erro ao buscar estoque:", erroEstoque);
        return;
    }

    const bancoEstoque =
        estoque || [];

    const itensAtivos =
        bancoEstoque.filter(x =>
            (x.status || "ATIVO") === "ATIVO"
        ).length;

    const estoqueBaixo =
        bancoEstoque.filter(x =>
            Number(x.quantidade_atual || 0) <=
            Number(x.quantidade_minima || 0)
        ).length;

    const vencidos =
        bancoEstoque.filter(x =>
            calcularStatusValidadeApp(x.data_validade) === "VENCIDO"
        ).length;

    const vencem30 =
        bancoEstoque.filter(x =>
            calcularStatusValidadeApp(x.data_validade) === "VENCE_30"
        ).length;

    setTextoApp("dashItensEstoque", itensAtivos);
    setTextoApp("dashEstoqueBaixo", estoqueBaixo);
    setTextoApp("dashItensVencidos", vencidos);
    setTextoApp("dashItensVencem30", vencem30);
}



function setTextoApp(id, valor) {
    const el =
        document.getElementById(id);

    if (el) {
        el.innerText =
            valor;
    }
}

function calcularStatusValidadeApp(dataValidade) {
    if (!dataValidade) {
        return "SEM_VALIDADE";
    }

    const hoje =
        new Date();

    hoje.setHours(0, 0, 0, 0);

    const validade =
        new Date(dataValidade);

    validade.setHours(0, 0, 0, 0);

    const diffDias =
        Math.ceil(
            (validade.getTime() - hoje.getTime()) /
            (1000 * 60 * 60 * 24)
        );

    if (diffDias < 0) {
        return "VENCIDO";
    }

    if (diffDias <= 30) {
        return "VENCE_30";
    }

    return "VALIDO";
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
window.setTextoApp = setTextoApp;
window.calcularStatusValidadeApp = calcularStatusValidadeApp;
