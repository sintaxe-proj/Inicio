/* ==========================================================
   📦 SOLICITAÇÕES DE MATERIAIS / FARMÁCIA
   ========================================================== */

let itensSolicitacao = [];

/* ==========================================================
   ABRIR / FECHAR
   ========================================================== */

function abrirModuloSolicitacoesMateriais() {
    const modal = document.getElementById("modalSolicitacoesMateriais");

    if (modal) {
        modal.style.display = "block";
        renderizarTabelaItensSolicitacao();
        carregarHistoricoSolicitacoes();
    }
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

    const nome =
        document.getElementById("itemNome").value.trim();

    const quantidade =
        parseInt(document.getElementById("itemQtd").value);

    const unidade =
        document.getElementById("itemUnidade").value;

    const categoria =
        document.getElementById("itemCategoria").value;

    if (!nome) {
        alert("Informe o material.");
        return;
    }

    if (!quantidade || quantidade <= 0) {
        alert("Quantidade inválida.");
        return;
    }

    itensSolicitacao.push({
        id: gerarIdSolicitacao(),
        nome,
        quantidade,
        unidade,
        categoria
    });

    limparCamposItem();
    renderizarTabelaItensSolicitacao();
}

/* ==========================================================
   TABELA
   ========================================================== */

function renderizarTabelaItensSolicitacao() {

    const tbody =
        document.getElementById("tabelaItensSolicitacao");

    if (!tbody) return;

    tbody.innerHTML = "";

    if (itensSolicitacao.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5"
                    style="padding:10px; text-align:center; color:#94a3b8;">
                    Nenhum item adicionado.
                </td>
            </tr>
        `;

        return;
    }

    itensSolicitacao.forEach((item, index) => {

        tbody.innerHTML += `
            <tr>
                <td style="padding:8px; border:1px solid #334155;">
                    ${item.nome}
                </td>

                <td style="padding:8px; border:1px solid #334155;">
                    ${item.quantidade}
                </td>

                <td style="padding:8px; border:1px solid #334155;">
                    ${item.unidade}
                </td>

                <td style="padding:8px; border:1px solid #334155;">
                    ${item.categoria}
                </td>

                <td style="padding:8px; border:1px solid #334155;">
                    <button
                        onclick="removerItemSolicitacao(${index})"
                        style="
                            background:#ef4444;
                            color:white;
                            border:0;
                            padding:6px 10px;
                            border-radius:6px;
                            cursor:pointer;
                        ">
                        Remover
                    </button>
                </td>
            </tr>
        `;
    });
}

/* ==========================================================
   REMOVER ITEM
   ========================================================== */

function removerItemSolicitacao(index) {

    itensSolicitacao.splice(index, 1);

    renderizarTabelaItensSolicitacao();
}

/* ==========================================================
   LIMPEZA
   ========================================================== */

function limparCamposItem() {

    document.getElementById("itemNome").value = "";
    document.getElementById("itemQtd").value = 1;
}

function limparSolicitacaoMaterial() {

    itensSolicitacao = [];

    document.getElementById("solObservacoes").value = "";

    renderizarTabelaItensSolicitacao();
}

/* ==========================================================
   HISTÓRICO
   ========================================================== */

function carregarHistoricoSolicitacoes() {

    const container =
        document.getElementById("historicoSolicitacoes");

    if (!container) return;

    let banco =
        JSON.parse(
            localStorage.getItem("solicitacoesMateriais")
        ) || [];

    if (banco.length === 0) {

        container.innerHTML = `
            <div style="
                padding:15px;
                text-align:center;
                color:#94a3b8;
            ">
                Nenhuma solicitação registrada.
            </div>
        `;

        return;
    }

    container.innerHTML = "";

    banco.forEach(sol => {

        container.innerHTML += `

            <div style="
                background:#111827;
                border:1px solid #334155;
                border-radius:10px;
                padding:15px;
                margin-bottom:10px;
            ">

                <div style="
                    display:flex;
                    justify-content:space-between;
                    gap:10px;
                    flex-wrap:wrap;
                ">

                    <div>
                        <strong>
                            📦 ${sol.destino}
                        </strong>

                        <div style="
                            color:#94a3b8;
                            font-size:12px;
                            margin-top:5px;
                        ">
                            ${formatarDataHora(sol.data)}
                        </div>
                    </div>

                    <div>
                        <span style="
                            background:${corStatusSolicitacao(sol.status)};
                            color:white;
                            padding:5px 10px;
                            border-radius:999px;
                            font-size:12px;
                        ">
                            ${sol.status}
                        </span>
                    </div>
                </div>

                <hr style="
                    border-color:#334155;
                    margin:10px 0;
                ">

                <div>
                    <strong>Solicitante:</strong>
                    ${sol.solicitante || "-"}
                </div>

                <div>
                    <strong>Setor:</strong>
                    ${sol.setor || "-"}
                </div>

                <div>
                    <strong>Prioridade:</strong>
                    ${sol.prioridade}
                </div>

                <div style="margin-top:10px;">
                    <strong>Itens:</strong>

                    <ul style="margin-top:5px;">
                        ${sol.itens.map(item => `
                            <li>
                                ${item.nome}
                                —
                                ${item.quantidade}
                                ${item.unidade}
                            </li>
                        `).join("")}
                    </ul>
                </div>

            </div>
        `;
    });
}

/* ==========================================================
   AUXILIARES
   ========================================================== */

function gerarIdSolicitacao() {

    return "SOL-" +
        Date.now() +
        "-" +
        Math.random().toString(36).substring(2, 7);
}

function formatarDataHora(data) {

    return new Date(data).toLocaleString("pt-BR");
}

function corStatusSolicitacao(status) {

    switch(status) {

        case "PENDENTE":
            return "#f59e0b";

        case "APROVADO":
            return "#22c55e";

        case "NEGADO":
            return "#ef4444";

        case "ENTREGUE":
            return "#3b82f6";

        default:
            return "#64748b";
    }
}

async function salvarSolicitacaoMaterial() {

    const usuarioAtual =
        await supabaseClient.auth.getUser();

    if (
        usuarioAtual.error ||
        !usuarioAtual.data.user
    ) {

        alert("Faça login novamente.");
        return;

    }

    const usuario = usuarioAtual.data.user;

    const solicitacao = {

        usuario_id: usuario.id,

        destino:
            document.getElementById("solDestino")?.value || "",

        solicitante:
            document.getElementById("solSolicitante")?.value || "",

        setor:
            document.getElementById("solSetor")?.value || "",

        prioridade:
            document.getElementById("solPrioridade")?.value || "",

        itens:
            window.itensSolicitacao || [],

        observacoes:
            document.getElementById("solObservacoes")?.value || ""

    };

    const resultado =
        await supabaseClient
            .from("solicitacoes_materiais")
            .insert([solicitacao]);

    if (resultado.error) {

        console.error(resultado.error);

        alert("Erro ao salvar solicitação.");
        return;

    }

    mostrarToast("✅ Solicitação enviada.");

}
