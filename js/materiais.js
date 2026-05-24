/* ==========================================================
   📦 SOLICITAÇÕES DE MATERIAIS / FARMÁCIA — SUPABASE
   Fluxo:
   PENDENTE → AUTORIZADO → ENTREGUE
   PENDENTE → NEGADO
   ========================================================== */

let itensSolicitacao = [];

/* ==========================================================
   AUDITORIA
   ========================================================== */

function getUsuarioMateriais() {
    const usuario = window.usuarioLogado || {};

    return {
        usuario_id: usuario.id || null,
        usuario_nome: usuario.nome || usuario.email || null,
        usuario_perfil: usuario.perfil || null
    };
}

/* ==========================================================
   ABRIR / FECHAR MODAL
   ========================================================== */

function abrirModuloSolicitacoesMateriais() {
    const modal = document.getElementById("modalSolicitacoesMateriais");

    if (modal) {
        modal.style.display = "block";
    }

    limparSolicitacaoMaterial();
}

function fecharModuloSolicitacoesMateriais() {
    const modal = document.getElementById("modalSolicitacoesMateriais");

    if (modal) {
        modal.style.display = "none";
    }
}

/* ==========================================================
   ADICIONAR ITEM
   ========================================================== */

function adicionarItemSolicitacao() {
    const nome = document.getElementById("itemNome")?.value.trim();
    const qtd = document.getElementById("itemQtd")?.value;
    const unidade = document.getElementById("itemUnidade")?.value;
    const categoria = document.getElementById("itemCategoria")?.value;

    if (!nome || !qtd) {
        mostrarToast?.("⚠️ Informe item e quantidade.");
        return;
    }

    itensSolicitacao.push({
        nome,
        qtd: Number(qtd),
        unidade,
        categoria
    });

    document.getElementById("itemNome").value = "";
    document.getElementById("itemQtd").value = "1";

    renderizarItensSolicitacao();
}

function removerItemSolicitacao(index) {
    itensSolicitacao.splice(index, 1);
    renderizarItensSolicitacao();
}

function renderizarItensSolicitacao() {
    const tbody = document.getElementById("tabelaItensSolicitacao");

    if (!tbody) return;

    if (itensSolicitacao.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="color:var(--text-muted);">
                    Nenhum item adicionado.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = itensSolicitacao.map((item, index) => `
        <tr>
            <td>${item.nome}</td>
            <td>${item.qtd}</td>
            <td>${item.unidade}</td>
            <td>${item.categoria}</td>
            <td>
                <button onclick="removerItemSolicitacao(${index})">
                    Remover
                </button>
            </td>
        </tr>
    `).join("");
}

/* ==========================================================
   SALVAR SOLICITAÇÃO NO SUPABASE
   ========================================================== */

async function salvarSolicitacaoMaterial() {
    if (typeof supabaseClient === "undefined") {
        mostrarToast?.("❌ Supabase não carregado.");
        return;
    }

    if (itensSolicitacao.length === 0) {
        mostrarToast?.("⚠️ Adicione pelo menos um item.");
        return;
    }

    const auditoria = getUsuarioMateriais();

    const payload = {
        destino: document.getElementById("solDestino")?.value || null,
        solicitante: document.getElementById("solSolicitante")?.value || auditoria.usuario_nome,
        setor: document.getElementById("solSetor")?.value || null,
        prioridade: document.getElementById("solPrioridade")?.value || "Rotina",
        observacoes: document.getElementById("solObservacoes")?.value || null,

        itens: itensSolicitacao,

        status: "PENDENTE",
        data_solicitacao: new Date().toISOString(),

        autorizado_por: null,
        autorizado_em: null,
        negado_por: null,
        negado_em: null,
        entregue_por: null,
        entregue_em: null,

        ...auditoria
    };

    const { error } = await supabaseClient
        .from("solicitacoes_materiais")
        .insert(payload);

    if (error) {
        console.error("Erro ao salvar solicitação:", error);
        mostrarToast?.("❌ Erro ao salvar solicitação.");
        return;
    }

    mostrarToast?.("✅ Solicitação enviada como PENDENTE.");

    fecharModuloSolicitacoesMateriais();
    limparSolicitacaoMaterial();
    carregarHistoricoSolicitacoes?.();
    atualizarDashboardEstoque?.();
}

/* ==========================================================
   HISTÓRICO
   ========================================================== */

async function carregarHistoricoSolicitacoes() {
    const container = document.getElementById("historicoSolicitacoes");

    if (!container) return;

    const { data, error } = await supabaseClient
        .from("solicitacoes_materiais")
        .select("*")
        .order("data_solicitacao", { ascending: false });

    if (error) {
        console.error("Erro ao carregar solicitações:", error);
        container.innerHTML = `
            <p style="color:var(--danger);">
                Erro ao carregar histórico.
            </p>
        `;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = `
            <p style="color:var(--text-muted);">
                Nenhuma solicitação registrada.
            </p>
        `;
        return;
    }

    container.innerHTML = data.map(sol => {
        const itens = Array.isArray(sol.itens) ? sol.itens : [];

        return `
            <div style="
                background:var(--bg-card);
                border:1px solid var(--border);
                border-radius:10px;
                padding:15px;
                margin-bottom:12px;
            ">
                <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
                    <div>
                        <strong>${sol.destino || "-"}</strong>
                        <span style="color:var(--text-muted);">
                            • ${sol.setor || "-"}
                        </span>
                    </div>

                    <span style="
                        padding:4px 8px;
                        border-radius:6px;
                        font-size:12px;
                        font-weight:bold;
                        background:${corStatusSolicitacao(sol.status)};
                        color:white;
                    ">
                        ${sol.status}
                    </span>
                </div>

                <p style="font-size:13px; color:var(--text-muted); margin:8px 0;">
                    Solicitante: ${sol.solicitante || "-"} |
                    Prioridade: ${sol.prioridade || "-"} |
                    Data: ${formatarDataHora(sol.data_solicitacao)}
                </p>

                <ul style="margin-top:8px;">
                    ${itens.map(item => `
                        <li>
                            ${item.qtd} ${item.unidade} — 
                            <strong>${item.nome}</strong>
                            (${item.categoria})
                        </li>
                    `).join("")}
                </ul>

                ${
                    sol.observacoes
                    ? `<p style="font-size:13px;">📝 ${sol.observacoes}</p>`
                    : ""
                }

                <p style="font-size:12px; color:var(--text-muted);">
                    Criado por: ${sol.usuario_nome || "-"}
                </p>

                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">
                    ${
                        sol.status === "PENDENTE"
                        ? `
                            <button onclick="autorizarSolicitacaoMaterial('${sol.id}')"
                                style="background:#22c55e; color:white; border:0; padding:8px 10px; border-radius:6px; cursor:pointer;">
                                Autorizar
                            </button>

                            <button onclick="negarSolicitacaoMaterial('${sol.id}')"
                                style="background:#ef4444; color:white; border:0; padding:8px 10px; border-radius:6px; cursor:pointer;">
                                Negar
                            </button>
                        `
                        : ""
                    }

                    ${
                        sol.status === "AUTORIZADO"
                        ? `
                            <button onclick="entregarSolicitacaoMaterial('${sol.id}')"
                                style="background:#2563eb; color:white; border:0; padding:8px 10px; border-radius:6px; cursor:pointer;">
                                Marcar como Entregue
                            </button>
                        `
                        : ""
                    }
                </div>

                <div style="margin-top:10px; font-size:12px; color:var(--text-muted);">
                    ${
                        sol.autorizado_por
                        ? `✅ Autorizado por ${sol.autorizado_por} em ${formatarDataHora(sol.autorizado_em)}<br>`
                        : ""
                    }

                    ${
                        sol.negado_por
                        ? `🚫 Negado por ${sol.negado_por} em ${formatarDataHora(sol.negado_em)}<br>`
                        : ""
                    }

                    ${
                        sol.entregue_por
                        ? `📦 Entregue por ${sol.entregue_por} em ${formatarDataHora(sol.entregue_em)}`
                        : ""
                    }
                </div>
            </div>
        `;
    }).join("");
}

/* ==========================================================
   ALTERAR STATUS
   ========================================================== */

async function autorizarSolicitacaoMaterial(id) {
    const usuario = getUsuarioMateriais();

    const { error } = await supabaseClient
        .from("solicitacoes_materiais")
        .update({
            status: "AUTORIZADO",
            autorizado_por: usuario.usuario_nome,
            autorizado_em: new Date().toISOString()
        })
        .eq("id", id);

    if (error) {
        console.error("Erro ao autorizar:", error);
        mostrarToast?.("❌ Erro ao autorizar solicitação.");
        return;
    }

    mostrarToast?.("✅ Solicitação autorizada.");
    carregarHistoricoSolicitacoes();
    atualizarDashboardEstoque?.();
}

async function negarSolicitacaoMaterial(id) {
    const motivo = prompt("Informe o motivo da negativa:");

    const usuario = getUsuarioMateriais();

    const { error } = await supabaseClient
        .from("solicitacoes_materiais")
        .update({
            status: "NEGADO",
            negado_por: usuario.usuario_nome,
            negado_em: new Date().toISOString(),
            motivo_negativa: motivo || null
        })
        .eq("id", id);

    if (error) {
        console.error("Erro ao negar:", error);
        mostrarToast?.("❌ Erro ao negar solicitação.");
        return;
    }

    mostrarToast?.("🚫 Solicitação negada.");
    carregarHistoricoSolicitacoes();
    atualizarDashboardEstoque?.();
}

async function entregarSolicitacaoMaterial(id) {
    const usuario = getUsuarioMateriais();

    const { error } = await supabaseClient
        .from("solicitacoes_materiais")
        .update({
            status: "ENTREGUE",
            entregue_por: usuario.usuario_nome,
            entregue_em: new Date().toISOString()
        })
        .eq("id", id);

    if (error) {
        console.error("Erro ao entregar:", error);
        mostrarToast?.("❌ Erro ao marcar como entregue.");
        return;
    }

    mostrarToast?.("📦 Solicitação entregue.");
    carregarHistoricoSolicitacoes();
    atualizarDashboardEstoque?.();
}

/* ==========================================================
   DASHBOARD ESTOQUE
   ========================================================== */

async function atualizarDashboardEstoque() {
    const { data, error } = await supabaseClient
        .from("solicitacoes_materiais")
        .select("status");

    if (error) {
        console.error("Erro dashboard estoque:", error);
        return;
    }

    const banco = data || [];

    const pendentes = banco.filter(x => x.status === "PENDENTE").length;
    const aprovadas = banco.filter(x => x.status === "AUTORIZADO").length;
    const entregues = banco.filter(x => x.status === "ENTREGUE").length;

    const dashPend = document.getElementById("dashSolicitacoesPendentes");
    const dashAprov = document.getElementById("dashSolicitacoesAprovadas");
    const dashEntr = document.getElementById("dashSolicitacoesEntregues");

    if (dashPend) dashPend.innerText = pendentes;
    if (dashAprov) dashAprov.innerText = aprovadas;
    if (dashEntr) dashEntr.innerText = entregues;
}

/* ==========================================================
   LIMPAR
   ========================================================== */

function limparSolicitacaoMaterial() {
    itensSolicitacao = [];

    [
        "solSolicitante",
        "solSetor",
        "solObservacoes",
        "itemNome"
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    const qtd = document.getElementById("itemQtd");
    if (qtd) qtd.value = "1";

    renderizarItensSolicitacao();
}

/* ==========================================================
   HELPERS
   ========================================================== */

function corStatusSolicitacao(status) {
    if (status === "PENDENTE") return "#f59e0b";
    if (status === "AUTORIZADO") return "#22c55e";
    if (status === "ENTREGUE") return "#2563eb";
    if (status === "NEGADO") return "#ef4444";
    return "#64748b";
}

function formatarDataHora(valor) {
    if (!valor) return "-";

    return new Date(valor).toLocaleString("pt-BR");
}

/* ==========================================================
   GLOBAL
   ========================================================== */

window.abrirModuloSolicitacoesMateriais = abrirModuloSolicitacoesMateriais;
window.fecharModuloSolicitacoesMateriais = fecharModuloSolicitacoesMateriais;
window.adicionarItemSolicitacao = adicionarItemSolicitacao;
window.removerItemSolicitacao = removerItemSolicitacao;
window.salvarSolicitacaoMaterial = salvarSolicitacaoMaterial;
window.carregarHistoricoSolicitacoes = carregarHistoricoSolicitacoes;
window.autorizarSolicitacaoMaterial = autorizarSolicitacaoMaterial;
window.negarSolicitacaoMaterial = negarSolicitacaoMaterial;
window.entregarSolicitacaoMaterial = entregarSolicitacaoMaterial;
window.atualizarDashboardEstoque = atualizarDashboardEstoque;
