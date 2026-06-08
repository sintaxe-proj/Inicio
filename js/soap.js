/* ==========================================================================
   🩺 SOAP.JS — PRONTUÁRIO DIGITAL SUPABASE + AUTOCOMPLETE
   ========================================================================== */

/* ==========================================================================
   🔄 EXAME FÍSICO
   ========================================================================== */

function alternarExameFisico(status) {
    const bloco = document.getElementById("blocoExameAlterado");
    const campo = document.getElementById("soapObjetivoAlterado");

    if (!bloco) return;

    if (status === "Alterado") {
        bloco.style.display = "block";
        campo?.focus();
    } else {
        bloco.style.display = "none";
        if (campo) campo.value = "";
    }
}

/* ==========================================================================
   🧹 LIMPAR FORMULÁRIO
   ========================================================================== */

function limparFormularioProntuario() {
    const ids = [
        "soapSubjetivo",
        "objPA",
        "objPAS",
        "objPAD",
        "objFC",
        "objFR",
        "objSatO2",
        "objDor",
        "objpeso",
        "objaltura",
        "objIMC",
        "soapObjetivoAlterado",
        "soapPlanoConduta",
        "soapReavaliacaoDias",
        "notaMonitoramento",
        "inputBuscaCIAPS",

        "nomePaciente",
        "cpfPaciente",
        "cnsPaciente",
        "nascPaciente",
        "idadePaciente",
        "telPaciente",

        "CEP",
        "endPaciente",
        "endNumero",
        "endComplemento",
        "unidadePaciente",
        "equipePaciente",

        "hasPAS",
        "hasPAD",
        "hasClassif",
        "hasDataRetinopatia",
        "hasRetinopatia",

        "dmHbA1c",
        "dmClassif",
        "dmDataRetinopatia",
        "dmRetinopatia",
        "dmPeDiabeticoGrau",

        "gestDUM",
        "gestIG",
        "gestDPP",

        "tbDataDiagnostico",
        "tbFaseTratamento",
        "tbDataBaciloscopia",
        "tbResultadoBaciloscopia",

        "hansenDataDiagnostico",
        "hansenClassificacao",
        "hansenGrauIncapacidade",
        "hansenSituacaoTratamento",

        "planoTerapeuticoSingular"
    ];

    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    const objDor = document.getElementById("objDor");
    if (objDor) objDor.value = "0";

    const prazo = document.getElementById("soapReavaliacaoDias");
    if (prazo) prazo.value = "0";

    const hasSN = document.getElementById("hasSN");
    if (hasSN) hasSN.value = "Não";

    const dmSN = document.getElementById("dmSN");
    if (dmSN) dmSN.value = "Não";

    const gestanteSN = document.getElementById("gestanteSN");
    if (gestanteSN) gestanteSN.value = "Não";

    const tbSN = document.getElementById("tbSN");
    if (tbSN) tbSN.value = "Não";

    const hansenSN = document.getElementById("hansenSN");
    if (hansenSN) hansenSN.value = "Não";

    const exameNormal = document.querySelector('input[name="exameFisicoStatus"][value="Normal"]');
    if (exameNormal) exameNormal.checked = true;

    const blocoExame = document.getElementById("blocoExameAlterado");
    if (blocoExame) blocoExame.style.display = "none";

    const linhaTempo = document.getElementById("linhaTempoEvolucoes");
    if (linhaTempo) linhaTempo.innerHTML = "";

    const painelRisco = document.getElementById("painelRiscoClinico");
    if (painelRisco) painelRisco.innerHTML = "";

    mostrarCardsLinhasCuidado();
}

/* ==========================================================================
   👴 IDADE
   ========================================================================== */

function calcIdade() {
    const nasc = document.getElementById("nascPaciente")?.value;
    if (!nasc) return;

    const hoje = new Date();
    const dataNasc = new Date(nasc);

    let idade = hoje.getFullYear() - dataNasc.getFullYear();

    const m = hoje.getMonth() - dataNasc.getMonth();

    if (
        m < 0 ||
        (
            m === 0 &&
            hoje.getDate() < dataNasc.getDate()
        )
    ) {
        idade--;
    }

    const campoIdade = document.getElementById("idadePaciente");
    if (campoIdade) campoIdade.value = idade;

    const ampi = document.getElementById("ampiBloco");

    if (ampi) {
        ampi.style.display = idade >= 60 ? "block" : "none";
    }
}

/* ==========================================================================
   ❤️ CLASSIFICAÇÃO HAS
   ========================================================================== */

function classificarHAS() {
    const pas = parseInt(document.getElementById("hasPAS")?.value);
    const pad = parseInt(document.getElementById("hasPAD")?.value);
    const campo = document.getElementById("hasClassif");

    if (!campo) return;

    if (!pas || !pad) {
        campo.value = "";
        return;
    }

    if (pas >= 180 || pad >= 110) {
        campo.value = "Crise Hipertensiva";
        campo.style.color = "var(--danger)";
    } else if (pas >= 140 || pad >= 90) {
        campo.value = "Hipertensão Estágio 1/2";
        campo.style.color = "var(--warning)";
    } else {
        campo.value = "Pressão Controlada";
        campo.style.color = "var(--success)";
    }
}

/* ==========================================================================
   🍬 CLASSIFICAÇÃO DM
   ========================================================================== */

function classificarDM() {
    const hba1c = parseFloat(document.getElementById("dmHbA1c")?.value);
    const campo = document.getElementById("dmClassif");

    if (!campo) return;

    if (!hba1c) {
        campo.value = "";
        return;
    }

    if (hba1c >= 8) {
        campo.value = "Controle Ruim";
        campo.style.color = "var(--danger)";
    } else if (hba1c >= 7) {
        campo.value = "Controle Limítrofe";
        campo.style.color = "var(--warning)";
    } else {
        campo.value = "Excelente Controle";
        campo.style.color = "var(--success)";
    }
}

/* ==========================================================================
   🤰 IDADE GESTACIONAL
   ========================================================================== */

function calcIG() {
    const dum = document.getElementById("gestDUM")?.value;
    if (!dum) return;

    const dataDum = new Date(dum);
    const hoje = new Date();

    const diffTime = Math.abs(hoje - dataDum);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const semanas = Math.floor(diffDays / 7);
    const dias = diffDays % 7;

    const campoIG = document.getElementById("gestIG");
    if (campoIG) campoIG.value = `${semanas}s ${dias}d`;

    const dpp = new Date(dataDum);
    dpp.setDate(dpp.getDate() + 280);

    const campoDPP = document.getElementById("gestDPP");
    if (campoDPP) campoDPP.value = dpp.toLocaleDateString("pt-BR");
}

/* ==========================================================================
   🔄 SINCRONIZAR PA OBJETIVO ↔ HAS
   ========================================================================== */

function sincronizarPAObjetivoParaHAS() {
    const objPAS = document.getElementById("objPAS")?.value || "";
    const objPAD = document.getElementById("objPAD")?.value || "";

    const hasPAS = document.getElementById("hasPAS");
    const hasPAD = document.getElementById("hasPAD");

    if (hasPAS && objPAS) hasPAS.value = objPAS;
    if (hasPAD && objPAD) hasPAD.value = objPAD;

    if (typeof classificarHAS === "function") {
        classificarHAS();
    }
}

function sincronizarPAHASParaObjetivo() {
    const hasPAS = document.getElementById("hasPAS")?.value || "";
    const hasPAD = document.getElementById("hasPAD")?.value || "";

    const objPAS = document.getElementById("objPAS");
    const objPAD = document.getElementById("objPAD");

    if (objPAS && hasPAS) objPAS.value = hasPAS;
    if (objPAD && hasPAD) objPAD.value = hasPAD;
}

/* ==========================================================================
   🔎 AUTOCOMPLETE PACIENTE
   ========================================================================== */

let timerBuscaPaciente = null;

function iniciarAutocompletePaciente() {
    const cpfInput = document.getElementById("cpfPaciente");
    const cnsInput = document.getElementById("cnsPaciente");

    if (cpfInput) {
        cpfInput.addEventListener("input", agendarBuscaPacientePorDocumento);
        cpfInput.addEventListener("blur", buscarPacientePorDocumento);
    }

    if (cnsInput) {
        cnsInput.addEventListener("input", agendarBuscaPacientePorDocumento);
        cnsInput.addEventListener("blur", buscarPacientePorDocumento);
    }
}

function agendarBuscaPacientePorDocumento() {
    clearTimeout(timerBuscaPaciente);
    timerBuscaPaciente = setTimeout(() => {
        buscarPacientePorDocumento();
    }, 700);
}

async function buscarPacientePorDocumento() {
    if (typeof supabaseClient === "undefined") return;

    const cpf = document.getElementById("cpfPaciente")?.value?.replace(/\D/g, "") || "";
    const cns = document.getElementById("cnsPaciente")?.value?.replace(/\D/g, "") || "";

    if (cpf.length < 11 && cns.length < 15) return;

    let query = supabaseClient
        .from("pacientes")
        .select("*")
        .limit(1);

    if (cpf.length >= 11) {
        query = query.eq("cpf", cpf);
    } else {
        query = query.eq("cns", cns);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Erro ao buscar paciente:", error);
        return;
    }

    if (!data || data.length === 0) return;

    preencherPacienteNoFormulario(data[0]);
    await carregarHistoricoClinicoPaciente(data[0].cpf, data[0].cns);

    mostrarToast?.("✅ Paciente encontrado.");
}

function preencherPacienteNoFormulario(p) {
    preencherSeVazio("nomePaciente", p.nome);
    preencherSeVazio("cpfPaciente", p.cpf);
    preencherSeVazio("cnsPaciente", p.cns);
    preencherSeVazio("telPaciente", p.telefone);
    preencherSeVazio("endPaciente", p.endereco);

    preencherSeVazio(
        "unidadePaciente",
        p.unidade || p.ubs || p.ubs_vinculacao
    );

    preencherSeVazio(
        "equipePaciente",
        p.equipe || p.equipe_esf
    );
}

function preencherSeVazio(id, valor) {
    const campo = document.getElementById(id);

    if (!campo || valor === undefined || valor === null) return;

    if (!campo.value) {
        campo.value = valor;
    }
}

/* ==========================================================================
   ⏳ HISTÓRICO CLÍNICO
   ========================================================================== */

async function carregarHistoricoClinicoPaciente(cpf, cns) {
    const container = document.getElementById("linhaTempoEvolucoes");
    if (!container) return;

    const filtros = [];

    if (cpf) {
        filtros.push(`paciente_cpf.eq.${cpf}`);
        filtros.push(`cpf.eq.${cpf}`);
    }

    if (cns) {
        filtros.push(`cns.eq.${cns}`);
    }
    if (filtros.length === 0) return;

    const { data, error } = await supabaseClient
        .from("atendimentos")
        .select("*")
        .or(filtros.join(","))
        .order("criado_em", { ascending: false });

    if (error) {
        console.error("Erro histórico:", error);
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = `
            <p style="color:var(--text-muted);">
                Sem histórico clínico.
            </p>
        `;
        return;
    }

    container.innerHTML = `
        <label style="font-weight:700;">
            ⏳ Histórico Clínico
        </label>

        <div class="timeline">
            ${data.map(at => `
                <div class="timeline-item">
                    <div class="timeline-body">
                        <strong>${formatarDataHistorico(at.criado_em)}</strong>

                        <br>
                        <b>S:</b> ${at.soapSubjetivo || "-"}

                        <br>
                        <b>O:</b> ${
                            at.soapObjetivoAlterado ||
                            [
                                at.obj_pas ? `PAS ${at.obj_pas}` : "",
                                at.obj_pad ? `PAD ${at.obj_pad}` : ""
                            ].filter(Boolean).join(" / ") ||
                            "-"
                        }

                        <br>
                        <b>A:</b> ${at.inputBuscaCIAPS || "-"}

                        <br>
                        <b>P:</b> ${at.soapPlanoConduta || "-"}

                        ${at.nota_monitoramento ? `
                            <br>
                            <b>Nota:</b> ${at.nota_monitoramento}
                        ` : ""}

                        <br>
                        <small>${at.usuario_email || "-"}</small>
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

function formatarDataHistorico(valor) {
    if (!valor) return "-";
    return new Date(valor).toLocaleString("pt-BR");
}

/* ==========================================================================
   💾 SALVAR PRONTUÁRIO SUPABASE
   ========================================================================== */

async function salvarProntuario() {
    try {
        const auth = await supabaseClient.auth.getUser();

        if (auth.error || !auth.data.user) {
            alert("Faça login novamente.");
            return;
        }

        const usuario = auth.data.user;

        /* ==================================================
           PACIENTE
           ================================================== */

        const paciente = {
            usuario_id: usuario.id,

            nome: document.getElementById("nomePaciente")?.value || "",

            cpf: document.getElementById("cpfPaciente")?.value?.replace(/\D/g, "") || "",

            cns: document.getElementById("cnsPaciente")?.value?.replace(/\D/g, "") || "",

            telefone: document.getElementById("telPaciente")?.value || "",

            endereco: document.getElementById("endPaciente")?.value || "",

            ubs_vinculacao: document.getElementById("unidadePaciente")?.value || "",

            equipe_esf: document.getElementById("equipePaciente")?.value || ""
        };

        if (!paciente.nome || (!paciente.cpf && !paciente.cns)) {
            alert("Informe nome e CPF/CNS.");
            return;
        }

        /* ==================================================
           UPSERT PACIENTE
           ================================================== */

        const { error: erroPaciente } = await supabaseClient
            .from("pacientes")
            .upsert([paciente], {
                onConflict: paciente.cpf ? "cpf" : "cns"
            });

        if (erroPaciente) {
            console.error(erroPaciente);
            alert("Erro ao salvar paciente.");
            return;
        }

        /* ==================================================
           RISCO
           ================================================== */

        const risco =
            calcularRiscoGlobalPaciente?.({
                idadePaciente: document.getElementById("idadePaciente")?.value || 0,
                hasSN: document.getElementById("hasSN")?.value || "Não",
                dmSN: document.getElementById("dmSN")?.value || "Não",
                tbSN: document.getElementById("tbSN")?.value || "Não",
                hansenSN: document.getElementById("hansenSN")?.value || "Não",
                gestanteSN: document.getElementById("gestanteSN")?.value || "Não",
                hasClassif: document.getElementById("hasClassif")?.value || "",
                dmClassif: document.getElementById("dmClassif")?.value || ""
            }) || {};

        /* ==================================================
           ATENDIMENTO
           Nomes padronizados conforme Supabase
           ================================================== */

        const atendimento = {
    usuario_id: usuario.id,
    usuario_email: usuario.email,

    paciente_cpf: paciente.cpf || null,
    cpf: paciente.cpf || null,

    cns: paciente.cns || null,
    nome_paciente: paciente.nome,

    ubs_vinculacao: paciente.ubs_vinculacao || null,
    equipe_esf: paciente.equipe_esf || null,

    subjetivo: document.getElementById("soapSubjetivo")?.value || "",
    objetivo: document.getElementById("soapObjetivoAlterado")?.value || "",
    avaliacao: document.getElementById("inputBuscaCIAPS")?.value || "",
    plano: document.getElementById("soapPlanoConduta")?.value || "",

    soapSubjetivo: document.getElementById("soapSubjetivo")?.value || "",
    soapObjetivoAlterado: document.getElementById("soapObjetivoAlterado")?.value || "",
    inputBuscaCIAPS: document.getElementById("inputBuscaCIAPS")?.value || "",
    soapPlanoConduta: document.getElementById("soapPlanoConduta")?.value || "",

    retorno_dias: Number(document.getElementById("soapReavaliacaoDias")?.value || 0),
    reavaliacaoDias: Number(document.getElementById("soapReavaliacaoDias")?.value || 0),

    pa: (
        document.getElementById("objPAS")?.value ||
        document.getElementById("objPAD")?.value
    )
        ? `${document.getElementById("objPAS")?.value || ""}x${document.getElementById("objPAD")?.value || ""}`
        : "",

    obj_pas: document.getElementById("objPAS")?.value || null,
    obj_pad: document.getElementById("objPAD")?.value || null,

    fc: document.getElementById("objFC")?.value || "",
    fr: document.getElementById("objFR")?.value || "",
    sat_o2: document.getElementById("objSatO2")?.value || "",
    dor: document.getElementById("objDor")?.value || "",
    peso: document.getElementById("objpeso")?.value || "",
    altura: document.getElementById("objaltura")?.value || "",
    imc: document.getElementById("objIMC")?.value || "",

    has: document.getElementById("hasSN")?.value || "Não",
    has_pas: document.getElementById("hasPAS")?.value || null,
    has_pad: document.getElementById("hasPAD")?.value || null,
    has_classificacao: document.getElementById("hasClassif")?.value || "",
    has_data_retinopatia: document.getElementById("hasDataRetinopatia")?.value || null,
    has_retinopatia: document.getElementById("hasRetinopatia")?.value || "",

    dm: document.getElementById("dmSN")?.value || "Não",
    dm_hba1c: document.getElementById("dmHbA1c")?.value || null,
    dm_classificacao: document.getElementById("dmClassif")?.value || "",
    dm_data_retinopatia: document.getElementById("dmDataRetinopatia")?.value || null,
    dm_retinopatia: document.getElementById("dmRetinopatia")?.value || "",
    dm_pe_diabetico_grau: document.getElementById("dmPeDiabeticoGrau")?.value || "",

    gestante: document.getElementById("gestanteSN")?.value || "Não",
    gestDUM: document.getElementById("gestDUM")?.value || null,
    gestIG: document.getElementById("gestIG")?.value || "",
    gestDPP: document.getElementById("gestDPP")?.value || "",

    tb: document.getElementById("tbSN")?.value || "Não",
    tb_data_diagnostico: document.getElementById("tbDataDiagnostico")?.value || null,
    tb_fase_tratamento: document.getElementById("tbFaseTratamento")?.value || "",
    tb_data_baciloscopia: document.getElementById("tbDataBaciloscopia")?.value || null,
    tb_resultado_baciloscopia: document.getElementById("tbResultadoBaciloscopia")?.value || "",

    hansen: document.getElementById("hansenSN")?.value || "Não",
    hansen_data_diagnostico: document.getElementById("hansenDataDiagnostico")?.value || null,
    hansen_classificacao: document.getElementById("hansenClassificacao")?.value || "",
    hansen_grau_incapacidade: document.getElementById("hansenGrauIncapacidade")?.value || "",
    hansen_situacao_tratamento: document.getElementById("hansenSituacaoTratamento")?.value || "",

    risco_global: risco.classificacao || null,
    risco_pontos: risco.pontos || 0,

    plano_terapeutico: document.getElementById("planoTerapeuticoSingular")?.value || "",
    nota_monitoramento: document.getElementById("notaMonitoramento")?.value || "",

    criado_em: new Date().toISOString(),
    data_atendimento: new Date().toISOString()
};

        /* ==================================================
           SALVAR ATENDIMENTO
           ================================================== */

        const { error: erroAtendimento } = await supabaseClient
            .from("atendimentos")
            .insert([atendimento]);

        if (erroAtendimento) {
            console.error(erroAtendimento);
            alert("Erro ao salvar atendimento.");
            return;
        }

        mostrarToast?.("✅ Prontuário salvo.");

        atualizarIndicatorsDashboard?.();
        atualizarCentralAvisosSininho?.();

        await carregarHistoricoClinicoPaciente(
            paciente.cpf,
            paciente.cns
        );

    } catch (erro) {
        console.error("Erro prontuário:", erro);
        alert("Erro inesperado.");
    }
}

/* ==========================================================================
   🧩 HELPERS
   ========================================================================== */

function mostrarCard(id, valor) {
    const card = document.getElementById(id);
    if (!card) return;

    card.style.display = valor === "Sim" ? "block" : "none";
}

function mostrarCardsLinhasCuidado() {
    const has = document.getElementById("hasSN")?.value === "Sim";
    const dm = document.getElementById("dmSN")?.value === "Sim";
    const gest = document.getElementById("gestanteSN")?.value === "Sim";
    const tb = document.getElementById("tbSN")?.value === "Sim";
    const hansen = document.getElementById("hansenSN")?.value === "Sim";

    const cardHAS = document.getElementById("cardHAS");
    if (cardHAS) cardHAS.style.display = has ? "block" : "none";

    const cardDM = document.getElementById("cardDM");
    if (cardDM) cardDM.style.display = dm ? "block" : "none";

    const cardGestante = document.getElementById("cardGestante");
    if (cardGestante) cardGestante.style.display = gest ? "block" : "none";

    const cardTB = document.getElementById("cardTB");
    if (cardTB) cardTB.style.display = tb ? "block" : "none";

    const cardHansen = document.getElementById("cardHansen");
    if (cardHansen) cardHansen.style.display = hansen ? "block" : "none";
}

/* ==========================================================================
   ❌ FECHAR PRONTUÁRIO ATIVO
   ========================================================================== */

function fecharProntuarioAtivo() {
    window.pacienteAtual = null;
    window.pacienteSelecionado = null;

    const cabecalho = document.getElementById("cabecalhoProntuario");
    const cabecalhoNome = document.getElementById("cabecalhoNome");

    if (cabecalho) cabecalho.style.display = "none";
    if (cabecalhoNome) cabecalhoNome.innerHTML = "";

    limparFormularioProntuario();

    mostrarToast?.("📋 Prontuário encerrado.");
}

/* ==========================================================================
   🚀 START
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    iniciarAutocompletePaciente();
    mostrarCardsLinhasCuidado();
});

/* ==========================================================================
   🌎 GLOBAL
   ========================================================================== */

window.salvarProntuario = salvarProntuario;
window.buscarPacientePorDocumento = buscarPacientePorDocumento;
window.carregarHistoricoClinicoPaciente = carregarHistoricoClinicoPaciente;
window.limparFormularioProntuario = limparFormularioProntuario;
window.calcIdade = calcIdade;
window.classificarHAS = classificarHAS;
window.classificarDM = classificarDM;
window.calcIG = calcIG;
window.alternarExameFisico = alternarExameFisico;
window.mostrarCard = mostrarCard;
window.mostrarCardsLinhasCuidado = mostrarCardsLinhasCuidado;
window.fecharProntuarioAtivo = fecharProntuarioAtivo;
window.sincronizarPAObjetivoParaHAS = sincronizarPAObjetivoParaHAS;
window.sincronizarPAHASParaObjetivo = sincronizarPAHASParaObjetivo;
