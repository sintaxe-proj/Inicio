/* ==========================================================
   🧠 MOTOR IA OPERACIONAL APS — SINTAXEHUB
   Versão 1.0
   ----------------------------------------------------------
   Objetivo:
   Transformar dados em decisão operacional.

   Consome:
   - pacientes
   - atendimentos
   - territorio_inteligente
   - agenda_aps
   - visitas_domiciliares
   - interacoes_busca_ativa

   Produz:
   - ranking de prioridade
   - pendências
   - ação recomendada
   - resumo executivo para Copiloto APS
   - cards para dashboard
   ========================================================== */

let motorIAOperacionalAPSAtual = {
    pacientes: [],
    atendimentos: [],
    territorio: [],
    agenda: [],
    visitas: [],
    interacoes: [],
    ranking: [],
    resumo: {},
    ultimaAtualizacao: null
};

/* ==========================================================
   CARREGAMENTO PRINCIPAL
   ========================================================== */

async function carregarMotorIAOperacionalAPS() {
    if (typeof supabaseClient === "undefined") {
        console.warn("Motor IA APS: Supabase não carregado.");
        return null;
    }

    try {
        const [
            pacientes,
            atendimentos,
            territorio,
            agenda,
            visitas,
            interacoes
        ] = await Promise.all([
            buscarTabelaMotorIAAPS("pacientes", "*", 15000),
            buscarTabelaMotorIAAPS("atendimentos", "*", 50000, "data_atendimento"),
            buscarTabelaMotorIAAPS("territorio_inteligente", "*", 50000, "ultima_atualizacao"),
            buscarTabelaMotorIAAPS("agenda_aps", "*", 20000, "data_sugerida"),
            buscarTabelaMotorIAAPS("visitas_domiciliares", "*", 20000, "created_at"),
            buscarTabelaMotorIAAPS("interacoes_busca_ativa", "*", 20000, "criado_em")
        ]);

        const base =
            consolidarBaseMotorIAAPS(
                pacientes || [],
                atendimentos || [],
                territorio || [],
                agenda || [],
                visitas || [],
                interacoes || []
            );

        const ranking =
            base
                .sort((a, b) =>
                    Number(b.score_ia_operacional || 0) -
                    Number(a.score_ia_operacional || 0)
                );

        const resumo =
            gerarResumoMotorIAAPS(ranking);

        motorIAOperacionalAPSAtual = {
            pacientes: pacientes || [],
            atendimentos: atendimentos || [],
            territorio: territorio || [],
            agenda: agenda || [],
            visitas: visitas || [],
            interacoes: interacoes || [],
            ranking,
            resumo,
            ultimaAtualizacao: new Date().toISOString()
        };

        window.motorIAOperacionalAPSAtual =
            motorIAOperacionalAPSAtual;

        atualizarDashboardMotorIAAPS(resumo);
        atualizarCopilotoMotorIAAPS(resumo, ranking);
        atualizarCentralAvisosMotorIAAPS(resumo);

        console.log(
            "🧠 Motor IA Operacional APS executado:",
            motorIAOperacionalAPSAtual
        );

        return motorIAOperacionalAPSAtual;

    } catch (erro) {
        console.error("Erro no Motor IA Operacional APS:", erro);
        return null;
    }
}

async function buscarTabelaMotorIAAPS(
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
            console.warn(
                `Motor IA APS: tabela opcional não carregada (${tabela}):`,
                error.message || error
            );

            return [];
        }

        return data || [];

    } catch (erro) {
        console.warn(
            `Motor IA APS: falha opcional ao buscar ${tabela}:`,
            erro
        );

        return [];
    }
}

/* ==========================================================
   CONSOLIDAÇÃO
   ========================================================== */

function consolidarBaseMotorIAAPS(
    pacientes,
    atendimentos,
    territorio,
    agenda,
    visitas,
    interacoes
) {
    const mapa =
        new Map();

    pacientes.forEach(p => {
        const chave =
            chavePacienteMotorIAAPS(p);

        if (!chave) return;

        mapa.set(chave, {
            id: p.id || "",
            nome: p.nome || "Sem nome",
            cpf: limparDocumentoMotorIAAPS(p.cpf || ""),
            cns: p.cns || "",
            telefone: p.telefone || "",
            endereco: p.endereco || "",
            bairro: p.bairro || "",
            cep: p.cep || "",
            ubs: p.ubs_vinculacao || p.unidade || p.ubs || "Não informado",
            equipe: p.equipe_esf || p.equipe || "Não informado",
            microarea: p.microarea || p.micro_area || p.area || p.ma || "Não informada",
            acs: p.acs || p.agente_comunitario || "",

            has: p.has || "Não",
            dm: p.dm || "Não",
            gestante: p.gestante || "Não",
            tb: p.tb || "Não",
            hansen: p.hansen || "Não",
            acamado: p.acamado || false,
            domiciliado: p.domiciliado || false,

            ultimo_atendimento: null,
            ultima_visita: null,
            ultima_interacao: null,
            agenda_hoje: [],
            agenda_futura: [],

            evfam_total: Number(p.evfam_total || 0),
            evfam_classificacao: p.evfam_classificacao || "",
            score_territorial_global: Number(p.score_territorial_global || 0),
            score_ia_operacional: 0,
            prioridade_ia: "BAIXA",
            pendencias_ia: [],
            acao_recomendada_ia: "",
            justificativa_ia: []
        });
    });

    atendimentos.forEach(a => {
        const chave =
            chavePacienteMotorIAAPS(a);

        if (!chave) return;

        const p =
            mapa.get(chave) ||
            criarPacienteMinimoMotorIAAPS(a);

        if (a.nome_paciente && (!p.nome || p.nome === "Sem nome")) {
            p.nome = a.nome_paciente;
        }

        if (valorSimMotorIAAPS(a.has)) p.has = "Sim";
        if (valorSimMotorIAAPS(a.dm)) p.dm = "Sim";
        if (valorSimMotorIAAPS(a.gestante)) p.gestante = "Sim";
        if (valorSimMotorIAAPS(a.tb)) p.tb = "Sim";
        if (valorSimMotorIAAPS(a.hansen)) p.hansen = "Sim";
        if (valorSimMotorIAAPS(a.acamado)) p.acamado = true;
        if (valorSimMotorIAAPS(a.domiciliado)) p.domiciliado = true;

        p.hasPAS =
            primeiroValorMotorIAAPS(
                a.hasPAS,
                a.has_pas,
                a.objPAS,
                a.obj_pas,
                p.hasPAS
            );

        p.hasPAD =
            primeiroValorMotorIAAPS(
                a.hasPAD,
                a.has_pad,
                a.objPAD,
                a.obj_pad,
                p.hasPAD
            );

        p.dmHbA1c =
            primeiroValorMotorIAAPS(
                a.dmHbA1c,
                a.dm_hba1c,
                a.hba1c,
                p.dmHbA1c
            );

        p.grauPeDiabetico =
            primeiroValorMotorIAAPS(
                a.grauPeDiabetico,
                a.grau_pe_diabetico,
                a.pe_diabetico_grau,
                p.grauPeDiabetico
            );

        p.risco_global =
            a.risco_global ||
            p.risco_global ||
            "";

        p.risco_pontos =
            Number(a.risco_pontos || p.risco_pontos || 0);

        p.reavaliacaoDias =
            a.reavaliacaoDias ??
            a.retorno_dias ??
            p.reavaliacaoDias;

        p.notas =
            primeiroValorMotorIAAPS(
                a.notas,
                a.nota,
                a.notaMonitoramento,
                a.observacao_equipe,
                p.notas
            );

        const data =
            dataValidaMotorIAAPS(
                a.data_atendimento ||
                a.criado_em ||
                a.created_at
            );

        if (
            data &&
            (
                !p.ultimo_atendimento ||
                data > p.ultimo_atendimento
            )
        ) {
            p.ultimo_atendimento =
                data;
        }

        mapa.set(chave, p);
    });

    territorio.forEach(t => {
        const chave =
            chavePacienteMotorIAAPS(t);

        if (!chave) return;

        const p =
            mapa.get(chave) ||
            criarPacienteMinimoMotorIAAPS(t);

        p.evfam_total =
            Number(t.evfam_total || p.evfam_total || 0);

        p.evfam_classificacao =
            t.evfam_classificacao ||
            p.evfam_classificacao ||
            "";

        p.score_territorial_global =
            Number(
                t.score_territorial_global ||
                t.score_geral ||
                p.score_territorial_global ||
                0
            );

        p.score_clinico =
            Number(t.score_clinico || p.score_clinico || 0);

        p.score_social =
            Number(t.score_social || p.score_social || 0);

        p.score_assistencial =
            Number(t.score_assistencial || p.score_assistencial || 0);

        p.score_domiciliar =
            Number(t.score_domiciliar || p.score_domiciliar || 0);

        p.visita_domiciliar_indicada =
            t.visita_domiciliar_indicada ||
            p.visita_domiciliar_indicada ||
            false;

        p.acao_recomendada_territorio =
            t.acao_recomendada ||
            t.recomendacao_ia ||
            p.acao_recomendada_territorio ||
            "";

        if (Array.isArray(t.pendencias)) {
            p.pendencias_territorio =
                t.pendencias;
        }

        mapa.set(chave, p);
    });

    visitas.forEach(v => {
        const chave =
            chavePacienteMotorIAAPS(v);

        if (!chave) return;

        const p =
            mapa.get(chave) ||
            criarPacienteMinimoMotorIAAPS(v);

        const data =
            dataValidaMotorIAAPS(
                v.data_visita ||
                v.created_at ||
                v.criado_em
            );

        if (
            data &&
            (
                !p.ultima_visita ||
                data > p.ultima_visita
            )
        ) {
            p.ultima_visita =
                data;
        }

        mapa.set(chave, p);
    });

    interacoes.forEach(i => {
        const chave =
            chavePacienteMotorIAAPS(i);

        if (!chave) return;

        const p =
            mapa.get(chave) ||
            criarPacienteMinimoMotorIAAPS(i);

        const data =
            dataValidaMotorIAAPS(
                i.criado_em ||
                i.created_at
            );

        if (
            data &&
            (
                !p.ultima_interacao ||
                data > p.ultima_interacao
            )
        ) {
            p.ultima_interacao =
                data;
        }

        p.ultimo_resultado_contato =
            i.resultado ||
            p.ultimo_resultado_contato ||
            "";

        mapa.set(chave, p);
    });

    const hoje =
        new Date().toISOString().slice(0, 10);

    agenda.forEach(a => {
        const chave =
            chavePacienteMotorIAAPS(a);

        if (!chave) return;

        const p =
            mapa.get(chave) ||
            criarPacienteMinimoMotorIAAPS(a);

        const data =
            String(a.data_sugerida || a.data || "").slice(0, 10);

        if (data === hoje) {
            p.agenda_hoje.push(a);
        } else {
            p.agenda_futura.push(a);
        }

        mapa.set(chave, p);
    });

    const base =
        Array.from(mapa.values());

    base.forEach(p => {
        calcularIAOperacionalPacienteAPS(p);
    });

    return base;
}

function criarPacienteMinimoMotorIAAPS(obj) {
    return {
        id: obj.id || "",
        nome: obj.nome || obj.nome_paciente || obj.paciente_nome || "Sem nome",
        cpf: limparDocumentoMotorIAAPS(obj.paciente_cpf || obj.cpf || ""),
        cns: obj.cns || obj.paciente_cns || "",
        telefone: obj.telefone || "",
        ubs: obj.ubs_vinculacao || obj.unidade || obj.ubs || "Não informado",
        equipe: obj.equipe_esf || obj.equipe || "Não informado",
        microarea: obj.microarea || obj.micro_area || obj.area || obj.ma || "Não informada",
        has: "Não",
        dm: "Não",
        gestante: "Não",
        tb: "Não",
        hansen: "Não",
        acamado: false,
        domiciliado: false,
        ultimo_atendimento: null,
        ultima_visita: null,
        ultima_interacao: null,
        agenda_hoje: [],
        agenda_futura: [],
        evfam_total: 0,
        score_territorial_global: 0,
        score_ia_operacional: 0,
        prioridade_ia: "BAIXA",
        pendencias_ia: [],
        acao_recomendada_ia: "",
        justificativa_ia: []
    };
}

/* ==========================================================
   CÁLCULO IA OPERACIONAL
   ========================================================== */

function calcularIAOperacionalPacienteAPS(p) {
    let score = 0;
    const pendencias = [];
    const justificativas = [];

    if (Number(p.score_territorial_global || 0) > 0) {
        score += Number(p.score_territorial_global || 0) * 0.45;
        justificativas.push(`Score territorial ${Number(p.score_territorial_global || 0)}`);
    }

    if (Number(p.evfam_total || 0) >= 15) {
        score += 25;
        pendencias.push("EVFAM alto");
        justificativas.push("Vulnerabilidade familiar elevada");
    } else if (Number(p.evfam_total || 0) >= 8) {
        score += 12;
        pendencias.push("EVFAM moderado");
    }

    if (valorSimMotorIAAPS(p.has)) {
        score += 6;

        if (!temValorMotorIAAPS(p.hasPAS) || !temValorMotorIAAPS(p.hasPAD)) {
            score += 16;
            pendencias.push("HAS sem PA");
            justificativas.push("Hipertensão sem PA registrada");
        }
    }

    if (valorSimMotorIAAPS(p.dm)) {
        score += 8;

        if (!temValorMotorIAAPS(p.dmHbA1c)) {
            score += 18;
            pendencias.push("DM sem HbA1c");
            justificativas.push("Diabetes sem HbA1c registrada");
        }

        if (!temValorMotorIAAPS(p.grauPeDiabetico)) {
            score += 10;
            pendencias.push("Pé diabético sem avaliação");
        }
    }

    if (valorSimMotorIAAPS(p.gestante)) {
        score += 20;

        if (diasDesdeMotorIAAPS(p.ultimo_atendimento) > 30) {
            score += 20;
            pendencias.push("Gestante sem consulta recente");
            justificativas.push("Pré-natal possivelmente atrasado");
        }
    }

    if (valorSimMotorIAAPS(p.tb)) {
        score += 25;

        if (diasDesdeMotorIAAPS(p.ultimo_atendimento) > 30) {
            score += 20;
            pendencias.push("TB sem acompanhamento recente");
        }
    }

    if (valorSimMotorIAAPS(p.hansen)) {
        score += 20;

        if (diasDesdeMotorIAAPS(p.ultimo_atendimento) > 60) {
            score += 15;
            pendencias.push("Hanseníase sem avaliação recente");
        }
    }

    if (Number(p.reavaliacaoDias) === 0) {
        score += 25;
        pendencias.push("Retorno vencido");
        justificativas.push("Retorno vencido");
    }

    if (!p.ultimo_atendimento) {
        score += 20;
        pendencias.push("Sem atendimento registrado");
    } else if (diasDesdeMotorIAAPS(p.ultimo_atendimento) > 180) {
        score += 22;
        pendencias.push("Sem atendimento >180 dias");
        justificativas.push("Acompanhamento longitudinal atrasado");
    }

    if (
        valorSimMotorIAAPS(p.acamado) ||
        valorSimMotorIAAPS(p.domiciliado) ||
        Number(p.score_domiciliar || 0) > 0 ||
        p.visita_domiciliar_indicada === true
    ) {
        score += 25;
        pendencias.push("Visita domiciliar indicada");
        justificativas.push("Restrição de mobilidade ou necessidade domiciliar");
    }

    if (
        normalizarMotorIAAPS(p.ultimo_resultado_contato).includes("sem") ||
        normalizarMotorIAAPS(p.ultimo_resultado_contato).includes("nao_atende") ||
        normalizarMotorIAAPS(p.ultimo_resultado_contato).includes("telefone")
    ) {
        score += 8;
        pendencias.push("Contato sem sucesso");
    }

    if ((p.agenda_hoje || []).length) {
        score += 15;
        justificativas.push("Paciente com agenda hoje");
    }

    p.score_ia_operacional =
        Math.min(
            100,
            Math.round(score)
        );

    p.pendencias_ia =
        [
            ...(p.pendencias_territorio || []),
            ...pendencias
        ]
            .filter(Boolean)
            .filter((item, index, lista) =>
                lista.indexOf(item) === index
            );

    p.justificativa_ia =
        justificativas
            .filter(Boolean)
            .filter((item, index, lista) =>
                lista.indexOf(item) === index
            );

    p.prioridade_ia =
        classificarPrioridadeMotorIAAPS(
            p.score_ia_operacional
        );

    p.acao_recomendada_ia =
        definirAcaoRecomendadaMotorIAAPS(p);
}

function classificarPrioridadeMotorIAAPS(score) {
    const s =
        Number(score || 0);

    if (s >= 85) return "CRÍTICA";
    if (s >= 65) return "ALTA";
    if (s >= 40) return "MODERADA";
    return "ROTINA";
}

function definirAcaoRecomendadaMotorIAAPS(p) {
    const pend =
        (p.pendencias_ia || [])
            .join(" | ")
            .toLowerCase();

    if (
        pend.includes("visita") ||
        p.visita_domiciliar_indicada ||
        valorSimMotorIAAPS(p.acamado) ||
        valorSimMotorIAAPS(p.domiciliado)
    ) {
        return "Programar visita domiciliar pela equipe/ACS.";
    }

    if (
        p.prioridade_ia === "CRÍTICA" ||
        p.prioridade_ia === "ALTA"
    ) {
        return "Priorizar contato ativo e avaliação da equipe.";
    }

    if (pend.includes("retorno")) {
        return "Realizar busca ativa para retorno vencido.";
    }

    if (pend.includes("has") || pend.includes("dm")) {
        return "Agendar acompanhamento de condição crônica.";
    }

    if (pend.includes("gestante")) {
        return "Garantir consulta de pré-natal e checar exames.";
    }

    return "Manter acompanhamento conforme rotina da APS.";
}

/* ==========================================================
   RESUMO EXECUTIVO
   ========================================================== */

function gerarResumoMotorIAAPS(ranking) {
    const total =
        ranking.length;

    const criticos =
        ranking.filter(p =>
            p.prioridade_ia === "CRÍTICA"
        ).length;

    const alta =
        ranking.filter(p =>
            p.prioridade_ia === "ALTA"
        ).length;

    const moderada =
        ranking.filter(p =>
            p.prioridade_ia === "MODERADA"
        ).length;

    const pendencias =
        ranking.filter(p =>
            (p.pendencias_ia || []).length > 0
        ).length;

    const visitas =
        ranking.filter(p =>
            (p.pendencias_ia || []).join(" ").toLowerCase().includes("visita")
        ).length;

    const evfamAlto =
        ranking.filter(p =>
            Number(p.evfam_total || 0) >= 15
        ).length;

    const retornoVencido =
        ranking.filter(p =>
            (p.pendencias_ia || []).includes("Retorno vencido")
        ).length;

    const semAtendimento180 =
        ranking.filter(p =>
            (p.pendencias_ia || []).includes("Sem atendimento >180 dias")
        ).length;

    const hasSemPA =
        ranking.filter(p =>
            (p.pendencias_ia || []).includes("HAS sem PA")
        ).length;

    const dmSemHbA1c =
        ranking.filter(p =>
            (p.pendencias_ia || []).includes("DM sem HbA1c")
        ).length;

    const microareas =
        agruparMotorIAAPS(
            ranking,
            p => p.microarea || "Não informada"
        );

    const equipes =
        agruparMotorIAAPS(
            ranking,
            p => p.equipe || "Não informado"
        );

    const texto =
`🧠 Resumo Operacional APS

População analisada: ${total}
Críticos: ${criticos}
Alta prioridade: ${alta}
Moderados: ${moderada}

Pendências: ${pendencias}
Visitas domiciliares indicadas: ${visitas}
EVFAM alto: ${evfamAlto}
Retorno vencido: ${retornoVencido}
Sem atendimento >180 dias: ${semAtendimento180}

HAS sem PA: ${hasSemPA}
DM sem HbA1c: ${dmSemHbA1c}

Prioridade sugerida:
${criticos > 0 ? "1. Validar pacientes críticos hoje." : "1. Sem críticos detectados."}
${visitas > 0 ? "2. Organizar roteiro de visitas domiciliares." : "2. Sem visitas prioritárias detectadas."}
${retornoVencido > 0 ? "3. Executar busca ativa de retornos vencidos." : "3. Retornos sem alerta expressivo."}`;

    return {
        total,
        criticos,
        alta,
        moderada,
        pendencias,
        visitas,
        evfamAlto,
        retornoVencido,
        semAtendimento180,
        hasSemPA,
        dmSemHbA1c,
        microareas,
        equipes,
        texto
    };
}

function agruparMotorIAAPS(lista, fn) {
    const grupos = {};

    lista.forEach(item => {
        const chave =
            fn(item) || "Não informado";

        if (!grupos[chave]) {
            grupos[chave] = {
                nome: chave,
                total: 0,
                criticos: 0,
                pendencias: 0,
                scoreMedio: 0
            };
        }

        grupos[chave].total++;

        if (item.prioridade_ia === "CRÍTICA") {
            grupos[chave].criticos++;
        }

        if ((item.pendencias_ia || []).length) {
            grupos[chave].pendencias++;
        }

        grupos[chave].scoreMedio +=
            Number(item.score_ia_operacional || 0);
    });

    return Object.values(grupos)
        .map(g => ({
            ...g,
            scoreMedio:
                g.total
                    ? Math.round(g.scoreMedio / g.total)
                    : 0
        }))
        .sort((a, b) =>
            b.criticos - a.criticos ||
            b.pendencias - a.pendencias ||
            b.scoreMedio - a.scoreMedio
        );
}

/* ==========================================================
   INTEGRAÇÕES VISUAIS
   ========================================================== */

function atualizarDashboardMotorIAAPS(resumo) {
    setTextoMotorIAAPS("dashInicialMonitoramentoAtivo", resumo.pendencias);
    setTextoMotorIAAPS("dashInicialPrioridadeAlta", resumo.criticos + resumo.alta);
    setTextoMotorIAAPS("dashInicialVisitaDomiciliar", resumo.visitas);
    setTextoMotorIAAPS("dashInicialEVFAMAlto", resumo.evfamAlto);
    setTextoMotorIAAPS("dashInicialPendentes", resumo.pendencias);
}

function atualizarCopilotoMotorIAAPS(resumo, ranking) {
    window.resumoExecutivoMotorIAAPS =
        resumo.texto;

    window.rankingPrioritarioMotorIAAPS =
        ranking.slice(0, 50);

    const el =
        document.getElementById("resumoCopilotoExecutivoAPS") ||
        document.getElementById("copilotoResumoExecutivoAPS");

    if (el) {
        el.innerText =
            resumo.texto;
    }
}

function atualizarCentralAvisosMotorIAAPS(resumo) {
    setTextoMotorIAAPS("contadorAvisosSininho", resumo.pendencias);
}

function setTextoMotorIAAPS(id, valor) {
    const el =
        document.getElementById(id);

    if (el) {
        el.innerText =
            Number(valor || 0).toLocaleString("pt-BR");
    }
}

/* ==========================================================
   AÇÕES
   ========================================================== */

function abrirRankingMotorIAAPS() {
    const ranking =
        motorIAOperacionalAPSAtual.ranking || [];

    if (!ranking.length) {
        mostrarToast?.("Motor IA ainda não calculado.");
        carregarMotorIAOperacionalAPS();
        return;
    }

    const texto =
        ranking
            .slice(0, 20)
            .map((p, i) =>
                `${i + 1}. ${p.nome} — ${p.prioridade_ia} — Score ${p.score_ia_operacional}
Pendências: ${(p.pendencias_ia || []).join(", ") || "-"}
Ação: ${p.acao_recomendada_ia}`
            )
            .join("\n\n");

    alert(texto);
}

function copiarResumoMotorIAAPS() {
    const texto =
        motorIAOperacionalAPSAtual.resumo?.texto ||
        window.resumoExecutivoMotorIAAPS ||
        "Resumo IA ainda não disponível.";

    navigator.clipboard?.writeText(texto);

    mostrarToast?.("Resumo IA Operacional copiado.");
}

/* ==========================================================
   HELPERS
   ========================================================== */

function chavePacienteMotorIAAPS(obj) {
    return (
        limparDocumentoMotorIAAPS(obj.paciente_cpf || obj.cpf || "") ||
        String(obj.cns || obj.paciente_cns || "").trim() ||
        String(obj.paciente_id || obj.id || "").trim()
    );
}

function limparDocumentoMotorIAAPS(valor) {
    return String(valor || "")
        .replace(/\D/g, "");
}

function valorSimMotorIAAPS(valor) {
    const v =
        String(valor || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();

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

function normalizarMotorIAAPS(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function temValorMotorIAAPS(valor) {
    return (
        valor !== null &&
        valor !== undefined &&
        String(valor).trim() !== ""
    );
}

function primeiroValorMotorIAAPS(...valores) {
    for (const valor of valores) {
        if (temValorMotorIAAPS(valor)) {
            return valor;
        }
    }

    return null;
}

function dataValidaMotorIAAPS(valor) {
    if (!valor) return null;

    const d =
        new Date(valor);

    return Number.isNaN(d.getTime())
        ? null
        : d;
}

function diasDesdeMotorIAAPS(data) {
    if (!data) return 9999;

    const d =
        data instanceof Date
            ? data
            : new Date(data);

    if (Number.isNaN(d.getTime())) {
        return 9999;
    }

    return Math.floor(
        (Date.now() - d.getTime()) /
        (1000 * 60 * 60 * 24)
    );
}

/* ==========================================================
   GLOBAL
   ========================================================== */

window.carregarMotorIAOperacionalAPS =
    carregarMotorIAOperacionalAPS;

window.abrirRankingMotorIAAPS =
    abrirRankingMotorIAAPS;

window.copiarResumoMotorIAAPS =
    copiarResumoMotorIAAPS;

window.motorIAOperacionalAPSAtual =
    motorIAOperacionalAPSAtual;

document.addEventListener("DOMContentLoaded", function () {
    setTimeout(() => {
        carregarMotorIAOperacionalAPS();
    }, 1800);
});

console.log("✅ Motor IA Operacional APS carregado.");



/* ==========================================================
   🔗 ORQUESTRAÇÃO COM PREDIÇÃO, TORRE APS E SALA DE SITUAÇÃO
   Versão 1.1
   ----------------------------------------------------------
   Este bloco amplia o Motor IA Operacional APS para atuar como
   camada central de integração entre:
   - Motor de Predição APS
   - Torre de Controle APS
   - Sala de Situação APS
   - Copiloto Executivo APS
   ========================================================== */

let ecossistemaIAAPSAtual = {
    motorIA: null,
    predicao: null,
    torre: null,
    sala: null,
    decisaoExecutiva: null,
    ultimaAtualizacao: null
};

async function executarEcossistemaIAAPS() {
    const motorIA =
        await carregarMotorIAOperacionalAPS();

    const predicao =
        await executarPredicaoAPSIntegrada(
            motorIA
        );

    const torre =
        await executarTorreAPSIntegrada(
            motorIA,
            predicao
        );

    const sala =
        await executarSalaSituacaoAPSIntegrada(
            motorIA,
            predicao,
            torre
        );

    const decisaoExecutiva =
        gerarDecisaoExecutivaIAAPS(
            motorIA,
            predicao,
            torre,
            sala
        );

    ecossistemaIAAPSAtual = {
        motorIA,
        predicao,
        torre,
        sala,
        decisaoExecutiva,
        ultimaAtualizacao: new Date().toISOString()
    };

    window.ecossistemaIAAPSAtual =
        ecossistemaIAAPSAtual;

    atualizarInterfaceEcossistemaIAAPS(
        ecossistemaIAAPSAtual
    );

    console.log(
        "🧠 Ecossistema IA APS integrado:",
        ecossistemaIAAPSAtual
    );

    return ecossistemaIAAPSAtual;
}

/* ==========================================================
   MOTOR DE PREDIÇÃO APS
   ========================================================== */

async function executarPredicaoAPSIntegrada(motorIA) {
    try {
        if (
            typeof carregarMotorPredicaoAPS === "function"
        ) {
            const resultado =
                await carregarMotorPredicaoAPS();

            return {
                origem: "motorPredicaoAPS.js",
                resultado,
                resumo: extrairResumoPredicaoIAAPS(resultado)
            };
        }

        if (
            typeof executarMotorPredicaoAPS === "function"
        ) {
            const resultado =
                await executarMotorPredicaoAPS();

            return {
                origem: "executarMotorPredicaoAPS",
                resultado,
                resumo: extrairResumoPredicaoIAAPS(resultado)
            };
        }

        return {
            origem: "fallback",
            resultado: gerarPredicaoFallbackIAAPS(
                motorIA?.ranking || []
            ),
            resumo: "Predição estimada pelo Motor IA Operacional APS."
        };

    } catch (erro) {
        console.warn(
            "Ecossistema IA APS: predição indisponível.",
            erro
        );

        return {
            origem: "erro",
            resultado: gerarPredicaoFallbackIAAPS(
                motorIA?.ranking || []
            ),
            resumo: "Predição em fallback por indisponibilidade do módulo."
        };
    }
}

function gerarPredicaoFallbackIAAPS(ranking) {
    const abandono =
        ranking.filter(p =>
            (p.pendencias_ia || []).includes("Sem atendimento >180 dias") ||
            (p.pendencias_ia || []).includes("Contato sem sucesso")
        );

    const internacao =
        ranking.filter(p =>
            p.prioridade_ia === "CRÍTICA" ||
            Number(p.score_ia_operacional || 0) >= 85
        );

    const descompensacaoHAS =
        ranking.filter(p =>
            (p.pendencias_ia || []).includes("HAS sem PA")
        );

    const descompensacaoDM =
        ranking.filter(p =>
            (p.pendencias_ia || []).includes("DM sem HbA1c")
        );

    const riscoGestacional =
        ranking.filter(p =>
            valorSimMotorIAAPS(p.gestante) &&
            (
                p.prioridade_ia === "CRÍTICA" ||
                p.prioridade_ia === "ALTA"
            )
        );

    return {
        abandono: abandono.length,
        internacao: internacao.length,
        descompensacaoHAS: descompensacaoHAS.length,
        descompensacaoDM: descompensacaoDM.length,
        riscoGestacional: riscoGestacional.length,
        listas: {
            abandono: abandono.slice(0, 30),
            internacao: internacao.slice(0, 30),
            descompensacaoHAS: descompensacaoHAS.slice(0, 30),
            descompensacaoDM: descompensacaoDM.slice(0, 30),
            riscoGestacional: riscoGestacional.slice(0, 30)
        }
    };
}

function extrairResumoPredicaoIAAPS(resultado) {
    if (!resultado) {
        return "Sem predição disponível.";
    }

    if (typeof resultado === "string") {
        return resultado;
    }

    const r =
        resultado.resumo ||
        resultado.dados ||
        resultado;

    return {
        abandono:
            r.abandono ||
            r.riscoAbandono ||
            r.perdaSeguimento ||
            0,

        internacao:
            r.internacao ||
            r.riscoInternacao ||
            0,

        has:
            r.descompensacaoHAS ||
            r.has ||
            0,

        dm:
            r.descompensacaoDM ||
            r.dm ||
            0,

        gestacional:
            r.riscoGestacional ||
            r.gestacional ||
            0
    };
}

/* ==========================================================
   TORRE APS
   ========================================================== */

async function executarTorreAPSIntegrada(
    motorIA,
    predicao
) {
    try {
        if (
            typeof carregarTorreControleAPS === "function"
        ) {
            const resultado =
                await carregarTorreControleAPS();

            return {
                origem: "torreControleAPS.js",
                resultado,
                resumo: extrairResumoTorreIAAPS(
                    resultado,
                    motorIA,
                    predicao
                )
            };
        }

        if (
            typeof carregarTorreAPS === "function"
        ) {
            const resultado =
                await carregarTorreAPS();

            return {
                origem: "carregarTorreAPS",
                resultado,
                resumo: extrairResumoTorreIAAPS(
                    resultado,
                    motorIA,
                    predicao
                )
            };
        }

        return {
            origem: "fallback",
            resultado: gerarTorreFallbackIAAPS(
                motorIA?.ranking || []
            ),
            resumo: "Torre APS estimada pelo Motor IA Operacional APS."
        };

    } catch (erro) {
        console.warn(
            "Ecossistema IA APS: Torre APS indisponível.",
            erro
        );

        return {
            origem: "erro",
            resultado: gerarTorreFallbackIAAPS(
                motorIA?.ranking || []
            ),
            resumo: "Torre APS em fallback por indisponibilidade do módulo."
        };
    }
}

function gerarTorreFallbackIAAPS(ranking) {
    const microareas =
        agruparMotorIAAPS(
            ranking,
            p => p.microarea || "Não informada"
        );

    const equipes =
        agruparMotorIAAPS(
            ranking,
            p => p.equipe || "Não informado"
        );

    const ubs =
        agruparMotorIAAPS(
            ranking,
            p => p.ubs || "Não informado"
        );

    return {
        microareas,
        equipes,
        ubs,
        topMicroarea: microareas[0] || null,
        topEquipe: equipes[0] || null,
        topUBS: ubs[0] || null
    };
}

function extrairResumoTorreIAAPS(
    resultado,
    motorIA,
    predicao
) {
    if (!resultado) {
        return gerarTorreFallbackIAAPS(
            motorIA?.ranking || []
        );
    }

    if (resultado.microareas || resultado.equipes || resultado.ubs) {
        return resultado;
    }

    if (resultado.resumo) {
        return resultado.resumo;
    }

    return gerarTorreFallbackIAAPS(
        motorIA?.ranking || []
    );
}

/* ==========================================================
   SALA DE SITUAÇÃO APS
   ========================================================== */

async function executarSalaSituacaoAPSIntegrada(
    motorIA,
    predicao,
    torre
) {
    try {
        if (
            typeof carregarSalaSituacaoAPS === "function"
        ) {
            const resultado =
                await carregarSalaSituacaoAPS();

            return {
                origem: "salaSituacaoAPS.js",
                resultado,
                resumo: extrairResumoSalaIAAPS(
                    resultado,
                    motorIA,
                    predicao,
                    torre
                )
            };
        }

        if (
            typeof carregarSalaSituacaoAPSCognitiva === "function"
        ) {
            const resultado =
                await carregarSalaSituacaoAPSCognitiva();

            return {
                origem: "carregarSalaSituacaoAPSCognitiva",
                resultado,
                resumo: extrairResumoSalaIAAPS(
                    resultado,
                    motorIA,
                    predicao,
                    torre
                )
            };
        }

        return {
            origem: "fallback",
            resultado: gerarSalaSituacaoFallbackIAAPS(
                motorIA,
                predicao,
                torre
            ),
            resumo: "Sala de Situação estimada pelo Motor IA Operacional APS."
        };

    } catch (erro) {
        console.warn(
            "Ecossistema IA APS: Sala de Situação indisponível.",
            erro
        );

        return {
            origem: "erro",
            resultado: gerarSalaSituacaoFallbackIAAPS(
                motorIA,
                predicao,
                torre
            ),
            resumo: "Sala de Situação em fallback por indisponibilidade do módulo."
        };
    }
}

function gerarSalaSituacaoFallbackIAAPS(
    motorIA,
    predicao,
    torre
) {
    const ranking =
        motorIA?.ranking || [];

    const resumo =
        motorIA?.resumo || {};

    const pred =
        predicao?.resultado || {};

    const torreResumo =
        torre?.resultado ||
        torre?.resumo ||
        {};

    return {
        situacaoGeral:
            resumo.criticos > 0
                ? "ATENÇÃO CRÍTICA"
                : resumo.alta > 0
                    ? "ATENÇÃO ALTA"
                    : "ROTINA MONITORADA",

        populacaoAnalisada:
            resumo.total || ranking.length,

        prioridades: {
            criticos: resumo.criticos || 0,
            alta: resumo.alta || 0,
            moderada: resumo.moderada || 0
        },

        riscosPreditivos: pred,

        territoriosPrioritarios: {
            microarea:
                torreResumo.topMicroarea ||
                torreResumo.microareas?.[0] ||
                null,

            equipe:
                torreResumo.topEquipe ||
                torreResumo.equipes?.[0] ||
                null,

            ubs:
                torreResumo.topUBS ||
                torreResumo.ubs?.[0] ||
                null
        },

        recomendacoes:
            gerarRecomendacoesExecutivasIAAPS(
                motorIA,
                predicao,
                torre
            )
    };
}

function extrairResumoSalaIAAPS(
    resultado,
    motorIA,
    predicao,
    torre
) {
    if (!resultado) {
        return gerarSalaSituacaoFallbackIAAPS(
            motorIA,
            predicao,
            torre
        );
    }

    if (resultado.situacaoGeral || resultado.recomendacoes) {
        return resultado;
    }

    if (resultado.resumo) {
        return resultado.resumo;
    }

    return gerarSalaSituacaoFallbackIAAPS(
        motorIA,
        predicao,
        torre
    );
}

/* ==========================================================
   DECISÃO EXECUTIVA
   ========================================================== */

function gerarDecisaoExecutivaIAAPS(
    motorIA,
    predicao,
    torre,
    sala
) {
    const resumo =
        motorIA?.resumo || {};

    const pred =
        predicao?.resultado || {};

    const torreResumo =
        torre?.resultado ||
        torre?.resumo ||
        {};

    const salaResumo =
        sala?.resultado ||
        sala?.resumo ||
        {};

    const topMicroarea =
        torreResumo.topMicroarea ||
        torreResumo.microareas?.[0] ||
        salaResumo.territoriosPrioritarios?.microarea ||
        null;

    const topEquipe =
        torreResumo.topEquipe ||
        torreResumo.equipes?.[0] ||
        salaResumo.territoriosPrioritarios?.equipe ||
        null;

    const recomendacoes =
        gerarRecomendacoesExecutivasIAAPS(
            motorIA,
            predicao,
            torre
        );

    const texto =
`🧠 Decisão Executiva APS

Situação geral:
${salaResumo.situacaoGeral || "Rotina monitorada"}

População analisada: ${resumo.total || 0}
Pacientes críticos: ${resumo.criticos || 0}
Alta prioridade: ${resumo.alta || 0}
Pendências: ${resumo.pendencias || 0}
Visitas indicadas: ${resumo.visitas || 0}

Predição:
• Risco de abandono: ${pred.abandono || pred.riscoAbandono || 0}
• Risco de internação/descompensação: ${pred.internacao || pred.riscoInternacao || 0}
• HAS sem PA: ${resumo.hasSemPA || 0}
• DM sem HbA1c: ${resumo.dmSemHbA1c || 0}

Território prioritário:
• Microárea: ${topMicroarea?.nome || "Não informada"}
• Equipe: ${topEquipe?.nome || "Não informada"}

Ações recomendadas:
${recomendacoes.map((r, i) => `${i + 1}. ${r}`).join("\n")}`;

    return {
        texto,
        topMicroarea,
        topEquipe,
        recomendacoes,
        resumo,
        predicao: pred,
        torre: torreResumo,
        sala: salaResumo
    };
}

function gerarRecomendacoesExecutivasIAAPS(
    motorIA,
    predicao,
    torre
) {
    const resumo =
        motorIA?.resumo || {};

    const pred =
        predicao?.resultado || {};

    const torreResumo =
        torre?.resultado ||
        torre?.resumo ||
        {};

    const recs = [];

    if (resumo.criticos > 0) {
        recs.push(
            `Validar hoje ${resumo.criticos} paciente(s) crítico(s) na Base Territorial.`
        );
    }

    if (resumo.visitas > 0) {
        recs.push(
            `Organizar roteiro de ${resumo.visitas} visita(s) domiciliar(es), priorizando acamados, domiciliados e EVFAM alto.`
        );
    }

    if (resumo.retornoVencido > 0) {
        recs.push(
            `Executar busca ativa para ${resumo.retornoVencido} retorno(s) vencido(s).`
        );
    }

    if (resumo.semAtendimento180 > 0) {
        recs.push(
            `Criar fila de resgate para ${resumo.semAtendimento180} pessoa(s) sem atendimento há mais de 180 dias.`
        );
    }

    if (
        pred.abandono > 0 ||
        pred.riscoAbandono > 0
    ) {
        recs.push(
            "Priorizar pacientes com risco de abandono/perda de seguimento."
        );
    }

    const topMicroarea =
        torreResumo.topMicroarea ||
        torreResumo.microareas?.[0];

    if (topMicroarea) {
        recs.push(
            `Realizar reunião rápida com ACS da microárea ${topMicroarea.nome}.`
        );
    }

    if (!recs.length) {
        recs.push(
            "Manter rotina monitorada e atualizar a Base Territorial diariamente."
        );
    }

    return recs;
}

/* ==========================================================
   INTERFACE / COPILOTO
   ========================================================== */

function atualizarInterfaceEcossistemaIAAPS(ctx) {
    const decisao =
        ctx.decisaoExecutiva || {};

    window.resumoExecutivoMotorIAAPS =
        decisao.texto ||
        ctx.motorIA?.resumo?.texto ||
        "";

    const alvosTexto = [
        "resumoCopilotoExecutivoAPS",
        "copilotoResumoExecutivoAPS",
        "resumoSalaSituacaoIAAPS",
        "resumoTorreAPSIA"
    ];

    alvosTexto.forEach(id => {
        const el =
            document.getElementById(id);

        if (el && window.resumoExecutivoMotorIAAPS) {
            el.innerText =
                window.resumoExecutivoMotorIAAPS;
        }
    });

    if (ctx.motorIA?.resumo) {
        atualizarDashboardMotorIAAPS(
            ctx.motorIA.resumo
        );
    }
}

function abrirDecisaoExecutivaIAAPS() {
    const texto =
        ecossistemaIAAPSAtual.decisaoExecutiva?.texto ||
        window.resumoExecutivoMotorIAAPS ||
        "Ecossistema IA APS ainda não executado.";

    alert(texto);
}

function copiarDecisaoExecutivaIAAPS() {
    const texto =
        ecossistemaIAAPSAtual.decisaoExecutiva?.texto ||
        window.resumoExecutivoMotorIAAPS ||
        "Ecossistema IA APS ainda não executado.";

    navigator.clipboard?.writeText(texto);
    mostrarToast?.("Decisão Executiva APS copiada.");
}

/* ==========================================================
   GLOBAL INTEGRADO
   ========================================================== */

window.executarEcossistemaIAAPS =
    executarEcossistemaIAAPS;

window.abrirDecisaoExecutivaIAAPS =
    abrirDecisaoExecutivaIAAPS;

window.copiarDecisaoExecutivaIAAPS =
    copiarDecisaoExecutivaIAAPS;

window.ecossistemaIAAPSAtual =
    ecossistemaIAAPSAtual;

document.addEventListener("DOMContentLoaded", function () {
    setTimeout(() => {
        executarEcossistemaIAAPS();
    }, 3200);
});

console.log("✅ Ecossistema IA APS integrado ao Motor IA Operacional.");
