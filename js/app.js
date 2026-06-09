// ======================================================
// APP.JS — SINTAXEHUB
// Navegação + sessão + estoque Supabase + IA APS + Central de Prioridades + Linha do Tempo 4.0 + Torre APS 2.0
// ======================================================


// ======================================================
// NAVEGAÇÃO
// ======================================================

function navigate(view) {

    if (typeof atualizarTituloViewSintaxeHub === "function") {
        atualizarTituloViewSintaxeHub(view);
    }

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
        view === "inicio" &&
        typeof carregarDashboardInicialSintaxeHub === "function"
    ) {
        carregarDashboardInicialSintaxeHub();
    }

    if (
        view === "inicio" &&
        typeof carregarResumoTerritorioInteligente === "function"
    ) {
        carregarResumoTerritorioInteligente()
            .then(resumo => {
                console.log("🧠 Resumo Território Inteligente:", resumo);

                if (typeof setTextoApp === "function") {
                    setTextoApp("dashInicialCriticos", resumo?.criticos ?? 0);
                }
            })
            .catch(console.warn);
    }

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
        view === "central-prioridades-aps" &&
        typeof carregarCentralPrioridadesAPS === "function"
    ) {
        carregarCentralPrioridadesAPS();
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
        const cpfLinhaTempo =
            document.getElementById("linhaTempoCPF")?.value ||
            document.getElementById("cpfPaciente")?.value ||
            window.pacienteAtual?.cpf ||
            window.pacienteSelecionado?.cpf ||
            "";

        const cnsLinhaTempo =
            document.getElementById("linhaTempoCNS")?.value ||
            document.getElementById("cnsPaciente")?.value ||
            window.pacienteAtual?.cns ||
            window.pacienteSelecionado?.cns ||
            "";

        const buscaLivreLinhaTempo =
            document.getElementById("buscaLinhaTempoTerritorial")?.value || "";

        if (
            cpfLinhaTempo ||
            cnsLinhaTempo ||
            buscaLivreLinhaTempo
        ) {
            carregarLinhaTempoTerritorialAPS(
                cpfLinhaTempo,
                cnsLinhaTempo
            );
        }
    }

    if (
        view === "torre-controle-aps" &&
        typeof carregarTorreControleAPS === "function"
    ) {
        Promise
            .resolve(carregarTorreControleAPS())
            .then(() => {
                if (typeof atualizarResumoTorreDashboardInicial === "function") {
                    atualizarResumoTorreDashboardInicial();
                }
            })
            .catch(console.warn);
    }


    if (
        view === "sala-situacao-aps" &&
        typeof carregarSalaSituacaoAPS === "function"
    ) {
        carregarSalaSituacaoAPS();
    }


    if (
        view === "motor-predicao-aps" &&
        typeof carregarMotorPredicaoAPS === "function"
    ) {
        Promise
            .resolve(carregarMotorPredicaoAPS())
            .then(() => {
                if (typeof atualizarResumoIADashboardInicial === "function") {
                    atualizarResumoIADashboardInicial();
                }
            })
            .catch(console.warn);
    }


    if (view === "config") {

        console.log("⚙️ Configurações & Carga aberta.");

        if (typeof listarUsuariosSistema === "function") {
            listarUsuariosSistema();
        }
    }
}





// ======================================================
// LINHA DO TEMPO TERRITORIAL 4.0 — ATALHO DO PACIENTE ATUAL
// ======================================================

function abrirLinhaTempoPacienteAtualApp() {
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
        typeof abrirLinhaTempoTerritorial === "function"
    ) {
        abrirLinhaTempoTerritorial(cpf, cns);
        return;
    }

    if (
        typeof navigate === "function"
    ) {
        navigate("linha-tempo-territorial");
    }
}

// ======================================================
// IA APS — RESUMO NO DASHBOARD INICIAL
// ======================================================

function atualizarResumoIADashboardInicial() {
    const recomendacoesBox =
        document.getElementById("dashInicialRecomendacoesIA");

    const gemeoBox =
        document.getElementById("dashInicialGemeoDigital");

    const motor =
        window.motorPredicaoAPSAtual || {};

    if (
        recomendacoesBox &&
        Array.isArray(motor.recomendacoes) &&
        motor.recomendacoes.length
    ) {
        recomendacoesBox.innerHTML =
            `<div class="dashboard-list">
                ${motor.recomendacoes.slice(0, 4).map(r => `
                    <div class="dashboard-list-item">
                        <div>
                            <strong>${r.icone || "🧠"} ${r.titulo || "Recomendação APS"}</strong>
                            <small>${r.acao || r.justificativa || ""}</small>
                        </div>
                        <span class="status-badge status-warning">${r.impacto || "IA"}</span>
                    </div>
                `).join("")}
            </div>`;
    }

    if (
        gemeoBox &&
        Array.isArray(motor.territorios) &&
        motor.territorios.length
    ) {
        gemeoBox.innerHTML =
            `<div class="dashboard-list">
                ${motor.territorios.slice(0, 4).map(t => `
                    <div class="dashboard-list-item">
                        <div>
                            <strong>${t.status || "🌎"} ${t.territorio || "Território"}</strong>
                            <small>Pressão assistencial: ${t.pressaoAssistencial || 0}</small>
                        </div>
                        <span class="status-badge status-info">${t.altoRisco || 0} alto risco</span>
                    </div>
                `).join("")}
            </div>`;
    }
}


// ======================================================
// TORRE APS 2.0 — RESUMO NO DASHBOARD INICIAL
// ======================================================

function atualizarResumoTorreDashboardInicial() {
    const torre =
        window.torreControleAPSAtual || {};

    const base =
        Array.isArray(torre.base)
            ? torre.base
            : [];

    if (!base.length) {
        return;
    }

    const criticos =
        base.filter(p =>
            Number(p.score_ia || 0) >= 80 ||
            p.prioridade_ia === "Crítica" ||
            Number(p.predicao?.score || 0) >= 10 ||
            Number(p.prazo) === 0
        ).length;

    const pendencias =
        base.reduce(
            (total, p) => total + (p.pendencias?.length || 0),
            0
        );

    if (typeof setTextoApp === "function") {
        setTextoApp("dashInicialCriticos", criticos);
        setTextoApp("dashInicialPendentes", pendencias);
    }

    const recomendacoesBox =
        document.getElementById("dashInicialRecomendacoesIA");

    if (
        recomendacoesBox &&
        Array.isArray(torre.recomendacoesIA) &&
        torre.recomendacoesIA.length
    ) {
        recomendacoesBox.innerHTML =
            `<div class="dashboard-list">
                ${torre.recomendacoesIA.slice(0, 4).map(r => `
                    <div class="dashboard-list-item">
                        <div>
                            <strong>${r.icone || "🏢"} ${r.titulo || "Recomendação da Torre APS"}</strong>
                            <small>${r.acao || r.justificativa || ""}</small>
                        </div>
                        <span class="status-badge status-warning">${r.impacto || "Torre APS"}</span>
                    </div>
                `).join("")}
            </div>`;
    }
}

function abrirTorreControleAPSApp() {
    if (typeof navigate === "function") {
        navigate("torre-controle-aps");
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

    if (
        typeof carregarDashboardInicialSintaxeHub === "function"
    ) {
        carregarDashboardInicialSintaxeHub();
    }

    if (
        typeof carregarResumoTerritorioInteligente === "function"
    ) {
        carregarResumoTerritorioInteligente()
            .then(resumo => {
                console.log("🧠 Território Inteligente pronto:", resumo?.total || 0);
            })
            .catch(console.warn);
    }

    if (
        typeof atualizarResumoTorreDashboardInicial === "function"
    ) {
        atualizarResumoTorreDashboardInicial();
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
window.atualizarResumoIADashboardInicial = atualizarResumoIADashboardInicial;
window.abrirLinhaTempoPacienteAtualApp = abrirLinhaTempoPacienteAtualApp;
window.atualizarResumoTorreDashboardInicial = atualizarResumoTorreDashboardInicial;
window.abrirTorreControleAPSApp = abrirTorreControleAPSApp;
