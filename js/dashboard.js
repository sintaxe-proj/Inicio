/* ==========================================================================
   📊 DASHBOARD / CARDS / CENTRAL DE AVISOS
   Arquivo: js/dashboard.js
   ========================================================================== */

function atualizarIndicatorsDashboard() {
    if (!db) {
        console.warn("Banco ainda não conectado para atualizar dashboard.");
        return;
    }

    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.getAll();

    request.onsuccess = function () {
        const dados = request.result || [];

        const dashHAS = document.getElementById("dashHAS");
        const dashDM = document.getElementById("dashDM");
        const dashGest = document.getElementById("dashGest");
        const dashTB = document.getElementById("dashTB");
        const dashHansen = document.getElementById("dashHansen");

        if (dashHAS) {
            dashHAS.innerText = dados.filter(p => p.has === "Sim").length;
        }

        if (dashDM) {
            dashDM.innerText = dados.filter(p => p.dm === "Sim").length;
        }

        if (dashGest) {
            dashGest.innerText = dados.filter(p => p.gestante === "Sim").length;
        }

        if (dashTB) {
            dashTB.innerText = dados.filter(p =>
                p.tb === "Sim" || p.tbSelect === "Sim"
            ).length;
        }

        if (dashHansen) {
            dashHansen.innerText = dados.filter(p =>
                p.hansen === "Sim" || p.hansenSelect === "Sim"
            ).length;
        }

        console.log("Dashboard atualizado:", {
            total: dados.length,
            has: dashHAS?.innerText,
            dm: dashDM?.innerText,
            gestante: dashGest?.innerText,
            tb: dashTB?.innerText,
            hansen: dashHansen?.innerText
        });
    };

    request.onerror = function () {
        console.error("Erro ao atualizar dashboard:", request.error);
    };
}

function atualizarCentralAvisosSininho() {
    if (!db) {
        console.warn("Banco ainda não conectado para atualizar sininho.");
        return;
    }

    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.getAll();

    request.onsuccess = function () {
        const pacientes = request.result || [];

        const alertas = pacientes.filter(p => {
            const dias = parseInt(p.reavaliacaoDias);

            const urgente =
                p.alertaUrgente === "Sim" ||
                p.urgente === "Sim";

            return dias === 0 || urgente;
        });

        const contador = document.getElementById("contadorAvisosSininho");
        const container = document.getElementById("centralAvisosContainer");

        if (contador) {
            contador.innerText = alertas.length;
        }

        if (container) {
            if (alertas.length > 0) {
                container.classList.add("tem-alerta");
                container.title = `${alertas.length} cidadão(s) com alerta urgente ou prazo vencido.`;
            } else {
                container.classList.remove("tem-alerta");
                container.title = "Nenhum alerta crítico no momento.";
            }
        }

        console.log("Central de avisos atualizada:", alertas.length);
    };

    request.onerror = function () {
        console.error("Erro ao atualizar central de avisos:", request.error);
    };
}

function abrirPainelCriticosDireto() {
    if (typeof abrirPainelEpidemiologico === "function") {
        abrirPainelEpidemiologico("criticos");
    }
}
