/* ==========================================================================
   📊 DASHBOARD EXECUTIVO / CARDS / CENTRAL DE AVISOS
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
        .select(`
            has,
            dm,
            gestante,
            tb,
            hansen,
            reavaliacaoDias,
            retorno_dias
        `)
        .limit(10000);

    if (error) {
        console.error("Erro ao atualizar dashboard:", error);
        return;
    }

    const dados = data || [];

    const totalAtendimentos =
        dados.length;

    const has =
        dados.filter(p => valorSimDashboard(p.has)).length;

    const dm =
        dados.filter(p => valorSimDashboard(p.dm)).length;

    const gestante =
        dados.filter(p => valorSimDashboard(p.gestante)).length;

    const tb =
        dados.filter(p => valorSimDashboard(p.tb)).length;

    const hansen =
        dados.filter(p => valorSimDashboard(p.hansen)).length;

    const criticos =
        dados.filter(p =>
            Number(p.reavaliacaoDias ?? p.retorno_dias) === 0
        ).length;

    setTextoDashboard("dashHAS", has);
    setTextoDashboard("dashDM", dm);
    setTextoDashboard("dashGest", gestante);
    setTextoDashboard("dashTB", tb);
    setTextoDashboard("dashHansen", hansen);

    setTextoDashboard("dashTotalAtendimentos", totalAtendimentos);
    setTextoDashboard("dashCriticos", criticos);

    await atualizarTotalPacientesDashboard();

    console.log("Dashboard Supabase atualizado:", {
        totalAtendimentos,
        has,
        dm,
        gestante,
        tb,
        hansen,
        criticos
    });
}

async function atualizarTotalPacientesDashboard() {
    const el =
        document.getElementById("dashTotalPacientes");

    if (!el) return;

    const { count, error } =
        await supabaseClient
            .from("pacientes")
            .select("*", {
                count: "exact",
                head: true
            });

    if (error) {
        console.warn("Erro ao contar pacientes:", error);
        return;
    }

    el.innerText =
        count || 0;
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
        .select(`
            id,
            paciente_cpf,
            cpf,
            cns,
            nome_paciente,
            reavaliacaoDias,
            retorno_dias,
            nota_monitoramento
        `)
        .or("reavaliacaoDias.eq.0,retorno_dias.eq.0");

    if (error) {
        console.error("Erro ao atualizar central de avisos:", error);
        return;
    }

    const alertas =
        data || [];

    const contador =
        document.getElementById("contadorAvisosSininho");

    const container =
        document.getElementById("centralAvisosContainer");

    const iconeNota =
        document.getElementById("iconeNotaAviso");

    if (contador) {
        contador.innerText =
            alertas.length;
    }

    setTextoDashboard("dashCriticos", alertas.length);

    const primeiraNota =
        alertas.find(a =>
            a.nota_monitoramento &&
            a.nota_monitoramento.trim()
        );

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

    if (iconeNota) {
        if (primeiraNota) {
            iconeNota.style.display =
                "inline-block";

            iconeNota.title =
                primeiraNota.nota_monitoramento;
        } else {
            iconeNota.style.display =
                "none";

            iconeNota.title =
                "";
        }
    }

    console.log(
        "Central de avisos Supabase atualizada:",
        alertas.length
    );
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

function valorSimDashboard(valor) {
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

function setTextoDashboard(id, valor) {
    const el =
        document.getElementById(id);

    if (el) {
        el.innerText =
            valor;
    }
}

/* ==========================================================================
   🚨 ABRIR CRÍTICOS
   ========================================================================== */

function abrirPainelCriticosDireto() {
    if (
        typeof abrirPainelEpidemiologico ===
        "function"
    ) {
        abrirPainelEpidemiologico("criticos");
    }
}

/* ==========================================================================
   GLOBAL
   ========================================================================== */

window.atualizarIndicatorsDashboard = atualizarIndicatorsDashboard;
window.atualizarCentralAvisosSininho = atualizarCentralAvisosSininho;
window.abrirPainelCriticosDireto = abrirPainelCriticosDireto;
window.valorSimDashboard = valorSimDashboard;
