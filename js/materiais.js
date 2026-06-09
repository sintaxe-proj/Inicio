/* ==========================================================
   📦 SOLICITAÇÕES DE MATERIAIS / FARMÁCIA — SUPABASE
   Fluxo:
   PENDENTE → AUTORIZADO → ENTREGUE
   PENDENTE → NEGADO

   Compatível com:
   - paciente_cpf
   - paciente_cns
   - paciente_nome
   - auditoria do usuário logado
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
        usuario_email: usuario.email || null,
        usuario_perfil: usuario.perfil || null
    };
}

function usuarioPodeGerenciarMateriais() {
    const usuario = getUsuarioMateriais();

    return (
        usuario.usuario_perfil === "admin" ||
        usuario.usuario_perfil === "gestor" ||
        usuario.usuario_perfil === "coordenador"
    );
}

/* ==========================================================
   DADOS DO PACIENTE ATIVO
   ========================================================== */

function getPacienteAtivoMateriais() {
    const pacienteGlobal =
        window.pacienteAtual ||
        window.pacienteSelecionado ||
        {};

    const nome =
        document.getElementById("nomePaciente")?.value ||
        pacienteGlobal.nome ||
        pacienteGlobal.nome_paciente ||
        null;

    const cpf =
        document.getElementById("cpfPaciente")?.value?.replace(/\D/g, "") ||
        pacienteGlobal.cpf ||
        pacienteGlobal.paciente_cpf ||
        null;

    const cns =
        document.getElementById("cnsPaciente")?.value?.replace(/\D/g, "") ||
        pacienteGlobal.cns ||
        pacienteGlobal.paciente_cns ||
        null;

    return {
        paciente_nome: nome || null,
        paciente_cpf: cpf || null,
        paciente_cns: cns || null
    };
}

/* ==========================================================
   ABRIR / FECHAR MODAL
   ========================================================== */

function abrirModuloSolicitacoesMateriais() {
    const modal = document.getElementById("modalSolicitacoesMateriais");

    if (modal) {
        modal.style.display = "flex";
    }

    const solicitante =
        document.getElementById("solSolicitante");

    if (solicitante && !solicitante.value) {
        solicitante.value =
            getUsuarioMateriais().usuario_nome || "";
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

    const itemNome = document.getElementById("itemNome");
    const itemQtd = document.getElementById("itemQtd");

    if (itemNome) itemNome.value = "";
    if (itemQtd) itemQtd.value = "1";

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
            <td>${item.unidade || "-"}</td>
            <td>${item.categoria || "-"}</td>
            <td>
                <button class="btn-danger" onclick="removerItemSolicitacao(${index})">
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
    const paciente = getPacienteAtivoMateriais();

    const payload = {
        paciente_cpf: paciente.paciente_cpf,
        paciente_cns: paciente.paciente_cns,
        paciente_nome: paciente.paciente_nome,

        destino: document.getElementById("solDestino")?.value || null,
        solicitante: document.getElementById("solSolicitante")?.value || auditoria.usuario_nome,
        setor: document.getElementById("solSetor")?.value || null,
        prioridade: document.getElementById("solPrioridade")?.value || "Rotina",
        observacoes: document.getElementById("solObservacoes")?.value || null,

        itens: itensSolicitacao,

        status: "PENDENTE",
        criado_em: new Date().toISOString(),

        autorizado_por: null,
        autorizado_em: null,
        negado_por: null,
        negado_em: null,
        motivo_negativa: null,
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

async function carregarHistoricoSolicitacoes(filtrarPaciente = false) {
    const container = document.getElementById("historicoSolicitacoes");

    if (!container) return;

    if (typeof supabaseClient === "undefined") {
        container.innerHTML = `
            <p style="color:var(--danger);">
                Supabase não carregado.
            </p>
        `;
        return;
    }

    let query = supabaseClient
        .from("solicitacoes_materiais")
        .select("*")
        .order("criado_em", { ascending: false })

    const paciente = getPacienteAtivoMateriais();

    if (filtrarPaciente && paciente.paciente_cpf) {
        query = query.eq("paciente_cpf", paciente.paciente_cpf);
    }

    const { data, error } = await query;

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

        const podeGerenciar =
            usuarioPodeGerenciarMateriais();

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

                ${
                    sol.paciente_nome || sol.paciente_cpf || sol.paciente_cns
                    ? `
                        <p style="font-size:13px; color:var(--text-muted); margin:8px 0;">
                            Paciente: ${sol.paciente_nome || "-"} |
                            CPF: ${sol.paciente_cpf || "-"} |
                            CNS: ${sol.paciente_cns || "-"}
                        </p>
                    `
                    : ""
                }

                <p style="font-size:13px; color:var(--text-muted); margin:8px 0;">
                    Solicitante: ${sol.solicitante || "-"} |
                    Prioridade: ${sol.prioridade || "-"} |
                    Data: ${formatarDataHora(sol.criado_em || sol.created_at || sol.data_solicitacao)}
                </p>

                <ul style="margin-top:8px;">
                    ${itens.map(item => `
                        <li>
                            ${item.qtd || "-"} ${item.unidade || ""} — 
                            <strong>${item.nome || "-"}</strong>
                            ${item.categoria ? `(${item.categoria})` : ""}
                        </li>
                    `).join("")}
                </ul>

                ${
                    sol.observacoes
                    ? `<p style="font-size:13px;">📝 ${sol.observacoes}</p>`
                    : ""
                }

                ${
                    sol.motivo_negativa
                    ? `<p style="font-size:13px; color:#fecaca;">🚫 Motivo da negativa: ${sol.motivo_negativa}</p>`
                    : ""
                }

                <p style="font-size:12px; color:var(--text-muted);">
                    Criado por: ${sol.usuario_nome || "-"}
                    ${sol.usuario_email ? ` • ${sol.usuario_email}` : ""}
                </p>

                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">
                    ${
                        sol.status === "PENDENTE" && podeGerenciar
                        ? `
                            <button class="btn-success" onclick="autorizarSolicitacaoMaterial('${sol.id}')">
                                ✅ Autorizar
                            </button>

                            <button class="btn-danger" onclick="negarSolicitacaoMaterial('${sol.id}')">
                                🚫 Negar
                            </button>
                        `
                        : ""
                    }

                    ${
                        sol.status === "AUTORIZADO" && podeGerenciar
                        ? `
                            <button class="btn-primary" onclick="entregarSolicitacaoMaterial('${sol.id}')">
                                📦 Marcar como Entregue
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
   HISTÓRICO DO PACIENTE ATIVO
   ========================================================== */

async function carregarSolicitacoesPacienteAtual() {
    await carregarHistoricoSolicitacoes(true);
}

/* ==========================================================
   ALTERAR STATUS
   ========================================================== */

async function autorizarSolicitacaoMaterial(id) {
    if (!usuarioPodeGerenciarMateriais()) {
        mostrarToast?.("🚫 Apenas gestores podem autorizar solicitações.");
        return;
    }

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
    if (!usuarioPodeGerenciarMateriais()) {
        mostrarToast?.("🚫 Apenas gestores podem negar solicitações.");
        return;
    }

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
    if (!usuarioPodeGerenciarMateriais()) {
        mostrarToast?.("🚫 Apenas gestores podem entregar solicitações.");
        return;
    }

    const usuario = getUsuarioMateriais();

    const { data: solicitacao, error: erroBusca } = await supabaseClient
        .from("solicitacoes_materiais")
        .select("*")
        .eq("id", id)
        .single();

    if (erroBusca || !solicitacao) {
        console.error("Erro ao buscar solicitação:", erroBusca);
        mostrarToast?.("❌ Erro ao localizar solicitação.");
        return;
    }

    if (solicitacao.status === "ENTREGUE") {
        mostrarToast?.("⚠️ Esta solicitação já foi entregue.");
        return;
    }

    const baixaOk =
        await baixarEstoquePorSolicitacao(solicitacao);

    if (!baixaOk) {
        return;
    }

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

    mostrarToast?.("📦 Solicitação entregue e estoque atualizado.");
    carregarHistoricoSolicitacoes();
    carregarEstoqueItens?.();
    atualizarDashboardEstoque?.();
}

/* ==========================================================
   DASHBOARD ESTOQUE
   ========================================================== */

async function atualizarDashboardEstoque() {
    if (typeof supabaseClient === "undefined") {
        console.warn("Supabase não carregado para dashboard de estoque.");
        return;
    }

    const { data: solicitacoes, error: erroSolicitacoes } = await supabaseClient
        .from("solicitacoes_materiais")
        .select("status");

    if (erroSolicitacoes) {
        console.error("Erro dashboard solicitações:", erroSolicitacoes);
        return;
    }

    const { data: estoque, error: erroEstoque } = await supabaseClient
        .from("estoque_itens")
        .select(`
            id,
            nome_item,
            data_validade,
            quantidade_atual,
            quantidade_minima,
            status
        `);

    if (erroEstoque) {
        console.warn("Erro dashboard estoque:", erroEstoque);
    }

    const bancoSolicitacoes = solicitacoes || [];
    const bancoEstoque = estoque || [];

    const pendentes =
        bancoSolicitacoes.filter(x => x.status === "PENDENTE").length;

    const aprovadas =
        bancoSolicitacoes.filter(x =>
            x.status === "AUTORIZADO" ||
            x.status === "APROVADO"
        ).length;

    const entregues =
        bancoSolicitacoes.filter(x => x.status === "ENTREGUE").length;

    const negadas =
        bancoSolicitacoes.filter(x => x.status === "NEGADO").length;

    const itensAtivos =
        bancoEstoque.filter(x =>
            (x.status || "ATIVO") === "ATIVO"
        ).length;

    const estoqueBaixo =
        bancoEstoque.filter(x =>
            Number(x.quantidade_atual || 0) <=
            Number(x.quantidade_minima || 0)
        ).length;

    const vencidos =
        bancoEstoque.filter(x =>
            calcularStatusValidadeEstoque(x.data_validade).tipo === "VENCIDO"
        ).length;

    const vencem30 =
        bancoEstoque.filter(x =>
            calcularStatusValidadeEstoque(x.data_validade).tipo === "VENCE_30"
        ).length;

    setTextoMateriais("dashSolicitacoesPendentes", pendentes);
    setTextoMateriais("dashSolicitacoesAprovadas", aprovadas);
    setTextoMateriais("dashSolicitacoesEntregues", entregues);
    setTextoMateriais("dashSolicitacoesNegadas", negadas);

    setTextoMateriais("dashItensEstoque", itensAtivos);
    setTextoMateriais("dashEstoqueBaixo", estoqueBaixo);
    setTextoMateriais("dashItensVencidos", vencidos);
    setTextoMateriais("dashItensVencem30", vencem30);
}

/* ==========================================================
   LIMPAR
   ========================================================== */

function limparSolicitacaoMaterial() {
    itensSolicitacao = [];

    [
        "solSetor",
        "solObservacoes",
        "itemNome"
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    const qtd = document.getElementById("itemQtd");
    if (qtd) qtd.value = "1";

    const solicitante =
        document.getElementById("solSolicitante");

    if (solicitante && !solicitante.value) {
        solicitante.value =
            getUsuarioMateriais().usuario_nome || "";
    }

    renderizarItensSolicitacao();
}

/* ==========================================================
   ESTOQUE DINÂMICO — estoque_itens
   ========================================================== */

function abrirModalCadastroEstoque() {
    const modal = document.getElementById("modalCadastroEstoque");

    if (modal) {
        modal.style.display = "flex";
    }
}

function fecharModalCadastroEstoque() {
    const modal = document.getElementById("modalCadastroEstoque");

    if (modal) {
        modal.style.display = "none";
    }
}

function limparFormularioEstoque() {
    [
        "estoqueNomeItem",
        "estoqueMarca",
        "estoqueLote",
        "estoqueFabricacao",
        "estoqueValidade",
        "estoqueQuantidadeAtual",
        "estoqueQuantidadeMinima"
    ].forEach(id => {
        const campo = document.getElementById(id);

        if (campo) {
            campo.value = "";
        }
    });
}

async function salvarItemEstoque() {
    if (typeof supabaseClient === "undefined") {
        mostrarToast?.("❌ Supabase não carregado.");
        return;
    }

    const auditoria =
        getUsuarioMateriais();

    const nomeItem =
        document.getElementById("estoqueNomeItem")?.value?.trim() || "";

    if (!nomeItem) {
        mostrarToast?.("⚠️ Informe o nome do item.");
        return;
    }

   const payload = {
       nome_item: nomeItem,
       marca: document.getElementById("estoqueMarca")?.value?.trim() || null,
       referencia_lote: document.getElementById("estoqueLote")?.value?.trim() || null,
       data_fabricacao: document.getElementById("estoqueFabricacao")?.value || null,
       data_validade: document.getElementById("estoqueValidade")?.value || null,
       quantidade_atual: Number(document.getElementById("estoqueQuantidadeAtual")?.value || 0),
       quantidade_minima: Number(document.getElementById("estoqueQuantidadeMinima")?.value || 0),
       status: "ATIVO"
    };

    const { error } = await supabaseClient
        .from("estoque_itens")
        .insert(payload);

    if (error) {
        console.error("Erro ao salvar item de estoque:", error);
        mostrarToast?.("❌ Erro ao salvar item no estoque.");
        return;
    }

    mostrarToast?.("✅ Item cadastrado no estoque.");

    limparFormularioEstoque();
    fecharModalCadastroEstoque();
    carregarEstoqueItens();
}

async function carregarEstoqueItens() {
    const container =
        document.getElementById("tabelaEstoqueItens");

    if (!container) return;

    if (typeof supabaseClient === "undefined") {
        container.innerHTML =
            `<p style="color:var(--danger);">Supabase não carregado.</p>`;
        return;
    }

    const { data, error } = await supabaseClient
        .from("estoque_itens")
        .select("*")
        .order("nome_item", { ascending: true })
        .order("data_validade", { ascending: true, nullsFirst: false });

    if (error) {
        console.error("Erro ao carregar estoque:", error);
        container.innerHTML =
            `<p style="color:var(--danger);">Erro ao carregar estoque.</p>`;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML =
            `<p style="color:var(--text-muted);">Nenhum item cadastrado no estoque.</p>`;
        atualizarDashboardEstoque?.();
        return;
    }

    container.innerHTML = `
        <table class="table-sintaxe">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Marca</th>
                    <th>Lote/Referência</th>
                    <th>Fabricação</th>
                    <th>Validade</th>
                    <th>Saldo</th>
                    <th>Mínimo</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(item => {
                    const validade =
                        calcularStatusValidadeEstoque(item.data_validade);

                    const baixo =
                        Number(item.quantidade_atual || 0) <=
                        Number(item.quantidade_minima || 0);

                    const statusSaldo =
                        baixo
                            ? `<span class="status-badge status-warning">Estoque baixo</span>`
                            : `<span class="status-badge status-success">Disponível</span>`;

                    const statusValidade =
                        renderizarBadgeValidadeEstoque(validade);

                    return `
                        <tr>
                            <td>
                                <strong>${escaparMateriais(item.nome_item || "-")}</strong>
                                <small>ID: ${escaparMateriais(item.id || "-")}</small>
                            </td>
                            <td>${escaparMateriais(item.marca || "-")}</td>
                            <td>${escaparMateriais(item.referencia_lote || "-")}</td>
                            <td>${formatarDataSimples(item.data_fabricacao)}</td>
                            <td>${formatarDataSimples(item.data_validade)}</td>
                            <td><strong>${item.quantidade_atual ?? 0}</strong></td>
                            <td>${item.quantidade_minima ?? 0}</td>
                            <td>
                                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                    ${statusSaldo}
                                    ${statusValidade}
                                </div>
                            </td>
                            <td>
                                <button
                                    class="btn-table-action btn-edit"
                                    onclick="ajustarSaldoEstoque('${item.id}', '${escaparMateriais(item.nome_item || "")}', ${Number(item.quantidade_atual || 0)})">
                                    Ajustar
                                </button>
                            </td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;

    atualizarDashboardEstoque?.();
}

async function baixarEstoquePorSolicitacao(solicitacao) {
    const itens =
        Array.isArray(solicitacao.itens)
            ? solicitacao.itens
            : [];

    if (!itens.length) {
        mostrarToast?.("⚠️ Solicitação sem itens para baixa.");
        return false;
    }

    for (const item of itens) {
        const nome =
            item.nome || item.nome_item || "";

        const quantidadeSolicitada =
            Number(item.qtd || item.quantidade || 0);

        if (!nome || quantidadeSolicitada <= 0) {
            continue;
        }

        const { data: lotes, error: erroBusca } =
            await supabaseClient
                .from("estoque_itens")
                .select("*")
                .ilike("nome_item", nome)
                .gt("quantidade_atual", 0)
                .order("data_validade", {
                    ascending: true,
                    nullsFirst: false
                });

        if (erroBusca) {
            console.error("Erro ao buscar item no estoque:", erroBusca);
            mostrarToast?.(`❌ Erro ao buscar ${nome} no estoque.`);
            return false;
        }

        if (!lotes || !lotes.length) {
            mostrarToast?.(`⚠️ Item não encontrado ou sem saldo no estoque: ${nome}`);
            return false;
        }

        const saldoTotal =
            lotes.reduce(
                (total, lote) =>
                    total + Number(lote.quantidade_atual || 0),
                0
            );

        if (saldoTotal < quantidadeSolicitada) {
            mostrarToast?.(
                `⚠️ Estoque insuficiente para ${nome}. Saldo total: ${saldoTotal}, solicitado: ${quantidadeSolicitada}.`
            );
            return false;
        }

        let restante =
            quantidadeSolicitada;

        for (const lote of lotes) {
            if (restante <= 0) break;

            const saldoLote =
                Number(lote.quantidade_atual || 0);

            if (saldoLote <= 0) continue;

            const baixa =
                Math.min(saldoLote, restante);

            const novoSaldo =
                saldoLote - baixa;

            const { error: erroUpdate } =
                await supabaseClient
                    .from("estoque_itens")
                    .update({
                        quantidade_atual: novoSaldo,
                        atualizado_em: new Date().toISOString()
                    })
                    .eq("id", lote.id);

            if (erroUpdate) {
                console.error("Erro ao baixar estoque:", erroUpdate);
                mostrarToast?.(`❌ Erro ao baixar estoque de ${nome}.`);
                return false;
            }

            await registrarMovimentacaoEstoque({
                item_id: lote.id,
                nome_item: lote.nome_item,
                referencia_lote: lote.referencia_lote,
                tipo: "SAIDA",
                quantidade: baixa,
                saldo_anterior: saldoLote,
                saldo_atual: novoSaldo,
                origem: "SOLICITACAO_MATERIAL",
                origem_id: solicitacao.id || null,
                observacao: `Baixa automática por entrega de solicitação ${solicitacao.id || ""}`.trim()
            });

            restante -= baixa;
        }
    }

    return true;
}

function formatarDataSimples(valor) {
    if (!valor) return "-";

    try {
        return new Date(valor).toLocaleDateString("pt-BR");
    } catch {
        return "-";
    }
}


/* ==========================================================
   INTELIGÊNCIA DE ESTOQUE
   ========================================================== */

function setTextoMateriais(id, valor) {
    const el =
        document.getElementById(id);

    if (el) {
        el.innerText =
            valor;
    }
}

function calcularStatusValidadeEstoque(dataValidade) {
    if (!dataValidade) {
        return {
            tipo: "SEM_VALIDADE",
            texto: "Sem validade"
        };
    }

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

    if (diffDias < 0) {
        return {
            tipo: "VENCIDO",
            texto: `Vencido há ${Math.abs(diffDias)} dia(s)`
        };
    }

    if (diffDias <= 30) {
        return {
            tipo: "VENCE_30",
            texto: `Vence em ${diffDias} dia(s)`
        };
    }

    return {
        tipo: "VALIDO",
        texto: `Válido por ${diffDias} dia(s)`
    };
}

function renderizarBadgeValidadeEstoque(validade) {
    if (!validade) {
        return `<span class="status-badge status-info">Sem validade</span>`;
    }

    if (validade.tipo === "VENCIDO") {
        return `<span class="status-badge status-danger">${validade.texto}</span>`;
    }

    if (validade.tipo === "VENCE_30") {
        return `<span class="status-badge status-warning">${validade.texto}</span>`;
    }

    if (validade.tipo === "VALIDO") {
        return `<span class="status-badge status-success">${validade.texto}</span>`;
    }

    return `<span class="status-badge status-info">${validade.texto}</span>`;
}

async function registrarMovimentacaoEstoque(dados) {
    if (typeof supabaseClient === "undefined") return;

    const usuario =
        getUsuarioMateriais();

    const payload = {
        item_id: dados.item_id || null,
        nome_item: dados.nome_item || null,
        referencia_lote: dados.referencia_lote || null,
        tipo: dados.tipo || "MOVIMENTACAO",
        quantidade: Number(dados.quantidade || 0),
        saldo_anterior: Number(dados.saldo_anterior || 0),
        saldo_atual: Number(dados.saldo_atual || 0),
        origem: dados.origem || null,
        origem_id: dados.origem_id || null,
        observacao: dados.observacao || null,
        criado_em: new Date().toISOString(),
        usuario_id: usuario.usuario_id,
        usuario_nome: usuario.usuario_nome,
        usuario_email: usuario.usuario_email,
        usuario_perfil: usuario.usuario_perfil
    };

    const { error } =
        await supabaseClient
            .from("movimentacoes_estoque")
            .insert(payload);

    if (error) {
        console.warn(
            "Movimentação de estoque não registrada. Verifique se a tabela movimentacoes_estoque existe:",
            error
        );
    }
}

async function ajustarSaldoEstoque(id, nomeItem, saldoAtual) {
    if (!usuarioPodeGerenciarMateriais()) {
        mostrarToast?.("🚫 Apenas gestores podem ajustar estoque.");
        return;
    }

    const novoValorTexto =
        prompt(
            `Informe o novo saldo para ${nomeItem}:`,
            String(saldoAtual ?? 0)
        );

    if (novoValorTexto === null) return;

    const novoSaldo =
        Number(novoValorTexto);

    if (Number.isNaN(novoSaldo) || novoSaldo < 0) {
        mostrarToast?.("⚠️ Saldo inválido.");
        return;
    }

    const { data: itemAtual, error: erroBusca } =
        await supabaseClient
            .from("estoque_itens")
            .select("*")
            .eq("id", id)
            .single();

    if (erroBusca || !itemAtual) {
        console.error("Erro ao buscar item para ajuste:", erroBusca);
        mostrarToast?.("❌ Erro ao localizar item.");
        return;
    }

    const saldoAnterior =
        Number(itemAtual.quantidade_atual || 0);

    const { error } =
        await supabaseClient
            .from("estoque_itens")
            .update({
                quantidade_atual: novoSaldo,
                atualizado_em: new Date().toISOString()
            })
            .eq("id", id);

    if (error) {
        console.error("Erro ao ajustar saldo:", error);
        mostrarToast?.("❌ Erro ao ajustar saldo.");
        return;
    }

    await registrarMovimentacaoEstoque({
        item_id: id,
        nome_item: itemAtual.nome_item,
        referencia_lote: itemAtual.referencia_lote,
        tipo: "AJUSTE",
        quantidade: novoSaldo - saldoAnterior,
        saldo_anterior: saldoAnterior,
        saldo_atual: novoSaldo,
        origem: "AJUSTE_MANUAL",
        origem_id: null,
        observacao: "Ajuste manual de saldo"
    });

    mostrarToast?.("✅ Saldo ajustado.");
    carregarEstoqueItens();
    atualizarDashboardEstoque?.();
}

function escaparMateriais(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}


/* ==========================================================
   HELPERS
   ========================================================== */

function corStatusSolicitacao(status) {
    if (status === "PENDENTE") return "#f59e0b";
    if (status === "AUTORIZADO") return "#22c55e";
    if (status === "APROVADO") return "#22c55e";
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
window.carregarSolicitacoesPacienteAtual = carregarSolicitacoesPacienteAtual;
window.autorizarSolicitacaoMaterial = autorizarSolicitacaoMaterial;
window.negarSolicitacaoMaterial = negarSolicitacaoMaterial;
window.entregarSolicitacaoMaterial = entregarSolicitacaoMaterial;
window.atualizarDashboardEstoque = atualizarDashboardEstoque;


window.abrirModalCadastroEstoque = abrirModalCadastroEstoque;
window.fecharModalCadastroEstoque = fecharModalCadastroEstoque;
window.limparFormularioEstoque = limparFormularioEstoque;
window.salvarItemEstoque = salvarItemEstoque;
window.carregarEstoqueItens = carregarEstoqueItens;
window.baixarEstoquePorSolicitacao = baixarEstoquePorSolicitacao;


window.ajustarSaldoEstoque = ajustarSaldoEstoque;
window.registrarMovimentacaoEstoque = registrarMovimentacaoEstoque;
window.calcularStatusValidadeEstoque = calcularStatusValidadeEstoque;
