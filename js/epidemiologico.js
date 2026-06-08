/* ==========================================================================
   📊 DASHBOARD EPIDEMIOLÓGICO TERRITORIAL
   Supabase + Chart.js
   ========================================================================== */

let graficosEpidemiologicos = {};

function abrirDashboardEpidemiologicoTerritorial() {
    const modal = document.getElementById("modalDashboardEpidemiologico");

    if (modal) {
        modal.style.display = "flex";
    }

    carregarDashboardEpidemiologicoTerritorial();
}

function fecharDashboardEpidemiologicoTerritorial() {
    const modal = document.getElementById("modalDashboardEpidemiologico");

    if (modal) {
        modal.style.display = "none";
    }
}

async function carregarDashboardEpidemiologicoTerritorial() {
    if (typeof supabaseClient === "undefined") {
        mostrarToast?.("❌ Supabase não carregado.");
        return;
    }

    if (typeof Chart === "undefined") {
        console.error("Chart.js não carregado.");

        mostrarToast?.(
            "❌ Chart.js não carregado. Verifique o script no index.html."
        );

        return;
    }

    mostrarToast?.("📊 Atualizando dashboard epidemiológico...");

    const { data: pacientes, error: erroPacientes } = await supabaseClient
        .from("pacientes")
        .select(`
            id,
            cpf,
            cns,
            nome,
            ubs,
            equipe,
            ubs_vinculacao,
            equipe_esf
        `)
        .limit(5000);

    if (erroPacientes) {
        console.error("Erro pacientes:", erroPacientes);
        mostrarToast?.("❌ Erro ao carregar pacientes.");
        return;
    }

    const { data: atendimentos, error: erroAtendimentos } = await supabaseClient
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
            reavaliacaoDias,
            retorno_dias,
            risco_global,
            risco_pontos,
            ubs_vinculacao,
            equipe_esf,
            data_atendimento,
            criado_em
        `)
        .order("data_atendimento", { ascending: false })
        .limit(10000);

    if (erroAtendimentos) {
        console.error("Erro atendimentos:", erroAtendimentos);
        mostrarToast?.("❌ Erro ao carregar atendimentos.");
        return;
    }

    const base = consolidarBaseEpidemiologica(
        pacientes || [],
        atendimentos || []
    );

    atualizarCardsEpidemiologicos(base);
    renderizarGraficosEpidemiologicos(base);

    mostrarToast?.("✅ Dashboard epidemiológico atualizado.");
}

function consolidarBaseEpidemiologica(pacientes, atendimentos) {
    const mapa = new Map();

    pacientes.forEach(p => {
        const chave = p.cpf || p.cns || p.id;

        mapa.set(chave, {
            cpf: p.cpf || "",
            cns: p.cns || "",
            nome: p.nome || "",
            ubs: p.ubs_vinculacao || p.ubs || "Não informado",
            equipe: p.equipe_esf || p.equipe || "Não informado",
            has: "Não",
            dm: "Não",
            gestante: "Não",
            tb: "Não",
            hansen: "Não",
            risco_global: "Não informado",
            risco_pontos: 0,
            prazo: null
        });
    });

    atendimentos.forEach(a => {
        const chave = a.paciente_cpf || a.cpf || a.cns;

        if (!chave) return;

        const atual = mapa.get(chave) || {
            cpf: a.paciente_cpf || a.cpf || "",
            cns: a.cns || "",
            nome: a.nome_paciente || "",
            ubs: a.ubs_vinculacao || "Não informado",
            equipe: a.equipe_esf || "Não informado",
            has: "Não",
            dm: "Não",
            gestante: "Não",
            tb: "Não",
            hansen: "Não",
            risco_global: "Não informado",
            risco_pontos: 0,
            prazo: null
        };

        atual.has = valorSimEpi(a.has) ? "Sim" : atual.has;
        atual.dm = valorSimEpi(a.dm) ? "Sim" : atual.dm;
        atual.gestante = valorSimEpi(a.gestante) ? "Sim" : atual.gestante;
        atual.tb = valorSimEpi(a.tb) ? "Sim" : atual.tb;
        atual.hansen = valorSimEpi(a.hansen) ? "Sim" : atual.hansen;

        atual.risco_global =
            a.risco_global ||
            atual.risco_global ||
            "Não informado";

        atual.risco_pontos =
            a.risco_pontos ||
            atual.risco_pontos ||
            0;

        const prazo =
            a.reavaliacaoDias ??
            a.retorno_dias ??
            atual.prazo;

        atual.prazo =
            prazo !== null && prazo !== undefined
                ? Number(prazo)
                : atual.prazo;

        if (a.ubs_vinculacao) atual.ubs = a.ubs_vinculacao;
        if (a.equipe_esf) atual.equipe = a.equipe_esf;

        mapa.set(chave, atual);
    });

    return Array.from(mapa.values());
}

function valorSimEpi(valor) {
    return String(valor || "")
        .trim()
        .toLowerCase() === "sim";
}

function atualizarCardsEpidemiologicos(base) {
    const total = base.length;
    const criticos = base.filter(p => Number(p.prazo) === 0).length;
    const has = base.filter(p => p.has === "Sim").length;
    const dm = base.filter(p => p.dm === "Sim").length;
    const gestantes = base.filter(p => p.gestante === "Sim").length;

    setTextoEpi("epiTotalPacientes", total);
    setTextoEpi("epiCriticos", criticos);
    setTextoEpi("epiHAS", has);
    setTextoEpi("epiDM", dm);
    setTextoEpi("epiGestantes", gestantes);
}

function setTextoEpi(id, valor) {
    const el = document.getElementById(id);
    if (el) el.innerText = valor;
}

function renderizarGraficosEpidemiologicos(base) {
    criarGraficoBarra("graficoLinhasCuidado", {
        labels: ["HAS", "DM", "Gestantes", "TB", "Hanseníase"],
        data: [
            base.filter(p => p.has === "Sim").length,
            base.filter(p => p.dm === "Sim").length,
            base.filter(p => p.gestante === "Sim").length,
            base.filter(p => p.tb === "Sim").length,
            base.filter(p => p.hansen === "Sim").length
        ],
        titulo: "Pessoas por linha de cuidado"
    });

    criarGraficoPizza("graficoRiscoTerritorial", contarPorCampo(base, "risco_global"), "Classificação de risco");

    criarGraficoBarra("graficoUBS", {
        labels: Object.keys(contarPorCampo(base, "ubs")).slice(0, 10),
        data: Object.values(contarPorCampo(base, "ubs")).slice(0, 10),
        titulo: "Pessoas por UBS"
    });

    criarGraficoBarra("graficoEquipe", {
        labels: Object.keys(contarPorCampo(base, "equipe")).slice(0, 10),
        data: Object.values(contarPorCampo(base, "equipe")).slice(0, 10),
        titulo: "Pessoas por equipe"
    });

    criarGraficoPizza("graficoMonitoramentoPrazo", classificarPrazos(base), "Prazos de monitoramento");

    criarGraficoBarra("graficoComorbidades", {
        labels: ["HAS + DM", "HAS + Gestante", "DM + Gestante", "TB", "Hanseníase"],
        data: [
            base.filter(p => p.has === "Sim" && p.dm === "Sim").length,
            base.filter(p => p.has === "Sim" && p.gestante === "Sim").length,
            base.filter(p => p.dm === "Sim" && p.gestante === "Sim").length,
            base.filter(p => p.tb === "Sim").length,
            base.filter(p => p.hansen === "Sim").length
        ],
        titulo: "Condições combinadas"
    });
}

function contarPorCampo(base, campo) {
    const contagem = {};

    base.forEach(item => {
        const chave = item[campo] || "Não informado";
        contagem[chave] = (contagem[chave] || 0) + 1;
    });

    return contagem;
}

function classificarPrazos(base) {
    return {
        "Crítico / vencido": base.filter(p => Number(p.prazo) === 0).length,
        "Até 30 dias": base.filter(p => Number(p.prazo) > 0 && Number(p.prazo) <= 30).length,
        "31 a 90 dias": base.filter(p => Number(p.prazo) > 30 && Number(p.prazo) <= 90).length,
        "Acima de 90 dias": base.filter(p => Number(p.prazo) > 90).length,
        "Sem prazo": base.filter(p => p.prazo === null || p.prazo === undefined).length
    };
}

function criarGraficoBarra(canvasId, config) {
    destruirGraficoEpi(canvasId);

    if (typeof Chart === "undefined") {
        console.error("Chart.js não carregado.");
        return;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    graficosEpidemiologicos[canvasId] = new Chart(canvas, {
        type: "bar",
        data: {
            labels: config.labels,
            datasets: [{
                label: config.titulo,
                data: config.data
            }]
        },
        options: opcoesPadraoEpi(true)
    });
}

function criarGraficoPizza(canvasId, objeto, titulo) {
    destruirGraficoEpi(canvasId);

    if (typeof Chart === "undefined") {
        console.error("Chart.js não carregado.");
        return;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    graficosEpidemiologicos[canvasId] = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: Object.keys(objeto),
            datasets: [{
                label: titulo,
                data: Object.values(objeto)
            }]
        },
        options: opcoesPadraoEpi(false)
    });
}

function destruirGraficoEpi(canvasId) {
    if (graficosEpidemiologicos[canvasId]) {
        graficosEpidemiologicos[canvasId].destroy();
    }
}

function opcoesPadraoEpi(usarEscalas = true) {
    const opcoes = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: "#f8fafc"
                }
            }
        }
    };

    if (usarEscalas) {
        opcoes.scales = {
            x: {
                ticks: {
                    color: "#cbd5e1"
                },
                grid: {
                    color: "rgba(255,255,255,.08)"
                }
            },
            y: {
                ticks: {
                    color: "#cbd5e1"
                },
                grid: {
                    color: "rgba(255,255,255,.08)"
                },
                beginAtZero: true
            }
        };
    }

    return opcoes;
}

window.abrirDashboardEpidemiologicoTerritorial = abrirDashboardEpidemiologicoTerritorial;
window.fecharDashboardEpidemiologicoTerritorial = fecharDashboardEpidemiologicoTerritorial;
window.carregarDashboardEpidemiologicoTerritorial = carregarDashboardEpidemiologicoTerritorial;
