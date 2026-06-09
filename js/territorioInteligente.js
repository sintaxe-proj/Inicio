/* ==========================================================
   🧠 TERRITÓRIO INTELIGENTE — SINTAXEHUB APS
   Cérebro territorial para IA operacional e predição explicável
   Supabase-first: sem IndexedDB, sem cache persistente.
   ========================================================== */

/* ==========================================================
   ATUALIZAÇÃO PRINCIPAL
   ========================================================== */

async function atualizarTerritorioInteligente(cpfOuCns) {
    if (typeof supabaseClient === "undefined") {
        console.warn("Supabase não carregado para Território Inteligente.");
        return null;
    }

    const identificador =
        limparDocumentoTerritorioInteligente(cpfOuCns || "");

    if (!identificador) {
        console.warn("Território Inteligente: CPF/CNS não informado.");
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

        const resultado =
            await atualizarTerritorioInteligente(id);

        if (resultado) {
            resultados.push(resultado);
        }
    }

    mostrarToast?.(`🧠 Território Inteligente atualizado: ${resultados.length} registros.`);

    return resultados;
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
        materiaisResp
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
            materiaisResp || []
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

    const scoreGeral =
        limitarScoreTerritorioInteligente(
            Math.round(
                abandono.score * 0.22 +
                internacao.score * 0.22 +
                descompensacao.score * 0.22 +
                gestacional.score * 0.12 +
                social.score * 0.10 +
                territorial.score * 0.12
            )
        );

    const fatores =
        [
            ...abandono.fatores,
            ...internacao.fatores,
            ...descompensacao.fatores,
            ...gestacional.fatores,
            ...social.fatores,
            ...territorial.fatores
        ];

    const prioridade =
        classificarPrioridadeTerritorioInteligente(scoreGeral);

    const recomendacao =
        gerarRecomendacaoTerritorioInteligente(
            base,
            scoreGeral,
            pendencias,
            fatores
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

        score_territorial:
            territorial.score,

        prioridade:
            prioridade.prioridade,

        classe_risco:
            prioridade.classe,

        fatores:
            [...new Set(fatores)].slice(0, 30),

        pendencias:
            [...new Set(pendencias)].slice(0, 30),

        resumo_ia:
            gerarResumoTerritorioInteligente(
                base,
                scoreGeral,
                prioridade,
                pendencias
            ),

        recomendacao_ia:
            recomendacao,

        origem:
            "sintaxehub",

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
            ""
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
   CONSULTAS PARA OUTROS MÓDULOS
   ========================================================== */

async function listarPrioridadesTerritorioInteligente(limite = 100) {
    const { data, error } =
        await supabaseClient
            .from("territorio_inteligente")
            .select("*")
            .order("score_geral", { ascending: false })
            .limit(limite);

    if (error) {
        console.error("Erro ao listar prioridades:", error);
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
            lista.filter(x => x.prioridade === "Crítica").length,

        alta:
            lista.filter(x => x.prioridade === "Alta").length,

        moderada:
            lista.filter(x => x.prioridade === "Moderada").length,

        baixa:
            lista.filter(x => x.prioridade === "Baixa").length,

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
window.calcularTerritorioInteligente = calcularTerritorioInteligente;
window.listarPrioridadesTerritorioInteligente = listarPrioridadesTerritorioInteligente;
window.carregarResumoTerritorioInteligente = carregarResumoTerritorioInteligente;
