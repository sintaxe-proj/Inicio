/* ==========================================================
   🧠 COPILOTO APS COGNITIVO — SINTAXEHUB
   Centro conversacional da APS orientado por:
   - Score Territorial Global
   - Território Inteligente
   - Agenda Inteligente APS
   - Motor Cognitivo APS
   - CIAP-2 + CIPE
   - Sala de Situação APS
   - Supabase-first
   ========================================================== */

let copilotoAPSResultadoAtual = [];
let copilotoAPSContextoAtual = {
    pacientes: [],
    atendimentos: [],
    interacoes: [],
    territorio: [],
    agenda: [],
    inteligencia: [],
    base: [],
    resumo: null,
    ultimaAtualizacao: null
};

/* ==========================================================
   ENTRADA PRINCIPAL
   ========================================================== */

async function executarCopilotoAPS() {
    const input =
        document.getElementById("inputCopilotoAPS");

    const container =
        document.getElementById("respostaCopilotoAPS");

    if (!input || !container) return;

    const pergunta =
        String(input.value || "").trim();

    if (!pergunta) {
        container.innerHTML =
            `<p style="color:var(--text-muted);">Digite uma pergunta ou comando APS.</p>`;
        return;
    }

    if (typeof supabaseClient === "undefined") {
        container.innerHTML =
            `<p style="color:var(--danger);">Supabase não carregado.</p>`;
        return;
    }

    container.innerHTML =
        `<p style="color:var(--text-muted);">🧠 Analisando território, agenda, score global e histórico...</p>`;

    try {
        const intencao =
            interpretarComandoCopilotoAPS(pergunta);

        const dados =
            await carregarDadosCopilotoAPS();

        let resposta;

        if (
            deveUsarMotorCognitivoCopilotoAPS(intencao, pergunta) &&
            typeof responderCopilotoAPS === "function"
        ) {
            const respostaMotor =
                await responderCopilotoAPS(pergunta);

            resposta =
                gerarRespostaMotorCognitivoCopilotoAPS(
                    respostaMotor,
                    intencao,
                    dados,
                    pergunta
                );
        } else {
            resposta =
                gerarRespostaCopilotoAPS(
                    intencao,
                    dados,
                    pergunta
                );
        }

        copilotoAPSResultadoAtual =
            resposta.lista || [];

        renderizarRespostaCopilotoAPS(
            resposta,
            pergunta
        );

        await registrarInteracaoCopilotoAPS(
            pergunta,
            resposta,
            intencao
        );

    } catch (erro) {
        console.error("Erro no Copiloto APS:", erro);

        container.innerHTML =
            `<p style="color:var(--danger);">Erro ao executar o Copiloto APS.</p>`;
    }
}

/* ==========================================================
   INTERPRETAÇÃO DE INTENÇÃO
   ========================================================== */

function interpretarComandoCopilotoAPS(texto) {
    const t =
        normalizarCopilotoAPS(texto);

    const intencao = {
        original: texto,
        linha: "TODAS",
        filtro: "GERAL",
        risco: null,
        periodo: null,
        acao: "LISTAR",
        agrupar: null,
        modulo: "OPERACIONAL",
        limite: 50
    };

    if (t.includes("hipertens") || t.includes("has") || t.includes("pressao")) {
        intencao.linha = "HAS";
    }

    if (t.includes("diabet") || t.includes("dm") || t.includes("hba1c") || t.includes("glic")) {
        intencao.linha = "DM";
    }

    if (t.includes("gestante") || t.includes("pre natal") || t.includes("prenatal")) {
        intencao.linha = "GESTANTE";
    }

    if (t.includes("tuberculose") || t.includes(" tb ")) {
        intencao.linha = "TB";
    }

    if (t.includes("hanseniase") || t.includes("hansen")) {
        intencao.linha = "HANSEN";
    }

    if (t.includes("cipe") || t.includes("enfermagem") || t.includes("diagnostico de enfermagem") || t.includes("diagnóstico de enfermagem")) {
        intencao.modulo = "CIPE";
        intencao.acao = "RESUMO_CIPE";
    }

    if (t.includes("critico") || t.includes("crítico") || t.includes("alto risco") || t.includes("prioritario") || t.includes("prioritário") || t.includes("prioridade")) {
        intencao.filtro = "CRITICOS";
    }

    if (t.includes("score territorial") || t.includes("score global") || t.includes("score territorial global")) {
        intencao.modulo = "SCORE_GLOBAL";
    }

    if (t.includes("sem consulta") || t.includes("sem atendimento") || t.includes("abandono") || t.includes("mais de 6 meses") || t.includes("180")) {
        intencao.filtro = "SEM_ATENDIMENTO_180";
    }

    if (t.includes("retorno vencido") || t.includes("atrasado") || t.includes("vencido")) {
        intencao.filtro = "RETORNO_VENCIDO";
    }

    if (t.includes("sem pa") || t.includes("sem pressao") || t.includes("pressao nao registrada")) {
        intencao.filtro = "HAS_SEM_PA";
        intencao.linha = "HAS";
    }

    if (t.includes("sem hba1c") || t.includes("hba1c nao") || t.includes("hemoglobina glicada")) {
        intencao.filtro = "DM_SEM_HBA1C";
        intencao.linha = "DM";
    }

    if (t.includes("visita") || t.includes("domiciliar") || t.includes("visitar")) {
        intencao.modulo = "AGENDA";
        intencao.filtro = "VISITA_DOMICILIAR";
    }

    if (t.includes("busca ativa") || t.includes("ligar") || t.includes("contato")) {
        intencao.modulo = "AGENDA";
        intencao.filtro = "BUSCA_ATIVA";
    }

    if (t.includes("agenda") || t.includes("hoje") || t.includes("dia")) {
        intencao.modulo = "AGENDA";
        if (intencao.filtro === "GERAL") {
            intencao.filtro = "AGENDA_HOJE";
        }
    }

    if (t.includes("sala de situacao") || t.includes("sala de situação") || t.includes("situacao") || t.includes("situação") || t.includes("panorama")) {
        intencao.modulo = "SALA_SITUACAO";
        intencao.acao = "RESUMO";
    }

    if (t.includes("resumo") || t.includes("panorama")) {
        intencao.acao = "RESUMO";
    }

    if (t.includes("quantos") || t.includes("total") || t.includes("contar")) {
        intencao.acao = "CONTAR";
    }

    if (t.includes("recomend")) {
        intencao.acao = "RECOMENDACOES";
        intencao.modulo = "COGNITIVO";
    }

    if (t.includes("explica") || t.includes("explique") || t.includes("porque") || t.includes("por que")) {
        intencao.acao = "EXPLICAR";
        intencao.modulo = "COGNITIVO";
    }

    if (t.includes("equipe")) {
        intencao.agrupar = "EQUIPE";
    }

    if (t.includes("ubs")) {
        intencao.agrupar = "UBS";
    }

    if (t.includes("territorio") || t.includes("território") || t.includes("cep") || t.includes("bairro")) {
        intencao.agrupar = "TERRITORIO";
        if (intencao.modulo === "OPERACIONAL") {
            intencao.modulo = "TERRITORIO";
        }
    }

    if (
        t.includes("prever") ||
        t.includes("predizer") ||
        t.includes("risco de abandono") ||
        t.includes("risco de internacao") ||
        t.includes("risco de internação") ||
        t.includes("descompens") ||
        t.includes("gemeo digital") ||
        t.includes("gêmeo digital") ||
        t.includes("pressao assistencial") ||
        t.includes("pressão assistencial")
    ) {
        intencao.modulo = "PREDITIVO";
    }

    return intencao;
}

function deveUsarMotorCognitivoCopilotoAPS(intencao, pergunta) {
    const t =
        normalizarCopilotoAPS(pergunta);

    return (
        intencao.modulo === "COGNITIVO" ||
        intencao.modulo === "SALA_SITUACAO" ||
        intencao.modulo === "SCORE_GLOBAL" ||
        t.includes("motor cognitivo") ||
        t.includes("analise") ||
        t.includes("análise") ||
        t.includes("plano operacional") ||
        t.includes("resuma") ||
        t.includes("explica") ||
        t.includes("explique")
    );
}

/* ==========================================================
   DADOS
   ========================================================== */

async function carregarDadosCopilotoAPS() {
    const [
        pacientesResp,
        atendimentosResp,
        interacoesResp,
        territorioResp,
        agendaResp,
        inteligenciaResp
    ] = await Promise.all([
        buscarTabelaCopilotoAPS("pacientes", "*", 15000, null),
        buscarTabelaCopilotoAPS("atendimentos", "*", 40000, "data_atendimento"),
        buscarTabelaCopilotoAPS("interacoes_busca_ativa", "*", 20000, "criado_em"),
        buscarTabelaCopilotoAPS("territorio_inteligente", "*", 50000, "ultima_atualizacao"),
        buscarTabelaCopilotoAPS("agenda_aps", "*", 50000, "created_at"),
        buscarTabelaCopilotoAPS("inteligencia_aps", "*", 5000, "created_at")
    ]);

    const base =
        consolidarBaseCopilotoAPS(
            pacientesResp || [],
            atendimentosResp || []
        );

    enriquecerBaseComTerritorioCopilotoAPS(
        base,
        territorioResp || []
    );

    enriquecerBaseComAgendaCopilotoAPS(
        base,
        agendaResp || []
    );

    const resumo =
        gerarResumoContextoCopilotoAPS(
            base,
            agendaResp || [],
            inteligenciaResp || [],
            atendimentosResp || []
        );

    copilotoAPSContextoAtual = {
        pacientes: pacientesResp || [],
        atendimentos: atendimentosResp || [],
        interacoes: interacoesResp || [],
        territorio: territorioResp || [],
        agenda: agendaResp || [],
        inteligencia: inteligenciaResp || [],
        base,
        resumo,
        ultimaAtualizacao: new Date().toISOString()
    };

    window.copilotoAPSContextoAtual =
        copilotoAPSContextoAtual;

    return copilotoAPSContextoAtual;
}

async function buscarTabelaCopilotoAPS(tabela, select = "*", limite = 10000, order = null) {
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
            console.warn(`Copiloto APS: tabela indisponível ${tabela}`, error.message || error);
            return [];
        }

        return data || [];

    } catch (erro) {
        console.warn(`Copiloto APS: falha opcional em ${tabela}`, erro);
        return [];
    }
}

function consolidarBaseCopilotoAPS(pacientes, atendimentos) {
    if (typeof consolidarBaseTorreAPS === "function") {
        return consolidarBaseTorreAPS(pacientes, atendimentos);
    }

    const mapa = new Map();

    pacientes.forEach(p => {
        const chave =
            limparDocumentoCopilotoAPS(p.cpf || "") ||
            limparDocumentoCopilotoAPS(p.cns || "") ||
            p.id;

        if (!chave) return;

        mapa.set(chave, {
            nome: p.nome || "",
            cpf: limparDocumentoCopilotoAPS(p.cpf || ""),
            cns: limparDocumentoCopilotoAPS(p.cns || ""),
            telefone: p.telefone || "",
            cep: p.cep || "",
            bairro: p.bairro || "",
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
            inputBuscaCIAPS: "",
            inputBuscaCIPE: ""
        });
    });

    atendimentos.forEach(a => {
        const chave =
            limparDocumentoCopilotoAPS(a.paciente_cpf || "") ||
            limparDocumentoCopilotoAPS(a.cpf || "") ||
            limparDocumentoCopilotoAPS(a.cns || "");

        if (!chave) return;

        const atual =
            mapa.get(chave) || {
                nome: a.nome_paciente || a.nome || "",
                cpf: limparDocumentoCopilotoAPS(a.paciente_cpf || a.cpf || ""),
                cns: limparDocumentoCopilotoAPS(a.cns || ""),
                telefone: "",
                cep: a.cep || "",
                bairro: a.bairro || "",
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
                inputBuscaCIAPS: "",
                inputBuscaCIPE: ""
            };

        if (!atual.nome) atual.nome = a.nome_paciente || a.nome || "";

        if (valorSimCopilotoAPS(a.has)) atual.has = "Sim";
        if (valorSimCopilotoAPS(a.dm)) atual.dm = "Sim";
        if (valorSimCopilotoAPS(a.gestante)) atual.gestante = "Sim";
        if (valorSimCopilotoAPS(a.tb)) atual.tb = "Sim";
        if (valorSimCopilotoAPS(a.hansen)) atual.hansen = "Sim";

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
            primeiroValorCopilotoAPS(a.hasPAS, a.has_pas, a.objPAS, a.obj_pas, atual.hasPAS);

        atual.hasPAD =
            primeiroValorCopilotoAPS(a.hasPAD, a.has_pad, a.objPAD, a.obj_pad, atual.hasPAD);

        atual.dmHbA1c =
            primeiroValorCopilotoAPS(a.dmHbA1c, a.dm_hba1c, a.hba1c, atual.dmHbA1c);

        atual.inputBuscaCIAPS =
            a.inputBuscaCIAPS ||
            a.ciap ||
            atual.inputBuscaCIAPS ||
            "";

        atual.inputBuscaCIPE =
            a.inputBuscaCIPE ||
            atual.inputBuscaCIPE ||
            "";

        if (a.equipe_esf || a.equipe) {
            atual.equipe = a.equipe_esf || a.equipe;
        }

        if (a.ubs_vinculacao || a.ubs) {
            atual.ubs = a.ubs_vinculacao || a.ubs;
        }

        mapa.set(chave, atual);
    });

    return Array.from(mapa.values()).map(p => ({
        ...p,
        pendencias: identificarPendenciasCopilotoAPS(p),
        scoreCopiloto: calcularScoreCopilotoAPS(p)
    }));
}

function enriquecerBaseComTerritorioCopilotoAPS(base, territorio) {
    const mapa =
        new Map();

    (territorio || []).forEach(t => {
        const chave =
            limparDocumentoCopilotoAPS(t.cpf || "") ||
            limparDocumentoCopilotoAPS(t.cns || "");

        if (chave) mapa.set(chave, t);
    });

    (base || []).forEach(p => {
        const chave =
            limparDocumentoCopilotoAPS(p.cpf || "") ||
            limparDocumentoCopilotoAPS(p.cns || "");

        const ti =
            mapa.get(chave);

        if (!ti) {
            p.score_territorial_global =
                Number(p.score_territorial_global || p.scoreCopiloto || 0);

            p.nivel_prioridade =
                p.nivel_prioridade ||
                classificarNivelCopilotoAPS(p.score_territorial_global);

            return;
        }

        p.territorio_inteligente = ti;

        p.score_territorial_global =
            Number(
                ti.score_territorial_global ??
                ti.score_geral ??
                p.score_territorial_global ??
                p.scoreCopiloto ??
                0
            );

        p.nivel_prioridade =
            ti.nivel_prioridade ||
            normalizarNivelPrioridadeCopilotoAPS(ti.prioridade) ||
            classificarNivelCopilotoAPS(p.score_territorial_global);

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

        p.evfam_total =
            Number(ti.evfam_total || 0);

        p.evfam_classificacao =
            ti.evfam_classificacao || "";

        p.visita_domiciliar_indicada =
            ti.visita_domiciliar_indicada;

        p.tipo_visita_sugerida =
            ti.tipo_visita_sugerida || "";

        p.score_clinico =
            Number(ti.score_clinico || 0);

        p.score_assistencial =
            Number(ti.score_assistencial || 0);

        p.score_social =
            Number(ti.score_social || 0);

        p.score_domiciliar =
            Number(ti.score_domiciliar || 0);

        if (Array.isArray(ti.pendencias) && ti.pendencias.length) {
            p.pendencias =
                [...new Set([...(p.pendencias || []), ...ti.pendencias])];
        }
    });
}

function enriquecerBaseComAgendaCopilotoAPS(base, agenda) {
    const mapa =
        new Map();

    (agenda || []).forEach(a => {
        const chave =
            limparDocumentoCopilotoAPS(a.paciente_cpf || "");

        if (!chave) return;

        if (!mapa.has(chave)) mapa.set(chave, []);
        mapa.get(chave).push(a);
    });

    (base || []).forEach(p => {
        const chave =
            limparDocumentoCopilotoAPS(p.cpf || "");

        p.agenda_aps =
            mapa.get(chave) || [];
    });
}

/* ==========================================================
   RESPOSTA
   ========================================================== */

function gerarRespostaCopilotoAPS(intencao, dados, pergunta) {
    if (intencao.modulo === "PREDITIVO") {
        return gerarRespostaPreditivaCopilotoAPS(intencao, dados, pergunta);
    }

    if (intencao.modulo === "AGENDA") {
        return gerarRespostaAgendaCopilotoAPS(intencao, dados, pergunta);
    }

    if (intencao.modulo === "CIPE") {
        return gerarRespostaCIPECopilotoAPS(intencao, dados, pergunta);
    }

    if (intencao.modulo === "TERRITORIO" || intencao.agrupar) {
        return gerarRespostaAgrupadaCopilotoAPS(intencao, dados, pergunta);
    }

    let lista =
        [...dados.base];

    lista =
        aplicarLinhaCopilotoAPS(
            lista,
            intencao.linha
        );

    lista =
        aplicarFiltroCopilotoAPS(
            lista,
            intencao.filtro
        );

    lista =
        ordenarListaCopilotoAPS(lista);

    if (intencao.acao === "RESUMO") {
        return gerarResumoCopilotoAPS(lista, intencao, pergunta, dados);
    }

    if (intencao.acao === "CONTAR") {
        return {
            titulo: "Contagem APS",
            resumo: `Encontrei ${lista.length} pessoa(s) para: "${pergunta}".`,
            recomendacao:
                gerarRecomendacaoOperacionalCopilotoAPS(lista, intencao),
            lista:
                lista.slice(0, intencao.limite),
            intencao
        };
    }

    if (intencao.acao === "RECOMENDACOES") {
        return gerarRespostaRecomendacoesCopilotoAPS(intencao, dados, pergunta);
    }

    return {
        titulo:
            gerarTituloCopilotoAPS(intencao),

        resumo:
            `Encontrei ${lista.length} pessoa(s) relacionadas ao comando: "${pergunta}".`,

        recomendacao:
            gerarRecomendacaoOperacionalCopilotoAPS(lista, intencao),

        lista:
            lista.slice(0, intencao.limite),

        total:
            lista.length,

        intencao
    };
}

function gerarRespostaMotorCognitivoCopilotoAPS(respostaMotor, intencao, dados, pergunta) {
    const lista =
        ordenarListaCopilotoAPS(
            aplicarFiltroCopilotoAPS(
                aplicarLinhaCopilotoAPS([...dados.base], intencao.linha),
                intencao.filtro
            )
        );

    return {
        titulo: "🧠 Copiloto APS Cognitivo",
        resumo: String(respostaMotor || "Motor Cognitivo APS ativo."),
        recomendacao: "Use a resposta cognitiva para orientar a priorização, a agenda do dia e a discussão da equipe.",
        lista: lista.slice(0, intencao.limite),
        total: lista.length,
        intencao,
        respostaCognitiva: true
    };
}

function gerarResumoCopilotoAPS(lista, intencao, pergunta, dados) {
    const criticos =
        lista.filter(ehCriticoCopilotoAPS).length;

    const altos =
        lista.filter(p =>
            Number(p.score_territorial_global || 0) >= 65 &&
            Number(p.score_territorial_global || 0) < 85
        ).length;

    const retornoVencido =
        lista.filter(p => Number(p.prazo) === 0).length;

    const semAtendimento180 =
        lista.filter(p => diasDesdeCopilotoAPS(p.ultimo_atendimento) > 180).length;

    const pendencias =
        lista.reduce((total, p) =>
            total + (p.pendencias?.length || 0), 0
        );

    const porEquipe =
        agruparCopilotoAPS(lista, p => p.equipe || "Não informado")
            .slice(0, 5);

    const agenda =
        calcularResumoAgendaCopilotoAPS(dados.agenda || []);

    return {
        titulo: "Resumo situacional APS",
        resumo:
            `Resumo para "${pergunta}": ${lista.length} pessoas, ${criticos} críticas, ${altos} em alta prioridade, ${retornoVencido} com retorno vencido, ${semAtendimento180} sem atendimento há mais de 180 dias e ${pendencias} pendências clínicas.`,
        recomendacao:
            gerarRecomendacaoOperacionalCopilotoAPS(lista, intencao),
        indicadores: {
            total: lista.length,
            criticos,
            altos,
            retornoVencido,
            semAtendimento180,
            pendencias,
            porEquipe,
            agenda
        },
        lista:
            lista.slice(0, intencao.limite),
        intencao
    };
}

function gerarRespostaAgendaCopilotoAPS(intencao, dados, pergunta) {
    let agenda =
        [...(dados.agenda || [])];

    const n =
        normalizarCopilotoAPS;

    if (intencao.filtro === "VISITA_DOMICILIAR") {
        agenda = agenda.filter(a => n(a.tipo) === n("VISITA_DOMICILIAR") || n(a.tipo).includes("visita"));
    } else if (intencao.filtro === "BUSCA_ATIVA") {
        agenda = agenda.filter(a => n(a.tipo) === n("BUSCA_ATIVA") || n(a.tipo).includes("busca"));
    } else if (intencao.linha === "GESTANTE") {
        agenda = agenda.filter(a => n(a.tipo).includes("pre") || n(a.tipo).includes("natal") || n(a.motivo).includes("gest"));
    }

    agenda =
        agenda.sort((a, b) =>
            prioridadePesoCopilotoAPS(b.prioridade) - prioridadePesoCopilotoAPS(a.prioridade) ||
            new Date(a.data_sugerida || a.created_at || 0) -
            new Date(b.data_sugerida || b.created_at || 0)
        );

    const resumo =
        calcularResumoAgendaCopilotoAPS(agenda);

    return {
        titulo: "🗓 Agenda Inteligente APS",
        resumo:
            `Encontrei ${agenda.length} item(ns) de agenda para "${pergunta}". Busca ativa: ${resumo.buscas}; visitas: ${resumo.visitas}; consultas: ${resumo.consultas}; gestantes: ${resumo.gestantes}.`,
        recomendacao:
            agenda.length
                ? "Executar a agenda por prioridade, iniciando por visitas domiciliares críticas, busca ativa e gestantes."
                : "Nenhum item de agenda encontrado. Gere a Agenda Inteligente APS a partir do Território Inteligente.",
        agenda,
        lista:
            vincularAgendaComPacientesCopilotoAPS(agenda, dados.base).slice(0, intencao.limite),
        indicadores: {
            total: agenda.length,
            criticos: resumo.criticos,
            retornoVencido: 0,
            semAtendimento180: 0,
            pendencias: 0,
            agenda: resumo
        },
        intencao,
        tipoResposta: "AGENDA"
    };
}

function gerarRespostaCIPECopilotoAPS(intencao, dados, pergunta) {
    const resumo =
        calcularDiagnosticosCIPECopilotoAPS(dados.atendimentos || []);

    return {
        titulo: "📋 CIPE — Diagnósticos, resultados e intervenções de enfermagem",
        resumo:
            resumo.total
                ? `Encontrei ${resumo.total} registro(s) CIPE. O termo mais frequente é "${resumo.lista[0]?.termo || "-"}".`
                : "Nenhum registro CIPE encontrado nos atendimentos carregados.",
        recomendacao:
            resumo.lista.length
                ? "Use os termos CIPE mais frequentes para orientar plano educativo, consulta de enfermagem, visitas e ações coletivas."
                : "Comece a registrar CIPE no campo de avaliação de enfermagem para gerar inteligência populacional de enfermagem.",
        cipe: resumo,
        lista:
            [],
        intencao,
        tipoResposta: "CIPE"
    };
}

function gerarRespostaAgrupadaCopilotoAPS(intencao, dados, pergunta) {
    const lista =
        aplicarFiltroCopilotoAPS(
            aplicarLinhaCopilotoAPS([...dados.base], intencao.linha),
            intencao.filtro
        );

    const agrupador =
        intencao.agrupar === "UBS"
            ? (p => p.ubs || "Não informado")
            : intencao.agrupar === "EQUIPE"
                ? (p => p.equipe || "Não informado")
                : (p => p.cep || p.bairro || p.ubs || "Não informado");

    const grupos =
        agruparDetalhadoCopilotoAPS(lista, agrupador)
            .slice(0, 20);

    return {
        titulo: "🌎 Análise territorial APS",
        resumo:
            `Agrupei ${lista.length} pessoa(s) por ${intencao.agrupar || "território"} para "${pergunta}".`,
        recomendacao:
            grupos.length && grupos[0].criticos > 0
                ? `Priorizar ${grupos[0].nome}, com ${grupos[0].criticos} crítico(s) e score médio ${grupos[0].scoreMedio}.`
                : "Sem concentração crítica relevante no agrupamento solicitado.",
        grupos,
        lista:
            ordenarListaCopilotoAPS(lista).slice(0, intencao.limite),
        intencao,
        tipoResposta: "AGRUPADA"
    };
}

function gerarRespostaRecomendacoesCopilotoAPS(intencao, dados, pergunta) {
    const inteligencia =
        (dados.inteligencia || [])
            .slice()
            .sort((a, b) =>
                new Date(b.created_at || 0) -
                new Date(a.created_at || 0)
            )
            .slice(0, 6);

    const lista =
        ordenarListaCopilotoAPS([...dados.base]).slice(0, intencao.limite);

    return {
        titulo: "🧠 Recomendações Cognitivas APS",
        resumo:
            inteligencia.length
                ? `Encontrei ${inteligencia.length} recomendação/análise recente do Motor Cognitivo APS.`
                : "Ainda não há registros recentes em inteligencia_aps.",
        recomendacao:
            "Priorize os pacientes de maior Score Territorial Global e mantenha a agenda inteligente atualizada.",
        inteligencia,
        lista,
        intencao,
        tipoResposta: "RECOMENDACOES"
    };
}

function gerarRespostaPreditivaCopilotoAPS(intencao, dados, pergunta) {
    if (typeof carregarMotorPredicaoAPS === "function") {
        carregarMotorPredicaoAPS().catch(console.warn);
    }

    const predicoes =
        window.motorPredicaoAPSAtual?.predicoes || [];

    return {
        titulo: "🔮 Copiloto APS Preditivo",
        resumo:
            predicoes.length
                ? `Foram encontradas ${predicoes.length} predições carregadas para "${pergunta}".`
                : "Motor preditivo ainda não carregado ou sem predições disponíveis.",
        recomendacao:
            "Use a predição como apoio, mas priorize o Score Territorial Global para decisão operacional.",
        predicoes:
            predicoes.slice(0, 50),
        lista:
            ordenarListaCopilotoAPS([...dados.base]).slice(0, intencao.limite),
        intencao,
        tipoResposta: "PREDITIVA"
    };
}

/* ==========================================================
   FILTROS
   ========================================================== */

function aplicarLinhaCopilotoAPS(lista, linha) {
    if (linha === "HAS") return lista.filter(p => valorSimCopilotoAPS(p.has));
    if (linha === "DM") return lista.filter(p => valorSimCopilotoAPS(p.dm));
    if (linha === "GESTANTE") return lista.filter(p => valorSimCopilotoAPS(p.gestante));
    if (linha === "TB") return lista.filter(p => valorSimCopilotoAPS(p.tb));
    if (linha === "HANSEN") return lista.filter(p => valorSimCopilotoAPS(p.hansen));

    return lista;
}

function aplicarFiltroCopilotoAPS(lista, filtro) {
    if (filtro === "CRITICOS") {
        return lista.filter(ehCriticoCopilotoAPS);
    }

    if (filtro === "SEM_ATENDIMENTO_180") {
        return lista.filter(p =>
            diasDesdeCopilotoAPS(p.ultimo_atendimento) > 180
        );
    }

    if (filtro === "RETORNO_VENCIDO") {
        return lista.filter(p =>
            Number(p.prazo) === 0
        );
    }

    if (filtro === "HAS_SEM_PA") {
        return lista.filter(p =>
            valorSimCopilotoAPS(p.has) &&
            (!temValorCopilotoAPS(p.hasPAS) || !temValorCopilotoAPS(p.hasPAD))
        );
    }

    if (filtro === "DM_SEM_HBA1C") {
        return lista.filter(p =>
            valorSimCopilotoAPS(p.dm) &&
            !temValorCopilotoAPS(p.dmHbA1c)
        );
    }

    if (filtro === "VISITA_DOMICILIAR") {
        return lista.filter(p =>
            p.visita_domiciliar_indicada ||
            (p.agenda_aps || []).some(a => normalizarCopilotoAPS(a.tipo).includes("visita"))
        );
    }

    if (filtro === "BUSCA_ATIVA") {
        return lista.filter(p =>
            (p.agenda_aps || []).some(a => normalizarCopilotoAPS(a.tipo).includes("busca")) ||
            (p.pendencias?.length || 0) > 0
        );
    }

    if (filtro === "AGENDA_HOJE") {
        return lista.filter(p =>
            ehCriticoCopilotoAPS(p) ||
            Number(p.prazo) === 0 ||
            (p.pendencias?.length || 0) >= 2 ||
            (p.agenda_aps?.length || 0) > 0
        );
    }

    return lista;
}

function ordenarListaCopilotoAPS(lista) {
    return (lista || [])
        .slice()
        .sort((a, b) =>
            Number(b.score_territorial_global || 0) -
            Number(a.score_territorial_global || 0) ||
            b.scoreCopiloto - a.scoreCopiloto ||
            (b.pendencias?.length || 0) - (a.pendencias?.length || 0)
        );
}

/* ==========================================================
   RENDERIZAÇÃO
   ========================================================== */

function renderizarRespostaCopilotoAPS(resposta, pergunta) {
    const container =
        document.getElementById("respostaCopilotoAPS");

    if (!container) return;

    container.innerHTML = `
        <div class="form-section" style="border-left:5px solid var(--primary);">
            <h3 style="margin-top:0;">${escaparCopilotoAPS(resposta.titulo)}</h3>
            <p style="${resposta.respostaCognitiva ? "white-space:pre-line;" : ""}">
                ${escaparCopilotoAPS(resposta.resumo)}
            </p>
            <p style="color:var(--text-muted);">
                <strong>Recomendação:</strong>
                ${escaparCopilotoAPS(resposta.recomendacao)}
            </p>

            <div class="button-row">
                <button class="btn-primary" onclick="exportarResultadoCopilotoAPSCSV()">
                    📤 Exportar lista
                </button>

                <button class="btn-secondary" onclick="enviarResultadoCopilotoParaCentralAPS()">
                    🎯 Abrir na Central APS
                </button>

                <button class="btn-info" onclick="copiarResumoCopilotoAPS()">
                    📋 Copiar resumo
                </button>

                <button class="btn-secondary" onclick="navigate?.('agenda-inteligente-aps')">
                    🗓 Agenda APS
                </button>

                <button class="btn-secondary" onclick="navigate?.('sala-situacao-aps')">
                    🏢 Sala
                </button>
            </div>
        </div>

        ${resposta.indicadores ? renderizarIndicadoresCopilotoAPS(resposta.indicadores) : ""}

        ${resposta.cipe ? renderizarCIPECopilotoAPS(resposta.cipe) : ""}

        ${resposta.grupos ? renderizarGruposCopilotoAPS(resposta.grupos) : ""}

        ${resposta.agenda ? renderizarAgendaCopilotoAPS(resposta.agenda) : ""}

        ${resposta.inteligencia ? renderizarInteligenciaCopilotoAPS(resposta.inteligencia) : ""}

        ${resposta.predicoes ? renderizarPredicoesCopilotoAPS(resposta.predicoes) : ""}

        ${renderizarListaCopilotoAPS(resposta.lista || [])}
    `;
}

function renderizarIndicadoresCopilotoAPS(ind) {
    return `
        <div class="dashboard-grid">
            <div class="dash-card">
                <div class="dash-icon icon-blue">👥</div>
                <div>
                    <h3>${ind.total}</h3>
                    <p>Total encontrado</p>
                </div>
            </div>

            <div class="dash-card">
                <div class="dash-icon icon-red">🚨</div>
                <div>
                    <h3>${ind.criticos}</h3>
                    <p>Críticos</p>
                </div>
            </div>

            <div class="dash-card">
                <div class="dash-icon icon-yellow">🟠</div>
                <div>
                    <h3>${ind.altos || 0}</h3>
                    <p>Alta prioridade</p>
                </div>
            </div>

            <div class="dash-card">
                <div class="dash-icon icon-yellow">📅</div>
                <div>
                    <h3>${ind.retornoVencido}</h3>
                    <p>Retorno vencido</p>
                </div>
            </div>

            <div class="dash-card">
                <div class="dash-icon icon-purple">⏳</div>
                <div>
                    <h3>${ind.semAtendimento180}</h3>
                    <p>Sem atendimento &gt;180d</p>
                </div>
            </div>

            <div class="dash-card">
                <div class="dash-icon icon-cyan">🧭</div>
                <div>
                    <h3>${ind.pendencias}</h3>
                    <p>Pendências</p>
                </div>
            </div>
        </div>
    `;
}

function renderizarListaCopilotoAPS(lista) {
    if (!lista.length) {
        return `
            <div class="form-section">
                <p style="color:var(--text-muted);">Nenhum paciente encontrado para este comando.</p>
            </div>
        `;
    }

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">📋 Lista acionável</h3>

            <div style="overflow-x:auto;">
                <table class="table-sintaxe">
                    <thead>
                        <tr>
                            <th>Paciente</th>
                            <th>Equipe / UBS</th>
                            <th>Linhas</th>
                            <th>Score Global</th>
                            <th>Prioridade</th>
                            <th>Pendências</th>
                            <th>Ações</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${lista.map(p => `
                            <tr>
                                <td>
                                    <strong>${escaparCopilotoAPS(p.nome || "Sem nome")}</strong>
                                    <small>CPF: ${formatarDocumentoCopilotoAPS(p.cpf || "-")} | CNS: ${escaparCopilotoAPS(p.cns || "-")}</small>
                                </td>

                                <td>
                                    ${escaparCopilotoAPS(p.equipe || "-")}
                                    <small>${escaparCopilotoAPS(p.ubs || "-")}</small>
                                </td>

                                <td>
                                    ${renderizarLinhasCopilotoAPS(p)}
                                </td>

                                <td>
                                    <strong>${Number(p.score_territorial_global || 0)}</strong>
                                    <small>${escaparCopilotoAPS(p.acao_recomendada || p.resumo_ia || "")}</small>
                                </td>

                                <td>
                                    ${badgeNivelCopilotoAPS(p.nivel_prioridade)}
                                </td>

                                <td>
                                    ${
                                        p.pendencias?.length
                                            ? p.pendencias.map(x =>
                                                `<span class="status-badge status-warning">${escaparCopilotoAPS(x)}</span>`
                                            ).join(" ")
                                            : `<span style="color:var(--text-muted);">-</span>`
                                    }
                                </td>

                                <td>
                                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                        <button class="btn-table-action btn-edit" onclick="abrirAtendimentoExistente?.('${escaparCopilotoAPS(p.cpf || "")}', '${escaparCopilotoAPS(p.cns || "")}')">
                                            📋 Prontuário
                                        </button>

                                        <button class="btn-table-action btn-ok" onclick="abrirLinhaTempoTerritorial?.('${escaparCopilotoAPS(p.cpf || "")}', '${escaparCopilotoAPS(p.cns || "")}')">
                                            🧬 Linha
                                        </button>

                                        <button class="btn-table-action btn-warn" onclick="abrirModuloVisitaDomiciliarAPS?.('${escaparCopilotoAPS(p.cpf || "")}', '${escaparCopilotoAPS(p.cns || "")}', 'ACS')">
                                            🏠 Visita
                                        </button>

                                        <button class="btn-table-action btn-info" onclick="abrirPacienteCopilotoNaCentralAPS('${escaparCopilotoAPS(p.cpf || p.cns || "")}')">
                                            🎯 Central
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderizarLinhasCopilotoAPS(p) {
    const linhas = [];

    if (valorSimCopilotoAPS(p.has)) linhas.push("HAS");
    if (valorSimCopilotoAPS(p.dm)) linhas.push("DM");
    if (valorSimCopilotoAPS(p.gestante)) linhas.push("Gestante");
    if (valorSimCopilotoAPS(p.tb)) linhas.push("TB");
    if (valorSimCopilotoAPS(p.hansen)) linhas.push("Hansen");

    if (!linhas.length) return "-";

    return linhas
        .map(x => `<span class="status-badge status-info">${x}</span>`)
        .join(" ");
}

function renderizarAgendaCopilotoAPS(agenda) {
    if (!agenda || !agenda.length) return "";

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">🗓 Agenda APS encontrada</h3>

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
                    ${agenda.slice(0, 20).map(a => `
                        <tr>
                            <td>${escaparCopilotoAPS(formatarDataCopilotoAPS(a.data_sugerida || a.created_at))}</td>
                            <td>
                                <strong>${escaparCopilotoAPS(a.paciente_nome || "Paciente")}</strong>
                                <small>CPF: ${escaparCopilotoAPS(a.paciente_cpf || "-")}</small>
                            </td>
                            <td>${escaparCopilotoAPS(String(a.tipo || "").replace(/_/g, " "))}</td>
                            <td>${badgePrioridadeCopilotoAPS(a.prioridade)}</td>
                            <td><small>${escaparCopilotoAPS(a.motivo || "-")}</small></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderizarCIPECopilotoAPS(cipe) {
    if (!cipe || !cipe.lista?.length) {
        return `
            <div class="form-section">
                <p style="color:var(--text-muted);">Sem registros CIPE para exibir.</p>
            </div>
        `;
    }

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">📋 CIPE mais frequentes</h3>

            <table class="table-sintaxe">
                <thead>
                    <tr>
                        <th>Termo CIPE</th>
                        <th>Registros</th>
                        <th>%</th>
                    </tr>
                </thead>

                <tbody>
                    ${cipe.lista.slice(0, 20).map(item => `
                        <tr>
                            <td><strong>${escaparCopilotoAPS(item.termo)}</strong></td>
                            <td>${item.total}</td>
                            <td>${item.percentual}%</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderizarGruposCopilotoAPS(grupos) {
    if (!grupos || !grupos.length) return "";

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">🌎 Agrupamento territorial</h3>

            <table class="table-sintaxe">
                <thead>
                    <tr>
                        <th>Grupo</th>
                        <th>População</th>
                        <th>Críticos</th>
                        <th>Altos</th>
                        <th>Pendências</th>
                        <th>Score médio</th>
                    </tr>
                </thead>

                <tbody>
                    ${grupos.map(g => `
                        <tr>
                            <td><strong>${escaparCopilotoAPS(g.nome)}</strong></td>
                            <td>${g.total}</td>
                            <td>${g.criticos}</td>
                            <td>${g.altos}</td>
                            <td>${g.pendencias}</td>
                            <td><strong>${g.scoreMedio}</strong></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderizarInteligenciaCopilotoAPS(lista) {
    if (!lista || !lista.length) return "";

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">🧠 Motor Cognitivo APS</h3>

            ${lista.map(i => `
                <div style="
                    border:1px solid var(--border);
                    border-left:5px solid var(--primary);
                    border-radius:10px;
                    padding:12px;
                    margin-bottom:10px;
                    background:#111c2e;
                ">
                    <strong>${escaparCopilotoAPS(i.tipo || "Análise")}</strong>
                    <p style="white-space:pre-line; color:var(--text-muted);">
                        ${escaparCopilotoAPS(i.resposta || "")}
                    </p>
                    <small>${escaparCopilotoAPS(formatarDataHoraCopilotoAPS(i.created_at))}</small>
                </div>
            `).join("")}
        </div>
    `;
}

function renderizarPredicoesCopilotoAPS(lista) {
    if (!lista || !lista.length) return "";

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">🔮 Predições APS</h3>

            <table class="table-sintaxe">
                <thead>
                    <tr>
                        <th>Paciente</th>
                        <th>Equipe / UBS</th>
                        <th>Score</th>
                        <th>Abandono</th>
                        <th>Internação</th>
                        <th>Descompensação</th>
                    </tr>
                </thead>

                <tbody>
                    ${lista.slice(0, 30).map(p => `
                        <tr>
                            <td>
                                <strong>${escaparCopilotoAPS(p.nome || "Sem nome")}</strong>
                                <small>CPF: ${escaparCopilotoAPS(p.cpf || "-")}</small>
                            </td>
                            <td>${escaparCopilotoAPS(p.equipe || "-")}<small>${escaparCopilotoAPS(p.ubs || "-")}</small></td>
                            <td><strong>${p.scoreGeral || 0}%</strong></td>
                            <td>${p.abandono?.probabilidade || 0}%</td>
                            <td>${p.internacao?.probabilidade || 0}%</td>
                            <td>${p.descompensacao?.probabilidade || 0}%</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

/* ==========================================================
   COMANDOS RÁPIDOS
   ========================================================== */

function comandoRapidoCopilotoAPS(texto) {
    const input =
        document.getElementById("inputCopilotoAPS");

    if (input) {
        input.value = texto;
    }

    executarCopilotoAPS();
}

function abrirCopilotoAPS() {
    const modal =
        document.getElementById("modalCopilotoAPS");

    if (modal) {
        modal.style.display = "flex";
    }

    setTimeout(() => {
        document.getElementById("inputCopilotoAPS")?.focus();
    }, 100);
}

function fecharCopilotoAPS() {
    const modal =
        document.getElementById("modalCopilotoAPS");

    if (modal) {
        modal.style.display = "none";
    }
}

/* ==========================================================
   AÇÕES
   ========================================================== */

function abrirPacienteCopilotoNaCentralAPS(termo) {
    if (typeof navigate === "function") {
        navigate("central-aps");
    }

    setTimeout(() => {
        const campo =
            document.getElementById("buscaCentralAPS");

        if (campo) {
            campo.value = termo || "";
        }

        if (typeof aplicarFilaCentralAPS === "function") {
            aplicarFilaCentralAPS("PENDENCIAS");
        }
    }, 450);
}

function enviarResultadoCopilotoParaCentralAPS() {
    if (!copilotoAPSResultadoAtual.length) {
        mostrarToast?.("Nenhum resultado para enviar.");
        return;
    }

    const primeiro =
        copilotoAPSResultadoAtual[0];

    abrirPacienteCopilotoNaCentralAPS(
        primeiro.cpf ||
        primeiro.cns ||
        ""
    );
}

function copiarResumoCopilotoAPS() {
    const container =
        document.getElementById("respostaCopilotoAPS");

    if (!container) return;

    const texto =
        container.innerText || "";

    navigator.clipboard
        ?.writeText(texto)
        .then(() => mostrarToast?.("Resumo copiado."))
        .catch(() => alert(texto));
}

function exportarResultadoCopilotoAPSCSV() {
    if (!copilotoAPSResultadoAtual.length) {
        mostrarToast?.("Nenhum resultado para exportar.");
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
            "pendencias"
        ]
    ];

    copilotoAPSResultadoAtual.forEach(p => {
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
            (p.pendencias || []).join(" | ")
        ]);
    });

    baixarCSVCopilotoAPS(
        linhas,
        `copiloto_aps_cognitivo_${new Date().toISOString().slice(0, 10)}.csv`
    );
}

function baixarCSVCopilotoAPS(linhas, nomeArquivo) {
    const csv =
        linhas
            .map(linha =>
                linha
                    .map(campo => `"${String(campo ?? "").replace(/"/g, '""')}"`)
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

async function registrarInteracaoCopilotoAPS(pergunta, resposta, intencao) {
    if (typeof supabaseClient === "undefined") return null;

    try {
        await supabaseClient
            .from("inteligencia_aps")
            .insert({
                tipo: "COPILOTO_APS",
                escopo: "GLOBAL",
                referencia_id: "COPILOTO",
                pergunta,
                resposta:
                    `${resposta.titulo}\n\n${resposta.resumo}\n\n${resposta.recomendacao}`,
                contexto: {
                    intencao,
                    total: resposta.total || resposta.lista?.length || 0
                },
                confianca: 0.8,
                origem: "copiloto_aps_cognitivo"
            });

    } catch (erro) {
        console.warn("Copiloto APS: não foi possível registrar inteligencia_aps.", erro);
    }

    return null;
}

/* ==========================================================
   REGRAS
   ========================================================== */

function identificarPendenciasCopilotoAPS(p) {
    const pendencias = [];

    if (
        valorSimCopilotoAPS(p.has) &&
        (!temValorCopilotoAPS(p.hasPAS) || !temValorCopilotoAPS(p.hasPAD))
    ) {
        pendencias.push("HAS sem PA");
    }

    if (
        valorSimCopilotoAPS(p.dm) &&
        !temValorCopilotoAPS(p.dmHbA1c)
    ) {
        pendencias.push("DM sem HbA1c");
    }

    if (
        valorSimCopilotoAPS(p.gestante) &&
        diasDesdeCopilotoAPS(p.ultimo_atendimento) > 30
    ) {
        pendencias.push("Gestante sem consulta recente");
    }

    if (
        valorSimCopilotoAPS(p.tb) &&
        diasDesdeCopilotoAPS(p.ultimo_atendimento) > 30
    ) {
        pendencias.push("TB sem acompanhamento");
    }

    if (
        valorSimCopilotoAPS(p.hansen) &&
        diasDesdeCopilotoAPS(p.ultimo_atendimento) > 60
    ) {
        pendencias.push("Hanseníase sem avaliação");
    }

    if (Number(p.prazo) === 0) {
        pendencias.push("Retorno vencido");
    }

    if (diasDesdeCopilotoAPS(p.ultimo_atendimento) > 180) {
        pendencias.push("Sem atendimento >180 dias");
    }

    return [...new Set(pendencias)];
}

function calcularScoreCopilotoAPS(p) {
    if (Number(p.score_territorial_global || 0) > 0) {
        return Number(p.score_territorial_global || 0);
    }

    let score = 0;

    if (Number(p.prazo) === 0) score += 15;
    if (normalizarCopilotoAPS(p.risco_global).includes("alto")) score += 15;
    if (Number(p.risco_pontos || 0) >= 6) score += 15;
    if (valorSimCopilotoAPS(p.tb)) score += 10;
    if (valorSimCopilotoAPS(p.hansen)) score += 10;
    if (valorSimCopilotoAPS(p.gestante)) score += 8;
    if (valorSimCopilotoAPS(p.has)) score += 5;
    if (valorSimCopilotoAPS(p.dm)) score += 5;

    score +=
        (p.pendencias?.length || identificarPendenciasCopilotoAPS(p).length) * 5;

    if (diasDesdeCopilotoAPS(p.ultimo_atendimento) > 180) {
        score += 10;
    }

    return Math.min(100, score);
}

function ehCriticoCopilotoAPS(p) {
    return (
        Number(p.score_territorial_global || 0) >= 85 ||
        String(p.nivel_prioridade || "").toUpperCase() === "CRITICO" ||
        Number(p.prazo) === 0
    );
}

function gerarTituloCopilotoAPS(intencao) {
    const linha = {
        TODAS: "população monitorada",
        HAS: "hipertensos",
        DM: "diabéticos",
        GESTANTE: "gestantes",
        TB: "tuberculose",
        HANSEN: "hanseníase"
    }[intencao.linha] || "população";

    const filtro = {
        GERAL: "",
        CRITICOS: "prioritários",
        SEM_ATENDIMENTO_180: "sem atendimento há mais de 180 dias",
        RETORNO_VENCIDO: "com retorno vencido",
        HAS_SEM_PA: "sem PA registrada",
        DM_SEM_HBA1C: "sem HbA1c registrada",
        AGENDA_HOJE: "para agenda de hoje",
        VISITA_DOMICILIAR: "para visita domiciliar",
        BUSCA_ATIVA: "para busca ativa"
    }[intencao.filtro] || "";

    return `Copiloto APS — ${linha} ${filtro}`.trim();
}

function gerarRecomendacaoOperacionalCopilotoAPS(lista, intencao) {
    if (!lista.length) {
        return "Nenhuma ação operacional necessária para este comando.";
    }

    const criticos =
        lista.filter(ehCriticoCopilotoAPS).length;

    const retorno =
        lista.filter(p => Number(p.prazo) === 0).length;

    const visitas =
        lista.filter(p =>
            p.visita_domiciliar_indicada ||
            (p.agenda_aps || []).some(a => normalizarCopilotoAPS(a.tipo).includes("visita"))
        ).length;

    if (criticos >= 10) {
        return "Priorizar agenda protegida para casos críticos e dividir lista nominal por equipe/ACS.";
    }

    if (visitas >= 5) {
        return "Organizar roteiro de visitas domiciliares por microárea e iniciar pelos maiores scores territoriais.";
    }

    if (retorno >= 10) {
        return "Organizar mutirão de retorno vencido e contato ativo por equipe.";
    }

    if (intencao.filtro === "HAS_SEM_PA") {
        return "Programar aferição de PA e atualização do registro clínico dos hipertensos.";
    }

    if (intencao.filtro === "DM_SEM_HBA1C") {
        return "Atualizar HbA1c, revisar adesão e programar seguimento dos diabéticos.";
    }

    if (intencao.linha === "GESTANTE") {
        return "Garantir calendário de pré-natal, vacinação e busca ativa das gestantes atrasadas.";
    }

    return "Revisar lista prioritária e acionar Central APS para acompanhamento longitudinal.";
}

/* ==========================================================
   CÁLCULOS AUXILIARES
   ========================================================== */

function gerarResumoContextoCopilotoAPS(base, agenda, inteligencia, atendimentos) {
    const criticos =
        base.filter(ehCriticoCopilotoAPS).length;

    const altos =
        base.filter(p =>
            Number(p.score_territorial_global || 0) >= 65 &&
            Number(p.score_territorial_global || 0) < 85
        ).length;

    const scoreMedio =
        base.length
            ? Math.round(
                base.reduce((s, p) => s + Number(p.score_territorial_global || 0), 0) / base.length
            )
            : 0;

    return {
        total: base.length,
        criticos,
        altos,
        scoreMedio,
        agenda: calcularResumoAgendaCopilotoAPS(agenda),
        cipe: calcularDiagnosticosCIPECopilotoAPS(atendimentos),
        inteligencia: inteligencia.length
    };
}

function calcularResumoAgendaCopilotoAPS(agenda) {
    const n =
        normalizarCopilotoAPS;

    const porTipo =
        tipo => (agenda || []).filter(a => n(a.tipo) === n(tipo) || n(a.tipo).includes(n(tipo))).length;

    const criticos =
        (agenda || []).filter(a =>
            n(a.prioridade).includes("critic") ||
            Number(a.score_territorial_global || 0) >= 85
        ).length;

    return {
        total: (agenda || []).length,
        criticos,
        buscas: porTipo("BUSCA_ATIVA") + porTipo("busca"),
        visitas: porTipo("VISITA_DOMICILIAR") + porTipo("visita"),
        consultas: porTipo("CONSULTA") + porTipo("consulta"),
        gestantes: porTipo("PRE_NATAL") + porTipo("prenatal") + porTipo("pre natal"),
        vacinacao: porTipo("VACINACAO") + porTipo("vacinacao"),
        material: porTipo("ENTREGA_MATERIAL") + porTipo("material")
    };
}

function calcularDiagnosticosCIPECopilotoAPS(atendimentos) {
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

function vincularAgendaComPacientesCopilotoAPS(agenda, base) {
    const mapa =
        new Map();

    (base || []).forEach(p => {
        const chave =
            limparDocumentoCopilotoAPS(p.cpf || "");

        if (chave) mapa.set(chave, p);
    });

    return (agenda || []).map(a => {
        const chave =
            limparDocumentoCopilotoAPS(a.paciente_cpf || "");

        const p =
            mapa.get(chave);

        if (p) return p;

        return {
            nome: a.paciente_nome || "Paciente",
            cpf: a.paciente_cpf || "",
            cns: "",
            equipe: a.equipe || "",
            ubs: a.ubs || "",
            has: "Não",
            dm: "Não",
            gestante: "Não",
            tb: "Não",
            hansen: "Não",
            score_territorial_global: Number(a.score_territorial_global || 0),
            nivel_prioridade: a.prioridade || "",
            acao_recomendada: a.motivo || "",
            pendencias: a.motivo ? [a.motivo] : [],
            agenda_aps: [a],
            scoreCopiloto: Number(a.score_territorial_global || 0)
        };
    });
}

function agruparCopilotoAPS(lista, chaveFn) {
    const grupos = {};

    lista.forEach(item => {
        const chave =
            chaveFn(item) || "Não informado";

        grupos[chave] =
            (grupos[chave] || 0) + 1;
    });

    return Object
        .entries(grupos)
        .map(([nome, total]) => ({ nome, total }))
        .sort((a, b) => b.total - a.total);
}

function agruparDetalhadoCopilotoAPS(lista, chaveFn) {
    const grupos = {};

    lista.forEach(p => {
        const nome =
            chaveFn(p) || "Não informado";

        if (!grupos[nome]) {
            grupos[nome] = {
                nome,
                total: 0,
                criticos: 0,
                altos: 0,
                pendencias: 0,
                somaScore: 0,
                scoreMedio: 0
            };
        }

        const g =
            grupos[nome];

        const score =
            Number(p.score_territorial_global || 0);

        g.total++;
        g.somaScore += score;

        if (ehCriticoCopilotoAPS(p)) g.criticos++;

        if (score >= 65 && score < 85) g.altos++;

        g.pendencias +=
            p.pendencias?.length || 0;
    });

    Object.values(grupos).forEach(g => {
        g.scoreMedio =
            g.total > 0
                ? Math.round(g.somaScore / g.total)
                : 0;
    });

    return Object
        .values(grupos)
        .sort((a, b) =>
            b.scoreMedio - a.scoreMedio ||
            b.criticos - a.criticos ||
            b.pendencias - a.pendencias
        );
}

/* ==========================================================
   HELPERS
   ========================================================== */

function normalizarCopilotoAPS(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function valorSimCopilotoAPS(valor) {
    const v =
        normalizarCopilotoAPS(valor);

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

function temValorCopilotoAPS(valor) {
    return (
        valor !== null &&
        valor !== undefined &&
        String(valor).trim() !== ""
    );
}

function primeiroValorCopilotoAPS(...valores) {
    for (const valor of valores) {
        if (temValorCopilotoAPS(valor)) {
            return valor;
        }
    }

    return null;
}

function diasDesdeCopilotoAPS(data) {
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

function limparDocumentoCopilotoAPS(valor) {
    return String(valor || "")
        .replace(/\D/g, "");
}

function formatarDocumentoCopilotoAPS(valor) {
    const doc =
        limparDocumentoCopilotoAPS(valor);

    if (doc.length === 11) {
        return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }

    return valor || "-";
}

function formatarDataCopilotoAPS(valor) {
    if (!valor) return "-";

    const d =
        new Date(valor);

    if (Number.isNaN(d.getTime())) {
        return String(valor);
    }

    return d.toLocaleDateString("pt-BR");
}

function formatarDataHoraCopilotoAPS(valor) {
    if (!valor) return "-";

    const d =
        new Date(valor);

    if (Number.isNaN(d.getTime())) {
        return String(valor);
    }

    return d.toLocaleString("pt-BR");
}

function prioridadePesoCopilotoAPS(valor) {
    const v =
        normalizarCopilotoAPS(valor);

    if (v.includes("critic")) return 4;
    if (v.includes("alt")) return 3;
    if (v.includes("moder")) return 2;
    return 1;
}

function normalizarNivelPrioridadeCopilotoAPS(valor) {
    const v =
        normalizarCopilotoAPS(valor);

    if (!v) return "";

    if (v.includes("critic")) return "CRITICO";
    if (v.includes("alt")) return "ALTO";
    if (v.includes("moder")) return "MODERADO";
    if (v.includes("baix")) return "BAIXO";

    return "";
}

function classificarNivelCopilotoAPS(score) {
    if (score >= 85) return "CRITICO";
    if (score >= 65) return "ALTO";
    if (score >= 40) return "MODERADO";
    return "BAIXO";
}

function badgeNivelCopilotoAPS(nivel) {
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

function badgePrioridadeCopilotoAPS(prioridade) {
    const p =
        normalizarCopilotoAPS(prioridade);

    if (p.includes("critic")) {
        return `<span class="status-badge status-danger">CRÍTICA</span>`;
    }

    if (p.includes("alta") || p.includes("alto")) {
        return `<span class="status-badge status-warning">ALTA</span>`;
    }

    if (p.includes("moder")) {
        return `<span class="status-badge status-info">MODERADA</span>`;
    }

    return `<span class="status-badge status-success">${escaparCopilotoAPS(prioridade || "ROTINA")}</span>`;
}

function escaparCopilotoAPS(valor) {
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

window.executarCopilotoAPS = executarCopilotoAPS;
window.comandoRapidoCopilotoAPS = comandoRapidoCopilotoAPS;
window.abrirCopilotoAPS = abrirCopilotoAPS;
window.fecharCopilotoAPS = fecharCopilotoAPS;
window.exportarResultadoCopilotoAPSCSV = exportarResultadoCopilotoAPSCSV;
window.enviarResultadoCopilotoParaCentralAPS = enviarResultadoCopilotoParaCentralAPS;
window.copiarResumoCopilotoAPS = copiarResumoCopilotoAPS;
window.carregarDadosCopilotoAPS = carregarDadosCopilotoAPS;
window.copilotoAPSContextoAtual = copilotoAPSContextoAtual;

console.log("✅ Copiloto APS Cognitivo carregado.");
