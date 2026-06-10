/* ==========================================================
   DASHBOARD INICIAL — SINTAXEHUB
   Layout executivo inspirado em painel operacional
   Supabase-first: sem cache persistente.
   ========================================================== */

let timeoutBuscaGlobalSintaxeHub = null;

function alternarSidebarSintaxeHub() {
    document.body.classList.toggle("sidebar-collapsed");
}

function focarBuscaGlobalSintaxeHub() {
    const campo =
        document.getElementById("buscaGlobalPaciente");

    if (campo) {
        campo.focus();
    }
}

function atalhoBuscaGlobalSintaxeHub(event) {
    if (event.key === "Enter") {
        const primeiro =
            document.querySelector(".global-search-item");

        if (primeiro) {
            primeiro.click();
        }
    }
}

document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        focarBuscaGlobalSintaxeHub();
    }
});

async function carregarDashboardInicialSintaxeHub() {
    if (typeof supabaseClient === "undefined") {
        console.warn("Supabase não carregado para dashboard inicial.");
        return;
    }

    try {
        const hoje =
            new Date().toISOString().slice(0, 10);

        const [
            pacientesCountResp,
            pacientesResp,
            atendimentosResp,
            solicitacoesResp,
            estoqueResp,
            territorioResp,
            agendaResp
        ] = await Promise.all([
            supabaseClient
                .from("pacientes")
                .select("id", {
                    count: "exact",
                    head: true
                }),

            supabaseClient
                .from("pacientes")
                .select("*")
                .limit(12000),

            supabaseClient
                .from("atendimentos")
                .select("*")
                .order("data_atendimento", { ascending: false, nullsFirst: false })
                .limit(20000),

            supabaseClient
                .from("solicitacoes_materiais")
                .select("*")
                .order("criado_em", { ascending: false, nullsFirst: false })
                .limit(1000),

            supabaseClient
                .from("estoque_itens")
                .select("*")
                .limit(5000),

            supabaseClient
                .from("territorio_inteligente")
                .select("*")
                .limit(50000),

            supabaseClient
                .from("agenda_aps")
                .select("*")
                .eq("data_sugerida", hoje)
                .limit(5000)
        ]);

        const pacientes =
            pacientesResp.data || [];

        const atendimentos =
            atendimentosResp.data || [];

        const solicitacoes =
            solicitacoesResp.data || [];

        const estoque =
            estoqueResp.data || [];

        const territorio =
            territorioResp.data || [];

        const agendaHoje =
            agendaResp.data || [];

        const dados =
            calcularResumoDashboardInicialSintaxeHub(
                pacientes,
                atendimentos,
                solicitacoes,
                estoque,
                territorio,
                agendaHoje,
                pacientesCountResp.count ?? pacientes.length
            );

        renderizarDashboardInicialSintaxeHub(dados);

    } catch (erro) {
        console.error("Erro ao carregar dashboard inicial:", erro);
    }
}

function calcularResumoDashboardInicialSintaxeHub(
    pacientes,
    atendimentos,
    solicitacoes,
    estoque,
    territorio = [],
    agendaHoje = [],
    totalPacientesExato = null
) {
    const inicioMes =
        new Date();

    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const atendimentosMes =
        atendimentos.filter(a =>
            dataValidaDashboardInicial(a.data_atendimento || a.criado_em || a.created_at) >= inicioMes
        );

    const pendentes =
        atendimentos.filter(a =>
            Number(a.reavaliacaoDias ?? a.retorno_dias) === 0
        ).length;

    const criticos =
        atendimentos.filter(a =>
            Number(a.reavaliacaoDias ?? a.retorno_dias) === 0 ||
            normalizarDashboardInicial(a.risco_global).includes("alto") ||
            Number(a.risco_pontos || 0) >= 6
        ).length;

    const estoqueBaixo =
        estoque.filter(item =>
            Number(item.quantidade_atual || 0) <=
            Number(item.quantidade_minima || 0)
        );

    const populacaoCadastrada =
        Number(totalPacientesExato ?? pacientes.length ?? 0);

    const emMonitoramentoAtivo =
        (territorio || []).filter(t =>
            Number(t.score_territorial_global || t.score_geral || 0) > 0 ||
            String(t.nivel_prioridade || t.prioridade || "").trim() ||
            Number(t.evfam_total || 0) > 0 ||
            (Array.isArray(t.pendencias) && t.pendencias.length)
        ).length;

    const prioridadeAlta =
        (territorio || []).filter(t => {
            const score =
                Number(t.score_territorial_global || t.score_geral || 0);

            const nivel =
                normalizarDashboardInicial(t.nivel_prioridade || t.prioridade || "");

            return (
                score >= 65 ||
                nivel.includes("alto") ||
                nivel.includes("critic")
            );
        }).length;

    const visitaDomiciliar =
        (territorio || []).filter(t => {
            const acao =
                normalizarDashboardInicial(`${t.acao_recomendada || ""} ${t.tipo_visita_sugerida || ""}`);

            return (
                t.visita_domiciliar_indicada === true ||
                Number(t.score_domiciliar || 0) > 0 ||
                acao.includes("visita") ||
                acao.includes("domic")
            );
        }).length;

    const evfamAlto =
        (territorio || []).filter(t =>
            Number(t.evfam_total || 0) >= 15 ||
            normalizarDashboardInicial(t.evfam_classificacao).includes("alto")
        ).length;

    const criticosTerritoriais =
        (territorio || []).filter(t =>
            Number(t.score_territorial_global || t.score_geral || 0) >= 85 ||
            normalizarDashboardInicial(t.nivel_prioridade || t.prioridade).includes("critic")
        ).length;

    const pendenciasCalculadas =
        calcularPendenciasOperacionaisDashboardInicial(
            pacientes,
            atendimentos,
            territorio
        );

    const pendenciasOperacionais =
        Math.max(
            pendentes,
            pendenciasCalculadas.pacientes || 0
        );

    const buscasAgenda =
        (agendaHoje || []).filter(a =>
            normalizarDashboardInicial(a.tipo).includes("busca")
        ).length;

    const visitasAgenda =
        (agendaHoje || []).filter(a =>
            normalizarDashboardInicial(a.tipo).includes("visita")
        ).length;

    return {
        pacientes,
        atendimentos,
        solicitacoes,
        estoque,
        territorio,
        agendaHoje,
        atendimentosMes,
        pendentes: Math.max(pendentes, pendenciasOperacionais),
        pendenciasOperacionais,
        pacientesComPendencia: pendenciasOperacionais,
        pendenciasTotal: pendenciasCalculadas.total || pendenciasOperacionais,
        criticos: Math.max(criticos, criticosTerritoriais),
        estoqueBaixo,
        populacaoCadastrada,
        emMonitoramentoAtivo,
        prioridadeAlta,
        visitaDomiciliar,
        evfamAlto,
        criticosTerritoriais,
        buscasAgenda,
        visitasAgenda
    };
}


function calcularPendenciasOperacionaisDashboardInicial(pacientes, atendimentos, territorio) {
    const mapa = new Map();

    (pacientes || []).forEach(p => {
        const chave =
            limparDocumentoDashboardInicial(p.cpf || "") ||
            String(p.cns || "").trim() ||
            String(p.id || "");

        if (!chave) return;

        mapa.set(chave, {
            cpf: p.cpf || "",
            cns: p.cns || "",
            ultimoAtendimento: null,
            pendencias: []
        });
    });

    (atendimentos || []).forEach(a => {
        const chave =
            limparDocumentoDashboardInicial(a.paciente_cpf || a.cpf || "") ||
            String(a.cns || "").trim();

        if (!chave) return;

        const item =
            mapa.get(chave) || {
                cpf: a.paciente_cpf || a.cpf || "",
                cns: a.cns || "",
                ultimoAtendimento: null,
                pendencias: []
            };

        const prazo =
            a.reavaliacaoDias ??
            a.retorno_dias ??
            a.prazo ??
            null;

        if (
            prazo !== null &&
            prazo !== undefined &&
            Number(prazo) === 0
        ) {
            item.pendencias.push("Retorno vencido");
        }

        const dataAtendimento =
            dataValidaDashboardInicial(
                a.data_atendimento ||
                a.criado_em ||
                a.created_at
            );

        if (
            dataAtendimento &&
            (
                !item.ultimoAtendimento ||
                dataAtendimento > item.ultimoAtendimento
            )
        ) {
            item.ultimoAtendimento =
                dataAtendimento;
        }

        mapa.set(chave, item);
    });

    (territorio || []).forEach(t => {
        const chave =
            limparDocumentoDashboardInicial(t.cpf || "") ||
            limparDocumentoDashboardInicial(t.paciente_cpf || "") ||
            String(t.cns || "").trim();

        if (!chave) return;

        const item =
            mapa.get(chave) || {
                cpf: t.cpf || t.paciente_cpf || "",
                cns: t.cns || "",
                ultimoAtendimento: null,
                pendencias: []
            };

        if (Array.isArray(t.pendencias)) {
            item.pendencias.push(...t.pendencias);
        }

        if (
            Number(t.evfam_total || 0) >= 15 ||
            normalizarDashboardInicial(t.evfam_classificacao).includes("alto")
        ) {
            item.pendencias.push("EVFAM alto");
        }

        if (
            Number(t.score_territorial_global || t.score_geral || 0) >= 65
        ) {
            item.pendencias.push("Prioridade territorial alta");
        }

        mapa.set(chave, item);
    });

    const hoje =
        new Date();

    mapa.forEach(item => {
        if (!item.ultimoAtendimento) {
            item.pendencias.push("Sem atendimento registrado");
            return;
        }

        const dias =
            Math.floor(
                (hoje.getTime() - item.ultimoAtendimento.getTime()) /
                (1000 * 60 * 60 * 24)
            );

        if (dias > 180) {
            item.pendencias.push("Sem atendimento >180 dias");
        }
    });

    const pacientesComPendencia =
        [...mapa.values()].filter(item =>
            [...new Set(item.pendencias.filter(Boolean))].length > 0
        );

    const totalPendencias =
        pacientesComPendencia.reduce(
            (total, item) =>
                total +
                [...new Set(item.pendencias.filter(Boolean))].length,
            0
        );

    return {
        pacientes: pacientesComPendencia.length,
        total: totalPendencias
    };
}


function renderizarDashboardInicialSintaxeHub(dados) {
    setTextoDashboardInicial("dashInicialPessoas", dados.atendimentosMes.length);
    setTextoDashboardInicial("dashInicialPopulacaoCadastrada", dados.populacaoCadastrada ?? dados.pacientes.length);
    setTextoDashboardInicial("dashInicialMonitoramentoAtivo", dados.emMonitoramentoAtivo ?? 0);
    setTextoDashboardInicial("dashInicialPrioridadeAlta", dados.prioridadeAlta ?? 0);
    setTextoDashboardInicial("dashInicialVisitaDomiciliar", dados.visitaDomiciliar ?? 0);
    setTextoDashboardInicial("dashInicialEVFAMAlto", dados.evfamAlto ?? 0);

    setTextoDashboardInicial("dashInicialAtendimentos", dados.buscasAgenda ?? 0);
    setTextoDashboardInicial("dashInicialPendentes", dados.pendenciasOperacionais ?? dados.pendentes);
    setTextoDashboardInicial("dashInicialCriticos", dados.criticos);
    setTextoDashboardInicial("dashInicialEstoqueBaixo", dados.estoqueBaixo.length);

    renderizarAtendimentosRecentesDashboardInicial(dados.atendimentos.slice(0, 5));
    renderizarSolicitacoesDashboardInicial(dados.solicitacoes);
    renderizarEstoqueCriticoDashboardInicial(dados.estoqueBaixo.slice(0, 6));
    renderizarGraficoMensalDashboardInicial(dados.atendimentos);

    console.log("📊 Dashboard Inicial APS — Auditoria", {
        populacaoCadastrada: dados.populacaoCadastrada,
        atendimentosMes: dados.atendimentosMes?.length || 0,
        pacientesComPendencia: dados.pacientesComPendencia,
        totalPendencias: dados.pendenciasTotal,
        buscaAtivaHoje: dados.buscasAgenda
    });
}

function renderizarAtendimentosRecentesDashboardInicial(lista) {
    const container =
        document.getElementById("dashInicialAtendimentosRecentes");

    if (!container) return;

    if (!lista.length) {
        container.innerHTML =
            `<p style="color:var(--text-muted);">Nenhum atendimento recente.</p>`;
        return;
    }

    container.innerHTML = `
        <table class="table-sintaxe dashboard-table-compact">
            <thead>
                <tr>
                    <th>Paciente</th>
                    <th>CPF</th>
                    <th>Equipe</th>
                    <th>Condição</th>
                    <th>Status</th>
                    <th>Ação</th>
                </tr>
            </thead>
            <tbody>
                ${lista.map(a => {
                    const cpf =
                        limparDocumentoDashboardInicial(a.paciente_cpf || a.cpf || "");

                    const condicao =
                        [
                            valorSimDashboardInicial(a.has) ? "HAS" : "",
                            valorSimDashboardInicial(a.dm) ? "DM" : "",
                            valorSimDashboardInicial(a.gestante) ? "Gest." : "",
                            valorSimDashboardInicial(a.tb) ? "TB" : "",
                            valorSimDashboardInicial(a.hansen) ? "Hansen" : ""
                        ].filter(Boolean).join(" / ") || "-";

                    const critico =
                        Number(a.reavaliacaoDias ?? a.retorno_dias) === 0 ||
                        normalizarDashboardInicial(a.risco_global).includes("alto") ||
                        Number(a.risco_pontos || 0) >= 6;

                    return `
                        <tr>
                            <td>
                                <strong>${escaparDashboardInicial(a.nome_paciente || a.nome || "Sem nome")}</strong>
                                <small>${escaparDashboardInicial(a.ubs_vinculacao || a.ubs || "-")}</small>
                            </td>
                            <td>${formatarCPFParcialDashboardInicial(cpf)}</td>
                            <td>${escaparDashboardInicial(a.equipe_esf || a.equipe || "-")}</td>
                            <td>${escaparDashboardInicial(condicao)}</td>
                            <td>
                                <span class="status-badge ${critico ? "status-danger" : "status-info"}">
                                    ${critico ? "Prioritário" : "Em acompanhamento"}
                                </span>
                            </td>
                            <td>
                                <button class="btn-table-action btn-edit" onclick="abrirAtendimentoExistente?.('${cpf}', '${escaparDashboardInicial(a.cns || "")}')">
                                    👁
                                </button>
                            </td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;
}

function renderizarSolicitacoesDashboardInicial(solicitacoes) {
    const container =
        document.getElementById("dashInicialSolicitacoesMateriais");

    if (!container) return;

    const grupos = {
        Medicamentos: 0,
        Insumos: 0,
        Equipamentos: 0,
        "Materiais gerais": 0
    };

    solicitacoes.forEach(s => {
        const texto =
            normalizarDashboardInicial(
                `${s.descricao_item || ""} ${s.categoria || ""} ${s.tipo || ""}`
            );

        if (texto.includes("medic")) grupos.Medicamentos++;
        else if (texto.includes("equip")) grupos.Equipamentos++;
        else if (texto.includes("insumo")) grupos.Insumos++;
        else grupos["Materiais gerais"]++;
    });

    const linhas =
        Object.entries(grupos);

    container.innerHTML = `
        <div class="dashboard-list">
            ${linhas.map(([nome, total], index) => `
                <div class="dashboard-list-item">
                    <div>
                        <strong>${nome}</strong>
                        <small>${total} solicitações</small>
                    </div>
                    <span class="status-badge ${
                        index === 0 ? "status-warning" :
                        index === 1 ? "status-success" :
                        index === 2 ? "status-info" :
                        "status-danger"
                    }">
                        ${total}
                    </span>
                </div>
            `).join("")}
        </div>
    `;
}

function renderizarEstoqueCriticoDashboardInicial(lista) {
    const container =
        document.getElementById("dashInicialEstoqueCritico");

    if (!container) return;

    if (!lista.length) {
        container.innerHTML =
            `<p style="color:var(--text-muted);">Nenhum item crítico.</p>`;
        return;
    }

    container.innerHTML = `
        <table class="table-sintaxe dashboard-table-compact">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Atual</th>
                    <th>Mínimo</th>
                    <th>Situação</th>
                </tr>
            </thead>
            <tbody>
                ${lista.map(item => `
                    <tr>
                        <td>${escaparDashboardInicial(item.nome_item || item.descricao || item.descricao_item || "Item")}</td>
                        <td>${Number(item.quantidade_atual || 0)}</td>
                        <td>${Number(item.quantidade_minima || 0)}</td>
                        <td>
                            <span class="status-badge status-danger">
                                Crítico
                            </span>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function renderizarGraficoMensalDashboardInicial(atendimentos) {
    const container =
        document.getElementById("dashInicialGraficoAtendimentos");

    if (!container) return;

    const meses =
        Number(document.getElementById("dashInicialPeriodoGrafico")?.value || 6);

    const serie = [];

    const hoje =
        new Date();

    for (let i = meses - 1; i >= 0; i--) {
        const d =
            new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);

        const chave =
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

        serie.push({
            chave,
            label:
                d.toLocaleDateString("pt-BR", {
                    month: "short"
                }).replace(".", ""),
            total: 0
        });
    }

    atendimentos.forEach(a => {
        const d =
            dataValidaDashboardInicial(
                a.data_atendimento || a.criado_em || a.created_at
            );

        if (!d) return;

        const chave =
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

        const ponto =
            serie.find(x => x.chave === chave);

        if (ponto) {
            ponto.total++;
        }
    });

    const max =
        Math.max(...serie.map(x => x.total), 1);

    container.innerHTML = `
        <div class="mini-chart">
            ${serie.map(p => `
                <div class="mini-chart-col">
                    <span class="mini-chart-value">${p.total}</span>
                    <div class="mini-chart-bar-wrap">
                        <div class="mini-chart-bar" style="height:${Math.max(8, (p.total / max) * 150)}px;"></div>
                    </div>
                    <span class="mini-chart-label">${p.label}</span>
                </div>
            `).join("")}
        </div>
    `;
}

async function buscarPacienteGlobalSintaxeHub(valor) {
    const termo =
        String(valor || "").trim();

    const container =
        document.getElementById("resultadoBuscaGlobalPaciente");

    if (!container) return;

    clearTimeout(timeoutBuscaGlobalSintaxeHub);

    if (termo.length < 3) {
        container.style.display = "none";
        container.innerHTML = "";
        return;
    }

    timeoutBuscaGlobalSintaxeHub =
        setTimeout(async () => {
            try {
                if (typeof supabaseClient === "undefined") return;

                const termoLimpo =
                    termo.replace(/\D/g, "");

                let query =
                    supabaseClient
                        .from("pacientes")
                        .select("*")
                        .limit(8);

                if (termoLimpo.length >= 3) {
                    query =
                        query.or(`cpf.ilike.%${termoLimpo}%,cns.ilike.%${termoLimpo}%,nome.ilike.%${termo}%`);
                } else {
                    query =
                        query.ilike("nome", `%${termo}%`);
                }

                const { data, error } =
                    await query;

                if (error) {
                    console.warn("Erro na busca global:", error);
                    return;
                }

                renderizarResultadoBuscaGlobalSintaxeHub(data || []);

            } catch (erro) {
                console.error("Erro geral na busca global:", erro);
            }
        }, 350);
}

function renderizarResultadoBuscaGlobalSintaxeHub(lista) {
    const container =
        document.getElementById("resultadoBuscaGlobalPaciente");

    if (!container) return;

    if (!lista.length) {
        container.style.display = "block";
        container.innerHTML =
            `<div class="global-search-empty">Nenhum paciente encontrado.</div>`;
        return;
    }

    container.style.display = "block";
    container.innerHTML =
        lista.map(p => `
            <div
                class="global-search-item"
                onclick="abrirPacienteBuscaGlobalSintaxeHub('${limparDocumentoDashboardInicial(p.cpf || "")}', '${escaparDashboardInicial(p.cns || "")}')">
                <div>
                    <strong>${escaparDashboardInicial(p.nome || "Sem nome")}</strong>
                    <small>
                        CPF: ${formatarCPFParcialDashboardInicial(p.cpf || "-")}
                        · CNS: ${escaparDashboardInicial(p.cns || "-")}
                    </small>
                    <small>
                        ${escaparDashboardInicial(p.equipe_esf || p.equipe || "Equipe não informada")}
                        ·
                        ${escaparDashboardInicial(p.ubs_vinculacao || p.ubs || "UBS não informada")}
                    </small>
                </div>
                <span>↗</span>
            </div>
        `).join("");
}

function abrirPacienteBuscaGlobalSintaxeHub(cpf, cns) {
    const container =
        document.getElementById("resultadoBuscaGlobalPaciente");

    if (container) {
        container.style.display = "none";
    }

    const campo =
        document.getElementById("buscaGlobalPaciente");

    if (campo) {
        campo.value = "";
    }

    const cpfLimpo =
        limparDocumentoDashboardInicial(cpf || "");

    const cnsLimpo =
        String(cns || "").trim();

    // =====================================================
    // AÇÃO PRINCIPAL: ABRIR PRONTUÁRIO DO PACIENTE
    // =====================================================

    if (typeof abrirAtendimentoExistente === "function") {
        abrirAtendimentoExistente(
            cpfLimpo,
            cnsLimpo
        );

        setTimeout(() => {
            if (
                typeof carregarLinhaVidaTerritorialPaciente === "function"
            ) {
                carregarLinhaVidaTerritorialPaciente(
                    cpfLimpo,
                    cnsLimpo
                );
            }
        }, 700);

        return;
    }

    // =====================================================
    // FALLBACK: NAVEGAR PARA PRONTUÁRIO E PREENCHER CPF/CNS
    // =====================================================

    if (typeof navigate === "function") {
        navigate("prontuario");
    }

    setTimeout(() => {
        const campoCPF =
            document.getElementById("cpfPaciente");

        const campoCNS =
            document.getElementById("cnsPaciente");

        if (campoCPF && cpfLimpo) {
            campoCPF.value =
                cpfLimpo;
        }

        if (campoCNS && cnsLimpo) {
            campoCNS.value =
                cnsLimpo;
        }

        if (typeof buscarPacientePorDocumento === "function") {
            buscarPacientePorDocumento();
        }

        if (
            typeof carregarHistoricoClinicoPaciente === "function"
        ) {
            carregarHistoricoClinicoPaciente(
                cpfLimpo,
                cnsLimpo
            );
        }

        if (
            typeof carregarLinhaVidaTerritorialPaciente === "function"
        ) {
            carregarLinhaVidaTerritorialPaciente(
                cpfLimpo,
                cnsLimpo
            );
        }
    }, 500);
}

function atualizarTituloViewSintaxeHub(view) {
    const titulos = {
        inicio: ["Dashboard", "Visão geral da operação"],
        banco: ["Base Territorial APS", "Cadastro populacional, EVFAM e filas operacionais"],
        "mapa-territorial": ["Mapa Territorial", "Distribuição por equipe, UBS e CEP"],
        georreferenciamento: ["Georreferenciamento APS", "Mapa territorial e priorização por risco"],
        "central-aps": ["Base Territorial APS", "Filas operacionais integradas à base"],
        reuniao: ["Reunião de Equipe", "Ata, casos e encaminhamentos"],
        estoque: ["Estoque", "Materiais e solicitações"],
        "auditoria-estoque": ["Auditoria de Estoque", "Rastreabilidade operacional"],
        prontuario: ["Prontuário SOAP", "Registro clínico e plano de cuidado"],
        relatorios: ["Relatórios APS", "Indicadores e exportações"],
        "gestor-executivo": ["Painel Executivo", "Gestão estratégica"],
        "pendencias-clinicas": ["Pendências Clínicas", "Listas prioritárias"],
        "linha-tempo-territorial": ["Linha do Tempo", "Histórico longitudinal"],
        "torre-controle-aps": ["Torre APS", "Inteligência territorial integrada"],
        "sala-situacao-aps": ["Sala de Situação APS", "Centro de situação territorial"],
        config: ["Configurações", "Carga, usuários e parâmetros"]
    };

    const [titulo, subtitulo] =
        titulos[view] || ["SintaxeHub", "Central Operacional"];

    const elTitulo =
        document.getElementById("tituloViewAtual");

    const elSubtitulo =
        document.getElementById("subtituloViewAtual");

    if (elTitulo) elTitulo.innerText = titulo;
    if (elSubtitulo) elSubtitulo.innerText = subtitulo;
}

function setTextoDashboardInicial(id, valor) {
    const el =
        document.getElementById(id);

    if (el) {
        el.innerText =
            typeof valor === "number"
                ? valor.toLocaleString("pt-BR")
                : valor;
    }
}

function dataValidaDashboardInicial(valor) {
    if (!valor) return null;

    const d =
        new Date(valor);

    return Number.isNaN(d.getTime()) ? null : d;
}

function valorSimDashboardInicial(valor) {
    const v =
        String(valor || "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

    return (
        valor === true ||
        valor === 1 ||
        v === "sim" ||
        v === "s" ||
        v === "true" ||
        v === "1" ||
        v === "positivo" ||
        v === "presente" ||
        v === "ativo"
    );
}

function normalizarDashboardInicial(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function limparDocumentoDashboardInicial(valor) {
    return String(valor || "")
        .replace(/\D/g, "");
}

function formatarCPFParcialDashboardInicial(valor) {
    const cpf =
        limparDocumentoDashboardInicial(valor);

    if (cpf.length !== 11) {
        return valor || "-";
    }

    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function escaparDashboardInicial(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        if (document.getElementById("view-inicio")) {
            carregarDashboardInicialSintaxeHub();
        }
    }, 900);
});

window.alternarSidebarSintaxeHub = alternarSidebarSintaxeHub;
window.focarBuscaGlobalSintaxeHub = focarBuscaGlobalSintaxeHub;
window.buscarPacienteGlobalSintaxeHub = buscarPacienteGlobalSintaxeHub;
window.abrirPacienteBuscaGlobalSintaxeHub = abrirPacienteBuscaGlobalSintaxeHub;
window.carregarDashboardInicialSintaxeHub = carregarDashboardInicialSintaxeHub;
window.atualizarTituloViewSintaxeHub = atualizarTituloViewSintaxeHub;


document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        if (typeof window.navigate === "function" && !window.navigate.__dashboardInicialWrapped) {
            const navigateOriginal = window.navigate;

            window.navigate = function(view) {
                atualizarTituloViewSintaxeHub(view);
                navigateOriginal(view);

                if (view === "inicio") {
                    setTimeout(carregarDashboardInicialSintaxeHub, 300);
                }
            };

            window.navigate.__dashboardInicialWrapped = true;
        }
    }, 300);
});
