/* ==========================================================================
   🍞 UTILITÁRIOS E MÁSCARAS
   ========================================================================== */

function mostrarToast(mensagem) {
    const toast =
        document.getElementById(
            "toastNotification"
        );

    if (!toast) return;

    toast.innerText = mensagem;
    toast.style.display = "block";

    setTimeout(() => {
        toast.style.display = "none";
    }, 3500);
}

function mascaraCPF(campo) {
    let v =
        campo.value.replace(/\D/g, "");

    if (v.length > 11) {
        v = v.substring(0,11);
    }

    v = v.replace(
        /(\d{3})(\d)/,
        "$1.$2"
    );

    v = v.replace(
        /(\d{3})(\d)/,
        "$1.$2"
    );

    v = v.replace(
        /(\d{3})(\d{1,2})$/,
        "$1-$2"
    );

    campo.value = v;
}

function mostrarCard(id, valor) {
    const elemento =
        document.getElementById(id);

    if (!elemento) return;

    elemento.style.display =
        valor === "Sim"
            ? "block"
            : "none";
}
