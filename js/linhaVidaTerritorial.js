/* ==========================================================
   🧬 LINHA DA VIDA TERRITORIAL 5.0 — SINTAXEHUB APS
   Histórico longitudinal incorporado ao prontuário do paciente.

   Integra:
   - Cadastro do paciente
   - Atendimentos SOAP / CIAP / CIPE / Gordon / Cuida
   - Busca ativa
   - Agenda APS
   - Visitas domiciliares
   - Reuniões de equipe
   - Solicitações de materiais
   - Território Inteligente
   - Inteligência APS
   - Motor de Predição APS

   Compatível com IDs antigos:
   - linhaTempoCPF
   - linhaTempoCNS
   - conteudoLinhaTempoTerritorial
   - cabecalhoLinhaTempoTerritorial

   Novo container recomendado no prontuário:
   - linhaVidaTerritorialPaciente
   ========================================================== */

let linhaVidaTerritorialAtual = [];
let linhaTempoTerritorialAtual = [];

/* ==========================================================
   ABERTURA / USO DENTRO DO PRONTUÁRIO
   ========================================================== */

function abrirLinhaTempoTerritorial(cpf = "", cns = "") {
    /*
       Versão 5.0:
       Não navega mais para tela separada.
       A Linha da Vida passa a ser parte do prontuário ativo.
    */

    const cpfFinal =
        limparDocumentoLinhaTempo(
            cpf ||
            document.getElementById("cpfPaciente")?.value ||
            window.pacienteAtual?.cpf ||
            window.pacienteSelecionado?.cpf ||
            ""
        );

    const cnsFinal =
        String(
            cns ||
            document.getElementById("cnsPaciente")?.value ||
            window.pacienteAtual?.cns ||
            window.pacienteSelecionado?.cns ||
            ""
        ).trim();

    return carregarLinhaVidaTerritorialPaciente(
        cpfFinal,
        cnsFinal
    );
}

async function carregarLinhaVidaTerritorialPaciente(
    cpfParam = "",
    cnsParam = ""
) {
    const container =
        obterContainerLinhaVidaTerritorial();

    if (!container) {
        console.warn("Linha da Vida Territorial: container não encontrado.");
        return [];
    }

    container.innerHTML =
        `<p style="color:var(--text-muted);">
            🧬 Carregando Linha da Vida Territorial...
        </p>`;

    if (typeof supabaseClient === "undefined") {
        container.innerHTML =
            `<p style="color:var(--danger);">
                Supabase não carregado.
            </p>`;
        return [];
    }

    try {
        const cpf =
            limparDocumentoLinhaTempo(
                cpfParam ||
                document.getElementById("cpfPaciente")?.value ||
                window.pacienteAtual?.cpf ||
                window.pacienteSelecionado?.cpf ||
                ""
            );

        const cns =
            String(
                cnsParam ||
                document.getElementById("cnsPaciente")?.value ||
                window.pacienteAtual?.cns ||
                window.pacienteSelecionado?.cns ||
                ""
            ).trim();

        if (!cpf && !cns) {
            container.innerHTML =
                `<p style="color:var(--text-muted);">
                    Informe ou abra um paciente para visualizar a Linha da Vida Territorial.
                </p>`;
            return [];
        }

        const paciente =
            await buscarPacienteLinhaTempo(
                cpf,
                cns,
                ""
            );

        if (!paciente) {
            container.innerHTML =
                `<p style="color:var(--text-muted);">
                    Paciente não localizado para Linha da Vida.
                </p>`;
            return [];
        }

        const cpfFinal =
            limparDocumentoLinhaTempo(
                paciente.cpf || cpf || ""
            );

        const cnsFinal =
            paciente.cns || cns || "";

        const [
            atendimentos,
            interacoes,
            agenda,
            visitas,
            reunioes,
            materiais,
            territorio,
            inteligencia,
            predicoes
        ] = await Promise.all([
            buscarRegistrosLinhaTempo(
                "atendimentos",
                cpfFinal,
                cnsFinal,
                500
            ),

            buscarRegistrosLinhaTempo(
                "interacoes_busca_ativa",
                cpfFinal,
                cnsFinal,
                300
            ),

            buscarRegistrosLinhaTempo(
                "agenda_aps",
                cpfFinal,
                cnsFinal,
                300
            ),

            buscarRegistrosLinhaTempo(
                "visitas_domiciliares",
                cpfFinal,
                cnsFinal,
                300
            ),

            buscarRegistrosLinhaTempo(
                "reunioes",
                cpfFinal,
                cnsFinal,
                300
            ),

            buscarRegistrosLinhaTempo(
                "solicitacoes_materiais",
                cpfFinal,
                cnsFinal,
                300
            ),

            buscarTerritorioInteligenteLinhaTempo(
                cpfFinal,
                cnsFinal
            ),

            buscarInteligenciaLinhaVidaTerritorial(
                cpfFinal,
                cnsFinal
            ),

            buscarPredicaoLinhaVidaTerritorial(
                cpfFinal,
                cnsFinal
            )
        ]);

        linhaVidaTerritorialAtual =
            montarEventosLinhaVidaTerritorial(
                paciente,
                {
                    atendimentos,
                    interacoes,
                    agenda,
                    visitas,
                    reunioes,
                    materiais,
                    territorio,
                    inteligencia,
                    predicoes
                }
            );

        linhaTempoTerritorialAtual =
            linhaVidaTerritorialAtual;

        renderizarLinhaVidaTerritorialPaciente(
            paciente,
            linhaVidaTerritorialAtual,
            territorio
        );

        return linhaVidaTerritorialAtual;

    } catch (erro) {
        console.error("Erro ao carregar Linha da Vida Territorial:", erro);

        container.innerHTML =
            `<p style="color:var(--danger);">
                Erro ao carregar Linha da Vida Territorial.
            </p>`;

        return [];
    }
}

/* ==========================================================
   COMPATIBILIDADE COM TELA ANTIGA
   ========================================================== */

async function carregarLinhaTempoTerritorialAPS(
    cpfParam = "",
    cnsParam = ""
) {
    /*
       Mantém compatibilidade com chamadas antigas.
       Se existir a tela antiga, renderiza nela.
       Se não existir, renderiza no prontuário.
    */

    const campoBusca =
        document.getElementById("buscaLinhaTempoTerritorial")?.value || "";

    const cpf =
        limparDocumentoLinhaTempo(
            cpfParam ||
            document.getElementById("linhaTempoCPF")?.value ||
            campoBusca ||
            document.getElementById("cpfPaciente")?.value ||
            ""
        );

    const cns =
        String(
            cnsParam ||
            document.getElementById("linhaTempoCNS")?.value ||
            document.getElementById("cnsPaciente")?.value ||
            ""
        ).trim();

    return carregarLinhaVidaTerritorialPaciente(
        cpf,
        cns
    );
}

/* ==========================================================
   BUSCAS SUPABASE
   ========================================================== */

async function buscarPacienteLinhaTempo(
    cpf = "",
    cns = "",
    nome = ""
) {
    let query =
        supabaseClient
            .from("pacientes")
            .select("*")
            .limit(1);

    if (cpf && cns) {
        query =
            query.or(
                `cpf.eq.${cpf},cns.eq.${cns}`
            );
    } else if (cpf) {
        query =
            query.eq(
                "cpf",
                cpf
            );
    } else if (cns) {
        query =
            query.eq(
                "cns",
                cns
            );
    } else if (nome) {
        query =
            query.ilike(
                "nome",
                `%${nome}%`
            );
    } else {
        return null;
    }

    const {
        data,
        error
    } = await query;

    if (error) {
        console.error("Erro ao buscar paciente na Linha da Vida:", error);
        return null;
    }

    return data?.[0] || null;
}

async function buscarRegistrosLinhaTempo(
    tabela,
    cpf,
    cns,
    limite = 300
) {
    try {
        const filtros = [];

        if (cpf) {
            filtros.push(`cpf.eq.${cpf}`);
            filtros.push(`paciente_cpf.eq.${cpf}`);
        }

        if (cns) {
            filtros.push(`cns.eq.${cns}`);
            filtros.push(`paciente_cns.eq.${cns}`);
        }

        if (!filtros.length) {
            return [];
        }

        const {
            data,
            error
        } = await supabaseClient
            .from(tabela)
            .select("*")
            .or(filtros.join(","))
            .limit(limite);

        if (error) {
            console.warn(
                `Linha da Vida: tabela opcional não carregada (${tabela}):`,
                error.message
            );
            return [];
        }

        return data || [];

    } catch (erro) {
        console.warn(
            `Linha da Vida: falha opcional ao buscar ${tabela}:`,
            erro
        );

        return [];
    }
}

async function buscarTerritorioInteligenteLinhaTempo(
    cpf,
    cns
) {
    try {
        let query =
            supabaseClient
                .from("territorio_inteligente")
                .select("*")
                .limit(1);

        if (cpf && cns) {
            query =
                query.or(
                    `cpf.eq.${cpf},cns.eq.${cns}`
                );
        } else if (cpf) {
            query =
                query.eq(
                    "cpf",
                    cpf
                );
        } else if (cns) {
            query =
                query.eq(
                    "cns",
                    cns
                );
        } else {
            return null;
        }

        const {
            data,
            error
        } = await query;

        if (error) {
            console.warn(
                "Linha da Vida: território inteligente não carregado:",
                error.message
            );
            return null;
        }

        return data?.[0] || null;

    } catch (erro) {
        console.warn(
            "Linha da Vida: erro ao buscar Território Inteligente:",
            erro
        );
        return null;
    }
}

async function buscarInteligenciaLinhaVidaTerritorial(cpf, cns) {
    try {
        const termos = [];

        if (cpf) {
            termos.push(`referencia_id.eq.${cpf}`);
            termos.push(`referencia_id.eq.PACIENTE:${cpf}`);
        }

        if (cns) {
            termos.push(`referencia_id.eq.${cns}`);
            termos.push(`referencia_id.eq.PACIENTE:${cns}`);
        }

        if (!termos.length) return [];

        const { data, error } =
            await supabaseClient
                .from("inteligencia_aps")
                .select("*")
                .or(termos.join(","))
                .order("created_at", {
                    ascending: false,
                    nullsFirst: false
                })
                .limit(100);

        if (error) {
            console.warn("Linha da Vida: inteligencia_aps não carregada:", error.message);
            return [];
        }

        return data || [];

    } catch (erro) {
        console.warn("Linha da Vida: erro opcional em inteligencia_aps:", erro);
        return [];
    }
}

async function buscarPredicaoLinhaVidaTerritorial(cpf, cns) {
    const predicoes =
        window.motorPredicaoAPSAtual?.predicoes || [];

    if (!predicoes.length) {
        return [];
    }

    const cpfLimpo =
        limparDocumentoLinhaTempo(cpf || "");

    return predicoes.filter(p =>
        limparDocumentoLinhaTempo(p.cpf || p.paciente?.cpf || "") === cpfLimpo ||
        String(p.cns || p.paciente?.cns || "") === String(cns || "")
    );
}

/* ==========================================================
   MONTAGEM DOS EVENTOS
   ========================================================== */

function montarEventosLinhaVidaTerritorial(
    paciente,
    fontes = {}
) {
    const eventos = [];

    const {
        atendimentos = [],
        interacoes = [],
        agenda = [],
        visitas = [],
        reunioes = [],
        materiais = [],
        territorio = null,
        inteligencia = [],
        predicoes = []
    } = fontes;

    if (paciente) {
        eventos.push({
            data:
                paciente.created_at ||
                paciente.criado_em ||
                paciente.data_cadastro ||
                new Date().toISOString(),

            tipo:
                "👥 Cadastro",

            tipoFiltro:
                "CADASTRO",

            titulo:
                "Cadastro territorial",

            resumo:
                `${paciente.nome || "Paciente"} inserido na base territorial.`,

            detalhes:
                [
                    paciente.cpf ? `CPF: ${formatarCPFLinhaTempo(paciente.cpf)}` : "",
                    paciente.cns ? `CNS: ${paciente.cns}` : "",
                    paciente.ubs_vinculacao || paciente.ubs ? `UBS: ${paciente.ubs_vinculacao || paciente.ubs}` : "",
                    paciente.equipe_esf || paciente.equipe ? `Equipe: ${paciente.equipe_esf || paciente.equipe}` : ""
                ].filter(Boolean),

            origem:
                "pacientes"
        });
    }

    atendimentos.forEach(a => {
        const gordon =
            a.anamnese_gordon || {};

        const detalhesGordon =
            Object
                .entries(gordon || {})
                .filter(([, valor]) => valor)
                .map(([chave, valor]) =>
                    `${formatarChaveLinhaVida(chave)}: ${valor}`
                );

        eventos.push({
            data:
                a.data_atendimento ||
                a.criado_em ||
                a.created_at,

            tipo:
                "🩺 Atendimento",

            tipoFiltro:
                "ATENDIMENTO",

            titulo:
                a.inputBuscaCIAPS ||
                a.ciap ||
                a.inputBuscaCIPE ||
                "SOAP",

            resumo:
                a.soapSubjetivo ||
                a.subjetivo ||
                "Atendimento registrado.",

            detalhes:
                [
                    a.inputBuscaCIAPS ? `CIAP-2: ${a.inputBuscaCIAPS}` : "",
                    a.inputBuscaCIPE ? `CIPE: ${a.inputBuscaCIPE}` : "",
                    a.sintoma_intensidade ? `Intensidade: ${a.sintoma_intensidade}` : "",
                    a.sintoma_frequencia ? `Frequência: ${a.sintoma_frequencia}` : "",
                    a.historico_saude ? `Histórico de saúde: ${a.historico_saude}` : "",
                    a.medicamentos_uso ? `Medicamentos: ${a.medicamentos_uso}` : "",
                    a.habitos_sociais ? `Hábitos sociais: ${a.habitos_sociais}` : "",
                    a.eventos_clinicos ? `Eventos clínicos: ${a.eventos_clinicos}` : "",
                    a.historico_cirurgico ? `Histórico cirúrgico: ${a.historico_cirurgico}` : "",
                    a.gestacoes_anteriores ? `Gestações anteriores: ${a.gestacoes_anteriores}` : "",
                    a.soapObjetivoAlterado || a.objetivo ? `Objetivo: ${a.soapObjetivoAlterado || a.objetivo}` : "",
                    a.soapPlanoConduta || a.plano ? `Plano: ${a.soapPlanoConduta || a.plano}` : "",
                    a.reavaliacaoDias !== null && a.reavaliacaoDias !== undefined ? `Reavaliação: ${a.reavaliacaoDias} dia(s)` : "",
                    a.risco_global ? `Risco: ${a.risco_global}` : "",
                    a.has === "Sim" || a.has === true ? "Linha: HAS" : "",
                    a.dm === "Sim" || a.dm === true ? "Linha: DM" : "",
                    a.gestante === "Sim" || a.gestante === true ? "Linha: Gestante" : "",
                    a.tb === "Sim" || a.tb === true ? "Linha: TB" : "",
                    a.hansen === "Sim" || a.hansen === true ? "Linha: Hanseníase" : "",
                    ...detalhesGordon.slice(0, 6)
                ].filter(Boolean),

            origem:
                "atendimentos"
        });
    });

    interacoes.forEach(i => {
        eventos.push({
            data:
                i.criado_em ||
                i.created_at ||
                i.data,

            tipo:
                "📞 Busca Ativa",

            tipoFiltro:
                "BUSCA_ATIVA",

            titulo:
                i.resultado ||
                i.status ||
                "Contato",

            resumo:
                i.observacao ||
                i.descricao ||
                "Interação de busca ativa registrada.",

            detalhes:
                [
                    i.tipo_contato ? `Tipo: ${i.tipo_contato}` : "",
                    i.telefone ? `Telefone: ${i.telefone}` : "",
                    i.responsavel ? `Responsável: ${i.responsavel}` : "",
                    i.usuario_email ? `Profissional: ${i.usuario_email}` : ""
                ].filter(Boolean),

            origem:
                "interacoes_busca_ativa"
        });
    });

    agenda.forEach(a => {
        eventos.push({
            data:
                a.data_sugerida ||
                a.created_at,

            tipo:
                "🗓 Agenda APS",

            tipoFiltro:
                "AGENDA",

            titulo:
                String(a.tipo || "Agenda").replace(/_/g, " "),

            resumo:
                a.motivo ||
                "Item de agenda APS registrado.",

            detalhes:
                [
                    a.prioridade ? `Prioridade: ${a.prioridade}` : "",
                    a.origem ? `Origem: ${a.origem}` : "",
                    a.status ? `Status: ${a.status}` : ""
                ].filter(Boolean),

            origem:
                "agenda_aps"
        });
    });

    visitas.forEach(v => {
        eventos.push({
            data:
                v.data_visita ||
                v.criado_em ||
                v.created_at,

            tipo:
                "🏠 Visita Domiciliar",

            tipoFiltro:
                "VISITA",

            titulo:
                v.tipo_visita ||
                v.resultado ||
                "Visita domiciliar",

            resumo:
                v.observacoes ||
                v.conduta ||
                v.descricao ||
                "Visita domiciliar registrada.",

            detalhes:
                [
                    v.profissional ? `Profissional: ${v.profissional}` : "",
                    v.perfil_profissional ? `Perfil: ${v.perfil_profissional}` : "",
                    v.evfam_total ? `EVFAM: ${v.evfam_total}` : "",
                    v.renda_insuficiente ? "Renda insuficiente" : "",
                    v.inseguranca_alimentar ? "Insegurança alimentar" : "",
                    v.acamado ? "Acamado" : "",
                    v.restricao_mobilidade ? "Restrição de mobilidade" : "",
                    v.ausencia_cuidador ? "Ausência de cuidador" : ""
                ].filter(Boolean),

            origem:
                "visitas_domiciliares"
        });
    });

    reunioes.forEach(r => {
        eventos.push({
            data:
                r.criado_em ||
                r.created_at ||
                r.data,

            tipo:
                "👥 Reunião",

            tipoFiltro:
                "REUNIAO",

            titulo:
                "Discussão de caso",

            resumo:
                r.discussao ||
                r.resumo ||
                r.conduta ||
                "Caso discutido em reunião de equipe.",

            detalhes:
                [
                    r.conduta ? `Conduta: ${r.conduta}` : "",
                    r.responsavel ? `Responsável: ${r.responsavel}` : "",
                    r.equipe ? `Equipe: ${r.equipe}` : ""
                ].filter(Boolean),

            origem:
                "reunioes"
        });
    });

    materiais.forEach(m => {
        eventos.push({
            data:
                m.criado_em ||
                m.created_at ||
                m.data_solicitacao,

            tipo:
                "📦 Material",

            tipoFiltro:
                "MATERIAL",

            titulo:
                m.descricao_item ||
                m.item ||
                "Solicitação de material",

            resumo:
                m.status ||
                "Material registrado.",

            detalhes:
                [
                    m.quantidade ? `Quantidade: ${m.quantidade}` : "",
                    m.justificativa ? `Justificativa: ${m.justificativa}` : "",
                    m.status ? `Status: ${m.status}` : ""
                ].filter(Boolean),

            origem:
                "solicitacoes_materiais"
        });
    });

    if (territorio) {
        eventos.push({
            data:
                territorio.ultima_atualizacao ||
                territorio.created_at ||
                new Date().toISOString(),

            tipo:
                "🧠 IA Territorial",

            tipoFiltro:
                "IA",

            titulo:
                `Prioridade ${territorio.nivel_prioridade || territorio.prioridade || "-"}`,

            resumo:
                territorio.resumo_ia ||
                `Score territorial global: ${territorio.score_territorial_global || territorio.score_geral || 0}`,

            detalhes:
                [
                    `Score Territorial Global: ${territorio.score_territorial_global || territorio.score_geral || 0}`,
                    `Clínico: ${territorio.score_clinico || 0}`,
                    `Assistencial: ${territorio.score_assistencial || 0}`,
                    `Social: ${territorio.score_social || 0}`,
                    `Domiciliar: ${territorio.score_domiciliar || 0}`,
                    `EVFAM: ${territorio.evfam_total || 0}`,
                    territorio.classe_risco ? `Classe: ${territorio.classe_risco}` : "",
                    territorio.acao_recomendada ? `Ação recomendada: ${territorio.acao_recomendada}` : "",
                    territorio.recomendacao_ia ? `Recomendação IA: ${territorio.recomendacao_ia}` : ""
                ].filter(Boolean),

            origem:
                "territorio_inteligente"
        });
    }

    inteligencia.forEach(i => {
        eventos.push({
            data:
                i.created_at ||
                new Date().toISOString(),

            tipo:
                "🧠 Inteligência APS",

            tipoFiltro:
                "IA",

            titulo:
                i.tipo ||
                "Análise cognitiva",

            resumo:
                i.resposta ||
                i.pergunta ||
                "Registro cognitivo APS.",

            detalhes:
                [
                    i.escopo ? `Escopo: ${i.escopo}` : "",
                    i.confianca !== null && i.confianca !== undefined ? `Confiança: ${i.confianca}` : "",
                    i.origem ? `Origem: ${i.origem}` : ""
                ].filter(Boolean),

            origem:
                "inteligencia_aps"
        });
    });

    predicoes.forEach(p => {
        eventos.push({
            data:
                new Date().toISOString(),

            tipo:
                "🔮 Predição APS",

            tipoFiltro:
                "PREDICAO",

            titulo:
                `Risco preditivo ${p.prioridade || ""}`,

            resumo:
                `Score preditivo geral: ${p.scoreGeral || 0}%.`,

            detalhes:
                [
                    p.abandono ? `Abandono: ${p.abandono.probabilidade}%` : "",
                    p.descompensacao ? `Descompensação: ${p.descompensacao.probabilidade}%` : "",
                    p.internacao ? `Internação: ${p.internacao.probabilidade}%` : "",
                    p.evasaoGestante ? `Evasão pré-natal: ${p.evasaoGestante.probabilidade}%` : "",
                    p.falhaSeguimento ? `Falha de seguimento: ${p.falhaSeguimento.probabilidade}%` : "",
                    p.fatores?.length ? `Fatores: ${[...new Set(p.fatores)].slice(0, 5).join(", ")}` : ""
                ].filter(Boolean),

            origem:
                "motor_predicao_aps"
        });
    });

    return eventos
        .filter(e => e.data)
        .sort(
            (a, b) =>
                new Date(b.data) -
                new Date(a.data)
        );
}

/* ==========================================================
   RENDERIZAÇÃO
   ========================================================== */

function renderizarLinhaVidaTerritorialPaciente(
    paciente,
    eventos,
    territorio = null
) {
    const container =
        obterContainerLinhaVidaTerritorial();

    if (!container) return;

    const filtroId =
        "filtroLinhaVidaTerritorialPaciente";

    if (!eventos.length) {
        container.innerHTML =
            `<p style="color:var(--text-muted);">
                Nenhum evento longitudinal encontrado para este paciente.
            </p>`;

        return;
    }

    const filtro =
        document.getElementById(filtroId)?.value ||
        "TODOS";

    const eventosFiltrados =
        filtro === "TODOS"
            ? eventos
            : eventos.filter(e => e.tipoFiltro === filtro);

    container.innerHTML =
        `
        <div class="form-section" style="border-left:5px solid var(--primary);">
            <div class="section-header">
                <div>
                    <h3 style="margin:0;">🧬 Linha da Vida Territorial</h3>
                    <p style="color:var(--text-muted); margin:6px 0 0 0;">
                        Histórico longitudinal integrado do cidadão na APS.
                    </p>
                </div>

                <div class="button-row">
                    <select
                        id="${filtroId}"
                        onchange="renderizarLinhaVidaTerritorialPaciente(window.pacienteSelecionado || window.pacienteAtual || {}, linhaVidaTerritorialAtual, window.territorioAtualLinhaVida || null)"
                        style="max-width:220px;"
                    >
                        ${optionLinhaVida("TODOS", "Todos", filtro)}
                        ${optionLinhaVida("ATENDIMENTO", "Atendimentos", filtro)}
                        ${optionLinhaVida("VISITA", "Visitas", filtro)}
                        ${optionLinhaVida("AGENDA", "Agenda", filtro)}
                        ${optionLinhaVida("BUSCA_ATIVA", "Busca ativa", filtro)}
                        ${optionLinhaVida("IA", "IA / Território", filtro)}
                        ${optionLinhaVida("PREDICAO", "Predição", filtro)}
                        ${optionLinhaVida("MATERIAL", "Materiais", filtro)}
                        ${optionLinhaVida("REUNIAO", "Reuniões", filtro)}
                    </select>

                    <button
                        type="button"
                        class="btn-secondary"
                        onclick="exportarLinhaTempoTerritorialCSV()">
                        📤 Exportar
                    </button>

                    <button
                        type="button"
                        class="btn-primary"
                        onclick="abrirLinhaTempoTerritorial()">
                        🔄 Atualizar
                    </button>
                </div>
            </div>

            ${renderizarResumoPacienteLinhaVida(paciente, territorio)}

            ${
                eventosFiltrados.length
                    ? renderizarEventosLinhaVidaTerritorial(eventosFiltrados)
                    : `<p style="color:var(--text-muted);">Nenhum evento encontrado para este filtro.</p>`
            }
        </div>
        `;

    window.territorioAtualLinhaVida =
        territorio || null;
}

function renderizarResumoPacienteLinhaVida(paciente, territorio) {
    return `
        <div style="
            display:grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap:10px;
            margin:14px 0;
        ">
            <div class="dash-card">
                <div>
                    <span class="card-label">Paciente</span>
                    <h3 style="font-size:1rem;">${escaparLinhaTempo(paciente.nome || "Paciente")}</h3>
                    <p>CPF: ${formatarCPFLinhaTempo(paciente.cpf || "-")}</p>
                </div>
            </div>

            <div class="dash-card">
                <div>
                    <span class="card-label">Equipe</span>
                    <h3 style="font-size:1rem;">${escaparLinhaTempo(paciente.equipe_esf || paciente.equipe || "-")}</h3>
                    <p>${escaparLinhaTempo(paciente.ubs_vinculacao || paciente.ubs || "-")}</p>
                </div>
            </div>

            <div class="dash-card">
                <div>
                    <span class="card-label">Score Territorial</span>
                    <h3>${territorio?.score_territorial_global || territorio?.score_geral || 0}</h3>
                    <p>${escaparLinhaTempo(territorio?.nivel_prioridade || territorio?.prioridade || "Sem score")}</p>
                </div>
            </div>

            <div class="dash-card">
                <div>
                    <span class="card-label">Eventos</span>
                    <h3>${linhaVidaTerritorialAtual.length}</h3>
                    <p>Registros longitudinais</p>
                </div>
            </div>
        </div>

        ${
            territorio
                ? `<div class="alert-card" style="margin-bottom:12px;">
                    <strong>🧠 Resumo IA Territorial:</strong>
                    ${escaparLinhaTempo(territorio.resumo_ia || territorio.acao_recomendada || "-")}
                </div>`
                : ""
        }
    `;
}

function renderizarEventosLinhaVidaTerritorial(eventos) {
    return `
        <div class="timeline">
            ${eventos.map(evento => `
                <div class="timeline-item">
                    <div class="timeline-body" style="border-left:4px solid var(--primary);">
                        <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
                            <div>
                                <strong>${escaparLinhaTempo(evento.tipo)} — ${escaparLinhaTempo(evento.titulo || "")}</strong>
                                <br>
                                <small style="color:var(--text-muted);">
                                    ${formatarDataLinhaTempo(evento.data)}
                                </small>
                            </div>

                            <span class="status-badge status-info">
                                ${escaparLinhaTempo(evento.origem)}
                            </span>
                        </div>

                        <p style="margin:10px 0;">
                            ${escaparLinhaTempo(evento.resumo || "")}
                        </p>

                        ${
                            evento.detalhes?.length
                                ? `<div style="display:flex; flex-direction:column; gap:4px;">
                                    ${evento.detalhes.slice(0, 12).map(d =>
                                        `<small style="color:var(--text-muted);">${escaparLinhaTempo(d)}</small>`
                                    ).join("")}
                                </div>`
                                : ""
                        }
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

/* Compatibilidade com nome antigo */
function renderizarLinhaTempoTerritorial(
    paciente,
    eventos,
    territorio = null
) {
    return renderizarLinhaVidaTerritorialPaciente(
        paciente,
        eventos,
        territorio
    );
}

/* ==========================================================
   EXPORTAÇÃO
   ========================================================== */

function exportarLinhaTempoTerritorialCSV() {
    const eventos =
        linhaVidaTerritorialAtual.length
            ? linhaVidaTerritorialAtual
            : linhaTempoTerritorialAtual;

    if (!eventos.length) {
        mostrarToast?.("Nenhum evento para exportar.");
        return;
    }

    const linhas = [
        [
            "data",
            "tipo",
            "titulo",
            "resumo",
            "origem",
            "detalhes"
        ]
    ];

    eventos.forEach(e => {
        linhas.push([
            formatarDataLinhaTempo(e.data),
            e.tipo,
            e.titulo,
            e.resumo,
            e.origem,
            (e.detalhes || []).join(" | ")
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
        `linha_vida_territorial_${new Date().toISOString().slice(0, 10)}.csv`;

    a.click();

    URL.revokeObjectURL(url);
}

/* ==========================================================
   HELPERS
   ========================================================== */

function obterContainerLinhaVidaTerritorial() {
    return (
        document.getElementById("linhaVidaTerritorialPaciente") ||
        document.getElementById("conteudoLinhaTempoTerritorial") ||
        document.getElementById("linhaTempoEvolucoes")
    );
}

function optionLinhaVida(valor, label, atual) {
    return `
        <option value="${valor}" ${valor === atual ? "selected" : ""}>
            ${label}
        </option>
    `;
}

function limparDocumentoLinhaTempo(valor) {
    return String(valor || "")
        .replace(/\D/g, "");
}

function formatarCPFLinhaTempo(valor) {
    const cpf =
        limparDocumentoLinhaTempo(valor);

    if (cpf.length !== 11) {
        return valor || "-";
    }

    return cpf.replace(
        /(\d{3})(\d{3})(\d{3})(\d{2})/,
        "$1.$2.$3-$4"
    );
}

function formatarDataLinhaTempo(valor) {
    if (!valor) return "-";

    const data =
        new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return "-";
    }

    return data.toLocaleString("pt-BR");
}

function formatarChaveLinhaVida(chave) {
    return String(chave || "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, letra => letra.toUpperCase());
}

function escaparLinhaTempo(valor) {
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

window.abrirLinhaTempoTerritorial = abrirLinhaTempoTerritorial;
window.carregarLinhaTempoTerritorialAPS = carregarLinhaTempoTerritorialAPS;
window.carregarLinhaVidaTerritorialPaciente = carregarLinhaVidaTerritorialPaciente;
window.montarEventosLinhaVidaTerritorial = montarEventosLinhaVidaTerritorial;
window.renderizarLinhaVidaTerritorialPaciente = renderizarLinhaVidaTerritorialPaciente;
window.renderizarLinhaTempoTerritorial = renderizarLinhaTempoTerritorial;
window.exportarLinhaTempoTerritorialCSV = exportarLinhaTempoTerritorialCSV;
window.linhaVidaTerritorialAtual = linhaVidaTerritorialAtual;

/* Alias para compatibilidade com módulos novos/antigos */
window.carregarLinhaTempoTerritorialIntegrada = carregarLinhaVidaTerritorialPaciente;

console.log("✅ Linha da Vida Territorial 5.0 carregada no prontuário.");
