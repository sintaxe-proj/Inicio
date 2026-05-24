/* ==========================================================
   📦 SOLICITAÇÕES DE MATERIAIS / FARMÁCIA — 100% SUPABASE
   Busca paciente por CPF
   Fluxo:
   PENDENTE → AUTORIZADO → ENTREGUE
   PENDENTE → NEGADO
   ========================================================== */

let itensSolicitacao = [];

/* ==========================================================
   ABRIR / FECHAR MODAL
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
    const nome = document.getElementById("itemNome")?.value.trim();
    const quantidade = parseInt(document.getElementById("itemQtd")?.value);
    const unidade = document.getElementById("itemUnidade")?.value;
    const categoria = document.getElementById("itemCategoria")?.value;

    if (!nome) {
        alert("Informe o material.");
        return;
    }

    if (!quantidade || quantidade <= 0) {
        alert("Quantidade inválida.");
        return;
    }

    itensSolicitacao.push({
        id: gerarIdItemSolicitacao(),
        nome,
        quantidade,
        unidade,
        categoria
    });

    limparCamposItem();
    renderizarTabelaItensSolicitacao();
}

/* ==========================================================
   RENDERIZAR TABELA DE ITENS
   ========================================================== */

function renderizarTabelaItensSolicitacao() {
    const tbody = document.getElementById("tabelaItensSolicitacao");

    if (!tbody) return;

    tbody.innerHTML = "";

    if (itensSolicitacao.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="padding:10px; text-align:center; color:#94a3b8;">
                    Nenhum item adicionado.
                </td>
            </tr>
        `;
        return;
    }

    itensSolicitacao.forEach((item, index) => {
        tbody.innerHTML += `
            <tr>
                <td style="padding:8px; border:1px solid #334155;">${item.nome}</td>
                <td style="padding:8px; border:1px solid #334155;">${item.quantidade}</td>
                <td style="padding:8px; border:1px solid #334155;">${item.unidade || "-"}</td>
                <td style="padding:8px; border:1px solid #334155;">${item.categoria || "-"}</td>
                <td style="padding:8px; border:1px solid #334155;">
                    <button onclick="removerItemSolicitacao(${index})"
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

function removerItemSolicitacao(index) {
    itensSolicitacao.splice(index, 1);
    renderizarTabelaItensSolicitacao();
}

/* ==========================================================
   SALVAR SOLICITAÇÃO — SUPABASE
   ========================================================== */

async function salvarSolicitacaoMaterial() {
    const usuarioAtual = await supabaseClient.auth.getUser();

    if (usuarioAtual.error || !usuarioAtual.data.user) {
        alert("Faça login novamente.");
        return;
    }

    if (itensSolicitacao.length === 0) {
        alert("Adicione pelo menos um item.");
        return;
    }

    const usuario = usuarioAtual.data.user;

    const cpfPaciente =
        document.getElementById("solPacienteCpf")?.value?.replace(/\D/g, "") ||
        document.getElementById("pacienteCpf")?.value?.replace(/\D/g, "") ||
        window.pacienteSelecionado?.cpf?.replace(/\D/g, "") ||
        "";

    if (!cpfPaciente) {
        alert("Informe o CPF do paciente.");
        return;
    }

    const paciente = await buscarPacienteSolicitacaoPorCpf(cpfPaciente);

    if (!paciente) {
        alert("Paciente não encontrado no Supabase pelo CPF informado.");
        return;
    }

    const solicitacao = {
        usuario_id: usuario.id,

        paciente_id: paciente.id,
        paciente_nome: paciente.nome || "",
        paciente_cpf: paciente.cpf || "",
        paciente_cns: paciente.cns || "",

        destino: document.getElementById("solDestino")?.value || "",
        solicitante: document.getElementById("solSolicitante")?.value || "",
        setor: document.getElementById("solSetor")?.value || "",
        prioridade: document.getElementById("solPrioridade")?.value || "NORMAL",

        itens: itensSolicitacao,
        observacoes: document.getElementById("solObservacoes")?.value || "",

        status: "PENDENTE",

        solicitado_em: new Date().toISOString(),
        autorizado_em: null,
        autorizado_por: null,
        entregue_em: null,
        entregue_por: null,
        negado_em: null,
        negado_por: null,
        motivo_negativa: null
    };

    const { data, error } = await supabaseClient
        .from("solicitacoes_materiais")
        .insert([solicitacao])
        .select()
        .single();

    if (error) {
        console.error("Erro ao salvar solicitação:", error);
        alert("Erro ao salvar solicitação no Supabase.");
        return;
    }

    await registrarHistoricoSolicitacao(
        data.id,
        "PENDENTE",
        `Solicitação criada para o paciente ${paciente.nome || "-"} | CPF: ${paciente.cpf || "-"}`
    );

    limparSolicitacaoMaterial();
    carregarHistoricoSolicitacoes();

    mostrarToast?.("✅ Solicitação enviada para pendência.");
}

/* ==========================================================
   BUSCAR PACIENTE POR CPF
   ========================================================== */

async function buscarPacienteSolicitacaoPorCpf(cpf) {
    const cpfLimpo = String(cpf || "").replace(/\D/g, "");

    if (!cpfLimpo) return null;

    const { data, error } = await supabaseClient
        .from("pacientes")
        .select("id, nome, cpf, cns, data_nascimento, telefone")
        .eq("cpf", cpfLimpo)
        .maybeSingle();

    if (error) {
        console.error("Erro ao buscar paciente por CPF:", error);
        return null;
    }

    return data;
}

/* ==========================================================
   CARREGAR SOLICITAÇÕES
   ========================================================== */

async function carregarHistoricoSolicitacoes() {
    const container = document.getElementById("historicoSolicitacoes");

    if (!container) return;

    container.innerHTML = `
        <div style="padding:15px; text-align:center; color:#94a3b8;">
            Carregando solicitações...
        </div>
    `;

    const { data, error } = await supabaseClient
        .from("solicitacoes_materiais")
        .select("*")
        .order("solicitado_em", { ascending: false });

    if (error) {
        console.error("Erro ao carregar solicitações:", error);

        container.innerHTML = `
            <div style="padding:15px; text-align:center; color:#ef4444;">
                Erro ao carregar solicitações.
            </div>
        `;

        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div style="padding:15px; text-align:center; color:#94a3b8;">
                Nenhuma solicitação registrada.
            </div>
        `;
        return;
    }

    container.innerHTML = "";

    data.forEach(sol => {
        container.innerHTML += montarCardSolicitacao(sol);
    });
}

/* ==========================================================
   MONTAR CARD
   ========================================================== */

function montarCardSolicitacao(sol) {
    const itens = Array.isArray(sol.itens) ? sol.itens : [];

    return `
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
                    <strong>📦 ${sol.destino || "Solicitação de material"}</strong>

                    <div style="color:#94a3b8; font-size:12px; margin-top:5px;">
                        Solicitado em: ${formatarDataHora(sol.solicitado_em)}
                    </div>

                    <div style="color:#e5e7eb; font-size:13px; margin-top:5px;">
                        <strong>Paciente:</strong> ${sol.paciente_nome || "-"}
                    </div>

                    <div style="color:#94a3b8; font-size:12px;">
                        CPF: ${sol.paciente_cpf || "-"} | CNS: ${sol.paciente_cns || "-"}
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
                        ${sol.status || "PENDENTE"}
                    </span>
                </div>
            </div>

            <hr style="border-color:#334155; margin:10px 0;">

            <div><strong>Solicitante:</strong> ${sol.solicitante || "-"}</div>
            <div><strong>Setor:</strong> ${sol.setor || "-"}</div>
            <div><strong>Prioridade:</strong> ${sol.prioridade || "-"}</div>

            <div style="margin-top:10px;">
                <strong>Itens:</strong>
                <ul style="margin-top:5px;">
                    ${itens.map(item => `
                        <li>
                            ${item.nome} — ${item.quantidade} ${item.unidade || ""}
                        </li>
                    `).join("")}
                </ul>
            </div>

            ${sol.observacoes ? `
                <div style="margin-top:10px;">
                    <strong>Observações:</strong> ${sol.observacoes}
                </div>
            ` : ""}

            ${sol.motivo_negativa ? `
                <div style="margin-top:10px; color:#fca5a5;">
                    <strong>Motivo da negativa:</strong> ${sol.motivo_negativa}
                </div>
            ` : ""}

            <div style="
                display:flex;
                gap:8px;
                flex-wrap:wrap;
                margin-top:15px;
            ">
                ${sol.status === "PENDENTE" ? `
                    <button onclick="autorizarSolicitacaoMaterial('${sol.id}')"
                        style="
                            background:#22c55e;
                            color:white;
                            border:0;
                            padding:8px 12px;
                            border-radius:6px;
                            cursor:pointer;
                        ">
                        Autorizar
                    </button>

                    <button onclick="negarSolicitacaoMaterial('${sol.id}')"
                        style="
                            background:#ef4444;
                            color:white;
                            border:0;
                            padding:8px 12px;
                            border-radius:6px;
                            cursor:pointer;
                        ">
                        Negar
                    </button>
                ` : ""}

                ${sol.status === "AUTORIZADO" ? `
                    <button onclick="entregarSolicitacaoMaterial('${sol.id}')"
                        style="
                            background:#3b82f6;
                            color:white;
                            border:0;
                            padding:8px 12px;
                            border-radius:6px;
                            cursor:pointer;
                        ">
                        Entregar
                    </button>
                ` : ""}

                <button onclick="verHistoricoSolicitacao('${sol.id}')"
                    style="
                        background:#64748b;
                        color:white;
                        border:0;
                        padding:8px 12px;
                        border-radius:6px;
                        cursor:pointer;
                    ">
                    Histórico
                </button>
            </div>
        </div>
    `;
}

/* ==========================================================
   AUTORIZAR SOLICITAÇÃO
   ========================================================== */

async function autorizarSolicitacaoMaterial(id) {
    const usuarioAtual = await supabaseClient.auth.getUser();

    if (usuarioAtual.error || !usuarioAtual.data.user) {
        alert("Faça login novamente.");
        return;
    }

    const usuario = usuarioAtual.data.user;

    const { data: solicitacao } = await supabaseClient
        .from("solicitacoes_materiais")
        .select("paciente_nome, paciente_cpf")
        .eq("id", id)
        .maybeSingle();

    const { error } = await supabaseClient
        .from("solicitacoes_materiais")
        .update({
            status: "AUTORIZADO",
            autorizado_em: new Date().toISOString(),
            autorizado_por: usuario.id
        })
        .eq("id", id);

    if (error) {
        console.error("Erro ao autorizar:", error);
        alert("Erro ao autorizar solicitação.");
        return;
    }

    await registrarHistoricoSolicitacao(
        id,
        "AUTORIZADO",
        `Solicitação autorizada para ${solicitacao?.paciente_nome || "-"} | CPF: ${solicitacao?.paciente_cpf || "-"}`
    );

    carregarHistoricoSolicitacoes();
    mostrarToast?.("✅ Solicitação autorizada.");
}

/* ==========================================================
   NEGAR SOLICITAÇÃO
   ========================================================== */

async function negarSolicitacaoMaterial(id) {
    const motivo = prompt("Informe o motivo da negativa:");

    if (!motivo) {
        alert("Informe o motivo da negativa.");
        return;
    }

    const usuarioAtual = await supabaseClient.auth.getUser();

    if (usuarioAtual.error || !usuarioAtual.data.user) {
        alert("Faça login novamente.");
        return;
    }

    const usuario = usuarioAtual.data.user;

    const { data: solicitacao } = await supabaseClient
        .from("solicitacoes_materiais")
        .select("paciente_nome, paciente_cpf")
        .eq("id", id)
        .maybeSingle();

    const { error } = await supabaseClient
        .from("solicitacoes_materiais")
        .update({
            status: "NEGADO",
            negado_em: new Date().toISOString(),
            negado_por: usuario.id,
            motivo_negativa: motivo
        })
        .eq("id", id);

    if (error) {
        console.error("Erro ao negar:", error);
        alert("Erro ao negar solicitação.");
        return;
    }

    await registrarHistoricoSolicitacao(
        id,
        "NEGADO",
        `Solicitação negada para ${solicitacao?.paciente_nome || "-"} | CPF: ${solicitacao?.paciente_cpf || "-"} | Motivo: ${motivo}`
    );

    carregarHistoricoSolicitacoes();
    mostrarToast?.("❌ Solicitação negada.");
}

/* ==========================================================
   ENTREGAR SOLICITAÇÃO
   ========================================================== */

async function entregarSolicitacaoMaterial(id) {
    const confirmar = confirm("Confirmar entrega dos materiais?");

    if (!confirmar) return;

    const usuarioAtual = await supabaseClient.auth.getUser();

    if (usuarioAtual.error || !usuarioAtual.data.user) {
        alert("Faça login novamente.");
        return;
    }

    const usuario = usuarioAtual.data.user;

    const { data: solicitacao } = await supabaseClient
        .from("solicitacoes_materiais")
        .select("paciente_nome, paciente_cpf")
        .eq("id", id)
        .maybeSingle();

    const { error } = await supabaseClient
        .from("solicitacoes_materiais")
        .update({
            status: "ENTREGUE",
            entregue_em: new Date().toISOString(),
            entregue_por: usuario.id
        })
        .eq("id", id);

    if (error) {
        console.error("Erro ao entregar:", error);
        alert("Erro ao registrar entrega.");
        return;
    }

    await registrarHistoricoSolicitacao(
        id,
        "ENTREGUE",
        `Material entregue para ${solicitacao?.paciente_nome || "-"} | CPF: ${solicitacao?.paciente_cpf || "-"}`
    );

    carregarHistoricoSolicitacoes();
    mostrarToast?.("📦 Material entregue e histórico atualizado.");
}

/* ==========================================================
   REGISTRAR HISTÓRICO
   ========================================================== */

async function registrarHistoricoSolicitacao(solicitacaoId, status, descricao) {
    const usuarioAtual = await supabaseClient.auth.getUser();
    const usuario = usuarioAtual?.data?.user || null;

    const { error } = await supabaseClient
        .from("historico_solicitacoes_materiais")
        .insert([{
            solicitacao_id: solicitacaoId,
            status,
            descricao,
            usuario_id: usuario?.id || null,
            criado_em: new Date().toISOString()
        }]);

    if (error) {
        console.error("Erro ao registrar histórico:", error);
    }
}

/* ==========================================================
   VER HISTÓRICO
   ========================================================== */

async function verHistoricoSolicitacao(solicitacaoId) {
    const { data, error } = await supabaseClient
        .from("historico_solicitacoes_materiais")
        .select("*")
        .eq("solicitacao_id", solicitacaoId)
        .order("criado_em", { ascending: true });

    if (error) {
        console.error("Erro ao buscar histórico:", error);
        alert("Erro ao buscar histórico.");
        return;
    }

    if (!data || data.length === 0) {
        alert("Nenhum histórico encontrado.");
        return;
    }

    const texto = data.map(h => {
        return `${formatarDataHora(h.criado_em)} — ${h.status}\n${h.descricao}`;
    }).join("\n\n");

    alert(texto);
}

/* ==========================================================
   LIMPEZA
   ========================================================== */

function limparCamposItem() {
    const nome = document.getElementById("itemNome");
    const qtd = document.getElementById("itemQtd");

    if (nome) nome.value = "";
    if (qtd) qtd.value = 1;
}

function limparSolicitacaoMaterial() {
    itensSolicitacao = [];

    const obs = document.getElementById("solObservacoes");
    if (obs) obs.value = "";

    const cpf = document.getElementById("solPacienteCpf");
    if (cpf) cpf.value = "";

    renderizarTabelaItensSolicitacao();
}

/* ==========================================================
   AUXILIARES
   ========================================================== */

function gerarIdItemSolicitacao() {
    return "ITEM-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
}

function formatarDataHora(data) {
    if (!data) return "-";
    return new Date(data).toLocaleString("pt-BR");
}

function corStatusSolicitacao(status) {
    switch (status) {
        case "PENDENTE":
            return "#f59e0b";

        case "AUTORIZADO":
            return "#22c55e";

        case "NEGADO":
            return "#ef4444";

        case "ENTREGUE":
            return "#3b82f6";

        default:
            return "#64748b";
    }
}
