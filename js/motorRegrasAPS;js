/* ==========================================================
   🧠 MOTOR DE REGRAS APS — SINTAXEHUB
   Automação operacional baseada em regras explicáveis

   Objetivo:
   - Ler pacientes, atendimentos e territorio_inteligente
   - Detectar riscos e pendências
   - Gerar agenda_aps automaticamente
   - Evitar duplicidade no mesmo dia
   - Alimentar Central de Operações, Torre APS e Sala de Situação

   Supabase-first.
   ========================================================== */

let motorRegrasAPSAtual = {
    pacientes: [],
    atendimentos: [],
    territorio: [],
    agendaExistente: [],
    agendaGerada: [],
    regrasAcionadas: [],
    resumo: null,
    ultimaAtualizacao: null
};

/* ==========================================================
   EXECUÇÃO PRINCIPAL
   ========================================================== */

async function executarMotorRegrasAPS(opcoes = {}) {
    if (typeof supabaseClient === "undefined") {
        console.warn("Motor de Regras APS: Supabase não carregado.");
        return null;
    }

    const hoje =
        opcoes.dataReferencia ||
        new Date().toISOString().slice(0, 10);

    try {
        const [
            pacientes,
            atendimentos,
            territorio,
            agendaExistente
        ] = await Promise.all([
            buscarTabelaMotorRegrasAPS("pacientes", "*", 20000),
            buscarTabelaMotorRegrasAPS("atendimentos", "*", 50000, "data_atendimento"),
            buscarTabelaMotorRegrasAPS("territorio_inteligente", "*", 50000, "ultima_atualizacao"),
            buscarAgendaExistenteMotorRegrasAPS(hoje)
        ]);

        const base =
            consolidarBaseMotorRegrasAPS(
                pacientes,
                atendimentos,
                territorio
            );

        const agendaGerada = [];
        const regrasAcionadas = [];

        base.forEach(paciente => {
            const resultado =
                avaliarPacienteMotorRegrasAPS(
                    paciente,
                    hoje
                );

            resultado.acoes.forEach(acao => {
                if (
                    !existeAgendaDuplicadaMotorRegrasAPS(
                        agendaExistente,
                        agendaGerada,
                        acao
                    )
                ) {
                    agendaGerada.push(acao);
                }
            });

            if (resultado.regras.length) {
                regrasAcionadas.push({
                    paciente_cpf: paciente.cpf || "",
                    paciente_nome: paciente.nome || "",
                    score_territorial_global: paciente.score_territorial_global || 0,
                    nivel_prioridade: paciente.nivel_prioridade || "",
                    regras: resultado.regras
                });
            }
        });

        let inseridos = [];

        if (agendaGerada.length && opcoes.simular !== true) {
            const { data, error } =
                await supabaseClient
                    .from("agenda_aps")
                    .insert(agendaGerada)
                    .select();

            if (error) {
                console.error("Motor de Regras APS: erro ao inserir agenda_aps:", error);
                throw error;
            }

            inseridos =
                data || [];
        }

        const resumo =
            gerarResumoMotorRegrasAPS(
                base,
                agendaGerada,
                regrasAcionadas,
                hoje
            );

        motorRegrasAPSAtual = {
            pacientes,
            atendimentos,
            territorio,
            agendaExistente,
            agendaGerada,
            regrasAcionadas,
            resumo,
            ultimaAtualizacao: new Date().toISOString()
        };

        window.motorRegrasAPSAtual =
            motorRegrasAPSAtual;

        console.log("🧠 Motor de Regras APS executado:", resumo);

        await registrarExecucaoMotorRegrasAPS(resumo, regrasAcionadas);

        return {
            ...motorRegrasAPSAtual,
            inseridos,
            simulado: opcoes.simular === true
        };

    } catch (erro) {
        console.error("Erro ao executar Motor de Regras APS:", erro);
        return null;
    }
}

/* ==========================================================
   BUSCAS
   ========================================================== */

async function buscarTabelaMotorRegrasAPS(
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
            console.warn(`Motor de Regras APS: tabela indisponível ${tabela}`, error.message || error);
            return [];
        }

        return data || [];

    } catch (erro) {
        console.warn(`Motor de Regras APS: falha em ${tabela}`, erro);
        return [];
    }
}

async function buscarAgendaExistenteMotorRegrasAPS(dataReferencia) {
    try {
        const { data, error } =
            await supabaseClient
                .from("agenda_aps")
                .select("*")
                .eq("data_sugerida", dataReferencia)
                .limit(50000);

        if (error) {
            console.warn("Motor de Regras APS: agenda_aps indisponível.", error.message);
            return [];
        }

        return data || [];

    } catch (erro) {
        console.warn("Motor de Regras APS: falha ao buscar agenda existente.", erro);
        return [];
    }
}

/* ==========================================================
   CONSOLIDAÇÃO
   ========================================================== */

function consolidarBaseMotorRegrasAPS(pacientes, atendimentos, territorio) {
    let base = [];

    if (typeof consolidarBaseTorreAPS === "function") {
        try {
            base =
                consolidarBaseTorreAPS(pacientes || [], atendimentos || []) || [];
        } catch (erro) {
            console.warn("Motor de Regras APS: consolidarBaseTorreAPS falhou. Usando fallback.", erro);
            base =
                consolidarBaseFallbackMotorRegrasAPS(pacientes, atendimentos);
        }
    } else {
        base =
            consolidarBaseFallbackMotorRegrasAPS(pacientes, atendimentos);
    }

    enriquecerBaseComTerritorioMotorRegrasAPS(base, territorio);

    return base.map(p => ({
        ...p,
        cpf: limparDocumentoMotorRegrasAPS(p.cpf || p.paciente_cpf || ""),
        cns: limparDocumentoMotorRegrasAPS(p.cns || ""),
        pendencias:
            Array.isArray(p.pendencias)
                ? p.pendencias
                : identificarPendenciasMotorRegrasAPS(p)
    }));
}

function consolidarBaseFallbackMotorRegrasAPS(pacientes, atendimentos) {
    const mapa =
        new Map();

    (pacientes || []).forEach(p => {
        const chave =
            limparDocumentoMotorRegrasAPS(p.cpf || "") ||
            limparDocumentoMotorRegrasAPS(p.cns || "") ||
            p.id;

        if (!chave) return;

        mapa.set(chave, {
            id: p.id || "",
            nome: p.nome || "",
            cpf: limparDocumentoMotorRegrasAPS(p.cpf || ""),
            cns: limparDocumentoMotorRegrasAPS(p.cns || ""),
            telefone: p.telefone || "",
            cep: p.cep || "",
            bairro: p.bairro || "",
            ubs: p.ubs_vinculacao || p.ubs || p.unidade || "Não informado",
            equipe: p.equipe_esf || p.equipe || "Não informado",
            has: p.has || "Não",
            dm: p.dm || "Não",
            gestante: p.gestante || "Não",
            tb: p.tb || "Não",
            hansen: p.hansen || "Não",
            acamado: p.acamado || false,
            domiciliado: p.domiciliado || false,
            risco_global: p.risco_global || "Não informado",
            risco_pontos: Number(p.risco_pontos || 0),
            prazo: null,
            reavaliacaoDias: null,
            ultimo_atendimento: null,
            hasPAS: null,
            hasPAD: null,
            objPAS: null,
            objPAD: null,
            dmHbA1c: null,
            inputBuscaCIPE: "",
            evfam_total: 0,
            score_territorial_global: 0,
            nivel_prioridade: "BAIXO"
        });
    });

    (atendimentos || []).forEach(a => {
        const chave =
            limparDocumentoMotorRegrasAPS(a.paciente_cpf || "") ||
            limparDocumentoMotorRegrasAPS(a.cpf || "") ||
            limparDocumentoMotorRegrasAPS(a.cns || "");

        if (!chave) return;

        const atual =
            mapa.get(chave) || {
                id: "",
                nome: a.nome_paciente || a.nome || "",
                cpf: limparDocumentoMotorRegrasAPS(a.paciente_cpf || a.cpf || ""),
                cns: limparDocumentoMotorRegrasAPS(a.cns || ""),
                telefone: a.telefone || "",
                cep: a.cep || "",
                bairro: a.bairro || "",
                ubs: a.ubs_vinculacao || a.ubs || "Não informado",
                equipe: a.equipe_esf || a.equipe || "Não informado",
                has: "Não",
                dm: "Não",
                gestante: "Não",
                tb: "Não",
                hansen: "Não",
                acamado: false,
                domiciliado: false,
                risco_global: "Não informado",
                risco_pontos: 0,
                prazo: null,
                reavaliacaoDias: null,
                ultimo_atendimento: null,
                hasPAS: null,
                hasPAD: null,
                objPAS: null,
                objPAD: null,
                dmHbA1c: null,
                inputBuscaCIPE: "",
                evfam_total: 0,
                score_territorial_global: 0,
                nivel_prioridade: "BAIXO"
            };

        if (!atual.nome) atual.nome = a.nome_paciente || a.nome || "";
        if (!atual.telefone && a.telefone) atual.telefone = a.telefone;

        if (valorSimMotorRegrasAPS(a.has) || valorSimMotorRegrasAPS(a.hasSN)) atual.has = "Sim";
        if (valorSimMotorRegrasAPS(a.dm) || valorSimMotorRegrasAPS(a.dmSN)) atual.dm = "Sim";
        if (valorSimMotorRegrasAPS(a.gestante) || valorSimMotorRegrasAPS(a.gestanteSN)) atual.gestante = "Sim";
        if (valorSimMotorRegrasAPS(a.tb) || valorSimMotorRegrasAPS(a.tbSN)) atual.tb = "Sim";
        if (valorSimMotorRegrasAPS(a.hansen) || valorSimMotorRegrasAPS(a.hansenSN)) atual.hansen = "Sim";

        atual.risco_global =
            a.risco_global ||
            atual.risco_global;

        atual.risco_pontos =
            Number(a.risco_pontos ?? atual.risco_pontos ?? 0);

        atual.prazo =
            a.reavaliacaoDias ??
            a.retorno_dias ??
            a.soapReavaliacaoDias ??
            atual.prazo;

        atual.reavaliacaoDias =
            atual.prazo;

        atual.ultimo_atendimento =
            a.data_atendimento ||
            a.criado_em ||
            a.created_at ||
            atual.ultimo_atendimento;

        atual.hasPAS =
            primeiroValorMotorRegrasAPS(a.objPAS, a.hasPAS, a.has_pas, atual.hasPAS);

        atual.hasPAD =
            primeiroValorMotorRegrasAPS(a.objPAD, a.hasPAD, a.has_pad, atual.hasPAD);

        atual.objPAS =
            primeiroValorMotorRegrasAPS(a.objPAS, a.hasPAS, a.has_pas, atual.objPAS);

        atual.objPAD =
            primeiroValorMotorRegrasAPS(a.objPAD, a.hasPAD, a.has_pad, atual.objPAD);

        atual.dmHbA1c =
            primeiroValorMotorRegrasAPS(a.dmHbA1c, a.dm_hba1c, a.hba1c, atual.dmHbA1c);

        atual.inputBuscaCIPE =
            a.inputBuscaCIPE ||
            atual.inputBuscaCIPE ||
            "";

        if (a.equipe_esf || a.equipe) {
            atual.equipe =
                a.equipe_esf ||
                a.equipe;
        }

        if (a.ubs_vinculacao || a.ubs) {
            atual.ubs =
                a.ubs_vinculacao ||
                a.ubs;
        }

        mapa.set(chave, atual);
    });

    return Array.from(mapa.values()).map(p => ({
        ...p,
        pendencias: identificarPendenciasMotorRegrasAPS(p)
    }));
}

function enriquecerBaseComTerritorioMotorRegrasAPS(base, territorio) {
    const mapa =
        new Map();

    (territorio || []).forEach(t => {
        const chave =
            limparDocumentoMotorRegrasAPS(t.cpf || "") ||
            limparDocumentoMotorRegrasAPS(t.cns || "");

        if (chave) mapa.set(chave, t);
    });

    (base || []).forEach(p => {
        const chave =
            limparDocumentoMotorRegrasAPS(p.cpf || "") ||
            limparDocumentoMotorRegrasAPS(p.cns || "");

        const ti =
            mapa.get(chave);

        if (!ti) {
            p.score_territorial_global =
                Number(p.score_territorial_global || 0);

            p.nivel_prioridade =
                p.nivel_prioridade ||
                classificarPrioridadeMotorRegrasAPS(p.score_territorial_global);

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
            normalizarPrioridadeMotorRegrasAPS(ti.prioridade) ||
            classificarPrioridadeMotorRegrasAPS(p.score_territorial_global);

        p.evfam_total =
            Number(ti.evfam_total || p.evfam_total || 0);

        p.evfam_classificacao =
            ti.evfam_classificacao || p.evfam_classificacao || "";

        p.acao_recomendada =
            ti.acao_recomendada || ti.recomendacao_ia || p.acao_recomendada || "";

        p.score_clinico =
            Number(ti.score_clinico || p.score_clinico || 0);

        p.score_assistencial =
            Number(ti.score_assistencial || p.score_assistencial || 0);

        p.score_social =
            Number(ti.score_social || p.score_social || 0);

        p.score_domiciliar =
            Number(ti.score_domiciliar || p.score_domiciliar || 0);

        p.visita_domiciliar_indicada =
            ti.visita_domiciliar_indicada ?? p.visita_domiciliar_indicada;

        p.tipo_visita_sugerida =
            ti.tipo_visita_sugerida || p.tipo_visita_sugerida || "";

        p.acamado =
            ti.acamado ?? ti.paciente_acamado ?? p.acamado ?? false;

        p.domiciliado =
            ti.domiciliado ?? ti.paciente_domiciliado ?? p.domiciliado ?? false;

        if (Array.isArray(ti.pendencias) && ti.pendencias.length) {
            p.pendencias =
                [...new Set([...(p.pendencias || []), ...ti.pendencias])];
        }
    });
}

/* ==========================================================
   AVALIAÇÃO DE REGRAS
   ========================================================== */

function avaliarPacienteMotorRegrasAPS(paciente, dataReferencia) {
    const acoes = [];
    const regras = [];

    const nome =
        paciente.nome || "Paciente";

    const cpf =
        paciente.cpf || "";

    const score =
        Number(paciente.score_territorial_global || 0);

    const diasSemAtendimento =
        diasDesdeMotorRegrasAPS(paciente.ultimo_atendimento);

    const pas =
        Number(
            primeiroValorMotorRegrasAPS(
                paciente.objPAS,
                paciente.hasPAS,
                paciente.has_pas
            ) || 0
        );

    const pad =
        Number(
            primeiroValorMotorRegrasAPS(
                paciente.objPAD,
                paciente.hasPAD,
                paciente.has_pad
            ) || 0
        );

    /* REGRA 1 — HAS GRAVE */
    if (
        valorSimMotorRegrasAPS(paciente.has) &&
        (
            pas >= 160 ||
            pad >= 100
        )
    ) {
        regras.push("HAS grave / PA elevada");
        acoes.push(criarAcaoAgendaMotorRegrasAPS({
            paciente,
            tipo: "CONSULTA",
            prioridade: score >= 85 ? "CRITICA" : "ALTA",
            data_sugerida: dataReferencia,
            motivo: `Hipertenso com PA elevada (${pas || "-"}x${pad || "-"})`,
            origem: "motor_regras_aps_has_grave"
        }));
    }

    /* REGRA 2 — DM SEM HBA1C */
    if (
        valorSimMotorRegrasAPS(paciente.dm) &&
        !temValorMotorRegrasAPS(paciente.dmHbA1c)
    ) {
        regras.push("DM sem HbA1c");
        acoes.push(criarAcaoAgendaMotorRegrasAPS({
            paciente,
            tipo: "BUSCA_ATIVA",
            prioridade: score >= 85 ? "CRITICA" : "ALTA",
            data_sugerida: dataReferencia,
            motivo: "Diabético sem HbA1c registrada",
            origem: "motor_regras_aps_dm_sem_hba1c"
        }));
    }

    /* REGRA 3 — GESTANTE SEM ACOMPANHAMENTO */
    if (
        valorSimMotorRegrasAPS(paciente.gestante) &&
        diasSemAtendimento > 30
    ) {
        regras.push("Gestante sem consulta recente");
        acoes.push(criarAcaoAgendaMotorRegrasAPS({
            paciente,
            tipo: "PRE_NATAL",
            prioridade: "ALTA",
            data_sugerida: dataReferencia,
            motivo: `Gestante sem atendimento há ${diasSemAtendimento} dias`,
            origem: "motor_regras_aps_gestante_atrasada"
        }));
    }

    /* REGRA 4 — EVFAM ALTO */
    if (
        Number(paciente.evfam_total || 0) >= 12
    ) {
        regras.push("EVFAM alto");
        acoes.push(criarAcaoAgendaMotorRegrasAPS({
            paciente,
            tipo: "VISITA_DOMICILIAR",
            prioridade: score >= 85 ? "CRITICA" : "ALTA",
            data_sugerida: dataReferencia,
            motivo: `EVFAM elevado (${paciente.evfam_total})`,
            origem: "motor_regras_aps_evfam_alto"
        }));
    }

    /* REGRA 5 — ACAMADO */
    if (
        valorSimMotorRegrasAPS(paciente.acamado) ||
        valorSimMotorRegrasAPS(paciente.paciente_acamado)
    ) {
        regras.push("Paciente acamado");
        acoes.push(criarAcaoAgendaMotorRegrasAPS({
            paciente,
            tipo: "VISITA_DOMICILIAR",
            prioridade: "CRITICA",
            data_sugerida: dataReferencia,
            motivo: "Paciente acamado — necessita cuidado domiciliar",
            origem: "motor_regras_aps_acamado"
        }));
    }

    /* REGRA 6 — DOMICILIADO */
    if (
        valorSimMotorRegrasAPS(paciente.domiciliado) ||
        valorSimMotorRegrasAPS(paciente.paciente_domiciliado)
    ) {
        regras.push("Paciente domiciliado");
        acoes.push(criarAcaoAgendaMotorRegrasAPS({
            paciente,
            tipo: "VISITA_DOMICILIAR",
            prioridade: score >= 85 ? "CRITICA" : "ALTA",
            data_sugerida: dataReferencia,
            motivo: "Paciente domiciliado — dificuldade de deslocamento",
            origem: "motor_regras_aps_domiciliado"
        }));
    }

    /* REGRA 7 — SCORE TERRITORIAL GLOBAL CRÍTICO */
    if (
        score >= 85
    ) {
        regras.push("Score Territorial Global crítico");
        acoes.push(criarAcaoAgendaMotorRegrasAPS({
            paciente,
            tipo: "VISITA_DOMICILIAR",
            prioridade: "CRITICA",
            data_sugerida: dataReferencia,
            motivo: `Score Territorial Global crítico (${score})`,
            origem: "motor_regras_aps_score_critico"
        }));
    }

    /* REGRA 8 — RETORNO VENCIDO */
    if (
        Number(
            primeiroValorMotorRegrasAPS(
                paciente.reavaliacaoDias,
                paciente.prazo,
                paciente.retorno_dias
            )
        ) === 0
    ) {
        regras.push("Retorno vencido");
        acoes.push(criarAcaoAgendaMotorRegrasAPS({
            paciente,
            tipo: "BUSCA_ATIVA",
            prioridade: score >= 85 ? "CRITICA" : "ALTA",
            data_sugerida: dataReferencia,
            motivo: "Retorno vencido no acompanhamento APS",
            origem: "motor_regras_aps_retorno_vencido"
        }));
    }

    /* REGRA 9 — TUBERCULOSE */
    if (
        valorSimMotorRegrasAPS(paciente.tb)
    ) {
        regras.push("Tuberculose em acompanhamento");
        acoes.push(criarAcaoAgendaMotorRegrasAPS({
            paciente,
            tipo: "BUSCA_ATIVA",
            prioridade: "ALTA",
            data_sugerida: dataReferencia,
            motivo: "Tuberculose — acompanhamento intensivo e adesão terapêutica",
            origem: "motor_regras_aps_tb"
        }));
    }

    /* REGRA 10 — HANSENÍASE */
    if (
        valorSimMotorRegrasAPS(paciente.hansen)
    ) {
        regras.push("Hanseníase em acompanhamento");
        acoes.push(criarAcaoAgendaMotorRegrasAPS({
            paciente,
            tipo: "BUSCA_ATIVA",
            prioridade: "ALTA",
            data_sugerida: dataReferencia,
            motivo: "Hanseníase — acompanhamento intensivo e prevenção de incapacidade",
            origem: "motor_regras_aps_hansen"
        }));
    }

    /* REGRA 11 — HAS SEM PA */
    if (
        valorSimMotorRegrasAPS(paciente.has) &&
        (!temValorMotorRegrasAPS(pas) || pas === 0)
    ) {
        regras.push("HAS sem PA registrada");
        acoes.push(criarAcaoAgendaMotorRegrasAPS({
            paciente,
            tipo: "BUSCA_ATIVA",
            prioridade: "ALTA",
            data_sugerida: dataReferencia,
            motivo: "Hipertenso sem PA registrada",
            origem: "motor_regras_aps_has_sem_pa"
        }));
    }

    /* REGRA 12 — ALTA PRIORIDADE TERRITORIAL */
    if (
        score >= 65 &&
        score < 85
    ) {
        regras.push("Alta prioridade territorial");
        acoes.push(criarAcaoAgendaMotorRegrasAPS({
            paciente,
            tipo: "BUSCA_ATIVA",
            prioridade: "ALTA",
            data_sugerida: dataReferencia,
            motivo: `Alta prioridade territorial (${score})`,
            origem: "motor_regras_aps_score_alto"
        }));
    }

    return {
        paciente: {
            cpf,
            nome,
            score_territorial_global: score
        },
        regras,
        acoes
    };
}

function criarAcaoAgendaMotorRegrasAPS({
    paciente,
    tipo,
    prioridade,
    data_sugerida,
    motivo,
    origem
}) {
    return {
        paciente_cpf:
            paciente.cpf || paciente.paciente_cpf || null,

        paciente_nome:
            paciente.nome || paciente.nome_paciente || "Paciente",

        tipo:
            tipo,

        prioridade:
            prioridade,

        data_sugerida:
            data_sugerida,

        motivo:
            motivo,

        origem:
            origem || "motor_regras_aps",

        created_at:
            new Date().toISOString()
    };
}

function existeAgendaDuplicadaMotorRegrasAPS(agendaExistente, agendaGerada, acao) {
    const chaveAcao =
        chaveAgendaMotorRegrasAPS(acao);

    return (
        (agendaExistente || []).some(item =>
            chaveAgendaMotorRegrasAPS(item) === chaveAcao
        ) ||
        (agendaGerada || []).some(item =>
            chaveAgendaMotorRegrasAPS(item) === chaveAcao
        )
    );
}

function chaveAgendaMotorRegrasAPS(item) {
    return [
        limparDocumentoMotorRegrasAPS(item.paciente_cpf || ""),
        normalizarMotorRegrasAPS(item.tipo || ""),
        normalizarMotorRegrasAPS(item.motivo || ""),
        String(item.data_sugerida || "").slice(0, 10)
    ].join("|");
}

/* ==========================================================
   RESUMO / REGISTRO
   ========================================================== */

function gerarResumoMotorRegrasAPS(base, agendaGerada, regrasAcionadas, dataReferencia) {
    const porTipo =
        tipo =>
            agendaGerada.filter(a =>
                normalizarMotorRegrasAPS(a.tipo) === normalizarMotorRegrasAPS(tipo)
            ).length;

    const porPrioridade =
        prioridade =>
            agendaGerada.filter(a =>
                normalizarMotorRegrasAPS(a.prioridade).includes(
                    normalizarMotorRegrasAPS(prioridade)
                )
            ).length;

    return {
        dataReferencia,
        pacientesAvaliados: base.length,
        pacientesComRegra: regrasAcionadas.length,
        acoesGeradas: agendaGerada.length,
        criticas: porPrioridade("crit"),
        altas: porPrioridade("alt"),
        buscaAtiva: porTipo("BUSCA_ATIVA"),
        visitas: porTipo("VISITA_DOMICILIAR"),
        consultas: porTipo("CONSULTA"),
        preNatal: porTipo("PRE_NATAL"),
        status:
            agendaGerada.length
                ? "🧠 Motor de Regras APS gerou ações automáticas."
                : "🟢 Nenhuma nova ação automática necessária."
    };
}

async function registrarExecucaoMotorRegrasAPS(resumo, regrasAcionadas) {
    if (typeof supabaseClient === "undefined") return null;

    try {
        await supabaseClient
            .from("inteligencia_aps")
            .insert({
                tipo: "MOTOR_REGRAS_APS",
                escopo: "TERRITORIO",
                referencia_id: "GLOBAL",
                pergunta: "Execução automática do Motor de Regras APS",
                resposta:
                    [
                        resumo.status,
                        "",
                        `Pacientes avaliados: ${resumo.pacientesAvaliados}`,
                        `Pacientes com regra acionada: ${resumo.pacientesComRegra}`,
                        `Ações geradas: ${resumo.acoesGeradas}`,
                        `Críticas: ${resumo.criticas}`,
                        `Altas: ${resumo.altas}`,
                        `Buscas ativas: ${resumo.buscaAtiva}`,
                        `Visitas: ${resumo.visitas}`,
                        `Consultas: ${resumo.consultas}`,
                        `Pré-natal: ${resumo.preNatal}`
                    ].join("\n"),
                contexto: {
                    resumo,
                    regras: regrasAcionadas.slice(0, 200)
                },
                confianca: 0.9,
                origem: "motor_regras_aps"
            });

    } catch (erro) {
        console.warn("Motor de Regras APS: não foi possível registrar em inteligencia_aps.", erro);
    }

    return null;
}

/* ==========================================================
   ECOSSISTEMA APS — ORQUESTRADOR
   ========================================================== */

async function atualizarEcossistemaAPS(opcoes = {}) {
    const resultado = {
        territorio: null,
        regras: null,
        agenda: null,
        torre: null,
        sala: null,
        central: null,
        motor: null
    };

    try {
        if (typeof carregarTerritorioInteligente === "function") {
            resultado.territorio =
                await carregarTerritorioInteligente();
        } else if (typeof atualizarTerritorioInteligente === "function") {
            resultado.territorio =
                await atualizarTerritorioInteligente();
        }
    } catch (erro) {
        console.warn("Ecossistema APS: falha ao atualizar Território Inteligente.", erro);
    }

    try {
        resultado.regras =
            await executarMotorRegrasAPS(opcoes);
    } catch (erro) {
        console.warn("Ecossistema APS: falha no Motor de Regras.", erro);
    }

    try {
        if (typeof carregarAgendaInteligenteAPS === "function") {
            resultado.agenda =
                await carregarAgendaInteligenteAPS();
        } else if (typeof gerarAgendaInteligenteAPS === "function") {
            resultado.agenda =
                await gerarAgendaInteligenteAPS();
        }
    } catch (erro) {
        console.warn("Ecossistema APS: falha ao atualizar Agenda APS.", erro);
    }

    try {
        if (typeof carregarTorreControleAPS === "function") {
            resultado.torre =
                await carregarTorreControleAPS();
        }
    } catch (erro) {
        console.warn("Ecossistema APS: falha ao atualizar Torre APS.", erro);
    }

    try {
        if (typeof carregarMotorCognitivoAPS === "function") {
            resultado.motor =
                await carregarMotorCognitivoAPS();
        }
    } catch (erro) {
        console.warn("Ecossistema APS: falha ao atualizar Motor Cognitivo.", erro);
    }

    try {
        if (typeof carregarSalaSituacaoAPS === "function") {
            resultado.sala =
                await carregarSalaSituacaoAPS();
        }
    } catch (erro) {
        console.warn("Ecossistema APS: falha ao atualizar Sala de Situação.", erro);
    }

    try {
        if (typeof carregarCentralOperacoesAPS === "function") {
            resultado.central =
                await carregarCentralOperacoesAPS();
        }
    } catch (erro) {
        console.warn("Ecossistema APS: falha ao atualizar Central de Operações.", erro);
    }

    console.log("✅ Ecossistema APS atualizado:", resultado);

    return resultado;
}

/* ==========================================================
   PENDÊNCIAS
   ========================================================== */

function identificarPendenciasMotorRegrasAPS(p) {
    const pendencias = [];

    const pas =
        primeiroValorMotorRegrasAPS(p.objPAS, p.hasPAS, p.has_pas);

    const pad =
        primeiroValorMotorRegrasAPS(p.objPAD, p.hasPAD, p.has_pad);

    if (
        valorSimMotorRegrasAPS(p.has) &&
        (!temValorMotorRegrasAPS(pas) || !temValorMotorRegrasAPS(pad))
    ) {
        pendencias.push("HAS sem PA");
    }

    if (
        valorSimMotorRegrasAPS(p.dm) &&
        !temValorMotorRegrasAPS(p.dmHbA1c)
    ) {
        pendencias.push("DM sem HbA1c");
    }

    if (
        valorSimMotorRegrasAPS(p.gestante) &&
        diasDesdeMotorRegrasAPS(p.ultimo_atendimento) > 30
    ) {
        pendencias.push("Gestante sem consulta recente");
    }

    if (
        valorSimMotorRegrasAPS(p.tb) &&
        diasDesdeMotorRegrasAPS(p.ultimo_atendimento) > 30
    ) {
        pendencias.push("TB sem acompanhamento recente");
    }

    if (
        valorSimMotorRegrasAPS(p.hansen) &&
        diasDesdeMotorRegrasAPS(p.ultimo_atendimento) > 60
    ) {
        pendencias.push("Hanseníase sem avaliação recente");
    }

    if (
        Number(
            primeiroValorMotorRegrasAPS(
                p.reavaliacaoDias,
                p.prazo,
                p.retorno_dias
            )
        ) === 0
    ) {
        pendencias.push("Retorno vencido");
    }

    return [...new Set(pendencias)];
}

/* ==========================================================
   HELPERS
   ========================================================== */

function valorSimMotorRegrasAPS(valor) {
    const v =
        normalizarMotorRegrasAPS(valor);

    return (
        valor === true ||
        valor === 1 ||
        v === "sim" ||
        v === "s" ||
        v === "true" ||
        v === "1" ||
        v === "positivo" ||
        v === "presente" ||
        v === "ativo" ||
        v === "acamado" ||
        v === "domiciliado"
    );
}

function normalizarMotorRegrasAPS(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function limparDocumentoMotorRegrasAPS(valor) {
    return String(valor || "")
        .replace(/\D/g, "");
}

function temValorMotorRegrasAPS(valor) {
    return (
        valor !== null &&
        valor !== undefined &&
        String(valor).trim() !== "" &&
        String(valor).trim() !== "0"
    );
}

function primeiroValorMotorRegrasAPS(...valores) {
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

function diasDesdeMotorRegrasAPS(data) {
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

function classificarPrioridadeMotorRegrasAPS(score) {
    if (score >= 85) return "CRITICO";
    if (score >= 65) return "ALTO";
    if (score >= 40) return "MODERADO";
    return "BAIXO";
}

function normalizarPrioridadeMotorRegrasAPS(valor) {
    const v =
        normalizarMotorRegrasAPS(valor);

    if (v.includes("critic")) return "CRITICO";
    if (v.includes("alt")) return "ALTO";
    if (v.includes("moder")) return "MODERADO";
    if (v.includes("baix")) return "BAIXO";

    return "";
}

/* ==========================================================
   GLOBAL
   ========================================================== */

window.executarMotorRegrasAPS = executarMotorRegrasAPS;
window.atualizarEcossistemaAPS = atualizarEcossistemaAPS;
window.motorRegrasAPSAtual = motorRegrasAPSAtual;
window.identificarPendenciasMotorRegrasAPS = identificarPendenciasMotorRegrasAPS;

console.log("✅ Motor de Regras APS carregado.");
