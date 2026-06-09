/* ==========================================================
   🗺️ MAPA TERRITORIAL APS — SINTAXEHUB
   Supabase: pacientes + atendimentos
   Visão por UBS, equipe e CEP
   ========================================================== */

let mapaTerritorialCache = [];

async function carregarMapaTerritorialAPS() {
    const container =
        document.getElementById("containerMapaTerritorial");

    if (!container) return;

    if (typeof supabaseClient === "undefined") {
        container.innerHTML =
            `<p style="color:var(--danger);">Supabase não carregado.</p>`;
        return;
    }

    container.innerHTML =
        `<p style="color:var(--text-muted);">Carregando mapa territorial...</p>`;

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

    mapaTerritorialCache =
        consolidarMapaTerritorial(
            pacientes || [],
            atendimentos || []
        );

    carregarFiltrosMapaTerritorial(mapaTerritorialCache);
    aplicarFiltrosMapaTerritorial();
}

function consolidarMapaTerritorial(pacientes, atendimentos) {
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
            cep: p.cep || "Sem CEP",
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
                cep: "Sem CEP",
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

        if (valorSimMapa(a.has)) atual.has = "Sim";
        if (valorSimMapa(a.dm)) atual.dm = "Sim";
        if (valorSimMapa(a.gestante)) atual.gestante = "Sim";
        if (valorSimMapa(a.tb)) atual.tb = "Sim";
        if (valorSimMapa(a.hansen)) atual.hansen = "Sim";

        if (a.risco_global) atual.risco_global = a.risco_global;
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

function carregarFiltrosMapaTerritorial(base) {
    carregarSelectMapa(
        "filtroMapaUBS",
        base.map(p => p.ubs || "Não informado"),
        "Todas as UBS"
    );

    carregarSelectMapa(
        "filtroMapaEquipe",
        base.map(p => p.equipe || "Não informado"),
        "Todas as equipes"
    );
}

function carregarSelectMapa(id, valores, rotulo) {
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

    if (
        valorAtual === "TODOS" ||
        unicos.includes(valorAtual)
    ) {
        select.value =
            valorAtual;
    }
}

function aplicarFiltrosMapaTerritorial() {
    const ubs =
        document.getElementById("filtroMapaUBS")?.value || "TODOS";

    const equipe =
        document.getElementById("filtroMapaEquipe")?.value || "TODOS";

    const linha =
        document.getElementById("filtroMapaLinha")?.value || "TODAS";

    const risco =
        document.getElementById("filtroMapaRisco")?.value || "TODOS";

    let base =
        [...mapaTerritorialCache];

    if (ubs !== "TODOS") {
        base =
            base.filter(p =>
                String(p.ubs || "Não informado") === ubs
            );
    }

    if (equipe !== "TODOS") {
        base =
            base.filter(p =>
                String(p.equipe || "Não informado") === equipe
            );
    }

    if (linha !== "TODAS") {
        base =
            base.filter(p => {
                if (linha === "HAS") return valorSimMapa(p.has);
                if (linha === "DM") return valorSimMapa(p.dm);
                if (linha === "GESTANTE") return valorSimMapa(p.gestante);
                if (linha === "TB") return valorSimMapa(p.tb);
                if (linha === "HANSEN") return valorSimMapa(p.hansen);
                return true;
            });
    }

    if (risco !== "TODOS") {
        if (risco === "CRITICO") {
            base =
                base.filter(p => Number(p.prazo) === 0);
        }

        if (risco === "ALTO") {
            base =
                base.filter(p =>
                    normalizarMapa(p.risco_global).includes("alto") ||
                    Number(p.risco_pontos || 0) >= 6
                );
        }
    }

    atualizarCardsMapaTerritorial(base);
    renderizarMapaTerritorial(base);
    renderizarListaCriticosMapa(base);
}

function atualizarCardsMapaTerritorial(base) {
    setTextoMapa("mapaTotalPessoas", base.length);
    setTextoMapa("mapaTotalHAS", base.filter(p => valorSimMapa(p.has)).length);
    setTextoMapa("mapaTotalDM", base.filter(p => valorSimMapa(p.dm)).length);
    setTextoMapa("mapaTotalGestantes", base.filter(p => valorSimMapa(p.gestante)).length);
    setTextoMapa("mapaTotalCriticos", base.filter(p => Number(p.prazo) === 0).length);
    setTextoMapa("mapaTotalEquipes", new Set(base.map(p => p.equipe)).size);
}

function renderizarMapaTerritorial(base) {
    const container =
        document.getElementById("containerMapaTerritorial");

    if (!container) return;

    const grupos =
        agruparPorTerritorio(base);

    const ordenados =
        Object.values(grupos)
            .sort((a, b) =>
                b.criticos - a.criticos ||
                b.total - a.total
            );

    if (!ordenados.length) {
        container.innerHTML =
            `<p style="color:var(--text-muted);">Nenhum território encontrado.</p>`;
        return;
    }

    container.innerHTML = `
        <div class="dashboard-grid">
            ${ordenados.map(g => `
                <div
                    class="dash-card"
                    onclick="filtrarCriticosPorTerritorio('${escaparMapa(g.chave)}')"
                    style="cursor:pointer;">

                    <div class="dash-icon ${classeIconeRiscoMapa(g)}">
                        ${iconeRiscoMapa(g)}
                    </div>

                    <div>
                        <h3 style="font-size:20px;">
                            ${escaparMapa(g.rotulo)}
                        </h3>

                        <p>
                            ${g.total} pessoas • ${g.criticos} críticos
                        </p>

                        <small>
                            HAS ${g.has} | DM ${g.dm} | Gest. ${g.gestantes}
                        </small>
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

function agruparPorTerritorio(base) {
    const modo =
        document.getElementById("agrupamentoMapaTerritorial")?.value || "EQUIPE";

    const grupos = {};

    base.forEach(p => {
        let chave = "";

        if (modo === "CEP") {
            chave =
                p.cep ||
                "Sem CEP";
        } else if (modo === "UBS") {
            chave =
                p.ubs ||
                "Não informado";
        } else {
            chave =
                p.equipe ||
                "Não informado";
        }

        if (!grupos[chave]) {
            grupos[chave] = {
                chave,
                rotulo: chave,
                total: 0,
                has: 0,
                dm: 0,
                gestantes: 0,
                tb: 0,
                hansen: 0,
                criticos: 0,
                altoRisco: 0,
                pacientes: []
            };
        }

        const g =
            grupos[chave];

        g.total += 1;

        if (valorSimMapa(p.has)) g.has += 1;
        if (valorSimMapa(p.dm)) g.dm += 1;
        if (valorSimMapa(p.gestante)) g.gestantes += 1;
        if (valorSimMapa(p.tb)) g.tb += 1;
        if (valorSimMapa(p.hansen)) g.hansen += 1;

        if (Number(p.prazo) === 0) g.criticos += 1;

        if (
            normalizarMapa(p.risco_global).includes("alto") ||
            Number(p.risco_pontos || 0) >= 6
        ) {
            g.altoRisco += 1;
        }

        g.pacientes.push(p);
    });

    return grupos;
}

function renderizarListaCriticosMapa(base) {
    const container =
        document.getElementById("listaCriticosMapaTerritorial");

    if (!container) return;

    const criticos =
        base
            .filter(p =>
                Number(p.prazo) === 0 ||
                normalizarMapa(p.risco_global).includes("alto") ||
                Number(p.risco_pontos || 0) >= 6
            )
            .slice(0, 50);

    if (!criticos.length) {
        container.innerHTML =
            `<p style="color:var(--text-muted);">Nenhum paciente crítico encontrado nos filtros atuais.</p>`;
        return;
    }

    container.innerHTML = `
        <table class="table-sintaxe">
            <thead>
                <tr>
                    <th>Paciente</th>
                    <th>Território</th>
                    <th>Linhas</th>
                    <th>Risco</th>
                    <th>Prazo</th>
                    <th>Ação</th>
                </tr>
            </thead>

            <tbody>
                ${criticos.map(p => `
                    <tr>
                        <td>
                            <strong>${escaparMapa(p.nome || "Sem nome")}</strong>
                            <small>${escaparMapa(p.cpf || "-")} | ${escaparMapa(p.telefone || "-")}</small>
                        </td>

                        <td>
                            ${escaparMapa(p.equipe || "-")}
                            <small>${escaparMapa(p.ubs || "-")} | CEP ${escaparMapa(p.cep || "-")}</small>
                        </td>

                        <td>${badgesLinhasMapa(p)}</td>

                        <td>${badgeRiscoMapa(p)}</td>

                        <td>${badgePrazoMapa(p.prazo)}</td>

                        <td>
                            <button
                                class="btn-table-action btn-edit"
                                onclick="abrirAtendimentoExistente('${escaparMapa(p.cpf || "")}', '${escaparMapa(p.cns || "")}')">
                                Abrir
                            </button>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function filtrarCriticosPorTerritorio(chave) {
    const modo =
        document.getElementById("agrupamentoMapaTerritorial")?.value || "EQUIPE";

    let base =
        [...mapaTerritorialCache];

    base =
        base.filter(p => {
            if (modo === "CEP") return String(p.cep || "Sem CEP") === chave;
            if (modo === "UBS") return String(p.ubs || "Não informado") === chave;
            return String(p.equipe || "Não informado") === chave;
        });

    renderizarListaCriticosMapa(base);
}

function exportarMapaTerritorialCSV() {
    const base =
        mapaTerritorialCache || [];

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
            "cep",
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
            p.cep,
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
        `mapa_territorial_${new Date().toISOString().slice(0,10)}.csv`;

    a.click();

    URL.revokeObjectURL(url);
}

function valorSimMapa(valor) {
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

function normalizarMapa(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function classeIconeRiscoMapa(grupo) {
    if (grupo.criticos > 0) return "icon-red";
    if (grupo.altoRisco > 0) return "icon-yellow";
    return "icon-green";
}

function iconeRiscoMapa(grupo) {
    if (grupo.criticos > 0) return "🔴";
    if (grupo.altoRisco > 0) return "🟡";
    return "🟢";
}

function badgesLinhasMapa(p) {
    const badges = [];

    if (valorSimMapa(p.has)) badges.push(`<span class="status-badge status-danger">HAS</span>`);
    if (valorSimMapa(p.dm)) badges.push(`<span class="status-badge status-success">DM</span>`);
    if (valorSimMapa(p.gestante)) badges.push(`<span class="status-badge status-warning">Gestante</span>`);
    if (valorSimMapa(p.tb)) badges.push(`<span class="status-badge status-info">TB</span>`);
    if (valorSimMapa(p.hansen)) badges.push(`<span class="status-badge status-info">Hanseníase</span>`);

    return badges.length
        ? `<div style="display:flex; gap:6px; flex-wrap:wrap;">${badges.join("")}</div>`
        : `<span style="color:var(--text-muted);">-</span>`;
}

function badgeRiscoMapa(p) {
    const risco =
        p.risco_global || "Não informado";

    const r =
        normalizarMapa(risco);

    if (r.includes("alto") || Number(p.risco_pontos || 0) >= 6) {
        return `<span class="status-badge status-danger">${escaparMapa(risco)}</span>`;
    }

    if (r.includes("moderado") || r.includes("medio")) {
        return `<span class="status-badge status-warning">${escaparMapa(risco)}</span>`;
    }

    return `<span class="status-badge status-info">${escaparMapa(risco)}</span>`;
}

function badgePrazoMapa(prazo) {
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

function setTextoMapa(id, valor) {
    const el =
        document.getElementById(id);

    if (el) {
        el.innerText =
            valor;
    }
}

function escaparMapa(valor) {
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

window.carregarMapaTerritorialAPS = carregarMapaTerritorialAPS;
window.aplicarFiltrosMapaTerritorial = aplicarFiltrosMapaTerritorial;
window.exportarMapaTerritorialCSV = exportarMapaTerritorialCSV;
window.filtrarCriticosPorTerritorio = filtrarCriticosPorTerritorio;
