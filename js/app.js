// ======================================================
// NAVEGAÇÃO
// ======================================================

function navigate(view) {

    if (
        typeof podeAcessar === "function" &&
        !podeAcessar(view)
    ) {
        alert("Você não possui permissão para acessar esta área.");
        return;
    }

    document.querySelectorAll(".view").forEach(v => {
        v.style.display = "none";
    });

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.remove("active");
    });

    const tela = document.getElementById("view-" + view);

    if (!tela) {
        console.error("Tela não encontrada:", "view-" + view);
        return;
    }

    tela.style.display = "block";

    const menu = Array.from(
        document.querySelectorAll(".nav-link")
    ).find(link =>
        link.getAttribute("onclick")?.includes(`'${view}'`) ||
        link.getAttribute("onclick")?.includes(`"${view}"`)
    );

    if (menu) {
        menu.classList.add("active");
    }

    if (
        view === "banco" &&
        typeof carregarTabelaBanco === "function"
    ) {
        carregarTabelaBanco();
    }

    if (
        view === "reuniao" &&
        typeof abrirModuloReuniao === "function"
    ) {
        abrirModuloReuniao();
    }

    if (view === "prontuario") {

        if (typeof carregarDatalistCIAP === "function") {
            carregarDatalistCIAP();
        }

        const cpf =
            document.getElementById("cpfPaciente")?.value ||
            window.pacienteAtual?.cpf ||
            window.pacienteSelecionado?.cpf ||
            "";

        const cns =
            document.getElementById("cnsPaciente")?.value ||
            window.pacienteAtual?.cns ||
            window.pacienteSelecionado?.cns ||
            "";

        if (
            (cpf || cns) &&
            typeof carregarHistoricoClinicoPaciente === "function"
        ) {
            carregarHistoricoClinicoPaciente(cpf, cns);
        }
    }

    if (
        view === "estoque" &&
        typeof carregarHistoricoSolicitacoes === "function"
    ) {
        carregarHistoricoSolicitacoes();

        if (typeof atualizarDashboardEstoque === "function") {
            atualizarDashboardEstoque();
        }
    }

    if (view === "config") {

        console.log("⚙️ Configurações & Carga aberta.");

        if (typeof listarUsuariosSistema === "function") {
            listarUsuariosSistema();
        }
    }
}

// ======================================================
// DASHBOARD ESTOQUE SUPABASE
// ======================================================

async function atualizarDashboardEstoque() {

    if (typeof supabaseClient === "undefined") {
        console.warn("Supabase não carregado para estoque.");
        return;
    }

    const { data, error } = await supabaseClient
        .from("solicitacoes_materiais")
        .select("status");

    if (error) {
        console.error("Erro ao buscar solicitações:", error);
        return;
    }

    const banco = data || [];

    const pendentes =
        banco.filter(x => x.status === "PENDENTE").length;

    const aprovadas =
        banco.filter(x =>
            x.status === "APROVADO" ||
            x.status === "AUTORIZADO"
        ).length;

    const entregues =
        banco.filter(x =>
            x.status === "ENTREGUE"
        ).length;

    const dashPend =
        document.getElementById(
            "dashSolicitacoesPendentes"
        );

    const dashAprov =
        document.getElementById(
            "dashSolicitacoesAprovadas"
        );

    const dashEntr =
        document.getElementById(
            "dashSolicitacoesEntregues"
        );

    if (dashPend) dashPend.innerText = pendentes;
    if (dashAprov) dashAprov.innerText = aprovadas;
    if (dashEntr) dashEntr.innerText = entregues;
}
