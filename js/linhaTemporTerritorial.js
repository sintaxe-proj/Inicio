/* ==========================================================
   🧬 LINHA DO TEMPO TERRITORIAL 4.0 — SINTAXEHUB
   Integra:
   - Cadastro do paciente
   - Atendimentos SOAP
   - Busca ativa
   - Reuniões
   - Solicitações de materiais
   - Território Inteligente
   Compatível com IDs antigos:
   - linhaTempoCPF
   - linhaTempoCNS
   - conteudoLinhaTempoTerritorial
   ========================================================== */

let linhaTempoTerritorialAtual = [];

/* ==========================================================
   ABERTURA PELO BOTÃO DO PACIENTE
   ========================================================== */

function abrirLinhaTempoTerritorial(cpf = "", cns = "") {

    if (typeof navigate === "function") {
        navigate("linha-tempo-territorial");
    }

    setTimeout(() => {

        const campoCPF =
            document.getElementById("linhaTempoCPF");

        const campoCNS =
            document.getElementById("linhaTempoCNS");

        const campoBusca =
            document.getElementById("buscaLinhaTempoTerritorial");

        if (campoCPF) {
            campoCPF.value =
                cpf || "";
        }

        if (campoCNS) {
            campoCNS.value =
                cns || "";
        }

        if (campoBusca) {
            campoBusca.value =
                cpf || cns || "";
        }

        carregarLinhaTempoTerritorialAPS(
            cpf,
            cns
        );

    }, 250);
}

/* ==========================================================
   CARREGAMENTO PRINCIPAL
   ========================================================== */

async function carregarLinhaTempoTerritorialAPS(
    cpfParam = "",
    cnsParam = ""
) {

    const container =
        document.getElementById("conteudoLinhaTempoTerritorial");

    if (!container) return;

    container.innerHTML =
        `<p style="color:var(--text-muted);">
            Consultando histórico territorial...
        </p>`;

    if (typeof supabaseClient === "undefined") {
        container.innerHTML =
            `<p style="color:var(--danger);">
                Supabase não carregado.
            </p>`;
        return;
    }

    try {

        const buscaLivre =
            document.getElementById("buscaLinhaTempoTerritorial")?.value || "";

        const cpf =
            limparDocumentoLinhaTempo(
                cpfParam ||
                document.getElementById("linhaTempoCPF")?.value ||
                buscaLivre ||
                ""
            );

        const cns =
            (
                cnsParam ||
                document.getElementById("linhaTempoCNS")?.value ||
                ""
            ).trim();

        const termoNome =
            !cpf && !cns
                ? buscaLivre.trim()
                : "";

        const paciente =
            await buscarPacienteLinhaTempo(
                cpf,
                cns,
                termoNome
            );

        if (!paciente) {
            container.innerHTML =
                `<p style="color:var(--text-muted);">
                    Paciente não localizado.
                </p>`;
            return;
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
            reunioes,
            materiais,
            territorio
        ] = await Promise.all([

            buscarRegistrosLinhaTempo(
                "atendimentos",
                cpfFinal,
                cnsFinal
            ),

            buscarRegistrosLinhaTempo(
                "interacoes_busca_ativa",
                cpfFinal,
                cnsFinal
            ),

            buscarRegistrosLinhaTempo(
                "reunioes",
                cpfFinal,
                cnsFinal
            ),

            buscarRegistrosLinhaTempo(
                "solicitacoes_materiais",
                cpfFinal,
                cnsFinal
            ),

            buscarTerritorioInteligenteLinhaTempo(
                cpfFinal,
                cnsFinal
            )

        ]);

        linhaTempoTerritorialAtual =
            montarEventosLinhaTempoTerritorial(
                paciente,
                atendimentos,
                interacoes,
                reunioes,
                materiais,
                territorio
            );

        renderizarLinhaTempoTerritorial(
            paciente,
            linhaTempoTerritorialAtual,
            territorio
        );

    } catch (erro) {

        console.error("Erro ao carregar linha do tempo:", erro);

        container.innerHTML =
            `<p style="color:var(--danger);">
                Erro ao carregar linha do tempo.
            </p>`;
    }
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

        console.error("Erro ao buscar paciente:", error);

        return null;
    }

    return data?.[0] || null;
}

async function buscarRegistrosLinhaTempo(
    tabela,
    cpf,
    cns
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
            .limit(300);

        if (error) {
            console.warn(
                `Tabela ${tabela} não carregada na linha do tempo:`,
                error.message
            );
            return [];
        }

        return data || [];

    } catch (erro) {

        console.warn(
            `Erro opcional ao buscar ${tabela}:`,
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
                "Território Inteligente não encontrado:",
                error.message
            );
            return null;
        }

        return data?.[0] || null;

    } catch (erro) {
        console.warn(
            "Erro ao buscar Território Inteligente:",
            erro
        );
        return null;
    }
}

/* ==========================================================
   MONTAGEM DOS EVENTOS
   ========================================================== */

function montarEventosLinhaTempoTerritorial(
    paciente,
    atendimentos = [],
    interacoes = [],
    reunioes = [],
    materiais = [],
    territorio = null
) {

    const eventos = [];

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
                a.ciapSelecionado ||
                a.ciap ||
                "SOAP",

            resumo:
                a.soapSubjetivo ||
                a.subjetivo ||
                "Atendimento registrado.",

            detalhes:
                [
                    a.soapObjetivoAlterado || a.objetivo ? `Objetivo: ${a.soapObjetivoAlterado || a.objetivo}` : "",
                    a.soapPlanoConduta || a.plano ? `Plano: ${a.soapPlanoConduta || a.plano}` : "",
                    a.reavaliacaoDias !== null && a.reavaliacaoDias !== undefined ? `Reavaliação: ${a.reavaliacaoDias} dia(s)` : "",
                    a.risco_global ? `Risco: ${a.risco_global}` : "",
                    a.has === "Sim" || a.has === true ? "Linha: HAS" : "",
                    a.dm === "Sim" || a.dm === true ? "Linha: DM" : "",
                    a.gestante === "Sim" || a.gestante === true ? "Linha: Gestante" : "",
                    a.tb === "Sim" || a.tb === true ? "Linha: TB" : "",
                    a.hansen === "Sim" || a.hansen === true ? "Linha: Hanseníase" : ""
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
                    i.responsavel ? `Responsável: ${i.responsavel}` : ""
                ].filter(Boolean),

            origem:
                "interacoes_busca_ativa"

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
                `Prioridade ${territorio.prioridade || "-"}`,

            resumo:
                territorio.resumo_ia ||
                `Score territorial: ${territorio.score_geral || 0}`,

            detalhes:
                [
                    `Score geral: ${territorio.score_geral || 0}`,
                    `Abandono: ${territorio.score_abandono || 0}`,
                    `Internação: ${territorio.score_internacao || 0}`,
                    `Descompensação: ${territorio.score_descompensacao || 0}`,
                    territorio.classe_risco ? `Classe: ${territorio.classe_risco}` : "",
                    territorio.recomendacao_ia ? `Recomendação: ${territorio.recomendacao_ia}` : ""
                ].filter(Boolean),

            origem:
                "territorio_inteligente"

        });
    }

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

function renderizarLinhaTempoTerritorial(
    paciente,
    eventos,
    territorio = null
) {

    const container =
        document.getElementById(
            "conteudoLinhaTempoTerritorial"
        );

    const cabecalho =
        document.getElementById(
            "cabecalhoLinhaTempoTerritorial"
        );

    if (!container) return;

    if (cabecalho && paciente) {

        cabecalho.innerHTML =
            `
            <div class="form-section" style="border-left:5px solid var(--primary);">
                <div class="section-header">
                    <div>
                        <h3 style="margin:0;">
                            ${escaparLinhaTempo(paciente.nome || "Paciente")}
                        </h3>

                        <p style="color:var(--text-muted); margin:6px 0 0 0;">
                            CPF: ${formatarCPFLinhaTempo(paciente.cpf || "-")}
                            · CNS: ${escaparLinhaTempo(paciente.cns || "-")}
                            · Equipe: ${escaparLinhaTempo(paciente.equipe_esf || paciente.equipe || "-")}
                        </p>
                    </div>

                    <span class="status-badge ${
                        territorio?.prioridade === "Crítica"
                            ? "status-danger"
                            : territorio?.prioridade === "Alta"
                                ? "status-warning"
                                : "status-info"
                    }">
                        ${escaparLinhaTempo(territorio?.prioridade || "Sem score")}
                    </span>
                </div>

                ${
                    territorio
                        ? `<p style="margin-bottom:0;">
                            <strong>Resumo IA:</strong>
                            ${escaparLinhaTempo(territorio.resumo_ia || "-")}
                        </p>`
                        : `<p style="color:var(--text-muted); margin-bottom:0;">
                            Território Inteligente ainda não calculado para este paciente.
                        </p>`
                }
            </div>
            `;
    }

    if (!eventos.length) {

        container.innerHTML =
            `<p style="color:var(--text-muted);">
                Nenhum evento encontrado.
            </p>`;

        return;
    }

    const filtro =
        document.getElementById("filtroTipoEventoLinhaTempo")?.value ||
        "TODOS";

    const eventosFiltrados =
        filtro === "TODOS"
            ? eventos
            : eventos.filter(e => e.tipoFiltro === filtro);

    if (!eventosFiltrados.length) {
        container.innerHTML =
            `<p style="color:var(--text-muted);">
                Nenhum evento encontrado para este filtro.
            </p>`;
        return;
    }

    container.innerHTML =
        `
        <div class="timeline">
            ${eventosFiltrados.map(evento => `
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
                                    ${evento.detalhes.slice(0, 8).map(d =>
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

/* ==========================================================
   EXPORTAÇÃO
   ========================================================== */

function exportarLinhaTempoTerritorialCSV() {

    if (!linhaTempoTerritorialAtual.length) {
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

    linhaTempoTerritorialAtual.forEach(e => {

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
        `linha_tempo_territorial_${new Date().toISOString().slice(0, 10)}.csv`;

    a.click();

    URL.revokeObjectURL(url);
}

/* ==========================================================
   HELPERS
   ========================================================== */

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
window.renderizarLinhaTempoTerritorial = renderizarLinhaTempoTerritorial;
window.exportarLinhaTempoTerritorialCSV = exportarLinhaTempoTerritorialCSV;

/* Alias para compatibilidade com módulos novos */
window.carregarLinhaTempoTerritorialIntegrada = carregarLinhaTempoTerritorialAPS;
