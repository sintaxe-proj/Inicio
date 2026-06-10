/* ==========================================================
   📡 CENTRAL DE OPERAÇÕES APS 4.0 — SINTAXEHUB
   Montada sobre a Sala de Situação APS Cognitiva + Central APS atual

   Fonte:
   - pacientes
   - atendimentos
   - territorio_inteligente
   - agenda_aps
   - inteligencia_aps
   - interacoes_busca_ativa

   Mantém compatibilidade com:
   - carregarCentralAPS()
   - aplicarFilaCentralAPS()
   - carregarSalaSituacaoAPS()
   - Copiloto Executivo já existente no dashboard
   ========================================================== */

let centralOperacoesAPSAtual = {
    pacientes: [],
    atendimentos: [],
    territorio: [],
    agenda: [],
    inteligencia: [],
    interacoes: [],
    base: [],
    dados: null,
    ultimaAtualizacao: null
};

/* ==========================================================
   CARREGAMENTO PRINCIPAL
   ========================================================== */

async function carregarCentralOperacoesAPS() {
    const container =
        document.getElementById("conteudoCentralOperacoesAPS") ||
        document.getElementById("conteudoSalaSituacaoAPS") ||
        document.getElementById("listaCentralAPS");

    if (!container) {
        console.warn("Central de Operações APS: container não encontrado.");
        return null;
    }

    if (typeof supabaseClient === "undefined") {
        container.innerHTML =
            `<p style="color:var(--danger);">Supabase não carregado.</p>`;
        return null;
    }

    container.innerHTML =
        `<p style="color:var(--text-muted);">Carregando Central de Operações APS 4.0...</p>`;

    try {
        const [
            pacientes,
            atendimentos,
            territorio,
            agenda,
            inteligencia,
            interacoes
        ] = await Promise.all([
            buscarTabelaCentralOperacoesAPS("pacientes", "*", 15000),
            buscarTabelaCentralOperacoesAPS("atendimentos", "*", 50000, "data_atendimento"),
            buscarTabelaCentralOperacoesAPS("territorio_inteligente", "*", 50000, "ultima_atualizacao"),
            buscarTabelaCentralOperacoesAPS("agenda_aps", "*", 50000, "created_at"),
            buscarTabelaCentralOperacoesAPS("inteligencia_aps", "*", 10000, "created_at"),
            buscarTabelaCentralOperacoesAPS("interacoes_busca_ativa", "*", 30000, "criado_em")
        ]);

        let base =
            [];

        if (typeof buscarBaseCentralAPSSupabase === "function") {
            try {
                base =
                    await buscarBaseCentralAPSSupabase();
            } catch (erroBase) {
                console.warn("Central Operações: fallback de base acionado.", erroBase);
                base =
                    consolidarBaseCentralOperacoesAPS(pacientes, atendimentos);
            }
        } else {
            base =
                consolidarBaseCentralOperacoesAPS(pacientes, atendimentos);
        }

        enriquecerCentralOperacoesComTerritorioAPS(base, territorio);
        enriquecerCentralOperacoesComAgendaAPS(base, agenda);

        const dados =
            calcularDadosCentralOperacoesAPS(
                base,
                agenda,
                inteligencia,
                atendimentos,
                interacoes
            );

        centralOperacoesAPSAtual = {
            pacientes,
            atendimentos,
            territorio,
            agenda,
            inteligencia,
            interacoes,
            base,
            dados,
            ultimaAtualizacao: new Date().toISOString()
        };

        window.centralOperacoesAPSAtual =
            centralOperacoesAPSAtual;

        renderizarCentralOperacoesAPS(container, dados);

        atualizarCopilotoExecutivoCentralOperacoesAPS(dados);

        return centralOperacoesAPSAtual;

    } catch (erro) {
        console.error("Erro na Central de Operações APS:", erro);

        container.innerHTML =
            `<p style="color:var(--danger);">Erro ao carregar Central de Operações APS.</p>`;

        return null;
    }
}

async function buscarTabelaCentralOperacoesAPS(
    tabela,
    select = "*",
    limite = 10000,
    order = null
) {
    try {
        let query =
            supabaseClient
                .from(tabela)
                .select(select)
                .limit(limite);

        if (order) {
            query =
                query.order(order, {
                    ascending: false,
                    nullsFirst: false
                });
        }

        const { data, error } =
            await query;

        if (error) {
            console.warn(`Central Operações APS: tabela indisponível ${tabela}`, error.message || error);
            return [];
        }

        return data || [];

    } catch (erro) {
        console.warn(`Central Operações APS: falha opcional em ${tabela}`, erro);
        return [];
    }
}

/* ==========================================================
   CONSOLIDAÇÃO
   ========================================================== */

function consolidarBaseCentralOperacoesAPS(pacientes, atendimentos) {
    const mapa =
        new Map();

    (pacientes || []).forEach(p => {
        const chave =
            limparDocumentoCentralOperacoesAPS(p.cpf || "") ||
            limparDocumentoCentralOperacoesAPS(p.cns || "") ||
            p.id;

        if (!chave) return;

        mapa.set(chave, {
            id: p.id || "",
            nome: p.nome || "",
            cpf: limparDocumentoCentralOperacoesAPS(p.cpf || ""),
            cns: limparDocumentoCentralOperacoesAPS(p.cns || ""),
            telefone: p.telefone || "",
            cep: p.cep || "",
            bairro: p.bairro || "",
            cidade: p.cidade || "",
            ubs: p.ubs_vinculacao || p.ubs || p.unidade || "Não informado",
            equipe: p.equipe_esf || p.equipe || "Não informado",
            has: p.has || "Não",
            dm: p.dm || "Não",
            gestante: p.gestante || "Não",
            tb: p.tb || "Não",
            hansen: p.hansen || "Não",
            risco_global: p.risco_global || "Não informado",
            risco_pontos: Number(p.risco_pontos || 0),
            prazo: null,
            ultimo_atendimento: null,
            hasPAS: null,
            hasPAD: null,
            dmHbA1c: null,
            inputBuscaCIPE: "",
            pendencias: []
        });
    });

    (atendimentos || []).forEach(a => {
        const chave =
            limparDocumentoCentralOperacoesAPS(a.paciente_cpf || "") ||
            limparDocumentoCentralOperacoesAPS(a.cpf || "") ||
            limparDocumentoCentralOperacoesAPS(a.cns || "");

        if (!chave) return;

        const atual =
            mapa.get(chave) || {
                id: "",
                nome: a.nome_paciente || a.nome || "",
                cpf: limparDocumentoCentralOperacoesAPS(a.paciente_cpf || a.cpf || ""),
                cns: limparDocumentoCentralOperacoesAPS(a.cns || ""),
                telefone: a.telefone || "",
                cep: a.cep || "",
                bairro: a.bairro || "",
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
                inputBuscaCIPE: "",
                pendencias: []
            };

        if (!atual.nome) atual.nome = a.nome_paciente || a.nome || "";
        if (!atual.telefone && a.telefone) atual.telefone = a.telefone;

        if (valorSimCentralOperacoesAPS(a.has)) atual.has = "Sim";
        if (valorSimCentralOperacoesAPS(a.dm)) atual.dm = "Sim";
        if (valorSimCentralOperacoesAPS(a.gestante)) atual.gestante = "Sim";
        if (valorSimCentralOperacoesAPS(a.tb)) atual.tb = "Sim";
        if (valorSimCentralOperacoesAPS(a.hansen)) atual.hansen = "Sim";

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
            primeiroValorCentralOperacoesAPS(a.hasPAS, a.has_pas, a.objPAS, a.obj_pas, atual.hasPAS);

        atual.hasPAD =
            primeiroValorCentralOperacoesAPS(a.hasPAD, a.has_pad, a.objPAD, a.obj_pad, atual.hasPAD);

        atual.dmHbA1c =
            primeiroValorCentralOperacoesAPS(a.dmHbA1c, a.dm_hba1c, a.hba1c, atual.dmHbA1c);

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
                identificarPendenciasCentralOperacoesAPS(p)
        }));
}

function enriquecerCentralOperacoesComTerritorioAPS(base, territorio) {
    const mapa =
        new Map();

    (territorio || []).forEach(t => {
        const chave =
            limparDocumentoCentralOperacoesAPS(t.cpf || "") ||
            limparDocumentoCentralOperacoesAPS(t.cns || "");

        if (chave) {
            mapa.set(chave, t);
        }
    });

    (base || []).forEach(p => {
        const chave =
            limparDocumentoCentralOperacoesAPS(p.cpf || "") ||
            limparDocumentoCentralOperacoesAPS(p.cns || "");

        const ti =
            mapa.get(chave);

        if (!ti) {
            p.score_territorial_global =
                Number(p.score_territorial_global || p.risco_pontos || 0);

            p.nivel_prioridade =
                p.nivel_prioridade ||
                classificarPrioridadeCentralOperacoesAPS(p.score_territorial_global);

            return;
        }

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
            normalizarPrioridadeCentralOperacoesAPS(ti.prioridade) ||
            classificarPrioridadeCentralOperacoesAPS(p.score_territorial_global);

        p.acao_recomendada =
            ti.acao_recomendada ||
            ti.recomendacao_ia ||
            p.acao_recomendada ||
            "";

        p.evfam_total =
            Number(ti.evfam_total || 0);

        p.evfam_classificacao =
            ti.evfam_classificacao || "";

        p.score_clinico =
            Number(ti.score_clinico || 0);

        p.score_assistencial =
            Number(ti.score_assistencial || 0);

        p.score_social =
            Number(ti.score_social || 0);

        p.score_domiciliar =
            Number(ti.score_domiciliar || 0);

        p.visita_domiciliar_indicada =
            ti.visita_domiciliar_indicada;

        p.tipo_visita_sugerida =
            ti.tipo_visita_sugerida || "";

        if (Array.isArray(ti.pendencias) && ti.pendencias.length) {
            p.pendencias =
                [...new Set([...(p.pendencias || []), ...ti.pendencias])];
        }
    });
}

function enriquecerCentralOperacoesComAgendaAPS(base, agenda) {
    const mapa =
        new Map();

    (agenda || []).forEach(a => {
        const chave =
            limparDocumentoCentralOperacoesAPS(a.paciente_cpf || "");

        if (!chave) return;

        if (!mapa.has(chave)) {
            mapa.set(chave, []);
        }

        mapa.get(chave).push(a);
    });

    (base || []).forEach(p => {
        const chave =
            limparDocumentoCentralOperacoesAPS(p.cpf || "");

        p.agenda_aps =
            mapa.get(chave) || [];
    });
}

/* ==========================================================
   CÁLCULO EXECUTIVO
   ========================================================== */

function calcularDadosCentralOperacoesAPS(
    base,
    agenda,
    inteligencia,
    atendimentos,
    interacoes
) {
    const criticos =
        base.filter(p => Number(p.score_territorial_global || 0) >= 85);

    const altos =
        base.filter(p => {
            const s =
                Number(p.score_territorial_global || 0);

            return s >= 65 && s < 85;
        });

    const moderados =
        base.filter(p => {
            const s =
                Number(p.score_territorial_global || 0);

            return s >= 40 && s < 65;
        });

    const baixos =
        base.filter(p =>
            Number(p.score_territorial_global || 0) < 40
        );

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

    const resumoAgenda =
        calcularResumoAgendaCentralOperacoesAPS(agenda);

    const rankingEquipe =
        calcularRankingCentralOperacoesAPS(
            base,
            p => p.equipe || "Não informado",
            "Equipe"
        );

    const rankingUBS =
        calcularRankingCentralOperacoesAPS(
            base,
            p => p.ubs || "Não informado",
            "UBS"
        );

    const rankingTerritorio =
        calcularRankingCentralOperacoesAPS(
            base,
            p => p.cep || p.bairro || p.ubs || "Não informado",
            "Território"
        );

    const cipe =
        calcularCIPESCentralOperacoesAPS(atendimentos);

    const radar =
        gerarRadarCognitivoCentralOperacoesAPS({
            base,
            agenda,
            inteligencia,
            criticos,
            altos,
            rankingEquipe,
            rankingUBS,
            rankingTerritorio,
            cipe,
            resumoAgenda
        });

    const decisao =
        gerarCentroDecisaoCentralOperacoesAPS({
            base,
            agenda,
            criticos,
            altos,
            cipe,
            resumoAgenda,
            rankingEquipe
        });

    const executivo =
        gerarBomDiaCopilotoExecutivoAPS({
            base,
            criticos,
            altos,
            moderados,
            baixos,
            scoreMedio,
            resumoAgenda,
            cipe,
            rankingEquipe,
            radar,
            decisao
        });

    return {
        base,
        agenda,
        inteligencia,
        atendimentos,
        interacoes,

        populacao: base.length,
        criticos,
        altos,
        moderados,
        baixos,
        scoreMedio,

        has:
            base.filter(p => valorSimCentralOperacoesAPS(p.has)).length,

        dm:
            base.filter(p => valorSimCentralOperacoesAPS(p.dm)).length,

        gestantes:
            base.filter(p => valorSimCentralOperacoesAPS(p.gestante)).length,

        tb:
            base.filter(p => valorSimCentralOperacoesAPS(p.tb)).length,

        hansen:
            base.filter(p => valorSimCentralOperacoesAPS(p.hansen)).length,

        pendencias:
            base.reduce((total, p) => total + (p.pendencias?.length || 0), 0),

        resumoAgenda,
        rankingEquipe,
        rankingUBS,
        rankingTerritorio,
        cipe,
        radar,
        decisao,
        executivo
    };
}

function calcularResumoAgendaCentralOperacoesAPS(agenda) {
    const n =
        normalizarCentralOperacoesAPS;

    const porTipo =
        tipo =>
            (agenda || []).filter(a =>
                n(a.tipo) === n(tipo) ||
                n(a.tipo).includes(n(tipo))
            ).length;

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
            porTipo("busca"),

        visitas:
            porTipo("VISITA_DOMICILIAR") +
            porTipo("visita"),

        consultas:
            porTipo("CONSULTA") +
            porTipo("consulta"),

        gestantes:
            porTipo("PRE_NATAL") +
            porTipo("pre natal") +
            porTipo("prenatal"),

        vacinacao:
            porTipo("VACINACAO") +
            porTipo("vacinacao") +
            porTipo("vacinação"),

        material:
            porTipo("ENTREGA_MATERIAL") +
            porTipo("material")
    };
}

function calcularRankingCentralOperacoesAPS(base, chaveFn, tipo) {
    const grupos = {};

    (base || []).forEach(p => {
        const nome =
            chaveFn(p) || "Não informado";

        if (!grupos[nome]) {
            grupos[nome] = {
                tipo,
                nome,
                populacao: 0,
                criticos: 0,
                altos: 0,
                visitas: 0,
                buscas: 0,
                pendencias: 0,
                somaScore: 0,
                scoreMedio: 0
            };
        }

        const g =
            grupos[nome];

        const score =
            Number(p.score_territorial_global || 0);

        g.populacao++;
        g.somaScore += score;

        if (score >= 85) g.criticos++;
        if (score >= 65 && score < 85) g.altos++;

        g.pendencias +=
            p.pendencias?.length || 0;

        if ((p.agenda_aps || []).some(a => normalizarCentralOperacoesAPS(a.tipo).includes("visita"))) {
            g.visitas++;
        }

        if ((p.agenda_aps || []).some(a => normalizarCentralOperacoesAPS(a.tipo).includes("busca"))) {
            g.buscas++;
        }
    });

    Object.values(grupos).forEach(g => {
        g.scoreMedio =
            g.populacao
                ? Math.round(g.somaScore / g.populacao)
                : 0;

        g.pressao =
            g.criticos * 5 +
            g.altos * 3 +
            g.visitas * 3 +
            g.buscas * 2 +
            g.pendencias;
    });

    return Object
        .values(grupos)
        .sort((a, b) =>
            b.pressao - a.pressao ||
            b.scoreMedio - a.scoreMedio ||
            b.criticos - a.criticos
        );
}

function calcularCIPESCentralOperacoesAPS(atendimentos) {
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

/* ==========================================================
   COPILOTO EXECUTIVO — BOM DIA
   ========================================================== */

function gerarBomDiaCopilotoExecutivoAPS(dados) {
    const equipePrioritaria =
        dados.rankingEquipe?.[0];

    const recomendacao =
        equipePrioritaria && equipePrioritaria.pressao > 0
            ? `Priorizar ${equipePrioritaria.nome}. Há maior pressão assistencial territorial neste agrupamento.`
            : "Manter vigilância territorial e atualizar a Agenda Inteligente APS.";

    const linhas = [
        "🧠 Bom dia.",
        "",
        "Situação operacional da APS hoje:",
        "",
        `🔴 ${dados.criticos.length} pacientes críticos`,
        `🟠 ${dados.altos.length} pacientes de alta prioridade`,
        `🟡 ${dados.moderados.length} pacientes moderados`,
        "",
        `📞 ${dados.resumoAgenda.buscas} buscas ativas`,
        `🏠 ${dados.resumoAgenda.visitas} visitas domiciliares prioritárias`,
        `🩺 ${dados.resumoAgenda.consultas} consultas prioritárias`,
        `🤰 ${dados.resumoAgenda.gestantes} gestantes em agenda/prioridade`,
        `💉 ${dados.resumoAgenda.vacinacao} ações de vacinação`,
        `📦 ${dados.resumoAgenda.material} entregas de material`,
        "",
        `📋 ${dados.cipe.total} registros CIPE analisados`,
        "",
        "Recomendação:",
        recomendacao
    ];

    if (dados.cipe.lista?.[0]) {
        linhas.push(
            "",
            `CIPE predominante: ${dados.cipe.lista[0].termo} (${dados.cipe.lista[0].total} registro(s)).`
        );
    }

    return linhas.join("\n");
}

function atualizarCopilotoExecutivoCentralOperacoesAPS(dados) {
    const box =
        document.getElementById("dashInicialCopilotoAPS") ||
        document.getElementById("dashInicialResumoCopiloto") ||
        document.getElementById("dashCopilotoAgendaAPS") ||
        document.getElementById("painelIAExecutivaAPS");

    if (!box || !dados) return;

    box.innerHTML = `
        <div class="dashboard-list">
            <div class="dashboard-list-item">
                <div>
                    <strong>🧠 Bom dia. Central de Operações APS ativa.</strong>
                    <small>
                        ${dados.criticos.length} críticos, 
                        ${dados.resumoAgenda.buscas} buscas ativas, 
                        ${dados.resumoAgenda.visitas} visitas domiciliares e 
                        ${dados.resumoAgenda.gestantes} gestantes priorizadas.
                    </small>
                </div>

                <button
                    class="btn-table-action btn-ok"
                    onclick="abrirCopilotoAPS?.()">
                    Perguntar
                </button>
            </div>
        </div>
    `;
}

/* ==========================================================
   RADAR COGNITIVO E CENTRO DE DECISÃO
   ========================================================== */

function gerarRadarCognitivoCentralOperacoesAPS(ctx) {
    const radar = [];

    if (ctx.criticos.length) {
        radar.push({
            nivel: "CRITICO",
            icone: "🚨",
            titulo: "Pacientes críticos concentrados",
            texto: `${ctx.criticos.length} paciente(s) com Score Territorial Global crítico.`,
            acao: "Abrir agenda protegida e iniciar pelos maiores scores."
        });
    }

    if (ctx.resumoAgenda.visitas > 0) {
        radar.push({
            nivel: "ALTO",
            icone: "🏠",
            titulo: "Visitas domiciliares prioritárias",
            texto: `${ctx.resumoAgenda.visitas} visita(s) domiciliar(es) na agenda.`,
            acao: "Organizar roteiro ACS/enfermagem por microárea."
        });
    }

    if (ctx.resumoAgenda.buscas > 0) {
        radar.push({
            nivel: "ALTO",
            icone: "📞",
            titulo: "Busca ativa pendente",
            texto: `${ctx.resumoAgenda.buscas} busca(s) ativa(s) programada(s).`,
            acao: "Dividir fila nominal por equipe e ACS."
        });
    }

    if (ctx.rankingEquipe?.[0]?.pressao > 0) {
        radar.push({
            nivel: "TERRITORIAL",
            icone: "🌎",
            titulo: `Pressão assistencial em ${ctx.rankingEquipe[0].nome}`,
            texto: `Score médio ${ctx.rankingEquipe[0].scoreMedio}, ${ctx.rankingEquipe[0].criticos} crítico(s) e ${ctx.rankingEquipe[0].pendencias} pendência(s).`,
            acao: "Realizar huddle rápido e plano semanal por equipe."
        });
    }

    if (ctx.cipe.lista?.[0]) {
        radar.push({
            nivel: "ENFERMAGEM",
            icone: "📋",
            titulo: "Padrão CIPE identificado",
            texto: `${ctx.cipe.lista[0].termo} é o termo CIPE mais frequente.`,
            acao: "Transformar em intervenção de enfermagem ou ação educativa."
        });
    }

    return radar;
}

function gerarCentroDecisaoCentralOperacoesAPS(ctx) {
    const acoes = [];

    if (ctx.criticos.length) {
        acoes.push(`Priorizar ${ctx.criticos.length} paciente(s) críticos na Torre APS.`);
    }

    if (ctx.resumoAgenda.visitas) {
        acoes.push(`Realizar ${ctx.resumoAgenda.visitas} visita(s) domiciliar(es) prioritária(s).`);
    }

    if (ctx.resumoAgenda.buscas) {
        acoes.push(`Executar ${ctx.resumoAgenda.buscas} busca(s) ativa(s).`);
    }

    const hasSemPA =
        ctx.base.filter(p =>
            valorSimCentralOperacoesAPS(p.has) &&
            (!temValorCentralOperacoesAPS(p.hasPAS) || !temValorCentralOperacoesAPS(p.hasPAD))
        ).length;

    if (hasSemPA) {
        acoes.push(`Atualizar PA de ${hasSemPA} hipertenso(s) sem registro.`);
    }

    const dmSemHbA1c =
        ctx.base.filter(p =>
            valorSimCentralOperacoesAPS(p.dm) &&
            !temValorCentralOperacoesAPS(p.dmHbA1c)
        ).length;

    if (dmSemHbA1c) {
        acoes.push(`Atualizar HbA1c de ${dmSemHbA1c} diabético(s) sem registro.`);
    }

    const gestantesAtrasadas =
        ctx.base.filter(p =>
            valorSimCentralOperacoesAPS(p.gestante) &&
            diasDesdeCentralOperacoesAPS(p.ultimo_atendimento) > 30
        ).length;

    if (gestantesAtrasadas) {
        acoes.push(`Convocar ${gestantesAtrasadas} gestante(s) sem consulta recente.`);
    }

    if (ctx.cipe.lista?.[0]) {
        acoes.push(`Planejar intervenção de enfermagem para CIPE predominante: ${ctx.cipe.lista[0].termo}.`);
    }

    if (!acoes.length) {
        acoes.push("Manter vigilância territorial e atualização da agenda inteligente.");
    }

    return acoes;
}

/* ==========================================================
   RENDERIZAÇÃO
   ========================================================== */

function renderizarCentralOperacoesAPS(container, dados) {
    container.innerHTML = `
        ${renderizarHeroCentralOperacoesAPS(dados)}

        ${renderizarKPICentralOperacoesAPS(dados)}

        ${renderizarPressaoAssistencialCentralOperacoesAPS(dados)}

        ${renderizarCentroDecisaoCentralOperacoesAPS(dados)}

        ${renderizarRadarCognitivoCentralOperacoesAPS(dados)}

        ${renderizarRankingOperacionalCentralOperacoesAPS(dados)}

        ${renderizarCIPESCentralOperacoesAPS(dados)}

        ${renderizarListaCriticosCentralOperacoesAPS(dados)}
    `;
}

function renderizarHeroCentralOperacoesAPS(dados) {
    return `
        <div class="form-section" style="border-left:6px solid var(--primary);">
            <div class="section-header">
                <div>
                    <h3 style="margin:0;">📡 Central de Operações APS 4.0</h3>
                    <p style="color:var(--text-muted); margin:6px 0 0 0;">
                        Sala de Situação Cognitiva com visão executiva, agenda do dia,
                        radar territorial, CIPE e decisão operacional.
                    </p>
                </div>

                <div class="button-row">
                    <button class="btn-primary" onclick="carregarCentralOperacoesAPS()">
                        🔄 Atualizar
                    </button>

                    <button class="btn-info" onclick="abrirCopilotoAPS?.()">
                        🧠 Copiloto
                    </button>

                    <button class="btn-secondary" onclick="copiarResumoCentralOperacoesAPS()">
                        📋 Copiar resumo
                    </button>

                    <button class="btn-secondary" onclick="exportarCentralOperacoesAPSCSV()">
                        📤 Exportar CSV
                    </button>
                </div>
            </div>

            <div class="agenda-aps-resumo-ia" style="margin-top:14px; white-space:pre-line;">
${escaparCentralOperacoesAPS(dados.executivo)}
            </div>
        </div>
    `;
}

function renderizarKPICentralOperacoesAPS(dados) {
    return `
        <div class="form-section">
            <h3 style="margin-top:0;">🚨 Painel Executivo</h3>

            <div class="dashboard-grid">
                ${cardCentralOperacoesAPS("👥", dados.populacao, "População monitorada", "icon-blue")}
                ${cardCentralOperacoesAPS("🧠", dados.scoreMedio, "Score médio territorial", "icon-purple")}
                ${cardCentralOperacoesAPS("🔴", dados.criticos.length, "Críticos", "icon-red")}
                ${cardCentralOperacoesAPS("🟠", dados.altos.length, "Alta prioridade", "icon-yellow")}
                ${cardCentralOperacoesAPS("🟡", dados.moderados.length, "Moderados", "icon-yellow")}
                ${cardCentralOperacoesAPS("🟢", dados.baixos.length, "Baixo risco", "icon-green")}
            </div>
        </div>
    `;
}

function renderizarPressaoAssistencialCentralOperacoesAPS(dados) {
    const a =
        dados.resumoAgenda;

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">📍 Pressão Assistencial do Dia</h3>

            <div class="dashboard-grid">
                ${cardCentralOperacoesAPS("📞", a.buscas, "Busca ativa", "icon-blue")}
                ${cardCentralOperacoesAPS("🏠", a.visitas, "Visitas domiciliares", "icon-green")}
                ${cardCentralOperacoesAPS("🩺", a.consultas, "Consultas", "icon-cyan")}
                ${cardCentralOperacoesAPS("🤰", a.gestantes, "Pré-natal", "icon-yellow")}
                ${cardCentralOperacoesAPS("💉", a.vacinacao, "Vacinação", "icon-purple")}
                ${cardCentralOperacoesAPS("📦", a.material, "Materiais", "icon-blue")}
            </div>
        </div>
    `;
}

function renderizarCentroDecisaoCentralOperacoesAPS(dados) {
    return `
        <div class="form-section">
            <h3 style="margin-top:0;">🧠 O que fazer hoje?</h3>

            <ol style="line-height:1.8;">
                ${dados.decisao.map(acao =>
                    `<li>${escaparCentralOperacoesAPS(acao)}</li>`
                ).join("")}
            </ol>
        </div>
    `;
}

function renderizarRadarCognitivoCentralOperacoesAPS(dados) {
    return `
        <div class="form-section">
            <h3 style="margin-top:0;">📡 Radar Cognitivo APS</h3>

            ${
                dados.radar.length
                    ? dados.radar.map(r => `
                        <div style="
                            border:1px solid var(--border);
                            border-left:5px solid var(--primary);
                            border-radius:12px;
                            padding:12px;
                            margin-bottom:10px;
                            background:#111c2e;
                        ">
                            <strong>${r.icone} ${escaparCentralOperacoesAPS(r.titulo)}</strong>
                            <p style="color:var(--text-muted); margin:6px 0;">
                                ${escaparCentralOperacoesAPS(r.texto)}
                            </p>
                            <small>
                                <strong>Ação:</strong>
                                ${escaparCentralOperacoesAPS(r.acao)}
                            </small>
                        </div>
                    `).join("")
                    : `<p style="color:var(--text-muted);">Sem alertas cognitivos relevantes.</p>`
            }
        </div>
    `;
}

function renderizarRankingOperacionalCentralOperacoesAPS(dados) {
    return `
        <div class="form-section">
            <h3 style="margin-top:0;">🌎 Pressão Territorial</h3>

            <h4>👥 Equipes</h4>
            ${renderizarTabelaRankingCentralOperacoesAPS(dados.rankingEquipe.slice(0, 8))}

            <h4>🏥 UBS</h4>
            ${renderizarTabelaRankingCentralOperacoesAPS(dados.rankingUBS.slice(0, 8))}

            <h4>🧭 Territórios</h4>
            ${renderizarTabelaRankingCentralOperacoesAPS(dados.rankingTerritorio.slice(0, 8))}
        </div>
    `;
}

function renderizarTabelaRankingCentralOperacoesAPS(lista) {
    if (!lista || !lista.length) {
        return `<p style="color:var(--text-muted);">Sem dados.</p>`;
    }

    return `
        <table class="table-sintaxe">
            <thead>
                <tr>
                    <th>Dimensão</th>
                    <th>População</th>
                    <th>Críticos</th>
                    <th>Altos</th>
                    <th>Visitas</th>
                    <th>Buscas</th>
                    <th>Score médio</th>
                    <th>Pressão</th>
                </tr>
            </thead>

            <tbody>
                ${lista.map(g => `
                    <tr>
                        <td>
                            <strong>${escaparCentralOperacoesAPS(g.nome)}</strong>
                            <small>${escaparCentralOperacoesAPS(g.tipo)}</small>
                        </td>
                        <td>${g.populacao}</td>
                        <td>${g.criticos}</td>
                        <td>${g.altos}</td>
                        <td>${g.visitas}</td>
                        <td>${g.buscas}</td>
                        <td><strong>${g.scoreMedio}</strong></td>
                        <td><strong>${g.pressao}</strong></td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function renderizarCIPESCentralOperacoesAPS(dados) {
    const lista =
        dados.cipe.lista || [];

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">📋 Inteligência de Enfermagem — CIPE</h3>

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
                                ${lista.slice(0, 15).map(item => `
                                    <tr>
                                        <td><strong>${escaparCentralOperacoesAPS(item.termo)}</strong></td>
                                        <td>${item.total}</td>
                                        <td>${item.percentual}%</td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    `
                    : `<p style="color:var(--text-muted);">Sem registros CIPE ainda.</p>`
            }
        </div>
    `;
}

function renderizarListaCriticosCentralOperacoesAPS(dados) {
    const lista =
        dados.base
            .slice()
            .sort((a, b) =>
                Number(b.score_territorial_global || 0) -
                Number(a.score_territorial_global || 0)
            )
            .slice(0, 30);

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">🚨 Lista Nominal Prioritária</h3>

            <table class="table-sintaxe">
                <thead>
                    <tr>
                        <th>Paciente</th>
                        <th>Equipe / UBS</th>
                        <th>Score</th>
                        <th>Prioridade</th>
                        <th>Agenda</th>
                        <th>Ação recomendada</th>
                        <th>Ações</th>
                    </tr>
                </thead>

                <tbody>
                    ${lista.map(p => `
                        <tr>
                            <td>
                                <strong>${escaparCentralOperacoesAPS(p.nome || "Sem nome")}</strong>
                                <small>CPF: ${escaparCentralOperacoesAPS(p.cpf || "-")} | CNS: ${escaparCentralOperacoesAPS(p.cns || "-")}</small>
                            </td>

                            <td>
                                ${escaparCentralOperacoesAPS(p.equipe || "-")}
                                <small>${escaparCentralOperacoesAPS(p.ubs || "-")}</small>
                            </td>

                            <td>
                                <strong>${Number(p.score_territorial_global || 0)}</strong>
                                <small>
                                    Clínico ${Number(p.score_clinico || 0)} |
                                    Social ${Number(p.score_social || 0)} |
                                    Dom. ${Number(p.score_domiciliar || 0)}
                                </small>
                            </td>

                            <td>
                                ${badgePrioridadeCentralOperacoesAPS(p.nivel_prioridade)}
                            </td>

                            <td>
                                ${
                                    p.agenda_aps?.length
                                        ? p.agenda_aps.slice(0, 2).map(a =>
                                            `<span class="status-badge status-info">${escaparCentralOperacoesAPS(String(a.tipo || "").replace(/_/g, " "))}</span>`
                                        ).join(" ")
                                        : `<span style="color:var(--text-muted);">-</span>`
                                }
                            </td>

                            <td>
                                <small>${escaparCentralOperacoesAPS(p.acao_recomendada || "Reavaliar caso pela equipe.")}</small>
                            </td>

                            <td>
                                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                    <button class="btn-table-action btn-edit" onclick="abrirAtendimentoExistente?.('${escaparCentralOperacoesAPS(p.cpf || "")}', '${escaparCentralOperacoesAPS(p.cns || "")}')">
                                        📋 Prontuário
                                    </button>

                                    <button class="btn-table-action btn-ok" onclick="abrirLinhaTempoTerritorial?.('${escaparCentralOperacoesAPS(p.cpf || "")}', '${escaparCentralOperacoesAPS(p.cns || "")}')">
                                        🧬 Linha
                                    </button>

                                    <button class="btn-table-action btn-warn" onclick="abrirModuloVisitaDomiciliarAPS?.('${escaparCentralOperacoesAPS(p.cpf || "")}', '${escaparCentralOperacoesAPS(p.cns || "")}', 'ACS')">
                                        🏠 Visita
                                    </button>

                                    <button class="btn-table-action btn-info" onclick="abrirCopilotoAPS?.()">
                                        🧠 IA
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

/* ==========================================================
   EXPORTAÇÃO / RESUMO
   ========================================================== */

function copiarResumoCentralOperacoesAPS() {
    const dados =
        centralOperacoesAPSAtual.dados;

    if (!dados) {
        mostrarToast?.("⚠️ Atualize a Central de Operações primeiro.");
        return;
    }

    const texto =
        dados.executivo;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(texto);
        mostrarToast?.("🧠 Resumo executivo copiado.");
    } else {
        alert(texto);
    }
}

function exportarCentralOperacoesAPSCSV() {
    const dados =
        centralOperacoesAPSAtual.dados;

    if (!dados?.base?.length) {
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
            "agenda",
            "pendencias"
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
            (p.agenda_aps || []).map(a => a.tipo).join(" | "),
            (p.pendencias || []).join(" | ")
        ]);
    });

    baixarCSVCentralOperacoesAPS(
        linhas,
        `central_operacoes_aps_${new Date().toISOString().slice(0, 10)}.csv`
    );
}

function baixarCSVCentralOperacoesAPS(linhas, nomeArquivo) {
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

function identificarPendenciasCentralOperacoesAPS(p) {
    const pendencias = [];

    if (
        valorSimCentralOperacoesAPS(p.has) &&
        (!temValorCentralOperacoesAPS(p.hasPAS) || !temValorCentralOperacoesAPS(p.hasPAD))
    ) {
        pendencias.push("HAS sem PA");
    }

    if (
        valorSimCentralOperacoesAPS(p.dm) &&
        !temValorCentralOperacoesAPS(p.dmHbA1c)
    ) {
        pendencias.push("DM sem HbA1c");
    }

    if (
        valorSimCentralOperacoesAPS(p.gestante) &&
        diasDesdeCentralOperacoesAPS(p.ultimo_atendimento) > 30
    ) {
        pendencias.push("Gestante sem consulta recente");
    }

    if (
        valorSimCentralOperacoesAPS(p.tb) &&
        diasDesdeCentralOperacoesAPS(p.ultimo_atendimento) > 30
    ) {
        pendencias.push("TB sem acompanhamento recente");
    }

    if (
        valorSimCentralOperacoesAPS(p.hansen) &&
        diasDesdeCentralOperacoesAPS(p.ultimo_atendimento) > 60
    ) {
        pendencias.push("Hanseníase sem avaliação recente");
    }

    if (Number(p.prazo) === 0) {
        pendencias.push("Retorno vencido");
    }

    return [...new Set(pendencias)];
}

function cardCentralOperacoesAPS(icone, valor, rotulo, classeIcone = "") {
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

function badgePrioridadeCentralOperacoesAPS(nivel) {
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

function classificarPrioridadeCentralOperacoesAPS(score) {
    if (score >= 85) return "CRITICO";
    if (score >= 65) return "ALTO";
    if (score >= 40) return "MODERADO";
    return "BAIXO";
}

function normalizarPrioridadeCentralOperacoesAPS(valor) {
    const v =
        normalizarCentralOperacoesAPS(valor);

    if (v.includes("critic")) return "CRITICO";
    if (v.includes("alt")) return "ALTO";
    if (v.includes("moder")) return "MODERADO";
    if (v.includes("baix")) return "BAIXO";

    return "";
}

function valorSimCentralOperacoesAPS(valor) {
    const v =
        normalizarCentralOperacoesAPS(valor);

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

function temValorCentralOperacoesAPS(valor) {
    return (
        valor !== null &&
        valor !== undefined &&
        String(valor).trim() !== ""
    );
}

function primeiroValorCentralOperacoesAPS(...valores) {
    for (const valor of valores) {
        if (temValorCentralOperacoesAPS(valor)) {
            return valor;
        }
    }

    return null;
}

function diasDesdeCentralOperacoesAPS(data) {
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

function limparDocumentoCentralOperacoesAPS(valor) {
    return String(valor || "")
        .replace(/\D/g, "");
}

function normalizarCentralOperacoesAPS(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function escaparCentralOperacoesAPS(valor) {
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

window.carregarCentralOperacoesAPS = carregarCentralOperacoesAPS;
window.centralOperacoesAPSAtual = centralOperacoesAPSAtual;
window.gerarBomDiaCopilotoExecutivoAPS = gerarBomDiaCopilotoExecutivoAPS;
window.atualizarCopilotoExecutivoCentralOperacoesAPS = atualizarCopilotoExecutivoCentralOperacoesAPS;
window.copiarResumoCentralOperacoesAPS = copiarResumoCentralOperacoesAPS;
window.exportarCentralOperacoesAPSCSV = exportarCentralOperacoesAPSCSV;

console.log("✅ Central de Operações APS 4.0 carregada.");
