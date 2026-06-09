/* ==========================================================
   🎯 CENTRAL OPERACIONAL APS 2.0 — SINTAXEHUB
   Supabase: pacientes + atendimentos + interacoes_busca_ativa
   ========================================================== */

let centralAPSCache = [];
let centralAPSListaAtual = [];
let pacienteInteracaoCentralAPS = null;

/* ==========================================================
   CARREGAMENTO PRINCIPAL
   ========================================================== */

async function carregarCentralAPS() {
    const container =
        document.getElementById("listaCentralAPS");

    if (!container) return;

    if (typeof supabaseClient === "undefined") {
        container.innerHTML =
            `<p style="color:var(--danger);">Supabase não carregado.</p>`;
        return;
    }

    container.innerHTML =
        `<p style="color:var(--text-muted);">Carregando filas operacionais...</p>`;

    try {
        const { data: pacientes, error: erroPacientes } =
            await supabaseClient
                .from("pacientes")
                .select(`
                    id,
                    nome,
                    cpf,
                    cns,
                    telefone,
                    cep,
                    endereco,
                    bairro,
                    cidade,
                    ubs,
                    equipe,
                    ubs_vinculacao,
                    equipe_esf
                `)
                .limit(5000);

        if (erroPacientes) {
            console.error("Erro ao carregar pacientes:", erroPacientes);
            container.innerHTML =
                `<p style="color:var(--danger);">Erro ao carregar pacientes.</p>`;
            return;
        }

        const { data: atendimentos, error: erroAtendimentos } =
            await supabaseClient
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
                    data_atendimento,
                    criado_em,
                    ubs_vinculacao,
                    equipe_esf
                `)
                .order("data_atendimento", { ascending: false })
                .limit(10000);

        if (erroAtendimentos) {
            console.error("Erro ao carregar atendimentos:", erroAtendimentos);
            container.innerHTML =
                `<p style="color:var(--danger);">Erro ao carregar atendimentos.</p>`;
            return;
        }

        centralAPSCache =
            consolidarBaseCentralAPS(
                pacientes || [],
                atendimentos || []
            );

        carregarFiltrosCentralAPS(centralAPSCache);
        aplicarFilaCentralAPS("CRITICOS");

    } catch (erro) {
        console.error("Erro geral Central APS:", erro);
        container.innerHTML =
            `<p style="color:var(--danger);">Falha ao carregar Central APS.</p>`;
    }
}

/* ==========================================================
   CONSOLIDAÇÃO
   ========================================================== */

function consolidarBaseCentralAPS(pacientes, atendimentos) {
    const mapa = new Map();

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
            endereco: p.endereco || "",
            bairro: p.bairro || "",
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
                endereco: "",
                bairro: "",
                cidade: "",
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
                ultimo_atendimento: null
            };

        if (!atual.nome && a.nome_paciente) {
            atual.nome = a.nome_paciente;
        }

        if (valorSimCentralAPS(a.has)) atual.has = "Sim";
        if (valorSimCentralAPS(a.dm)) atual.dm = "Sim";
        if (valorSimCentralAPS(a.gestante)) atual.gestante = "Sim";
        if (valorSimCentralAPS(a.tb)) atual.tb = "Sim";
        if (valorSimCentralAPS(a.hansen)) atual.hansen = "Sim";

        if (a.risco_global) {
            atual.risco_global = a.risco_global;
        }

        if (a.risco_pontos !== null && a.risco_pontos !== undefined) {
            atual.risco_pontos = Number(a.risco_pontos || 0);
        }

        const prazo =
            a.reavaliacaoDias ??
            a.retorno_dias ??
            atual.prazo;

        atual.prazo =
            prazo !== null && prazo !== undefined
                ? Number(prazo)
                : atual.prazo;

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
   FILTROS E FILAS
   ========================================================== */

function carregarFiltrosCentralAPS(base) {
    carregarSelectCentralAPS(
        "filtroCentralEquipe",
        base.map(p => p.equipe || "Não informado"),
        "Todas as equipes"
    );

    carregarSelectCentralAPS(
        "filtroCentralUBS",
        base.map(p => p.ubs || "Não informado"),
        "Todas as UBS"
    );
}

function carregarSelectCentralAPS(id, valores, rotulo) {
    const select =
        document.getElementById(id);

    if (!select) return;

    const valorAtual =
        select.value || "TODOS";

    const unicos =
        [...new Set(valores.filter(Boolean))]
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

    if (valorAtual === "TODOS" || unicos.includes(valorAtual)) {
        select.value =
            valorAtual;
    }
}

function aplicarFilaCentralAPS(fila = null) {
    const filaAtiva =
        fila ||
        document.getElementById("filtroFilaCentralAPS")?.value ||
        "CRITICOS";

    const seletorFila =
        document.getElementById("filtroFilaCentralAPS");

    if (seletorFila) {
        seletorFila.value =
            filaAtiva;
    }

    const equipe =
        document.getElementById("filtroCentralEquipe")?.value || "TODOS";

    const ubs =
        document.getElementById("filtroCentralUBS")?.value || "TODOS";

    const termo =
        document.getElementById("buscaCentralAPS")?.value?.trim() || "";

    let base =
        [...centralAPSCache];

    if (equipe !== "TODOS") {
        base =
            base.filter(p =>
                String(p.equipe || "Não informado") === equipe
            );
    }

    if (ubs !== "TODOS") {
        base =
            base.filter(p =>
                String(p.ubs || "Não informado") === ubs
            );
    }

    if (termo) {
        const t =
            normalizarCentralAPS(termo);

        base =
            base.filter(p =>
                normalizarCentralAPS(`
                    ${p.nome}
                    ${p.cpf}
                    ${p.cns}
                    ${p.telefone}
                    ${p.ubs}
                    ${p.equipe}
                `).includes(t)
            );
    }

    base =
        filtrarPorFilaCentralAPS(base, filaAtiva);

    base.sort((a, b) =>
        Number(a.prazo ?? 9999) - Number(b.prazo ?? 9999)
    );

    centralAPSListaAtual =
        base;

    atualizarCardsCentralAPS();
    renderizarListaCentralAPS(base, filaAtiva);
}

function filtrarPorFilaCentralAPS(base, fila) {
    if (fila === "CRITICOS") {
        return base.filter(p =>
            Number(p.prazo) === 0 ||
            normalizarCentralAPS(p.risco_global).includes("alto") ||
            Number(p.risco_pontos || 0) >= 6
        );
    }

    if (fila === "HAS") {
        return base.filter(p => valorSimCentralAPS(p.has));
    }

    if (fila === "DM") {
        return base.filter(p => valorSimCentralAPS(p.dm));
    }

    if (fila === "GESTANTES") {
        return base.filter(p => valorSimCentralAPS(p.gestante));
    }

    if (fila === "TB") {
        return base.filter(p => valorSimCentralAPS(p.tb));
    }

    if (fila === "HANSEN") {
        return base.filter(p => valorSimCentralAPS(p.hansen));
    }

    return base;
}

/* ==========================================================
   CARDS
   ========================================================== */

function atualizarCardsCentralAPS() {
    const base =
        centralAPSCache || [];

    setTextoCentralAPS(
        "centralTotalCriticos",
        base.filter(p =>
            Number(p.prazo) === 0 ||
            normalizarCentralAPS(p.risco_global).includes("alto") ||
            Number(p.risco_pontos || 0) >= 6
        ).length
    );

    setTextoCentralAPS(
        "centralTotalHAS",
        base.filter(p => valorSimCentralAPS(p.has)).length
    );

    setTextoCentralAPS(
        "centralTotalDM",
        base.filter(p => valorSimCentralAPS(p.dm)).length
    );

    setTextoCentralAPS(
        "centralTotalGestantes",
        base.filter(p => valorSimCentralAPS(p.gestante)).length
    );

    setTextoCentralAPS(
        "centralTotalTB",
        base.filter(p => valorSimCentralAPS(p.tb)).length
    );

    setTextoCentralAPS(
        "centralTotalHansen",
        base.filter(p => valorSimCentralAPS(p.hansen)).length
    );
}

/* ==========================================================
   TABELA OPERACIONAL
   ========================================================== */

function renderizarListaCentralAPS(base, fila) {
    const container =
        document.getElementById("listaCentralAPS");

    if (!container) return;

    if (!base.length) {
        container.innerHTML =
            `<p style="color:var(--text-muted);">Nenhum paciente encontrado nesta fila.</p>`;
        return;
    }

    container.innerHTML = `
        <table class="table-sintaxe">
            <thead>
                <tr>
                    <th>Paciente</th>
                    <th>Equipe</th>
                    <th>Linhas</th>
                    <th>Risco</th>
                    <th>Prazo</th>
                    <th>Ações</th>
                </tr>
            </thead>

            <tbody>
                ${base.slice(0, 500).map(p => `
                    <tr>
                        <td>
                            <strong>${escaparCentralAPS(p.nome || "Sem nome")}</strong>
                            <small>CPF: ${escaparCentralAPS(p.cpf || "-")} | CNS: ${escaparCentralAPS(p.cns || "-")}</small>
                            <small>📞 ${escaparCentralAPS(p.telefone || "-")}</small>
                        </td>

                        <td>
                            ${escaparCentralAPS(p.equipe || "-")}
                            <small>${escaparCentralAPS(p.ubs || "-")}</small>
                        </td>

                        <td>${badgesLinhasCentralAPS(p)}</td>

                        <td>${badgeRiscoCentralAPS(p)}</td>

                        <td>${badgePrazoCentralAPS(p.prazo)}</td>

                        <td>
                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                <button
                                    class="btn-table-action btn-edit"
                                    onclick="abrirAtendimentoExistente('${escaparCentralAPS(p.cpf || "")}', '${escaparCentralAPS(p.cns || "")}')">
                                    Prontuário
                                </button>

                                <button
                                    class="btn-table-action btn-ok"
                                    onclick="abrirWhatsAppCentralAPS('${escaparCentralAPS(p.telefone || "")}', '${escaparCentralAPS(p.nome || "")}')">
                                    WhatsApp
                                </button>

                                <button
                                    class="btn-table-action btn-warn"
                                    onclick="abrirModalInteracaoCentralAPS('${escaparCentralAPS(p.cpf || "")}', '${escaparCentralAPS(p.cns || "")}')">
                                    Interação
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>

        ${
            base.length > 500
                ? `<p style="color:var(--text-muted); margin-top:10px;">
                    Exibindo 500 de ${base.length} registros.
                   </p>`
                : ""
        }
    `;
}

/* ==========================================================
   INTERAÇÃO / BUSCA ATIVA
   ========================================================== */

function abrirModalInteracaoCentralAPS(cpf, cns) {
    pacienteInteracaoCentralAPS =
        centralAPSCache.find(p =>
            String(p.cpf || "") === String(cpf || "") ||
            String(p.cns || "") === String(cns || "")
        ) || null;

    if (!pacienteInteracaoCentralAPS) {
        mostrarToast?.("⚠️ Paciente não localizado.");
        return;
    }

    const modal =
        document.getElementById("modalInteracaoCentralAPS");

    if (modal) {
        modal.style.display =
            "flex";
    }

    setTextoCentralAPS(
        "interacaoPacienteNome",
        pacienteInteracaoCentralAPS.nome || "-"
    );

    setTextoCentralAPS(
        "interacaoPacienteDocumento",
        `CPF: ${pacienteInteracaoCentralAPS.cpf || "-"} | CNS: ${pacienteInteracaoCentralAPS.cns || "-"}`
    );

    const obs =
        document.getElementById("interacaoObservacao");

    if (obs) obs.value = "";
}

function fecharModalInteracaoCentralAPS() {
    const modal =
        document.getElementById("modalInteracaoCentralAPS");

    if (modal) {
        modal.style.display =
            "none";
    }

    pacienteInteracaoCentralAPS =
        null;
}

async function salvarInteracaoCentralAPS() {
    if (!pacienteInteracaoCentralAPS) {
        mostrarToast?.("⚠️ Nenhum paciente selecionado.");
        return;
    }

    if (typeof supabaseClient === "undefined") {
        mostrarToast?.("❌ Supabase não carregado.");
        return;
    }

    const usuario =
        window.usuarioLogado || {};

    const payload = {
        paciente_cpf: pacienteInteracaoCentralAPS.cpf || null,
        paciente_cns: pacienteInteracaoCentralAPS.cns || null,
        paciente_nome: pacienteInteracaoCentralAPS.nome || null,

        tipo_contato: document.getElementById("interacaoTipoContato")?.value || "Ligação",
        resultado: document.getElementById("interacaoResultado")?.value || "Atendido",
        observacao: document.getElementById("interacaoObservacao")?.value || null,

        equipe: pacienteInteracaoCentralAPS.equipe || null,
        ubs: pacienteInteracaoCentralAPS.ubs || null,

        usuario_id: usuario.id || null,
        usuario_nome: usuario.nome || usuario.email || null,
        usuario_email: usuario.email || null,

        criado_em: new Date().toISOString()
    };

    const { error } =
        await supabaseClient
            .from("interacoes_busca_ativa")
            .insert(payload);

    if (error) {
        console.error("Erro ao salvar interação:", error);
        mostrarToast?.("❌ Erro ao salvar interação. Verifique a tabela interacoes_busca_ativa.");
        return;
    }

    mostrarToast?.("✅ Interação registrada.");
    fecharModalInteracaoCentralAPS();
}

/* ==========================================================
   WHATSAPP / EXPORTAÇÃO
   ========================================================== */

function abrirWhatsAppCentralAPS(telefone, nome) {
    const numero =
        String(telefone || "").replace(/\D/g, "");

    if (!numero) {
        mostrarToast?.("⚠️ Telefone não informado.");
        return;
    }

    const mensagem =
        encodeURIComponent(
            `Olá, ${nome || ""}. Aqui é da equipe de saúde. Estamos entrando em contato para acompanhamento pela Unidade de Saúde.`
        );

    window.open(
        `https://wa.me/55${numero}?text=${mensagem}`,
        "_blank"
    );
}

function exportarCentralAPSCSV() {
    const base =
        centralAPSListaAtual || [];

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
            "prazo"
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
            p.prazo
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
        `central_aps_${new Date().toISOString().slice(0,10)}.csv`;

    a.click();

    URL.revokeObjectURL(url);
}

/* ==========================================================
   HELPERS
   ========================================================== */

function valorSimCentralAPS(valor) {
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

function normalizarCentralAPS(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function setTextoCentralAPS(id, valor) {
    const el =
        document.getElementById(id);

    if (el) {
        el.innerText =
            valor;
    }
}

function badgesLinhasCentralAPS(p) {
    const badges = [];

    if (valorSimCentralAPS(p.has)) badges.push(`<span class="status-badge status-danger">HAS</span>`);
    if (valorSimCentralAPS(p.dm)) badges.push(`<span class="status-badge status-success">DM</span>`);
    if (valorSimCentralAPS(p.gestante)) badges.push(`<span class="status-badge status-warning">Gestante</span>`);
    if (valorSimCentralAPS(p.tb)) badges.push(`<span class="status-badge status-info">TB</span>`);
    if (valorSimCentralAPS(p.hansen)) badges.push(`<span class="status-badge status-info">Hanseníase</span>`);

    return badges.length
        ? `<div style="display:flex; gap:6px; flex-wrap:wrap;">${badges.join("")}</div>`
        : `<span style="color:var(--text-muted);">-</span>`;
}

function badgeRiscoCentralAPS(p) {
    const risco =
        p.risco_global || "Não informado";

    const r =
        normalizarCentralAPS(risco);

    if (r.includes("alto") || Number(p.risco_pontos || 0) >= 6) {
        return `<span class="status-badge status-danger">${escaparCentralAPS(risco)}</span>`;
    }

    if (r.includes("moderado") || r.includes("medio")) {
        return `<span class="status-badge status-warning">${escaparCentralAPS(risco)}</span>`;
    }

    return `<span class="status-badge status-info">${escaparCentralAPS(risco)}</span>`;
}

function badgePrazoCentralAPS(prazo) {
    if (prazo === null || prazo === undefined || Number.isNaN(Number(prazo))) {
        return `<span style="color:var(--text-muted);">Sem prazo</span>`;
    }

    const dias =
        Number(prazo);

    if (dias === 0) {
        return `<span class="status-badge status-danger">Crítico</span>`;
    }

    if (dias <= 30) {
        return `<span class="status-badge status-warning">${dias} dias</span>`;
    }

    return `<span class="status-badge status-success">${dias} dias</span>`;
}

function escaparCentralAPS(valor) {
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

window.carregarCentralAPS = carregarCentralAPS;
window.aplicarFilaCentralAPS = aplicarFilaCentralAPS;
window.abrirModalInteracaoCentralAPS = abrirModalInteracaoCentralAPS;
window.fecharModalInteracaoCentralAPS = fecharModalInteracaoCentralAPS;
window.salvarInteracaoCentralAPS = salvarInteracaoCentralAPS;
window.abrirWhatsAppCentralAPS = abrirWhatsAppCentralAPS;
window.exportarCentralAPSCSV = exportarCentralAPSCSV;
