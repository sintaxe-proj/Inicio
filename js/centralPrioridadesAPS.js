/* ==========================================================
   🚨 CENTRAL DE PRIORIDADES APS — SINTAXEHUB
   Fonte principal: territorio_inteligente
   Supabase-first: sem cache persistente.
   ========================================================== */

let centralPrioridadesAPSAtual = {
    lista: [],
    filtrada: [],
    fila: "CRITICOS"
};

/* ==========================================================
   CARREGAMENTO
   ========================================================== */

async function carregarCentralPrioridadesAPS() {
    const container =
        document.getElementById("listaCentralPrioridadesAPS");

    if (container) {
        container.innerHTML =
            `<p style="color:var(--text-muted);">Carregando prioridades do Território Inteligente...</p>`;
    }

    if (typeof supabaseClient === "undefined") {
        if (container) {
            container.innerHTML =
                `<p style="color:var(--danger);">Supabase não carregado.</p>`;
        }
        return;
    }

    try {
        const { data, error } =
            await supabaseClient
                .from("territorio_inteligente")
                .select("*")
                .order("score_geral", { ascending: false })
                .limit(10000);

        if (error) {
            console.error("Erro Central Prioridades:", error);

            if (container) {
                container.innerHTML =
                    `<p style="color:var(--danger);">
                        Erro ao carregar territorio_inteligente: ${error.message}
                    </p>`;
            }

            return;
        }

        centralPrioridadesAPSAtual.lista =
            data || [];

        carregarFiltrosCentralPrioridadesAPS();
        atualizarCardsCentralPrioridadesAPS();
        aplicarFilaCentralPrioridadesAPS(
            document.getElementById("filtroFilaPrioridadesAPS")?.value || "CRITICOS"
        );

    } catch (erro) {
        console.error("Erro geral Central Prioridades APS:", erro);

        if (container) {
            container.innerHTML =
                `<p style="color:var(--danger);">Erro inesperado ao carregar prioridades.</p>`;
        }
    }
}

/* ==========================================================
   FILTROS
   ========================================================== */

function carregarFiltrosCentralPrioridadesAPS() {
    const lista =
        centralPrioridadesAPSAtual.lista || [];

    preencherSelectPrioridadesAPS(
        "filtroEquipePrioridadesAPS",
        lista.map(x => x.equipe || "Não informado"),
        "Todas as equipes"
    );

    preencherSelectPrioridadesAPS(
        "filtroUBSPrioridadesAPS",
        lista.map(x => x.ubs || "Não informado"),
        "Todas as UBS"
    );
}

function preencherSelectPrioridadesAPS(id, valores, rotulo) {
    const select =
        document.getElementById(id);

    if (!select) return;

    const atual =
        select.value || "TODOS";

    const unicos =
        [...new Set((valores || []).filter(Boolean))]
            .sort();

    select.innerHTML =
        `<option value="TODOS">${rotulo}</option>`;

    unicos.forEach(valor => {
        const option =
            document.createElement("option");

        option.value =
            valor;

        option.textContent =
            valor;

        select.appendChild(option);
    });

    if (atual === "TODOS" || unicos.includes(atual)) {
        select.value =
            atual;
    }
}

function aplicarFilaCentralPrioridadesAPS(fila = null) {
    const lista =
        centralPrioridadesAPSAtual.lista || [];

    const filaSelecionada =
        fila ||
        document.getElementById("filtroFilaPrioridadesAPS")?.value ||
        "CRITICOS";

    centralPrioridadesAPSAtual.fila =
        filaSelecionada;

    const equipe =
        document.getElementById("filtroEquipePrioridadesAPS")?.value || "TODOS";

    const ubs =
        document.getElementById("filtroUBSPrioridadesAPS")?.value || "TODOS";

    const busca =
        normalizarPrioridadesAPS(
            document.getElementById("buscaPrioridadesAPS")?.value || ""
        );

    let filtrada =
        lista.filter(p => filtrarPorFilaPrioridadesAPS(p, filaSelecionada));

    if (equipe !== "TODOS") {
        filtrada =
            filtrada.filter(p => (p.equipe || "Não informado") === equipe);
    }

    if (ubs !== "TODOS") {
        filtrada =
            filtrada.filter(p => (p.ubs || "Não informado") === ubs);
    }

    if (busca) {
        filtrada =
            filtrada.filter(p => {
                const texto =
                    normalizarPrioridadesAPS(
                        [
                            p.nome,
                            p.cpf,
                            p.cns,
                            p.telefone,
                            p.equipe,
                            p.ubs,
                            p.bairro,
                            p.cep,
                            p.prioridade,
                            p.classe_risco
                        ].join(" ")
                    );

                return texto.includes(busca);
            });
    }

    filtrada =
        filtrada.sort((a, b) =>
            Number(b.score_geral || 0) - Number(a.score_geral || 0)
        );

    centralPrioridadesAPSAtual.filtrada =
        filtrada;

    renderizarCentralPrioridadesAPS(filtrada, filaSelecionada);
}

function filtrarPorFilaPrioridadesAPS(p, fila) {
    const pendencias =
        Array.isArray(p.pendencias)
            ? p.pendencias
            : [];

    const pendTxt =
        normalizarPrioridadesAPS(pendencias.join(" "));

    if (fila === "TODOS") return true;

    if (fila === "CRITICOS") {
        return (
            p.prioridade === "Crítica" ||
            p.prioridade === "Alta" ||
            Number(p.score_geral || 0) >= 60
        );
    }

    if (fila === "HAS_SEM_PA") {
        return p.has && pendTxt.includes("has sem pa");
    }

    if (fila === "DM_SEM_HBA1C") {
        return p.dm && pendTxt.includes("dm sem hba1c");
    }

    if (fila === "GESTANTES_ATRASADAS") {
        return p.gestante && (
            pendTxt.includes("gestante") ||
            Number(p.score_gestacional || 0) >= 40
        );
    }

    if (fila === "TB_SEM_ACOMPANHAMENTO") {
        return p.tb && (
            pendTxt.includes("tb") ||
            Number(p.score_abandono || 0) >= 50
        );
    }

    if (fila === "HANSEN_SEM_AVALIACAO") {
        return p.hansen && (
            pendTxt.includes("hans") ||
            Number(p.score_abandono || 0) >= 50
        );
    }

    if (fila === "RETORNO_VENCIDO") {
        return pendTxt.includes("retorno vencido");
    }

    if (fila === "SEM_ATENDIMENTO_180") {
        return pendTxt.includes("180");
    }

    return true;
}

/* ==========================================================
   CARDS
   ========================================================== */

function atualizarCardsCentralPrioridadesAPS() {
    const lista =
        centralPrioridadesAPSAtual.lista || [];

    const contar =
        fn => lista.filter(fn).length;

    setTextoPrioridadesAPS("prioridadeTotal", lista.length);

    setTextoPrioridadesAPS(
        "prioridadeCriticos",
        contar(p =>
            p.prioridade === "Crítica" ||
            Number(p.score_geral || 0) >= 80
        )
    );

    setTextoPrioridadesAPS(
        "prioridadeAlta",
        contar(p => p.prioridade === "Alta")
    );

    setTextoPrioridadesAPS(
        "prioridadeHAS",
        contar(p =>
            p.has &&
            normalizarPrioridadesAPS(
                Array.isArray(p.pendencias) ? p.pendencias.join(" ") : ""
            ).includes("has sem pa")
        )
    );

    setTextoPrioridadesAPS(
        "prioridadeDM",
        contar(p =>
            p.dm &&
            normalizarPrioridadesAPS(
                Array.isArray(p.pendencias) ? p.pendencias.join(" ") : ""
            ).includes("dm sem hba1c")
        )
    );

    setTextoPrioridadesAPS(
        "prioridadeGestantes",
        contar(p =>
            p.gestante &&
            Number(p.score_gestacional || 0) >= 40
        )
    );

    setTextoPrioridadesAPS(
        "prioridadeTB",
        contar(p => p.tb && Number(p.score_abandono || 0) >= 50)
    );

    setTextoPrioridadesAPS(
        "prioridadeHansen",
        contar(p => p.hansen && Number(p.score_abandono || 0) >= 50)
    );
}

/* ==========================================================
   RENDERIZAÇÃO
   ========================================================== */

function renderizarCentralPrioridadesAPS(lista, fila) {
    const container =
        document.getElementById("listaCentralPrioridadesAPS");

    if (!container) return;

    if (!lista.length) {
        container.innerHTML =
            `<p style="color:var(--text-muted);">
                Nenhum paciente encontrado nesta fila.
            </p>`;
        return;
    }

    container.innerHTML = `
        <div class="section-header" style="margin-bottom:12px;">
            <div>
                <h3 style="margin:0;">📋 Lista de prioridades</h3>
                <p style="color:var(--text-muted); margin:4px 0 0 0;">
                    ${lista.length} paciente(s) na fila atual.
                </p>
            </div>

            <div class="button-row">
                <button class="btn-secondary" onclick="exportarCentralPrioridadesCSV()">
                    📤 Exportar CSV
                </button>

                <button class="btn-info" onclick="gerarResumoCentralPrioridadesAPS()">
                    🧠 Resumo IA
                </button>
            </div>
        </div>

        <div style="overflow-x:auto;">
            <table class="table-sintaxe">
                <thead>
                    <tr>
                        <th>Paciente</th>
                        <th>Equipe / UBS</th>
                        <th>Prioridade</th>
                        <th>Scores</th>
                        <th>Pendências</th>
                        <th>Recomendação</th>
                        <th>Ações</th>
                    </tr>
                </thead>

                <tbody>
                    ${lista.map(p => renderizarLinhaPrioridadeAPS(p)).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderizarLinhaPrioridadeAPS(p) {
    const pendencias =
        Array.isArray(p.pendencias)
            ? p.pendencias
            : [];

    const fatores =
        Array.isArray(p.fatores)
            ? p.fatores
            : [];

    const classeBadge =
        p.prioridade === "Crítica"
            ? "status-danger"
            : p.prioridade === "Alta"
                ? "status-warning"
                : p.prioridade === "Moderada"
                    ? "status-info"
                    : "status-success";

    return `
        <tr>
            <td>
                <strong>${escaparPrioridadesAPS(p.nome || "Sem nome")}</strong>
                <small>CPF: ${formatarCPFPrioridadesAPS(p.cpf || "-")}</small>
                <small>CNS: ${escaparPrioridadesAPS(p.cns || "-")}</small>
            </td>

            <td>
                ${escaparPrioridadesAPS(p.equipe || "Não informado")}
                <small>${escaparPrioridadesAPS(p.ubs || "Não informado")}</small>
                <small>${escaparPrioridadesAPS(p.bairro || p.cep || "")}</small>
            </td>

            <td>
                <span class="status-badge ${classeBadge}">
                    ${escaparPrioridadesAPS(p.prioridade || "-")}
                </span>
                <small>${escaparPrioridadesAPS(p.classe_risco || "-")}</small>
            </td>

            <td>
                <strong>${Number(p.score_geral || 0)}</strong>
                <small>Abandono: ${Number(p.score_abandono || 0)}</small>
                <small>Internação: ${Number(p.score_internacao || 0)}</small>
                <small>Descomp.: ${Number(p.score_descompensacao || 0)}</small>
            </td>

            <td>
                ${
                    pendencias.length
                        ? pendencias.slice(0, 4).map(x =>
                            `<span class="status-badge status-warning">${escaparPrioridadesAPS(x)}</span>`
                        ).join(" ")
                        : `<span style="color:var(--text-muted);">-</span>`
                }

                ${
                    fatores.length
                        ? `<small>${escaparPrioridadesAPS(fatores.slice(0, 3).join(", "))}</small>`
                        : ""
                }
            </td>

            <td>
                <small>${escaparPrioridadesAPS(p.recomendacao_ia || "-")}</small>
            </td>

            <td>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button
                        class="btn-table-action btn-edit"
                        onclick="abrirAtendimentoExistente?.('${escaparPrioridadesAPS(p.cpf || "")}', '${escaparPrioridadesAPS(p.cns || "")}')">
                        📋 Prontuário
                    </button>

                    <button
                        class="btn-table-action btn-ok"
                        onclick="abrirLinhaTempoTerritorial?.('${escaparPrioridadesAPS(p.cpf || "")}', '${escaparPrioridadesAPS(p.cns || "")}')">
                        🧬 Linha
                    </button>

                    <button
                        class="btn-table-action btn-warn"
                        onclick="abrirPacientePrioridadeNaCentralAPS('${escaparPrioridadesAPS(p.cpf || p.cns || "")}')">
                        🎯 Central
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/* ==========================================================
   AÇÕES
   ========================================================== */

function abrirPacientePrioridadeNaCentralAPS(termo) {
    if (typeof navigate === "function") {
        navigate("central-aps");
    }

    setTimeout(() => {
        const campo =
            document.getElementById("buscaCentralAPS");

        if (campo) {
            campo.value =
                termo || "";
        }

        if (typeof aplicarFilaCentralAPS === "function") {
            aplicarFilaCentralAPS("PENDENCIAS");
        }
    }, 450);
}

function gerarResumoCentralPrioridadesAPS() {
    const lista =
        centralPrioridadesAPSAtual.filtrada || [];

    const resumo =
        [
            `Central de Prioridades APS`,
            ``,
            `Total na fila: ${lista.length}`,
            `Críticos: ${lista.filter(p => p.prioridade === "Crítica").length}`,
            `Alta prioridade: ${lista.filter(p => p.prioridade === "Alta").length}`,
            `HAS sem PA: ${lista.filter(p => p.has && normalizarPrioridadesAPS((p.pendencias || []).join(" ")).includes("has sem pa")).length}`,
            `DM sem HbA1c: ${lista.filter(p => p.dm && normalizarPrioridadesAPS((p.pendencias || []).join(" ")).includes("dm sem hba1c")).length}`,
            `Gestantes prioritárias: ${lista.filter(p => p.gestante && Number(p.score_gestacional || 0) >= 40).length}`,
            ``,
            `Ação sugerida: organizar busca ativa e agenda protegida para os primeiros pacientes da lista.`
        ].join("\n");

    if (navigator.clipboard) {
        navigator.clipboard.writeText(resumo);
        mostrarToast?.("🧠 Resumo copiado.");
    } else {
        alert(resumo);
    }
}

function exportarCentralPrioridadesCSV() {
    const lista =
        centralPrioridadesAPSAtual.filtrada || [];

    if (!lista.length) {
        mostrarToast?.("Nenhum dado para exportar.");
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
            "prioridade",
            "classe_risco",
            "score_geral",
            "score_abandono",
            "score_internacao",
            "score_descompensacao",
            "pendencias",
            "recomendacao"
        ]
    ];

    lista.forEach(p => {
        linhas.push([
            p.nome,
            p.cpf,
            p.cns,
            p.telefone,
            p.ubs,
            p.equipe,
            p.prioridade,
            p.classe_risco,
            p.score_geral,
            p.score_abandono,
            p.score_internacao,
            p.score_descompensacao,
            Array.isArray(p.pendencias) ? p.pendencias.join(" | ") : "",
            p.recomendacao_ia || ""
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
        `central_prioridades_aps_${new Date().toISOString().slice(0, 10)}.csv`;

    a.click();

    URL.revokeObjectURL(url);
}

/* ==========================================================
   HELPERS
   ========================================================== */

function setTextoPrioridadesAPS(id, valor) {
    const el =
        document.getElementById(id);

    if (el) {
        el.innerText =
            valor ?? 0;
    }
}

function normalizarPrioridadesAPS(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function formatarCPFPrioridadesAPS(valor) {
    const cpf =
        String(valor || "")
            .replace(/\D/g, "");

    if (cpf.length !== 11) {
        return valor || "-";
    }

    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function escaparPrioridadesAPS(valor) {
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

window.carregarCentralPrioridadesAPS = carregarCentralPrioridadesAPS;
window.aplicarFilaCentralPrioridadesAPS = aplicarFilaCentralPrioridadesAPS;
window.exportarCentralPrioridadesCSV = exportarCentralPrioridadesCSV;
window.gerarResumoCentralPrioridadesAPS = gerarResumoCentralPrioridadesAPS;
window.abrirPacientePrioridadeNaCentralAPS = abrirPacientePrioridadeNaCentralAPS;
