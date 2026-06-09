/* ==========================================================
   🧠 COPILOTO APS — SINTAXEHUB
   v1: IA simbólica operacional para APS
   Supabase-first: sem cache persistente, sem IndexedDB.
   ========================================================== */

let copilotoAPSResultadoAtual = [];

/* ==========================================================
   ENTRADA PRINCIPAL
   ========================================================== */

async function executarCopilotoAPS() {
    const input =
        document.getElementById("inputCopilotoAPS");

    const container =
        document.getElementById("respostaCopilotoAPS");

    if (!input || !container) return;

    const pergunta =
        String(input.value || "").trim();

    if (!pergunta) {
        container.innerHTML =
            `<p style="color:var(--text-muted);">Digite uma pergunta ou comando APS.</p>`;
        return;
    }

    if (typeof supabaseClient === "undefined") {
        container.innerHTML =
            `<p style="color:var(--danger);">Supabase não carregado.</p>`;
        return;
    }

    container.innerHTML =
        `<p style="color:var(--text-muted);">Analisando território...</p>`;

    try {
        const intencao =
            interpretarComandoCopilotoAPS(pergunta);

        const dados =
            await carregarDadosCopilotoAPS();

        const resposta =
            gerarRespostaCopilotoAPS(
                intencao,
                dados,
                pergunta
            );

        copilotoAPSResultadoAtual =
            resposta.lista || [];

        renderizarRespostaCopilotoAPS(
            resposta,
            pergunta
        );

    } catch (erro) {
        console.error("Erro no Copiloto APS:", erro);

        container.innerHTML =
            `<p style="color:var(--danger);">Erro ao executar o Copiloto APS.</p>`;
    }
}

/* ==========================================================
   INTERPRETAÇÃO DE INTENÇÃO
   ========================================================== */

function interpretarComandoCopilotoAPS(texto) {
    const t =
        normalizarCopilotoAPS(texto);

    const intencao = {
        original: texto,
        linha: "TODAS",
        filtro: "GERAL",
        risco: null,
        periodo: null,
        acao: "LISTAR",
        limite: 50
    };

    if (t.includes("hipertens") || t.includes("has") || t.includes("pressao")) {
        intencao.linha = "HAS";
    }

    if (t.includes("diabet") || t.includes("dm") || t.includes("hba1c") || t.includes("glic")) {
        intencao.linha = "DM";
    }

    if (t.includes("gestante") || t.includes("pre natal") || t.includes("prenatal")) {
        intencao.linha = "GESTANTE";
    }

    if (t.includes("tuberculose") || t.includes(" tb ")) {
        intencao.linha = "TB";
    }

    if (t.includes("hanseniase") || t.includes("hansen")) {
        intencao.linha = "HANSEN";
    }

    if (t.includes("critico") || t.includes("alto risco") || t.includes("prioritario") || t.includes("prioridade")) {
        intencao.filtro = "CRITICOS";
    }

    if (t.includes("sem consulta") || t.includes("sem atendimento") || t.includes("abandono") || t.includes("mais de 6 meses") || t.includes("180")) {
        intencao.filtro = "SEM_ATENDIMENTO_180";
    }

    if (t.includes("retorno vencido") || t.includes("atrasado") || t.includes("vencido")) {
        intencao.filtro = "RETORNO_VENCIDO";
    }

    if (t.includes("sem pa") || t.includes("sem pressao") || t.includes("pressao nao registrada")) {
        intencao.filtro = "HAS_SEM_PA";
        intencao.linha = "HAS";
    }

    if (t.includes("sem hba1c") || t.includes("hba1c nao") || t.includes("hemoglobina glicada")) {
        intencao.filtro = "DM_SEM_HBA1C";
        intencao.linha = "DM";
    }

    if (t.includes("visitar hoje") || t.includes("visita hoje") || t.includes("hoje")) {
        intencao.filtro = "AGENDA_HOJE";
    }

    if (t.includes("resumo") || t.includes("situacao") || t.includes("panorama")) {
        intencao.acao = "RESUMO";
    }

    if (t.includes("quantos") || t.includes("total")) {
        intencao.acao = "CONTAR";
    }

    if (t.includes("equipe")) {
        intencao.agrupar = "EQUIPE";
    }

    if (t.includes("ubs")) {
        intencao.agrupar = "UBS";
    }

    if (t.includes("territorio") || t.includes("cep") || t.includes("bairro")) {
        intencao.agrupar = "TERRITORIO";
    }

    return intencao;
}

/* ==========================================================
   DADOS
   ========================================================== */

async function carregarDadosCopilotoAPS() {
    const [
        pacientesResp,
        atendimentosResp,
        interacoesResp
    ] = await Promise.all([
        supabaseClient
            .from("pacientes")
            .select("*")
            .limit(15000),

        supabaseClient
            .from("atendimentos")
            .select("*")
            .order("data_atendimento", { ascending: false, nullsFirst: false })
            .limit(40000),

        supabaseClient
            .from("interacoes_busca_ativa")
            .select("*")
            .order("criado_em", { ascending: false, nullsFirst: false })
            .limit(20000)
    ]);

    return {
        pacientes: pacientesResp.data || [],
        atendimentos: atendimentosResp.data || [],
        interacoes: interacoesResp.data || [],
        base:
            consolidarBaseCopilotoAPS(
                pacientesResp.data || [],
                atendimentosResp.data || []
            )
    };
}

function consolidarBaseCopilotoAPS(pacientes, atendimentos) {
    if (typeof consolidarBaseTorreAPS === "function") {
        return consolidarBaseTorreAPS(pacientes, atendimentos);
    }

    const mapa = new Map();

    pacientes.forEach(p => {
        const chave =
            p.cpf ||
            p.cns ||
            p.id;

        if (!chave) return;

        mapa.set(chave, {
            nome: p.nome || "",
            cpf: limparDocumentoCopilotoAPS(p.cpf || ""),
            cns: p.cns || "",
            telefone: p.telefone || "",
            cep: p.cep || "",
            bairro: p.bairro || "",
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
            hasPAS: null,
            hasPAD: null,
            dmHbA1c: null
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
                nome: a.nome_paciente || a.nome || "",
                cpf: limparDocumentoCopilotoAPS(a.paciente_cpf || a.cpf || ""),
                cns: a.cns || "",
                telefone: "",
                cep: a.cep || "",
                bairro: a.bairro || "",
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
                hasPAS: null,
                hasPAD: null,
                dmHbA1c: null
            };

        if (!atual.nome) atual.nome = a.nome_paciente || a.nome || "";

        if (valorSimCopilotoAPS(a.has)) atual.has = "Sim";
        if (valorSimCopilotoAPS(a.dm)) atual.dm = "Sim";
        if (valorSimCopilotoAPS(a.gestante)) atual.gestante = "Sim";
        if (valorSimCopilotoAPS(a.tb)) atual.tb = "Sim";
        if (valorSimCopilotoAPS(a.hansen)) atual.hansen = "Sim";

        atual.risco_global =
            a.risco_global ||
            atual.risco_global;

        atual.risco_pontos =
            Number(a.risco_pontos || atual.risco_pontos || 0);

        atual.prazo =
            a.reavaliacaoDias ??
            a.retorno_dias ??
            atual.prazo;

        atual.ultimo_atendimento =
            a.data_atendimento ||
            a.criado_em ||
            a.created_at ||
            atual.ultimo_atendimento;

        atual.hasPAS =
            primeiroValorCopilotoAPS(a.hasPAS, a.has_pas, a.objPAS, a.obj_pas, atual.hasPAS);

        atual.hasPAD =
            primeiroValorCopilotoAPS(a.hasPAD, a.has_pad, a.objPAD, a.obj_pad, atual.hasPAD);

        atual.dmHbA1c =
            primeiroValorCopilotoAPS(a.dmHbA1c, a.dm_hba1c, a.hba1c, atual.dmHbA1c);

        if (a.equipe_esf || a.equipe) {
            atual.equipe = a.equipe_esf || a.equipe;
        }

        if (a.ubs_vinculacao || a.ubs) {
            atual.ubs = a.ubs_vinculacao || a.ubs;
        }

        mapa.set(chave, atual);
    });

    return Array.from(mapa.values()).map(p => ({
        ...p,
        pendencias: identificarPendenciasCopilotoAPS(p),
        scoreCopiloto: calcularScoreCopilotoAPS(p)
    }));
}

/* ==========================================================
   RESPOSTA
   ========================================================== */

function gerarRespostaCopilotoAPS(intencao, dados, pergunta) {
    let lista =
        [...dados.base];

    lista =
        aplicarLinhaCopilotoAPS(
            lista,
            intencao.linha
        );

    lista =
        aplicarFiltroCopilotoAPS(
            lista,
            intencao.filtro
        );

    lista =
        lista.sort((a, b) =>
            b.scoreCopiloto - a.scoreCopiloto ||
            (b.pendencias?.length || 0) - (a.pendencias?.length || 0)
        );

    if (intencao.acao === "RESUMO") {
        return gerarResumoCopilotoAPS(lista, intencao, pergunta);
    }

    if (intencao.acao === "CONTAR") {
        return {
            titulo: "Contagem APS",
            resumo: `Encontrei ${lista.length} pessoa(s) para: "${pergunta}".`,
            recomendacao:
                gerarRecomendacaoOperacionalCopilotoAPS(lista, intencao),
            lista:
                lista.slice(0, intencao.limite),
            intencao
        };
    }

    return {
        titulo:
            gerarTituloCopilotoAPS(intencao),

        resumo:
            `Encontrei ${lista.length} pessoa(s) relacionadas ao comando: "${pergunta}".`,

        recomendacao:
            gerarRecomendacaoOperacionalCopilotoAPS(lista, intencao),

        lista:
            lista.slice(0, intencao.limite),

        total:
            lista.length,

        intencao
    };
}

function gerarResumoCopilotoAPS(lista, intencao, pergunta) {
    const criticos =
        lista.filter(ehCriticoCopilotoAPS).length;

    const retornoVencido =
        lista.filter(p => Number(p.prazo) === 0).length;

    const semAtendimento180 =
        lista.filter(p => diasDesdeCopilotoAPS(p.ultimo_atendimento) > 180).length;

    const pendencias =
        lista.reduce((total, p) =>
            total + (p.pendencias?.length || 0), 0
        );

    const porEquipe =
        agruparCopilotoAPS(lista, p => p.equipe || "Não informado")
            .slice(0, 5);

    return {
        titulo: "Resumo situacional APS",
        resumo:
            `Resumo para "${pergunta}": ${lista.length} pessoas, ${criticos} críticas, ${retornoVencido} com retorno vencido, ${semAtendimento180} sem atendimento há mais de 180 dias e ${pendencias} pendências clínicas.`,
        recomendacao:
            gerarRecomendacaoOperacionalCopilotoAPS(lista, intencao),
        indicadores: {
            total: lista.length,
            criticos,
            retornoVencido,
            semAtendimento180,
            pendencias,
            porEquipe
        },
        lista:
            lista.slice(0, intencao.limite),
        intencao
    };
}

/* ==========================================================
   FILTROS
   ========================================================== */

function aplicarLinhaCopilotoAPS(lista, linha) {
    if (linha === "HAS") return lista.filter(p => valorSimCopilotoAPS(p.has));
    if (linha === "DM") return lista.filter(p => valorSimCopilotoAPS(p.dm));
    if (linha === "GESTANTE") return lista.filter(p => valorSimCopilotoAPS(p.gestante));
    if (linha === "TB") return lista.filter(p => valorSimCopilotoAPS(p.tb));
    if (linha === "HANSEN") return lista.filter(p => valorSimCopilotoAPS(p.hansen));

    return lista;
}

function aplicarFiltroCopilotoAPS(lista, filtro) {
    if (filtro === "CRITICOS") {
        return lista.filter(ehCriticoCopilotoAPS);
    }

    if (filtro === "SEM_ATENDIMENTO_180") {
        return lista.filter(p =>
            diasDesdeCopilotoAPS(p.ultimo_atendimento) > 180
        );
    }

    if (filtro === "RETORNO_VENCIDO") {
        return lista.filter(p =>
            Number(p.prazo) === 0
        );
    }

    if (filtro === "HAS_SEM_PA") {
        return lista.filter(p =>
            valorSimCopilotoAPS(p.has) &&
            (!temValorCopilotoAPS(p.hasPAS) || !temValorCopilotoAPS(p.hasPAD))
        );
    }

    if (filtro === "DM_SEM_HBA1C") {
        return lista.filter(p =>
            valorSimCopilotoAPS(p.dm) &&
            !temValorCopilotoAPS(p.dmHbA1c)
        );
    }

    if (filtro === "AGENDA_HOJE") {
        return lista.filter(p =>
            ehCriticoCopilotoAPS(p) ||
            Number(p.prazo) === 0 ||
            (p.pendencias?.length || 0) >= 2
        );
    }

    return lista;
}

/* ==========================================================
   RENDERIZAÇÃO
   ========================================================== */

function renderizarRespostaCopilotoAPS(resposta, pergunta) {
    const container =
        document.getElementById("respostaCopilotoAPS");

    if (!container) return;

    container.innerHTML = `
        <div class="form-section" style="border-left:5px solid var(--primary);">
            <h3 style="margin-top:0;">${escaparCopilotoAPS(resposta.titulo)}</h3>
            <p>${escaparCopilotoAPS(resposta.resumo)}</p>
            <p style="color:var(--text-muted);">
                <strong>Recomendação:</strong>
                ${escaparCopilotoAPS(resposta.recomendacao)}
            </p>

            <div class="button-row">
                <button class="btn-primary" onclick="exportarResultadoCopilotoAPSCSV()">
                    📤 Exportar lista
                </button>

                <button class="btn-secondary" onclick="enviarResultadoCopilotoParaCentralAPS()">
                    🎯 Abrir na Central APS
                </button>

                <button class="btn-info" onclick="copiarResumoCopilotoAPS()">
                    📋 Copiar resumo
                </button>
            </div>
        </div>

        ${resposta.indicadores ? renderizarIndicadoresCopilotoAPS(resposta.indicadores) : ""}

        ${renderizarListaCopilotoAPS(resposta.lista || [])}
    `;
}

function renderizarIndicadoresCopilotoAPS(ind) {
    return `
        <div class="dashboard-grid">
            <div class="dash-card">
                <div class="dash-icon icon-blue">👥</div>
                <div>
                    <h3>${ind.total}</h3>
                    <p>Total encontrado</p>
                </div>
            </div>

            <div class="dash-card">
                <div class="dash-icon icon-red">🚨</div>
                <div>
                    <h3>${ind.criticos}</h3>
                    <p>Críticos</p>
                </div>
            </div>

            <div class="dash-card">
                <div class="dash-icon icon-yellow">📅</div>
                <div>
                    <h3>${ind.retornoVencido}</h3>
                    <p>Retorno vencido</p>
                </div>
            </div>

            <div class="dash-card">
                <div class="dash-icon icon-purple">⏳</div>
                <div>
                    <h3>${ind.semAtendimento180}</h3>
                    <p>Sem atendimento &gt;180d</p>
                </div>
            </div>

            <div class="dash-card">
                <div class="dash-icon icon-cyan">🧭</div>
                <div>
                    <h3>${ind.pendencias}</h3>
                    <p>Pendências</p>
                </div>
            </div>
        </div>
    `;
}

function renderizarListaCopilotoAPS(lista) {
    if (!lista.length) {
        return `
            <div class="form-section">
                <p style="color:var(--text-muted);">Nenhum paciente encontrado para este comando.</p>
            </div>
        `;
    }

    return `
        <div class="form-section">
            <h3 style="margin-top:0;">📋 Lista acionável</h3>

            <div style="overflow-x:auto;">
                <table class="table-sintaxe">
                    <thead>
                        <tr>
                            <th>Paciente</th>
                            <th>Equipe / UBS</th>
                            <th>Linhas</th>
                            <th>Risco</th>
                            <th>Pendências</th>
                            <th>Ações</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${lista.map(p => `
                            <tr>
                                <td>
                                    <strong>${escaparCopilotoAPS(p.nome || "Sem nome")}</strong>
                                    <small>CPF: ${formatarDocumentoCopilotoAPS(p.cpf || "-")} | CNS: ${escaparCopilotoAPS(p.cns || "-")}</small>
                                </td>

                                <td>
                                    ${escaparCopilotoAPS(p.equipe || "-")}
                                    <small>${escaparCopilotoAPS(p.ubs || "-")}</small>
                                </td>

                                <td>
                                    ${renderizarLinhasCopilotoAPS(p)}
                                </td>

                                <td>
                                    <strong>${p.scoreCopiloto}</strong>
                                    <small>${ehCriticoCopilotoAPS(p) ? "Prioritário" : "Rotina"}</small>
                                </td>

                                <td>
                                    ${
                                        p.pendencias?.length
                                            ? p.pendencias.map(x =>
                                                `<span class="status-badge status-warning">${escaparCopilotoAPS(x)}</span>`
                                            ).join(" ")
                                            : `<span style="color:var(--text-muted);">-</span>`
                                    }
                                </td>

                                <td>
                                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                        <button class="btn-table-action btn-edit" onclick="abrirAtendimentoExistente?.('${escaparCopilotoAPS(p.cpf || "")}', '${escaparCopilotoAPS(p.cns || "")}')">
                                            📋 Prontuário
                                        </button>

                                        <button class="btn-table-action btn-ok" onclick="abrirLinhaTempoTerritorial?.('${escaparCopilotoAPS(p.cpf || "")}', '${escaparCopilotoAPS(p.cns || "")}')">
                                            🧬 Linha
                                        </button>

                                        <button class="btn-table-action btn-warn" onclick="abrirPacienteCopilotoNaCentralAPS('${escaparCopilotoAPS(p.cpf || p.cns || "")}')">
                                            🎯 Central
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderizarLinhasCopilotoAPS(p) {
    const linhas = [];

    if (valorSimCopilotoAPS(p.has)) linhas.push("HAS");
    if (valorSimCopilotoAPS(p.dm)) linhas.push("DM");
    if (valorSimCopilotoAPS(p.gestante)) linhas.push("Gestante");
    if (valorSimCopilotoAPS(p.tb)) linhas.push("TB");
    if (valorSimCopilotoAPS(p.hansen)) linhas.push("Hansen");

    if (!linhas.length) return "-";

    return linhas
        .map(x => `<span class="status-badge status-info">${x}</span>`)
        .join(" ");
}

/* ==========================================================
   COMANDOS RÁPIDOS
   ========================================================== */

function comandoRapidoCopilotoAPS(texto) {
    const input =
        document.getElementById("inputCopilotoAPS");

    if (input) {
        input.value = texto;
    }

    executarCopilotoAPS();
}

function abrirCopilotoAPS() {
    const modal =
        document.getElementById("modalCopilotoAPS");

    if (modal) {
        modal.style.display = "flex";
    }

    setTimeout(() => {
        document.getElementById("inputCopilotoAPS")?.focus();
    }, 100);
}

function fecharCopilotoAPS() {
    const modal =
        document.getElementById("modalCopilotoAPS");

    if (modal) {
        modal.style.display = "none";
    }
}

/* ==========================================================
   AÇÕES
   ========================================================== */

function abrirPacienteCopilotoNaCentralAPS(termo) {
    if (typeof navigate === "function") {
        navigate("central-aps");
    }

    setTimeout(() => {
        const campo =
            document.getElementById("buscaCentralAPS");

        if (campo) {
            campo.value = termo || "";
        }

        if (typeof aplicarFilaCentralAPS === "function") {
            aplicarFilaCentralAPS("PENDENCIAS");
        }
    }, 450);
}

function enviarResultadoCopilotoParaCentralAPS() {
    if (!copilotoAPSResultadoAtual.length) {
        mostrarToast?.("Nenhum resultado para enviar.");
        return;
    }

    const primeiro =
        copilotoAPSResultadoAtual[0];

    abrirPacienteCopilotoNaCentralAPS(
        primeiro.cpf ||
        primeiro.cns ||
        ""
    );
}

function copiarResumoCopilotoAPS() {
    const container =
        document.getElementById("respostaCopilotoAPS");

    if (!container) return;

    const texto =
        container.innerText || "";

    navigator.clipboard
        ?.writeText(texto)
        .then(() => mostrarToast?.("Resumo copiado."))
        .catch(() => alert(texto));
}

function exportarResultadoCopilotoAPSCSV() {
    if (!copilotoAPSResultadoAtual.length) {
        mostrarToast?.("Nenhum resultado para exportar.");
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
            "score",
            "pendencias"
        ]
    ];

    copilotoAPSResultadoAtual.forEach(p => {
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
            p.scoreCopiloto,
            (p.pendencias || []).join(" | ")
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
        `copiloto_aps_${new Date().toISOString().slice(0, 10)}.csv`;

    a.click();

    URL.revokeObjectURL(url);
}

/* ==========================================================
   REGRAS
   ========================================================== */

function identificarPendenciasCopilotoAPS(p) {
    const pendencias = [];

    if (
        valorSimCopilotoAPS(p.has) &&
        (!temValorCopilotoAPS(p.hasPAS) || !temValorCopilotoAPS(p.hasPAD))
    ) {
        pendencias.push("HAS sem PA");
    }

    if (
        valorSimCopilotoAPS(p.dm) &&
        !temValorCopilotoAPS(p.dmHbA1c)
    ) {
        pendencias.push("DM sem HbA1c");
    }

    if (
        valorSimCopilotoAPS(p.gestante) &&
        diasDesdeCopilotoAPS(p.ultimo_atendimento) > 30
    ) {
        pendencias.push("Gestante sem consulta recente");
    }

    if (
        valorSimCopilotoAPS(p.tb) &&
        diasDesdeCopilotoAPS(p.ultimo_atendimento) > 30
    ) {
        pendencias.push("TB sem acompanhamento");
    }

    if (
        valorSimCopilotoAPS(p.hansen) &&
        diasDesdeCopilotoAPS(p.ultimo_atendimento) > 60
    ) {
        pendencias.push("Hanseníase sem avaliação");
    }

    if (Number(p.prazo) === 0) {
        pendencias.push("Retorno vencido");
    }

    if (diasDesdeCopilotoAPS(p.ultimo_atendimento) > 180) {
        pendencias.push("Sem atendimento >180 dias");
    }

    return pendencias;
}

function calcularScoreCopilotoAPS(p) {
    let score = 0;

    if (ehCriticoCopilotoAPS(p)) score += 5;
    if (valorSimCopilotoAPS(p.tb)) score += 3;
    if (valorSimCopilotoAPS(p.hansen)) score += 3;
    if (valorSimCopilotoAPS(p.gestante)) score += 2;
    if (valorSimCopilotoAPS(p.has)) score += 1;
    if (valorSimCopilotoAPS(p.dm)) score += 1;

    score +=
        Number(p.risco_pontos || 0);

    score +=
        (p.pendencias?.length || identificarPendenciasCopilotoAPS(p).length) * 2;

    if (diasDesdeCopilotoAPS(p.ultimo_atendimento) > 180) {
        score += 3;
    }

    return score;
}

function ehCriticoCopilotoAPS(p) {
    return (
        Number(p.prazo) === 0 ||
        normalizarCopilotoAPS(p.risco_global).includes("alto") ||
        Number(p.risco_pontos || 0) >= 6
    );
}

function gerarTituloCopilotoAPS(intencao) {
    const linha = {
        TODAS: "população monitorada",
        HAS: "hipertensos",
        DM: "diabéticos",
        GESTANTE: "gestantes",
        TB: "tuberculose",
        HANSEN: "hanseníase"
    }[intencao.linha] || "população";

    const filtro = {
        GERAL: "",
        CRITICOS: "prioritários",
        SEM_ATENDIMENTO_180: "sem atendimento há mais de 180 dias",
        RETORNO_VENCIDO: "com retorno vencido",
        HAS_SEM_PA: "sem PA registrada",
        DM_SEM_HBA1C: "sem HbA1c registrada",
        AGENDA_HOJE: "para agenda de hoje"
    }[intencao.filtro] || "";

    return `Copiloto APS — ${linha} ${filtro}`.trim();
}

function gerarRecomendacaoOperacionalCopilotoAPS(lista, intencao) {
    if (!lista.length) {
        return "Nenhuma ação operacional necessária para este comando.";
    }

    const criticos =
        lista.filter(ehCriticoCopilotoAPS).length;

    const retorno =
        lista.filter(p => Number(p.prazo) === 0).length;

    if (criticos >= 10) {
        return "Priorizar agenda protegida para casos críticos e dividir lista nominal por equipe/ACS.";
    }

    if (retorno >= 10) {
        return "Organizar mutirão de retorno vencido e contato ativo por equipe.";
    }

    if (intencao.filtro === "HAS_SEM_PA") {
        return "Programar aferição de PA e atualização do registro clínico dos hipertensos.";
    }

    if (intencao.filtro === "DM_SEM_HBA1C") {
        return "Atualizar HbA1c, revisar adesão e programar seguimento dos diabéticos.";
    }

    if (intencao.linha === "GESTANTE") {
        return "Garantir calendário de pré-natal, vacinação e busca ativa das gestantes atrasadas.";
    }

    return "Revisar lista prioritária e acionar Central APS para acompanhamento longitudinal.";
}

function agruparCopilotoAPS(lista, chaveFn) {
    const grupos = {};

    lista.forEach(item => {
        const chave =
            chaveFn(item) || "Não informado";

        grupos[chave] =
            (grupos[chave] || 0) + 1;
    });

    return Object
        .entries(grupos)
        .map(([nome, total]) => ({ nome, total }))
        .sort((a, b) => b.total - a.total);
}

/* ==========================================================
   HELPERS
   ========================================================== */

function normalizarCopilotoAPS(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function valorSimCopilotoAPS(valor) {
    const v =
        normalizarCopilotoAPS(valor);

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

function temValorCopilotoAPS(valor) {
    return (
        valor !== null &&
        valor !== undefined &&
        String(valor).trim() !== ""
    );
}

function primeiroValorCopilotoAPS(...valores) {
    for (const valor of valores) {
        if (temValorCopilotoAPS(valor)) {
            return valor;
        }
    }

    return null;
}

function diasDesdeCopilotoAPS(data) {
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

function limparDocumentoCopilotoAPS(valor) {
    return String(valor || "")
        .replace(/\D/g, "");
}

function formatarDocumentoCopilotoAPS(valor) {
    const doc =
        limparDocumentoCopilotoAPS(valor);

    if (doc.length === 11) {
        return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }

    return valor || "-";
}

function escaparCopilotoAPS(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/* ==========================================================
   COPILOTO APS V2 — INTEGRAÇÃO COM MOTOR PREDITIVO
   Coloque este bloco ao final do copilotoAPS.js
   ========================================================== */

async function comandoPreditivoCopilotoAPS(pergunta) {
    if (typeof carregarMotorPredicaoAPS === "function") {
        await carregarMotorPredicaoAPS();
    }

    const dados =
        window.motorPredicaoAPSAtual || {};

    const predicoes =
        dados.predicoes || [];

    const t =
        normalizarCopilotoAPS(pergunta);

    let lista = predicoes;

    if (t.includes("abandono")) {
        lista =
            predicoes.filter(p => p.abandono.probabilidade >= 60)
                .sort((a, b) => b.abandono.probabilidade - a.abandono.probabilidade);
    } else if (t.includes("internacao") || t.includes("internação")) {
        lista =
            predicoes.filter(p => p.internacao.probabilidade >= 60)
                .sort((a, b) => b.internacao.probabilidade - a.internacao.probabilidade);
    } else if (t.includes("descompens")) {
        lista =
            predicoes.filter(p => p.descompensacao.probabilidade >= 60)
                .sort((a, b) => b.descompensacao.probabilidade - a.descompensacao.probabilidade);
    } else if (t.includes("territorio") || t.includes("território")) {
        renderizarRespostaTerritorialCopilotoV2(dados.territorios || []);
        return;
    } else {
        lista =
            predicoes
                .filter(p => p.scoreGeral >= 60)
                .sort((a, b) => b.scoreGeral - a.scoreGeral);
    }

    renderizarRespostaPreditivaCopilotoV2(lista.slice(0, 50), pergunta);
}

function renderizarRespostaPreditivaCopilotoV2(lista, pergunta) {
    const container =
        document.getElementById("respostaCopilotoAPS");

    if (!container) return;

    container.innerHTML = `
        <div class="form-section" style="border-left:5px solid var(--purple);">
            <h3 style="margin-top:0;">🔮 Copiloto APS Preditivo</h3>
            <p>
                Encontrei ${lista.length} paciente(s) relacionados à pergunta:
                <strong>${escaparCopilotoAPS(pergunta)}</strong>
            </p>
            <p style="color:var(--text-muted);">
                Modelo atual: predição explicável por score ponderado.
            </p>
        </div>

        <div class="form-section">
            <h3 style="margin-top:0;">📋 Lista preditiva</h3>

            <div style="overflow-x:auto;">
                <table class="table-sintaxe">
                    <thead>
                        <tr>
                            <th>Paciente</th>
                            <th>Equipe / UBS</th>
                            <th>Score</th>
                            <th>Abandono</th>
                            <th>Internação</th>
                            <th>Descompensação</th>
                            <th>Fatores</th>
                            <th>Ações</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${lista.map(p => `
                            <tr>
                                <td>
                                    <strong>${escaparCopilotoAPS(p.nome || "Sem nome")}</strong>
                                    <small>CPF: ${escaparCopilotoAPS(p.cpf || "-")}</small>
                                </td>
                                <td>
                                    ${escaparCopilotoAPS(p.equipe || "-")}
                                    <small>${escaparCopilotoAPS(p.ubs || "-")}</small>
                                </td>
                                <td><strong>${p.scoreGeral}%</strong><small>${escaparCopilotoAPS(p.prioridade)}</small></td>
                                <td>${p.abandono.probabilidade}%</td>
                                <td>${p.internacao.probabilidade}%</td>
                                <td>${p.descompensacao.probabilidade}%</td>
                                <td><small>${escaparCopilotoAPS([...new Set(p.fatores)].slice(0, 5).join(", "))}</small></td>
                                <td>
                                    <button class="btn-table-action btn-edit" onclick="abrirAtendimentoExistente?.('${escaparCopilotoAPS(p.cpf || "")}', '${escaparCopilotoAPS(p.cns || "")}')">
                                        📋 Prontuário
                                    </button>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderizarRespostaTerritorialCopilotoV2(territorios) {
    const container =
        document.getElementById("respostaCopilotoAPS");

    if (!container) return;

    container.innerHTML = `
        <div class="form-section" style="border-left:5px solid var(--info);">
            <h3 style="margin-top:0;">🌎 Gêmeo Digital Territorial</h3>
            <p style="color:var(--text-muted);">
                Simulação de pressão assistencial por território.
            </p>
        </div>

        <div class="form-section">
            <div style="overflow-x:auto;">
                <table class="table-sintaxe">
                    <thead>
                        <tr>
                            <th>Território</th>
                            <th>Status</th>
                            <th>População</th>
                            <th>Alto risco</th>
                            <th>Score médio</th>
                            <th>Pressão</th>
                            <th>Recomendação</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${territorios.slice(0, 20).map(t => `
                            <tr>
                                <td><strong>${escaparCopilotoAPS(t.territorio)}</strong></td>
                                <td>${escaparCopilotoAPS(t.status)}</td>
                                <td>${t.populacao}</td>
                                <td>${t.altoRisco}</td>
                                <td>${t.scoreMedio}%</td>
                                <td><strong>${t.pressaoAssistencial}</strong></td>
                                <td>${escaparCopilotoAPS(t.recomendacao)}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

const executarCopilotoAPSOriginal =
    window.executarCopilotoAPS || executarCopilotoAPS;

window.executarCopilotoAPS = async function() {
    const input =
        document.getElementById("inputCopilotoAPS");

    const pergunta =
        String(input?.value || "").trim();

    const t =
        normalizarCopilotoAPS(pergunta);

    if (
        t.includes("prever") ||
        t.includes("predizer") ||
        t.includes("risco de abandono") ||
        t.includes("risco de internacao") ||
        t.includes("risco de internação") ||
        t.includes("descompens") ||
        t.includes("gemeo digital") ||
        t.includes("gêmeo digital") ||
        t.includes("pressao assistencial") ||
        t.includes("pressão assistencial")
    ) {
        await comandoPreditivoCopilotoAPS(pergunta);
        return;
    }

    await executarCopilotoAPSOriginal();
};


/* ==========================================================
   GLOBAL
   ========================================================== */

window.executarCopilotoAPS = executarCopilotoAPS;
window.comandoRapidoCopilotoAPS = comandoRapidoCopilotoAPS;
window.abrirCopilotoAPS = abrirCopilotoAPS;
window.fecharCopilotoAPS = fecharCopilotoAPS;
window.exportarResultadoCopilotoAPSCSV = exportarResultadoCopilotoAPSCSV;
window.enviarResultadoCopilotoParaCentralAPS = enviarResultadoCopilotoParaCentralAPS;
window.copiarResumoCopilotoAPS = copiarResumoCopilotoAPS;
