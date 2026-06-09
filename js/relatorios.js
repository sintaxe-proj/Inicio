/* ==========================================================
   📄 RELATÓRIO GERENCIAL APS — SINTAXEHUB
   Supabase:
   pacientes + atendimentos + interacoes_busca_ativa
   reunioes + reuniao_casos + estoque_itens + solicitacoes_materiais
   ========================================================== */

let relatorioAPSCache = {
    pacientes: [],
    atendimentos: [],
    interacoes: [],
    reunioes: [],
    reuniaoCasos: [],
    estoque: [],
    solicitacoes: [],
    baseConsolidada: []
};

/* ==========================================================
   CARREGAMENTO PRINCIPAL
   ========================================================== */

async function carregarRelatorioAPS() {
    const container =
        document.getElementById("conteudoRelatorioAPS");

    if (!container) return;

    if (typeof supabaseClient === "undefined") {
        container.innerHTML =
            `<p style="color:var(--danger);">Supabase não carregado.</p>`;
        return;
    }

    container.innerHTML =
        `<p style="color:var(--text-muted);">Gerando relatório gerencial...</p>`;

    try {
        const filtros =
            obterFiltrosRelatorioAPS();

        const [
            pacientes,
            atendimentos,
            interacoes,
            reunioes,
            reuniaoCasos,
            estoque,
            solicitacoes
        ] = await Promise.all([
            buscarPacientesRelatorioAPS(),
            buscarAtendimentosRelatorioAPS(filtros),
            buscarInteracoesRelatorioAPS(filtros),
            buscarReunioesRelatorioAPS(filtros),
            buscarReuniaoCasosRelatorioAPS(filtros),
            buscarEstoqueRelatorioAPS(),
            buscarSolicitacoesRelatorioAPS(filtros)
        ]);

        relatorioAPSCache.pacientes =
            pacientes || [];

        relatorioAPSCache.atendimentos =
            atendimentos || [];

        relatorioAPSCache.interacoes =
            interacoes || [];

        relatorioAPSCache.reunioes =
            reunioes || [];

        relatorioAPSCache.reuniaoCasos =
            reuniaoCasos || [];

        relatorioAPSCache.estoque =
            estoque || [];

        relatorioAPSCache.solicitacoes =
            solicitacoes || [];

        relatorioAPSCache.baseConsolidada =
            consolidarBaseRelatorioAPS(
                relatorioAPSCache.pacientes,
                relatorioAPSCache.atendimentos
            );

        carregarFiltrosRelatorioAPS(relatorioAPSCache.baseConsolidada);
        aplicarFiltrosRelatorioAPS();

    } catch (erro) {
        console.error("Erro ao carregar relatório APS:", erro);

        container.innerHTML =
            `<p style="color:var(--danger);">Erro ao gerar relatório gerencial.</p>`;
    }
}

/* ==========================================================
   BUSCAS SUPABASE
   ========================================================== */

async function buscarPacientesRelatorioAPS() {
    const { data, error } =
        await supabaseClient
            .from("pacientes")
            .select(`
                id,
                nome,
                cpf,
                cns,
                telefone,
                cep,
                ubs,
                equipe,
                ubs_vinculacao,
                equipe_esf
            `)
            .limit(10000);

    if (error) {
        console.error("Erro pacientes relatório:", error);
        return [];
    }

    return data || [];
}

async function buscarAtendimentosRelatorioAPS(filtros) {
    let query =
        supabaseClient
            .from("atendimentos")
            .select(`
                id,
                paciente_cpf,
                cpf,
                cns,
                nome_paciente,
                has,
                dm,
                gestante,
                tb,
                hansen,
                risco_global,
                risco_pontos,
                reavaliacaoDias,
                retorno_dias,
                ciapSelecionado,
                inputBuscaCIAPS,
                data_atendimento,
                criado_em,
                ubs_vinculacao,
                equipe_esf
            `)
            .limit(20000);

    query =
        aplicarPeriodoQueryRelatorioAPS(
            query,
            filtros,
            "data_atendimento"
        );

    const { data, error } =
        await query;

    if (error) {
        console.error("Erro atendimentos relatório:", error);
        return [];
    }

    return data || [];
}

async function buscarInteracoesRelatorioAPS(filtros) {
    let query =
        supabaseClient
            .from("interacoes_busca_ativa")
            .select("*")
            .limit(10000);

    query =
        aplicarPeriodoQueryRelatorioAPS(
            query,
            filtros,
            "criado_em"
        );

    const { data, error } =
        await query;

    if (error) {
        console.warn("Interações indisponíveis:", error);
        return [];
    }

    return data || [];
}

async function buscarReunioesRelatorioAPS(filtros) {
    let query =
        supabaseClient
            .from("reunioes")
            .select("*")
            .limit(1000);

    query =
        aplicarPeriodoQueryRelatorioAPS(
            query,
            filtros,
            "criado_em"
        );

    const { data, error } =
        await query;

    if (error) {
        console.warn("Reuniões indisponíveis:", error);
        return [];
    }

    return data || [];
}

async function buscarReuniaoCasosRelatorioAPS(filtros) {
    let query =
        supabaseClient
            .from("reuniao_casos")
            .select("*")
            .limit(10000);

    query =
        aplicarPeriodoQueryRelatorioAPS(
            query,
            filtros,
            "created_at"
        );

    const { data, error } =
        await query;

    if (error) {
        console.warn("Casos de reunião indisponíveis:", error);
        return [];
    }

    return data || [];
}

async function buscarEstoqueRelatorioAPS() {
    const { data, error } =
        await supabaseClient
            .from("estoque_itens")
            .select("*")
            .limit(10000);

    if (error) {
        console.warn("Estoque indisponível:", error);
        return [];
    }

    return data || [];
}

async function buscarSolicitacoesRelatorioAPS(filtros) {
    let query =
        supabaseClient
            .from("solicitacoes_materiais")
            .select("*")
            .limit(10000);

    query =
        aplicarPeriodoQueryRelatorioAPS(
            query,
            filtros,
            "criado_em"
        );

    const { data, error } =
        await query;

    if (error) {
        console.warn("Solicitações indisponíveis:", error);
        return [];
    }

    return data || [];
}

function aplicarPeriodoQueryRelatorioAPS(query, filtros, coluna) {
    if (filtros.inicio) {
        query =
            query.gte(
                coluna,
                filtros.inicio + "T00:00:00"
            );
    }

    if (filtros.fim) {
        query =
            query.lte(
                coluna,
                filtros.fim + "T23:59:59"
            );
    }

    return query;
}

/* ==========================================================
   CONSOLIDAÇÃO
   ========================================================== */

function consolidarBaseRelatorioAPS(pacientes, atendimentos) {
    const mapa =
        new Map();

    pacientes.forEach(p => {
        const chave =
            p.cpf ||
            p.cns ||
            p.id;

        if (!chave) return;

        mapa.set(chave, {
            id: p.id || "",
            nome: p.nome || "",
            cpf: p.cpf || "",
            cns: p.cns || "",
            telefone: p.telefone || "",
            cep: p.cep || "",
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
            ciap: "",
            ultimo_atendimento: null
        });
    });

    atendimentos.forEach(a => {
        const chave =
            a.paciente_cpf ||
            a.cpf ||
            a.cns;

        if (!chave) return;

        const atual =
            mapa.get(chave) || {
                id: "",
                nome: a.nome_paciente || "",
                cpf: a.paciente_cpf || a.cpf || "",
                cns: a.cns || "",
                telefone: "",
                cep: "",
                ubs: a.ubs_vinculacao || "Não informado",
                equipe: a.equipe_esf || "Não informado",

                has: "Não",
                dm: "Não",
                gestante: "Não",
                tb: "Não",
                hansen: "Não",

                risco_global: "Não informado",
                risco_pontos: 0,
                prazo: null,
                ciap: "",
                ultimo_atendimento: null
            };

        if (!atual.nome && a.nome_paciente) atual.nome = a.nome_paciente;

        if (valorSimRelatorioAPS(a.has)) atual.has = "Sim";
        if (valorSimRelatorioAPS(a.dm)) atual.dm = "Sim";
        if (valorSimRelatorioAPS(a.gestante)) atual.gestante = "Sim";
        if (valorSimRelatorioAPS(a.tb)) atual.tb = "Sim";
        if (valorSimRelatorioAPS(a.hansen)) atual.hansen = "Sim";

        if (a.risco_global) atual.risco_global = a.risco_global;
        if (a.risco_pontos !== null && a.risco_pontos !== undefined) {
            atual.risco_pontos = Number(a.risco_pontos || 0);
        }

        atual.prazo =
            a.reavaliacaoDias ??
            a.retorno_dias ??
            atual.prazo;

        atual.ciap =
            a.ciapSelecionado ||
            a.inputBuscaCIAPS ||
            atual.ciap ||
            "";

        atual.ultimo_atendimento =
            a.data_atendimento ||
            a.criado_em ||
            atual.ultimo_atendimento;

        if (a.ubs_vinculacao) atual.ubs = a.ubs_vinculacao;
        if (a.equipe_esf) atual.equipe = a.equipe_esf;

        mapa.set(chave, atual);
    });

    return Array.from(mapa.values());
}

/* ==========================================================
   FILTROS
   ========================================================== */

function obterFiltrosRelatorioAPS() {
    return {
        inicio:
            document.getElementById("relatorioDataInicio")?.value || "",

        fim:
            document.getElementById("relatorioDataFim")?.value || "",

        equipe:
            document.getElementById("relatorioEquipe")?.value || "TODAS",

        ubs:
            document.getElementById("relatorioUBS")?.value || "TODAS",

        linha:
            document.getElementById("relatorioLinhaCuidado")?.value || "TODAS"
    };
}

function carregarFiltrosRelatorioAPS(base) {
    carregarSelectRelatorioAPS(
        "relatorioEquipe",
        base.map(p => p.equipe || "Não informado"),
        "Todas as equipes"
    );

    carregarSelectRelatorioAPS(
        "relatorioUBS",
        base.map(p => p.ubs || "Não informado"),
        "Todas as UBS"
    );
}

function carregarSelectRelatorioAPS(id, valores, rotulo) {
    const select =
        document.getElementById(id);

    if (!select) return;

    const valorAtual =
        select.value || "TODAS";

    const unicos =
        [...new Set(valores.filter(Boolean))]
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

    if (valorAtual === "TODAS" || unicos.includes(valorAtual)) {
        select.value =
            valorAtual;
    }
}

function aplicarFiltrosRelatorioAPS() {
    const filtros =
        obterFiltrosRelatorioAPS();

    let base =
        [...relatorioAPSCache.baseConsolidada];

    if (filtros.equipe !== "TODAS") {
        base =
            base.filter(p =>
                String(p.equipe || "Não informado") === filtros.equipe
            );
    }

    if (filtros.ubs !== "TODAS") {
        base =
            base.filter(p =>
                String(p.ubs || "Não informado") === filtros.ubs
            );
    }

    if (filtros.linha !== "TODAS") {
        base =
            base.filter(p => {
                if (filtros.linha === "HAS") return valorSimRelatorioAPS(p.has);
                if (filtros.linha === "DM") return valorSimRelatorioAPS(p.dm);
                if (filtros.linha === "GESTANTE") return valorSimRelatorioAPS(p.gestante);
                if (filtros.linha === "TB") return valorSimRelatorioAPS(p.tb);
                if (filtros.linha === "HANSEN") return valorSimRelatorioAPS(p.hansen);
                return true;
            });
    }

    renderizarRelatorioAPS(base, filtros);
}

/* ==========================================================
   RENDERIZAÇÃO
   ========================================================== */

function renderizarRelatorioAPS(base, filtros) {
    const container =
        document.getElementById("conteudoRelatorioAPS");

    if (!container) return;

    const indicadores =
        calcularIndicadoresRelatorioAPS(base, filtros);

    atualizarCardsRelatorioAPS(indicadores);

    container.innerHTML = `
        <div id="areaImpressaoRelatorioAPS">

            <div class="form-section">
                <h3 style="margin-top:0;">📌 Resumo Executivo</h3>

                <p>
                    Período:
                    <strong>${filtros.inicio || "início"}</strong>
                    até
                    <strong>${filtros.fim || "hoje"}</strong>
                    |
                    Equipe:
                    <strong>${escaparRelatorioAPS(filtros.equipe)}</strong>
                    |
                    UBS:
                    <strong>${escaparRelatorioAPS(filtros.ubs)}</strong>
                </p>

                <div class="dashboard-grid">
                    ${cardRelatorioAPS("👥", indicadores.populacao, "População no filtro", "icon-blue")}
                    ${cardRelatorioAPS("❤️", indicadores.has, "HAS", "icon-red")}
                    ${cardRelatorioAPS("🍬", indicadores.dm, "DM", "icon-green")}
                    ${cardRelatorioAPS("🤰", indicadores.gestantes, "Gestantes", "icon-yellow")}
                    ${cardRelatorioAPS("🫁", indicadores.tb, "Tuberculose", "icon-purple")}
                    ${cardRelatorioAPS("🖐️", indicadores.hansen, "Hanseníase", "icon-cyan")}
                    ${cardRelatorioAPS("🚨", indicadores.criticos, "Críticos / alto risco", "icon-red")}
                </div>
            </div>

            <div class="form-section">
                <h3 style="margin-top:0;">📞 Busca Ativa</h3>

                <div class="dashboard-grid">
                    ${cardRelatorioAPS("📞", indicadores.busca.total, "Contatos realizados", "icon-blue")}
                    ${cardRelatorioAPS("✅", indicadores.busca.atendidos, "Atendidos", "icon-green")}
                    ${cardRelatorioAPS("📅", indicadores.busca.agendados, "Agendados", "icon-yellow")}
                    ${cardRelatorioAPS("✔️", indicadores.busca.resolvidos, "Resolvidos", "icon-cyan")}
                    ${cardRelatorioAPS("⚠️", indicadores.busca.naoLocalizados, "Não localizados", "icon-red")}
                </div>
            </div>

            <div class="form-section">
                <h3 style="margin-top:0;">🩺 Produção Assistencial</h3>

                <div class="dashboard-grid">
                    ${cardRelatorioAPS("🩺", indicadores.atendimentos.total, "Atendimentos", "icon-blue")}
                    ${cardRelatorioAPS("👥", indicadores.atendimentos.equipes, "Equipes com produção", "icon-cyan")}
                    ${cardRelatorioAPS("🏥", indicadores.atendimentos.ubs, "UBS com produção", "icon-green")}
                    ${cardRelatorioAPS("🏷️", indicadores.atendimentos.ciaps, "CIAPs distintos", "icon-purple")}
                </div>

                ${renderizarRankingRelatorioAPS(
                    "Ranking por equipe",
                    indicadores.rankings.equipes
                )}

                ${renderizarRankingRelatorioAPS(
                    "Ranking por UBS",
                    indicadores.rankings.ubs
                )}
            </div>

            <div class="form-section">
                <h3 style="margin-top:0;">👥 Reuniões de Equipe</h3>

                <div class="dashboard-grid">
                    ${cardRelatorioAPS("🗓️", indicadores.reunioes.total, "Reuniões realizadas", "icon-blue")}
                    ${cardRelatorioAPS("🚨", indicadores.reunioes.casos, "Casos discutidos", "icon-red")}
                    ${cardRelatorioAPS("📌", indicadores.reunioes.pendencias, "Condutas registradas", "icon-yellow")}
                </div>
            </div>

            <div class="form-section">
                <h3 style="margin-top:0;">📦 Estoque e Materiais</h3>

                <div class="dashboard-grid">
                    ${cardRelatorioAPS("📦", indicadores.estoque.itens, "Itens ativos", "icon-blue")}
                    ${cardRelatorioAPS("⚠️", indicadores.estoque.baixo, "Estoque baixo", "icon-yellow")}
                    ${cardRelatorioAPS("⛔", indicadores.estoque.vencidos, "Itens vencidos", "icon-red")}
                    ${cardRelatorioAPS("📅", indicadores.estoque.vencem30, "Vencem em 30 dias", "icon-purple")}
                    ${cardRelatorioAPS("⏳", indicadores.estoque.solicitacoesPendentes, "Solicitações pendentes", "icon-cyan")}
                </div>
            </div>

            <div class="form-section">
                <h3 style="margin-top:0;">🚨 Lista de Prioridade</h3>

                ${renderizarTabelaPrioridadeRelatorioAPS(indicadores.prioritarios)}
            </div>

        </div>
    `;
}

function atualizarCardsRelatorioAPS(indicadores) {
    setTextoRelatorioAPS("relatorioPopulacao", indicadores.populacao);
    setTextoRelatorioAPS("relatorioHAS", indicadores.has);
    setTextoRelatorioAPS("relatorioDM", indicadores.dm);
    setTextoRelatorioAPS("relatorioGestantes", indicadores.gestantes);
    setTextoRelatorioAPS("relatorioCriticos", indicadores.criticos);
    setTextoRelatorioAPS("relatorioAtendimentos", indicadores.atendimentos.total);
}

/* ==========================================================
   CÁLCULOS
   ========================================================== */

function calcularIndicadoresRelatorioAPS(base, filtros) {
    const atendimentos =
        filtrarPorEquipeUBSRelatorioAPS(
            relatorioAPSCache.atendimentos,
            filtros
        );

    const interacoes =
        filtrarPorEquipeUBSRelatorioAPS(
            relatorioAPSCache.interacoes,
            filtros
        );

    const reuniaoCasos =
        filtrarPorEquipeUBSRelatorioAPS(
            relatorioAPSCache.reuniaoCasos,
            filtros
        );

    const solicitacoes =
        relatorioAPSCache.solicitacoes || [];

    const estoque =
        relatorioAPSCache.estoque || [];

    const criticos =
        base.filter(p =>
            Number(p.prazo) === 0 ||
            normalizarRelatorioAPS(p.risco_global).includes("alto") ||
            Number(p.risco_pontos || 0) >= 6
        );

    const busca = {
        total: interacoes.length,
        atendidos: interacoes.filter(i => i.resultado === "Atendido").length,
        agendados: interacoes.filter(i => i.resultado === "Agendado").length,
        resolvidos: interacoes.filter(i => i.resultado === "Resolvido").length,
        naoLocalizados: interacoes.filter(i =>
            i.resultado === "Não atendeu" ||
            i.resultado === "Número inválido" ||
            i.resultado === "Necessita nova tentativa"
        ).length
    };

    const atendimentosEquipe =
        agruparContagemRelatorioAPS(
            atendimentos,
            a => a.equipe_esf || "Não informado"
        );

    const atendimentosUBS =
        agruparContagemRelatorioAPS(
            atendimentos,
            a => a.ubs_vinculacao || "Não informado"
        );

    const ciaps =
        new Set(
            atendimentos
                .map(a => a.ciapSelecionado || a.inputBuscaCIAPS || "")
                .filter(Boolean)
        );

    const vencidos =
        estoque.filter(e =>
            calcularStatusValidadeRelatorioAPS(e.data_validade) === "VENCIDO"
        ).length;

    const vencem30 =
        estoque.filter(e =>
            calcularStatusValidadeRelatorioAPS(e.data_validade) === "VENCE_30"
        ).length;

    const baixo =
        estoque.filter(e =>
            Number(e.quantidade_atual || 0) <=
            Number(e.quantidade_minima || 0)
        ).length;

    return {
        populacao: base.length,
        has: base.filter(p => valorSimRelatorioAPS(p.has)).length,
        dm: base.filter(p => valorSimRelatorioAPS(p.dm)).length,
        gestantes: base.filter(p => valorSimRelatorioAPS(p.gestante)).length,
        tb: base.filter(p => valorSimRelatorioAPS(p.tb)).length,
        hansen: base.filter(p => valorSimRelatorioAPS(p.hansen)).length,
        criticos: criticos.length,

        busca,

        atendimentos: {
            total: atendimentos.length,
            equipes: Object.keys(atendimentosEquipe).length,
            ubs: Object.keys(atendimentosUBS).length,
            ciaps: ciaps.size
        },

        reunioes: {
            total: relatorioAPSCache.reunioes.length,
            casos: reuniaoCasos.length,
            pendencias: reuniaoCasos.filter(c => c.conduta).length
        },

        estoque: {
            itens: estoque.filter(e => (e.status || "ATIVO") === "ATIVO").length,
            baixo,
            vencidos,
            vencem30,
            solicitacoesPendentes: solicitacoes.filter(s => s.status === "PENDENTE").length
        },

        rankings: {
            equipes: atendimentosEquipe,
            ubs: atendimentosUBS
        },

        prioritarios:
            criticos.slice(0, 100)
    };
}

function filtrarPorEquipeUBSRelatorioAPS(lista, filtros) {
    return (lista || []).filter(item => {
        const equipe =
            item.equipe ||
            item.equipe_esf ||
            "Não informado";

        const ubs =
            item.ubs ||
            item.ubs_vinculacao ||
            "Não informado";

        if (filtros.equipe !== "TODAS" && equipe !== filtros.equipe) {
            return false;
        }

        if (filtros.ubs !== "TODAS" && ubs !== filtros.ubs) {
            return false;
        }

        return true;
    });
}

function agruparContagemRelatorioAPS(lista, chaveFn) {
    const mapa = {};

    (lista || []).forEach(item => {
        const chave =
            chaveFn(item) || "Não informado";

        mapa[chave] =
            (mapa[chave] || 0) + 1;
    });

    return mapa;
}

/* ==========================================================
   COMPONENTES
   ========================================================== */

function cardRelatorioAPS(icone, valor, rotulo, classeIcone) {
    return `
        <div class="dash-card">
            <div class="dash-icon ${classeIcone || ""}">${icone}</div>
            <div>
                <h3>${valor ?? 0}</h3>
                <p>${rotulo}</p>
            </div>
        </div>
    `;
}

function renderizarRankingRelatorioAPS(titulo, mapa) {
    const itens =
        Object.entries(mapa || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

    if (!itens.length) {
        return `
            <p style="color:var(--text-muted);">
                Sem dados para ${titulo}.
            </p>
        `;
    }

    return `
        <h4>${titulo}</h4>

        <table class="table-sintaxe">
            <thead>
                <tr>
                    <th>Descrição</th>
                    <th>Total</th>
                </tr>
            </thead>

            <tbody>
                ${itens.map(([nome, total]) => `
                    <tr>
                        <td>${escaparRelatorioAPS(nome)}</td>
                        <td><strong>${total}</strong></td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function renderizarTabelaPrioridadeRelatorioAPS(lista) {
    if (!lista.length) {
        return `
            <p style="color:var(--text-muted);">
                Nenhum paciente crítico ou alto risco localizado.
            </p>
        `;
    }

    return `
        <table class="table-sintaxe">
            <thead>
                <tr>
                    <th>Paciente</th>
                    <th>Equipe</th>
                    <th>Linhas</th>
                    <th>Risco</th>
                    <th>Prazo</th>
                </tr>
            </thead>

            <tbody>
                ${lista.map(p => `
                    <tr>
                        <td>
                            <strong>${escaparRelatorioAPS(p.nome || "Sem nome")}</strong>
                            <small>CPF: ${escaparRelatorioAPS(p.cpf || "-")} | ${escaparRelatorioAPS(p.telefone || "-")}</small>
                        </td>

                        <td>
                            ${escaparRelatorioAPS(p.equipe || "-")}
                            <small>${escaparRelatorioAPS(p.ubs || "-")}</small>
                        </td>

                        <td>${badgesLinhasRelatorioAPS(p)}</td>

                        <td>${escaparRelatorioAPS(p.risco_global || "Não informado")}</td>

                        <td>${formatarPrazoRelatorioAPS(p.prazo)}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function badgesLinhasRelatorioAPS(p) {
    const badges = [];

    if (valorSimRelatorioAPS(p.has)) badges.push(`<span class="status-badge status-danger">HAS</span>`);
    if (valorSimRelatorioAPS(p.dm)) badges.push(`<span class="status-badge status-success">DM</span>`);
    if (valorSimRelatorioAPS(p.gestante)) badges.push(`<span class="status-badge status-warning">Gestante</span>`);
    if (valorSimRelatorioAPS(p.tb)) badges.push(`<span class="status-badge status-info">TB</span>`);
    if (valorSimRelatorioAPS(p.hansen)) badges.push(`<span class="status-badge status-info">Hanseníase</span>`);

    return badges.length
        ? `<div style="display:flex; gap:6px; flex-wrap:wrap;">${badges.join("")}</div>`
        : `<span style="color:var(--text-muted);">-</span>`;
}

/* ==========================================================
   EXPORTAÇÃO / IMPRESSÃO
   ========================================================== */

function imprimirRelatorioAPS() {
    gerarRelatorioPDFProfissionalAPS();
}

function exportarRelatorioAPSCSV() {
    const base =
        relatorioAPSCache.baseConsolidada || [];

    if (!base.length) {
        mostrarToast?.("⚠️ Nenhum dado para exportar.");
        return;
    }

    const linhas = [
        [
            "nome",
            "cpf",
            "cns",
            "telefone",
            "ubs",
            "equipe",
            "has",
            "dm",
            "gestante",
            "tb",
            "hansen",
            "risco_global",
            "prazo",
            "ultimo_atendimento"
        ]
    ];

    base.forEach(p => {
        linhas.push([
            p.nome,
            p.cpf,
            p.cns,
            p.telefone,
            p.ubs,
            p.equipe,
            p.has,
            p.dm,
            p.gestante,
            p.tb,
            p.hansen,
            p.risco_global,
            p.prazo,
            p.ultimo_atendimento
        ]);
    });

    baixarCSVRelatorioAPS(
        linhas,
        `relatorio_aps_${new Date().toISOString().slice(0, 10)}.csv`
    );
}

function baixarCSVRelatorioAPS(linhas, nomeArquivo) {
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
   PDF PROFISSIONAL DO RELATÓRIO APS
   ========================================================== */

function gerarRelatorioPDFProfissionalAPS() {
    const area =
        document.getElementById("areaImpressaoRelatorioAPS") ||
        document.getElementById("conteudoRelatorioAPS");

    if (!area) {
        mostrarToast?.("⚠️ Gere o relatório antes de exportar em PDF.");
        return;
    }

    const filtros =
        obterFiltrosRelatorioAPS();

    const periodo =
        `${filtros.inicio || "Início"} a ${filtros.fim || "Hoje"}`;

    const equipe =
        filtros.equipe || "TODAS";

    const ubs =
        filtros.ubs || "TODAS";

    const linha =
        filtros.linha || "TODAS";

    const janela =
        window.open("", "_blank");

    if (!janela) {
        alert("Não foi possível abrir a janela de impressão. Verifique se o navegador bloqueou pop-ups.");
        return;
    }

    janela.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Relatório Gerencial APS — SintaxeHub</title>

            <style>
                @page {
                    size: A4;
                    margin: 16mm;
                }

                * {
                    box-sizing: border-box;
                }

                body {
                    font-family: Arial, Helvetica, sans-serif;
                    color: #111827;
                    background: #ffffff;
                    line-height: 1.4;
                    margin: 0;
                    padding: 0;
                }

                .capa-relatorio {
                    height: 92vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    text-align: center;
                    border: 4px solid #1d4ed8;
                    padding: 48px;
                    page-break-after: always;
                }

                .logo-relatorio {
                    width: 82px;
                    height: 82px;
                    border-radius: 22px;
                    background: #1d4ed8;
                    color: white;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 44px;
                    font-weight: 800;
                    margin: 0 auto 24px auto;
                }

                .capa-relatorio h1 {
                    font-size: 32px;
                    margin: 0 0 10px 0;
                    color: #0f172a;
                }

                .capa-relatorio h2 {
                    font-size: 18px;
                    margin: 0;
                    color: #334155;
                    border: 0;
                    padding: 0;
                }

                .metadados-relatorio {
                    margin-top: 34px;
                    font-size: 14px;
                    color: #475569;
                    line-height: 1.8;
                }

                .selo-relatorio {
                    margin-top: 36px;
                    display: inline-block;
                    border: 1px solid #1d4ed8;
                    color: #1d4ed8;
                    padding: 8px 14px;
                    border-radius: 999px;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 0.04em;
                }

                main {
                    padding: 0;
                }

                h2 {
                    font-size: 22px;
                    color: #0f172a;
                    border-bottom: 3px solid #1d4ed8;
                    padding-bottom: 8px;
                    margin-top: 0;
                }

                h3 {
                    font-size: 17px;
                    color: #1e3a8a;
                    border-bottom: 1px solid #cbd5e1;
                    padding-bottom: 6px;
                    margin-top: 28px;
                }

                h4 {
                    font-size: 14px;
                    color: #334155;
                    margin-top: 18px;
                }

                p {
                    font-size: 12px;
                }

                .form-section {
                    border: 1px solid #cbd5e1;
                    border-radius: 12px;
                    padding: 14px;
                    margin-bottom: 16px;
                    background: #ffffff;
                    break-inside: avoid;
                }

                .dashboard-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                    margin: 12px 0;
                }

                .dash-card {
                    border: 1px solid #cbd5e1;
                    border-radius: 10px;
                    padding: 12px;
                    background: #f8fafc;
                    break-inside: avoid;
                }

                .dash-icon {
                    font-size: 20px;
                    margin-bottom: 4px;
                }

                .dash-card h3 {
                    margin: 0;
                    padding: 0;
                    border: 0;
                    color: #0f172a;
                    font-size: 24px;
                }

                .dash-card p {
                    margin: 4px 0 0 0;
                    color: #475569;
                    font-size: 11px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                    font-size: 10.5px;
                    page-break-inside: auto;
                }

                thead {
                    display: table-header-group;
                }

                th {
                    background: #1e3a8a;
                    color: #ffffff;
                    text-align: left;
                    padding: 7px;
                    border: 1px solid #1e3a8a;
                }

                td {
                    border: 1px solid #cbd5e1;
                    padding: 7px;
                    vertical-align: top;
                }

                tr {
                    page-break-inside: avoid;
                }

                small {
                    display: block;
                    color: #64748b;
                    font-size: 10px;
                    margin-top: 2px;
                }

                .status-badge {
                    display: inline-block;
                    border: 1px solid #94a3b8;
                    border-radius: 999px;
                    padding: 2px 6px;
                    font-size: 10px;
                    margin: 1px;
                    color: #111827;
                    background: #f8fafc;
                }

                .assinaturas-relatorio {
                    margin-top: 60px;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 60px;
                    page-break-inside: avoid;
                }

                .linha-assinatura {
                    border-top: 1px solid #111827;
                    padding-top: 8px;
                    text-align: center;
                    font-size: 12px;
                    color: #334155;
                }

                .rodape-relatorio {
                    margin-top: 30px;
                    font-size: 10px;
                    color: #64748b;
                    text-align: center;
                    border-top: 1px solid #cbd5e1;
                    padding-top: 10px;
                }

                @media print {
                    button {
                        display: none !important;
                    }
                }
            </style>
        </head>

        <body>

            <section class="capa-relatorio">
                <div class="logo-relatorio">S</div>

                <h1>Relatório Gerencial APS</h1>

                <h2>SintaxeHub — Gestão Territorial, Busca Ativa e Cuidado Longitudinal</h2>

                <div class="metadados-relatorio">
                    <div><strong>Período:</strong> ${escaparRelatorioAPS(periodo)}</div>
                    <div><strong>Equipe:</strong> ${escaparRelatorioAPS(equipe)}</div>
                    <div><strong>UBS:</strong> ${escaparRelatorioAPS(ubs)}</div>
                    <div><strong>Linha de cuidado:</strong> ${escaparRelatorioAPS(linha)}</div>
                    <div><strong>Emitido em:</strong> ${new Date().toLocaleString("pt-BR")}</div>
                </div>

                <div class="selo-relatorio">
                    RELATÓRIO GERENCIAL APS
                </div>
            </section>

            <main>
                <h2>Consolidação Gerencial</h2>

                ${area.innerHTML}

                <section class="assinaturas-relatorio">
                    <div class="linha-assinatura">
                        Coordenação da APS
                    </div>

                    <div class="linha-assinatura">
                        Responsável Técnico
                    </div>
                </section>

                <div class="rodape-relatorio">
                    Documento gerado pelo SintaxeHub — Plataforma Territorial de APS.
                </div>
            </main>

        </body>
        </html>
    `);

    janela.document.close();

    setTimeout(() => {
        janela.focus();
        janela.print();
    }, 500);
}

/* ==========================================================
   HELPERS
   ========================================================== */

function valorSimRelatorioAPS(valor) {
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

function calcularStatusValidadeRelatorioAPS(dataValidade) {
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

function formatarPrazoRelatorioAPS(prazo) {
    if (prazo === null || prazo === undefined || Number.isNaN(Number(prazo))) {
        return "Sem prazo";
    }

    const dias =
        Number(prazo);

    if (dias === 0) return "Crítico";

    return `${dias} dias`;
}

function normalizarRelatorioAPS(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function setTextoRelatorioAPS(id, valor) {
    const el =
        document.getElementById(id);

    if (el) {
        el.innerText =
            valor;
    }
}

function escaparRelatorioAPS(valor) {
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

window.carregarRelatorioAPS = carregarRelatorioAPS;
window.aplicarFiltrosRelatorioAPS = aplicarFiltrosRelatorioAPS;
window.exportarRelatorioAPSCSV = exportarRelatorioAPSCSV;
window.imprimirRelatorioAPS = imprimirRelatorioAPS;
window.gerarRelatorioPDFProfissionalAPS = gerarRelatorioPDFProfissionalAPS;
