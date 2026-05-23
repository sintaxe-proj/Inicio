/* ==========================================================================
   🚀 APP
   Arquivo: js/app.js
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function () {
    if (typeof configurarIndexedDB === "function") {
        configurarIndexedDB();
    }

    if (typeof verificarSessao === "function") {
        verificarSessao();
    }

    if (typeof inicializarAutocompleteCIAP === "function") {
        inicializarAutocompleteCIAP();
    }
});

function navigate(view) {
    const sessao = JSON.parse(
        localStorage.getItem("pep_sessao_ativa") || "{}"
    );

    if (view === "config" && sessao.perfil !== "admin") {
        mostrarToast?.("⛔ Acesso restrito ao administrador.");
        view = "inicio";
    }

    document.querySelectorAll(".view").forEach(v => {
        v.style.display = "none";
        v.classList.remove("active-view");
    });

    const tela = document.getElementById(`view-${view}`);

    if (tela) {
        tela.style.display = "block";
        tela.classList.add("active-view");
    }

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.remove("active");
    });

    const linkAtivo = Array.from(document.querySelectorAll(".nav-link")).find(link =>
        link.getAttribute("onclick")?.includes(`'${view}'`)
    );

    if (linkAtivo) {
        linkAtivo.classList.add("active");
    }

    if (view === "banco" && typeof listarTodosBanco === "function") {
        listarTodosBanco();
    }

    if (view === "config" && typeof listarUsuariosSistema === "function") {
        listarUsuariosSistema();
    }
}
