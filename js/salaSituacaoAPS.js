/* ==========================================================
   🏢 SALA DE SITUAÇÃO APS — SINTAXEHUB
   Centro de Inteligência Territorial da Atenção Primária
   Supabase-first: sem IndexedDB, sem localStorage, sem cache persistente.
   ========================================================== */

let salaSituacaoAPSAtual = {
    pacientes: [],
    atendimentos: [],
    interacoes: [],
    reunioes: [],
    reuniaoCasos: [],
    estoque: [],
    solicitacoes: [],
    base: [],
    dados: null
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
        `<p style="color:var(--text-muted);">Carregando Sala de Situação APS...</p>`;

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
            solicitacoes
        ] = await Promise.all([
            buscarTabelaSalaAPS("pacientes", "*", null, 15000),
            buscarTabelaSalaAPS("atendimentos", "*", filtros, 40000, "data_atendimento"),
            buscarTabelaSalaAPS("interacoes_busca_ativa", "*", filtros, 30000, "criado_em"),
            buscarTabelaSalaAPS("reunioes", "*", filtros, 3000, "criado_em"),
            buscarTabelaSalaAPS("reuniao_casos", "*", filtros, 15000, "created_at"),
            buscarTabelaSalaAPS("estoque_itens", "*", null, 15000),
            buscarTabelaSalaAPS("solicitacoes_materiais", "*", filtros, 15000, "criado_em")
        ]);

        const base =
            consolidarBaseSalaSituacaoAPS(
                pacientes,
                atendimentos
            );

        salaSituacaoAPSAtual = {
            pacientes,
            atendimentos,
            interacoes,
            reunioes,
            reuniaoCasos,
            estoque,
            solicitacoes,
            base,
            dados: null
        };

        carregarFiltrosSalaSituacaoAPS(base);
        renderizarSalaSituacaoAPS();

    } catch (erro) {
        console.error("Erro na Sala de Situação APS:", erro);

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
            console.warn(`Sala APS: tabela indisponível: ${tabela}`, error);
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
            document.getElementById("salaFiltroUBS")?.value || "TODAS"
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

        return true;
    });
}

/* ==========================================================
   CONSOLIDAÇÃO
   ========================================================== */

function consolidarBaseSalaSituacaoAPS(pacientes, atendimentos) {
    if (typeof consolidarBaseTorreAPS === "function") {
        return consolidarBaseTorreAPS(pacientes, atendimentos);
    }

    const mapa =
        new Map();

    (pacientes || []).forEach(p => {
        const chave =
            p.cpf ||
            p.cns ||
            p.id;

        if (!chave) return;

        mapa.set(chave, {
            id: p.id || "",
            nome: p.nome || "",
            cpf: limparDocumentoSalaAPS(p.cpf || ""),
            cns: p.cns || "",
            telefone: p.telefone || "",
            cep: limparCEPSalaAPS(p.cep || ""),
            bairro: p.bairro || "Bairro não informado",
            cidade: p.cidade || "",
            ubs: p.ubs_vinculacao || p.ubs || "Não informado",
            equipe: p.equipe_esf || p.equipe || "Não informado",

            has: "Não",
            dm: "Não",
            gestante: "Não",
            tb: "Não",
            hansen: "Não",

            risco_global: "Não informado",
            risco_pontos: 0,
            prazo: null,
            ultimo_atendimento: null,
            pendencias: [],
            predicao: { score: 0, classe: "Baixo risco preditivo", fatores: [] }
        });
    });

    (atendimentos || []).forEach(a => {
        const chave =
            a.paciente_cpf ||
            a.cpf ||
            a.cns;

        if (!chave) return;

        const atual =
            mapa.get(chave) || {
                id: "",
                nome: a.nome_paciente || "",
                cpf: limparDocumentoSalaAPS(a.paciente_cpf || a.cpf || ""),
                cns: a.cns || "",
                telefone: "",
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
                pendencias: [],
                predicao: { score: 0, classe: "Baixo risco preditivo", fatores: [] }
            };

        if (!atual.nome && a.nome_paciente) atual.nome = a.nome_paciente;

        if (valorSimSalaAPS(a.has)) atual.has = "Sim";
        if (valorSimSalaAPS(a.dm)) atual.dm = "Sim";
        if (valorSimSalaAPS(a.gestante)) atual.gestante = "Sim";
        if (valorSimSalaAPS(a.tb)) atual.tb = "Sim";
        if (valorSimSalaAPS(a.hansen)) atual.hansen = "Sim";

        atual.risco_global =
            a.risco_global ||
            atual.risco_global;

        if (a.risco_pontos !== null && a.risco_pontos !== undefined) {
            atual.risco_pontos =
                Number(a.risco_pontos || 0);
        }

        atual.prazo =
            a.reavaliacaoDias ??
            a.retorno_dias ??
            atual.prazo;

        atual.ultimo_atendimento =
            a.data_atendimento ||
            a.criado_em ||
            a.created_at ||
            atual.ultimo_atendimento;

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

/* ==========================================================
   RENDERIZAÇÃO
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
        ${renderizarFaixaStatusSalaAPS(dados)}

        ${renderizarIndicadoresExecutivosSalaAPS(dados)}

        ${renderizarGestaoRiscoSalaAPS(dados)}

        ${renderizarProducaoSalaAPS(dados)}

        ${renderizarInteligenciaTerritorialSalaAPS(dados)}

        ${renderizarRecomendacoesInteligentesSalaAPS(dados)}

        ${renderizarAgendaPrioritariaSalaAPS(dados)}
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

    const criticos =
        base.filter(p =>
            ehCriticoSalaAPS(p)
        );

    const moderados =
        base.filter(p =>
            !ehCriticoSalaAPS(p) &&
            Number(p.predicao?.score || 0) >= 6
        );

    const estaveis =
        base.filter(p =>
            !ehCriticoSalaAPS(p) &&
            Number(p.predicao?.score || 0) < 6
        );

    const pendencias =
        base.reduce(
            (total, p) =>
                total + (p.pendencias?.length || 0),
            0
        );

    const retornosVencidos =
        base.filter(p => Number(p.prazo) === 0).length;

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
        calcularEstoqueSalaAPS(
            estoque,
            solicitacoes
        );

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
            moderados,
            pendencias,
            retornosVencidos
        });

    const agenda =
        base
            .filter(p =>
                ehCriticoSalaAPS(p) ||
                Number(p.prazo) === 0 ||
                (p.pendencias?.length || 0) > 0
            )
            .sort((a, b) =>
                Number(b.predicao?.score || 0) -
                Number(a.predicao?.score || 0)
            )
            .slice(0, 20);

    return {
        filtros,
        base,
        atendimentos,
        interacoes,
        reuniaoCasos,
        solicitacoes,
        estoque,

        populacao: base.length,
        has: base.filter(p => valorSimSalaAPS(p.has)).length,
        dm: base.filter(p => valorSimSalaAPS(p.dm)).length,
        gestantes: base.filter(p => valorSimSalaAPS(p.gestante)).length,
        tb: base.filter(p => valorSimSalaAPS(p.tb)).length,
        hansen: base.filter(p => valorSimSalaAPS(p.hansen)).length,

        criticos,
        moderados,
        estaveis,
        pendencias,
        retornosVencidos,

        territorios,
        producao,
        estoqueAlertas,
        recomendacoes,
        agenda
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

/* ==========================================================
   BLOCOS VISUAIS
   ========================================================== */

function renderizarFaixaStatusSalaAPS(dados) {
    const taxaCriticos =
        dados.populacao > 0
            ? Number(((dados.criticos.length / dados.populacao) * 100).toFixed(1))
            : 0;

    let status = "🟢 Situação estável";
    let cor = "var(--success)";
    let texto = "Território em condição operacional habitual.";

    if (taxaCriticos >= 8 || dados.pendencias >= dados.populacao * 0.4) {
        status = "🔴 Situação crítica";
        cor = "var(--danger)";
        texto = "Alta concentração de risco e pendências. Recomenda-se ação coordenada imediata.";
    } else if (taxaCriticos >= 4 || dados.pendencias >= dados.populacao * 0.2) {
        status = "🟡 Situação de atenção";
        cor = "var(--warning)";
        texto = "Há concentração relevante de risco. Recomenda-se plano de ação por equipe.";
    }

    return `
        <div class="form-section" style="border-left:6px solid ${cor};">
            <h3 style="margin-top:0;">${status}</h3>
            <p style="color:var(--text-muted); margin-bottom:0;">
                ${texto}
            </p>
        </div>
    `;
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
                ${cardSalaAPS("❤️", `${dados.has} (${perc(dados.has)}%)`, "HAS", "icon-red")}
                ${cardSalaAPS("🍬", `${dados.dm} (${perc(dados.dm)}%)`, "DM", "icon-green")}
                ${cardSalaAPS("🤰", `${dados.gestantes} (${perc(dados.gestantes)}%)`, "Gestantes", "icon-yellow")}
                ${cardSalaAPS("🫁", dados.tb, "Tuberculose", "icon-purple")}
                ${cardSalaAPS("🖐️", dados.hansen, "Hanseníase", "icon-cyan")}
            </div>
        </div>
    `;
}

function renderizarGestaoRiscoSalaAPS(dados) {
    return `
        <div class="form-section">
            <h3 style="margin-top:0;">🚨 Gestão de Risco</h3>

            <div class="dashboard-grid">
                ${cardSalaAPS("🔴", dados.criticos.length, "Críticos / muito alto", "icon-red")}
                ${cardSalaAPS("🟡", dados.moderados.length, "Moderados", "icon-yellow")}
                ${cardSalaAPS("🟢", dados.estaveis.length, "Estáveis", "icon-green")}
                ${cardSalaAPS("⚠️", dados.pendencias, "Pendências clínicas", "icon-purple")}
                ${cardSalaAPS("📅", dados.retornosVencidos, "Retornos vencidos", "icon-red")}
                ${cardSalaAPS("🧠", dados.agenda.length, "Prioritários na agenda", "icon-cyan")}
            </div>
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

function renderizarInteligenciaTerritorialSalaAPS(dados) {
    return `
        <div class="form-section">
            <h3 style="margin-top:0;">🌎 Inteligência Territorial</h3>

            <h4>🔥 Top 10 territórios críticos</h4>
            ${renderizarTabelaTerritoriosSalaAPS(dados.territorios.territorios.slice(0, 10))}

            <h4>👥 Top equipes prioritárias</h4>
            ${renderizarTabelaTerritoriosSalaAPS(dados.territorios.equipes.slice(0, 8))}

            <h4>🏥 Top UBS prioritárias</h4>
            ${renderizarTabelaTerritoriosSalaAPS(dados.territorios.ubs.slice(0, 8))}
        </div>
    `;
}

function renderizarRecomendacoesInteligentesSalaAPS(dados) {
    return `
        <div class="form-section">
            <h3 style="margin-top:0;">🧠 Recomendações Inteligentes da Semana</h3>

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

function renderizarAgendaPrioritariaSalaAPS(dados) {
    if (!dados.agenda.length) {
        return `
            <div class="form-section">
                <h3 style="margin-top:0;">📋 Agenda Prioritária</h3>
                <p style="color:var(--text-muted);">Sem pacientes prioritários no filtro atual.</p>
            </div>
        `;
    }

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">📋 Agenda Prioritária da Equipe</h3>

            <table class="table-sintaxe">
                <thead>
                    <tr>
                        <th>Paciente</th>
                        <th>Equipe / UBS</th>
                        <th>Risco</th>
                        <th>Pendências</th>
                        <th>Ações</th>
                    </tr>
                </thead>

                <tbody>
                    ${dados.agenda.map(p => `
                        <tr>
                            <td>
                                <strong>${escaparSalaAPS(p.nome || "Sem nome")}</strong>
                                <small>CPF: ${escaparSalaAPS(p.cpf || "-")} | CNS: ${escaparSalaAPS(p.cns || "-")}</small>
                            </td>

                            <td>
                                ${escaparSalaAPS(p.equipe || "-")}
                                <small>${escaparSalaAPS(p.ubs || "-")}</small>
                            </td>

                            <td>
                                <strong>${Number(p.predicao?.score || 0)}</strong>
                                <small>${escaparSalaAPS(p.predicao?.classe || p.risco_global || "-")}</small>
                            </td>

                            <td>
                                ${
                                    p.pendencias?.length
                                        ? p.pendencias.map(x =>
                                            `<span class="status-badge status-warning">${escaparSalaAPS(x)}</span>`
                                        ).join(" ")
                                        : `<span style="color:var(--text-muted);">-</span>`
                                }
                            </td>

                            <td>
                                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                    <button
                                        class="btn-table-action btn-edit"
                                        onclick="abrirAtendimentoExistente?.('${escaparSalaAPS(p.cpf || "")}', '${escaparSalaAPS(p.cns || "")}')">
                                        📋 Prontuário
                                    </button>

                                    <button
                                        class="btn-table-action btn-ok"
                                        onclick="abrirLinhaTempoTerritorial?.('${escaparSalaAPS(p.cpf || "")}', '${escaparSalaAPS(p.cns || "")}')">
                                        🧬 Linha
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
   CÁLCULOS ESPECÍFICOS
   ========================================================== */

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
                        pendencias: 0,
                        retornosVencidos: 0,
                        score: 0,
                        status: "🟢 Estável"
                    };
                }

                const g =
                    grupos[chave];

                g.populacao++;

                if (ehCriticoSalaAPS(p)) {
                    g.criticos++;
                    g.score += 5;
                }

                const qtdPendencias =
                    p.pendencias?.length || 0;

                g.pendencias +=
                    qtdPendencias;

                g.score +=
                    qtdPendencias * 2;

                if (Number(p.prazo) === 0) {
                    g.retornosVencidos++;
                    g.score += 4;
                }

                if (valorSimSalaAPS(p.tb)) g.score += 3;
                if (valorSimSalaAPS(p.hansen)) g.score += 3;
                if (valorSimSalaAPS(p.gestante)) g.score += 2;
            });

            Object.values(grupos).forEach(g => {
                if (g.score >= 300 || g.criticos >= 10) {
                    g.status = "🔴 Prioridade máxima";
                } else if (g.score >= 120 || g.criticos >= 4) {
                    g.status = "🟡 Atenção";
                } else {
                    g.status = "🟢 Estável";
                }
            });

            return Object
                .values(grupos)
                .sort((a, b) =>
                    b.score - a.score ||
                    b.criticos - a.criticos ||
                    b.pendencias - a.pendencias
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
                gestantes: 0
            };
        }

        const p =
            profissionais[nome];

        p.atendimentos++;

        if (valorSimSalaAPS(a.has)) p.has++;
        if (valorSimSalaAPS(a.dm)) p.dm++;
        if (valorSimSalaAPS(a.gestante)) p.gestantes++;

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

function calcularEstoqueSalaAPS(estoque, solicitacoes) {
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

    if (contexto.criticos.length >= 10) {
        recs.push({
            icone: "🚨",
            cor: "#ef4444",
            titulo: "Concentrar agenda em pacientes críticos",
            justificativa: `${contexto.criticos.length} pacientes foram classificados como críticos ou muito alto risco.`,
            acao: "Organizar agenda protegida de retorno, busca ativa e revisão de plano terapêutico."
        });
    }

    if (contexto.retornosVencidos >= 10) {
        recs.push({
            icone: "📅",
            cor: "#f59e0b",
            titulo: "Mutirão de retornos vencidos",
            justificativa: `${contexto.retornosVencidos} pacientes estão com retorno vencido.`,
            acao: "Gerar fila de contato ativo por ACS/enfermagem e priorizar casos de alto risco."
        });
    }

    if (topEquipe && topEquipe.status.includes("Prioridade")) {
        recs.push({
            icone: "👥",
            cor: "#ef4444",
            titulo: `Plano de ação para ${topEquipe.nome}`,
            justificativa: `Equipe com score territorial ${topEquipe.score}, ${topEquipe.criticos} críticos e ${topEquipe.pendencias} pendências.`,
            acao: "Reunião rápida de equipe, divisão de lista nominal e metas semanais de resolução."
        });
    }

    if (topUBS && topUBS.status.includes("Prioridade")) {
        recs.push({
            icone: "🏥",
            cor: "#a21caf",
            titulo: `Atenção gerencial para ${topUBS.nome}`,
            justificativa: `UBS com maior concentração de risco no filtro atual.`,
            acao: "Avaliar capacidade assistencial, estoque, agenda e apoio matricial."
        });
    }

    if (topTerritorio && topTerritorio.status.includes("Prioridade")) {
        recs.push({
            icone: "🌎",
            cor: "#ef4444",
            titulo: `Intervenção territorial em ${topTerritorio.nome}`,
            justificativa: `Território com score ${topTerritorio.score} e ${topTerritorio.criticos} pacientes críticos.`,
            acao: "Programar busca ativa territorial e revisão por microárea."
        });
    }

    if (contexto.estoqueAlertas.baixo > 0 || contexto.estoqueAlertas.vencidos > 0) {
        recs.push({
            icone: "📦",
            cor: "#f59e0b",
            titulo: "Revisar estoque estratégico",
            justificativa: `${contexto.estoqueAlertas.baixo} itens com estoque baixo e ${contexto.estoqueAlertas.vencidos} vencidos.`,
            acao: "Checar insumos críticos antes de mutirões e ações territoriais."
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

    return recs.slice(0, 8);
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
                    <th>Pendências</th>
                    <th>Retornos vencidos</th>
                    <th>Score</th>
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
                        <td>${g.pendencias}</td>
                        <td>${g.retornosVencidos}</td>
                        <td><strong>${g.score}</strong></td>
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
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

/* ==========================================================
   EXPORTAÇÃO
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
            "has",
            "dm",
            "gestante",
            "tb",
            "hansen",
            "risco",
            "score_predicao",
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
            p.has,
            p.dm,
            p.gestante,
            p.tb,
            p.hansen,
            p.risco_global,
            p.predicao?.score || 0,
            (p.pendencias || []).join(" | "),
            p.prazo
        ]);
    });

    baixarCSVSalaAPS(
        linhas,
        `sala_situacao_aps_${new Date().toISOString().slice(0, 10)}.csv`
    );
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
        Number(p.prazo) === 0 ||
        normalizarSalaAPS(p.risco_global).includes("alto") ||
        Number(p.risco_pontos || 0) >= 6 ||
        Number(p.predicao?.score || 0) >= 10
    );
}

function identificarPendenciasSalaAPS(p) {
    const pendencias = [];

    if (valorSimSalaAPS(p.has) && !p.ultimo_atendimento) {
        pendencias.push("HAS sem acompanhamento");
    }

    if (valorSimSalaAPS(p.dm) && !p.ultimo_atendimento) {
        pendencias.push("DM sem acompanhamento");
    }

    if (valorSimSalaAPS(p.gestante) && diasDesdeSalaAPS(p.ultimo_atendimento) > 30) {
        pendencias.push("Gestante sem consulta recente");
    }

    if (valorSimSalaAPS(p.tb) && diasDesdeSalaAPS(p.ultimo_atendimento) > 30) {
        pendencias.push("TB sem acompanhamento");
    }

    if (valorSimSalaAPS(p.hansen) && diasDesdeSalaAPS(p.ultimo_atendimento) > 60) {
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

/* ==========================================================
   GLOBAL
   ========================================================== */

window.carregarSalaSituacaoAPS = carregarSalaSituacaoAPS;
window.renderizarSalaSituacaoAPS = renderizarSalaSituacaoAPS;
window.exportarSalaSituacaoAPSCSV = exportarSalaSituacaoAPSCSV;
window.salaSituacaoAPSAtual = salaSituacaoAPSAtual;
