/* ==========================================================================
   🩺 MÓDULO SOAP — PRONTUÁRIO E LÓGICA CLÍNICA
   ========================================================================== */

/**
 * Exibe ou oculta a área de exame físico alterado
 */
function alternarExameFisico(status) {
    const bloco = document.getElementById("blocoExameAlterado");

    if (status === "Alterado") {
        bloco.style.display = "block";
        document.getElementById(
            "soapObjetivoAlterado"
        ).focus();
    } else {
        bloco.style.display = "none";
        document.getElementById(
            "soapObjetivoAlterado"
        ).value = "";
    }
}

function limparFormularioProntuario() {

    document.getElementById("soapSubjetivo").value = "";

    document.getElementById("objPA").value = "";
    document.getElementById("objFC").value = "";
    document.getElementById("objFR").value = "";
    document.getElementById("objSatO2").value = "";
    document.getElementById("objDor").value = "0";

    document.querySelector(
        'input[name="exameFisicoStatus"][value="Normal"]'
    ).checked = true;

    document.getElementById(
        "blocoExameAlterado"
    ).style.display = "none";

    document.getElementById(
        "soapObjetivoAlterado"
    ).value = "";

    document.getElementById(
        "soapPlanoConduta"
    ).value = "";

    document.getElementById(
        "soapReavaliacaoDias"
    ).value = "0";

    document.getElementById(
        "inputBuscaCIAPS"
    ).value = "";

    const campos = [
        "nomePaciente",
        "cpfPaciente",
        "nascPaciente",
        "idadePaciente",
        "telPaciente",
        "CEP",
        "endPaciente",
        "endNumero",
        "endComplemento",
        "hasPAS",
        "hasPAD",
        "hasClassif",
        "dmHbA1c",
        "dmClassif",
        "gestDUM",
        "gestIG",
        "gestDPP"
    ];

    campos.forEach(campo => {
        const el = document.getElementById(campo);

        if (el) {
            el.value = "";
        }
    });

    document.getElementById("hasSN").value = "Não";
    document.getElementById("dmSN").value = "Não";
    document.getElementById("gestanteSN").value = "Não";

    document.getElementById("tbSN").checked = false;
    document.getElementById("hansenSN").checked = false;

    document.getElementById(
        "cardHAS"
    ).style.display = "none";

    document.getElementById(
        "cardDM"
    ).style.display = "none";

    document.getElementById(
        "cardGestante"
    ).style.display = "none";

    document.getElementById(
        "ampiBloco"
    ).style.display = "none";

    document.getElementById(
        "cabecalhoProntuario"
    ).style.display = "none";

    document.getElementById(
        "linhaTempoEvolucoes"
    ).innerHTML = "";
}
