function renderizarGraficosModal(lista) {

    function definirLimiteAtencao(p) {

        // HAS e DM entram em atenção com até 30 dias
        if (
            p.has === "Sim" ||
            p.dm === "Sim"
        ) {
            return 30;
        }

        // Gestante, TB e Hanseníase entram em atenção com até 15 dias
        if (
            p.gestante === "Sim" ||
            p.tb === "Sim" ||
            p.hansen === "Sim"
        ) {
            return 15;
        }

        return 30;
    }

    function estaEmAtencao(p) {

        const dias =
            parseInt(p.reavaliacaoDias);

        if (isNaN(dias)) {
            return false;
        }

        // Se já venceu, não entra em atenção
        if (dias <= 0) {
            return false;
        }

        return dias <= definirLimiteAtencao(p);
    }

    const total = lista.length;

    const criticos = lista.filter(p =>
        parseInt(p.reavaliacaoDias) === 0
    ).length;

    const atencao = lista.filter(p =>
        estaEmAtencao(p)
    ).length;

    const controlados =
        total - criticos - atencao;

    const pctCritico = total > 0
        ? Math.round((criticos / total) * 100)
        : 0;

    const pctAtencao = total > 0
        ? Math.round((atencao / total) * 100)
        : 0;

    const pctControlado = total > 0
        ? Math.max(
            0,
            100 - pctCritico - pctAtencao
        )
        : 0;

    /* ==========================================================
       🍩 DONUT
       ========================================================== */

    document.getElementById(
        "containerGraficoDonut"
    ).innerHTML = `

        <div class="donut-wrapper">

            <svg
                width="100%"
                height="100%"
                viewBox="0 0 42 42"
                class="donut-svg"
            >

                <circle
                    class="donut-bg"
                    cx="21"
                    cy="21"
                    r="15.915"
                ></circle>

                <circle
                    class="donut-segment"
                    cx="21"
                    cy="21"
                    r="15.915"
                    stroke="var(--danger)"
                    stroke-dasharray="${pctCritico} ${100 - pctCritico}"
                    stroke-dashoffset="0"
                ></circle>

            </svg>

            <div class="donut-center-text">
                <span class="donut-number">
                    ${pctCritico}%
                </span>

                <span class="donut-label">
                    Críticos
                </span>
            </div>

        </div>
    `;

    /* ==========================================================
       📊 BARRAS
       ========================================================== */

    document.getElementById(
        "containerGraficoBarras"
    ).innerHTML = `

        <div class="bar-chart-container">

            <!-- CRÍTICOS -->

            <div class="bar-row">

                <div class="bar-label">
                    <span>
                        🚨 Críticos / Vencidos
                    </span>

                    <span>
                        ${criticos} Utentes
                    </span>
                </div>

                <div class="bar-track">
                    <div
                        class="bar-fill"
                        style="
                            width:${pctCritico}%;
                            background:var(--danger)
                        "
                    ></div>
                </div>

            </div>

            <!-- ATENÇÃO -->

            <div
                class="bar-row"
                style="margin-top:10px;"
            >

                <div class="bar-label">
                    <span>
                        ⚠️ Atenção / Próximo ao vencimento
                    </span>

                    <span>
                        ${atencao} Utentes
                    </span>
                </div>

                <div class="bar-track">
                    <div
                        class="bar-fill"
                        style="
                            width:${pctAtencao}%;
                            background:var(--warning)
                        "
                    ></div>
                </div>

            </div>

            <!-- CONTROLADOS -->

            <div
                class="bar-row"
                style="margin-top:10px;"
            >

                <div class="bar-label">
                    <span>
                        ✅ Controlados / Monitorados
                    </span>

                    <span>
                        ${controlados} Utentes
                    </span>
                </div>

                <div class="bar-track">
                    <div
                        class="bar-fill"
                        style="
                            width:${pctControlado}%;
                            background:var(--success)
                        "
                    ></div>
                </div>

            </div>

        </div>
    `;
}
