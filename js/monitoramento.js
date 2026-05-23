/* ==========================================================================
   🔔 MONITORAMENTO TERRITORIAL E ALERTAS
   ========================================================================== */

let linhaCuidadoAtualVisualizacao = "has";

function atualizarCentralAvisosSininho() {
    if (!db) return;

    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.getAll();

    request.onsuccess = function() {

        const todosPacientes = request.result;

        const expirados = todosPacientes.filter(p =>
            p.reavaliacaoDias !== undefined &&
            parseInt(p.reavaliacaoDias) === 0
        );

        const contador =
            document.getElementById("contadorAvisosSininho");

        const container =
            document.getElementById("centralAvisosContainer");

        if (!contador || !container) return;

        contador.innerText = expirados.length;

        if (expirados.length > 0) {

            container.style.background = "var(--danger)";
            container.style.animation = "pulse 1.5s infinite";

            container.title =
                `${expirados.length} cidadãos precisam de reavaliação imediata`;

        } else {

            container.style.background = "#334155";
            container.style.animation = "none";

            container.title =
                "Nenhuma pendência crítica.";
        }
    };
}

function abrirPainelEpidemiologico(linhaCuidado) {

    linhaCuidadoAtualVisualizacao = linhaCuidado;

    document.getElementById(
        "painelEpidemiologicoContainer"
    ).style.display = "block";

    const titulos = {
        has: "Monitoramento Territorial: HAS",
        dm: "Monitoramento Territorial: DM",
        gestante: "Vigilância Pré-Natal",
        tuberculose: "Tuberculose",
        hanseniase: "Hanseníase",
        criticos: "🚨 Alertas Críticos"
    };

    document.getElementById(
        "tituloPainelEpidemiologico"
    ).innerText =
        titulos[linhaCuidado] || "Monitoramento";

    carregarFiltrosModalUBS();
}

function fecharPainelEpidemiologico() {

    document.getElementById(
        "painelEpidemiologicoContainer"
    ).style.display = "none";
}

function carregarFiltrosModalUBS() {

    const ubsSelect =
        document.getElementById("filtroUBS");

    const equipeSelect =
        document.getElementById("filtroEquipe");

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

    document.getElementById(
        "filtroRisco"
    ).value = "TODOS";

    aplicarFiltrosRelatorio();
}
