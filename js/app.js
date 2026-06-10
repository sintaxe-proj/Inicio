// ======================================================
// APP.JS — SINTAXEHUB
// Navegação + sessão + estoque Supabase + IA APS + Central de Prioridades + Linha do Tempo 4.0 + Torre APS 2.0 + Visita Domiciliar APS + Agenda Inteligente APS + Motor Cognitivo APS + Central de Operações APS 4.0 + Motor de Regras APS
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
        Promise
            .resolve(carregarTabelaBanco())
            .then(() => {
                if (
                    typeof aplicarFiltrosBaseTerritorial === "function"
                ) {
                    aplicarFiltrosBaseTerritorial();
                }
            })
            .catch(console.warn);
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

        if (typeof carregarDatalistCIPE === "function") {
            carregarDatalistCIPE();
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

        if (
            (cpf || cns) &&
            typeof carregarLinhaVidaTerritorialPaciente === "function"
        ) {
            carregarLinhaVidaTerritorialPaciente(cpf, cns);
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

    if (view === "central-aps") {
        if (typeof carregarCentralAPS === "function") {
            Promise
                .resolve(carregarCentralAPS())
                .catch(console.warn);
        } else if (typeof carregarTabelaBanco === "function") {
            console.warn("carregarCentralAPS ausente; usando Base Territorial Operacional como fallback.");
            Promise
                .resolve(carregarTabelaBanco())
                .then(() => {
                    if (typeof aplicarFiltrosBaseTerritorial === "function") {
                        aplicarFiltrosBaseTerritorial();
                    }
                })
                .catch(console.warn);
        }
    }


    if (
        view === "central-operacoes-aps" &&
        typeof carregarCentralOperacoesAPS === "function"
    ) {
        Promise
            .resolve(carregarCentralOperacoesAPS())
            .then(() => {
                if (typeof atualizarResumoCentralOperacoesDashboardInicial === "function") {
                    atualizarResumoCentralOperacoesDashboardInicial();
                }
            })
            .catch(console.warn);
    }



    if (
        view === "motor-regras-aps" &&
        typeof executarMotorRegrasAPS === "function"
    ) {
        Promise
            .resolve(executarMotorRegrasAPS())
            .then(() => {
                if (typeof atualizarResumoMotorRegrasDashboardInicial === "function") {
                    atualizarResumoMotorRegrasDashboardInicial();
                }

                if (typeof atualizarResumoAgendaDashboardInicial === "function") {
                    atualizarResumoAgendaDashboardInicial();
                }
            })
            .catch(console.warn);
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
        view === "visita-domiciliar-aps" &&
        typeof alternarTipoVisitaDomiciliarAPS === "function"
    ) {
        alternarTipoVisitaDomiciliarAPS();

        if (
            typeof carregarHistoricoVisitasDomiciliaresAPS === "function"
        ) {
            carregarHistoricoVisitasDomiciliaresAPS();
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
        (view === "agenda-inteligente-aps" || view === "agenda-aps") &&
        typeof carregarAgendaInteligenteAPS === "function"
    ) {
        Promise
            .resolve(carregarAgendaInteligenteAPS())
            .then(() => {
                if (typeof atualizarResumoAgendaDashboardInicial === "function") {
                    atualizarResumoAgendaDashboardInicial();
                }
            })
            .catch(console.warn);
    }


    if (
        view === "sala-situacao-aps" &&
        typeof carregarSalaSituacaoAPS === "function"
    ) {
        Promise
            .resolve(carregarSalaSituacaoAPS())
            .then(() => {
                if (typeof atualizarResumoSalaSituacaoDashboardInicial === "function") {
                    atualizarResumoSalaSituacaoDashboardInicial();
                }
            })
            .catch(console.warn);
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


    if (
        (view === "motor-cognitivo-aps" || view === "cognitivo-aps") &&
        typeof carregarMotorCognitivoAPS === "function"
    ) {
        Promise
            .resolve(carregarMotorCognitivoAPS())
            .then(() => {
                if (typeof atualizarResumoMotorCognitivoDashboardInicial === "function") {
                    atualizarResumoMotorCognitivoDashboardInicial();
                }

                if (typeof renderizarMotorCognitivoAPS === "function") {
                    renderizarMotorCognitivoAPS();
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
// BASE TERRITORIAL OPERACIONAL — ATALHOS DE FILA
// ======================================================

function abrirBaseTerritorialOperacionalApp(fila = "TODOS") {
    if (typeof navigate === "function") {
        navigate("banco");
    }

    setTimeout(() => {
        const filtro =
            document.getElementById("filtroFilaOperacionalAPS");

        if (filtro) {
            filtro.value =
                fila || "TODOS";
        }

        if (typeof aplicarFiltrosBaseTerritorial === "function") {
            aplicarFiltrosBaseTerritorial();
        }
    }, 450);
}

function abrirCentralOperacionalUnificadaApp(fila = "CRITICOS") {
    abrirBaseTerritorialOperacionalApp(fila);
}


// ======================================================
// LINHA DO TEMPO TERRITORIAL 4.0 — ATALHO DO PACIENTE ATUAL
// ======================================================

function abrirLinhaTempoPacienteAtualApp() {
    // Linha da Vida agora faz parte do prontuário
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
        typeof carregarLinhaVidaTerritorialPaciente === "function"
    ) {
        carregarLinhaVidaTerritorialPaciente(cpf, cns);
        return;
    }

    if (
        typeof abrirLinhaTempoTerritorial === "function"
    ) {
        abrirLinhaTempoTerritorial(cpf, cns);
    }
}


// ======================================================
// VISITA DOMICILIAR APS — ATALHO DO PACIENTE ATUAL
// ======================================================

function abrirVisitaDomiciliarPacienteAtualApp(modo = "ACS") {
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
        typeof abrirModuloVisitaDomiciliarAPS === "function"
    ) {
        abrirModuloVisitaDomiciliarAPS(cpf, cns, modo);
        return;
    }

    if (
        typeof navigate === "function"
    ) {
        navigate("visita-domiciliar-aps");
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
            Number(p.score_territorial_global || p.score_ia || 0) >= 85 ||
            p.nivel_prioridade === "CRITICO" ||
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
// AGENDA INTELIGENTE APS — RESUMO NO DASHBOARD INICIAL
// ======================================================

async function atualizarResumoAgendaDashboardInicial() {
    const hoje =
        new Date().toISOString().slice(0, 10);

    let agenda = [];

    const estadoAgenda =
        window.agendaInteligenteAPSAtual || {};

    if (Array.isArray(estadoAgenda.agenda)) {
        agenda = estadoAgenda.agenda;
    } else if (Array.isArray(estadoAgenda.lista)) {
        agenda = estadoAgenda.lista;
    } else if (Array.isArray(estadoAgenda.itens)) {
        agenda = estadoAgenda.itens;
    }

    if (
        !agenda.length &&
        typeof supabaseClient !== "undefined"
    ) {
        try {
            const { data, error } =
                await supabaseClient
                    .from("agenda_aps")
                    .select("*")
                    .eq("data_sugerida", hoje)
                    .order("prioridade", { ascending: true })
                    .limit(5000);

            if (!error) {
                agenda = data || [];
            }
        } catch (erro) {
            console.warn("Não foi possível carregar resumo da Agenda APS:", erro);
        }
    }

    const normalizar =
        typeof normalizarTorreAPS === "function"
            ? normalizarTorreAPS
            : (valor) => String(valor || "")
                .toLowerCase()
                .normalize("NFD")
                .replace(/[̀-ͯ]/g, "")
                .trim();

    const porTipo = (tipo) =>
        agenda.filter(item =>
            normalizar(item.tipo) === normalizar(tipo)
        ).length;

    const criticos =
        agenda.filter(item =>
            normalizar(item.prioridade).includes("crit") ||
            Number(item.score_territorial_global || 0) >= 85
        ).length;

    const buscaAtiva =
        porTipo("BUSCA_ATIVA") +
        porTipo("Busca ativa");

    const visitas =
        porTipo("VISITA_DOMICILIAR") +
        porTipo("Visita domiciliar");

    const consultas =
        porTipo("CONSULTA") +
        porTipo("Consulta");

    const gestantes =
        porTipo("PRE_NATAL") +
        porTipo("Pré-natal") +
        porTipo("PRENATAL");

    const vacinacao =
        porTipo("VACINACAO") +
        porTipo("Vacinação");

    const material =
        porTipo("ENTREGA_MATERIAL") +
        porTipo("Entrega de material");

    if (typeof setTextoApp === "function") {
        setTextoApp("dashInicialAgendaAPS", agenda.length);
        setTextoApp("dashInicialAgendaCriticos", criticos);
        setTextoApp("dashInicialBuscaAtiva", buscaAtiva);
        setTextoApp("dashInicialVisitas", visitas);
        setTextoApp("dashInicialConsultasPrioritarias", consultas);
        setTextoApp("dashInicialGestantes", gestantes);
        setTextoApp("dashInicialVacinacao", vacinacao);
        setTextoApp("dashInicialMateriais", material);
    }

    const copilotoBox =
        document.getElementById("dashInicialCopilotoAPS") ||
        document.getElementById("dashInicialResumoCopiloto") ||
        document.getElementById("dashCopilotoAgendaAPS");

    if (copilotoBox) {
        copilotoBox.innerHTML =
            `<div class="dashboard-list">
                <div class="dashboard-list-item">
                    <div>
                        <strong>🧠 Bom dia.</strong>
                        <small>Existem ${criticos} pacientes críticos, ${buscaAtiva} buscas ativas, ${visitas} visitas domiciliares prioritárias e ${gestantes} gestantes em acompanhamento prioritário.</small>
                    </div>
                    <button class="btn-table-action btn-ok" onclick="abrirAgendaInteligenteAPSApp()">
                        🗓 Agenda APS
                    </button>
                </div>
            </div>`;
    }

    return {
        total: agenda.length,
        criticos,
        buscaAtiva,
        visitas,
        consultas,
        gestantes,
        vacinacao,
        material,
        agenda
    };
}

function abrirAgendaInteligenteAPSApp() {
    if (typeof navigate === "function") {
        navigate("agenda-inteligente-aps");
    }
}


// ======================================================
// MOTOR COGNITIVO APS — RESUMO NO DASHBOARD INICIAL
// ======================================================

async function atualizarResumoMotorCognitivoDashboardInicial() {
    let motor =
        window.motorCognitivoAPSAtual || {};

    if (
        (!motor.resumo || !motor.ultimaAtualizacao) &&
        typeof carregarMotorCognitivoAPS === "function"
    ) {
        try {
            motor =
                await carregarMotorCognitivoAPS() ||
                window.motorCognitivoAPSAtual ||
                {};
        } catch (erro) {
            console.warn("Não foi possível carregar Motor Cognitivo APS:", erro);
        }
    }

    const resumo =
        motor.resumo ||
        (
            typeof gerarResumoCognitivoTerritorialAPS === "function"
                ? gerarResumoCognitivoTerritorialAPS()
                : null
        );

    if (!resumo) {
        return null;
    }

    if (typeof setTextoApp === "function") {
        setTextoApp("dashInicialMotorCognitivo", "ON");
        setTextoApp("dashInicialCognitivoCriticos", resumo.criticos ?? 0);
        setTextoApp("dashInicialCognitivoAgenda", resumo.agendaTotal ?? 0);
        setTextoApp("dashInicialCognitivoVisitas", resumo.visitas ?? 0);
        setTextoApp("dashInicialCognitivoBuscas", resumo.buscas ?? 0);
    }

    const recomendacoesBox =
        document.getElementById("dashInicialRecomendacoesIA");

    if (recomendacoesBox) {
        const status =
            resumo.status || "🧠 Motor Cognitivo ativo";

        recomendacoesBox.innerHTML =
            `<div class="dashboard-list">
                <div class="dashboard-list-item">
                    <div>
                        <strong>${status}</strong>
                        <small>${resumo.criticos || 0} crítico(s), ${resumo.alto || 0} alta prioridade, ${resumo.agendaTotal || 0} item(ns) na agenda APS.</small>
                    </div>
                    <span class="status-badge status-info">Motor Cognitivo</span>
                </div>

                <div class="dashboard-list-item">
                    <div>
                        <strong>🧠 Plano operacional IA</strong>
                        <small>Priorizar críticos, visitas domiciliares, buscas ativas e gestantes conforme Score Territorial Global.</small>
                    </div>
                    <button class="btn-table-action btn-ok" onclick="abrirMotorCognitivoAPSApp()">
                        Abrir IA
                    </button>
                </div>
            </div>`;
    }

    const copilotoBox =
        document.getElementById("dashInicialCopilotoAPS") ||
        document.getElementById("dashInicialResumoCopiloto") ||
        document.getElementById("dashCopilotoAgendaAPS");

    if (copilotoBox) {
        copilotoBox.innerHTML =
            `<div class="dashboard-list">
                <div class="dashboard-list-item">
                    <div>
                        <strong>🧠 Bom dia. Motor Cognitivo APS ativo.</strong>
                        <small>Existem ${resumo.criticos || 0} pacientes críticos, ${resumo.buscas || 0} buscas ativas, ${resumo.visitas || 0} visitas domiciliares e ${resumo.gestantes || 0} gestantes no território inteligente.</small>
                    </div>
                    <button class="btn-table-action btn-ok" onclick="abrirCopilotoAPS?.()">
                        Perguntar
                    </button>
                </div>
            </div>`;
    }

    return resumo;
}

function abrirMotorCognitivoAPSApp() {
    if (typeof navigate === "function") {
        navigate("motor-cognitivo-aps");
    }
}


// ======================================================
// SALA DE SITUAÇÃO APS COGNITIVA — RESUMO NO DASHBOARD
// ======================================================

async function atualizarResumoSalaSituacaoDashboardInicial() {
    const sala =
        window.salaSituacaoAPSAtual || {};

    let dados =
        sala.dados || null;

    if (
        !dados &&
        typeof carregarSalaSituacaoAPS === "function" &&
        document.getElementById("conteudoSalaSituacaoAPS")
    ) {
        try {
            await carregarSalaSituacaoAPS();
            dados = window.salaSituacaoAPSAtual?.dados || null;
        } catch (erro) {
            console.warn("Não foi possível atualizar resumo da Sala de Situação APS:", erro);
        }
    }

    if (!dados) {
        return null;
    }

    if (typeof setTextoApp === "function") {
        setTextoApp("dashInicialSalaPopulacao", dados.populacao ?? 0);
        setTextoApp("dashInicialSalaCriticos", dados.criticos?.length ?? 0);
        setTextoApp("dashInicialSalaScoreMedio", dados.scoreMedio ?? 0);
        setTextoApp("dashInicialSalaAgenda", dados.agendaResumo?.total ?? 0);
        setTextoApp("dashInicialSalaVisitas", dados.agendaResumo?.visitas ?? 0);
        setTextoApp("dashInicialSalaBuscas", dados.agendaResumo?.buscas ?? 0);
        setTextoApp("dashInicialSalaCIPE", dados.diagnosticosCIPE?.total ?? 0);
    }

    const salaBox =
        document.getElementById("dashInicialSalaSituacaoAPS") ||
        document.getElementById("dashInicialSalaSituacao") ||
        document.getElementById("dashSalaSituacaoAPS");

    if (salaBox) {
        const status =
            dados.status?.titulo || "Sala de Situação APS";

        const icone =
            dados.status?.icone || "🏢";

        salaBox.innerHTML =
            `<div class="dashboard-list">
                <div class="dashboard-list-item">
                    <div>
                        <strong>${icone} ${status}</strong>
                        <small>${dados.criticos?.length || 0} crítico(s), ${dados.altos?.length || 0} alta prioridade, score médio ${dados.scoreMedio || 0}.</small>
                    </div>
                    <button class="btn-table-action btn-ok" onclick="abrirSalaSituacaoAPSApp()">
                        Abrir Sala
                    </button>
                </div>
            </div>`;
    }

    return dados;
}

function abrirSalaSituacaoAPSApp() {
    if (typeof navigate === "function") {
        navigate("sala-situacao-aps");
    }
}


// ======================================================
// CENTRAL DE OPERAÇÕES APS 4.0 — RESUMO NO DASHBOARD
// ======================================================

async function atualizarResumoCentralOperacoesDashboardInicial() {
    let central =
        window.centralOperacoesAPSAtual || {};

    let dados =
        central.dados || null;

    if (
        !dados &&
        typeof carregarCentralOperacoesAPS === "function" &&
        (
            document.getElementById("conteudoCentralOperacoesAPS") ||
            document.getElementById("dashInicialCopilotoAPS") ||
            document.getElementById("dashInicialResumoCopiloto")
        )
    ) {
        try {
            const estado =
                await carregarCentralOperacoesAPS();

            dados =
                estado?.dados ||
                window.centralOperacoesAPSAtual?.dados ||
                null;
        } catch (erro) {
            console.warn(
                "Não foi possível atualizar resumo da Central de Operações APS:",
                erro
            );
        }
    }

    if (!dados) {
        return null;
    }

    if (typeof setTextoApp === "function") {
        setTextoApp("dashInicialCentralOperacoes", dados.populacao ?? 0);
        setTextoApp("dashInicialCentralCriticos", dados.criticos?.length ?? 0);
        setTextoApp("dashInicialCentralAltos", dados.altos?.length ?? 0);
        setTextoApp("dashInicialCentralScoreMedio", dados.scoreMedio ?? 0);
        setTextoApp("dashInicialCentralAgenda", dados.resumoAgenda?.total ?? 0);
        setTextoApp("dashInicialCentralBuscas", dados.resumoAgenda?.buscas ?? 0);
        setTextoApp("dashInicialCentralVisitas", dados.resumoAgenda?.visitas ?? 0);
        setTextoApp("dashInicialCentralGestantes", dados.resumoAgenda?.gestantes ?? 0);
        setTextoApp("dashInicialCentralCIPE", dados.cipe?.total ?? 0);
    }

    const centralBox =
        document.getElementById("dashInicialCentralOperacoesAPS") ||
        document.getElementById("dashInicialCentralOperacoes") ||
        document.getElementById("dashCentralOperacoesAPS");

    if (centralBox) {
        centralBox.innerHTML =
            `<div class="dashboard-list">
                <div class="dashboard-list-item">
                    <div>
                        <strong>📡 Central de Operações APS 4.0</strong>
                        <small>${dados.criticos?.length || 0} crítico(s), ${dados.altos?.length || 0} alta prioridade, ${dados.resumoAgenda?.buscas || 0} busca(s), ${dados.resumoAgenda?.visitas || 0} visita(s), score médio ${dados.scoreMedio || 0}.</small>
                    </div>
                    <button class="btn-table-action btn-ok" onclick="abrirCentralOperacoesAPSApp()">
                        Abrir Central
                    </button>
                </div>
            </div>`;
    }

    const copilotoBox =
        document.getElementById("dashInicialCopilotoAPS") ||
        document.getElementById("dashInicialResumoCopiloto") ||
        document.getElementById("dashCopilotoAgendaAPS");

    if (copilotoBox) {
        copilotoBox.innerHTML =
            `<div class="dashboard-list">
                <div class="dashboard-list-item">
                    <div>
                        <strong>🧠 Bom dia. Central de Operações APS ativa.</strong>
                        <small>${dados.criticos?.length || 0} pacientes críticos, ${dados.resumoAgenda?.buscas || 0} buscas ativas, ${dados.resumoAgenda?.visitas || 0} visitas domiciliares e ${dados.resumoAgenda?.gestantes || 0} gestantes priorizadas hoje.</small>
                    </div>
                    <button class="btn-table-action btn-ok" onclick="abrirCentralOperacoesAPSApp()">
                        📡 Central
                    </button>
                </div>
            </div>`;
    }

    return dados;
}

function abrirCentralOperacoesAPSApp() {
    if (typeof navigate === "function") {
        navigate("central-operacoes-aps");
    }
}



// ======================================================
// MOTOR DE REGRAS APS — RESUMO NO DASHBOARD INICIAL
// ======================================================

async function atualizarResumoMotorRegrasDashboardInicial() {
    const motor =
        window.motorRegrasAPSAtual || {};

    const resumo =
        motor.resumo || null;

    if (!resumo) {
        return null;
    }

    if (typeof setTextoApp === "function") {
        setTextoApp("dashInicialMotorRegras", resumo.acoesGeradas ?? 0);
        setTextoApp("dashInicialMotorRegrasCriticas", resumo.criticas ?? 0);
        setTextoApp("dashInicialMotorRegrasAltas", resumo.altas ?? 0);
        setTextoApp("dashInicialMotorRegrasBuscas", resumo.buscaAtiva ?? 0);
        setTextoApp("dashInicialMotorRegrasVisitas", resumo.visitas ?? 0);
        setTextoApp("dashInicialMotorRegrasConsultas", resumo.consultas ?? 0);
    }

    const box =
        document.getElementById("dashInicialMotorRegrasAPS") ||
        document.getElementById("dashInicialRegrasAPS") ||
        document.getElementById("dashMotorRegrasAPS");

    if (box) {
        box.innerHTML =
            `<div class="dashboard-list">
                <div class="dashboard-list-item">
                    <div>
                        <strong>🧠 Motor de Regras APS</strong>
                        <small>${resumo.acoesGeradas || 0} ação(ões) gerada(s), ${resumo.criticas || 0} crítica(s), ${resumo.buscaAtiva || 0} busca(s), ${resumo.visitas || 0} visita(s).</small>
                    </div>
                    <button class="btn-table-action btn-ok" onclick="abrirMotorRegrasAPSApp()">
                        Abrir regras
                    </button>
                </div>
            </div>`;
    }

    return resumo;
}

function abrirMotorRegrasAPSApp() {
    if (typeof navigate === "function") {
        navigate("motor-regras-aps");
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
        typeof atualizarEcossistemaAPS === "function"
    ) {
        atualizarEcossistemaAPS()
            .then(() => {
                if (typeof atualizarResumoMotorRegrasDashboardInicial === "function") {
                    atualizarResumoMotorRegrasDashboardInicial();
                }

                if (typeof atualizarResumoCentralOperacoesDashboardInicial === "function") {
                    atualizarResumoCentralOperacoesDashboardInicial();
                }
            })
            .catch(console.warn);
    }

    if (
        typeof carregarResumoTerritorioInteligente === "function"
    ) {
        carregarResumoTerritorioInteligente()
            .then(resumo => {
                console.log("🧠 Território Inteligente/EVFAM pronto:", resumo?.total || 0);

                if (
                    typeof setTextoApp === "function" &&
                    resumo
                ) {
                    setTextoApp("dashInicialCriticos", resumo?.criticos ?? 0);
                }
            })
            .catch(console.warn);
    }

    if (
        typeof atualizarResumoTorreDashboardInicial === "function"
    ) {
        atualizarResumoTorreDashboardInicial();
    }

    if (
        typeof atualizarResumoAgendaDashboardInicial === "function"
    ) {
        atualizarResumoAgendaDashboardInicial();
    }

    if (
        typeof atualizarResumoMotorCognitivoDashboardInicial === "function"
    ) {
        atualizarResumoMotorCognitivoDashboardInicial();
    }

    if (
        typeof atualizarResumoSalaSituacaoDashboardInicial === "function"
    ) {
        atualizarResumoSalaSituacaoDashboardInicial();
    }

    if (
        typeof atualizarResumoCentralOperacoesDashboardInicial === "function"
    ) {
        atualizarResumoCentralOperacoesDashboardInicial();
    }

    if (
        typeof atualizarResumoMotorRegrasDashboardInicial === "function"
    ) {
        atualizarResumoMotorRegrasDashboardInicial();
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
window.atualizarResumoAgendaDashboardInicial = atualizarResumoAgendaDashboardInicial;
window.abrirAgendaInteligenteAPSApp = abrirAgendaInteligenteAPSApp;
window.atualizarResumoMotorCognitivoDashboardInicial = atualizarResumoMotorCognitivoDashboardInicial;
window.abrirMotorCognitivoAPSApp = abrirMotorCognitivoAPSApp;
window.atualizarResumoSalaSituacaoDashboardInicial = atualizarResumoSalaSituacaoDashboardInicial;
window.abrirSalaSituacaoAPSApp = abrirSalaSituacaoAPSApp;
window.abrirVisitaDomiciliarPacienteAtualApp = abrirVisitaDomiciliarPacienteAtualApp;
window.atualizarResumoCentralOperacoesDashboardInicial = atualizarResumoCentralOperacoesDashboardInicial;
window.abrirCentralOperacoesAPSApp = abrirCentralOperacoesAPSApp;
window.abrirBaseTerritorialOperacionalApp = abrirBaseTerritorialOperacionalApp;
window.abrirCentralOperacionalUnificadaApp = abrirCentralOperacionalUnificadaApp;


window.atualizarResumoMotorRegrasDashboardInicial = atualizarResumoMotorRegrasDashboardInicial;
window.abrirMotorRegrasAPSApp = abrirMotorRegrasAPSApp;

if (typeof atualizarEcossistemaAPS === "function") {
    window.atualizarEcossistemaAPS = atualizarEcossistemaAPS;
}

if (typeof executarMotorRegrasAPS === "function") {
    window.executarMotorRegrasAPS = executarMotorRegrasAPS;
}
