/* ==========================================================
   🗓️ AGENDA INTELIGENTE APS — SINTAXEHUB
   Centro operacional diário baseado no Score Territorial Global
   Supabase-first: sem IndexedDB, sem localStorage, sem cache persistente.

   Consome:
   - territorio_inteligente
   - agenda_aps

   Integra:
   - Score Territorial APS Global
   - Torre APS
   - Copiloto IA
   - Prontuário
   - Linha do Tempo Territorial
   ========================================================== */

let agendaInteligenteAPSAtual = {
    territorio: [],
    agenda: [],
    resumoIA: null,
    filtros: {}
};

/* ==========================================================
   CARREGAMENTO PRINCIPAL
   ========================================================== */

async function carregarAgendaInteligenteAPS() {
    const container =
        document.getElementById("conteudoAgendaInteligenteAPS");

    if (!container) return;

    if (typeof supabaseClient === "undefined") {
        container.innerHTML =
            `<p style="color:var(--danger);">Supabase não carregado.</p>`;
        return;
    }

    container.innerHTML =
        `<p style="color:var(--text-muted);">Carregando Agenda Inteligente APS...</p>`;

    try {
        const filtros =
            obterFiltrosAgendaInteligenteAPS();

        let agenda =
            await buscarAgendaInteligenteAPS(filtros);

        const territorio =
            await buscarTerritorioParaAgendaAPS();

        if (!agenda.length) {
            agenda =
                gerarAgendaInteligenteAPSLocal(territorio);
        }

        agenda =
            enriquecerAgendaComTerritorioAPS(agenda, territorio);

        agenda =
            aplicarFiltrosAgendaInteligenteAPS(agenda, filtros);

        agenda =
            ordenarAgendaInteligenteAPS(agenda);

        const resumoIA =
            gerarResumoIAAgendaInteligenteAPS(agenda, territorio);

        agendaInteligenteAPSAtual = {
            territorio,
            agenda,
            resumoIA,
            filtros
        };

        carregarFiltrosAgendaInteligenteAPS(territorio);
        renderizarAgendaInteligenteAPS();

    } catch (erro) {
        console.error("Erro ao carregar Agenda Inteligente APS:", erro);

        container.innerHTML =
            `<p style="color:var(--danger);">Erro ao carregar Agenda Inteligente APS.</p>`;
    }
}

/* ==========================================================
   BUSCAS SUPABASE
   ========================================================== */

async function buscarAgendaInteligenteAPS(filtros = {}) {
    try {
        let query =
            supabaseClient
                .from("agenda_aps")
                .select("*")
                .order("data_sugerida", { ascending: true })
                .limit(5000);

        if (filtros.data) {
            query =
                query.eq("data_sugerida", filtros.data);
        }

        const { data, error } =
            await query;

        if (error) {
            console.warn("Agenda APS indisponível ou vazia:", error.message);
            return [];
        }

        return data || [];

    } catch (erro) {
        console.warn("Falha ao buscar agenda_aps:", erro);
        return [];
    }
}

async function buscarTerritorioParaAgendaAPS() {
    try {
        const { data, error } =
            await supabaseClient
                .from("territorio_inteligente")
                .select("*")
                .order("score_territorial_global", { ascending: false })
                .limit(20000);

        if (error) {
            console.warn("Erro ao buscar territorio_inteligente para agenda:", error.message);
            return [];
        }

        return data || [];

    } catch (erro) {
        console.warn("Falha ao buscar território para agenda:", erro);
        return [];
    }
}

/* ==========================================================
   GERAÇÃO AUTOMÁTICA DA AGENDA
   ========================================================== */

async function gerarAgendaInteligenteAPS() {
    if (typeof supabaseClient === "undefined") {
        mostrarToast?.("Supabase não carregado.");
        return [];
    }

    const territorio =
        await buscarTerritorioParaAgendaAPS();

    const agenda =
        gerarAgendaInteligenteAPSLocal(territorio);

    if (!agenda.length) {
        mostrarToast?.("Nenhuma agenda prioritária gerada.");
        return [];
    }

    const hoje =
        obterDataHojeAgendaAPS();

    await limparAgendaGeradaHojeAPS(hoje);

    const payload =
        agenda.map(item => ({
            paciente_cpf: item.paciente_cpf,
            paciente_nome: item.paciente_nome,
            tipo: item.tipo,
            prioridade: item.prioridade,
            data_sugerida: item.data_sugerida || hoje,
            motivo: item.motivo,
            origem: item.origem || "IA_SCORE_TERRITORIAL_GLOBAL"
        }));

    const { data, error } =
        await supabaseClient
            .from("agenda_aps")
            .insert(payload)
            .select();

    if (error) {
        console.error("Erro ao salvar Agenda Inteligente APS:", error);
        mostrarToast?.("Erro ao salvar Agenda Inteligente APS.");
        return [];
    }

    mostrarToast?.(`🗓️ Agenda Inteligente APS gerada: ${data.length} item(ns).`);

    await carregarAgendaInteligenteAPS();

    return data || [];
}

async function limparAgendaGeradaHojeAPS(data) {
    try {
        await supabaseClient
            .from("agenda_aps")
            .delete()
            .eq("data_sugerida", data)
            .in("origem", [
                "IA_SCORE_TERRITORIAL_GLOBAL",
                "TORRE_APS",
                "PENDENCIAS_ASSISTENCIAIS",
                "LINHA_CUIDADO_GESTANTE"
            ]);
    } catch (erro) {
        console.warn("Não foi possível limpar agenda gerada anteriormente:", erro);
    }
}

function gerarAgendaInteligenteAPSLocal(territorio) {
    const hoje =
        obterDataHojeAgendaAPS();

    const agenda = [];

    (territorio || []).forEach(paciente => {
        const score =
            Number(
                paciente.score_territorial_global ??
                paciente.score_geral ??
                0
            );

        const prioridade =
            normalizarPrioridadeAgendaAPS(
                paciente.nivel_prioridade ||
                paciente.prioridade ||
                classificarScoreAgendaAPS(score)
            );

        const pendencias =
            Array.isArray(paciente.pendencias)
                ? paciente.pendencias
                : [];

        const nome =
            paciente.nome ||
            paciente.paciente_nome ||
            "Sem nome";

        const cpf =
            limparDocumentoAgendaAPS(
                paciente.cpf ||
                paciente.paciente_cpf ||
                ""
            );

        if (!cpf && !paciente.cns) return;

        if (score >= 85 || paciente.visita_domiciliar_indicada === true) {
            agenda.push({
                paciente_cpf: cpf,
                paciente_nome: nome,
                tipo: "VISITA_DOMICILIAR",
                prioridade: score >= 85 ? "CRITICA" : "ALTA",
                data_sugerida: hoje,
                motivo:
                    paciente.acao_recomendada ||
                    paciente.recomendacao_ia ||
                    "Paciente com alto risco territorial e indicação de visita domiciliar",
                origem: "IA_SCORE_TERRITORIAL_GLOBAL",
                score_territorial_global: score,
                paciente
            });
        }

        if (score >= 65 || pendencias.length > 0) {
            agenda.push({
                paciente_cpf: cpf,
                paciente_nome: nome,
                tipo: "BUSCA_ATIVA",
                prioridade: score >= 85 ? "CRITICA" : "ALTA",
                data_sugerida: hoje,
                motivo:
                    pendencias.length
                        ? pendencias.join(", ")
                        : "Paciente em alta prioridade territorial",
                origem: "PENDENCIAS_ASSISTENCIAIS",
                score_territorial_global: score,
                paciente
            });
        }

        if (valorSimAgendaAPS(paciente.gestante)) {
            agenda.push({
                paciente_cpf: cpf,
                paciente_nome: nome,
                tipo: "PRE_NATAL",
                prioridade: score >= 65 ? "ALTA" : "MODERADA",
                data_sugerida: hoje,
                motivo: "Gestante em acompanhamento territorial APS",
                origem: "LINHA_CUIDADO_GESTANTE",
                score_territorial_global: score,
                paciente
            });
        }

        if (pendencias.some(p => normalizarAgendaAPS(p).includes("vacina"))) {
            agenda.push({
                paciente_cpf: cpf,
                paciente_nome: nome,
                tipo: "VACINACAO",
                prioridade: score >= 65 ? "ALTA" : "MODERADA",
                data_sugerida: hoje,
                motivo: "Pendência vacinal identificada",
                origem: "PENDENCIAS_ASSISTENCIAIS",
                score_territorial_global: score,
                paciente
            });
        }
    });

    return removerDuplicidadesAgendaAPS(agenda);
}

function removerDuplicidadesAgendaAPS(agenda) {
    const mapa = new Map();

    (agenda || []).forEach(item => {
        const chave =
            `${item.paciente_cpf || item.paciente_nome}-${item.tipo}`;

        const atual =
            mapa.get(chave);

        if (!atual) {
            mapa.set(chave, item);
            return;
        }

        if (
            pesoPrioridadeAgendaAPS(item.prioridade) >
            pesoPrioridadeAgendaAPS(atual.prioridade)
        ) {
            mapa.set(chave, item);
        }
    });

    return Array.from(mapa.values());
}

/* ==========================================================
   ENRIQUECIMENTO E ORDENAÇÃO
   ========================================================== */

function enriquecerAgendaComTerritorioAPS(agenda, territorio) {
    const mapa = new Map();

    (territorio || []).forEach(p => {
        const chaveCpf =
            limparDocumentoAgendaAPS(p.cpf || "");

        const chaveCns =
            String(p.cns || "");

        if (chaveCpf) mapa.set(chaveCpf, p);
        if (chaveCns) mapa.set(chaveCns, p);
    });

    return (agenda || []).map(item => {
        const chave =
            limparDocumentoAgendaAPS(item.paciente_cpf || "") ||
            String(item.cns || "");

        const paciente =
            item.paciente ||
            mapa.get(chave) ||
            {};

        const score =
            Number(
                paciente.score_territorial_global ??
                item.score_territorial_global ??
                paciente.score_geral ??
                0
            );

        return {
            ...item,
            paciente,
            paciente_nome:
                item.paciente_nome ||
                paciente.nome ||
                "Sem nome",
            paciente_cpf:
                limparDocumentoAgendaAPS(
                    item.paciente_cpf ||
                    paciente.cpf ||
                    ""
                ),
            score_territorial_global: score,
            nivel_prioridade:
                paciente.nivel_prioridade ||
                item.prioridade ||
                classificarScoreAgendaAPS(score),
            acao_recomendada:
                paciente.acao_recomendada ||
                paciente.recomendacao_ia ||
                item.motivo ||
                "Ação APS prioritária"
        };
    });
}

function ordenarAgendaInteligenteAPS(agenda) {
    return [...(agenda || [])]
        .sort((a, b) =>
            pesoPrioridadeAgendaAPS(b.prioridade || b.nivel_prioridade) -
            pesoPrioridadeAgendaAPS(a.prioridade || a.nivel_prioridade) ||
            Number(b.score_territorial_global || 0) -
            Number(a.score_territorial_global || 0) ||
            pesoTipoAgendaAPS(b.tipo) -
            pesoTipoAgendaAPS(a.tipo)
        );
}

/* ==========================================================
   FILTROS
   ========================================================== */

function obterFiltrosAgendaInteligenteAPS() {
    return {
        data:
            document.getElementById("agendaAPSData")?.value ||
            obterDataHojeAgendaAPS(),

        tipo:
            document.getElementById("agendaAPSFiltroTipo")?.value || "TODOS",

        prioridade:
            document.getElementById("agendaAPSFiltroPrioridade")?.value || "TODAS",

        equipe:
            document.getElementById("agendaAPSFiltroEquipe")?.value || "TODAS",

        ubs:
            document.getElementById("agendaAPSFiltroUBS")?.value || "TODAS",

        busca:
            document.getElementById("agendaAPSBusca")?.value || ""
    };
}

function carregarFiltrosAgendaInteligenteAPS(territorio) {
    const data =
        document.getElementById("agendaAPSData");

    if (data && !data.value) {
        data.value =
            obterDataHojeAgendaAPS();
    }

    preencherSelectAgendaAPS(
        "agendaAPSFiltroEquipe",
        (territorio || []).map(p => p.equipe || "Não informado"),
        "Todas as equipes"
    );

    preencherSelectAgendaAPS(
        "agendaAPSFiltroUBS",
        (territorio || []).map(p => p.ubs || "Não informado"),
        "Todas as UBS"
    );
}

function preencherSelectAgendaAPS(id, valores, rotulo) {
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

        option.value = valor;
        option.textContent = valor;

        select.appendChild(option);
    });

    if (atual === "TODAS" || unicos.includes(atual)) {
        select.value = atual;
    }
}

function aplicarFiltrosAgendaInteligenteAPS(agenda, filtros) {
    let lista = [...(agenda || [])];

    if (filtros.tipo !== "TODOS") {
        lista = lista.filter(item => item.tipo === filtros.tipo);
    }

    if (filtros.prioridade !== "TODAS") {
        lista = lista.filter(item =>
            normalizarPrioridadeAgendaAPS(item.prioridade || item.nivel_prioridade) === filtros.prioridade
        );
    }

    if (filtros.equipe !== "TODAS") {
        lista = lista.filter(item =>
            String(item.paciente?.equipe || "Não informado") === filtros.equipe
        );
    }

    if (filtros.ubs !== "TODAS") {
        lista = lista.filter(item =>
            String(item.paciente?.ubs || "Não informado") === filtros.ubs
        );
    }

    if (filtros.busca) {
        const termo =
            normalizarAgendaAPS(filtros.busca);

        lista = lista.filter(item => {
            const texto =
                normalizarAgendaAPS([
                    item.paciente_nome,
                    item.paciente_cpf,
                    item.paciente?.cns,
                    item.paciente?.equipe,
                    item.paciente?.ubs,
                    item.motivo,
                    item.tipo
                ].join(" "));

            return texto.includes(termo);
        });
    }

    return lista;
}

function limparFiltrosAgendaInteligenteAPS() {
    setValorAgendaAPS("agendaAPSFiltroTipo", "TODOS");
    setValorAgendaAPS("agendaAPSFiltroPrioridade", "TODAS");
    setValorAgendaAPS("agendaAPSFiltroEquipe", "TODAS");
    setValorAgendaAPS("agendaAPSFiltroUBS", "TODAS");
    setValorAgendaAPS("agendaAPSBusca", "");
    setValorAgendaAPS("agendaAPSData", obterDataHojeAgendaAPS());

    carregarAgendaInteligenteAPS();
}

/* ==========================================================
   RENDERIZAÇÃO
   ========================================================== */

function renderizarAgendaInteligenteAPS() {
    const container =
        document.getElementById("conteudoAgendaInteligenteAPS");

    if (!container) return;

    const agenda =
        agendaInteligenteAPSAtual.agenda || [];

    const territorio =
        agendaInteligenteAPSAtual.territorio || [];

    const resumoIA =
        agendaInteligenteAPSAtual.resumoIA ||
        gerarResumoIAAgendaInteligenteAPS(agenda, territorio);

    container.innerHTML = `
        ${renderizarTopoAgendaInteligenteAPS(resumoIA)}
        ${renderizarCardsAgendaInteligenteAPS(agenda)}
        ${renderizarCopilotoAgendaInteligenteAPS(resumoIA)}
        ${renderizarTabelaAgendaInteligenteAPS(agenda)}
    `;
}

function renderizarTopoAgendaInteligenteAPS(resumoIA) {
    return `
        <div class="form-section" style="border-left:6px solid var(--primary);">
            <div class="section-header">
                <div>
                    <h3 style="margin:0;">🗓️ Agenda Inteligente APS</h3>
                    <p style="color:var(--text-muted); margin:6px 0 0 0;">
                        Agenda operacional gerada pelo Score Territorial Global, pendências e prioridades da APS.
                    </p>
                </div>

                <div class="button-row">
                    <button class="btn-primary" onclick="gerarAgendaInteligenteAPS()">
                        🧠 Gerar Agenda do Dia
                    </button>

                    <button class="btn-secondary" onclick="carregarAgendaInteligenteAPS()">
                        🔄 Atualizar
                    </button>

                    <button class="btn-info" onclick="copiarResumoIAAgendaInteligenteAPS()">
                        📋 Copiar Resumo IA
                    </button>

                    <button class="btn-secondary" onclick="exportarAgendaInteligenteAPSCSV()">
                        📤 Exportar CSV
                    </button>
                </div>
            </div>

            <div class="form-grid" style="margin-top:16px;">
                <div class="form-group">
                    <label>Data</label>
                    <input type="date" id="agendaAPSData" onchange="carregarAgendaInteligenteAPS()" value="${obterDataHojeAgendaAPS()}">
                </div>

                <div class="form-group">
                    <label>Tipo</label>
                    <select id="agendaAPSFiltroTipo" onchange="carregarAgendaInteligenteAPS()">
                        <option value="TODOS">Todos os tipos</option>
                        <option value="BUSCA_ATIVA">📞 Busca ativa</option>
                        <option value="VISITA_DOMICILIAR">🏠 Visita domiciliar</option>
                        <option value="CONSULTA">🩺 Consulta</option>
                        <option value="PRE_NATAL">🤰 Pré-natal</option>
                        <option value="VACINACAO">💉 Vacinação</option>
                        <option value="ENTREGA_MATERIAL">📦 Entrega de material</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Prioridade</label>
                    <select id="agendaAPSFiltroPrioridade" onchange="carregarAgendaInteligenteAPS()">
                        <option value="TODAS">Todas</option>
                        <option value="CRITICA">Crítica</option>
                        <option value="ALTA">Alta</option>
                        <option value="MODERADA">Moderada</option>
                        <option value="BAIXA">Baixa</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Equipe</label>
                    <select id="agendaAPSFiltroEquipe" onchange="carregarAgendaInteligenteAPS()">
                        <option value="TODAS">Todas as equipes</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>UBS</label>
                    <select id="agendaAPSFiltroUBS" onchange="carregarAgendaInteligenteAPS()">
                        <option value="TODAS">Todas as UBS</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Busca</label>
                    <input id="agendaAPSBusca" placeholder="Nome, CPF, CNS, motivo..." oninput="carregarAgendaInteligenteAPS()">
                </div>
            </div>

            <div class="button-row" style="margin-top:10px;">
                <button class="btn-secondary" onclick="limparFiltrosAgendaInteligenteAPS()">
                    🧹 Limpar filtros
                </button>
            </div>
        </div>
    `;
}

function renderizarCardsAgendaInteligenteAPS(agenda) {
    const buscaAtiva =
        agenda.filter(a => a.tipo === "BUSCA_ATIVA").length;

    const visitas =
        agenda.filter(a => a.tipo === "VISITA_DOMICILIAR").length;

    const consultas =
        agenda.filter(a => a.tipo === "CONSULTA").length;

    const gestantes =
        agenda.filter(a => a.tipo === "PRE_NATAL").length;

    const criticos =
        agenda.filter(a =>
            normalizarPrioridadeAgendaAPS(a.prioridade || a.nivel_prioridade) === "CRITICA" ||
            Number(a.score_territorial_global || 0) >= 85
        ).length;

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">📌 Painel do Dia</h3>

            <div class="dashboard-grid cards-agenda-aps">
                ${cardAgendaAPS("📞", buscaAtiva, "Busca Ativa Hoje", "icon-blue")}
                ${cardAgendaAPS("🏠", visitas, "Visitas Hoje", "icon-green")}
                ${cardAgendaAPS("🩺", consultas, "Consultas Prioritárias", "icon-cyan")}
                ${cardAgendaAPS("🤰", gestantes, "Gestantes", "icon-yellow")}
                ${cardAgendaAPS("🚨", criticos, "Casos Críticos", "icon-red")}
            </div>
        </div>
    `;
}

function renderizarCopilotoAgendaInteligenteAPS(resumoIA) {
    return `
        <div class="form-section" style="background:rgba(99,102,241,0.06); border-left:6px solid var(--primary);">
            <h3 style="margin-top:0;">🧠 Copiloto APS</h3>

            <pre style="white-space:pre-wrap; font-family:inherit; color:var(--text); margin-bottom:12px;">${escaparAgendaAPS(resumoIA.texto)}</pre>

            <div class="button-row">
                <button class="btn-primary" onclick="gerarAgendaInteligenteAPS()">
                    Sim, gerar agenda do dia
                </button>

                <button class="btn-secondary" onclick="copiarResumoIAAgendaInteligenteAPS()">
                    Copiar mensagem
                </button>
            </div>
        </div>
    `;
}

function renderizarTabelaAgendaInteligenteAPS(agenda) {
    if (!agenda.length) {
        return `
            <div class="form-section">
                <h3 style="margin-top:0;">📋 Lista Operacional</h3>
                <p style="color:var(--text-muted);">Nenhuma ação prioritária encontrada para os filtros selecionados.</p>
            </div>
        `;
    }

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">📋 Lista Operacional da Agenda APS</h3>

            <table class="table-sintaxe">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Tipo</th>
                        <th>Paciente</th>
                        <th>Equipe / UBS</th>
                        <th>Prioridade</th>
                        <th>Score</th>
                        <th>Motivo</th>
                        <th>Ações</th>
                    </tr>
                </thead>

                <tbody>
                    ${agenda.map((item, index) => {
                        const p = item.paciente || {};
                        const prioridade = normalizarPrioridadeAgendaAPS(item.prioridade || item.nivel_prioridade);

                        return `
                            <tr>
                                <td><strong>${index + 1}</strong></td>

                                <td>
                                    <span class="status-badge ${classeBadgeTipoAgendaAPS(item.tipo)}">
                                        ${iconeTipoAgendaAPS(item.tipo)} ${rotuloTipoAgendaAPS(item.tipo)}
                                    </span>
                                </td>

                                <td>
                                    <strong>${escaparAgendaAPS(item.paciente_nome || p.nome || "Sem nome")}</strong>
                                    <small>CPF: ${escaparAgendaAPS(item.paciente_cpf || p.cpf || "-")} | CNS: ${escaparAgendaAPS(p.cns || "-")}</small>
                                </td>

                                <td>
                                    ${escaparAgendaAPS(p.equipe || "Não informado")}
                                    <small>${escaparAgendaAPS(p.ubs || "Não informado")}</small>
                                </td>

                                <td>
                                    <span class="status-badge ${classeBadgePrioridadeAgendaAPS(prioridade)}">
                                        ${rotuloPrioridadeAgendaAPS(prioridade)}
                                    </span>
                                </td>

                                <td>
                                    <strong>${Number(item.score_territorial_global || 0)}</strong>
                                    <small>${escaparAgendaAPS(p.nivel_prioridade || item.nivel_prioridade || "")}</small>
                                </td>

                                <td>
                                    <small>${escaparAgendaAPS(item.motivo || item.acao_recomendada || "Ação APS prioritária")}</small>
                                </td>

                                <td>
                                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                        <button class="btn-table-action btn-edit" onclick="abrirProntuarioAgendaAPS('${escaparAgendaAPS(item.paciente_cpf || p.cpf || "")}', '${escaparAgendaAPS(p.cns || "")}')">
                                            📋 Prontuário
                                        </button>

                                        <button class="btn-table-action btn-ok" onclick="abrirLinhaTempoAgendaAPS('${escaparAgendaAPS(item.paciente_cpf || p.cpf || "")}', '${escaparAgendaAPS(p.cns || "")}')">
                                            🧬 Linha
                                        </button>

                                        <button class="btn-table-action btn-warn" onclick="copiarMensagemAgendaAPS(${index})">
                                            💬 Mensagem
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>
        </div>
    `;
}

/* ==========================================================
   IA / COPILOTO
   ========================================================== */

function gerarResumoIAAgendaInteligenteAPS(agenda, territorio) {
    const criticos =
        (territorio || []).filter(p =>
            Number(p.score_territorial_global || p.score_geral || 0) >= 85 ||
            normalizarPrioridadeAgendaAPS(p.nivel_prioridade || p.prioridade) === "CRITICA"
        ).length;

    const buscas =
        (agenda || []).filter(a => a.tipo === "BUSCA_ATIVA").length;

    const visitas =
        (agenda || []).filter(a => a.tipo === "VISITA_DOMICILIAR").length;

    const gestantes =
        (agenda || []).filter(a => a.tipo === "PRE_NATAL").length;

    const consultas =
        (agenda || []).filter(a => a.tipo === "CONSULTA").length;

    const materiais =
        (agenda || []).filter(a => a.tipo === "ENTREGA_MATERIAL").length;

    const texto =
`🧠 Bom dia.

Existem:

• ${criticos} pacientes críticos
• ${buscas} buscas ativas
• ${visitas} visitas domiciliares prioritárias
• ${consultas} consultas prioritárias
• ${gestantes} gestantes em acompanhamento prioritário
• ${materiais} entregas de material pendentes

Deseja gerar a agenda do dia?`;

    return {
        criticos,
        buscas,
        visitas,
        consultas,
        gestantes,
        materiais,
        texto
    };
}

function copiarResumoIAAgendaInteligenteAPS() {
    const resumo =
        agendaInteligenteAPSAtual.resumoIA ||
        gerarResumoIAAgendaInteligenteAPS(
            agendaInteligenteAPSAtual.agenda || [],
            agendaInteligenteAPSAtual.territorio || []
        );

    copiarTextoAgendaAPS(resumo.texto, "🧠 Resumo IA da Agenda copiado.");
}

function copiarMensagemAgendaAPS(index) {
    const item =
        (agendaInteligenteAPSAtual.agenda || [])[index];

    if (!item) return;

    const p =
        item.paciente || {};

    const texto =
`Olá, ${item.paciente_nome || p.nome || ""}.

A equipe da APS identificou uma pendência importante no seu acompanhamento: ${item.motivo || "necessidade de acompanhamento pela equipe"}.

Por favor, entre em contato com a unidade ou aguarde o contato da equipe para organização do cuidado.

SintaxeHub APS`;

    copiarTextoAgendaAPS(texto, "Mensagem da agenda copiada.");
}

/* ==========================================================
   AÇÕES
   ========================================================== */

function abrirProntuarioAgendaAPS(cpf, cns) {
    if (typeof abrirAtendimentoExistente === "function") {
        abrirAtendimentoExistente(cpf, cns);
        return;
    }

    if (typeof navigate === "function") {
        navigate("prontuario");
        setTimeout(() => {
            const campo =
                document.getElementById("buscaPaciente") ||
                document.getElementById("searchPaciente") ||
                document.getElementById("cpfBusca");

            if (campo) {
                campo.value = cpf || cns || "";
                campo.dispatchEvent(new Event("input"));
            }
        }, 400);
        return;
    }

    mostrarToast?.("Função de prontuário não localizada.");
}

function abrirLinhaTempoAgendaAPS(cpf, cns) {
    if (typeof abrirLinhaTempoTerritorial === "function") {
        abrirLinhaTempoTerritorial(cpf, cns);
        return;
    }

    mostrarToast?.("Linha do Tempo Territorial não localizada.");
}

function exportarAgendaInteligenteAPSCSV() {
    const agenda =
        agendaInteligenteAPSAtual.agenda || [];

    if (!agenda.length) {
        mostrarToast?.("Nenhuma agenda para exportar.");
        return;
    }

    const linhas = [
        [
            "ordem",
            "data_sugerida",
            "tipo",
            "prioridade",
            "score_territorial_global",
            "paciente_nome",
            "paciente_cpf",
            "cns",
            "equipe",
            "ubs",
            "motivo",
            "origem"
        ]
    ];

    agenda.forEach((item, index) => {
        const p =
            item.paciente || {};

        linhas.push([
            index + 1,
            item.data_sugerida || "",
            item.tipo || "",
            item.prioridade || item.nivel_prioridade || "",
            item.score_territorial_global || 0,
            item.paciente_nome || p.nome || "",
            item.paciente_cpf || p.cpf || "",
            p.cns || "",
            p.equipe || "",
            p.ubs || "",
            item.motivo || "",
            item.origem || ""
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
        new Blob([csv], { type: "text/csv;charset=utf-8;" });

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href = url;
    a.download = `agenda_inteligente_aps_${obterDataHojeAgendaAPS()}.csv`;
    a.click();

    URL.revokeObjectURL(url);
}

/* ==========================================================
   COMPONENTES VISUAIS
   ========================================================== */

function cardAgendaAPS(icone, valor, rotulo, classeIcone = "") {
    return `
        <div class="dash-card">
            <div class="dash-icon ${classeIcone}">${icone}</div>
            <div>
                <h3>${valor}</h3>
                <p>${escaparAgendaAPS(rotulo)}</p>
            </div>
        </div>
    `;
}

function iconeTipoAgendaAPS(tipo) {
    const mapa = {
        BUSCA_ATIVA: "📞",
        VISITA_DOMICILIAR: "🏠",
        CONSULTA: "🩺",
        PRE_NATAL: "🤰",
        VACINACAO: "💉",
        ENTREGA_MATERIAL: "📦"
    };

    return mapa[tipo] || "🗓️";
}

function rotuloTipoAgendaAPS(tipo) {
    const mapa = {
        BUSCA_ATIVA: "Busca ativa",
        VISITA_DOMICILIAR: "Visita domiciliar",
        CONSULTA: "Consulta",
        PRE_NATAL: "Pré-natal",
        VACINACAO: "Vacinação",
        ENTREGA_MATERIAL: "Entrega de material"
    };

    return mapa[tipo] || tipo || "Ação APS";
}

function classeBadgeTipoAgendaAPS(tipo) {
    const mapa = {
        BUSCA_ATIVA: "status-info",
        VISITA_DOMICILIAR: "status-success",
        CONSULTA: "status-info",
        PRE_NATAL: "status-warning",
        VACINACAO: "status-success",
        ENTREGA_MATERIAL: "status-warning"
    };

    return mapa[tipo] || "status-info";
}

function classeBadgePrioridadeAgendaAPS(prioridade) {
    const p =
        normalizarPrioridadeAgendaAPS(prioridade);

    if (p === "CRITICA") return "status-danger";
    if (p === "ALTA") return "status-warning";
    if (p === "MODERADA") return "status-info";
    return "status-success";
}

function rotuloPrioridadeAgendaAPS(prioridade) {
    const p =
        normalizarPrioridadeAgendaAPS(prioridade);

    if (p === "CRITICA") return "🔴 Crítica";
    if (p === "ALTA") return "🟠 Alta";
    if (p === "MODERADA") return "🟡 Moderada";
    return "🟢 Baixa";
}

/* ==========================================================
   HELPERS
   ========================================================== */

function obterDataHojeAgendaAPS() {
    return new Date().toISOString().slice(0, 10);
}

function classificarScoreAgendaAPS(score) {
    const s = Number(score || 0);

    if (s >= 85) return "CRITICA";
    if (s >= 65) return "ALTA";
    if (s >= 40) return "MODERADA";
    return "BAIXA";
}

function normalizarPrioridadeAgendaAPS(valor) {
    const v =
        normalizarAgendaAPS(valor);

    if (v.includes("critic") || v.includes("crítica") || v.includes("critica")) return "CRITICA";
    if (v.includes("alto") || v.includes("alta")) return "ALTA";
    if (v.includes("moder")) return "MODERADA";
    if (v.includes("baixo") || v.includes("baixa") || v.includes("rotina")) return "BAIXA";

    return String(valor || "BAIXA").toUpperCase();
}

function pesoPrioridadeAgendaAPS(prioridade) {
    const p =
        normalizarPrioridadeAgendaAPS(prioridade);

    if (p === "CRITICA") return 4;
    if (p === "ALTA") return 3;
    if (p === "MODERADA") return 2;
    return 1;
}

function pesoTipoAgendaAPS(tipo) {
    const mapa = {
        VISITA_DOMICILIAR: 6,
        PRE_NATAL: 5,
        CONSULTA: 4,
        BUSCA_ATIVA: 3,
        VACINACAO: 2,
        ENTREGA_MATERIAL: 1
    };

    return mapa[tipo] || 0;
}

function normalizarAgendaAPS(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function valorSimAgendaAPS(valor) {
    const v =
        normalizarAgendaAPS(valor);

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

function limparDocumentoAgendaAPS(valor) {
    return String(valor || "")
        .replace(/\D/g, "");
}

function escaparAgendaAPS(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function setValorAgendaAPS(id, valor) {
    const el =
        document.getElementById(id);

    if (el) {
        el.value = valor;
    }
}

function copiarTextoAgendaAPS(texto, mensagemSucesso) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(texto);
        mostrarToast?.(mensagemSucesso || "Texto copiado.");
        return;
    }

    alert(texto);
}

/* ==========================================================
   GLOBAL
   ========================================================== */

window.carregarAgendaInteligenteAPS = carregarAgendaInteligenteAPS;
window.gerarAgendaInteligenteAPS = gerarAgendaInteligenteAPS;
window.gerarAgendaInteligenteAPSLocal = gerarAgendaInteligenteAPSLocal;
window.renderizarAgendaInteligenteAPS = renderizarAgendaInteligenteAPS;
window.copiarResumoIAAgendaInteligenteAPS = copiarResumoIAAgendaInteligenteAPS;
window.exportarAgendaInteligenteAPSCSV = exportarAgendaInteligenteAPSCSV;
window.limparFiltrosAgendaInteligenteAPS = limparFiltrosAgendaInteligenteAPS;
window.abrirProntuarioAgendaAPS = abrirProntuarioAgendaAPS;
window.abrirLinhaTempoAgendaAPS = abrirLinhaTempoAgendaAPS;
window.copiarMensagemAgendaAPS = copiarMensagemAgendaAPS;
window.gerarResumoIAAgendaInteligenteAPS = gerarResumoIAAgendaInteligenteAPS;
