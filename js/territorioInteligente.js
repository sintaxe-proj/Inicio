/* ==========================================================
   🧠 TERRITÓRIO INTELIGENTE — SINTAXEHUB APS
   Cérebro territorial para IA operacional e predição explicável
   Supabase-first: sem IndexedDB, sem cache persistente.
   ========================================================== */

/* ==========================================================
   ATUALIZAÇÃO PRINCIPAL
   ========================================================== */

async function atualizarTerritorioInteligente(cpfOuCns, opcoes = {}) {
    if (typeof supabaseClient === "undefined") {
        console.warn("Supabase não carregado para Território Inteligente.");
        return null;
    }

    const identificador =
        limparDocumentoTerritorioInteligente(cpfOuCns || "");

    /*
       IMPORTANTE:
       - atualizarTerritorioInteligente(id) atualiza UM paciente.
       - atualizarTerritorioInteligente() sem id não deve tentar salvar paciente.
       - Para atualizar todos, use atualizarTodosTerritoriosInteligentes().
    */
    if (!identificador) {
        if (opcoes.atualizarTodos === true) {
            return atualizarTodosTerritoriosInteligentes(opcoes.limite || 5000);
        }

        if (opcoes.somenteResumo === true) {
            return carregarResumoTerritorioInteligente();
        }

        return null;
    }

    try {
        const contexto =
            await carregarContextoTerritorioInteligente(identificador);

        if (!contexto.paciente && !contexto.atendimentos.length) {
            console.warn("Território Inteligente: paciente não localizado.", identificador);
            return null;
        }

        const registro =
            calcularTerritorioInteligente(contexto);

        const salvo =
            await salvarTerritorioInteligente(registro);

        return salvo;

    } catch (erro) {
        console.error("Erro ao atualizar Território Inteligente:", erro);
        return null;
    }
}

async function atualizarTodosTerritoriosInteligentes(limite = 5000) {
    if (typeof supabaseClient === "undefined") {
        console.warn("Supabase não carregado.");
        return [];
    }

    try {
        const { data, error } =
            await supabaseClient
                .from("pacientes")
                .select("cpf,cns")
                .limit(limite);

        if (error) {
            console.error("Erro ao carregar pacientes para atualização territorial:", error);
            return [];
        }

        const resultados = [];

        for (const p of data || []) {
            const id =
                p.cpf ||
                p.cns;

            if (!id) continue;

            try {
                const resultado =
                    await atualizarTerritorioInteligente(id);

                if (resultado) {
                    resultados.push(resultado);
                }
            } catch (erroPaciente) {
                console.warn("Falha ao atualizar paciente no Território Inteligente:", id, erroPaciente);
            }
        }

        mostrarToast?.(`🧠 Território Inteligente atualizado: ${resultados.length} registros.`);

        return resultados;

    } catch (erro) {
        console.error("Erro geral em atualizarTodosTerritoriosInteligentes:", erro);
        return [];
    }
}


async function reordenarFilaTerritorialGlobal() {
    const lista =
        await listarPrioridadesTerritorioInteligente(5000);

    const ordenada =
        calcularOrdemFilaTerritorialGlobal(lista);

    for (const item of ordenada) {
        if (!item.cpf) continue;

        await supabaseClient
            .from("territorio_inteligente")
            .update({
                ordem_fila: item.ordem_fila
            })
            .eq("cpf", item.cpf);
    }

    return ordenada;
}

/* ==========================================================
   CONTEXTO
   ========================================================== */

async function carregarContextoTerritorioInteligente(identificador) {
    const idLimpo =
        limparDocumentoTerritorioInteligente(identificador);

    const [
        pacienteResp,
        atendimentosResp,
        interacoesResp,
        reunioesResp,
        materiaisResp,
        visitasResp
    ] = await Promise.all([
        supabaseClient
            .from("pacientes")
            .select("*")
            .or(`cpf.eq.${idLimpo},cns.eq.${idLimpo}`)
            .maybeSingle(),

        supabaseClient
            .from("atendimentos")
            .select("*")
            .or(`cpf.eq.${idLimpo},paciente_cpf.eq.${idLimpo},cns.eq.${idLimpo}`)
            .order("data_atendimento", { ascending: false, nullsFirst: false })
            .limit(50),

        buscarTabelaOpcionalTerritorioInteligente(
            "interacoes_busca_ativa",
            idLimpo
        ),

        buscarTabelaOpcionalTerritorioInteligente(
            "reuniao_casos",
            idLimpo
        ),

        buscarTabelaOpcionalTerritorioInteligente(
            "solicitacoes_materiais",
            idLimpo
        ),

        buscarTabelaOpcionalTerritorioInteligente(
            "visitas_domiciliares",
            idLimpo
        )
    ]);

    return {
        paciente:
            pacienteResp.data || null,

        atendimentos:
            atendimentosResp.data || [],

        interacoes:
            interacoesResp || [],

        reunioes:
            reunioesResp || [],

        materiais:
            materiaisResp || [],

        visitas:
            visitasResp || []
    };
}

async function buscarTabelaOpcionalTerritorioInteligente(tabela, identificador) {
    try {
        const { data, error } =
            await supabaseClient
                .from(tabela)
                .select("*")
                .or(`cpf.eq.${identificador},paciente_cpf.eq.${identificador},cns.eq.${identificador}`)
                .limit(50);

        if (error) {
            console.warn(`Tabela opcional indisponível: ${tabela}`, error.message);
            return [];
        }

        return data || [];

    } catch (erro) {
        console.warn(`Falha opcional em ${tabela}`, erro);
        return [];
    }
}

/* ==========================================================
   SCORE TERRITORIAL APS GLOBAL
   Indicador único para Torre APS, Agenda Inteligente e Copiloto.
   ========================================================== */

function calcularScoreTerritorialGlobal(resultado) {
    const scoreClinico =
        Number(resultado.score_clinico || 0);

    const scoreAssistencial =
        Number(resultado.score_assistencial || 0);

    const scoreSocial =
        Number(resultado.score_social || 0);

    const scoreDomiciliar =
        Number(resultado.score_domiciliar || 0);

    const evfamTotal =
        Number(resultado.evfam_total || 0);

    return limitarScoreTerritorioInteligente(
        scoreClinico +
        scoreAssistencial +
        scoreSocial +
        scoreDomiciliar +
        evfamTotal * 2
    );
}

function classificarScoreTerritorialGlobal(score) {
    const s =
        Number(score || 0);

    if (s >= 85) return "CRITICO";
    if (s >= 65) return "ALTO";
    if (s >= 40) return "MODERADO";
    return "BAIXO";
}

function classificarPrioridadeTerritorialGlobal(score) {
    const nivel =
        classificarScoreTerritorialGlobal(score);

    if (nivel === "CRITICO") {
        return {
            prioridade: "Crítica",
            classe: "Muito alto risco",
            nivel
        };
    }

    if (nivel === "ALTO") {
        return {
            prioridade: "Alta",
            classe: "Alto risco",
            nivel
        };
    }

    if (nivel === "MODERADO") {
        return {
            prioridade: "Moderada",
            classe: "Risco moderado",
            nivel
        };
    }

    return {
        prioridade: "Baixa",
        classe: "Rotina",
        nivel
    };
}

function definirAcaoRecomendadaTerritorialGlobal(registro) {
    const score =
        Number(registro.score_territorial_global || 0);

    const pendencias =
        registro.pendencias || [];

    const visitaIndicada =
        registro.visita_domiciliar_indicada === true;

    if (score >= 85) {
        if (visitaIndicada) {
            return "Priorizar visita domiciliar, busca ativa imediata e discussão em reunião de equipe.";
        }

        return "Priorizar busca ativa imediata, consulta protegida e discussão em reunião de equipe.";
    }

    if (score >= 65) {
        if (pendencias.length >= 2) {
            return "Realizar busca ativa, revisar pendências e programar consulta prioritária.";
        }

        return "Programar consulta prioritária e monitoramento territorial pela equipe.";
    }

    if (score >= 40) {
        return "Manter monitoramento programado e revisar pendências no próximo contato.";
    }

    return "Manter acompanhamento de rotina conforme linha de cuidado.";
}

function calcularOrdemFilaTerritorialGlobal(lista) {
    return (lista || [])
        .slice()
        .sort((a, b) =>
            Number(b.score_territorial_global || 0) -
            Number(a.score_territorial_global || 0)
        )
        .map((item, index) => ({
            ...item,
            ordem_fila:
                index + 1
        }));
}

function ordenarPorScoreTerritorialGlobal(lista) {
    return (lista || [])
        .slice()
        .sort((a, b) =>
            Number(b.score_territorial_global || 0) -
            Number(a.score_territorial_global || 0)
        );
}

/* ==========================================================
   CÁLCULO DO CÉREBRO TERRITORIAL
   ========================================================== */

function calcularTerritorioInteligente(contexto) {
    const paciente =
        contexto.paciente || {};

    const ultimoAtendimento =
        contexto.atendimentos?.[0] || {};

    const base =
        montarBasePacienteTerritorioInteligente(
            paciente,
            ultimoAtendimento
        );

    const pendencias =
        identificarPendenciasTerritorioInteligente(
            base,
            contexto
        );

    const abandono =
        calcularScoreAbandonoTerritorioInteligente(
            base,
            contexto
        );

    const internacao =
        calcularScoreInternacaoTerritorioInteligente(
            base,
            contexto,
            pendencias
        );

    const descompensacao =
        calcularScoreDescompensacaoTerritorioInteligente(
            base,
            contexto,
            pendencias
        );

    const gestacional =
        calcularScoreGestacionalTerritorioInteligente(
            base,
            contexto
        );

    const social =
        calcularScoreSocialTerritorioInteligente(
            base,
            contexto
        );

    const territorial =
        calcularScoreTerritorialTerritorioInteligente(
            base,
            contexto
        );

    const evfam =
        calcularEVFAMTerritorioInteligente(
            base,
            contexto
        );

    const domiciliar =
        calcularScoreDomiciliarTerritorioInteligente(
            base,
            contexto,
            evfam
        );

    const clinico =
        calcularScoreClinicoTerritorioInteligente(
            base,
            contexto,
            {
                internacao,
                descompensacao,
                gestacional
            }
        );

    const assistencial =
        calcularScoreAssistencialTerritorioInteligente(
            base,
            contexto,
            {
                abandono,
                pendencias
            }
        );

    const scoreTerritorialGlobal =
        calcularScoreTerritorialGlobal({
            score_clinico: clinico.score,
            score_assistencial: assistencial.score,
            score_social: social.score,
            score_domiciliar: domiciliar.score,
            evfam_total: evfam.total
        });

    // Mantido como compatibilidade para módulos antigos.
    // A partir desta versão, o indicador oficial é score_territorial_global.
    const scoreGeral =
        scoreTerritorialGlobal;

    const fatores =
        [
            ...clinico.fatores,
            ...assistencial.fatores,
            ...social.fatores,
            ...domiciliar.fatores,
            ...territorial.fatores,
            ...evfam.fatores
        ];

    const vulnerabilidades =
        [
            ...social.fatores,
            ...domiciliar.fatores,
            ...evfam.fatores
        ];

    const prioridade =
        classificarPrioridadeTerritorialGlobal(scoreTerritorialGlobal);

    const visita =
        indicarVisitaDomiciliarTerritorioInteligente(
            base,
            scoreGeral,
            evfam,
            domiciliar,
            pendencias,
            fatores
        );

    const recomendacao =
        gerarRecomendacaoTerritorioInteligenteV3(
            base,
            scoreGeral,
            pendencias,
            fatores,
            evfam,
            visita
        );

    return {
        paciente_id:
            paciente.id || ultimoAtendimento.paciente_id || null,

        cpf:
            limparDocumentoTerritorioInteligente(
                base.cpf ||
                ultimoAtendimento.paciente_cpf ||
                ultimoAtendimento.cpf
            ),

        cns:
            base.cns || "",

        nome:
            base.nome || "Sem nome",

        telefone:
            base.telefone || "",

        cep:
            base.cep || "",

        bairro:
            base.bairro || "",

        cidade:
            base.cidade || "",

        ubs:
            base.ubs || "Não informado",

        equipe:
            base.equipe || "Não informado",

        has:
            valorSimTerritorioInteligente(base.has),

        dm:
            valorSimTerritorioInteligente(base.dm),

        gestante:
            valorSimTerritorioInteligente(base.gestante),

        tb:
            valorSimTerritorioInteligente(base.tb),

        hansen:
            valorSimTerritorioInteligente(base.hansen),

        ultimo_atendimento:
            base.ultimo_atendimento || null,

        ultimo_evento:
            calcularUltimoEventoTerritorioInteligente(contexto),

        score_geral:
            scoreGeral,

        score_territorial_global:
            scoreTerritorialGlobal,

        nivel_prioridade:
            classificarScoreTerritorialGlobal(scoreTerritorialGlobal),

        ordem_fila:
            null,

        acao_recomendada:
            definirAcaoRecomendadaTerritorialGlobal({
                score_territorial_global: scoreTerritorialGlobal,
                visita_domiciliar_indicada: visita.indicada,
                pendencias
            }),

        score_clinico:
            clinico.score,

        score_assistencial:
            assistencial.score,

        score_abandono:
            abandono.score,

        score_internacao:
            internacao.score,

        score_descompensacao:
            descompensacao.score,

        score_gestacional:
            gestacional.score,

        score_social:
            social.score,

        score_domiciliar:
            domiciliar.score,

        score_territorial:
            territorial.score,

        evfam_total:
            evfam.total,

        evfam_renda:
            evfam.renda,

        evfam_cuidado_saude:
            evfam.cuidadoSaude,

        evfam_familia:
            evfam.familia,

        evfam_violencia:
            evfam.violencia,

        evfam_classificacao:
            evfam.classificacao,

        visita_domiciliar_indicada:
            visita.indicada,

        tipo_visita_sugerida:
            visita.tipo,

        prazo_visita_dias:
            visita.prazoDias,

        prioridade:
            prioridade.prioridade,

        classe_risco:
            prioridade.classe,

        fatores:
            [...new Set(fatores)].slice(0, 40),

        vulnerabilidades:
            [...new Set(vulnerabilidades)].slice(0, 40),

        pendencias:
            [...new Set(pendencias)].slice(0, 40),

        resumo_ia:
            gerarResumoTerritorioInteligenteV3(
                base,
                scoreGeral,
                prioridade,
                pendencias,
                evfam,
                visita
            ),

        recomendacao_ia:
            recomendacao,

        origem:
            "sintaxehub_evfam_v3",

        ultima_atualizacao:
            new Date().toISOString()
    };
}

function montarBasePacienteTerritorioInteligente(paciente, atendimento) {
    return {
        nome:
            paciente.nome ||
            atendimento.nome_paciente ||
            atendimento.nome ||
            "",

        cpf:
            paciente.cpf ||
            atendimento.paciente_cpf ||
            atendimento.cpf ||
            "",

        cns:
            paciente.cns ||
            atendimento.cns ||
            "",

        telefone:
            paciente.telefone ||
            atendimento.telefone ||
            "",

        cep:
            paciente.cep ||
            atendimento.cep ||
            "",

        bairro:
            paciente.bairro ||
            atendimento.bairro ||
            "",

        cidade:
            paciente.cidade ||
            atendimento.cidade ||
            "",

        ubs:
            paciente.ubs_vinculacao ||
            atendimento.ubs_vinculacao ||
            atendimento.ubs ||
            "",

        equipe:
            paciente.equipe_esf ||
            atendimento.equipe_esf ||
            atendimento.equipe ||
            "",

        has:
            atendimento.has ||
            paciente.has ||
            "Não",

        dm:
            atendimento.dm ||
            paciente.dm ||
            "Não",

        gestante:
            atendimento.gestante ||
            paciente.gestante ||
            "Não",

        tb:
            atendimento.tb ||
            paciente.tb ||
            "Não",

        hansen:
            atendimento.hansen ||
            paciente.hansen ||
            "Não",

        risco_global:
            atendimento.risco_global ||
            paciente.risco_global ||
            "",

        risco_pontos:
            Number(
                atendimento.risco_pontos ||
                paciente.risco_pontos ||
                0
            ),

        prazo:
            atendimento.reavaliacaoDias ??
            atendimento.retorno_dias ??
            paciente.reavaliacaoDias ??
            null,

        ultimo_atendimento:
            atendimento.data_atendimento ||
            atendimento.criado_em ||
            atendimento.created_at ||
            null,

        pas:
            primeiroValorTerritorioInteligente(
                atendimento.objPAS,
                atendimento.obj_pas,
                atendimento.hasPAS,
                atendimento.has_pas
            ),

        pad:
            primeiroValorTerritorioInteligente(
                atendimento.objPAD,
                atendimento.obj_pad,
                atendimento.hasPAD,
                atendimento.has_pad
            ),

        hba1c:
            primeiroValorTerritorioInteligente(
                atendimento.dmHbA1c,
                atendimento.dm_hba1c,
                atendimento.hba1c
            ),

        nota:
            atendimento.nota_monitoramento ||
            atendimento.notaMonitoramento ||
            "",

        microarea:
            paciente.microarea ||
            atendimento.microarea ||
            "",

        vulnerabilidade_social:
            primeiroValorTerritorioInteligente(
                paciente.vulnerabilidade_social,
                atendimento.vulnerabilidade_social
            ),

        acamado:
            primeiroValorTerritorioInteligente(
                paciente.acamado,
                atendimento.acamado
            ),

        restricao_mobilidade:
            primeiroValorTerritorioInteligente(
                paciente.restricao_mobilidade,
                atendimento.restricao_mobilidade
            ),

        dificuldade_acesso_ubs:
            primeiroValorTerritorioInteligente(
                paciente.dificuldade_acesso_ubs,
                atendimento.dificuldade_acesso_ubs
            )
    };
}

/* ==========================================================
   SCORES
   ========================================================== */

function calcularScoreAbandonoTerritorioInteligente(base, contexto) {
    let score = 0;
    const fatores = [];

    const dias =
        diasDesdeTerritorioInteligente(base.ultimo_atendimento);

    if (dias > 365) {
        score += 45;
        fatores.push("sem atendimento há mais de 1 ano");
    } else if (dias > 180) {
        score += 30;
        fatores.push("sem atendimento há mais de 180 dias");
    } else if (dias > 90) {
        score += 15;
        fatores.push("sem atendimento há mais de 90 dias");
    }

    if (Number(base.prazo) === 0) {
        score += 30;
        fatores.push("retorno vencido");
    }

    const tentativasSemSucesso =
        (contexto.interacoes || []).filter(i =>
            normalizarTerritorioInteligente(i.resultado || i.status || "")
                .includes("nao") ||
            normalizarTerritorioInteligente(i.resultado || i.status || "")
                .includes("não")
        ).length;

    if (tentativasSemSucesso >= 2) {
        score += 20;
        fatores.push("múltiplas tentativas de contato sem sucesso");
    }

    if (valorSimTerritorioInteligente(base.tb) || valorSimTerritorioInteligente(base.hansen)) {
        score += 15;
        fatores.push("linha sensível ao abandono terapêutico");
    }

    return {
        score:
            limitarScoreTerritorioInteligente(score),

        fatores
    };
}

function calcularScoreInternacaoTerritorioInteligente(base, contexto, pendencias) {
    let score = 0;
    const fatores = [];

    if (normalizarTerritorioInteligente(base.risco_global).includes("alto")) {
        score += 25;
        fatores.push("risco global alto");
    }

    if (Number(base.risco_pontos || 0) >= 8) {
        score += 25;
        fatores.push("pontuação clínica elevada");
    }

    if (valorSimTerritorioInteligente(base.has) && valorSimTerritorioInteligente(base.dm)) {
        score += 20;
        fatores.push("multimorbidade HAS + DM");
    }

    if (valorSimTerritorioInteligente(base.tb)) {
        score += 20;
        fatores.push("tuberculose em acompanhamento");
    }

    if ((pendencias || []).length >= 3) {
        score += 20;
        fatores.push("múltiplas pendências clínicas");
    }

    if (diasDesdeTerritorioInteligente(base.ultimo_atendimento) > 180) {
        score += 12;
        fatores.push("sem acompanhamento longitudinal recente");
    }

    return {
        score:
            limitarScoreTerritorioInteligente(score),

        fatores
    };
}

function calcularScoreDescompensacaoTerritorioInteligente(base, contexto, pendencias) {
    let score = 0;
    const fatores = [];

    const pas =
        Number(base.pas || 0);

    const pad =
        Number(base.pad || 0);

    const hba1c =
        Number(base.hba1c || 0);

    if (valorSimTerritorioInteligente(base.has)) {
        score += 8;

        if (pas >= 180 || pad >= 110) {
            score += 40;
            fatores.push("pressão arterial em faixa crítica");
        } else if (pas >= 160 || pad >= 100) {
            score += 25;
            fatores.push("pressão arterial muito elevada");
        } else if (pas >= 140 || pad >= 90) {
            score += 12;
            fatores.push("pressão arterial elevada");
        }

        if (!pas || !pad) {
            score += 15;
            fatores.push("hipertenso sem PA registrada");
        }
    }

    if (valorSimTerritorioInteligente(base.dm)) {
        score += 8;

        if (hba1c >= 10) {
            score += 40;
            fatores.push("HbA1c muito elevada");
        } else if (hba1c >= 9) {
            score += 25;
            fatores.push("HbA1c elevada");
        } else if (hba1c >= 7) {
            score += 12;
            fatores.push("HbA1c acima do alvo");
        }

        if (!hba1c) {
            score += 15;
            fatores.push("diabético sem HbA1c registrada");
        }
    }

    return {
        score:
            limitarScoreTerritorioInteligente(score),

        fatores
    };
}

function calcularScoreGestacionalTerritorioInteligente(base, contexto) {
    if (!valorSimTerritorioInteligente(base.gestante)) {
        return {
            score: 0,
            fatores: []
        };
    }

    let score = 20;
    const fatores = ["gestação ativa"];

    if (diasDesdeTerritorioInteligente(base.ultimo_atendimento) > 30) {
        score += 45;
        fatores.push("gestante sem consulta recente");
    }

    if (Number(base.prazo) === 0) {
        score += 30;
        fatores.push("retorno pré-natal vencido");
    }

    return {
        score:
            limitarScoreTerritorioInteligente(score),

        fatores
    };
}

function calcularScoreSocialTerritorioInteligente(base, contexto) {
    let score = 0;
    const fatores = [];

    const nota =
        normalizarTerritorioInteligente(base.nota);

    if (
        nota.includes("dificuldade") ||
        nota.includes("vulneravel") ||
        nota.includes("vulnerável") ||
        nota.includes("locomocao") ||
        nota.includes("locomoção") ||
        nota.includes("sem telefone") ||
        nota.includes("familia")
    ) {
        score += 25;
        fatores.push("indício de vulnerabilidade social em nota");
    }

    if (!base.telefone) {
        score += 10;
        fatores.push("sem telefone cadastrado");
    }

    if (!base.cep && !base.bairro) {
        score += 8;
        fatores.push("localização territorial incompleta");
    }

    return {
        score:
            limitarScoreTerritorioInteligente(score),

        fatores
    };
}

function calcularScoreTerritorialTerritorioInteligente(base, contexto) {
    let score = 0;
    const fatores = [];

    if (!base.equipe || base.equipe === "Não informado") {
        score += 10;
        fatores.push("sem equipe vinculada");
    }

    if (!base.ubs || base.ubs === "Não informado") {
        score += 10;
        fatores.push("sem UBS vinculada");
    }

    if (valorSimTerritorioInteligente(base.tb)) {
        score += 20;
        fatores.push("condição transmissível exige vigilância territorial");
    }

    if (valorSimTerritorioInteligente(base.hansen)) {
        score += 20;
        fatores.push("hanseníase exige vigilância territorial");
    }

    return {
        score:
            limitarScoreTerritorioInteligente(score),

        fatores
    };
}


/* ==========================================================
   TERRITÓRIO INTELIGENTE 3.0 — EVFAM-BR OPERACIONAL
   Base conceitual: dimensões renda, cuidado em saúde,
   família e violência. Não substitui instrumento oficial.
   ========================================================== */

function calcularEVFAMTerritorioInteligente(base, contexto) {
    const visitas =
        contexto.visitas || [];

    const ultimaVisita =
        visitas
            .slice()
            .sort((a, b) =>
                new Date(b.data_visita || b.created_at || 0) -
                new Date(a.data_visita || a.created_at || 0)
            )[0] || {};

    let renda = 0;
    let cuidadoSaude = 0;
    let familia = 0;
    let violencia = 0;

    const fatores = [];

    const nota =
        normalizarTerritorioInteligente(
            [
                base.nota,
                ultimaVisita.observacoes,
                ultimaVisita.conduta
            ].join(" ")
        );

    // Dimensão renda / condições materiais
    if (valorSimTerritorioInteligente(ultimaVisita.renda_insuficiente)) {
        renda += 2;
        fatores.push("EVFAM: renda insuficiente");
    }

    if (valorSimTerritorioInteligente(ultimaVisita.inseguranca_alimentar) || nota.includes("inseguranca alimentar")) {
        renda += 3;
        fatores.push("EVFAM: insegurança alimentar");
    }

    if (valorSimTerritorioInteligente(ultimaVisita.moradia_inadequada) || valorSimTerritorioInteligente(ultimaVisita.saneamento_inadequado)) {
        renda += 2;
        fatores.push("EVFAM: moradia/saneamento inadequado");
    }

    // Dimensão cuidado em saúde
    if (valorSimTerritorioInteligente(ultimaVisita.acamado) || valorSimTerritorioInteligente(base.acamado) || nota.includes("acamado")) {
        cuidadoSaude += 4;
        fatores.push("EVFAM: pessoa acamada");
    }

    if (valorSimTerritorioInteligente(ultimaVisita.restricao_mobilidade) || valorSimTerritorioInteligente(base.restricao_mobilidade) || nota.includes("dificuldade de locomocao") || nota.includes("restricao de mobilidade")) {
        cuidadoSaude += 3;
        fatores.push("EVFAM: restrição de mobilidade");
    }

    if (valorSimTerritorioInteligente(ultimaVisita.dificuldade_acesso_ubs) || valorSimTerritorioInteligente(base.dificuldade_acesso_ubs)) {
        cuidadoSaude += 2;
        fatores.push("EVFAM: dificuldade de acesso à UBS");
    }

    if (valorSimTerritorioInteligente(ultimaVisita.abandono_tratamento) || valorSimTerritorioInteligente(ultimaVisita.uso_inadequado_medicamentos)) {
        cuidadoSaude += 3;
        fatores.push("EVFAM: baixa adesão ao cuidado");
    }

    if (valorSimTerritorioInteligente(ultimaVisita.risco_queda) || valorSimTerritorioInteligente(ultimaVisita.necessidade_curativo)) {
        cuidadoSaude += 2;
        fatores.push("EVFAM: risco funcional / necessidade de cuidado domiciliar");
    }

    // Dimensão família / suporte
    if (valorSimTerritorioInteligente(ultimaVisita.ausencia_cuidador) || nota.includes("sem cuidador")) {
        familia += 4;
        fatores.push("EVFAM: ausência de cuidador");
    }

    if (valorSimTerritorioInteligente(ultimaVisita.cuidador_sobrecarregado)) {
        familia += 2;
        fatores.push("EVFAM: cuidador sobrecarregado");
    }

    if (valorSimTerritorioInteligente(ultimaVisita.idoso_sozinho) || nota.includes("idoso sozinho")) {
        familia += 3;
        fatores.push("EVFAM: pessoa idosa sem suporte suficiente");
    }

    if (valorSimTerritorioInteligente(ultimaVisita.conflito_familiar) || valorSimTerritorioInteligente(ultimaVisita.crianca_sem_responsavel)) {
        familia += 3;
        fatores.push("EVFAM: fragilidade familiar");
    }

    // Dimensão violência / proteção
    if (valorSimTerritorioInteligente(ultimaVisita.suspeita_violencia) || valorSimTerritorioInteligente(ultimaVisita.violencia_domestica)) {
        violencia += 5;
        fatores.push("EVFAM: suspeita de violência");
    }

    if (valorSimTerritorioInteligente(ultimaVisita.negligencia) || valorSimTerritorioInteligente(ultimaVisita.risco_autonegligencia)) {
        violencia += 4;
        fatores.push("EVFAM: negligência/autonegligência");
    }

    if (valorSimTerritorioInteligente(ultimaVisita.uso_abusivo_substancias)) {
        violencia += 3;
        fatores.push("EVFAM: uso abusivo de substâncias no contexto familiar");
    }

    const total =
        renda +
        cuidadoSaude +
        familia +
        violencia;

    const scoreNormalizado =
        limitarScoreTerritorioInteligente(total * 5);

    return {
        renda,
        cuidadoSaude,
        familia,
        violencia,
        total,
        scoreNormalizado,
        classificacao:
            classificarEVFAMTerritorioInteligente(total),
        fatores:
            fatores.slice(0, 30),
        ultimaVisita
    };
}

function classificarEVFAMTerritorioInteligente(total) {
    if (total >= 18) return "Vulnerabilidade muito alta";
    if (total >= 12) return "Vulnerabilidade alta";
    if (total >= 6) return "Vulnerabilidade moderada";
    if (total > 0) return "Vulnerabilidade baixa";
    return "Sem vulnerabilidade registrada";
}

function calcularScoreClinicoTerritorioInteligente(base, contexto, partes) {
    let score = 0;
    const fatores = [];

    if (valorSimTerritorioInteligente(base.has)) {
        score += 12;
        fatores.push("HAS");
    }

    if (valorSimTerritorioInteligente(base.dm)) {
        score += 16;
        fatores.push("DM");
    }

    if (valorSimTerritorioInteligente(base.gestante)) {
        score += 18;
        fatores.push("gestação");
    }

    if (valorSimTerritorioInteligente(base.tb)) {
        score += 25;
        fatores.push("TB");
    }

    if (valorSimTerritorioInteligente(base.hansen)) {
        score += 20;
        fatores.push("hanseníase");
    }

    score += Math.round((partes.internacao?.score || 0) * 0.35);
    score += Math.round((partes.descompensacao?.score || 0) * 0.45);
    score += Math.round((partes.gestacional?.score || 0) * 0.25);

    return {
        score:
            limitarScoreTerritorioInteligente(score),
        fatores
    };
}

function calcularScoreAssistencialTerritorioInteligente(base, contexto, partes) {
    let score = 0;
    const fatores = [];

    const abandonoScore =
        partes.abandono?.score || 0;

    score += Math.round(abandonoScore * 0.70);

    if ((partes.pendencias || []).length) {
        score += (partes.pendencias || []).length * 8;
        fatores.push(`${(partes.pendencias || []).length} pendência(s) assistencial(is)`);
    }

    const visitas =
        contexto.visitas || [];

    const ultimaVisita =
        visitas
            .slice()
            .sort((a, b) =>
                new Date(b.data_visita || b.created_at || 0) -
                new Date(a.data_visita || a.created_at || 0)
            )[0];

    if (!ultimaVisita && (abandonoScore >= 30 || (partes.pendencias || []).length >= 2)) {
        score += 18;
        fatores.push("sem visita domiciliar registrada apesar de pendências");
    }

    if (ultimaVisita && diasDesdeTerritorioInteligente(ultimaVisita.data_visita || ultimaVisita.created_at) > 180) {
        score += 12;
        fatores.push("visita domiciliar antiga");
    }

    return {
        score:
            limitarScoreTerritorioInteligente(score),
        fatores
    };
}

function calcularScoreDomiciliarTerritorioInteligente(base, contexto, evfam) {
    let score = 0;
    const fatores = [];

    const v =
        evfam.ultimaVisita || {};

    const add = (cond, pontos, texto) => {
        if (cond) {
            score += pontos;
            fatores.push(texto);
        }
    };

    add(valorSimTerritorioInteligente(v.acamado) || valorSimTerritorioInteligente(base.acamado), 30, "acamado");
    add(valorSimTerritorioInteligente(v.restricao_mobilidade) || valorSimTerritorioInteligente(base.restricao_mobilidade), 22, "restrição de mobilidade");
    add(valorSimTerritorioInteligente(v.ausencia_cuidador), 22, "ausência de cuidador");
    add(valorSimTerritorioInteligente(v.risco_queda), 18, "risco de queda");
    add(valorSimTerritorioInteligente(v.necessidade_curativo), 18, "necessidade de curativo/cuidado domiciliar");
    add(valorSimTerritorioInteligente(v.dificuldade_acesso_ubs) || valorSimTerritorioInteligente(base.dificuldade_acesso_ubs), 16, "dificuldade de acesso à UBS");
    add(valorSimTerritorioInteligente(v.morador_ausente), 10, "morador ausente em visita");
    add(valorSimTerritorioInteligente(v.mudou_endereco), 12, "mudança de endereço não consolidada");

    score += Math.round(evfam.scoreNormalizado * 0.25);

    return {
        score:
            limitarScoreTerritorioInteligente(score),
        fatores
    };
}

function indicarVisitaDomiciliarTerritorioInteligente(base, scoreGeral, evfam, domiciliar, pendencias, fatores) {
    const violencia =
        evfam.violencia >= 4 ||
        (fatores || []).some(f =>
            normalizarTerritorioInteligente(f).includes("violencia") ||
            normalizarTerritorioInteligente(f).includes("negligencia")
        );

    const clinicoDomiciliar =
        domiciliar.score >= 45 ||
        valorSimTerritorioInteligente(base.tb) ||
        valorSimTerritorioInteligente(base.hansen) ||
        (valorSimTerritorioInteligente(base.gestante) && scoreGeral >= 60);

    const social =
        evfam.total >= 12 ||
        evfam.familia >= 4 ||
        evfam.renda >= 4;

    const indicada =
        scoreGeral >= 60 ||
        domiciliar.score >= 35 ||
        evfam.total >= 6 ||
        violencia ||
        (pendencias || []).length >= 3;

    if (!indicada) {
        return {
            indicada: false,
            tipo: "Não indicada",
            prazoDias: null
        };
    }

    if (violencia) {
        return {
            indicada: true,
            tipo: "Visita compartilhada + rede de proteção",
            prazoDias: 1
        };
    }

    if (clinicoDomiciliar && social) {
        return {
            indicada: true,
            tipo: "Visita compartilhada ACS + enfermagem",
            prazoDias: scoreGeral >= 80 ? 3 : 7
        };
    }

    if (clinicoDomiciliar) {
        return {
            indicada: true,
            tipo: "Visita clínica domiciliar",
            prazoDias: scoreGeral >= 80 ? 3 : 10
        };
    }

    return {
        indicada: true,
        tipo: "Visita ACS / reconhecimento familiar",
        prazoDias: scoreGeral >= 80 ? 3 : 15
    };
}

function gerarResumoTerritorioInteligenteV3(base, score, prioridade, pendencias, evfam, visita) {
    return `${base.nome || "Paciente"}: ${prioridade.prioridade} (${score} pontos), EVFAM ${evfam.classificacao}, ${pendencias.length} pendência(s). Visita domiciliar: ${visita.indicada ? visita.tipo + " em até " + visita.prazoDias + " dia(s)" : "não indicada"}.`;
}

function gerarRecomendacaoTerritorioInteligenteV3(base, score, pendencias, fatores, evfam, visita) {
    if (visita.indicada) {
        return `Recomenda-se ${visita.tipo} em até ${visita.prazoDias} dia(s), com atualização da EVFAM, revisão das pendências e registro de conduta no plano de cuidado.`;
    }

    if (score >= 80) {
        return "Priorizar avaliação imediata, busca ativa e revisão de plano terapêutico pela equipe.";
    }

    if (score >= 60) {
        return "Programar retorno breve, atualizar pendências clínicas e considerar visita domiciliar se houver barreira de acesso.";
    }

    if (evfam.total > 0) {
        return "Manter vigilância familiar e atualizar EVFAM em próxima visita ou contato.";
    }

    return "Manter seguimento habitual conforme rotina da APS.";
}

/* ==========================================================
   PENDÊNCIAS E RECOMENDAÇÃO
   ========================================================== */

function identificarPendenciasTerritorioInteligente(base, contexto) {
    const pendencias = [];

    if (
        valorSimTerritorioInteligente(base.has) &&
        (!base.pas || !base.pad)
    ) {
        pendencias.push("HAS sem PA registrada");
    }

    if (
        valorSimTerritorioInteligente(base.dm) &&
        !base.hba1c
    ) {
        pendencias.push("DM sem HbA1c registrada");
    }

    if (
        valorSimTerritorioInteligente(base.gestante) &&
        diasDesdeTerritorioInteligente(base.ultimo_atendimento) > 30
    ) {
        pendencias.push("Gestante sem consulta recente");
    }

    if (
        valorSimTerritorioInteligente(base.tb) &&
        diasDesdeTerritorioInteligente(base.ultimo_atendimento) > 30
    ) {
        pendencias.push("TB sem acompanhamento recente");
    }

    if (
        valorSimTerritorioInteligente(base.hansen) &&
        diasDesdeTerritorioInteligente(base.ultimo_atendimento) > 60
    ) {
        pendencias.push("Hanseníase sem avaliação recente");
    }

    if (Number(base.prazo) === 0) {
        pendencias.push("Retorno vencido");
    }

    if (diasDesdeTerritorioInteligente(base.ultimo_atendimento) > 180) {
        pendencias.push("Sem atendimento há mais de 180 dias");
    }

    return pendencias;
}

function gerarRecomendacaoTerritorioInteligente(base, score, pendencias, fatores) {
    if (score >= 80) {
        return "Priorizar avaliação imediata, busca ativa e revisão de plano terapêutico pela equipe.";
    }

    if (score >= 60) {
        return "Programar retorno breve, atualizar pendências clínicas e incluir na pauta da equipe.";
    }

    if (score >= 40) {
        return "Manter acompanhamento programado e revisar pendências no próximo contato.";
    }

    if ((pendencias || []).length > 0) {
        return "Resolver pendências clínicas identificadas e manter vigilância longitudinal.";
    }

    return "Manter seguimento habitual conforme rotina da APS.";
}

function gerarResumoTerritorioInteligente(base, score, prioridade, pendencias) {
    return `${base.nome || "Paciente"} classificado como ${prioridade.prioridade} (${score} pontos), com ${pendencias.length} pendência(s) identificada(s).`;
}

function classificarPrioridadeTerritorioInteligente(score) {
    if (score >= 80) {
        return {
            prioridade: "Crítica",
            classe: "Muito alto risco"
        };
    }

    if (score >= 60) {
        return {
            prioridade: "Alta",
            classe: "Alto risco"
        };
    }

    if (score >= 40) {
        return {
            prioridade: "Moderada",
            classe: "Risco moderado"
        };
    }

    return {
        prioridade: "Baixa",
        classe: "Rotina"
    };
}

/* ==========================================================
   SALVAMENTO
   ========================================================== */

async function salvarTerritorioInteligente(registro) {
    if (!registro.cpf) {
        console.warn("Território Inteligente: CPF ausente, não será salvo.", registro);
        return null;
    }

    const { data, error } =
        await supabaseClient
            .from("territorio_inteligente")
            .upsert(
                registro,
                {
                    onConflict: "cpf"
                }
            )
            .select()
            .single();

    if (error) {
        console.error("Erro ao salvar territorio_inteligente:", error);
        return null;
    }

    return data;
}


/* ==========================================================
   CARREGAMENTO GERAL PARA TELAS / DASHBOARD
   ========================================================== */

async function carregarTerritorioInteligente(limite = 5000) {
    return listarPrioridadesTerritorioInteligente(limite);
}

async function carregarTerritorioInteligenteSeguro(limite = 5000) {
    try {
        return await listarPrioridadesTerritorioInteligente(limite);
    } catch (erro) {
        console.warn("Território Inteligente: carregamento seguro retornou lista vazia.", erro);
        return [];
    }
}

async function atualizarOuCarregarTerritorioInteligente(cpfOuCns = null) {
    const identificador =
        limparDocumentoTerritorioInteligente(cpfOuCns || "");

    if (identificador) {
        return atualizarTerritorioInteligente(identificador);
    }

    return carregarResumoTerritorioInteligente();
}


/* ==========================================================
   CONSULTAS PARA OUTROS MÓDULOS
   ========================================================== */

async function listarPrioridadesTerritorioInteligente(limite = 100) {
    if (typeof supabaseClient === "undefined") {
        console.warn("Supabase não carregado para listar Território Inteligente.");
        return [];
    }

    const { data, error } =
        await supabaseClient
            .from("territorio_inteligente")
            .select("*")
            .order("score_territorial_global", { ascending: false })
            .limit(limite);

    if (error) {
        console.error("Erro ao listar prioridades do Território Inteligente:", error);

        if (
            error.code === "42501" ||
            String(error.message || "").includes("permission denied")
        ) {
            mostrarToast?.("⚠️ Sem permissão na tabela territorio_inteligente. Ajuste GRANT/RLS no Supabase.");
        }

        return [];
    }

    return data || [];
}

async function carregarResumoTerritorioInteligente() {
    const lista =
        await listarPrioridadesTerritorioInteligente(5000);

    return {
        total:
            lista.length,

        criticos:
            lista.filter(x => x.nivel_prioridade === "CRITICO" || x.prioridade === "Crítica").length,

        alta:
            lista.filter(x => x.nivel_prioridade === "ALTO" || x.prioridade === "Alta").length,

        moderada:
            lista.filter(x => x.nivel_prioridade === "MODERADO" || x.prioridade === "Moderada").length,

        baixa:
            lista.filter(x => x.nivel_prioridade === "BAIXO" || x.prioridade === "Baixa").length,

        gestantes:
            lista.filter(x => x.gestante).length,

        has:
            lista.filter(x => x.has).length,

        dm:
            lista.filter(x => x.dm).length,

        tb:
            lista.filter(x => x.tb).length,

        hansen:
            lista.filter(x => x.hansen).length,

        lista
    };
}


/* ==========================================================
   AGENDA INTELIGENTE APS
   ========================================================== */

async function gerarAgendaInteligenteAPS(opcoes = {}) {
    if (typeof supabaseClient === "undefined") {
        console.warn("Supabase não carregado para Agenda Inteligente APS.");
        return [];
    }

    const dataSugerida =
        opcoes.data_sugerida ||
        new Date().toISOString().split("T")[0];

    const origem =
        opcoes.origem ||
        "SCORE_TERRITORIAL_GLOBAL";

    const pacientes =
        await listarPrioridadesTerritorioInteligente(5000);

    const agenda = [];

    pacientes.forEach((paciente) => {
        const score =
            Number(paciente.score_territorial_global || paciente.score_geral || 0);

        const pendencias =
            Array.isArray(paciente.pendencias)
                ? paciente.pendencias
                : [];

        const nome =
            paciente.nome || paciente.paciente_nome || "Sem nome";

        const cpf =
            paciente.cpf || paciente.paciente_cpf || "";

        if (!cpf) return;

        if (score >= 85 || paciente.visita_domiciliar_indicada === true) {
            agenda.push({
                paciente_cpf: cpf,
                paciente_nome: nome,
                tipo: "VISITA_DOMICILIAR",
                prioridade: score >= 85 ? "CRITICA" : "ALTA",
                data_sugerida: dataSugerida,
                motivo: score >= 85
                    ? "Score Territorial APS Global crítico"
                    : paciente.tipo_visita_sugerida || "Visita domiciliar indicada",
                origem
            });
        }

        if (score >= 65 || pendencias.length > 0) {
            agenda.push({
                paciente_cpf: cpf,
                paciente_nome: nome,
                tipo: "BUSCA_ATIVA",
                prioridade: score >= 85 ? "CRITICA" : "ALTA",
                data_sugerida: dataSugerida,
                motivo: pendencias.length
                    ? pendencias.join(", ")
                    : "Alta prioridade territorial",
                origem
            });
        }

        if (valorSimTerritorioInteligente(paciente.gestante)) {
            agenda.push({
                paciente_cpf: cpf,
                paciente_nome: nome,
                tipo: "PRE_NATAL",
                prioridade: score >= 65 ? "ALTA" : "MODERADA",
                data_sugerida: dataSugerida,
                motivo: "Gestante em acompanhamento territorial",
                origem: "LINHA_CUIDADO_GESTANTE"
            });
        }

        if (normalizarTerritorioInteligente(paciente.acao_recomendada).includes("material")) {
            agenda.push({
                paciente_cpf: cpf,
                paciente_nome: nome,
                tipo: "ENTREGA_MATERIAL",
                prioridade: score >= 65 ? "ALTA" : "MODERADA",
                data_sugerida: dataSugerida,
                motivo: "Necessidade de entrega ou acompanhamento de material",
                origem: "MATERIAIS_APS"
            });
        }
    });

    return removerDuplicidadesAgendaAPS(agenda);
}

function removerDuplicidadesAgendaAPS(agenda) {
    const mapa = new Map();

    (agenda || []).forEach((item) => {
        const chave =
            [
                item.paciente_cpf,
                item.tipo,
                item.data_sugerida,
                item.motivo
            ].join("|");

        if (!mapa.has(chave)) {
            mapa.set(chave, item);
        }
    });

    return Array.from(mapa.values());
}

async function salvarAgendaInteligenteAPS(agenda) {
    if (!agenda || !agenda.length) {
        return [];
    }

    const { data, error } =
        await supabaseClient
            .from("agenda_aps")
            .insert(agenda)
            .select();

    if (error) {
        console.error("Erro ao salvar Agenda Inteligente APS:", error);
        return [];
    }

    mostrarToast?.(`🗓 Agenda Inteligente APS gerada: ${data.length} item(ns).`);

    return data || [];
}

async function gerarESalvarAgendaInteligenteAPS(opcoes = {}) {
    const agenda =
        await gerarAgendaInteligenteAPS(opcoes);

    return salvarAgendaInteligenteAPS(agenda);
}

async function carregarResumoCopilotoTerritorialAPS() {
    const pacientes =
        await listarPrioridadesTerritorioInteligente(5000);

    const agenda =
        await gerarAgendaInteligenteAPS();

    const criticos =
        pacientes.filter(p =>
            Number(p.score_territorial_global || p.score_geral || 0) >= 85
        ).length;

    const buscasAtivas =
        agenda.filter(a =>
            a.tipo === "BUSCA_ATIVA"
        ).length;

    const visitasPrioritarias =
        agenda.filter(a =>
            a.tipo === "VISITA_DOMICILIAR"
        ).length;

    const gestantes =
        agenda.filter(a =>
            a.tipo === "PRE_NATAL"
        ).length;

    return {
        criticos,
        buscasAtivas,
        visitasPrioritarias,
        gestantes,
        mensagem:
`🧠 Bom dia.

Existem:

• ${criticos} pacientes críticos
• ${buscasAtivas} buscas ativas
• ${visitasPrioritarias} visitas domiciliares prioritárias
• ${gestantes} gestantes sem consulta ou em acompanhamento prioritário

Deseja gerar a agenda do dia?`
    };
}

function renderizarCardsAgendaInteligenteAPS(agenda) {
    const lista =
        agenda || [];

    const contar =
        (tipo) => lista.filter(a => a.tipo === tipo).length;

    const criticos =
        lista.filter(a => a.prioridade === "CRITICA").length;

    return `
        <section class="agenda-aps-cards">
            <article class="card-agenda-aps">
                <span>📞</span>
                <strong>${contar("BUSCA_ATIVA")}</strong>
                <small>Busca Ativa Hoje</small>
            </article>

            <article class="card-agenda-aps">
                <span>🏠</span>
                <strong>${contar("VISITA_DOMICILIAR")}</strong>
                <small>Visitas Hoje</small>
            </article>

            <article class="card-agenda-aps">
                <span>🩺</span>
                <strong>${contar("CONSULTA")}</strong>
                <small>Consultas Prioritárias</small>
            </article>

            <article class="card-agenda-aps">
                <span>🤰</span>
                <strong>${contar("PRE_NATAL")}</strong>
                <small>Gestantes</small>
            </article>

            <article class="card-agenda-aps alerta">
                <span>🚨</span>
                <strong>${criticos}</strong>
                <small>Casos Críticos</small>
            </article>
        </section>
    `;
}

/* ==========================================================
   HELPERS
   ========================================================== */

function calcularUltimoEventoTerritorioInteligente(contexto) {
    const datas = [];

    (contexto.atendimentos || []).forEach(x =>
        datas.push(x.data_atendimento || x.criado_em || x.created_at)
    );

    (contexto.interacoes || []).forEach(x =>
        datas.push(x.criado_em || x.created_at)
    );

    (contexto.reunioes || []).forEach(x =>
        datas.push(x.criado_em || x.created_at)
    );

    (contexto.materiais || []).forEach(x =>
        datas.push(x.criado_em || x.created_at)
    );

    (contexto.visitas || []).forEach(x =>
        datas.push(x.data_visita || x.criado_em || x.created_at)
    );

    const validas =
        datas
            .filter(Boolean)
            .map(d => new Date(d))
            .filter(d => !Number.isNaN(d.getTime()))
            .sort((a, b) => b - a);

    return validas[0]?.toISOString() || null;
}

function limitarScoreTerritorioInteligente(valor) {
    return Math.max(0, Math.min(100, Math.round(Number(valor || 0))));
}

function diasDesdeTerritorioInteligente(data) {
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

function normalizarTerritorioInteligente(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function valorSimTerritorioInteligente(valor) {
    const v =
        normalizarTerritorioInteligente(valor);

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

function primeiroValorTerritorioInteligente(...valores) {
    for (const v of valores) {
        if (v !== null && v !== undefined && String(v).trim() !== "") {
            return v;
        }
    }

    return null;
}

function limparDocumentoTerritorioInteligente(valor) {
    return String(valor || "")
        .replace(/\D/g, "");
}

/* ==========================================================
   GLOBAL
   ========================================================== */

window.atualizarTerritorioInteligente = atualizarTerritorioInteligente;
window.atualizarTodosTerritoriosInteligentes = atualizarTodosTerritoriosInteligentes;
window.carregarTerritorioInteligente = carregarTerritorioInteligente;
window.carregarTerritorioInteligenteSeguro = carregarTerritorioInteligenteSeguro;
window.atualizarOuCarregarTerritorioInteligente = atualizarOuCarregarTerritorioInteligente;
window.calcularTerritorioInteligente = calcularTerritorioInteligente;
window.listarPrioridadesTerritorioInteligente = listarPrioridadesTerritorioInteligente;
window.carregarResumoTerritorioInteligente = carregarResumoTerritorioInteligente;
window.calcularEVFAMTerritorioInteligente = calcularEVFAMTerritorioInteligente;
window.classificarEVFAMTerritorioInteligente = classificarEVFAMTerritorioInteligente;
window.indicarVisitaDomiciliarTerritorioInteligente = indicarVisitaDomiciliarTerritorioInteligente;
window.calcularScoreTerritorialGlobal = calcularScoreTerritorialGlobal;
window.classificarScoreTerritorialGlobal = classificarScoreTerritorialGlobal;
window.classificarPrioridadeTerritorialGlobal = classificarPrioridadeTerritorialGlobal;
window.definirAcaoRecomendadaTerritorialGlobal = definirAcaoRecomendadaTerritorialGlobal;
window.ordenarPorScoreTerritorialGlobal = ordenarPorScoreTerritorialGlobal;
window.calcularOrdemFilaTerritorialGlobal = calcularOrdemFilaTerritorialGlobal;
window.reordenarFilaTerritorialGlobal = reordenarFilaTerritorialGlobal;
window.gerarAgendaInteligenteAPS = gerarAgendaInteligenteAPS;
window.salvarAgendaInteligenteAPS = salvarAgendaInteligenteAPS;
window.gerarESalvarAgendaInteligenteAPS = gerarESalvarAgendaInteligenteAPS;
window.carregarResumoCopilotoTerritorialAPS = carregarResumoCopilotoTerritorialAPS;
window.renderizarCardsAgendaInteligenteAPS = renderizarCardsAgendaInteligenteAPS;


console.log("✅ Território Inteligente carregado com segurança.");
