/* ==========================================================
   🏢 TORRE DE CONTROLE APS 2.0 — SINTAXEHUB
   Centro de comando executivo orientado por IA territorial
   Supabase-first: sem localStorage, sem IndexedDB e sem cache persistente.

   Integra:
   - pacientes
   - atendimentos
   - interacoes_busca_ativa
   - reunioes
   - reuniao_casos
   - estoque_itens
   - solicitacoes_materiais

   Reaproveita, quando disponíveis:
   - valorSimRelatorioAPS
   - normalizarRelatorioAPS
   - identificarPendenciasRelatorioAPS
   - calcularPredicaoAPS
   - agruparGeoAPS
   ========================================================== */

let torreControleAPSAtual = {
    pacientes: [],
    atendimentos: [],
    interacoes: [],
    reunioes: [],
    reuniaoCasos: [],
    estoque: [],
    solicitacoes: [],
    territorioInteligente: [],
    base: [],
    recomendacoesIA: [],
    agendaSugerida: []
};

/* ==========================================================
   CARREGAMENTO PRINCIPAL
   ========================================================== */

async function carregarTorreControleAPS() {
    const container =
        document.getElementById("conteudoTorreControleAPS");

    if (!container) return;

    if (typeof supabaseClient === "undefined") {
        container.innerHTML =
            `<p style="color:var(--danger);">Supabase não carregado.</p>`;
        return;
    }

    container.innerHTML =
        `<p style="color:var(--text-muted);">Carregando Torre de Controle APS...</p>`;

    try {
        const filtros =
            obterFiltrosTorreControleAPS();

        const [
            pacientes,
            atendimentos,
            interacoes,
            reunioes,
            reuniaoCasos,
            estoque,
            solicitacoes,
            territorioInteligente
        ] = await Promise.all([
            buscarTabelaTorreAPS("pacientes", "*", null, 10000),
            buscarTabelaTorreAPS("atendimentos", "*", filtros, 30000, "data_atendimento"),
            buscarTabelaTorreAPS("interacoes_busca_ativa", "*", filtros, 20000, "criado_em"),
            buscarTabelaTorreAPS("reunioes", "*", filtros, 2000, "criado_em"),
            buscarTabelaTorreAPS("reuniao_casos", "*", filtros, 10000, "created_at"),
            buscarTabelaTorreAPS("estoque_itens", "*", null, 10000),
            buscarTabelaTorreAPS("solicitacoes_materiais", "*", filtros, 10000, "criado_em"),
            buscarTabelaTorreAPS("territorio_inteligente", "*", null, 20000, "ultima_atualizacao")
        ]);

        const base =
            consolidarBaseTorreAPS(
                pacientes,
                atendimentos
            );

        enriquecerBaseComTerritorioInteligenteTorreAPS(
            base,
            territorioInteligente
        );

        const recomendacoesIA =
            gerarRecomendacoesExecutivasTorreAPS(
                base,
                estoque,
                solicitacoes,
                territorioInteligente
            );

        const agendaSugerida =
            gerarAgendaInteligenteTorreAPS(
                base,
                territorioInteligente
            );

        torreControleAPSAtual = {
            pacientes,
            atendimentos,
            interacoes,
            reunioes,
            reuniaoCasos,
            estoque,
            solicitacoes,
            territorioInteligente,
            base,
            recomendacoesIA,
            agendaSugerida
        };

        carregarFiltrosTorreControleAPS(base);
        renderizarTorreControleAPS();

    } catch (erro) {
        console.error("Erro na Torre de Controle APS:", erro);

        container.innerHTML =
            `<p style="color:var(--danger);">Erro ao carregar Torre de Controle APS.</p>`;
    }
}

/* ==========================================================
   BUSCAS SUPABASE
   ========================================================== */

async function buscarTabelaTorreAPS(
    tabela,
    select = "*",
    filtros = null,
    limit = 10000,
    colunaData = "criado_em"
) {
    try {
        let query =
            supabaseClient
                .from(tabela)
                .select(select)
                .limit(limit);

        if (filtros?.inicio) {
            query =
                query.gte(
                    colunaData,
                    filtros.inicio + "T00:00:00"
                );
        }

        if (filtros?.fim) {
            query =
                query.lte(
                    colunaData,
                    filtros.fim + "T23:59:59"
                );
        }

        const { data, error } =
            await query;

        if (error) {
            console.warn(`Torre APS: tabela indisponível ou divergente: ${tabela}`, error);
            return [];
        }

        return data || [];

    } catch (erro) {
        console.warn(`Torre APS: falha ao buscar ${tabela}`, erro);
        return [];
    }
}

/* ==========================================================
   FILTROS
   ========================================================== */

function obterFiltrosTorreControleAPS() {
    return {
        inicio:
            document.getElementById("torreDataInicio")?.value || "",

        fim:
            document.getElementById("torreDataFim")?.value || "",

        equipe:
            document.getElementById("torreFiltroEquipe")?.value || "TODAS",

        ubs:
            document.getElementById("torreFiltroUBS")?.value || "TODAS",

        linha:
            document.getElementById("torreFiltroLinha")?.value || "TODAS",

        risco:
            document.getElementById("torreFiltroRisco")?.value || "TODOS"
    };
}

function carregarFiltrosTorreControleAPS(base) {
    preencherSelectTorreAPS(
        "torreFiltroEquipe",
        base.map(p => p.equipe || "Não informado"),
        "Todas as equipes"
    );

    preencherSelectTorreAPS(
        "torreFiltroUBS",
        base.map(p => p.ubs || "Não informado"),
        "Todas as UBS"
    );
}

function preencherSelectTorreAPS(id, valores, rotulo) {
    const select =
        document.getElementById(id);

    if (!select) return;

    const atual =
        select.value || "TODAS";

    const unicos =
        [...new Set((valores || []).filter(Boolean))]
            .sort();

    select.innerHTML =
        `<option value="TODAS">${rotulo}</option>`;

    unicos.forEach(valor => {
        const option =
            document.createElement("option");

        option.value =
            valor;

        option.textContent =
            valor;

        select.appendChild(option);
    });

    if (atual === "TODAS" || unicos.includes(atual)) {
        select.value =
            atual;
    }
}

function aplicarFiltrosTorreControleAPS(base) {
    const filtros =
        obterFiltrosTorreControleAPS();

    let filtrada =
        [...base];

    if (filtros.equipe !== "TODAS") {
        filtrada =
            filtrada.filter(p =>
                String(p.equipe || "Não informado") === filtros.equipe
            );
    }

    if (filtros.ubs !== "TODAS") {
        filtrada =
            filtrada.filter(p =>
                String(p.ubs || "Não informado") === filtros.ubs
            );
    }

    if (filtros.linha !== "TODAS") {
        filtrada =
            filtrada.filter(p => {
                if (filtros.linha === "HAS") return valorSimTorreAPS(p.has);
                if (filtros.linha === "DM") return valorSimTorreAPS(p.dm);
                if (filtros.linha === "GESTANTE") return valorSimTorreAPS(p.gestante);
                if (filtros.linha === "TB") return valorSimTorreAPS(p.tb);
                if (filtros.linha === "HANSEN") return valorSimTorreAPS(p.hansen);
                return true;
            });
    }

    if (filtros.risco !== "TODOS") {
        filtrada =
            filtrada.filter(p => {
                const score =
                    calcularScorePredicaoTorreAPS(p).score;

                if (filtros.risco === "CRITICO") {
                    return (
                        Number(p.prazo) === 0 ||
                        normalizarTorreAPS(p.risco_global).includes("alto") ||
                        Number(p.risco_pontos || 0) >= 6 ||
                        score >= 10
                    );
                }

                if (filtros.risco === "MODERADO") {
                    return score >= 6 && score < 10;
                }

                if (filtros.risco === "BAIXO") {
                    return score < 6;
                }

                return true;
            });
    }

    return filtrada;
}

/* ==========================================================
   CONSOLIDAÇÃO
   ========================================================== */

function consolidarBaseTorreAPS(pacientes, atendimentos) {
    const mapa =
        new Map();

    (pacientes || []).forEach(p => {
        const chave =
            p.cpf ||
            p.cns ||
            p.id;

        if (!chave) return;

        mapa.set(chave, {
            id: p.id || "",
            nome: p.nome || "",
            cpf: limparDocumentoTorreAPS(p.cpf || ""),
            cns: p.cns || "",
            telefone: p.telefone || "",
            cep: limparCEPTorreAPS(p.cep || ""),
            bairro: p.bairro || "Bairro não informado",
            cidade: p.cidade || "",

            ubs:
                p.ubs_vinculacao ||
                p.ubs ||
                p.unidade ||
                "Não informado",

            equipe:
                p.equipe_esf ||
                p.equipe ||
                "Não informado",

            has: "Não",
            dm: "Não",
            gestante: "Não",
            tb: "Não",
            hansen: "Não",

            hasPAS: null,
            hasPAD: null,
            dmHbA1c: null,

            risco_global: "Não informado",
            risco_pontos: 0,
            prazo: null,
            ultimo_atendimento: null,
            ciap: ""
        });
    });

    (atendimentos || []).forEach(a => {
        const chave =
            a.paciente_cpf ||
            a.cpf ||
            a.cns;

        if (!chave) return;

        const atual =
            mapa.get(chave) || {
                id: "",
                nome:
                    a.nome_paciente ||
                    a.nomePaciente ||
                    a.nome ||
                    "",
                cpf:
                    limparDocumentoTorreAPS(
                        a.paciente_cpf ||
                        a.cpf ||
                        ""
                    ),
                cns: a.cns || "",
                telefone: a.telefone || "",
                cep: limparCEPTorreAPS(a.cep || ""),
                bairro: a.bairro || "Bairro não informado",
                cidade: a.cidade || "",

                ubs:
                    a.ubs_vinculacao ||
                    a.ubs ||
                    "Não informado",

                equipe:
                    a.equipe_esf ||
                    a.equipe ||
                    "Não informado",

                has: "Não",
                dm: "Não",
                gestante: "Não",
                tb: "Não",
                hansen: "Não",

                hasPAS: null,
                hasPAD: null,
                dmHbA1c: null,

                risco_global: "Não informado",
                risco_pontos: 0,
                prazo: null,
                ultimo_atendimento: null,
                ciap: ""
            };

        if (!atual.nome) {
            atual.nome =
                a.nome_paciente ||
                a.nome ||
                "";
        }

        if (valorSimTorreAPS(a.has)) atual.has = "Sim";
        if (valorSimTorreAPS(a.dm)) atual.dm = "Sim";
        if (valorSimTorreAPS(a.gestante)) atual.gestante = "Sim";
        if (valorSimTorreAPS(a.tb)) atual.tb = "Sim";
        if (valorSimTorreAPS(a.hansen)) atual.hansen = "Sim";

        atual.hasPAS =
            obterPrimeiroValorTorreAPS(
                a.hasPAS,
                a.has_pas,
                a.objPAS,
                a.obj_pas,
                atual.hasPAS
            );

        atual.hasPAD =
            obterPrimeiroValorTorreAPS(
                a.hasPAD,
                a.has_pad,
                a.objPAD,
                a.obj_pad,
                atual.hasPAD
            );

        atual.dmHbA1c =
            obterPrimeiroValorTorreAPS(
                a.dmHbA1c,
                a.dm_hba1c,
                a.hba1c,
                atual.dmHbA1c
            );

        atual.risco_global =
            a.risco_global ||
            atual.risco_global;

        if (a.risco_pontos !== null && a.risco_pontos !== undefined) {
            atual.risco_pontos =
                Number(a.risco_pontos || 0);
        }

        atual.prazo =
            a.reavaliacaoDias ??
            a.retorno_dias ??
            atual.prazo;

        atual.ultimo_atendimento =
            a.data_atendimento ||
            a.criado_em ||
            a.created_at ||
            atual.ultimo_atendimento;

        atual.ciap =
            a.ciapSelecionado ||
            a.inputBuscaCIAPS ||
            a.ciap ||
            atual.ciap ||
            "";

        if (a.ubs_vinculacao || a.ubs) {
            atual.ubs =
                a.ubs_vinculacao ||
                a.ubs;
        }

        if (a.equipe_esf || a.equipe) {
            atual.equipe =
                a.equipe_esf ||
                a.equipe;
        }

        mapa.set(chave, atual);
    });

    return Array
        .from(mapa.values())
        .map(p => ({
            ...p,
            pendencias:
                identificarPendenciasTorreAPS(p),

            predicao:
                calcularScorePredicaoTorreAPS(p)
        }));
}

/* ==========================================================
   RENDERIZAÇÃO PRINCIPAL
   ========================================================== */

function renderizarTorreControleAPS() {
    const container =
        document.getElementById("conteudoTorreControleAPS");

    if (!container) return;

    const filtros =
        obterFiltrosTorreControleAPS();

    const base =
        aplicarFiltrosTorreControleAPS(
            torreControleAPSAtual.base || []
        );

    const dados =
        calcularDadosTorreControleAPS(
            base,
            filtros
        );

    atualizarCardsTorreControleAPS(dados);

    container.innerHTML = `
        ${renderizarCentroComandoTorreAPS(dados)}

        ${renderizarRecomendacoesIATorreAPS(dados)}

        ${renderizarAgendaInteligenteTorreAPS(dados)}

        ${renderizarSituacaoTerritorialTorreAPS(dados)}

        ${renderizarPainelPredicaoTorreAPS(dados)}

        ${renderizarEstratificacaoTerritorialTorreAPS(dados)}

        ${renderizarProducaoAPSTorreAPS(dados)}

        ${renderizarHotspotsTorreAPS(dados)}

        ${renderizarBuscaAtivaTorreAPS(dados)}

        ${renderizarLinhaTempoColetivaTorreAPS(dados)}

        ${renderizarEstoqueAlertasTorreAPS(dados)}

        ${renderizarTabelaPacientesPrioritariosTorreAPS(dados.pacientesPrioritarios)}
    `;
}

/* ==========================================================
   CÁLCULO GERAL
   ========================================================== */

function calcularDadosTorreControleAPS(base, filtros) {
    const atendimentos =
        filtrarListaPorEquipeUBSTorreAPS(
            torreControleAPSAtual.atendimentos || [],
            filtros
        );

    const interacoes =
        filtrarListaPorEquipeUBSTorreAPS(
            torreControleAPSAtual.interacoes || [],
            filtros
        );

    const reunioes =
        torreControleAPSAtual.reunioes || [];

    const reuniaoCasos =
        filtrarListaPorEquipeUBSTorreAPS(
            torreControleAPSAtual.reuniaoCasos || [],
            filtros
        );

    const estoque =
        torreControleAPSAtual.estoque || [];

    const solicitacoes =
        torreControleAPSAtual.solicitacoes || [];

    const baseOrdenada =
        [...(base || [])].sort((a, b) =>
            Number(b.score_territorial_global || 0) - Number(a.score_territorial_global || 0) ||
            Number(b.predicao?.score || 0) - Number(a.predicao?.score || 0) ||
            (b.pendencias || []).length - (a.pendencias || []).length
        );

    const criticos =
        baseOrdenada.filter(p =>
            Number(p.score_territorial_global || 0) >= 85 ||
            String(p.nivel_prioridade || "").toUpperCase() === "CRITICO"
        );

    const altos =
        baseOrdenada.filter(p =>
            Number(p.score_territorial_global || 0) >= 65 &&
            Number(p.score_territorial_global || 0) < 85
        );

    const moderados =
        baseOrdenada.filter(p =>
            Number(p.score_territorial_global || 0) >= 40 &&
            Number(p.score_territorial_global || 0) < 65
        );

    const baixos =
        baseOrdenada.filter(p =>
            Number(p.score_territorial_global || 0) < 40
        );

    const pendencias =
        baseOrdenada.reduce(
            (total, p) => total + (p.pendencias?.length || 0),
            0
        );

    const pacientesPrioritarios =
        baseOrdenada
            .filter(p =>
                Number(p.score_territorial_global || 0) >= 40 ||
                Number(p.predicao?.score || 0) >= 6 ||
                Number(p.prazo) === 0 ||
                (p.pendencias?.length || 0) > 0
            )
            .slice(0, 50);

    const hotspots =
        calcularHotspotsTorreAPS(baseOrdenada);

    const busca =
        calcularBuscaAtivaTorreAPS(
            interacoes,
            baseOrdenada
        );

    const eventosColetivos =
        calcularEventosColetivosTorreAPS(
            atendimentos,
            interacoes,
            reunioes,
            reuniaoCasos,
            solicitacoes
        );

    const estoqueAlertas =
        calcularAlertasEstoqueTorreAPS(
            estoque,
            solicitacoes
        );

    const producaoAPS =
        calcularProducaoAPSTorreAPS(
            atendimentos,
            interacoes,
            reuniaoCasos,
            solicitacoes
        );

    const estratificacao =
        calcularEstratificacaoTerritorialTorreAPS(baseOrdenada);

    return {
        filtros,
        base: baseOrdenada,
        atendimentos,
        interacoes,
        reunioes,
        reuniaoCasos,
        estoque,
        solicitacoes,

        populacao: baseOrdenada.length,
        has: baseOrdenada.filter(p => valorSimTorreAPS(p.has)).length,
        dm: baseOrdenada.filter(p => valorSimTorreAPS(p.dm)).length,
        gestantes: baseOrdenada.filter(p => valorSimTorreAPS(p.gestante)).length,
        tb: baseOrdenada.filter(p => valorSimTorreAPS(p.tb)).length,
        hansen: baseOrdenada.filter(p => valorSimTorreAPS(p.hansen)).length,
        criticos: criticos.length,
        altos: altos.length,
        moderados: moderados.length,
        baixos: baixos.length,
        pendencias,

        pacientesPrioritarios,
        hotspots,
        busca,
        eventosColetivos,
        estoqueAlertas,
        producaoAPS,
        estratificacao,
        recomendacoesIA: torreControleAPSAtual.recomendacoesIA || [],
        agendaSugerida: torreControleAPSAtual.agendaSugerida || [],
        territorioInteligente: torreControleAPSAtual.territorioInteligente || []
    };
}


function filtrarListaPorEquipeUBSTorreAPS(lista, filtros) {
    return (lista || []).filter(item => {
        const equipe =
            item.equipe ||
            item.equipe_esf ||
            "Não informado";

        const ubs =
            item.ubs ||
            item.ubs_vinculacao ||
            "Não informado";

        if (
            filtros.equipe !== "TODAS" &&
            equipe !== filtros.equipe
        ) {
            return false;
        }

        if (
            filtros.ubs !== "TODAS" &&
            ubs !== filtros.ubs
        ) {
            return false;
        }

        return true;
    });
}

/* ==========================================================
   SITUAÇÃO TERRITORIAL
   ========================================================== */

function renderizarSituacaoTerritorialTorreAPS(dados) {
    const perc =
        (valor) =>
            dados.populacao > 0
                ? Number(((valor / dados.populacao) * 100).toFixed(1))
                : 0;

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">📊 Situação Territorial Integrada</h3>

            <div class="dashboard-grid">
                ${cardTorreAPS("👥", dados.populacao, "População", "icon-blue")}
                ${cardTorreAPS("❤️", `${dados.has} (${perc(dados.has)}%)`, "HAS", "icon-red")}
                ${cardTorreAPS("🍬", `${dados.dm} (${perc(dados.dm)}%)`, "DM", "icon-green")}
                ${cardTorreAPS("🤰", `${dados.gestantes} (${perc(dados.gestantes)}%)`, "Gestantes", "icon-yellow")}
                ${cardTorreAPS("🫁", dados.tb, "Tuberculose", "icon-purple")}
                ${cardTorreAPS("🖐️", dados.hansen, "Hanseníase", "icon-cyan")}
                ${cardTorreAPS("🚨", dados.criticos, "Críticos", "icon-red")}
                ${cardTorreAPS("🧭", dados.pendencias, "Pendências clínicas", "icon-yellow")}
                ${cardTorreAPS("🩺", dados.atendimentos.length, "Atendimentos", "icon-blue")}
            </div>
        </div>
    `;
}

function atualizarCardsTorreControleAPS(dados) {
    setTextoTorreAPS("torreTotalPopulacao", dados.populacao);
    setTextoTorreAPS("torreTotalCriticos", dados.criticos);
    setTextoTorreAPS("torreTotalPendencias", dados.pendencias);
    setTextoTorreAPS("torreTotalHotspots", dados.hotspots.length);
    setTextoTorreAPS("torreTotalBuscaAtiva", dados.busca.total);
    setTextoTorreAPS("torreTotalEventos", dados.eventosColetivos.total30);
}

/* ==========================================================
   PREDIÇÃO
   ========================================================== */

function renderizarPainelPredicaoTorreAPS(dados) {
    const muitoAlto =
        dados.base.filter(p => p.predicao.score >= 10).length;

    const moderado =
        dados.base.filter(p =>
            p.predicao.score >= 6 &&
            p.predicao.score < 10
        ).length;

    const baixo =
        dados.base.filter(p => p.predicao.score < 6).length;

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">🔮 Predição APS Clínico-Territorial</h3>

            <div class="dashboard-grid">
                ${cardTorreAPS("🔴", muitoAlto, "Risco de descompensação/internação", "icon-red")}
                ${cardTorreAPS("🟡", moderado, "Risco de abandono/agravamento", "icon-yellow")}
                ${cardTorreAPS("🟢", baixo, "Baixo risco preditivo", "icon-green")}
            </div>
        </div>
    `;
}

function calcularScorePredicaoTorreAPS(p) {
    let score = 0;
    const fatores = [];

    if (Number(p.prazo) === 0) {
        score += 4;
        fatores.push("retorno vencido");
    }

    if (
        normalizarTorreAPS(p.risco_global).includes("alto") ||
        Number(p.risco_pontos || 0) >= 6
    ) {
        score += 4;
        fatores.push("alto risco");
    }

    if (valorSimTorreAPS(p.has)) {
        score += 1;
        fatores.push("HAS");
    }

    if (valorSimTorreAPS(p.dm)) {
        score += 1;
        fatores.push("DM");
    }

    if (valorSimTorreAPS(p.tb)) {
        score += 3;
        fatores.push("TB");
    }

    if (valorSimTorreAPS(p.hansen)) {
        score += 3;
        fatores.push("Hanseníase");
    }

    const pendencias =
        identificarPendenciasTorreAPS(p);

    if (pendencias.length) {
        score += pendencias.length * 2;
        fatores.push(`${pendencias.length} pendência(s)`);
    }

    if (diasDesdeTorreAPS(p.ultimo_atendimento) > 180) {
        score += 3;
        fatores.push("sem atendimento recente");
    }

    return {
        score,
        fatores,
        classe:
            score >= 10
                ? "Risco de descompensação/internação"
                : score >= 6
                    ? "Risco de abandono/agravamento"
                    : "Baixo risco preditivo"
    };
}


/* ==========================================================
   ESTRATIFICAÇÃO TERRITORIAL V2
   ========================================================== */

function calcularEstratificacaoTerritorialTorreAPS(base) {
    return {
        equipes:
            agruparEstratificacaoTorreAPS(
                base,
                p => p.equipe || "Equipe não informada",
                "Equipe"
            ),

        ubs:
            agruparEstratificacaoTorreAPS(
                base,
                p => p.ubs || "UBS não informada",
                "UBS"
            ),

        territorios:
            agruparEstratificacaoTorreAPS(
                base,
                p => p.cep || p.bairro || p.ubs || "Território não informado",
                "Território"
            )
    };
}

function agruparEstratificacaoTorreAPS(base, chaveFn, tipo) {
    const grupos = {};

    (base || []).forEach(p => {
        const chave =
            chaveFn(p) ||
            "Não informado";

        if (!grupos[chave]) {
            grupos[chave] = {
                tipo,
                nome: chave,
                populacao: 0,
                has: 0,
                dm: 0,
                gestantes: 0,
                tb: 0,
                hansen: 0,
                criticos: 0,
                pendencias: 0,
                semAtendimento180: 0,
                score: 0,
                status: "🟢 Estável"
            };
        }

        const g =
            grupos[chave];

        g.populacao++;

        if (valorSimTorreAPS(p.has)) g.has++;
        if (valorSimTorreAPS(p.dm)) g.dm++;
        if (valorSimTorreAPS(p.gestante)) g.gestantes++;
        if (valorSimTorreAPS(p.tb)) g.tb++;
        if (valorSimTorreAPS(p.hansen)) g.hansen++;

        const critico =
            Number(p.prazo) === 0 ||
            normalizarTorreAPS(p.risco_global).includes("alto") ||
            Number(p.risco_pontos || 0) >= 6 ||
            Number(p.predicao?.score || 0) >= 10;

        if (critico) {
            g.criticos++;
        }

        const qtdPendencias =
            p.pendencias?.length || 0;

        g.pendencias +=
            qtdPendencias;

        if (diasDesdeTorreAPS(p.ultimo_atendimento) > 180) {
            g.semAtendimento180++;
        }

        g.score +=
            calcularScoreTerritorialPacienteTorreAPS(p);
    });

    Object.values(grupos).forEach(g => {
        g.taxaCriticos =
            g.populacao > 0
                ? Number(((g.criticos / g.populacao) * 100).toFixed(1))
                : 0;

        g.taxaPendencias =
            g.populacao > 0
                ? Number(((g.pendencias / g.populacao) * 100).toFixed(1))
                : 0;

        if (
            g.score >= 300 ||
            g.taxaCriticos >= 8 ||
            g.taxaPendencias >= 40
        ) {
            g.status = "🔴 Prioridade Máxima";
        } else if (
            g.score >= 120 ||
            g.taxaCriticos >= 4 ||
            g.taxaPendencias >= 20
        ) {
            g.status = "🟡 Atenção";
        } else {
            g.status = "🟢 Estável";
        }
    });

    return Object
        .values(grupos)
        .sort((a, b) =>
            b.score - a.score ||
            b.criticos - a.criticos ||
            b.pendencias - a.pendencias ||
            b.populacao - a.populacao
        );
}

function calcularScoreTerritorialPacienteTorreAPS(p) {
    let score = 0;

    if (
        Number(p.prazo) === 0 ||
        normalizarTorreAPS(p.risco_global).includes("alto") ||
        Number(p.risco_pontos || 0) >= 6 ||
        Number(p.predicao?.score || 0) >= 10
    ) {
        score += 5;
    }

    score +=
        (p.pendencias?.length || 0) * 2;

    if (valorSimTorreAPS(p.tb)) score += 3;
    if (valorSimTorreAPS(p.hansen)) score += 3;
    if (valorSimTorreAPS(p.gestante)) score += 2;
    if (valorSimTorreAPS(p.has)) score += 1;
    if (valorSimTorreAPS(p.dm)) score += 1;

    if (diasDesdeTorreAPS(p.ultimo_atendimento) > 180) {
        score += 3;
    }

    score +=
        Number(p.risco_pontos || 0);

    return score;
}

function renderizarEstratificacaoTerritorialTorreAPS(dados) {
    return `
        <div class="form-section">
            <h3 style="margin-top:0;">📍 Estratificação Territorial APS</h3>

            <div class="dashboard-grid">
                ${cardResumoEstratificacaoTorreAPS("👥", dados.estratificacao.equipes, "Equipes", "icon-blue")}
                ${cardResumoEstratificacaoTorreAPS("🏥", dados.estratificacao.ubs, "UBS", "icon-green")}
                ${cardResumoEstratificacaoTorreAPS("🌎", dados.estratificacao.territorios, "Territórios", "icon-purple")}
            </div>

            <h4>🚦 Semáforo por Equipe</h4>
            ${renderizarTabelaEstratificacaoTorreAPS(dados.estratificacao.equipes.slice(0, 12))}

            <h4>🏥 Semáforo por UBS</h4>
            ${renderizarTabelaEstratificacaoTorreAPS(dados.estratificacao.ubs.slice(0, 12))}

            <h4>🔥 Ranking Territorial Executivo</h4>
            ${renderizarTabelaEstratificacaoTorreAPS(dados.estratificacao.territorios.slice(0, 20))}
        </div>
    `;
}

function cardResumoEstratificacaoTorreAPS(icone, lista, rotulo, classeIcone) {
    const prioridade =
        (lista || []).filter(x =>
            String(x.status || "").includes("Prioridade")
        ).length;

    const atencao =
        (lista || []).filter(x =>
            String(x.status || "").includes("Atenção")
        ).length;

    return cardTorreAPS(
        icone,
        `${prioridade} 🔴 / ${atencao} 🟡`,
        `${rotulo} em alerta`,
        classeIcone
    );
}

function renderizarTabelaEstratificacaoTorreAPS(lista) {
    if (!lista || !lista.length) {
        return `<p style="color:var(--text-muted);">Sem dados para estratificação.</p>`;
    }

    return `
        <table class="table-sintaxe">
            <thead>
                <tr>
                    <th>Dimensão</th>
                    <th>Status</th>
                    <th>População</th>
                    <th>Críticos</th>
                    <th>Pendências</th>
                    <th>Sem atendimento &gt;180d</th>
                    <th>Score Territorial</th>
                </tr>
            </thead>

            <tbody>
                ${lista.map(g => `
                    <tr>
                        <td>
                            <strong>${escaparTorreAPS(g.nome)}</strong>
                            <small>${escaparTorreAPS(g.tipo)}</small>
                        </td>
                        <td>${escaparTorreAPS(g.status)}</td>
                        <td>${g.populacao}</td>
                        <td>
                            ${g.criticos}
                            <small>${g.taxaCriticos}%</small>
                        </td>
                        <td>
                            ${g.pendencias}
                            <small>${g.taxaPendencias}%</small>
                        </td>
                        <td>${g.semAtendimento180}</td>
                        <td><strong>${g.score}</strong></td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

/* ==========================================================
   PRODUÇÃO APS V2
   ========================================================== */

function calcularProducaoAPSTorreAPS(
    atendimentos,
    interacoes,
    reuniaoCasos,
    solicitacoes
) {
    return {
        profissionais:
            agruparProducaoAtendimentosTorreAPS(
                atendimentos,
                a =>
                    a.usuario_nome ||
                    a.usuario_email ||
                    "Profissional não informado",
                "Profissional"
            ),

        equipes:
            agruparProducaoAtendimentosTorreAPS(
                atendimentos,
                a =>
                    a.equipe_esf ||
                    a.equipe ||
                    "Equipe não informada",
                "Equipe"
            ),

        ubs:
            agruparProducaoAtendimentosTorreAPS(
                atendimentos,
                a =>
                    a.ubs_vinculacao ||
                    a.ubs ||
                    "UBS não informada",
                "UBS"
            ),

        resumo:
            calcularResumoProducaoTorreAPS(
                atendimentos,
                interacoes,
                reuniaoCasos,
                solicitacoes
            )
    };
}

function agruparProducaoAtendimentosTorreAPS(atendimentos, chaveFn, tipo) {
    const grupos = {};

    (atendimentos || []).forEach(a => {
        const chave =
            chaveFn(a) ||
            "Não informado";

        if (!grupos[chave]) {
            grupos[chave] = {
                tipo,
                nome: chave,
                atendimentos: 0,
                has: 0,
                dm: 0,
                gestantes: 0,
                tb: 0,
                hansen: 0,
                criticos: 0,
                ciaps: new Set(),
                produtividade: "🟢 Baixa"
            };
        }

        const g =
            grupos[chave];

        g.atendimentos++;

        if (valorSimTorreAPS(a.has)) g.has++;
        if (valorSimTorreAPS(a.dm)) g.dm++;
        if (valorSimTorreAPS(a.gestante)) g.gestantes++;
        if (valorSimTorreAPS(a.tb)) g.tb++;
        if (valorSimTorreAPS(a.hansen)) g.hansen++;

        if (
            Number(a.reavaliacaoDias ?? a.retorno_dias) === 0 ||
            normalizarTorreAPS(a.risco_global).includes("alto") ||
            Number(a.risco_pontos || 0) >= 6
        ) {
            g.criticos++;
        }

        const ciap =
            a.ciapSelecionado ||
            a.inputBuscaCIAPS ||
            a.ciap ||
            a.avaliacao ||
            "";

        if (ciap) {
            g.ciaps.add(ciap);
        }
    });

    Object.values(grupos).forEach(g => {
        g.ciapsDistintos =
            g.ciaps.size;

        delete g.ciaps;

        if (g.atendimentos >= 80) {
            g.produtividade = "🔵 Alta";
        } else if (g.atendimentos >= 30) {
            g.produtividade = "🟡 Moderada";
        } else {
            g.produtividade = "🟢 Baixa";
        }
    });

    return Object
        .values(grupos)
        .sort((a, b) =>
            b.atendimentos - a.atendimentos ||
            b.criticos - a.criticos
        );
}

function calcularResumoProducaoTorreAPS(
    atendimentos,
    interacoes,
    reuniaoCasos,
    solicitacoes
) {
    const profissionais =
        new Set(
            (atendimentos || [])
                .map(a => a.usuario_nome || a.usuario_email)
                .filter(Boolean)
        ).size;

    const equipes =
        new Set(
            (atendimentos || [])
                .map(a => a.equipe_esf || a.equipe)
                .filter(Boolean)
        ).size;

    const ubs =
        new Set(
            (atendimentos || [])
                .map(a => a.ubs_vinculacao || a.ubs)
                .filter(Boolean)
        ).size;

    return {
        atendimentos: (atendimentos || []).length,
        interacoes: (interacoes || []).length,
        casosDiscutidos: (reuniaoCasos || []).length,
        solicitacoes: (solicitacoes || []).length,
        profissionais,
        equipes,
        ubs
    };
}

function renderizarProducaoAPSTorreAPS(dados) {
    const resumo =
        dados.producaoAPS.resumo;

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">📈 Produção APS</h3>

            <div class="dashboard-grid">
                ${cardTorreAPS("🩺", resumo.atendimentos, "Atendimentos", "icon-blue")}
                ${cardTorreAPS("📞", resumo.interacoes, "Busca ativa", "icon-cyan")}
                ${cardTorreAPS("👥", resumo.casosDiscutidos, "Casos discutidos", "icon-purple")}
                ${cardTorreAPS("📦", resumo.solicitacoes, "Solicitações", "icon-yellow")}
                ${cardTorreAPS("🧑‍⚕️", resumo.profissionais, "Profissionais", "icon-green")}
                ${cardTorreAPS("🏥", resumo.ubs, "UBS com produção", "icon-red")}
            </div>

            <h4>🧑‍⚕️ Produção por Profissional</h4>
            ${renderizarTabelaProducaoTorreAPS(dados.producaoAPS.profissionais.slice(0, 15))}

            <h4>👥 Produção por Equipe</h4>
            ${renderizarTabelaProducaoTorreAPS(dados.producaoAPS.equipes.slice(0, 15))}

            <h4>🏥 Produção por UBS</h4>
            ${renderizarTabelaProducaoTorreAPS(dados.producaoAPS.ubs.slice(0, 15))}
        </div>
    `;
}

function renderizarTabelaProducaoTorreAPS(lista) {
    if (!lista || !lista.length) {
        return `<p style="color:var(--text-muted);">Sem produção no período selecionado.</p>`;
    }

    return `
        <table class="table-sintaxe">
            <thead>
                <tr>
                    <th>Dimensão</th>
                    <th>Produtividade</th>
                    <th>Atendimentos</th>
                    <th>HAS</th>
                    <th>DM</th>
                    <th>Gest.</th>
                    <th>TB</th>
                    <th>Hansen</th>
                    <th>Críticos</th>
                    <th>CIAPs</th>
                </tr>
            </thead>

            <tbody>
                ${lista.map(g => `
                    <tr>
                        <td>
                            <strong>${escaparTorreAPS(g.nome)}</strong>
                            <small>${escaparTorreAPS(g.tipo)}</small>
                        </td>
                        <td>${escaparTorreAPS(g.produtividade)}</td>
                        <td><strong>${g.atendimentos}</strong></td>
                        <td>${g.has}</td>
                        <td>${g.dm}</td>
                        <td>${g.gestantes}</td>
                        <td>${g.tb}</td>
                        <td>${g.hansen}</td>
                        <td>${g.criticos}</td>
                        <td>${g.ciapsDistintos}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}


/* ==========================================================
   HOTSPOTS
   ========================================================== */

function calcularHotspotsTorreAPS(base) {
    const grupos = {};

    base.forEach(p => {
        const chave =
            p.cep ||
            p.bairro ||
            p.ubs ||
            "Território não informado";

        if (!grupos[chave]) {
            grupos[chave] = {
                territorio: chave,
                total: 0,
                criticos: 0,
                pendencias: 0,
                score: 0,
                status: "🟢 Estável"
            };
        }

        const g =
            grupos[chave];

        g.total++;

        const critico =
            Number(p.prazo) === 0 ||
            normalizarTorreAPS(p.risco_global).includes("alto") ||
            Number(p.risco_pontos || 0) >= 6 ||
            p.predicao.score >= 10;

        if (critico) {
            g.criticos++;
            g.score += 5;
        }

        const qtdPendencias =
            p.pendencias?.length || 0;

        g.pendencias +=
            qtdPendencias;

        g.score +=
            qtdPendencias * 2;

        if (valorSimTorreAPS(p.tb)) g.score += 3;
        if (valorSimTorreAPS(p.hansen)) g.score += 3;
        if (valorSimTorreAPS(p.gestante)) g.score += 2;
    });

    Object.values(grupos).forEach(g => {
        if (g.criticos > 0 || g.score >= 50) {
            g.status = "🔴 Prioritário";
        } else if (g.score >= 20) {
            g.status = "🟡 Atenção";
        } else {
            g.status = "🟢 Estável";
        }
    });

    return Object
        .values(grupos)
        .sort((a, b) =>
            b.score - a.score ||
            b.criticos - a.criticos ||
            b.pendencias - a.pendencias ||
            b.total - a.total
        )
        .slice(0, 10);
}

function renderizarHotspotsTorreAPS(dados) {
    if (!dados.hotspots.length) {
        return `
            <div class="form-section">
                <h3 style="margin-top:0;">🔥 Hotspots Territoriais</h3>
                <p style="color:var(--text-muted);">Nenhum hotspot identificado.</p>
            </div>
        `;
    }

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">🔥 Top 10 Hotspots Territoriais APS</h3>

            <table class="table-sintaxe">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Território</th>
                        <th>Status</th>
                        <th>População</th>
                        <th>Críticos</th>
                        <th>Pendências</th>
                        <th>Score</th>
                    </tr>
                </thead>

                <tbody>
                    ${dados.hotspots.map((h, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td><strong>${escaparTorreAPS(h.territorio)}</strong></td>
                            <td>${escaparTorreAPS(h.status)}</td>
                            <td>${h.total}</td>
                            <td>${h.criticos}</td>
                            <td>${h.pendencias}</td>
                            <td><strong>${h.score}</strong></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

/* ==========================================================
   BUSCA ATIVA
   ========================================================== */

function calcularBuscaAtivaTorreAPS(interacoes, base) {
    const total =
        interacoes.length;

    const resolvidos =
        interacoes.filter(i =>
            i.resultado === "Resolvido" ||
            i.resultado === "Agendado" ||
            i.resultado === "Atendido"
        ).length;

    const agendados =
        interacoes.filter(i =>
            i.resultado === "Agendado"
        ).length;

    const naoLocalizados =
        interacoes.filter(i =>
            i.resultado === "Não atendeu" ||
            i.resultado === "Número inválido" ||
            i.resultado === "Necessita nova tentativa"
        ).length;

    const pessoasComContato =
        new Set(
            interacoes
                .map(i =>
                    i.paciente_cpf ||
                    i.cpf ||
                    i.paciente_cns ||
                    i.cns
                )
                .filter(Boolean)
        );

    const semContato =
        base.filter(p =>
            !pessoasComContato.has(p.cpf) &&
            !pessoasComContato.has(p.cns)
        ).length;

    return {
        total,
        resolvidos,
        agendados,
        naoLocalizados,
        semContato,
        efetividade:
            total > 0
                ? Number(((resolvidos / total) * 100).toFixed(1))
                : 0
    };
}

function renderizarBuscaAtivaTorreAPS(dados) {
    return `
        <div class="form-section">
            <h3 style="margin-top:0;">📞 Camada de Busca Ativa</h3>

            <div class="dashboard-grid">
                ${cardTorreAPS("📞", dados.busca.total, "Contatos registrados", "icon-blue")}
                ${cardTorreAPS("✅", dados.busca.resolvidos, "Resolvidos / atendidos", "icon-green")}
                ${cardTorreAPS("📅", dados.busca.agendados, "Agendados", "icon-yellow")}
                ${cardTorreAPS("⚠️", dados.busca.naoLocalizados, "Não localizados", "icon-red")}
                ${cardTorreAPS("📭", dados.busca.semContato, "Sem contato registrado", "icon-purple")}
                ${cardTorreAPS("📊", `${dados.busca.efetividade}%`, "Efetividade", "icon-cyan")}
            </div>
        </div>
    `;
}

/* ==========================================================
   LINHA DO TEMPO COLETIVA
   ========================================================== */

function calcularEventosColetivosTorreAPS(
    atendimentos,
    interacoes,
    reunioes,
    reuniaoCasos,
    solicitacoes
) {
    const eventos = [];

    (atendimentos || []).forEach(a => {
        eventos.push({
            data:
                a.data_atendimento ||
                a.criado_em ||
                a.created_at,
            tipo: "Atendimento"
        });
    });

    (interacoes || []).forEach(i => {
        eventos.push({
            data:
                i.criado_em ||
                i.created_at,
            tipo: "Busca ativa"
        });
    });

    (reunioes || []).forEach(r => {
        eventos.push({
            data:
                r.criado_em ||
                r.created_at ||
                r.data,
            tipo: "Reunião"
        });
    });

    (reuniaoCasos || []).forEach(c => {
        eventos.push({
            data:
                c.created_at ||
                c.criado_em ||
                c.data_reuniao,
            tipo: "Caso em reunião"
        });
    });

    (solicitacoes || []).forEach(s => {
        eventos.push({
            data:
                s.criado_em ||
                s.created_at ||
                s.data_solicitacao,
            tipo: "Material"
        });
    });

    const hoje =
        new Date();

    hoje.setHours(0, 0, 0, 0);

    const emDias =
        (data) => {
            if (!data) return 9999;
            const d = new Date(data);
            if (Number.isNaN(d.getTime())) return 9999;
            return Math.floor((hoje.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        };

    const totalHoje =
        eventos.filter(e => emDias(e.data) === 0).length;

    const total7 =
        eventos.filter(e => emDias(e.data) <= 7).length;

    const total30 =
        eventos.filter(e => emDias(e.data) <= 30).length;

    const porTipo = {};

    eventos.forEach(e => {
        porTipo[e.tipo] =
            (porTipo[e.tipo] || 0) + 1;
    });

    return {
        eventos,
        totalHoje,
        total7,
        total30,
        porTipo
    };
}

function renderizarLinhaTempoColetivaTorreAPS(dados) {
    const tipos =
        Object.entries(dados.eventosColetivos.porTipo || {})
            .sort((a, b) => b[1] - a[1]);

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">🧬 Linha do Tempo Territorial Coletiva</h3>

            <div class="dashboard-grid">
                ${cardTorreAPS("📅", dados.eventosColetivos.totalHoje, "Eventos hoje", "icon-yellow")}
                ${cardTorreAPS("🗓️", dados.eventosColetivos.total7, "Eventos em 7 dias", "icon-purple")}
                ${cardTorreAPS("📆", dados.eventosColetivos.total30, "Eventos em 30 dias", "icon-blue")}
            </div>

            ${tipos.length ? `
                <table class="table-sintaxe">
                    <thead>
                        <tr>
                            <th>Tipo de evento</th>
                            <th>Total</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${tipos.map(([tipo, total]) => `
                            <tr>
                                <td>${escaparTorreAPS(tipo)}</td>
                                <td><strong>${total}</strong></td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            ` : `<p style="color:var(--text-muted);">Sem eventos no período.</p>`}
        </div>
    `;
}

/* ==========================================================
   ESTOQUE
   ========================================================== */

function calcularAlertasEstoqueTorreAPS(estoque, solicitacoes) {
    const baixo =
        estoque.filter(e =>
            Number(e.quantidade_atual || 0) <=
            Number(e.quantidade_minima || 0)
        ).length;

    const vencidos =
        estoque.filter(e =>
            calcularStatusValidadeTorreAPS(e.data_validade) === "VENCIDO"
        ).length;

    const vencem30 =
        estoque.filter(e =>
            calcularStatusValidadeTorreAPS(e.data_validade) === "VENCE_30"
        ).length;

    const pendentes =
        solicitacoes.filter(s =>
            s.status === "PENDENTE"
        ).length;

    return {
        itens: estoque.length,
        baixo,
        vencidos,
        vencem30,
        pendentes
    };
}

function renderizarEstoqueAlertasTorreAPS(dados) {
    return `
        <div class="form-section">
            <h3 style="margin-top:0;">📦 Alertas Operacionais de Estoque</h3>

            <div class="dashboard-grid">
                ${cardTorreAPS("📦", dados.estoqueAlertas.itens, "Itens cadastrados", "icon-blue")}
                ${cardTorreAPS("⚠️", dados.estoqueAlertas.baixo, "Estoque baixo", "icon-yellow")}
                ${cardTorreAPS("⛔", dados.estoqueAlertas.vencidos, "Vencidos", "icon-red")}
                ${cardTorreAPS("📅", dados.estoqueAlertas.vencem30, "Vencem em 30 dias", "icon-purple")}
                ${cardTorreAPS("⏳", dados.estoqueAlertas.pendentes, "Solicitações pendentes", "icon-cyan")}
            </div>
        </div>
    `;
}

/* ==========================================================
   PACIENTES PRIORITÁRIOS
   ========================================================== */

function renderizarTabelaPacientesPrioritariosTorreAPS(lista) {
    return `
        <div class="form-section">
            <h3 style="margin-top:0;">🧠 Ranking Territorial APS</h3>

            ${
                !lista.length
                    ? `<p style="color:var(--text-muted);">Nenhum paciente prioritário identificado.</p>`
                    : `
                        <table class="table-sintaxe">
                            <thead>
                                <tr>
                                    <th>Ordem</th>
                                    <th>Paciente</th>
                                    <th>Equipe</th>
                                    <th>Score Global</th>
                                    <th>Prioridade</th>
                                    <th>Pendências</th>
                                    <th>Ação recomendada</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>

                            <tbody>
                                ${lista.map((p, index) => `
                                    <tr>
                                        <td><strong>${p.ordem_fila || index + 1}</strong></td>

                                        <td>
                                            <strong>${escaparTorreAPS(p.nome || "Sem nome")}</strong>
                                            <small>CPF: ${escaparTorreAPS(p.cpf || "-")} | CNS: ${escaparTorreAPS(p.cns || "-")}</small>
                                        </td>

                                        <td>
                                            ${escaparTorreAPS(p.equipe || "-")}
                                            <small>${escaparTorreAPS(p.ubs || "-")}</small>
                                        </td>

                                        <td>
                                            <strong>${Number(p.score_territorial_global || 0)}</strong>
                                            <small>Predição: ${Number(p.predicao?.score || 0)}</small>
                                        </td>

                                        <td>
                                            <span class="status-badge ${classeBadgePrioridadeTorreAPS(p.nivel_prioridade)}">
                                                ${rotuloPrioridadeTerritorialTorreAPS(p.nivel_prioridade)}
                                            </span>
                                        </td>

                                        <td>
                                            ${
                                                p.pendencias?.length
                                                    ? p.pendencias.map(x =>
                                                        `<span class="status-badge status-warning">${escaparTorreAPS(x)}</span>`
                                                    ).join(" ")
                                                    : `<span style="color:var(--text-muted);">-</span>`
                                            }
                                        </td>

                                        <td>
                                            <small>${escaparTorreAPS(p.acao_recomendada || p.recomendacao_ia || "Acompanhamento conforme rotina APS.")}</small>
                                        </td>

                                        <td>
                                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                                <button
                                                    class="btn-table-action btn-edit"
                                                    onclick="abrirAtendimentoExistente('${escaparTorreAPS(p.cpf || "")}', '${escaparTorreAPS(p.cns || "")}')">
                                                    📋 Prontuário
                                                </button>

                                                <button
                                                    class="btn-table-action btn-ok"
                                                    onclick="abrirLinhaTempoTerritorial('${escaparTorreAPS(p.cpf || "")}', '${escaparTorreAPS(p.cns || "")}')">
                                                    🧬 Linha
                                                </button>

                                                <button
                                                    class="btn-table-action btn-warn"
                                                    onclick="navigate('central-aps'); setTimeout(() => { const campo = document.getElementById('buscaCentralAPS'); if (campo) campo.value='${escaparTorreAPS(p.cpf || p.cns || "")}'; if (typeof aplicarFilaCentralAPS === 'function') aplicarFilaCentralAPS('PENDENCIAS'); }, 400);">
                                                    🧭 Pendências
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    `
            }
        </div>
    `;
}


/* ==========================================================
   PENDÊNCIAS
   ========================================================== */

function identificarPendenciasTorreAPS(p) {
    const pendencias = [];

    if (
        valorSimTorreAPS(p.has) &&
        (!temValorTorreAPS(p.hasPAS) || !temValorTorreAPS(p.hasPAD))
    ) {
        pendencias.push("HAS sem PA");
    }

    if (
        valorSimTorreAPS(p.dm) &&
        !temValorTorreAPS(p.dmHbA1c)
    ) {
        pendencias.push("DM sem HbA1c");
    }

    if (
        valorSimTorreAPS(p.gestante) &&
        diasDesdeTorreAPS(p.ultimo_atendimento) > 30
    ) {
        pendencias.push("Gestante sem consulta recente");
    }

    if (
        valorSimTorreAPS(p.tb) &&
        diasDesdeTorreAPS(p.ultimo_atendimento) > 30
    ) {
        pendencias.push("TB sem acompanhamento");
    }

    if (
        valorSimTorreAPS(p.hansen) &&
        diasDesdeTorreAPS(p.ultimo_atendimento) > 60
    ) {
        pendencias.push("Hanseníase sem avaliação");
    }

    if (Number(p.prazo) === 0) {
        pendencias.push("Retorno vencido");
    }

    return pendencias;
}


/* ==========================================================
   TORRE APS 2.0 — TERRITÓRIO INTELIGENTE
   ========================================================== */

function enriquecerBaseComTerritorioInteligenteTorreAPS(base, territorioInteligente) {
    const mapaTI = new Map();

    (territorioInteligente || []).forEach(t => {
        const chaveCpf =
            limparDocumentoTorreAPS(t.cpf || "");

        const chaveCns =
            String(t.cns || "").trim();

        if (chaveCpf) mapaTI.set(chaveCpf, t);
        if (chaveCns) mapaTI.set(chaveCns, t);
    });

    (base || []).forEach(p => {
        const chaveCpf =
            limparDocumentoTorreAPS(p.cpf || "");

        const chaveCns =
            String(p.cns || "").trim();

        const ti =
            mapaTI.get(chaveCpf) ||
            mapaTI.get(chaveCns);

        if (!ti) {
            p.score_territorial_global = Number(p.score_territorial_global || 0);
            p.nivel_prioridade = p.nivel_prioridade || classificarNivelPrioridadeTorreAPS(p.score_territorial_global);
            p.acao_recomendada = p.acao_recomendada || "Acompanhamento conforme rotina da APS.";
            p.ordem_fila = Number(p.ordem_fila || 0);
            p.score_ia = Number(p.score_territorial_global || p.score_ia || 0);
            return;
        }

        const scoreGlobal =
            Number(
                ti.score_territorial_global ??
                ti.score_geral ??
                0
            );

        p.territorio_inteligente = ti;

        p.score_territorial_global =
            scoreGlobal;

        p.nivel_prioridade =
            ti.nivel_prioridade ||
            classificarNivelPrioridadeTorreAPS(scoreGlobal);

        p.ordem_fila =
            Number(ti.ordem_fila || 0);

        p.acao_recomendada =
            ti.acao_recomendada ||
            ti.recomendacao_ia ||
            gerarAcaoRecomendadaTorreAPS({
                ...p,
                score_territorial_global: scoreGlobal,
                nivel_prioridade: ti.nivel_prioridade
            });

        // Compatibilidade com telas antigas da Torre APS.
        p.score_ia =
            scoreGlobal;

        p.prioridade_ia =
            p.nivel_prioridade;

        p.classe_ia =
            ti.classe_risco ||
            p.nivel_prioridade ||
            "";

        p.recomendacao_ia =
            p.acao_recomendada;

        p.resumo_ia =
            ti.resumo_ia ||
            `${p.nome || "Paciente"}: Score Territorial Global ${scoreGlobal}, prioridade ${p.nivel_prioridade}.`;

        if (Array.isArray(ti.pendencias) && ti.pendencias.length) {
            p.pendencias =
                [...new Set([...(p.pendencias || []), ...ti.pendencias])];
        }
    });

    (base || []).sort((a, b) =>
        Number(b.score_territorial_global || 0) - Number(a.score_territorial_global || 0) ||
        Number(b.predicao?.score || 0) - Number(a.predicao?.score || 0) ||
        (b.pendencias || []).length - (a.pendencias || []).length
    );
}


/* ==========================================================
   CENTRO DE COMANDO
   ========================================================== */

function renderizarCentroComandoTorreAPS(dados) {
    const hasSemPA =
        dados.base.filter(p =>
            valorSimTorreAPS(p.has) &&
            (p.pendencias || []).some(x => normalizarTorreAPS(x).includes("has sem pa"))
        ).length;

    const dmSemHbA1c =
        dados.base.filter(p =>
            valorSimTorreAPS(p.dm) &&
            (p.pendencias || []).some(x => normalizarTorreAPS(x).includes("dm sem hba1c"))
        ).length;

    const gestantesPrioritarias =
        dados.base.filter(p =>
            valorSimTorreAPS(p.gestante) &&
            (
                (p.pendencias || []).some(x => normalizarTorreAPS(x).includes("gestante")) ||
                Number(p.score_ia || 0) >= 60
            )
        ).length;

    const tbPrioritaria =
        dados.base.filter(p =>
            valorSimTorreAPS(p.tb) &&
            (
                (p.pendencias || []).some(x => normalizarTorreAPS(x).includes("tb")) ||
                Number(p.score_ia || 0) >= 60
            )
        ).length;

    const hansenPrioritaria =
        dados.base.filter(p =>
            valorSimTorreAPS(p.hansen) &&
            (
                (p.pendencias || []).some(x => normalizarTorreAPS(x).includes("hansen")) ||
                Number(p.score_ia || 0) >= 60
            )
        ).length;

    const materiaisPendentes =
        dados.estoqueAlertas?.pendentes || 0;

    const alertaGeral =
        dados.criticos + hasSemPA + dmSemHbA1c + gestantesPrioritarias + tbPrioritaria + hansenPrioritaria + materiaisPendentes;

    const status =
        alertaGeral >= 80
            ? "🔴 Operação crítica"
            : alertaGeral >= 30
                ? "🟡 Atenção operacional"
                : "🟢 Operação estável";

    return `
        <div class="form-section" style="border-left:6px solid var(--primary);">
            <div class="section-header">
                <div>
                    <h3 style="margin:0;">🏢 Centro de Comando APS 2.0</h3>
                    <p style="color:var(--text-muted); margin:6px 0 0 0;">
                        Status atual: <strong>${status}</strong>
                    </p>
                </div>

                <div class="button-row">
                    <button class="btn-primary" onclick="carregarTorreControleAPS()">
                        🔄 Atualizar Torre
                    </button>

                    <button class="btn-secondary" onclick="exportarTorreControleAPSCSV()">
                        📤 Exportar CSV
                    </button>

                    <button class="btn-info" onclick="copiarResumoExecutivoTorreAPS()">
                        🧠 Copiar Resumo IA
                    </button>
                </div>
            </div>

            <div class="dashboard-grid">
                ${cardTorreAPS("🚨", dados.criticos, "Pacientes críticos", "icon-red")}
                ${cardTorreAPS("❤️", hasSemPA, "HAS sem PA", "icon-red")}
                ${cardTorreAPS("🍬", dmSemHbA1c, "DM sem HbA1c", "icon-green")}
                ${cardTorreAPS("🤰", gestantesPrioritarias, "Gestantes prioritárias", "icon-yellow")}
                ${cardTorreAPS("🫁", tbPrioritaria, "TB prioritária", "icon-purple")}
                ${cardTorreAPS("🖐️", hansenPrioritaria, "Hanseníase prioritária", "icon-cyan")}
                ${cardTorreAPS("📞", dados.busca.semContato, "Sem busca ativa", "icon-yellow")}
                ${cardTorreAPS("📦", materiaisPendentes, "Materiais pendentes", "icon-blue")}
            </div>
        </div>
    `;
}

/* ==========================================================
   RECOMENDAÇÕES IA EXECUTIVAS
   ========================================================== */

function gerarRecomendacoesExecutivasTorreAPS(base, estoque, solicitacoes, territorioInteligente) {
    const recs = [];

    const criticos =
        base.filter(p =>
            Number(p.score_ia || 0) >= 80 ||
            p.prioridade_ia === "Crítica" ||
            Number(p.predicao?.score || 0) >= 10
        );

    const hasSemPA =
        base.filter(p =>
            valorSimTorreAPS(p.has) &&
            (p.pendencias || []).some(x => normalizarTorreAPS(x).includes("has sem pa"))
        );

    const dmSemHbA1c =
        base.filter(p =>
            valorSimTorreAPS(p.dm) &&
            (p.pendencias || []).some(x => normalizarTorreAPS(x).includes("dm sem hba1c"))
        );

    const gestantes =
        base.filter(p =>
            valorSimTorreAPS(p.gestante) &&
            (
                (p.pendencias || []).some(x => normalizarTorreAPS(x).includes("gestante")) ||
                Number(p.score_ia || 0) >= 60
            )
        );

    const estoqueBaixo =
        (estoque || []).filter(e =>
            Number(e.quantidade_atual || 0) <= Number(e.quantidade_minima || 0)
        );

    const pendentesMaterial =
        (solicitacoes || []).filter(s => s.status === "PENDENTE");

    const equipes =
        agruparEstratificacaoTorreAPS(base, p => p.equipe || "Equipe não informada", "Equipe");

    const equipeCritica =
        equipes.find(e =>
            String(e.status || "").includes("Prioridade") ||
            e.criticos >= 5 ||
            e.pendencias >= 20
        );

    if (criticos.length) {
        recs.push({
            icone: "🚨",
            titulo: "Criar agenda protegida para pacientes críticos",
            impacto: "Alto",
            justificativa: `${criticos.length} paciente(s) com risco crítico ou muito alto.`,
            acao: "Discutir os primeiros casos em reunião rápida da equipe e priorizar contato ativo hoje.",
            tipo: "CRITICOS"
        });
    }

    if (hasSemPA.length) {
        recs.push({
            icone: "❤️",
            titulo: "Mutirão de aferição de PA",
            impacto: "Médio/Alto",
            justificativa: `${hasSemPA.length} hipertenso(s) sem PA registrada.`,
            acao: "Organizar lista por equipe/ACS e atualizar sinais vitais no prontuário.",
            tipo: "HAS"
        });
    }

    if (dmSemHbA1c.length) {
        recs.push({
            icone: "🍬",
            titulo: "Atualizar monitoramento de diabéticos",
            impacto: "Médio/Alto",
            justificativa: `${dmSemHbA1c.length} diabético(s) sem HbA1c registrada.`,
            acao: "Solicitar/registrar HbA1c e revisar adesão terapêutica.",
            tipo: "DM"
        });
    }

    if (gestantes.length) {
        recs.push({
            icone: "🤰",
            titulo: "Busca ativa de gestantes prioritárias",
            impacto: "Alto",
            justificativa: `${gestantes.length} gestante(s) com atraso, pendência ou risco aumentado.`,
            acao: "Validar consulta, exames, vacinação e data provável de parto.",
            tipo: "GESTANTE"
        });
    }

    if (equipeCritica) {
        recs.push({
            icone: "👥",
            titulo: `Priorizar ${equipeCritica.nome}`,
            impacto: "Alto",
            justificativa: `${equipeCritica.criticos} crítico(s), ${equipeCritica.pendencias} pendência(s), score territorial ${equipeCritica.score}.`,
            acao: "Reorganizar agenda da equipe e distribuir lista nominal por prioridade.",
            tipo: "EQUIPE"
        });
    }

    if (estoqueBaixo.length || pendentesMaterial.length) {
        recs.push({
            icone: "📦",
            titulo: "Revisar logística de materiais",
            impacto: "Operacional",
            justificativa: `${estoqueBaixo.length} item(ns) com estoque baixo e ${pendentesMaterial.length} solicitação(ões) pendente(s).`,
            acao: "Conferir itens críticos e autorizar solicitações prioritárias.",
            tipo: "ESTOQUE"
        });
    }

    return recs;
}

function renderizarRecomendacoesIATorreAPS(dados) {
    const recs =
        dados.recomendacoesIA || [];

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">🧠 Recomendações IA Executivas</h3>

            ${
                recs.length
                    ? `<div class="dashboard-grid">
                        ${recs.slice(0, 6).map(r => `
                            <div class="dash-card" style="align-items:flex-start;">
                                <div class="dash-icon icon-purple">${r.icone || "🧠"}</div>
                                <div>
                                    <h3 style="font-size:16px;">${escaparTorreAPS(r.titulo)}</h3>
                                    <p>${escaparTorreAPS(r.justificativa)}</p>
                                    <small style="color:var(--text-muted);">${escaparTorreAPS(r.acao)}</small>
                                </div>
                            </div>
                        `).join("")}
                    </div>`
                    : `<p style="color:var(--text-muted);">Nenhuma recomendação crítica no momento.</p>`
            }
        </div>
    `;
}

/* ==========================================================
   AGENDA INTELIGENTE
   ========================================================== */

function gerarAgendaInteligenteTorreAPS(base, territorioInteligente) {
    const hoje =
        new Date().toISOString().slice(0, 10);

    const agenda = [];

    const baseOrdenada =
        [...(base || [])].sort((a, b) =>
            Number(b.score_territorial_global || 0) - Number(a.score_territorial_global || 0) ||
            Number(b.predicao?.score || 0) - Number(a.predicao?.score || 0) ||
            (b.pendencias || []).length - (a.pendencias || []).length
        );

    const adicionar = (p, tipo, prioridade, motivo, origem) => {
        agenda.push({
            paciente_cpf: p.cpf || "",
            paciente_nome: p.nome || "Sem nome",
            tipo,
            prioridade,
            data_sugerida: hoje,
            motivo,
            origem,
            paciente: p
        });
    };

    baseOrdenada.forEach(p => {
        const score =
            Number(p.score_territorial_global || 0);

        const pendencias =
            p.pendencias || [];

        if (
            score >= 85 ||
            String(p.nivel_prioridade || "").toUpperCase() === "CRITICO"
        ) {
            adicionar(
                p,
                "VISITA_DOMICILIAR",
                "CRITICA",
                p.acao_recomendada || "Paciente com Score Territorial Global crítico.",
                "SCORE_TERRITORIAL_GLOBAL"
            );
        }

        if (
            score >= 65 ||
            pendencias.length >= 2 ||
            Number(p.prazo) === 0
        ) {
            adicionar(
                p,
                "BUSCA_ATIVA",
                score >= 85 ? "CRITICA" : "ALTA",
                pendencias.length ? pendencias.join(", ") : "Alta prioridade territorial.",
                "TORRE_APS"
            );
        }

        if (
            valorSimTorreAPS(p.gestante) &&
            (
                score >= 40 ||
                pendencias.some(x => normalizarTorreAPS(x).includes("gestante"))
            )
        ) {
            adicionar(
                p,
                "PRE_NATAL",
                score >= 65 ? "ALTA" : "MODERADA",
                "Gestante com necessidade de acompanhamento prioritário.",
                "LINHA_CUIDADO_GESTANTE"
            );
        }

        if (
            pendencias.some(x =>
                normalizarTorreAPS(x).includes("vacina") ||
                normalizarTorreAPS(x).includes("imunizacao") ||
                normalizarTorreAPS(x).includes("imunização")
            )
        ) {
            adicionar(
                p,
                "VACINACAO",
                score >= 65 ? "ALTA" : "MODERADA",
                "Pendência vacinal identificada.",
                "PENDENCIAS_ASSISTENCIAIS"
            );
        }

        if (
            score >= 65 &&
            !valorSimTorreAPS(p.gestante) &&
            !pendencias.some(x => normalizarTorreAPS(x).includes("visita"))
        ) {
            adicionar(
                p,
                "CONSULTA",
                score >= 85 ? "CRITICA" : "ALTA",
                "Consulta prioritária por risco clínico-territorial.",
                "SCORE_TERRITORIAL_GLOBAL"
            );
        }
    });

    return agenda
        .slice(0, 40)
        .map((item, index) => {
            const hora =
                8 + Math.floor(index / 2);

            const minuto =
                index % 2 === 0 ? "00" : "30";

            return {
                ...item,
                horario: `${String(hora).padStart(2, "0")}:${minuto}`
            };
        });
}


function renderizarAgendaInteligenteTorreAPS(dados) {
    const agenda =
        dados.agendaSugerida || [];

    const buscaAtiva =
        agenda.filter(a => a.tipo === "BUSCA_ATIVA").length;

    const visitas =
        agenda.filter(a => a.tipo === "VISITA_DOMICILIAR").length;

    const consultas =
        agenda.filter(a => a.tipo === "CONSULTA").length;

    const gestantes =
        agenda.filter(a => a.tipo === "PRE_NATAL").length;

    const criticos =
        agenda.filter(a => a.prioridade === "CRITICA").length;

    return `
        <div class="form-section">
            <div class="section-header">
                <div>
                    <h3 style="margin:0;">🗓 Agenda Inteligente APS</h3>
                    <p style="color:var(--text-muted); margin:6px 0 0 0;">
                        Sugestão automática baseada no Score Territorial Global, EVFAM, pendências e linhas de cuidado.
                    </p>
                </div>

                <button class="btn-secondary" onclick="exportarAgendaInteligenteTorreAPSCSV()">
                    📤 Exportar Agenda
                </button>
            </div>

            <div class="dashboard-grid">
                ${cardTorreAPS("📞", buscaAtiva, "Busca Ativa Hoje", "icon-blue")}
                ${cardTorreAPS("🏠", visitas, "Visitas Hoje", "icon-green")}
                ${cardTorreAPS("🩺", consultas, "Consultas Prioritárias", "icon-purple")}
                ${cardTorreAPS("🤰", gestantes, "Gestantes", "icon-yellow")}
                ${cardTorreAPS("🚨", criticos, "Casos Críticos", "icon-red")}
            </div>

            ${
                agenda.length
                    ? `<table class="table-sintaxe">
                        <thead>
                            <tr>
                                <th>Horário</th>
                                <th>Tipo</th>
                                <th>Paciente</th>
                                <th>Equipe / UBS</th>
                                <th>Prioridade</th>
                                <th>Score</th>
                                <th>Motivo</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${agenda.map(item => {
                                const p = item.paciente || {};
                                return `
                                    <tr>
                                        <td><strong>${item.horario || "-"}</strong></td>
                                        <td><strong>${formatarTipoAgendaTorreAPS(item.tipo)}</strong></td>
                                        <td>
                                            <strong>${escaparTorreAPS(item.paciente_nome || p.nome || "Sem nome")}</strong>
                                            <small>CPF: ${escaparTorreAPS(item.paciente_cpf || p.cpf || "-")} | CNS: ${escaparTorreAPS(p.cns || "-")}</small>
                                        </td>
                                        <td>
                                            ${escaparTorreAPS(p.equipe || "-")}
                                            <small>${escaparTorreAPS(p.ubs || "-")}</small>
                                        </td>
                                        <td>
                                            <span class="status-badge ${classeBadgePrioridadeTorreAPS(item.prioridade)}">
                                                ${escaparTorreAPS(item.prioridade || p.nivel_prioridade || "Prioridade")}
                                            </span>
                                        </td>
                                        <td>
                                            <strong>${Number(p.score_territorial_global || 0)}</strong>
                                            <small>${escaparTorreAPS(p.nivel_prioridade || "")}</small>
                                        </td>
                                        <td><small>${escaparTorreAPS(item.motivo || "-")}</small></td>
                                        <td>
                                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                                <button class="btn-table-action btn-edit" onclick="abrirAtendimentoExistente('${escaparTorreAPS(p.cpf || "")}', '${escaparTorreAPS(p.cns || "")}')">
                                                    📋 Prontuário
                                                </button>
                                                <button class="btn-table-action btn-ok" onclick="abrirLinhaTempoTerritorial('${escaparTorreAPS(p.cpf || "")}', '${escaparTorreAPS(p.cns || "")}')">
                                                    🧬 Linha
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join("")}
                        </tbody>
                    </table>`
                    : `<p style="color:var(--text-muted);">Nenhum paciente prioritário para agenda automática.</p>`
            }
        </div>
    `;
}


function copiarResumoExecutivoTorreAPS() {
    const dados =
        calcularDadosTorreControleAPS(
            aplicarFiltrosTorreControleAPS(torreControleAPSAtual.base || []),
            obterFiltrosTorreControleAPS()
        );

    const agenda =
        dados.agendaSugerida || [];

    const visitas =
        agenda.filter(a => a.tipo === "VISITA_DOMICILIAR").length;

    const buscas =
        agenda.filter(a => a.tipo === "BUSCA_ATIVA").length;

    const gestantes =
        agenda.filter(a => a.tipo === "PRE_NATAL").length;

    const texto =
        [
            "🧠 Bom dia.",
            "",
            "Existem:",
            "",
            `• ${dados.criticos} pacientes críticos`,
            `• ${buscas} buscas ativas`,
            `• ${visitas} visitas domiciliares prioritárias`,
            `• ${gestantes} gestantes em acompanhamento prioritário`,
            `• ${dados.pendencias} pendências clínicas`,
            "",
            "Deseja gerar a Agenda Inteligente APS?",
            "",
            "Recomendações executivas:",
            ...(dados.recomendacoesIA || []).map(r => `- ${r.titulo}: ${r.acao}`)
        ].join("\n");

    if (navigator.clipboard) {
        navigator.clipboard.writeText(texto);
        mostrarToast?.("🧠 Resumo executivo copiado.");
    } else {
        alert(texto);
    }
}


function exportarAgendaInteligenteTorreAPSCSV() {
    const agenda =
        torreControleAPSAtual.agendaSugerida || [];

    if (!agenda.length) {
        mostrarToast?.("Nenhuma agenda para exportar.");
        return;
    }

    const linhas = [
        ["horario", "data_sugerida", "tipo", "nome", "cpf", "cns", "equipe", "ubs", "prioridade", "score_territorial_global", "motivo", "origem"]
    ];

    agenda.forEach(item => {
        const p = item.paciente || {};

        linhas.push([
            item.horario || "",
            item.data_sugerida || "",
            item.tipo || "",
            item.paciente_nome || p.nome || "",
            item.paciente_cpf || p.cpf || "",
            p.cns || "",
            p.equipe || "",
            p.ubs || "",
            item.prioridade || p.nivel_prioridade || "",
            p.score_territorial_global || 0,
            item.motivo || "",
            item.origem || ""
        ]);
    });

    const csv =
        linhas
            .map(linha =>
                linha
                    .map(campo => `"${String(campo ?? "").replace(/"/g, '""')}"`)
                    .join(";")
            )
            .join("\n");

    const blob =
        new Blob([csv], { type: "text/csv;charset=utf-8;" });

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href =
        url;

    a.download =
        `agenda_inteligente_aps_${new Date().toISOString().slice(0, 10)}.csv`;

    a.click();

    URL.revokeObjectURL(url);
}



/* ==========================================================
   COMPONENTES
   ========================================================== */

function cardTorreAPS(icone, valor, rotulo, classeIcone = "") {
    return `
        <div class="dash-card">
            <div class="dash-icon ${classeIcone}">${icone}</div>
            <div>
                <h3>${valor ?? 0}</h3>
                <p>${rotulo}</p>
            </div>
        </div>
    `;
}

/* ==========================================================
   EXPORTAÇÃO
   ========================================================== */

function exportarTorreControleAPSCSV() {
    const base =
        aplicarFiltrosTorreControleAPS(
            torreControleAPSAtual.base || []
        );

    if (!base.length) {
        mostrarToast?.("⚠️ Nenhum dado para exportar.");
        return;
    }

    const linhas = [
        [
            "nome",
            "cpf",
            "cns",
            "ubs",
            "equipe",
            "has",
            "dm",
            "gestante",
            "tb",
            "hansen",
            "risco_global",
            "risco_pontos",
            "prazo",
            "score_predicao",
            "classe_predicao",
            "pendencias",
            "score_territorial_paciente"
        ]
    ];

    base.forEach(p => {
        linhas.push([
            p.nome,
            p.cpf,
            p.cns,
            p.ubs,
            p.equipe,
            p.has,
            p.dm,
            p.gestante,
            p.tb,
            p.hansen,
            p.risco_global,
            p.risco_pontos,
            p.prazo,
            p.predicao.score,
            p.predicao.classe,
            (p.pendencias || []).join(" | "),
            calcularScoreTerritorialPacienteTorreAPS(p)
        ]);
    });

    const csv =
        linhas
            .map(linha =>
                linha
                    .map(campo =>
                        `"${String(campo ?? "").replace(/"/g, '""')}"`
                    )
                    .join(";")
            )
            .join("\n");

    const blob =
        new Blob(
            [csv],
            {
                type: "text/csv;charset=utf-8;"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href =
        url;

    a.download =
        `torre_controle_aps_${new Date().toISOString().slice(0, 10)}.csv`;

    a.click();

    URL.revokeObjectURL(url);
}


/* ==========================================================
   SCORE TERRITORIAL GLOBAL — HELPERS DA TORRE APS
   ========================================================== */

function classificarNivelPrioridadeTorreAPS(score) {
    const valor = Number(score || 0);

    if (valor >= 85) return "CRITICO";
    if (valor >= 65) return "ALTO";
    if (valor >= 40) return "MODERADO";
    return "BAIXO";
}

function gerarAcaoRecomendadaTorreAPS(p) {
    const score = Number(p.score_territorial_global || 0);

    if (score >= 85) {
        return "Visita domiciliar prioritária, busca ativa hoje e discussão em reunião de equipe.";
    }

    if (score >= 65) {
        return "Busca ativa e consulta prioritária com revisão das pendências assistenciais.";
    }

    if (score >= 40) {
        return "Monitoramento programado pela equipe e atualização do plano de cuidado.";
    }

    return "Acompanhamento conforme rotina da APS.";
}

function rotuloPrioridadeTerritorialTorreAPS(prioridade) {
    const p = String(prioridade || "").toUpperCase();

    if (p === "CRITICO" || p === "CRITICA") return "🔴 CRÍTICO";
    if (p === "ALTO" || p === "ALTA") return "🟠 ALTO";
    if (p === "MODERADO" || p === "MODERADA") return "🟡 MODERADO";
    return "🟢 BAIXO";
}

function classeBadgePrioridadeTorreAPS(prioridade) {
    const p = String(prioridade || "").toUpperCase();

    if (p === "CRITICO" || p === "CRITICA") return "status-danger";
    if (p === "ALTO" || p === "ALTA") return "status-warning";
    if (p === "MODERADO" || p === "MODERADA") return "status-info";
    return "status-success";
}

function formatarTipoAgendaTorreAPS(tipo) {
    const t = String(tipo || "").toUpperCase();

    if (t === "BUSCA_ATIVA") return "📞 Busca ativa";
    if (t === "VISITA_DOMICILIAR") return "🏠 Visita domiciliar";
    if (t === "CONSULTA") return "🩺 Consulta";
    if (t === "PRE_NATAL") return "🤰 Pré-natal";
    if (t === "VACINACAO") return "💉 Vacinação";
    if (t === "ENTREGA_MATERIAL") return "📦 Entrega de material";

    return escaparTorreAPS(tipo || "Agenda");
}

/* ==========================================================
   HELPERS
   ========================================================== */

function valorSimTorreAPS(valor) {
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

function normalizarTorreAPS(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function temValorTorreAPS(valor) {
    return (
        valor !== null &&
        valor !== undefined &&
        String(valor).trim() !== ""
    );
}

function obterPrimeiroValorTorreAPS(...valores) {
    for (const valor of valores) {
        if (temValorTorreAPS(valor)) {
            return valor;
        }
    }

    return null;
}

function diasDesdeTorreAPS(data) {
    if (!data) return 9999;

    const d =
        new Date(data);

    if (Number.isNaN(d.getTime())) {
        return 9999;
    }

    return Math.floor(
        (Date.now() - d.getTime()) /
        (1000 * 60 * 60 * 24)
    );
}

function calcularStatusValidadeTorreAPS(dataValidade) {
    if (!dataValidade) return "SEM_VALIDADE";

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

    if (diffDias < 0) return "VENCIDO";
    if (diffDias <= 30) return "VENCE_30";

    return "VALIDO";
}

function limparDocumentoTorreAPS(valor) {
    return String(valor || "")
        .replace(/\D/g, "");
}

function limparCEPTorreAPS(valor) {
    return String(valor || "")
        .replace(/\D/g, "")
        .replace(/^(\d{5})(\d{3})$/, "$1-$2");
}

function setTextoTorreAPS(id, valor) {
    const el =
        document.getElementById(id);

    if (el) {
        el.innerText =
            valor;
    }
}

function escaparTorreAPS(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/* ==========================================================
   GLOBAL
   ========================================================== */

window.carregarTorreControleAPS = carregarTorreControleAPS;
window.renderizarTorreControleAPS = renderizarTorreControleAPS;
window.exportarTorreControleAPSCSV = exportarTorreControleAPSCSV;
window.calcularEstratificacaoTerritorialTorreAPS = calcularEstratificacaoTerritorialTorreAPS;
window.calcularProducaoAPSTorreAPS = calcularProducaoAPSTorreAPS;
window.calcularScoreTerritorialPacienteTorreAPS = calcularScoreTerritorialPacienteTorreAPS;
window.torreControleAPSAtual = torreControleAPSAtual;
window.copiarResumoExecutivoTorreAPS = copiarResumoExecutivoTorreAPS;
window.exportarAgendaInteligenteTorreAPSCSV = exportarAgendaInteligenteTorreAPSCSV;
window.gerarAgendaInteligenteTorreAPS = gerarAgendaInteligenteTorreAPS;
window.gerarRecomendacoesExecutivasTorreAPS = gerarRecomendacoesExecutivasTorreAPS;
window.classificarNivelPrioridadeTorreAPS = classificarNivelPrioridadeTorreAPS;
window.gerarAcaoRecomendadaTorreAPS = gerarAcaoRecomendadaTorreAPS;
