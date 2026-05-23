/* ==========================================================================
   📊 DASHBOARD E GRÁFICOS
   ========================================================================== */

function atualizarIndicatorsDashboard() {
    if (!db) return;

    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.getAll();

    request.onsuccess = function() {
        const dados = request.result;

        document.getElementById("dashHAS").innerText =
            dados.filter(p => p.has === "Sim").length;

        document.getElementById("dashDM").innerText =
            dados.filter(p => p.dm === "Sim").length;

        document.getElementById("dashGest").innerText =
            dados.filter(p => p.gestante === "Sim").length;

        document.getElementById("dashTB").innerText =
            dados.filter(p => p.tb === "Sim").length;

        document.getElementById("dashHansen").innerText =
            dados.filter(p => p.hansen === "Sim").length;
    };
}

function renderizarGraficosModal(lista) {
    const total = lista.length;
    const criticos = lista.filter(p => p.reavaliacaoDias === 0).length;
    const controlados = total - criticos;

    const pctCritico =
        total > 0
            ? Math.round((criticos / total) * 100)
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
                    <span>Críticos (0 Dias)</span>
                    <span>${criticos} Utentes</span>
                </div>

                <div class="bar-track">
                    <div class="bar-fill"
                         style="width:${pctCritico}%; background:var(--danger)">
                    </div>
                </div>
            </div>

            <div class="bar-row" style="margin-top:10px;">
                <div class="bar-label">
                    <span>Controlados / Monitorados</span>
                    <span>${controlados} Utentes</span>
                </div>

                <div class="bar-track">
                    <div class="bar-fill"
                         style="width:${total > 0 ? 100 - pctCritico : 0}%; background:var(--success)">
                    </div>
                </div>
            </div>
        </div>
    `;
}
