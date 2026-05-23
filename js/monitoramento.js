/* ==========================================================================
   📈 MONITORAMENTO TERRITORIAL & PAINEL EPIDEMIOLÓGICO
   ========================================================================== */

let linhaCuidadoAtualVisualizacao = "has";

/* ==========================================================================
   🚀 ABRIR PAINEL
   ========================================================================== */

function abrirPainelEpidemiologico(linhaCuidado) {
    linhaCuidadoAtualVisualizacao = linhaCuidado;

    document.getElementById("painelEpidemiologicoContainer").style.display = "block";

    const titulos = {
        has: "Monitoramento Territorial: Hipertensão Arterial Sistêmica (HAS)",
        dm: "Monitoramento Territorial: Diabetes Mellitus (DM)",
        gestante: "Monitoramento Territorial: Vigilância de Pré-Natal",
        tuberculose: "Monitoramento Epidemiológico: Tuberculose",
        hanseniase: "Monitoramento Epidemiológico: Hanseníase",
        criticos: "🚨 Central de Alertas: Prazo Expirado"
    };

    document.getElementById("tituloPainelEpidemiologico").innerText =
        titulos[linhaCuidado] || "Vigilância em Saúde";

    carregarFiltrosModalUBS();
}

/* ==========================================================================
   ❌ FECHAR PAINEL
   ========================================================================== */

function fecharPainelEpidemiologico() {
    document.getElementById("painelEpidemiologicoContainer").style.display = "none";
}

/* ==========================================================================
   🏥 CARREGAR FILTROS
   ========================================================================== */

function carregarFiltrosModalUBS() {
    const ubsSelect = document.getElementById("filtroUBS");
    const equipeSelect = document.getElementById("filtroEquipe");

    ubsSelect.innerHTML = `
        <option value="TODAS">Todas as Unidades</option>
        <option value="UBS Centro Médico">UBS Centro Médico</option>
        <option value="UBS Vila Nova">UBS Vila Nova</option>
        <option value="Clínica da Família Zona Sul">Clínica da Família Zona Sul</option>
        <option value="UBS Integrada Norte">UBS Integrada Norte</option>
    `;

    equipeSelect.innerHTML = `
        <option value="TODAS">Todas as Equipes</option>
        <option value="Equipe Verde">Equipe Verde</option>
        <option value="Equipe Azul">Equipe Azul</option>
        <option value="Equipe Esmeralda">Equipe Esmeralda</option>
        <option value="Equipe Rubi">Equipe Rubi</option>
    `;

    document.getElementById("filtroRisco").value = "TODOS";

    aplicarFiltrosRelatorio();
}

/* ==========================================================================
   🔍 APLICAR FILTROS
   ========================================================================== */

function aplicarFiltrosRelatorio() {
    if (!db) return;

    const ubs = document.getElementById("filtroUBS").value;
    const equipe = document.getElementById("filtroEquipe").value;
    const risco = document.getElementById("filtroRisco").value;

    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.getAll();

    request.onsuccess = function () {
        let filtrados = request.result || [];

        if (linhaCuidadoAtualVisualizacao === "has") {
            filtrados = filtrados.filter(p => p.has === "Sim");
        } else if (linhaCuidadoAtualVisualizacao === "dm") {
            filtrados = filtrados.filter(p => p.dm === "Sim");
        } else if (linhaCuidadoAtualVisualizacao === "gestante") {
            filtrados = filtrados.filter(p => p.gestante === "Sim");
        } else if (linhaCuidadoAtualVisualizacao === "tuberculose") {
            filtrados = filtrados.filter(p => p.tb === "Sim");
        } else if (linhaCuidadoAtualVisualizacao === "hanseniase") {
            filtrados = filtrados.filter(p => p.hansen === "Sim");
        } else if (linhaCuidadoAtualVisualizacao === "criticos") {
            filtrados = filtrados.filter(p => parseInt(p.reavaliacaoDias) === 0);
        }

        if (ubs !== "TODAS") {
            filtrados = filtrados.filter(p => p.ubs === ubs);
        }

        if (equipe !== "TODAS") {
            filtrados = filtrados.filter(p => p.equipe === equipe);
        }

        if (risco === "CRITICO") {
            filtrados = filtrados.filter(p => parseInt(p.reavaliacaoDias) === 0);
        } else if (risco === "ATENCAO") {
            filtrados = filtrados.filter(p => {
                const dias = parseInt(p.reavaliacaoDias);
                return dias > 0 && dias <= 30;
            });
        } else if (risco === "CONTROLADO") {
            filtrados = filtrados.filter(p => {
                const dias = parseInt(p.reavaliacaoDias);
                return dias > 30;
            });
        }

        renderizarGraficosModal(filtrados);
        renderizarTabelaMonitoramento(filtrados);
    };
}

/* ==========================================================================
   📋 TABELA DE MONITORAMENTO
   ========================================================================== */

function renderizarTabelaMonitoramento(filtrados) {
    const tabela = document.getElementById("tabelaPainelEpidemiologico");

    if (!tabela) return;

    if (filtrados.length === 0) {
        tabela.innerHTML = `
            <p style="color:#64748b; padding:10px;">
                Nenhum utente localizado.
            </p>
        `;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>CPF</th>
                    <th>UBS</th>
                    <th>Equipe</th>
                    <th>Monitoramento</th>
                </tr>
            </thead>
            <tbody>
    `;

    filtrados.forEach(p => {
        const dias = parseInt(p.reavaliacaoDias);
        let statusMonitoramento = "";

        if (dias === 0) {
            statusMonitoramento = "🚨 Reavaliação Urgente";
        } else if (dias > 0 && dias <= 30) {
            statusMonitoramento = `⚠️ Vence em ${dias} dias`;
        } else {
            statusMonitoramento = `✅ Monitoramento em ${dias} dias`;
        }

        html += `
            <tr>
                <td><b>${p.nome}</b></td>
                <td>${p.cpf}</td>
                <td>${p.ubs || "Pendente"}</td>
                <td>${p.equipe || "Pendente"}</td>
                <td>
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <span>${statusMonitoramento}</span>

                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button
                                onclick="abrirAtendimentoExistente('${p.cpf}')"
                                style="background:#2563eb; color:white; border:none; padding:5px 8px; border-radius:5px; font-size:11px; font-weight:bold; cursor:pointer;">
                                📋 Abrir
                            </button>

                            <button
                                onclick="abrirWhatsAppMonitoramento('${p.cpf}', '${linhaCuidadoAtualVisualizacao}')"
                                style="background:#25d366; color:white; border:none; padding:5px 8px; border-radius:5px; font-size:11px; font-weight:bold; cursor:pointer;">
                                💬 WhatsApp
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    tabela.innerHTML = html;
}

/* ==========================================================================
   📊 GRÁFICOS
   ========================================================================== */

function renderizarGraficosModal(lista) {
    const total = lista.length;

    const criticos = lista.filter(p =>
        parseInt(p.reavaliacaoDias) === 0
    ).length;

    const atencao = lista.filter(p => {
        const dias = parseInt(p.reavaliacaoDias);
        return dias > 0 && dias <= 30;
    }).length;

    const controlados = lista.filter(p => {
        const dias = parseInt(p.reavaliacaoDias);
        return dias > 30;
    }).length;

    const pctCritico = total > 0
        ? Math.round((criticos / total) * 100)
        : 0;

    const pctAtencao = total > 0
        ? Math.round((atencao / total) * 100)
        : 0;

    const pctControlado = total > 0
        ? Math.max(0, 100 - pctCritico - pctAtencao)
        : 0;

    document.getElementById("containerGraficoDonut").innerHTML = `
        <div class="donut-wrapper">
            <svg width="100%" height="100%" viewBox="0 0 42 42" class="donut-svg">
                <circle class="donut-bg" cx="21" cy="21" r="15.915"></circle>

                <circle class="donut-segment"
                        cx="21"
                        cy="21"
                        r="15.915"
                        stroke="var(--danger)"
                        stroke-dasharray="${pctCritico} ${100 - pctCritico}"
                        stroke-dashoffset="0">
                </circle>
            </svg>

            <div class="donut-center-text">
                <span class="donut-number">${pctCritico}%</span>
                <span class="donut-label">Críticos</span>
            </div>
        </div>
    `;

    document.getElementById("containerGraficoBarras").innerHTML = `
        <div class="bar-chart-container">

            <div class="bar-row">
                <div class="bar-label">
                    <span>🚨 Críticos / Vencidos</span>
                    <span>${criticos} Utentes</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill"
                         style="width:${pctCritico}%; background:var(--danger);">
                    </div>
                </div>
            </div>

            <div class="bar-row" style="margin-top:10px;">
                <div class="bar-label">
                    <span>⚠️ Atenção / Próximos 30 dias</span>
                    <span>${atencao} Utentes</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill"
                         style="width:${pctAtencao}%; background:var(--warning);">
                    </div>
                </div>
            </div>

            <div class="bar-row" style="margin-top:10px;">
                <div class="bar-label">
                    <span>✅ Controlados</span>
                    <span>${controlados} Utentes</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill"
                         style="width:${pctControlado}%; background:var(--success);">
                    </div>
                </div>
            </div>

        </div>
    `;
}
