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

/* ==========================================================================
   🩺 CLASSIFICAÇÕES E CÁLCULOS CLÍNICOS
   ========================================================================== */

function calcIdade() {
    const nasc = document.getElementById("nascPaciente").value;

    if (!nasc) return;

    const hoje = new Date();
    const dataNasc = new Date(nasc);

    let idade = hoje.getFullYear() - dataNasc.getFullYear();

    const m = hoje.getMonth() - dataNasc.getMonth();

    if (
        m < 0 ||
        (m === 0 && hoje.getDate() < dataNasc.getDate())
    ) {
        idade--;
    }

    document.getElementById(
        "idadePaciente"
    ).value = idade;

    document.getElementById(
        "ampiBloco"
    ).style.display =
        idade >= 60 ? "block" : "none";
}

function classificarHAS() {
    const pas = parseInt(
        document.getElementById("hasPAS").value
    );

    const pad = parseInt(
        document.getElementById("hasPAD").value
    );

    const campo =
        document.getElementById("hasClassif");

    if (!pas || !pad) {
        campo.value = "";
        return;
    }

    if (pas >= 180 || pad >= 110) {
        campo.value =
            "Crise Hipertensiva (Prioridade Máxima)";
        campo.style.color = "var(--danger)";
    }

    else if (pas >= 140 || pad >= 90) {
        campo.value =
            "Hipertensão Estágio 1 ou 2";
        campo.style.color = "var(--warning)";
    }

    else {
        campo.value =
            "Pressão Controlada";
        campo.style.color = "var(--success)";
    }
}

function classificarDM() {
    const hba1c = parseFloat(
        document.getElementById("dmHbA1c").value
    );

    const campo =
        document.getElementById("dmClassif");

    if (!hba1c) {
        campo.value = "";
        return;
    }

    if (hba1c >= 8) {
        campo.value =
            "Controle Metabólico Ruim";
        campo.style.color = "var(--danger)";
    }

    else if (hba1c >= 7) {
        campo.value =
            "Controle Limítrofe";
        campo.style.color = "var(--warning)";
    }

    else {
        campo.value =
            "Excelente Controle";
        campo.style.color = "var(--success)";
    }
}

function calcIG() {
    const dum =
        document.getElementById("gestDUM").value;

    if (!dum) return;

    const dataDum = new Date(dum);
    const hoje = new Date();

    const diffTime =
        Math.abs(hoje - dataDum);

    const diffDays =
        Math.ceil(
            diffTime /
            (1000 * 60 * 60 * 24)
        );

    const semanas =
        Math.floor(diffDays / 7);

    const dias =
        diffDays % 7;

    document.getElementById(
        "gestIG"
    ).value =
        `${semanas} Semanas e ${dias} Dias`;

    const dpp = new Date(dataDum);

    dpp.setDate(
        dpp.getDate() + 280
    );

    document.getElementById(
        "gestDPP"
    ).value =
        dpp.toLocaleDateString("pt-BR");
}

function mostrarOutroMetodoTB() {
    const rx = document.getElementById("tbRadiografia")?.value;
    const bacilo = document.getElementById("tbBaciloscopia")?.value;
    const box = document.getElementById("tbOutroMetodoBox");

    if (!box) return;

    box.style.display =
        rx === "Não" || bacilo === "Não"
            ? "block"
            : "none";
}

function mostrarMotivoUrgente(valor) {
    const box = document.getElementById("motivoUrgenteBox");

    if (!box) return;

    box.style.display =
        valor === "Sim"
            ? "block"
            : "none";
}

function classificarAMPI() {
    const pontuacao = parseInt(document.getElementById("ampiPontuacao")?.value);
    const campo = document.getElementById("ampiPaciente");

    if (!campo || isNaN(pontuacao)) return;

    if (pontuacao <= 5) {
        campo.value = "Idoso Robusto";
    } else if (pontuacao <= 10) {
        campo.value = "Idoso em Risco de Fragilização";
    } else {
        campo.value = "Idoso Fragilizado";
    }
}

function buscarCEP() {
    const cepInput = document.getElementById("CEP");
    const endInput = document.getElementById("endPaciente");
    const numeroInput = document.getElementById("endNumero");

    if (!cepInput || !endInput) return;

    const cep = cepInput.value.replace(/\D/g, "");

    if (cep.length !== 8) {
        mostrarToast("⚠️ CEP deve ter 8 números.");
        return;
    }

    endInput.value = "Buscando endereço...";

    fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(response => response.json())
        .then(dados => {
            if (dados.erro) {
                endInput.value = "";
                mostrarToast("❌ CEP não encontrado.");
                return;
            }

            endInput.value = `${dados.logradouro}, ${dados.bairro}, ${dados.localidade} - ${dados.uf}`;

            if (numeroInput) {
                numeroInput.focus();
            }
        })
        .catch(() => {
            endInput.value = "";
            mostrarToast("❌ Erro ao buscar CEP.");
        });
}

function carregarDatalistCIAP() {
    const lista = document.getElementById("listaCIAP");

    if (!lista) {
        console.error("listaCIAP não encontrada.");
        return;
    }

    lista.innerHTML = "";

    if (!window.CIAP2 || typeof window.CIAP2 !== "object") {
        console.error("Dicionário CIAP2 não carregado.");
        return;
    }

    Object.entries(window.CIAP2).forEach(([codigo, descricao]) => {
        const option = document.createElement("option");
        option.value = `${codigo} - ${descricao}`;
        lista.appendChild(option);
    });

    console.log(
        "✅ CIAP carregado no datalist:",
        Object.keys(window.CIAP2).length
    );
}

async function salvarPacienteSupabaseSilencioso(paciente) {
    try {
        const usuarioAtual = await supabaseClient.auth.getUser();

        if (usuarioAtual.error || !usuarioAtual.data.user) {
            console.warn("Supabase: usuario nao logado.");
            return false;
        }

        const usuario = usuarioAtual.data.user;

        const registroOnline = {
            usuario_id: usuario.id,
            nome: paciente.nome || "",
            cpf: paciente.cpf || "",
            cns: paciente.cns || "",
            telefone: paciente.telefone || "",
            endereco: paciente.endereco || ""
        };

        const resultado = await supabaseClient
            .from("pacientes")
            .upsert([registroOnline], {
                onConflict: "cpf"
            });

        if (resultado.error) {
            console.error("Erro ao sincronizar Supabase:", resultado.error);
            return false;
        }

        console.log("Paciente sincronizado silenciosamente no Supabase.");
        return true;

    } catch (erro) {
        console.error("Falha inesperada no Supabase:", erro);
        return false;
    }
}
