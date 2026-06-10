/* ==========================================================
   🧠 MOTOR COGNITIVO APS — SINTAXEHUB
   Camada de inteligência explicável para APS

   Integra:
   - Território Inteligente
   - Score Territorial Global
   - Agenda Inteligente APS
   - Torre APS
   - EVFAM
   - Prontuário SOAP
   - Busca Ativa
   - Visita Domiciliar
   - Copiloto APS

   Supabase-first.
   ========================================================== */

let motorCognitivoAPSAtual = {
    pacientes: [],
    territorio: [],
    agenda: [],
    atendimentos: [],
    visitas: [],
    interacoes: [],
    resumo: null,
    ultimaAtualizacao: null
};

/* ==========================================================
   CARREGAMENTO PRINCIPAL
   ========================================================== */

async function carregarMotorCognitivoAPS() {
    if (typeof supabaseClient === "undefined") {
        console.warn("Motor Cognitivo APS: Supabase não carregado.");
        return null;
    }

    try {
        const [
            pacientesResp,
            territorioResp,
            agendaResp,
            atendimentosResp,
            visitasResp,
            interacoesResp
        ] = await Promise.all([
            supabaseClient
                .from("pacientes")
                .select("*")
                .limit(10000),

            supabaseClient
                .from("territorio_inteligente")
                .select("*")
                .order("score_territorial_global", { ascending: false })
                .limit(20000),

            buscarTabelaOpcionalMotorCognitivoAPS(
                "agenda_aps",
                "*",
                10000
            ),

            supabaseClient
                .from("atendimentos")
                .select("*")
                .order("data_atendimento", {
                    ascending: false,
                    nullsFirst: false
                })
                .limit(30000),

            buscarTabelaOpcionalMotorCognitivoAPS(
                "visitas_domiciliares",
                "*",
                10000
            ),

            buscarTabelaOpcionalMotorCognitivoAPS(
                "interacoes_busca_ativa",
                "*",
                20000
            )
        ]);

        motorCognitivoAPSAtual = {
            pacientes:
                pacientesResp.data || [],

            territorio:
                territorioResp.data || [],

            agenda:
                agendaResp || [],

            atendimentos:
                atendimentosResp.data || [],

            visitas:
                visitasResp || [],

            interacoes:
                interacoesResp || [],

            resumo:
                null,

            ultimaAtualizacao:
                new Date().toISOString()
        };

        motorCognitivoAPSAtual.resumo =
            gerarResumoCognitivoTerritorialAPS();

        window.motorCognitivoAPSAtual =
            motorCognitivoAPSAtual;

        console.log(
            "🧠 Motor Cognitivo APS carregado:",
            motorCognitivoAPSAtual.resumo
        );

        return motorCognitivoAPSAtual;

    } catch (erro) {
        console.error(
            "Erro ao carregar Motor Cognitivo APS:",
            erro
        );

        return null;
    }
}

async function buscarTabelaOpcionalMotorCognitivoAPS(
    tabela,
    select = "*",
    limite = 10000
) {
    try {
        const { data, error } =
            await supabaseClient
                .from(tabela)
                .select(select)
                .limit(limite);

        if (error) {
            console.warn(
                `Motor Cognitivo APS: tabela opcional indisponível: ${tabela}`,
                error.message
            );

            return [];
        }

        return data || [];

    } catch (erro) {
        console.warn(
            `Motor Cognitivo APS: falha opcional em ${tabela}`,
            erro
        );

        return [];
    }
}

/* ==========================================================
   CONTEXTO COGNITIVO DO PACIENTE
   ========================================================== */

async function gerarContextoCognitivoPaciente(cpfOuCns) {
    if (!motorCognitivoAPSAtual.ultimaAtualizacao) {
        await carregarMotorCognitivoAPS();
    }

    const id =
        limparDocumentoMotorCognitivoAPS(cpfOuCns);

    const paciente =
        motorCognitivoAPSAtual.pacientes.find(p =>
            limparDocumentoMotorCognitivoAPS(p.cpf) === id ||
            limparDocumentoMotorCognitivoAPS(p.cns) === id
        ) || null;

    const territorio =
        motorCognitivoAPSAtual.territorio.find(t =>
            limparDocumentoMotorCognitivoAPS(t.cpf) === id ||
            limparDocumentoMotorCognitivoAPS(t.cns) === id
        ) || null;

    const atendimentos =
        motorCognitivoAPSAtual.atendimentos.filter(a =>
            limparDocumentoMotorCognitivoAPS(a.cpf) === id ||
            limparDocumentoMotorCognitivoAPS(a.paciente_cpf) === id ||
            limparDocumentoMotorCognitivoAPS(a.cns) === id
        );

    const visitas =
        motorCognitivoAPSAtual.visitas.filter(v =>
            limparDocumentoMotorCognitivoAPS(v.cpf) === id ||
            limparDocumentoMotorCognitivoAPS(v.paciente_cpf) === id ||
            limparDocumentoMotorCognitivoAPS(v.cns) === id
        );

    const agenda =
        motorCognitivoAPSAtual.agenda.filter(a =>
            limparDocumentoMotorCognitivoAPS(a.paciente_cpf) === id
        );

    const interacoes =
        motorCognitivoAPSAtual.interacoes.filter(i =>
            limparDocumentoMotorCognitivoAPS(i.cpf) === id ||
            limparDocumentoMotorCognitivoAPS(i.paciente_cpf) === id ||
            limparDocumentoMotorCognitivoAPS(i.cns) === id
        );

    return {
        identificador:
            id,

        paciente,
        territorio,
        atendimentos,
        visitas,
        agenda,
        interacoes,

        ultimaAtualizacao:
            new Date().toISOString()
    };
}

async function gerarContextoCognitivoTerritorio() {
    if (!motorCognitivoAPSAtual.ultimaAtualizacao) {
        await carregarMotorCognitivoAPS();
    }

    return {
        resumo:
            gerarResumoCognitivoTerritorialAPS(),

        territorio:
            motorCognitivoAPSAtual.territorio,

        agenda:
            motorCognitivoAPSAtual.agenda,

        pacientes:
            motorCognitivoAPSAtual.pacientes,

        atendimentos:
            motorCognitivoAPSAtual.atendimentos,

        visitas:
            motorCognitivoAPSAtual.visitas,

        interacoes:
            motorCognitivoAPSAtual.interacoes,

        ultimaAtualizacao:
            motorCognitivoAPSAtual.ultimaAtualizacao
    };
}

/* ==========================================================
   ANÁLISE COGNITIVA DO PACIENTE
   ========================================================== */

async function analisarPacienteComIA(cpfOuCns) {
    const contexto =
        await gerarContextoCognitivoPaciente(cpfOuCns);

    const paciente =
        contexto.territorio ||
        contexto.paciente ||
        {};

    if (
        !paciente ||
        (!paciente.cpf && !paciente.nome)
    ) {
        return {
            encontrado: false,
            resposta:
                "Paciente não localizado no território inteligente."
        };
    }

    const score =
        Number(
            paciente.score_territorial_global ??
            paciente.score_geral ??
            0
        );

    const nivel =
        paciente.nivel_prioridade ||
        paciente.prioridade ||
        classificarNivelCognitivoAPS(score);

    const fatores =
        Array.isArray(paciente.fatores)
            ? paciente.fatores
            : [];

    const pendencias =
        Array.isArray(paciente.pendencias)
            ? paciente.pendencias
            : [];

    const vulnerabilidades =
        Array.isArray(paciente.vulnerabilidades)
            ? paciente.vulnerabilidades
            : [];

    const explicacao =
        explicarScoreTerritorialGlobal(paciente);

    const plano =
        gerarPlanoCognitivoPacienteAPS(
            paciente,
            contexto
        );

    const resposta =
        [
            `🧠 Análise cognitiva APS — ${paciente.nome || "Paciente"}`,
            "",
            `Score Territorial Global: ${score}`,
            `Prioridade: ${nivel}`,
            "",
            explicacao,
            "",
            "Plano sugerido:",
            plano.map((x, i) => `${i + 1}. ${x}`).join("\n")
        ].join("\n");

    const resultado = {
        encontrado:
            true,

        paciente,
        contexto,
        score,
        nivel,
        fatores,
        pendencias,
        vulnerabilidades,
        explicacao,
        plano,
        resposta,

        confianca:
            calcularConfiancaCognitivaAPS(contexto)
    };

    await registrarInteligenciaAPS({
        tipo:
            "ANALISE_PACIENTE",

        escopo:
            "PACIENTE",

        referencia_id:
            paciente.cpf ||
            paciente.cns ||
            cpfOuCns,

        pergunta:
            "Análise cognitiva do paciente",

        resposta,

        contexto: {
            score,
            nivel,
            fatores,
            pendencias,
            vulnerabilidades
        },

        confianca:
            resultado.confianca,

        origem:
            "motor_cognitivo_aps"
    });

    return resultado;
}

function explicarScoreTerritorialGlobal(paciente) {
    const nome =
        paciente.nome ||
        "Paciente";

    const score =
        Number(
            paciente.score_territorial_global ??
            paciente.score_geral ??
            0
        );

    const nivel =
        paciente.nivel_prioridade ||
        paciente.prioridade ||
        classificarNivelCognitivoAPS(score);

    const partes = [];

    if (Number(paciente.score_clinico || 0) > 0) {
        partes.push(
            `risco clínico ${Number(paciente.score_clinico || 0)}`
        );
    }

    if (Number(paciente.score_assistencial || 0) > 0) {
        partes.push(
            `pressão assistencial ${Number(paciente.score_assistencial || 0)}`
        );
    }

    if (Number(paciente.score_social || 0) > 0) {
        partes.push(
            `vulnerabilidade social ${Number(paciente.score_social || 0)}`
        );
    }

    if (Number(paciente.score_domiciliar || 0) > 0) {
        partes.push(
            `necessidade domiciliar ${Number(paciente.score_domiciliar || 0)}`
        );
    }

    if (Number(paciente.evfam_total || 0) > 0) {
        partes.push(
            `EVFAM ${Number(paciente.evfam_total || 0)}`
        );
    }

    const textoPartes =
        partes.length
            ? partes.join(", ")
            : "sem fatores estruturados suficientes registrados";

    return `${nome} está classificado como ${nivel}, com Score Territorial Global ${score}, principalmente por: ${textoPartes}.`;
}

function gerarPlanoCognitivoPacienteAPS(paciente, contexto) {
    const score =
        Number(
            paciente.score_territorial_global ??
            paciente.score_geral ??
            0
        );

    const pendencias =
        Array.isArray(paciente.pendencias)
            ? paciente.pendencias
            : [];

    const plano = [];

    if (score >= 85) {
        plano.push("Priorizar hoje na fila da equipe.");
        plano.push("Discutir caso em reunião rápida ou huddle assistencial.");
    }

    if (
        paciente.visita_domiciliar_indicada ||
        score >= 80 ||
        Number(paciente.score_domiciliar || 0) >= 35
    ) {
        plano.push(
            `Realizar visita domiciliar${
                paciente.tipo_visita_sugerida
                    ? " — " + paciente.tipo_visita_sugerida
                    : ""
            }.`
        );
    }

    if (pendencias.length) {
        plano.push(
            `Resolver pendências: ${pendencias.join(", ")}.`
        );
    }

    if (valorSimMotorCognitivoAPS(paciente.gestante)) {
        plano.push(
            "Validar consulta de pré-natal, exames, vacinação e DPP."
        );
    }

    if (valorSimMotorCognitivoAPS(paciente.has)) {
        plano.push(
            "Atualizar PA, risco cardiovascular e plano de cuidado da HAS."
        );
    }

    if (valorSimMotorCognitivoAPS(paciente.dm)) {
        plano.push(
            "Atualizar HbA1c, avaliação de pé diabético e retinopatia."
        );
    }

    if (
        valorSimMotorCognitivoAPS(paciente.tb) ||
        valorSimMotorCognitivoAPS(paciente.hansen)
    ) {
        plano.push(
            "Garantir vigilância de adesão terapêutica e busca ativa se houver atraso."
        );
    }

    if (!plano.length) {
        plano.push(
            "Manter acompanhamento de rotina conforme protocolo da APS."
        );
    }

    return [...new Set(plano)];
}

/* ==========================================================
   ANÁLISE TERRITORIAL
   ========================================================== */

function gerarResumoCognitivoTerritorialAPS() {
    const territorio =
        motorCognitivoAPSAtual.territorio || [];

    const agenda =
        motorCognitivoAPSAtual.agenda || [];

    const criticos =
        territorio.filter(p =>
            Number(p.score_territorial_global ?? p.score_geral ?? 0) >= 85 ||
            p.nivel_prioridade === "CRITICO" ||
            p.prioridade === "Crítica"
        ).length;

    const alto =
        territorio.filter(p => {
            const score =
                Number(p.score_territorial_global ?? p.score_geral ?? 0);

            return score >= 65 && score < 85;
        }).length;

    const moderado =
        territorio.filter(p => {
            const score =
                Number(p.score_territorial_global ?? p.score_geral ?? 0);

            return score >= 40 && score < 65;
        }).length;

    const baixo =
        territorio.filter(p => {
            const score =
                Number(p.score_territorial_global ?? p.score_geral ?? 0);

            return score < 40;
        }).length;

    const buscas =
        agenda.filter(a => a.tipo === "BUSCA_ATIVA").length;

    const visitas =
        agenda.filter(a => a.tipo === "VISITA_DOMICILIAR").length;

    const consultas =
        agenda.filter(a => a.tipo === "CONSULTA").length;

    const gestantes =
        territorio.filter(p =>
            valorSimMotorCognitivoAPS(p.gestante)
        ).length;

    return {
        total:
            territorio.length,

        criticos,
        alto,
        moderado,
        baixo,
        buscas,
        visitas,
        consultas,
        gestantes,

        agendaTotal:
            agenda.length,

        status:
            criticos >= 20
                ? "🔴 Operação crítica"
                : criticos >= 5
                    ? "🟡 Atenção operacional"
                    : "🟢 Operação estável"
    };
}

async function analisarTerritorioComIA() {
    const contexto =
        await gerarContextoCognitivoTerritorio();

    const resumo =
        contexto.resumo;

    const resposta =
        [
            "🧠 Análise cognitiva territorial APS",
            "",
            `Status: ${resumo.status}`,
            `População no Território Inteligente: ${resumo.total}`,
            `Críticos: ${resumo.criticos}`,
            `Alta prioridade: ${resumo.alto}`,
            `Moderados: ${resumo.moderado}`,
            `Baixos: ${resumo.baixo}`,
            "",
            `Agenda atual: ${resumo.agendaTotal} item(ns)`,
            `Buscas ativas: ${resumo.buscas}`,
            `Visitas domiciliares: ${resumo.visitas}`,
            `Consultas: ${resumo.consultas}`,
            `Gestantes: ${resumo.gestantes}`,
            "",
            gerarPlanoOperacionalAPS()
        ].join("\n");

    await registrarInteligenciaAPS({
        tipo:
            "ANALISE_TERRITORIO",

        escopo:
            "TERRITORIO",

        referencia_id:
            "GLOBAL",

        pergunta:
            "Análise cognitiva territorial",

        resposta,

        contexto:
            resumo,

        confianca:
            0.85,

        origem:
            "motor_cognitivo_aps"
    });

    return {
        contexto,
        resumo,
        resposta
    };
}

function gerarPlanoOperacionalAPS() {
    const resumo =
        gerarResumoCognitivoTerritorialAPS();

    const acoes = [];

    if (resumo.criticos > 0) {
        acoes.push(
            `Priorizar os ${resumo.criticos} pacientes críticos na Torre APS.`
        );
    }

    if (resumo.visitas > 0) {
        acoes.push(
            `Organizar ${resumo.visitas} visita(s) domiciliar(es) prioritária(s).`
        );
    }

    if (resumo.buscas > 0) {
        acoes.push(
            `Executar ${resumo.buscas} busca(s) ativa(s) pendente(s).`
        );
    }

    if (resumo.gestantes > 0) {
        acoes.push(
            "Revisar gestantes sem consulta recente, vacinação, exames e DPP."
        );
    }

    if (!acoes.length) {
        acoes.push(
            "Manter vigilância territorial e atualizar dados assistenciais."
        );
    }

    return "Plano operacional sugerido:\n" +
        acoes.map((a, i) => `${i + 1}. ${a}`).join("\n");
}

/* ==========================================================
   COPILOTO APS
   ========================================================== */

async function responderCopilotoAPS(pergunta) {
    const texto =
        normalizarMotorCognitivoAPS(pergunta);

    if (!motorCognitivoAPSAtual.ultimaAtualizacao) {
        await carregarMotorCognitivoAPS();
    }

    let resposta;

    if (
        texto.includes("territorio") ||
        texto.includes("resumo") ||
        texto.includes("situacao")
    ) {
        resposta =
            (await analisarTerritorioComIA()).resposta;

    } else if (
        texto.includes("agenda") ||
        texto.includes("visita") ||
        texto.includes("busca ativa")
    ) {
        const resumo =
            gerarResumoCognitivoTerritorialAPS();

        resposta =
            [
                "🗓 Agenda Inteligente APS",
                "",
                `Total de itens: ${resumo.agendaTotal}`,
                `Buscas ativas: ${resumo.buscas}`,
                `Visitas domiciliares: ${resumo.visitas}`,
                `Consultas: ${resumo.consultas}`,
                "",
                "Use a tela Agenda Inteligente APS para executar ou exportar a programação do dia."
            ].join("\n");

    } else if (
        texto.includes("critico") ||
        texto.includes("prioridade")
    ) {
        const criticos =
            (motorCognitivoAPSAtual.territorio || [])
                .filter(p =>
                    Number(p.score_territorial_global ?? p.score_geral ?? 0) >= 85 ||
                    p.nivel_prioridade === "CRITICO" ||
                    p.prioridade === "Crítica"
                )
                .sort((a, b) =>
                    Number(b.score_territorial_global ?? b.score_geral ?? 0) -
                    Number(a.score_territorial_global ?? a.score_geral ?? 0)
                )
                .slice(0, 10);

        resposta =
            [
                "🚨 Pacientes críticos prioritários",
                "",
                criticos.length
                    ? criticos.map((p, i) =>
                        `${i + 1}. ${p.nome || "Sem nome"} — Score ${Number(p.score_territorial_global ?? p.score_geral ?? 0)} — ${p.acao_recomendada || p.recomendacao_ia || "Priorizar avaliação"}`
                    ).join("\n")
                    : "Nenhum paciente crítico identificado."
            ].join("\n");

    } else {
        resposta =
            [
                "🧠 Motor Cognitivo APS ativo.",
                "",
                "Posso responder sobre:",
                "• situação territorial",
                "• pacientes críticos",
                "• agenda inteligente",
                "• visitas domiciliares",
                "• busca ativa",
                "• explicação do Score Territorial Global",
                "",
                "Exemplo: “quais são os pacientes críticos hoje?”"
            ].join("\n");
    }

    await registrarInteligenciaAPS({
        tipo:
            "COPILOTO",

        escopo:
            "GLOBAL",

        referencia_id:
            "COPILOTO_APS",

        pergunta,

        resposta,

        contexto:
            gerarResumoCognitivoTerritorialAPS(),

        confianca:
            0.8,

        origem:
            "copiloto_motor_cognitivo_aps"
    });

    return resposta;
}

/* ==========================================================
   PERSISTÊNCIA DA INTELIGÊNCIA
   ========================================================== */

async function registrarInteligenciaAPS(payload) {
    if (typeof supabaseClient === "undefined") {
        return null;
    }

    try {
        const { data, error } =
            await supabaseClient
                .from("inteligencia_aps")
                .insert({
                    tipo:
                        payload.tipo || "ANALISE",

                    escopo:
                        payload.escopo || "GLOBAL",

                    referencia_id:
                        payload.referencia_id || null,

                    pergunta:
                        payload.pergunta || null,

                    resposta:
                        payload.resposta || "",

                    contexto:
                        payload.contexto || {},

                    confianca:
                        payload.confianca || null,

                    origem:
                        payload.origem || "motor_cognitivo_aps"
                })
                .select()
                .single();

        if (error) {
            console.warn(
                "Motor Cognitivo APS: não foi possível registrar inteligencia_aps.",
                error.message
            );

            return null;
        }

        return data;

    } catch (erro) {
        console.warn(
            "Motor Cognitivo APS: registro opcional falhou.",
            erro
        );

        return null;
    }
}

/* ==========================================================
   HELPERS
   ========================================================== */

function calcularConfiancaCognitivaAPS(contexto) {
    let pontos = 0;

    if (contexto.paciente) pontos += 0.20;
    if (contexto.territorio) pontos += 0.35;
    if ((contexto.atendimentos || []).length) pontos += 0.20;
    if ((contexto.visitas || []).length) pontos += 0.15;
    if ((contexto.agenda || []).length) pontos += 0.10;

    return Math.min(
        1,
        Number(pontos.toFixed(2))
    );
}

function classificarNivelCognitivoAPS(score) {
    if (score >= 85) return "CRITICO";
    if (score >= 65) return "ALTO";
    if (score >= 40) return "MODERADO";
    return "BAIXO";
}

function normalizarMotorCognitivoAPS(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function limparDocumentoMotorCognitivoAPS(valor) {
    return String(valor || "")
        .replace(/\D/g, "");
}

function valorSimMotorCognitivoAPS(valor) {
    const v =
        normalizarMotorCognitivoAPS(valor);

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

/* ==========================================================
   GLOBAL
   ========================================================== */

window.motorCognitivoAPSAtual = motorCognitivoAPSAtual;
window.carregarMotorCognitivoAPS = carregarMotorCognitivoAPS;
window.gerarContextoCognitivoPaciente = gerarContextoCognitivoPaciente;
window.gerarContextoCognitivoTerritorio = gerarContextoCognitivoTerritorio;
window.analisarPacienteComIA = analisarPacienteComIA;
window.analisarTerritorioComIA = analisarTerritorioComIA;
window.responderCopilotoAPS = responderCopilotoAPS;
window.gerarPlanoOperacionalAPS = gerarPlanoOperacionalAPS;
window.explicarScoreTerritorialGlobal = explicarScoreTerritorialGlobal;
window.registrarInteligenciaAPS = registrarInteligenciaAPS;
window.gerarResumoCognitivoTerritorialAPS = gerarResumoCognitivoTerritorialAPS;

console.log("✅ Motor Cognitivo APS carregado.");
