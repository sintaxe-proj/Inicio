/* ==========================================================
   📦 AUDITORIA DE ESTOQUE — SINTAXEHUB
   Tabela: movimentacoes_estoque
   ========================================================== */

let movimentacoesEstoqueCache = [];

async function carregarAuditoriaEstoque() {
    const container =
        document.getElementById("tabelaAuditoriaEstoque");

    if (!container) return;

    if (typeof supabaseClient === "undefined") {
        container.innerHTML =
            `<p style="color:var(--danger);">Supabase não carregado.</p>`;
        return;
    }

    container.innerHTML =
        `<p style="color:var(--text-muted);">Carregando movimentações...</p>`;

    const { data, error } =
        await supabaseClient
            .from("movimentacoes_estoque")
            .select("*")
            .order("criado_em", { ascending: false })
            .limit(1000);

    if (error) {
        console.error("Erro ao carregar auditoria de estoque:", error);

        container.innerHTML =
            `<p style="color:var(--danger);">Erro ao carregar auditoria.</p>`;

        return;
    }

    movimentacoesEstoqueCache =
        data || [];

    aplicarFiltrosAuditoriaEstoque();
}

function aplicarFiltrosAuditoriaEstoque() {
    const termo =
        document.getElementById("filtroAuditoriaItem")?.value?.trim() || "";

    const tipo =
        document.getElementById("filtroAuditoriaTipo")?.value || "TODOS";

    const usuario =
        document.getElementById("filtroAuditoriaUsuario")?.value?.trim() || "";

    const inicio =
        document.getElementById("filtroAuditoriaInicio")?.value || "";

    const fim =
        document.getElementById("filtroAuditoriaFim")?.value || "";

    let base =
        [...movimentacoesEstoqueCache];

    if (termo) {
        const t =
            normalizarAuditoriaEstoque(termo);

        base =
            base.filter(m =>
                normalizarAuditoriaEstoque(`
                    ${m.nome_item}
                    ${m.referencia_lote}
                    ${m.observacao}
                    ${m.origem}
                `).includes(t)
            );
    }

    if (tipo !== "TODOS") {
        base =
            base.filter(m =>
                String(m.tipo || "") === tipo
            );
    }

    if (usuario) {
        const u =
            normalizarAuditoriaEstoque(usuario);

        base =
            base.filter(m =>
                normalizarAuditoriaEstoque(`
                    ${m.usuario_nome}
                    ${m.usuario_email}
                    ${m.usuario_perfil}
                `).includes(u)
            );
    }

    if (inicio) {
        const dataInicio =
            new Date(inicio + "T00:00:00");

        base =
            base.filter(m =>
                new Date(m.criado_em) >= dataInicio
            );
    }

    if (fim) {
        const dataFim =
            new Date(fim + "T23:59:59");

        base =
            base.filter(m =>
                new Date(m.criado_em) <= dataFim
            );
    }

    atualizarCardsAuditoriaEstoque(base);
    renderizarTabelaAuditoriaEstoque(base);
}

function atualizarCardsAuditoriaEstoque(base) {
    setTextoAuditoriaEstoque("auditoriaTotalMovimentacoes", base.length);

    setTextoAuditoriaEstoque(
        "auditoriaEntradas",
        base.filter(m => m.tipo === "ENTRADA").length
    );

    setTextoAuditoriaEstoque(
        "auditoriaSaidas",
        base.filter(m => m.tipo === "SAIDA").length
    );

    setTextoAuditoriaEstoque(
        "auditoriaAjustes",
        base.filter(m => m.tipo === "AJUSTE").length
    );
}

function renderizarTabelaAuditoriaEstoque(base) {
    const container =
        document.getElementById("tabelaAuditoriaEstoque");

    if (!container) return;

    if (!base.length) {
        container.innerHTML =
            `<p style="color:var(--text-muted);">Nenhuma movimentação encontrada.</p>`;
        return;
    }

    container.innerHTML = `
        <table class="table-sintaxe">
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Item</th>
                    <th>Lote</th>
                    <th>Qtd</th>
                    <th>Saldo</th>
                    <th>Origem</th>
                    <th>Usuário</th>
                    <th>Observação</th>
                </tr>
            </thead>

            <tbody>
                ${base.map(m => `
                    <tr>
                        <td>${formatarDataHoraAuditoriaEstoque(m.criado_em)}</td>

                        <td>${badgeTipoAuditoriaEstoque(m.tipo)}</td>

                        <td>
                            <strong>${escaparAuditoriaEstoque(m.nome_item || "-")}</strong>
                            <small>ID: ${escaparAuditoriaEstoque(m.item_id || "-")}</small>
                        </td>

                        <td>${escaparAuditoriaEstoque(m.referencia_lote || "-")}</td>

                        <td>
                            <strong>${Number(m.quantidade || 0)}</strong>
                        </td>

                        <td>
                            ${Number(m.saldo_anterior || 0)}
                            →
                            <strong>${Number(m.saldo_atual || 0)}</strong>
                        </td>

                        <td>
                            ${escaparAuditoriaEstoque(m.origem || "-")}
                            ${m.origem_id ? `<small>${escaparAuditoriaEstoque(m.origem_id)}</small>` : ""}
                        </td>

                        <td>
                            ${escaparAuditoriaEstoque(m.usuario_nome || "-")}
                            <small>${escaparAuditoriaEstoque(m.usuario_email || "")}</small>
                        </td>

                        <td>${escaparAuditoriaEstoque(m.observacao || "-")}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function badgeTipoAuditoriaEstoque(tipo) {
    if (tipo === "ENTRADA") {
        return `<span class="status-badge status-success">ENTRADA</span>`;
    }

    if (tipo === "SAIDA") {
        return `<span class="status-badge status-danger">SAÍDA</span>`;
    }

    if (tipo === "AJUSTE") {
        return `<span class="status-badge status-warning">AJUSTE</span>`;
    }

    return `<span class="status-badge status-info">${escaparAuditoriaEstoque(tipo || "-")}</span>`;
}

function exportarAuditoriaEstoqueCSV() {
    const base =
        movimentacoesEstoqueCache || [];

    if (!base.length) {
        mostrarToast?.("⚠️ Nenhuma movimentação para exportar.");
        return;
    }

    const linhas = [
        [
            "data",
            "tipo",
            "item",
            "lote",
            "quantidade",
            "saldo_anterior",
            "saldo_atual",
            "origem",
            "origem_id",
            "usuario_nome",
            "usuario_email",
            "observacao"
        ]
    ];

    base.forEach(m => {
        linhas.push([
            m.criado_em,
            m.tipo,
            m.nome_item,
            m.referencia_lote,
            m.quantidade,
            m.saldo_anterior,
            m.saldo_atual,
            m.origem,
            m.origem_id,
            m.usuario_nome,
            m.usuario_email,
            m.observacao
        ]);
    });

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
        `auditoria_estoque_${new Date().toISOString().slice(0,10)}.csv`;

    a.click();

    URL.revokeObjectURL(url);
}

function limparFiltrosAuditoriaEstoque() {
    [
        "filtroAuditoriaItem",
        "filtroAuditoriaUsuario",
        "filtroAuditoriaInicio",
        "filtroAuditoriaFim"
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    const tipo =
        document.getElementById("filtroAuditoriaTipo");

    if (tipo) {
        tipo.value = "TODOS";
    }

    aplicarFiltrosAuditoriaEstoque();
}

function normalizarAuditoriaEstoque(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function setTextoAuditoriaEstoque(id, valor) {
    const el =
        document.getElementById(id);

    if (el) {
        el.innerText =
            valor;
    }
}

function formatarDataHoraAuditoriaEstoque(valor) {
    if (!valor) return "-";

    try {
        return new Date(valor).toLocaleString("pt-BR");
    } catch {
        return "-";
    }
}

function escaparAuditoriaEstoque(valor) {
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

window.carregarAuditoriaEstoque = carregarAuditoriaEstoque;
window.aplicarFiltrosAuditoriaEstoque = aplicarFiltrosAuditoriaEstoque;
window.exportarAuditoriaEstoqueCSV = exportarAuditoriaEstoqueCSV;
window.limparFiltrosAuditoriaEstoque = limparFiltrosAuditoriaEstoque;
