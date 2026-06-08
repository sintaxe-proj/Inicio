/* ==========================================================================
   🍞 UTILITÁRIOS E MÁSCARAS
   Arquivo: js/utils.js
   Compatível com Supabase
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

/* ==========================================================================
   CPF
   ========================================================================== */

function mascaraCPF(campo) {

    let v =
        campo.value.replace(
            /\D/g,
            ""
        );

    if (v.length > 11) {
        v = v.substring(0, 11);
    }

    v =
        v.replace(
            /(\d{3})(\d)/,
            "$1.$2"
        );

    v =
        v.replace(
            /(\d{3})(\d)/,
            "$1.$2"
        );

    v =
        v.replace(
            /(\d{3})(\d{1,2})$/,
            "$1-$2"
        );

    campo.value = v;
}

/* ==========================================================================
   CNS
   ========================================================================== */

function mascaraCNS(campo) {

    let v =
        campo.value.replace(
            /\D/g,
            ""
        );

    if (v.length > 15) {
        v = v.substring(0, 15);
    }

    campo.value = v;
}

/* ==========================================================================
   TELEFONE
   ========================================================================== */

function mascaraTelefone(campo) {

    let v =
        campo.value.replace(
            /\D/g,
            ""
        );

    if (v.length > 11) {
        v = v.substring(0, 11);
    }

    if (v.length <= 10) {

        v =
            v.replace(
                /(\d{2})(\d)/,
                "($1) $2"
            );

        v =
            v.replace(
                /(\d{4})(\d)/,
                "$1-$2"
            );

    } else {

        v =
            v.replace(
                /(\d{2})(\d)/,
                "($1) $2"
            );

        v =
            v.replace(
                /(\d{5})(\d)/,
                "$1-$2"
            );
    }

    campo.value = v;
}

/* ==========================================================================
   CEP
   ========================================================================== */

function mascaraCEP(campo) {

    let v =
        campo.value.replace(
            /\D/g,
            ""
        );

    if (v.length > 8) {
        v = v.substring(0, 8);
    }

    v =
        v.replace(
            /(\d{5})(\d)/,
            "$1-$2"
        );

    campo.value = v;
}

/* ==========================================================================
   CNS / CPF LIMPOS
   ========================================================================== */

function limparNumeros(valor) {

    return String(
        valor || ""
    ).replace(
        /\D/g,
        ""
    );
}

/* ==========================================================================
   EXIBIÇÃO DE CARDS
   ========================================================================== */

function mostrarCard(id, valor) {

    const elemento =
        document.getElementById(id);

    if (!elemento) return;

    const exibir =
        valor === true ||
        valor === "Sim" ||
        valor === "sim" ||
        valor === 1 ||
        valor === "1";

    elemento.style.display =
        exibir
            ? "block"
            : "none";
}

/* ==========================================================================
   DATA BR
   ========================================================================== */

function formatarDataBR(data) {

    if (!data) return "-";

    try {

        return new Date(data)
            .toLocaleDateString(
                "pt-BR"
            );

    } catch {

        return "-";
    }
}

/* ==========================================================================
   DATA HORA BR
   ========================================================================== */

function formatarDataHoraBR(data) {

    if (!data) return "-";

    try {

        return new Date(data)
            .toLocaleString(
                "pt-BR"
            );

    } catch {

        return "-";
    }
}

/* ==========================================================================
   VALORES
   ========================================================================== */

function numeroOuZero(valor) {

    const numero =
        Number(
            String(valor || "")
                .replace(",", ".")
        );

    return Number.isNaN(numero)
        ? 0
        : numero;
}

function inteiroOuZero(valor) {

    const numero =
        parseInt(valor);

    return Number.isNaN(numero)
        ? 0
        : numero;
}

async function buscarCEP() {
    const campoCEP = document.getElementById("CEP");
    if (!campoCEP) return;

    const cep = campoCEP.value.replace(/\D/g, "");

    if (cep.length !== 8) {
        mostrarToast?.("⚠️ CEP inválido.");
        return;
    }

    try {
        const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const dados = await resposta.json();

        if (dados.erro) {
            mostrarToast?.("⚠️ CEP não encontrado.");
            return;
        }

        const endereco = document.getElementById("endPaciente");

        if (endereco) {
            endereco.value = [
                dados.logradouro,
                dados.bairro,
                dados.localidade,
                dados.uf
            ].filter(Boolean).join(", ");
        }

        mostrarToast?.("✅ Endereço preenchido pelo CEP.");

    } catch (erro) {
        console.error("Erro ao buscar CEP:", erro);
        mostrarToast?.("❌ Erro ao consultar CEP.");
    }
}

window.buscarCEP = buscarCEP;

/* ==========================================================================
   GLOBAL
   ========================================================================== */

window.mostrarToast =
    mostrarToast;

window.mascaraCPF =
    mascaraCPF;

window.mascaraCNS =
    mascaraCNS;

window.mascaraTelefone =
    mascaraTelefone;

window.mascaraCEP =
    mascaraCEP;

window.limparNumeros =
    limparNumeros;

window.mostrarCard =
    mostrarCard;

window.formatarDataBR =
    formatarDataBR;

window.formatarDataHoraBR =
    formatarDataHoraBR;

window.numeroOuZero =
    numeroOuZero;

window.inteiroOuZero =
    inteiroOuZero;

console.log(
    "✅ utils.js carregado."
);
