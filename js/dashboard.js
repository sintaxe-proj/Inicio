/* ==========================================================================
   📊 DASHBOARD / CARDS / CENTRAL DE AVISOS
   Supabase puro
   Arquivo: js/dashboard.js
   ========================================================================== */

async function atualizarIndicatorsDashboard() {
    if (typeof supabaseClient === "undefined") {
        console.warn("Supabase ainda não carregado.");
        return;
    }

    const { data, error } = await supabaseClient
        .from("atendimentos")
        .select("has, dm, gestante, tb, hansen");

    if (error) {
        console.error("Erro ao atualizar dashboard:", error);
        return;
    }

    const dados = data || [];

    const dashHAS = document.getElementById("dashHAS");
    const dashDM = document.getElementById("dashDM");
    const dashGest = document.getElementById("dashGest");
    const dashTB = document.getElementById("dashTB");
    const dashHansen = document.getElementById("dashHansen");

    if (dashHAS) {
        dashHAS.innerText =
            dados.filter(p => p.has === "Sim").length;
    }

    if (dashDM) {
        dashDM.innerText =
            dados.filter(p => p.dm === "Sim").length;
    }

    if (dashGest) {
        dashGest.innerText =
            dados.filter(p => p.gestante === "Sim").length;
    }

    if (dashTB) {
        dashTB.innerText =
            dados.filter(p => p.tb === "Sim").length;
    }

    if (dashHansen) {
        dashHansen.innerText =
            dados.filter(p => p.hansen === "Sim").length;
    }

    console.log("Dashboard Supabase atualizado:", {
        total: dados.length,
        has: dashHAS?.innerText,
        dm: dashDM?.innerText,
        gestante: dashGest?.innerText,
        tb: dashTB?.innerText,
        hansen: dashHansen?.innerText
    });
}

/* ==========================================================================
   🔔 CENTRAL DE AVISOS
   ========================================================================== */

async function atualizarCentralAvisosSininho() {
    if (typeof supabaseClient === "undefined") {
        console.warn("Supabase ainda não carregado.");
        return;
    }

    const { data, error } = await supabaseClient
        .from("atendimentos")
        .select("id, cpf, cns, nome_paciente, reavaliacaoDias, nota_monitoramento")
        .eq("reavaliacaoDias", 0);

    if (error) {
        console.error("Erro ao atualizar central de avisos:", error);
        return;
    }

    const alertas = data || [];

    const contador = document.getElementById("contadorAvisosSininho");
    const container = document.getElementById("centralAvisosContainer");

    if (contador) {
        contador.innerText = alertas.length;
    }

    if (container) {
        if (alertas.length > 0) {
            container.classList.add("tem-alerta");
            container.title =
                `${alertas.length} cidadão(s) com alerta urgente ou prazo vencido.`;
        } else {
            container.classList.remove("tem-alerta");
            container.title =
                "Nenhum alerta crítico no momento.";
        }
    }

    console.log("Central de avisos Supabase atualizada:", alertas.length);
}

/* ==========================================================================
   🚨 ABRIR CRÍTICOS
   ========================================================================== */

function abrirPainelCriticosDireto() {
    if (typeof abrirPainelEpidemiologico === "function") {
        abrirPainelEpidemiologico("criticos");
    }
}

/* ==========================================================================
   GLOBAL
   ========================================================================== */

window.atualizarIndicatorsDashboard = atualizarIndicatorsDashboard;
window.atualizarCentralAvisosSininho = atualizarCentralAvisosSininho;
window.abrirPainelCriticosDireto = abrirPainelCriticosDireto;
