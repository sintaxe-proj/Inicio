/* ==========================================================================
   🚀 APP PRINCIPAL — INICIALIZAÇÃO E ROTAS
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    configurarIndexedDB();

    if (typeof verificarSessao === "function") {
        verificarSessao();
    }

    inicializarAutocompleteCIAP();
});

/* ==========================================================================
   🗺️ ROTAS NATIVAS
   ========================================================================== */

function navigate(viewName) {
    document
        .querySelectorAll(".view")
        .forEach(view => {
            view.style.display = "none";
        });

    document
        .querySelectorAll(".nav-link")
        .forEach(link => {
            link.classList.remove("active");
        });

    const viewAlvo =
        document.getElementById(`view-${viewName}`);

    if (viewAlvo) {
        viewAlvo.style.display = "block";
    }

    const linkAtivo = Array
        .from(document.querySelectorAll(".nav-link"))
        .find(link =>
            link.innerText
                .toLowerCase()
                .includes(
                    viewName === "prontuario"
                        ? "novo"
                        : viewName
                )
        );

    if (linkAtivo) {
        linkAtivo.classList.add("active");
    }

    if (
        viewName === "banco" &&
        typeof listarTodosBanco === "function"
    ) {
        listarTodosBanco();
    }
}

/* ==========================================================================
   🧬 AUTOCOMPLETE CIAP-2
   ========================================================================== */

function inicializarAutocompleteCIAP() {
    const datalist =
        document.getElementById("listaCIAP");

    if (!datalist) return;

    if (typeof CATALOGO_CIAPS2 === "undefined") {
        console.error(
            "CATALOGO_CIAPS2 não está acessível."
        );
        return;
    }

    datalist.innerHTML = "";

    Object
        .entries(CATALOGO_CIAPS2)
        .forEach(([codigo, descricao]) => {
            const option =
                document.createElement("option");

            option.value =
                `${codigo} - ${descricao}`;

            datalist.appendChild(option);
        });

    console.log(
        `CIAP-2 carregado: ${Object.keys(CATALOGO_CIAPS2).length} códigos.`
    );
}
