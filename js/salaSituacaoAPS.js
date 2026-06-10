/* ==========================================================
   🏢 SALA DE SITUAÇÃO APS 3.0 — SINTAXEHUB
   Centro de Comando Populacional da Atenção Primária

   Versão Cognitiva:
   - Score Territorial Global
   - Território Inteligente
   - Agenda Inteligente APS
   - Motor Cognitivo APS / inteligencia_aps
   - CIAP-2 + CIPE
   - Torre APS compatível
   - Supabase-first
   ========================================================== */

let salaSituacaoAPSAtual = {
    pacientes: [],
    atendimentos: [],
    interacoes: [],
    reunioes: [],
    reuniaoCasos: [],
    estoque: [],
    solicitacoes: [],
    territorio: [],
    agendaAPS: [],
    inteligencia: [],
    base: [],
    dados: null,
    ultimaAtualizacao: null
};

/* ==========================================================
   CARREGAMENTO PRINCIPAL
   ========================================================== */

async function carregarSalaSituacaoAPS() {
    const container =
        document.getElementById("conteudoSalaSituacaoAPS");

    if (!container) return;

    if (typeof supabaseClient === "undefined") {
        container.innerHTML =
            `<p style="color:var(--danger);">Supabase não carregado.</p>`;
        return;
    }

    container.innerHTML =
        `<p style="color:var(--text-muted);">Carregando Sala de Situação APS Cognitiva...</p>`;

    try {
        const filtros =
            obterFiltrosSalaSituacaoAPS();

        const [
            pacientes,
            atendimentos,
            interacoes,
            reunioes,
            reuniaoCasos,
            estoque,
            solicitacoes,
            territorio,
            agendaAPS,
            inteligencia
        ] = await Promise.all([
            buscarTabelaSalaAPS("pacientes", "*", null, 15000),
            buscarTabelaSalaAPS("atendimentos", "*", filtros, 40000, "data_atendimento"),
            buscarTabelaSalaAPS("interacoes_busca_ativa", "*", filtros, 30000, "criado_em"),
            buscarTabelaSalaAPS("reunioes", "*", filtros, 3000, "criado_em"),
            buscarTabelaSalaAPS("reuniao_casos", "*", filtros, 15000, "created_at"),
            buscarTabelaSalaAPS("estoque_itens", "*", null, 15000),
            buscarTabelaSalaAPS("solicitacoes_materiais", "*", filtros, 15000, "criado_em"),
            buscarTabelaSalaAPS("territorio_inteligente", "*", null, 50000, "ultima_atualizacao"),
            buscarTabelaSalaAPS("agenda_aps", "*", null, 50000, "created_at"),
            buscarTabelaSalaAPS("inteligencia_aps", "*", null, 5000, "created_at")
        ]);

        const base =
            consolidarBaseSalaSituacaoAPS(
                pacientes,
                atendimentos
            );

        enriquecerBaseComTerritorioSalaAPS(base, territorio);
        enriquecerBaseComAgendaSalaAPS(base, agendaAPS);

        salaSituacaoAPSAtual = {
            pacientes,
            atendimentos,
            interacoes,
            reunioes,
            reuniaoCasos,
            estoque,
            solicitacoes,
            territorio,
            agendaAPS,
            inteligencia,
            base,
            dados: null,
            ultimaAtualizacao: new Date().toISOString()
        };

        carregarFiltrosSalaSituacaoAPS(base);
        renderizarSalaSituacaoAPS();

    } catch (erro) {
        console.error("Erro na Sala de Situação APS Cognitiva:", erro);

        container.innerHTML =
            `<p style="color:var(--danger);">Erro ao carregar Sala de Situação APS.</p>`;
    }
}

/* ==========================================================
   BUSCAS
   ========================================================== */

async function buscarTabelaSalaAPS(
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
            console.warn(`Sala APS: tabela indisponível: ${tabela}`, error.message || error);
            return [];
        }

        return data || [];

    } catch (erro) {
        console.warn(`Sala APS: falha ao buscar ${tabela}`, erro);
        return [];
    }
}

/* ==========================================================
   FILTROS
   ========================================================== */

function obterFiltrosSalaSituacaoAPS() {
    return {
        inicio:
            document.getElementById("salaDataInicio")?.value || "",

        fim:
            document.getElementById("salaDataFim")?.value || "",

        equipe:
            document.getElementById("salaFiltroEquipe")?.value || "TODAS",

        ubs:
            document.getElementById("salaFiltroUBS")?.value || "TODAS",

        prioridade:
            document.getElementById("salaFiltroPrioridade")?.value || "TODAS",

        linha:
            document.getElementById("salaFiltroLinha")?.value || "TODAS"
    };
}

function carregarFiltrosSalaSituacaoAPS(base) {
    preencherSelectSalaAPS(
        "salaFiltroEquipe",
        base.map(p => p.equipe || "Não informado"),
        "Todas as equipes"
    );

    preencherSelectSalaAPS(
        "salaFiltroUBS",
        base.map(p => p.ubs || "Não informado"),
        "Todas as UBS"
    );
}

function preencherSelectSalaAPS(id, valores, rotulo) {
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

function aplicarFiltrosSalaSituacaoAPS(base) {
    const filtros =
        obterFiltrosSalaSituacaoAPS();

    return (base || []).filter(p => {
        if (
            filtros.equipe !== "TODAS" &&
            String(p.equipe || "Não informado") !== filtros.equipe
        ) {
            return false;
        }

        if (
            filtros.ubs !== "TODAS" &&
            String(p.ubs || "Não informado") !== filtros.ubs
        ) {
            return false;
        }

        if (filtros.prioridade !== "TODAS") {
            const nivel =
                String(p.nivel_prioridade || p.prioridade_ia || "")
                    .toUpperCase();

            if (filtros.prioridade === "CRITICO" && nivel !== "CRITICO") return false;
            if (filtros.prioridade === "ALTO" && nivel !== "ALTO") return false;
            if (filtros.prioridade === "MODERADO" && nivel !== "MODERADO") return false;
            if (filtros.prioridade === "BAIXO" && nivel !== "BAIXO") return false;
        }

        if (filtros.linha !== "TODAS") {
            if (filtros.linha === "HAS" && !valorSimSalaAPS(p.has)) return false;
            if (filtros.linha === "DM" && !valorSimSalaAPS(p.dm)) return false;
            if (filtros.linha === "GESTANTE" && !valorSimSalaAPS(p.gestante)) return false;
            if (filtros.linha === "TB" && !valorSimSalaAPS(p.tb)) return false;
            if (filtros.linha === "HANSEN" && !valorSimSalaAPS(p.hansen)) return false;
        }

        return true;
    });
}

/* ==========================================================
   CONSOLIDAÇÃO
   ========================================================== */

function consolidarBaseSalaSituacaoAPS(pacientes, atendimentos) {
    let base;

    if (typeof consolidarBaseTorreAPS === "function") {
        base =
            consolidarBaseTorreAPS(pacientes, atendimentos);
    } else {
        base =
            consolidarBaseSalaSituacaoFallbackAPS(pacientes, atendimentos);
    }

    return (base || []).map(p => ({
        ...p,
        score_territorial_global:
            Number(p.score_territorial_global || p.score_ia || p.score_geral || 0),

        nivel_prioridade:
            p.nivel_prioridade ||
            classificarNivelPrioridadeSalaAPS(
                Number(p.score_territorial_global || p.score_ia || p.score_geral || 0)
            ),

        acao_recomendada:
            p.acao_recomendada ||
            p.recomendacao_ia ||
            "",

        pendencias:
            Array.isArray(p.pendencias)
                ? p.pendencias
                : identificarPendenciasSalaAPS(p),

        predicao:
            p.predicao ||
            calcularPredicaoPacienteSalaAPS(p)
    }));
}

function consolidarBaseSalaSituacaoFallbackAPS(pacientes, atendimentos) {
    const mapa =
        new Map();

    (pacientes || []).forEach(p => {
        const chave =
            limparDocumentoSalaAPS(p.cpf || "") ||
            limparDocumentoSalaAPS(p.cns || "") ||
            p.id;

        if (!chave) return;

        mapa.set(chave, {
            id: p.id || "",
            nome: p.nome || "",
            cpf: limparDocumentoSalaAPS(p.cpf || ""),
            cns: limparDocumentoSalaAPS(p.cns || ""),
            telefone: p.telefone || "",
            cep: limparCEPSalaAPS(p.cep || ""),
            bairro: p.bairro || "Bairro não informado",
            cidade: p.cidade || "",
            ubs: p.ubs_vinculacao || p.ubs || "Não informado",
            equipe: p.equipe_esf || p.equipe || "Não informado",

            has: p.has || "Não",
            dm: p.dm || "Não",
            gestante: p.gestante || "Não",
            tb: p.tb || "Não",
            hansen: p.hansen || "Não",

            risco_global: p.risco_global || "Não informado",
            risco_pontos: Number(p.risco_pontos || 0),
            prazo: p.reavaliacaoDias ?? null,
            ultimo_atendimento: null,

            hasPAS: null,
            hasPAD: null,
            dmHbA1c: null,

            pendencias: [],
            predicao: { score: 0, classe: "Baixo risco preditivo", fatores: [] }
        });
    });

    (atendimentos || []).forEach(a => {
        const chave =
            limparDocumentoSalaAPS(a.paciente_cpf || "") ||
            limparDocumentoSalaAPS(a.cpf || "") ||
            limparDocumentoSalaAPS(a.cns || "");

        if (!chave) return;

        const atual =
            mapa.get(chave) || {
                id: "",
                nome: a.nome_paciente || "",
                cpf: limparDocumentoSalaAPS(a.paciente_cpf || a.cpf || ""),
                cns: limparDocumentoSalaAPS(a.cns || ""),
                telefone: a.telefone || "",
                cep: limparCEPSalaAPS(a.cep || ""),
                bairro: a.bairro || "Bairro não informado",
                cidade: "",
                ubs: a.ubs_vinculacao || a.ubs || "Não informado",
                equipe: a.equipe_esf || a.equipe || "Não informado",
                has: "Não",
                dm: "Não",
                gestante: "Não",
                tb: "Não",
                hansen: "Não",
                risco_global: "Não informado",
                risco_pontos: 0,
                prazo: null,
                ultimo_atendimento: null,
                hasPAS: null,
                hasPAD: null,
                dmHbA1c: null,
                pendencias: [],
                predicao: { score: 0, classe: "Baixo risco preditivo", fatores: [] }
            };

        if (!atual.nome) atual.nome = a.nome_paciente || a.nome || "";

        if (valorSimSalaAPS(a.has)) atual.has = "Sim";
        if (valorSimSalaAPS(a.dm)) atual.dm = "Sim";
        if (valorSimSalaAPS(a.gestante)) atual.gestante = "Sim";
        if (valorSimSalaAPS(a.tb)) atual.tb = "Sim";
        if (valorSimSalaAPS(a.hansen)) atual.hansen = "Sim";

        atual.risco_global =
            a.risco_global ||
            atual.risco_global;

        atual.risco_pontos =
            Number(a.risco_pontos ?? atual.risco_pontos ?? 0);

        atual.prazo =
            a.reavaliacaoDias ??
            a.retorno_dias ??
            atual.prazo;

        atual.ultimo_atendimento =
            a.data_atendimento ||
            a.criado_em ||
            a.created_at ||
            atual.ultimo_atendimento;

        atual.hasPAS =
            primeiroValorSalaAPS(a.objPAS, a.obj_pas, a.hasPAS, a.has_pas, atual.hasPAS);

        atual.hasPAD =
            primeiroValorSalaAPS(a.objPAD, a.obj_pad, a.hasPAD, a.has_pad, atual.hasPAD);

        atual.dmHbA1c =
            primeiroValorSalaAPS(a.dmHbA1c, a.dm_hba1c, a.hba1c, atual.dmHbA1c);

        atual.inputBuscaCIAPS =
            a.inputBuscaCIAPS ||
            a.ciap ||
            atual.inputBuscaCIAPS ||
            "";

        atual.inputBuscaCIPE =
            a.inputBuscaCIPE ||
            atual.inputBuscaCIPE ||
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
                identificarPendenciasSalaAPS(p),

            predicao:
                calcularPredicaoPacienteSalaAPS(p)
        }));
}

function enriquecerBaseComTerritorioSalaAPS(base, territorio) {
    const mapa =
        new Map();

    (territorio || []).forEach(t => {
        const chave =
            limparDocumentoSalaAPS(t.cpf || "") ||
            limparDocumentoSalaAPS(t.cns || "");

        if (chave) {
            mapa.set(chave, t);
        }
    });

    (base || []).forEach(p => {
        const chave =
            limparDocumentoSalaAPS(p.cpf || "") ||
            limparDocumentoSalaAPS(p.cns || "");

        const ti =
            mapa.get(chave);

        if (!ti) return;

        p.territorio_inteligente = ti;

        p.score_territorial_global =
            Number(
                ti.score_territorial_global ??
                ti.score_geral ??
                p.score_territorial_global ??
                0
            );

        p.nivel_prioridade =
            ti.nivel_prioridade ||
            normalizarNivelPrioridadeSalaAPS(ti.prioridade) ||
            classificarNivelPrioridadeSalaAPS(p.score_territorial_global);

        p.ordem_fila =
            Number(ti.ordem_fila || 0);

        p.acao_recomendada =
            ti.acao_recomendada ||
            ti.recomendacao_ia ||
            p.acao_recomendada ||
            "";

        p.resumo_ia =
            ti.resumo_ia ||
            p.resumo_ia ||
            "";

        p.recomendacao_ia =
            ti.recomendacao_ia ||
            p.recomendacao_ia ||
            "";

        p.evfam_total =
            Number(ti.evfam_total || 0);

        p.evfam_classificacao =
            ti.evfam_classificacao || "";

        p.visita_domiciliar_indicada =
            ti.visita_domiciliar_indicada;

        p.tipo_visita_sugerida =
            ti.tipo_visita_sugerida || "";

        p.prazo_visita_dias =
            ti.prazo_visita_dias ?? null;

        p.score_clinico =
            Number(ti.score_clinico || 0);

        p.score_assistencial =
            Number(ti.score_assistencial || 0);

        p.score_social =
            Number(ti.score_social || 0);

        p.score_domiciliar =
            Number(ti.score_domiciliar || 0);

        p.score_territorial =
            Number(ti.score_territorial || 0);

        if (Array.isArray(ti.pendencias) && ti.pendencias.length) {
            p.pendencias =
                [...new Set([...(p.pendencias || []), ...ti.pendencias])];
        }

        if (Array.isArray(ti.fatores)) {
            p.fatores =
                ti.fatores;
        }

        if (Array.isArray(ti.vulnerabilidades)) {
            p.vulnerabilidades =
                ti.vulnerabilidades;
        }
    });
}

function enriquecerBaseComAgendaSalaAPS(base, agendaAPS) {
    const mapa =
        new Map();

    (agendaAPS || []).forEach(a => {
        const chave =
            limparDocumentoSalaAPS(a.paciente_cpf || "");

        if (!chave) return;

        if (!mapa.has(chave)) {
            mapa.set(chave, []);
        }

        mapa.get(chave).push(a);
    });

    (base || []).forEach(p => {
        const chave =
            limparDocumentoSalaAPS(p.cpf || "");

        p.agenda_aps =
            mapa.get(chave) || [];
    });
}

/* ==========================================================
   RENDERIZAÇÃO PRINCIPAL
   ========================================================== */

function renderizarSalaSituacaoAPS() {
    const container =
        document.getElementById("conteudoSalaSituacaoAPS");

    if (!container) return;

    const filtros =
        obterFiltrosSalaSituacaoAPS();

    const base =
        aplicarFiltrosSalaSituacaoAPS(
            salaSituacaoAPSAtual.base || []
        );

    const dados =
        calcularDadosSalaSituacaoAPS(
            base,
            filtros
        );

    salaSituacaoAPSAtual.dados =
        dados;

    atualizarCardsSalaSituacaoAPS(dados);

    container.innerHTML = `
        ${renderizarCabecalhoCognitivoSalaAPS(dados)}

        ${renderizarResumoExecutivoCognitivoSalaAPS(dados)}

        ${renderizarIndicadoresExecutivosSalaAPS(dados)}

        ${renderizarGestaoRiscoGlobalSalaAPS(dados)}

        ${renderizarAgendaInteligenteSalaAPS(dados)}

        ${renderizarRankingPacientesCriticosSalaAPS(dados)}

        ${renderizarDiagnosticosEnfermagemCIPESalaAPS(dados)}

        ${renderizarInteligenciaTerritorialSalaAPS(dados)}

        ${renderizarRecomendacoesCognitivasSalaAPS(dados)}

        ${renderizarProducaoSalaAPS(dados)}

        ${renderizarEstoqueSalaAPS(dados)}
    `;
}

/* ==========================================================
   CÁLCULO GERAL
   ========================================================== */

function calcularDadosSalaSituacaoAPS(base, filtros) {
    const atendimentos =
        filtrarListaSalaAPS(
            salaSituacaoAPSAtual.atendimentos,
            filtros
        );

    const interacoes =
        filtrarListaSalaAPS(
            salaSituacaoAPSAtual.interacoes,
            filtros
        );

    const reuniaoCasos =
        filtrarListaSalaAPS(
            salaSituacaoAPSAtual.reuniaoCasos,
            filtros
        );

    const solicitacoes =
        salaSituacaoAPSAtual.solicitacoes || [];

    const estoque =
        salaSituacaoAPSAtual.estoque || [];

    const agendaAPS =
        filtrarAgendaSalaAPS(
            salaSituacaoAPSAtual.agendaAPS || [],
            filtros
        );

    const inteligencia =
        salaSituacaoAPSAtual.inteligencia || [];

    const criticos =
        base.filter(p =>
            ehCriticoSalaAPS(p)
        );

    const altos =
        base.filter(p =>
            Number(p.score_territorial_global || 0) >= 65 &&
            Number(p.score_territorial_global || 0) < 85
        );

    const moderados =
        base.filter(p =>
            Number(p.score_territorial_global || 0) >= 40 &&
            Number(p.score_territorial_global || 0) < 65
        );

    const baixos =
        base.filter(p =>
            Number(p.score_territorial_global || 0) < 40
        );

    const pendencias =
        base.reduce(
            (total, p) =>
                total + (p.pendencias?.length || 0),
            0
        );

    const retornosVencidos =
        base.filter(p => Number(p.prazo) === 0).length;

    const scoreMedio =
        base.length
            ? Math.round(
                base.reduce(
                    (soma, p) =>
                        soma + Number(p.score_territorial_global || 0),
                    0
                ) / base.length
            )
            : 0;

    const agendaResumo =
        calcularResumoAgendaSalaAPS(agendaAPS);

    const territorios =
        calcularRankingTerritorialSalaAPS(base);

    const producao =
        calcularProducaoSalaAPS(
            atendimentos,
            interacoes,
            reuniaoCasos,
            solicitacoes
        );

    const estoqueAlertas =
        calcularEstoqueAlertasSalaAPS(
            estoque,
            solicitacoes
        );

    const diagnosticosCIPE =
        calcularDiagnosticosCIPESalaAPS(atendimentos);

    const recomendacoes =
        gerarRecomendacoesSalaAPS({
            base,
            atendimentos,
            interacoes,
            reuniaoCasos,
            solicitacoes,
            estoque,
            territorios,
            producao,
            estoqueAlertas,
            criticos,
            altos,
            moderados,
            baixos,
            pendencias,
            retornosVencidos,
            agendaResumo,
            diagnosticosCIPE,
            inteligencia
        });

    const rankingPacientes =
        base
            .slice()
            .sort((a, b) =>
                Number(b.score_territorial_global || 0) -
                Number(a.score_territorial_global || 0) ||
                (b.pendencias?.length || 0) -
                (a.pendencias?.length || 0)
            )
            .slice(0, 30);

    return {
        filtros,
        base,
        atendimentos,
        interacoes,
        reuniaoCasos,
        solicitacoes,
        estoque,
        agendaAPS,
        inteligencia,

        populacao: base.length,
        has: base.filter(p => valorSimSalaAPS(p.has)).length,
        dm: base.filter(p => valorSimSalaAPS(p.dm)).length,
        gestantes: base.filter(p => valorSimSalaAPS(p.gestante)).length,
        tb: base.filter(p => valorSimSalaAPS(p.tb)).length,
        hansen: base.filter(p => valorSimSalaAPS(p.hansen)).length,

        criticos,
        altos,
        moderados,
        baixos,
        pendencias,
        retornosVencidos,
        scoreMedio,

        agendaResumo,
        territorios,
        producao,
        estoqueAlertas,
        diagnosticosCIPE,
        recomendacoes,
        rankingPacientes,

        status:
            calcularStatusOperacionalSalaAPS({
                populacao: base.length,
                criticos: criticos.length,
                altos: altos.length,
                pendencias,
                scoreMedio,
                visitas: agendaResumo.visitas,
                buscas: agendaResumo.buscas
            })
    };
}

function filtrarListaSalaAPS(lista, filtros) {
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

function filtrarAgendaSalaAPS(lista, filtros) {
    return (lista || []).filter(item => {
        const equipe =
            item.equipe ||
            item.equipe_esf ||
            item.paciente_equipe ||
            "Não informado";

        const ubs =
            item.ubs ||
            item.ubs_vinculacao ||
            item.paciente_ubs ||
            "Não informado";

        if (
            filtros.equipe !== "TODAS" &&
            equipe !== "Não informado" &&
            equipe !== filtros.equipe
        ) {
            return false;
        }

        if (
            filtros.ubs !== "TODAS" &&
            ubs !== "Não informado" &&
            ubs !== filtros.ubs
        ) {
            return false;
        }

        return true;
    });
}

/* ==========================================================
   BLOCOS VISUAIS
   ========================================================== */

function renderizarCabecalhoCognitivoSalaAPS(dados) {
    return `
        <div class="form-section" style="border-left:6px solid var(--primary);">
            <div class="section-header">
                <div>
                    <h3 style="margin:0;">🏢 Sala de Situação APS Cognitiva</h3>
                    <p style="color:var(--text-muted); margin:6px 0 0 0;">
                        Centro de Comando Populacional baseado em Score Territorial Global,
                        Agenda Inteligente APS, CIPE e Motor Cognitivo.
                    </p>
                </div>

                <div class="button-row">
                    <button class="btn-primary" onclick="carregarSalaSituacaoAPS()">
                        🔄 Atualizar Sala
                    </button>

                    <button class="btn-secondary" onclick="exportarSalaSituacaoAPSCSV()">
                        📤 Exportar CSV
                    </button>

                    <button class="btn-info" onclick="copiarResumoSalaSituacaoAPS()">
                        🧠 Copiar Resumo IA
                    </button>

                    <button class="btn-secondary" onclick="navigate?.('agenda-inteligente-aps')">
                        🗓 Agenda APS
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderizarResumoExecutivoCognitivoSalaAPS(dados) {
    const cor =
        dados.status.nivel === "CRITICA"
            ? "var(--danger)"
            : dados.status.nivel === "ATENCAO"
                ? "var(--warning)"
                : "var(--success)";

    return `
        <div class="form-section" style="border-left:6px solid ${cor};">
            <h3 style="margin-top:0;">🧠 Resumo Executivo APS</h3>

            <div class="agenda-aps-resumo-ia" style="white-space:pre-line;">
${escaparSalaAPS(gerarTextoResumoExecutivoSalaAPS(dados))}
            </div>
        </div>
    `;
}

function gerarTextoResumoExecutivoSalaAPS(dados) {
    return [
        `${dados.status.icone} ${dados.status.titulo}`,
        "",
        `População monitorada: ${dados.populacao}`,
        `Score Territorial Médio: ${dados.scoreMedio}`,
        "",
        `Críticos: ${dados.criticos.length}`,
        `Alta prioridade: ${dados.altos.length}`,
        `Moderados: ${dados.moderados.length}`,
        `Baixos: ${dados.baixos.length}`,
        "",
        `Busca ativa: ${dados.agendaResumo.buscas}`,
        `Visitas domiciliares: ${dados.agendaResumo.visitas}`,
        `Consultas: ${dados.agendaResumo.consultas}`,
        `Gestantes prioritárias: ${dados.agendaResumo.gestantes}`,
        "",
        dados.status.recomendacao
    ].join("\n");
}

function renderizarIndicadoresExecutivosSalaAPS(dados) {
    const perc =
        valor =>
            dados.populacao > 0
                ? Number(((valor / dados.populacao) * 100).toFixed(1))
                : 0;

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">📊 Indicadores Executivos</h3>

            <div class="dashboard-grid">
                ${cardSalaAPS("👥", dados.populacao, "População", "icon-blue")}
                ${cardSalaAPS("🧠", dados.scoreMedio, "Score médio territorial", "icon-purple")}
                ${cardSalaAPS("❤️", `${dados.has} (${perc(dados.has)}%)`, "HAS", "icon-red")}
                ${cardSalaAPS("🍬", `${dados.dm} (${perc(dados.dm)}%)`, "DM", "icon-green")}
                ${cardSalaAPS("🤰", `${dados.gestantes} (${perc(dados.gestantes)}%)`, "Gestantes", "icon-yellow")}
                ${cardSalaAPS("🫁", dados.tb, "Tuberculose", "icon-purple")}
                ${cardSalaAPS("🖐️", dados.hansen, "Hanseníase", "icon-cyan")}
                ${cardSalaAPS("📋", dados.diagnosticosCIPE.total, "Registros CIPE", "icon-blue")}
            </div>
        </div>
    `;
}

function renderizarGestaoRiscoGlobalSalaAPS(dados) {
    return `
        <div class="form-section">
            <h3 style="margin-top:0;">🚨 Gestão de Risco Territorial Global</h3>

            <div class="dashboard-grid">
                ${cardSalaAPS("🔴", dados.criticos.length, "Críticos", "icon-red")}
                ${cardSalaAPS("🟠", dados.altos.length, "Alta prioridade", "icon-yellow")}
                ${cardSalaAPS("🟡", dados.moderados.length, "Moderados", "icon-yellow")}
                ${cardSalaAPS("🟢", dados.baixos.length, "Baixos", "icon-green")}
                ${cardSalaAPS("⚠️", dados.pendencias, "Pendências clínicas", "icon-purple")}
                ${cardSalaAPS("📅", dados.retornosVencidos, "Retornos vencidos", "icon-red")}
            </div>
        </div>
    `;
}

function renderizarAgendaInteligenteSalaAPS(dados) {
    const r =
        dados.agendaResumo;

    return `
        <div class="form-section">
            <div class="section-header">
                <div>
                    <h3 style="margin:0;">🗓 Agenda Inteligente APS</h3>
                    <p style="color:var(--text-muted); margin:6px 0 0 0;">
                        Ações programadas a partir do Score Territorial Global.
                    </p>
                </div>

                <button class="btn-secondary" onclick="navigate?.('agenda-inteligente-aps')">
                    Abrir Agenda
                </button>
            </div>

            <div class="dashboard-grid">
                ${cardSalaAPS("📞", r.buscas, "Busca ativa", "icon-blue")}
                ${cardSalaAPS("🏠", r.visitas, "Visitas domiciliares", "icon-green")}
                ${cardSalaAPS("🩺", r.consultas, "Consultas", "icon-cyan")}
                ${cardSalaAPS("🤰", r.gestantes, "Pré-natal", "icon-yellow")}
                ${cardSalaAPS("💉", r.vacinacao, "Vacinação", "icon-purple")}
                ${cardSalaAPS("📦", r.material, "Entrega de material", "icon-blue")}
            </div>

            ${renderizarTabelaAgendaSalaAPS(dados.agendaAPS.slice(0, 12))}
        </div>
    `;
}

function renderizarTabelaAgendaSalaAPS(lista) {
    if (!lista || !lista.length) {
        return `<p style="color:var(--text-muted);">Nenhum item de agenda encontrado.</p>`;
    }

    return `
        <table class="table-sintaxe">
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Paciente</th>
                    <th>Tipo</th>
                    <th>Prioridade</th>
                    <th>Motivo</th>
                </tr>
            </thead>

            <tbody>
                ${lista.map(a => `
                    <tr>
                        <td>${escaparSalaAPS(formatarDataCurtaSalaAPS(a.data_sugerida || a.created_at))}</td>
                        <td>
                            <strong>${escaparSalaAPS(a.paciente_nome || "Paciente")}</strong>
                            <small>CPF: ${escaparSalaAPS(a.paciente_cpf || "-")}</small>
                        </td>
                        <td>${badgeTipoSalaAPS(a.tipo)}</td>
                        <td>${badgePrioridadeSalaAPS(a.prioridade)}</td>
                        <td><small>${escaparSalaAPS(a.motivo || "-")}</small></td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function renderizarRankingPacientesCriticosSalaAPS(dados) {
    return `
        <div class="form-section">
            <h3 style="margin-top:0;">🏆 Ranking Territorial APS — Pacientes Prioritários</h3>

            ${
                dados.rankingPacientes.length
                    ? `
                        <table class="table-sintaxe">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Paciente</th>
                                    <th>Equipe / UBS</th>
                                    <th>Score Global</th>
                                    <th>Prioridade</th>
                                    <th>Ação recomendada</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>

                            <tbody>
                                ${dados.rankingPacientes.map((p, index) => `
                                    <tr>
                                        <td>${index + 1}</td>

                                        <td>
                                            <strong>${escaparSalaAPS(p.nome || "Sem nome")}</strong>
                                            <small>CPF: ${escaparSalaAPS(p.cpf || "-")} | CNS: ${escaparSalaAPS(p.cns || "-")}</small>
                                        </td>

                                        <td>
                                            ${escaparSalaAPS(p.equipe || "-")}
                                            <small>${escaparSalaAPS(p.ubs || "-")}</small>
                                        </td>

                                        <td>
                                            <strong>${Number(p.score_territorial_global || 0)}</strong>
                                            <small>
                                                Clínico ${Number(p.score_clinico || 0)} |
                                                Assist. ${Number(p.score_assistencial || 0)} |
                                                Social ${Number(p.score_social || 0)} |
                                                Dom. ${Number(p.score_domiciliar || 0)}
                                            </small>
                                        </td>

                                        <td>${badgeNivelSalaAPS(p.nivel_prioridade)}</td>

                                        <td>
                                            <small>${escaparSalaAPS(p.acao_recomendada || p.recomendacao_ia || "Reavaliar caso pela equipe.")}</small>
                                        </td>

                                        <td>
                                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                                <button class="btn-table-action btn-edit" onclick="abrirAtendimentoExistente?.('${escaparSalaAPS(p.cpf || "")}', '${escaparSalaAPS(p.cns || "")}')">
                                                    📋 Prontuário
                                                </button>

                                                <button class="btn-table-action btn-ok" onclick="abrirLinhaTempoTerritorial?.('${escaparSalaAPS(p.cpf || "")}', '${escaparSalaAPS(p.cns || "")}')">
                                                    🧬 Linha
                                                </button>

                                                <button class="btn-table-action btn-warn" onclick="abrirModuloVisitaDomiciliarAPS?.('${escaparSalaAPS(p.cpf || "")}', '${escaparSalaAPS(p.cns || "")}', 'ACS')">
                                                    🏠 Visita
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    `
                    : `<p style="color:var(--text-muted);">Nenhum paciente prioritário identificado.</p>`
            }
        </div>
    `;
}

function renderizarDiagnosticosEnfermagemCIPESalaAPS(dados) {
    const lista =
        dados.diagnosticosCIPE.lista || [];

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">📋 Diagnósticos / Intervenções de Enfermagem — CIPE</h3>

            ${
                lista.length
                    ? `
                        <table class="table-sintaxe">
                            <thead>
                                <tr>
                                    <th>CIPE</th>
                                    <th>Registros</th>
                                    <th>Participação</th>
                                </tr>
                            </thead>

                            <tbody>
                                ${lista.slice(0, 20).map(item => `
                                    <tr>
                                        <td><strong>${escaparSalaAPS(item.termo)}</strong></td>
                                        <td>${item.total}</td>
                                        <td>${item.percentual}%</td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    `
                    : `<p style="color:var(--text-muted);">Nenhum registro CIPE encontrado no período/filtro.</p>`
            }
        </div>
    `;
}

function renderizarInteligenciaTerritorialSalaAPS(dados) {
    return `
        <div class="form-section">
            <h3 style="margin-top:0;">🌎 Inteligência Territorial</h3>

            <h4>🔥 Ranking por território</h4>
            ${renderizarTabelaTerritoriosSalaAPS(dados.territorios.territorios.slice(0, 10))}

            <h4>👥 Ranking por equipe</h4>
            ${renderizarTabelaTerritoriosSalaAPS(dados.territorios.equipes.slice(0, 8))}

            <h4>🏥 Ranking por UBS</h4>
            ${renderizarTabelaTerritoriosSalaAPS(dados.territorios.ubs.slice(0, 8))}
        </div>
    `;
}

function renderizarRecomendacoesCognitivasSalaAPS(dados) {
    const inteligencia =
        (dados.inteligencia || [])
            .slice()
            .sort((a, b) =>
                new Date(b.created_at || 0) -
                new Date(a.created_at || 0)
            )
            .slice(0, 6);

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">🧠 Recomendações Cognitivas APS</h3>

            ${
                inteligencia.length
                    ? `
                        <h4>Motor Cognitivo APS</h4>
                        ${inteligencia.map(i => `
                            <div style="
                                border:1px solid var(--border);
                                border-left:5px solid var(--primary);
                                border-radius:10px;
                                padding:12px;
                                margin-bottom:10px;
                                background:#111c2e;
                            ">
                                <strong>${escaparSalaAPS(i.tipo || "Análise IA")}</strong>
                                <p style="white-space:pre-line; color:var(--text-muted); margin:6px 0;">
                                    ${escaparSalaAPS(i.resposta || "")}
                                </p>
                                <small>${escaparSalaAPS(formatarDataHistoricoSalaAPS(i.created_at))}</small>
                            </div>
                        `).join("")}
                    `
                    : `<p style="color:var(--text-muted);">Nenhuma análise recente do Motor Cognitivo APS.</p>`
            }

            <h4>Recomendações operacionais</h4>
            ${
                dados.recomendacoes.length
                    ? dados.recomendacoes.map(r => `
                        <div style="
                            border:1px solid var(--border);
                            border-left:5px solid ${r.cor};
                            border-radius:10px;
                            padding:12px;
                            margin-bottom:10px;
                            background:#111c2e;
                        ">
                            <strong>${r.icone} ${escaparSalaAPS(r.titulo)}</strong>
                            <p style="margin:6px 0; color:var(--text-muted);">
                                ${escaparSalaAPS(r.justificativa)}
                            </p>
                            <small>
                                <strong>Ação sugerida:</strong>
                                ${escaparSalaAPS(r.acao)}
                            </small>
                        </div>
                    `).join("")
                    : `<p style="color:var(--text-muted);">Nenhuma recomendação crítica no momento.</p>`
            }
        </div>
    `;
}

function renderizarProducaoSalaAPS(dados) {
    const resumo =
        dados.producao.resumo;

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">📈 Produção APS</h3>

            <div class="dashboard-grid">
                ${cardSalaAPS("🩺", resumo.atendimentos, "Atendimentos", "icon-blue")}
                ${cardSalaAPS("📞", resumo.buscaAtiva, "Busca ativa", "icon-cyan")}
                ${cardSalaAPS("👥", resumo.casosDiscutidos, "Casos discutidos", "icon-purple")}
                ${cardSalaAPS("📦", resumo.solicitacoes, "Solicitações", "icon-yellow")}
                ${cardSalaAPS("🧑‍⚕️", resumo.profissionais, "Profissionais", "icon-green")}
                ${cardSalaAPS("🏥", resumo.ubs, "UBS com produção", "icon-red")}
            </div>

            <h4>🧑‍⚕️ Top produção por profissional</h4>
            ${renderizarTabelaProducaoSalaAPS(dados.producao.profissionais.slice(0, 8))}
        </div>
    `;
}

function renderizarEstoqueSalaAPS(dados) {
    const e =
        dados.estoqueAlertas;

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">📦 Logística e Materiais</h3>

            <div class="dashboard-grid">
                ${cardSalaAPS("⚠️", e.baixo, "Estoque baixo", "icon-yellow")}
                ${cardSalaAPS("⛔", e.vencidos, "Itens vencidos", "icon-red")}
                ${cardSalaAPS("📅", e.vencem30, "Vencem em 30 dias", "icon-purple")}
                ${cardSalaAPS("⏳", e.pendentes, "Solicitações pendentes", "icon-cyan")}
            </div>
        </div>
    `;
}

/* ==========================================================
   CÁLCULOS ESPECÍFICOS
   ========================================================== */

function calcularResumoAgendaSalaAPS(agenda) {
    const n =
        valor => normalizarSalaAPS(valor);

    const porTipo =
        tipo => (agenda || []).filter(a => n(a.tipo) === n(tipo)).length;

    const criticos =
        (agenda || []).filter(a =>
            n(a.prioridade).includes("critic") ||
            Number(a.score_territorial_global || 0) >= 85
        ).length;

    return {
        total:
            (agenda || []).length,

        criticos,

        buscas:
            porTipo("BUSCA_ATIVA") +
            porTipo("Busca ativa"),

        visitas:
            porTipo("VISITA_DOMICILIAR") +
            porTipo("Visita domiciliar"),

        consultas:
            porTipo("CONSULTA") +
            porTipo("Consulta"),

        gestantes:
            porTipo("PRE_NATAL") +
            porTipo("PRENATAL") +
            porTipo("Pré-natal"),

        vacinacao:
            porTipo("VACINACAO") +
            porTipo("Vacinação"),

        material:
            porTipo("ENTREGA_MATERIAL") +
            porTipo("Entrega de material")
    };
}

function calcularDiagnosticosCIPESalaAPS(atendimentos) {
    const mapa =
        new Map();

    (atendimentos || []).forEach(a => {
        const termo =
            String(a.inputBuscaCIPE || "")
                .trim();

        if (!termo) return;

        mapa.set(
            termo,
            (mapa.get(termo) || 0) + 1
        );
    });

    const total =
        Array
            .from(mapa.values())
            .reduce((soma, valor) => soma + valor, 0);

    const lista =
        Array
            .from(mapa.entries())
            .map(([termo, totalTermo]) => ({
                termo,
                total: totalTermo,
                percentual:
                    total > 0
                        ? Number(((totalTermo / total) * 100).toFixed(1))
                        : 0
            }))
            .sort((a, b) =>
                b.total - a.total ||
                a.termo.localeCompare(b.termo)
            );

    return {
        total,
        lista
    };
}

function calcularRankingTerritorialSalaAPS(base) {
    const agrupar =
        (chaveFn, tipo) => {
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
                        criticos: 0,
                        altos: 0,
                        pendencias: 0,
                        retornosVencidos: 0,
                        score: 0,
                        scoreMedio: 0,
                        status: "🟢 Estável"
                    };
                }

                const g =
                    grupos[chave];

                const score =
                    Number(p.score_territorial_global || 0);

                g.populacao++;
                g.score += score;

                if (score >= 85) g.criticos++;
                if (score >= 65 && score < 85) g.altos++;

                const qtdPendencias =
                    p.pendencias?.length || 0;

                g.pendencias +=
                    qtdPendencias;

                if (Number(p.prazo) === 0) {
                    g.retornosVencidos++;
                }
            });

            Object.values(grupos).forEach(g => {
                g.scoreMedio =
                    g.populacao > 0
                        ? Math.round(g.score / g.populacao)
                        : 0;

                if (
                    g.scoreMedio >= 65 ||
                    g.criticos >= 10 ||
                    (g.populacao > 0 && (g.criticos / g.populacao) >= 0.08)
                ) {
                    g.status = "🔴 Prioridade máxima";
                } else if (
                    g.scoreMedio >= 40 ||
                    g.criticos >= 4 ||
                    g.altos >= 8
                ) {
                    g.status = "🟡 Atenção";
                } else {
                    g.status = "🟢 Estável";
                }
            });

            return Object
                .values(grupos)
                .sort((a, b) =>
                    b.scoreMedio - a.scoreMedio ||
                    b.criticos - a.criticos ||
                    b.pendencias - a.pendencias ||
                    b.populacao - a.populacao
                );
        };

    return {
        equipes:
            agrupar(
                p => p.equipe || "Equipe não informada",
                "Equipe"
            ),

        ubs:
            agrupar(
                p => p.ubs || "UBS não informada",
                "UBS"
            ),

        territorios:
            agrupar(
                p => p.cep || p.bairro || p.ubs || "Território não informado",
                "Território"
            )
    };
}

function calcularProducaoSalaAPS(
    atendimentos,
    interacoes,
    reuniaoCasos,
    solicitacoes
) {
    const profissionais = {};

    (atendimentos || []).forEach(a => {
        const nome =
            a.usuario_nome ||
            a.usuario_email ||
            "Profissional não informado";

        if (!profissionais[nome]) {
            profissionais[nome] = {
                nome,
                atendimentos: 0,
                criticos: 0,
                has: 0,
                dm: 0,
                gestantes: 0,
                cipe: 0
            };
        }

        const p =
            profissionais[nome];

        p.atendimentos++;

        if (valorSimSalaAPS(a.has)) p.has++;
        if (valorSimSalaAPS(a.dm)) p.dm++;
        if (valorSimSalaAPS(a.gestante)) p.gestantes++;
        if (a.inputBuscaCIPE) p.cipe++;

        if (
            Number(a.reavaliacaoDias ?? a.retorno_dias) === 0 ||
            normalizarSalaAPS(a.risco_global).includes("alto") ||
            Number(a.risco_pontos || 0) >= 6
        ) {
            p.criticos++;
        }
    });

    const listaProfissionais =
        Object.values(profissionais)
            .sort((a, b) =>
                b.atendimentos - a.atendimentos
            );

    const resumo = {
        atendimentos:
            (atendimentos || []).length,

        buscaAtiva:
            (interacoes || []).length,

        casosDiscutidos:
            (reuniaoCasos || []).length,

        solicitacoes:
            (solicitacoes || []).length,

        profissionais:
            new Set(
                (atendimentos || [])
                    .map(a => a.usuario_nome || a.usuario_email)
                    .filter(Boolean)
            ).size,

        ubs:
            new Set(
                (atendimentos || [])
                    .map(a => a.ubs_vinculacao || a.ubs)
                    .filter(Boolean)
            ).size
    };

    return {
        resumo,
        profissionais: listaProfissionais
    };
}

function calcularEstoqueAlertasSalaAPS(estoque, solicitacoes) {
    return {
        baixo:
            (estoque || []).filter(e =>
                Number(e.quantidade_atual || 0) <=
                Number(e.quantidade_minima || 0)
            ).length,

        vencidos:
            (estoque || []).filter(e =>
                calcularStatusValidadeSalaAPS(e.data_validade) === "VENCIDO"
            ).length,

        vencem30:
            (estoque || []).filter(e =>
                calcularStatusValidadeSalaAPS(e.data_validade) === "VENCE_30"
            ).length,

        pendentes:
            (solicitacoes || []).filter(s =>
                s.status === "PENDENTE"
            ).length
    };
}

function gerarRecomendacoesSalaAPS(contexto) {
    const recs = [];

    const topEquipe =
        contexto.territorios.equipes?.[0];

    const topUBS =
        contexto.territorios.ubs?.[0];

    const topTerritorio =
        contexto.territorios.territorios?.[0];

    if (contexto.criticos.length > 0) {
        recs.push({
            icone: "🚨",
            cor: "#ef4444",
            titulo: "Criar agenda protegida para pacientes críticos",
            justificativa: `${contexto.criticos.length} paciente(s) com Score Territorial Global crítico.`,
            acao: "Priorizar hoje na Torre APS e validar visita domiciliar, busca ativa ou consulta."
        });
    }

    if (contexto.agendaResumo.visitas > 0) {
        recs.push({
            icone: "🏠",
            cor: "#22c55e",
            titulo: "Organizar roteiro de visitas domiciliares",
            justificativa: `${contexto.agendaResumo.visitas} visita(s) domiciliar(es) na Agenda Inteligente APS.`,
            acao: "Separar por ACS/equipe, revisar EVFAM e registrar conduta no prontuário."
        });
    }

    if (contexto.agendaResumo.buscas > 0) {
        recs.push({
            icone: "📞",
            cor: "#3b82f6",
            titulo: "Executar fila de busca ativa",
            justificativa: `${contexto.agendaResumo.buscas} busca(s) ativa(s) programada(s).`,
            acao: "Priorizar críticos e linhas sensíveis: gestantes, TB, hanseníase, HAS/DM descompensados."
        });
    }

    if (contexto.retornosVencidos >= 10) {
        recs.push({
            icone: "📅",
            cor: "#f59e0b",
            titulo: "Mutirão de retornos vencidos",
            justificativa: `${contexto.retornosVencidos} pacientes estão com retorno vencido.`,
            acao: "Gerar fila de contato por equipe e priorizar casos com maior Score Territorial Global."
        });
    }

    if (topEquipe && topEquipe.status.includes("Prioridade")) {
        recs.push({
            icone: "👥",
            cor: "#ef4444",
            titulo: `Plano de ação para ${topEquipe.nome}`,
            justificativa: `Equipe com score médio ${topEquipe.scoreMedio}, ${topEquipe.criticos} críticos e ${topEquipe.pendencias} pendências.`,
            acao: "Reunião rápida, divisão de lista nominal e metas semanais de resolução."
        });
    }

    if (topUBS && topUBS.status.includes("Prioridade")) {
        recs.push({
            icone: "🏥",
            cor: "#a21caf",
            titulo: `Atenção gerencial para ${topUBS.nome}`,
            justificativa: `UBS com maior concentração de risco no filtro atual.`,
            acao: "Avaliar capacidade assistencial, estoque, agenda protegida e apoio matricial."
        });
    }

    if (topTerritorio && topTerritorio.status.includes("Prioridade")) {
        recs.push({
            icone: "🌎",
            cor: "#ef4444",
            titulo: `Intervenção territorial em ${topTerritorio.nome}`,
            justificativa: `Território com score médio ${topTerritorio.scoreMedio} e ${topTerritorio.criticos} pacientes críticos.`,
            acao: "Programar busca ativa territorial e revisão por microárea."
        });
    }

    if (contexto.diagnosticosCIPE.lista?.length) {
        const principal =
            contexto.diagnosticosCIPE.lista[0];

        recs.push({
            icone: "📋",
            cor: "#7c3aed",
            titulo: "Usar CIPE para orientar plano de enfermagem",
            justificativa: `CIPE mais frequente: ${principal.termo} (${principal.total} registro(s)).`,
            acao: "Gerar intervenção coletiva/educativa e atualizar plano de cuidado."
        });
    }

    if (contexto.estoqueAlertas.baixo > 0 || contexto.estoqueAlertas.vencidos > 0) {
        recs.push({
            icone: "📦",
            cor: "#f59e0b",
            titulo: "Revisar estoque estratégico",
            justificativa: `${contexto.estoqueAlertas.baixo} itens com estoque baixo e ${contexto.estoqueAlertas.vencidos} vencidos.`,
            acao: "Checar insumos críticos antes de mutirões e visitas domiciliares."
        });
    }

    if (!recs.length && contexto.producao.resumo.atendimentos === 0) {
        recs.push({
            icone: "📈",
            cor: "#3b82f6",
            titulo: "Sem produção no período",
            justificativa: "Não foram encontrados atendimentos no filtro/período selecionado.",
            acao: "Revisar filtros, período ou alimentação da base de atendimentos."
        });
    }

    return recs.slice(0, 10);
}

function calcularStatusOperacionalSalaAPS(info) {
    const taxaCriticos =
        info.populacao > 0
            ? info.criticos / info.populacao
            : 0;

    if (
        info.criticos >= 20 ||
        taxaCriticos >= 0.08 ||
        info.scoreMedio >= 65
    ) {
        return {
            nivel: "CRITICA",
            icone: "🔴",
            titulo: "Situação crítica territorial",
            recomendacao:
                "Alta concentração de risco territorial. Recomenda-se agenda protegida imediata, priorização de visitas domiciliares e reunião rápida da equipe."
        };
    }

    if (
        info.criticos >= 5 ||
        info.altos >= 20 ||
        info.scoreMedio >= 40 ||
        info.visitas >= 10 ||
        info.buscas >= 20
    ) {
        return {
            nivel: "ATENCAO",
            icone: "🟡",
            titulo: "Atenção operacional",
            recomendacao:
                "Há concentração relevante de risco. Recomenda-se plano de ação por equipe, execução da agenda inteligente e revisão de pendências."
        };
    }

    return {
        nivel: "ESTAVEL",
        icone: "🟢",
        titulo: "Operação estável",
        recomendacao:
            "Território em condição operacional habitual. Manter vigilância, atualizar dados e monitorar novos alertas."
    };
}

/* ==========================================================
   TABELAS
   ========================================================== */

function renderizarTabelaTerritoriosSalaAPS(lista) {
    if (!lista || !lista.length) {
        return `<p style="color:var(--text-muted);">Sem dados territoriais.</p>`;
    }

    return `
        <table class="table-sintaxe">
            <thead>
                <tr>
                    <th>Dimensão</th>
                    <th>Status</th>
                    <th>População</th>
                    <th>Críticos</th>
                    <th>Altos</th>
                    <th>Pendências</th>
                    <th>Score Médio</th>
                </tr>
            </thead>

            <tbody>
                ${lista.map(g => `
                    <tr>
                        <td>
                            <strong>${escaparSalaAPS(g.nome)}</strong>
                            <small>${escaparSalaAPS(g.tipo)}</small>
                        </td>
                        <td>${escaparSalaAPS(g.status)}</td>
                        <td>${g.populacao}</td>
                        <td>${g.criticos}</td>
                        <td>${g.altos}</td>
                        <td>${g.pendencias}</td>
                        <td><strong>${g.scoreMedio}</strong></td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function renderizarTabelaProducaoSalaAPS(lista) {
    if (!lista || !lista.length) {
        return `<p style="color:var(--text-muted);">Sem produção no período.</p>`;
    }

    return `
        <table class="table-sintaxe">
            <thead>
                <tr>
                    <th>Profissional</th>
                    <th>Atendimentos</th>
                    <th>Críticos</th>
                    <th>HAS</th>
                    <th>DM</th>
                    <th>Gestantes</th>
                    <th>CIPE</th>
                </tr>
            </thead>

            <tbody>
                ${lista.map(p => `
                    <tr>
                        <td><strong>${escaparSalaAPS(p.nome)}</strong></td>
                        <td>${p.atendimentos}</td>
                        <td>${p.criticos}</td>
                        <td>${p.has}</td>
                        <td>${p.dm}</td>
                        <td>${p.gestantes}</td>
                        <td>${p.cipe}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

/* ==========================================================
   EXPORTAÇÃO / RESUMO
   ========================================================== */

function exportarSalaSituacaoAPSCSV() {
    const dados =
        salaSituacaoAPSAtual.dados;

    if (!dados || !dados.base?.length) {
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
            "score_territorial_global",
            "nivel_prioridade",
            "acao_recomendada",
            "has",
            "dm",
            "gestante",
            "tb",
            "hansen",
            "pendencias",
            "retorno"
        ]
    ];

    dados.base.forEach(p => {
        linhas.push([
            p.nome,
            p.cpf,
            p.cns,
            p.ubs,
            p.equipe,
            p.score_territorial_global || 0,
            p.nivel_prioridade || "",
            p.acao_recomendada || "",
            p.has,
            p.dm,
            p.gestante,
            p.tb,
            p.hansen,
            (p.pendencias || []).join(" | "),
            p.prazo
        ]);
    });

    baixarCSVSalaAPS(
        linhas,
        `sala_situacao_aps_cognitiva_${new Date().toISOString().slice(0, 10)}.csv`
    );
}

function copiarResumoSalaSituacaoAPS() {
    const dados =
        salaSituacaoAPSAtual.dados;

    if (!dados) {
        mostrarToast?.("⚠️ Atualize a Sala de Situação primeiro.");
        return;
    }

    const texto =
        gerarTextoResumoExecutivoSalaAPS(dados);

    if (navigator.clipboard) {
        navigator.clipboard.writeText(texto);
        mostrarToast?.("🧠 Resumo da Sala copiado.");
    } else {
        alert(texto);
    }
}

function baixarCSVSalaAPS(linhas, nomeArquivo) {
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
        nomeArquivo;

    a.click();

    URL.revokeObjectURL(url);
}

/* ==========================================================
   HELPERS
   ========================================================== */

function ehCriticoSalaAPS(p) {
    return (
        Number(p.score_territorial_global || 0) >= 85 ||
        String(p.nivel_prioridade || "").toUpperCase() === "CRITICO" ||
        Number(p.prazo) === 0
    );
}

function identificarPendenciasSalaAPS(p) {
    const pendencias = [];

    if (
        valorSimSalaAPS(p.has) &&
        (!temValorSalaAPS(p.hasPAS) && !temValorSalaAPS(p.has_pas))
    ) {
        pendencias.push("HAS sem PA");
    }

    if (
        valorSimSalaAPS(p.dm) &&
        (!temValorSalaAPS(p.dmHbA1c) && !temValorSalaAPS(p.dm_hba1c))
    ) {
        pendencias.push("DM sem HbA1c");
    }

    if (
        valorSimSalaAPS(p.gestante) &&
        diasDesdeSalaAPS(p.ultimo_atendimento) > 30
    ) {
        pendencias.push("Gestante sem consulta recente");
    }

    if (
        valorSimSalaAPS(p.tb) &&
        diasDesdeSalaAPS(p.ultimo_atendimento) > 30
    ) {
        pendencias.push("TB sem acompanhamento");
    }

    if (
        valorSimSalaAPS(p.hansen) &&
        diasDesdeSalaAPS(p.ultimo_atendimento) > 60
    ) {
        pendencias.push("Hanseníase sem avaliação");
    }

    if (Number(p.prazo) === 0) {
        pendencias.push("Retorno vencido");
    }

    return pendencias;
}

function calcularPredicaoPacienteSalaAPS(p) {
    if (typeof calcularScorePredicaoTorreAPS === "function") {
        return calcularScorePredicaoTorreAPS(p);
    }

    let score = 0;
    const fatores = [];

    if (Number(p.prazo) === 0) {
        score += 4;
        fatores.push("retorno vencido");
    }

    if (
        normalizarSalaAPS(p.risco_global).includes("alto") ||
        Number(p.risco_pontos || 0) >= 6
    ) {
        score += 4;
        fatores.push("alto risco");
    }

    if (valorSimSalaAPS(p.tb)) {
        score += 3;
        fatores.push("TB");
    }

    if (valorSimSalaAPS(p.hansen)) {
        score += 3;
        fatores.push("Hanseníase");
    }

    score +=
        (p.pendencias?.length || 0) * 2;

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

function atualizarCardsSalaSituacaoAPS(dados) {
    setTextoSalaAPS("salaTotalPopulacao", dados.populacao);
    setTextoSalaAPS("salaTotalCriticos", dados.criticos.length);
    setTextoSalaAPS("salaTotalPendencias", dados.pendencias);
    setTextoSalaAPS("salaTotalRetornos", dados.retornosVencidos);
    setTextoSalaAPS("salaTotalAtendimentos", dados.producao.resumo.atendimentos);
    setTextoSalaAPS("salaTotalRecomendacoes", dados.recomendacoes.length);

    setTextoSalaAPS("salaScoreMedio", dados.scoreMedio);
    setTextoSalaAPS("salaTotalAltos", dados.altos.length);
    setTextoSalaAPS("salaTotalModerados", dados.moderados.length);
    setTextoSalaAPS("salaTotalBaixos", dados.baixos.length);
    setTextoSalaAPS("salaTotalAgenda", dados.agendaResumo.total);
    setTextoSalaAPS("salaTotalVisitas", dados.agendaResumo.visitas);
}

function cardSalaAPS(icone, valor, rotulo, classeIcone = "") {
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

function badgeNivelSalaAPS(nivel) {
    const n =
        String(nivel || "")
            .toUpperCase();

    if (n.includes("CRIT")) {
        return `<span class="status-badge status-danger">🔴 CRÍTICO</span>`;
    }

    if (n.includes("ALTO") || n.includes("ALTA")) {
        return `<span class="status-badge status-warning">🟠 ALTO</span>`;
    }

    if (n.includes("MOD")) {
        return `<span class="status-badge status-info">🟡 MODERADO</span>`;
    }

    return `<span class="status-badge status-success">🟢 BAIXO</span>`;
}

function badgePrioridadeSalaAPS(prioridade) {
    const p =
        normalizarSalaAPS(prioridade);

    if (p.includes("critic")) {
        return `<span class="status-badge status-danger">CRÍTICA</span>`;
    }

    if (p.includes("alta") || p.includes("alto")) {
        return `<span class="status-badge status-warning">ALTA</span>`;
    }

    if (p.includes("moder")) {
        return `<span class="status-badge status-info">MODERADA</span>`;
    }

    return `<span class="status-badge status-success">${escaparSalaAPS(prioridade || "ROTINA")}</span>`;
}

function badgeTipoSalaAPS(tipo) {
    const t =
        String(tipo || "")
            .replace(/_/g, " ");

    return `<span class="status-badge status-info">${escaparSalaAPS(t || "-")}</span>`;
}

function valorSimSalaAPS(valor) {
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

function normalizarSalaAPS(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function normalizarNivelPrioridadeSalaAPS(valor) {
    const v =
        normalizarSalaAPS(valor);

    if (!v) return "";

    if (v.includes("critic")) return "CRITICO";
    if (v.includes("alt")) return "ALTO";
    if (v.includes("moder")) return "MODERADO";
    if (v.includes("baix")) return "BAIXO";

    return "";
}

function classificarNivelPrioridadeSalaAPS(score) {
    if (score >= 85) return "CRITICO";
    if (score >= 65) return "ALTO";
    if (score >= 40) return "MODERADO";
    return "BAIXO";
}

function diasDesdeSalaAPS(data) {
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

function calcularStatusValidadeSalaAPS(dataValidade) {
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

function limparDocumentoSalaAPS(valor) {
    return String(valor || "")
        .replace(/\D/g, "");
}

function limparCEPSalaAPS(valor) {
    return String(valor || "")
        .replace(/\D/g, "")
        .replace(/^(\d{5})(\d{3})$/, "$1-$2");
}

function primeiroValorSalaAPS(...valores) {
    for (const valor of valores) {
        if (
            valor !== null &&
            valor !== undefined &&
            String(valor).trim() !== ""
        ) {
            return valor;
        }
    }

    return null;
}

function temValorSalaAPS(valor) {
    return (
        valor !== null &&
        valor !== undefined &&
        String(valor).trim() !== ""
    );
}

function setTextoSalaAPS(id, valor) {
    const el =
        document.getElementById(id);

    if (el) {
        el.innerText =
            valor;
    }
}

function escaparSalaAPS(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function formatarDataCurtaSalaAPS(valor) {
    if (!valor) return "-";

    const d =
        new Date(valor);

    if (Number.isNaN(d.getTime())) {
        return String(valor);
    }

    return d.toLocaleDateString("pt-BR");
}

function formatarDataHistoricoSalaAPS(valor) {
    if (!valor) return "-";

    const d =
        new Date(valor);

    if (Number.isNaN(d.getTime())) {
        return String(valor);
    }

    return d.toLocaleString("pt-BR");
}

/* ==========================================================
   GLOBAL
   ========================================================== */

window.carregarSalaSituacaoAPS = carregarSalaSituacaoAPS;
window.renderizarSalaSituacaoAPS = renderizarSalaSituacaoAPS;
window.exportarSalaSituacaoAPSCSV = exportarSalaSituacaoAPSCSV;
window.copiarResumoSalaSituacaoAPS = copiarResumoSalaSituacaoAPS;
window.salaSituacaoAPSAtual = salaSituacaoAPSAtual;

console.log("✅ Sala de Situação APS Cognitiva carregada.");
