/* ==========================================================================
   🗂️ BASE TERRITORIAL 2.0
   Supabase puro
   pacientes + atendimentos
   Arquivo: js/banco.js
   ========================================================================== */

let baseTerritorialCache = [];

/* ==========================================================================
   CARREGAMENTO PRINCIPAL
   ========================================================================== */

async function carregarTabelaBanco() {
    const container =
        document.getElementById("tabelaBancoContainer");

    if (!container) return;

    if (typeof supabaseClient === "undefined") {
        container.innerHTML = `
            <p style="color:var(--danger);">
                Supabase não carregado.
            </p>
        `;
        return;
    }

    container.innerHTML = `
        <p style="color:var(--text-muted);">
            Carregando dados do Supabase...
        </p>
    `;

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
                    numero,
                    complemento,
                    ubs,
                    equipe,
                    ubs_vinculacao,
                    equipe_esf
                `)
                .order("nome", { ascending: true })
                .limit(5000);

        if (erroPacientes) {
            console.error("Erro ao carregar pacientes:", erroPacientes);
            container.innerHTML = `
                <p style="color:var(--danger);">
                    Erro ao carregar pacientes.
                </p>
            `;
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
                    ciapSelecionado,
                    inputBuscaCIAPS,
                    data_atendimento,
                    criado_em,
                    ubs_vinculacao,
                    equipe_esf
                `)
                .order("data_atendimento", { ascending: false })
                .limit(10000);

        if (erroAtendimentos) {
            console.error("Erro ao carregar atendimentos:", erroAtendimentos);
            container.innerHTML = `
                <p style="color:var(--danger);">
                    Erro ao carregar atendimentos.
                </p>
            `;
            return;
        }

        baseTerritorialCache =
            consolidarBaseTerritorial(
                pacientes || [],
                atendimentos || []
            );

        carregarFiltrosBaseTerritorial(baseTerritorialCache);
        aplicarFiltrosBaseTerritorial();

    } catch (erro) {
        console.error("Erro geral Base Territorial:", erro);

        container.innerHTML = `
            <p style="color:var(--danger);">
                Falha ao carregar Base Territorial.
            </p>
        `;
    }
}

/* ==========================================================================
   CONSOLIDAÇÃO
   ========================================================================== */

function consolidarBaseTerritorial(pacientes, atendimentos) {
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
            numero: p.numero || "",
            complemento: p.complemento || "",
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
                endereco: "",
                numero: "",
                complemento: "",
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

        if (!atual.nome && a.nome_paciente) {
            atual.nome = a.nome_paciente;
        }

        if (valorSimBase(a.has)) atual.has = "Sim";
        if (valorSimBase(a.dm)) atual.dm = "Sim";
        if (valorSimBase(a.gestante)) atual.gestante = "Sim";
        if (valorSimBase(a.tb)) atual.tb = "Sim";
        if (valorSimBase(a.hansen)) atual.hansen = "Sim";

        if (a.risco_global) {
            atual.risco_global = a.risco_global;
        }

        if (a.risco_pontos !== null && a.risco_pontos !== undefined) {
            atual.risco_pontos = a.risco_pontos;
        }

        const prazo =
            a.reavaliacaoDias ??
            a.retorno_dias ??
            atual.prazo;

        atual.prazo =
            prazo !== null && prazo !== undefined
                ? Number(prazo)
                : atual.prazo;

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

function valorSimBase(valor) {
    const v = String(valor || "")
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

/* ==========================================================================
   FILTROS
   ========================================================================== */

function carregarFiltrosBaseTerritorial(base) {
    carregarSelectBase(
        "filtroEquipeBase",
        base.map(p => p.equipe || "Não informado"),
        "Todas as equipes"
    );

    carregarSelectBase(
        "filtroUBSBase",
        base.map(p => p.ubs || "Não informado"),
        "Todas as UBS"
    );
}

function carregarSelectBase(id, valores, rotuloTodos) {
    const select =
        document.getElementById(id);

    if (!select) return;

    const valorAtual =
        select.value || "TODOS";

    const unicos =
        [...new Set(valores.filter(Boolean))]
            .sort();

    select.innerHTML =
        `<option value="TODOS">${rotuloTodos}</option>`;

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
        select.value = valorAtual;
    }
}

function aplicarFiltrosBaseTerritorial() {
    const termo =
        document.getElementById("buscaBaseTerritorial")?.value?.trim() || "";

    const equipe =
        document.getElementById("filtroEquipeBase")?.value || "TODOS";

    const ubs =
        document.getElementById("filtroUBSBase")?.value || "TODOS";

    const linha =
        document.getElementById("filtroLinhaCuidadoBase")?.value || "TODAS";

    const risco =
        document.getElementById("filtroRiscoBase")?.value || "TODOS";

    const termoNormalizado =
        normalizarTextoBase(termo);

    let base =
        [...baseTerritorialCache];

    if (termoNormalizado) {
        base =
            base.filter(p => {
                const alvo =
                    normalizarTextoBase(`
                        ${p.nome}
                        ${p.cpf}
                        ${p.cns}
                        ${p.telefone}
                        ${p.ubs}
                        ${p.equipe}
                        ${p.ciap}
                    `);

                return alvo.includes(termoNormalizado);
            });
    }

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

    if (linha !== "TODAS") {
        base =
            base.filter(p => {
                if (linha === "HAS") return valorSimBase(p.has);
                if (linha === "DM") return valorSimBase(p.dm);
                if (linha === "GESTANTE") return valorSimBase(p.gestante);
                if (linha === "TB") return valorSimBase(p.tb);
                if (linha === "HANSEN") return valorSimBase(p.hansen);
                return true;
            });
    }

    if (risco !== "TODOS") {
        if (risco === "CRITICO") {
            base =
                base.filter(p => Number(p.prazo) === 0);
        }

        if (risco === "SEM_PRAZO") {
            base =
                base.filter(p =>
                    p.prazo === null ||
                    p.prazo === undefined ||
                    Number.isNaN(Number(p.prazo))
                );
        }

        if (risco === "ALTO") {
            base =
                base.filter(p =>
                    normalizarTextoBase(p.risco_global).includes("alto") ||
                    Number(p.risco_pontos || 0) >= 6
                );
        }
    }

    atualizarIndicadoresBaseTerritorial(base);
    renderizarTabelaBaseTerritorial(base);
}

function normalizarTextoBase(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

/* ==========================================================================
   INDICADORES
   ========================================================================== */

function atualizarIndicadoresBaseTerritorial(base) {
    setTextoBase("baseTotalPacientes", base.length);
    setTextoBase("baseHAS", base.filter(p => valorSimBase(p.has)).length);
    setTextoBase("baseDM", base.filter(p => valorSimBase(p.dm)).length);
    setTextoBase("baseGestantes", base.filter(p => valorSimBase(p.gestante)).length);
    setTextoBase("baseTB", base.filter(p => valorSimBase(p.tb)).length);
    setTextoBase("baseHansen", base.filter(p => valorSimBase(p.hansen)).length);
    setTextoBase("baseCriticos", base.filter(p => Number(p.prazo) === 0).length);
}

function setTextoBase(id, valor) {
    const el =
        document.getElementById(id);

    if (el) {
        el.innerText =
            valor;
    }
}

/* ==========================================================================
   TABELA
   ========================================================================== */

function renderizarTabelaBaseTerritorial(base) {
    const container =
        document.getElementById("tabelaBancoContainer");

    if (!container) return;

    if (!base.length) {
        container.innerHTML = `
            <p style="color:var(--text-muted);">
                Nenhum cidadão encontrado com os filtros selecionados.
            </p>
        `;
        return;
    }

    const registros =
        base.slice(0, 1000);

    container.innerHTML = `
        <table class="table-sintaxe">
            <thead>
                <tr>
                    <th>Cidadão</th>
                    <th>CPF / CNS</th>
                    <th>Equipe</th>
                    <th>Linhas</th>
                    <th>Risco</th>
                    <th>Prazo</th>
                    <th>Último atendimento</th>
                    <th>Ação</th>
                </tr>
            </thead>

            <tbody>
                ${registros.map(p => `
                    <tr>
                        <td>
                            <strong>${escaparBase(p.nome || "Sem nome")}</strong>
                            <small>${escaparBase(p.telefone || "-")}</small>
                        </td>

                        <td>
                            ${escaparBase(p.cpf || "-")}
                            <small>CNS: ${escaparBase(p.cns || "-")}</small>
                        </td>

                        <td>
                            ${escaparBase(p.equipe || "-")}
                            <small>${escaparBase(p.ubs || "-")}</small>
                        </td>

                        <td>
                            ${renderizarBadgesLinhasBase(p)}
                        </td>

                        <td>
                            ${renderizarBadgeRiscoBase(p)}
                        </td>

                        <td>
                            ${renderizarPrazoBase(p.prazo)}
                        </td>

                        <td>
                            ${formatarDataBase(p.ultimo_atendimento)}
                        </td>

                        <td>
                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                <button
                                    class="btn-table-action btn-edit"
                                    onclick="abrirAtendimentoExistente('${escaparBase(p.cpf || "")}', '${escaparBase(p.cns || "")}')">
                                    📋 Prontuário
                                </button>

                                <button
                                    class="btn-table-action btn-ok"
                                    onclick="abrirLinhaTempoTerritorial('${escaparBase(p.cpf || "")}', '${escaparBase(p.cns || "")}')">
                                    🧬 Linha
                                </button>

                                <button
                                    class="btn-table-action btn-warn"
                                    onclick="navigate('central-aps'); setTimeout(() => { const campo = document.getElementById('buscaCentralAPS'); if (campo) campo.value='${escaparBase(p.cpf || p.cns || "")}'; if (typeof aplicarFilaCentralAPS === 'function') aplicarFilaCentralAPS('PENDENCIAS'); }, 400);">
                                    🧭 Pendências
                                </button>

                                <button
                                    class="btn-table-action btn-info"
                                    onclick="navigate('central-aps'); setTimeout(() => { if (typeof abrirModalInteracaoCentralAPS === 'function') abrirModalInteracaoCentralAPS('${escaparBase(p.cpf || "")}', '${escaparBase(p.cns || "")}'); }, 400);">
                                    📞 Busca
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>

        ${
            base.length > registros.length
                ? `<p style="color:var(--text-muted); margin-top:10px;">
                    Exibindo ${registros.length} de ${base.length} registros filtrados.
                   </p>`
                : ""
        }
    `;

    console.log(
        `✅ Base Territorial 2.0 carregada: ${base.length} registros filtrados`
    );
}

function renderizarBadgesLinhasBase(p) {
    const badges = [];

    if (valorSimBase(p.has)) {
        badges.push(`<span class="status-badge status-danger">HAS</span>`);
    }

    if (valorSimBase(p.dm)) {
        badges.push(`<span class="status-badge status-success">DM</span>`);
    }

    if (valorSimBase(p.gestante)) {
        badges.push(`<span class="status-badge status-warning">Gestante</span>`);
    }

    if (valorSimBase(p.tb)) {
        badges.push(`<span class="status-badge status-info">TB</span>`);
    }

    if (valorSimBase(p.hansen)) {
        badges.push(`<span class="status-badge status-info">Hanseníase</span>`);
    }

    return badges.length
        ? `<div style="display:flex; gap:6px; flex-wrap:wrap;">${badges.join("")}</div>`
        : `<span style="color:var(--text-muted);">-</span>`;
}

function renderizarBadgeRiscoBase(p) {
    const risco =
        p.risco_global || "Não informado";

    const r =
        normalizarTextoBase(risco);

    if (r.includes("alto") || Number(p.risco_pontos || 0) >= 6) {
        return `<span class="status-badge status-danger">${escaparBase(risco)}</span>`;
    }

    if (r.includes("moderado") || r.includes("medio")) {
        return `<span class="status-badge status-warning">${escaparBase(risco)}</span>`;
    }

    if (r.includes("baixo")) {
        return `<span class="status-badge status-success">${escaparBase(risco)}</span>`;
    }

    return `<span class="status-badge status-info">${escaparBase(risco)}</span>`;
}

function renderizarPrazoBase(prazo) {
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

/* ==========================================================================
   EXPORTAR CSV
   ========================================================================== */

function exportarBaseTerritorialCSV() {
    const base =
        baseTerritorialCache || [];

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
        `base_territorial_${new Date().toISOString().slice(0,10)}.csv`;

    a.click();

    URL.revokeObjectURL(url);
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

function limparBuscaBaseTerritorial() {
    const campo =
        document.getElementById("buscaBaseTerritorial");

    if (campo) {
        campo.value = "";
    }

    aplicarFiltrosBaseTerritorial();
}

function formatarDataBase(valor) {
    if (!valor) return "-";

    try {
        return new Date(valor).toLocaleDateString("pt-BR");
    } catch {
        return "-";
    }
}

function escaparBase(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/* ==========================================================================
   START
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    const busca =
        document.getElementById("buscaBaseTerritorial");

    if (busca) {
        busca.addEventListener("keyup", () => {
            clearTimeout(window.timerBuscaBase);

            window.timerBuscaBase =
                setTimeout(
                    aplicarFiltrosBaseTerritorial,
                    250
                );
        });
    }
});

/* ==========================================================================
   GLOBAL
   ========================================================================== */

window.carregarTabelaBanco = carregarTabelaBanco;
window.limparBuscaBaseTerritorial = limparBuscaBaseTerritorial;
window.aplicarFiltrosBaseTerritorial = aplicarFiltrosBaseTerritorial;
window.carregarFiltrosBaseTerritorial = carregarFiltrosBaseTerritorial;
window.exportarBaseTerritorialCSV = exportarBaseTerritorialCSV;

window.baseTerritorialCache = baseTerritorialCache;
