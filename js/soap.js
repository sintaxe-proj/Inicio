/* ==========================================================================
   🩺 SOAP.JS — PRONTUÁRIO DIGITAL SUPABASE + AUTOCOMPLETE
   ========================================================================== */

/* ==========================================================================
   🔄 EXAME FÍSICO
   ========================================================================== */

function alternarExameFisico(status) {

    const bloco =
        document.getElementById(
            "blocoExameAlterado"
        );

    if (!bloco) return;

    if (status === "Alterado") {

        bloco.style.display =
            "block";

        document.getElementById(
            "soapObjetivoAlterado"
        )?.focus();

    } else {

        bloco.style.display =
            "none";

        document.getElementById(
            "soapObjetivoAlterado"
        ).value = "";
    }
}

/* ==========================================================================
   🧹 LIMPAR FORMULÁRIO
   ========================================================================== */

function limparFormularioProntuario() {

    const ids = [

        "soapSubjetivo",
        "objPA",
        "objFC",
        "objFR",
        "objSatO2",
        "objDor",
        "soapObjetivoAlterado",
        "soapPlanoConduta",
        "soapReavaliacaoDias",
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

        "hasPAS",
        "hasPAD",
        "hasClassif",

        "dmHbA1c",
        "dmClassif",

        "gestDUM",
        "gestIG",
        "gestDPP",

        "planoTerapeuticoSingular"
    ];

    ids.forEach(id => {

        const el =
            document.getElementById(id);

        if (el) {
            el.value = "";
        }
    });

    document.getElementById(
        "objDor"
    ).value = "0";

    document.getElementById(
        "soapReavaliacaoDias"
    ).value = "0";

    document.getElementById(
        "hasSN"
    ).value = "Não";

    document.getElementById(
        "dmSN"
    ).value = "Não";

    document.getElementById(
        "gestanteSN"
    ).value = "Não";

    document.getElementById(
        "tbSN"
    ).checked = false;

    document.getElementById(
        "hansenSN"
    ).checked = false;

    document.getElementById(
        "linhaTempoEvolucoes"
    ).innerHTML = "";

    mostrarCardsLinhasCuidado();
}

/* ==========================================================================
   👴 IDADE
   ========================================================================== */

function calcIdade() {

    const nasc =
        document.getElementById(
            "nascPaciente"
        )?.value;

    if (!nasc) return;

    const hoje =
        new Date();

    const dataNasc =
        new Date(nasc);

    let idade =
        hoje.getFullYear() -
        dataNasc.getFullYear();

    const m =
        hoje.getMonth() -
        dataNasc.getMonth();

    if (
        m < 0 ||
        (
            m === 0 &&
            hoje.getDate() <
            dataNasc.getDate()
        )
    ) {

        idade--;
    }

    document.getElementById(
        "idadePaciente"
    ).value = idade;

    const ampi =
        document.getElementById(
            "ampiBloco"
        );

    if (ampi) {

        ampi.style.display =
            idade >= 60
                ? "block"
                : "none";
    }
}

/* ==========================================================================
   ❤️ CLASSIFICAÇÃO HAS
   ========================================================================== */

function classificarHAS() {

    const pas =
        parseInt(
            document.getElementById(
                "hasPAS"
            )?.value
        );

    const pad =
        parseInt(
            document.getElementById(
                "hasPAD"
            )?.value
        );

    const campo =
        document.getElementById(
            "hasClassif"
        );

    if (!campo) return;

    if (!pas || !pad) {

        campo.value = "";
        return;
    }

    if (pas >= 180 || pad >= 110) {

        campo.value =
            "Crise Hipertensiva";

        campo.style.color =
            "var(--danger)";
    }

    else if (
        pas >= 140 ||
        pad >= 90
    ) {

        campo.value =
            "Hipertensão Estágio 1/2";

        campo.style.color =
            "var(--warning)";
    }

    else {

        campo.value =
            "Pressão Controlada";

        campo.style.color =
            "var(--success)";
    }
}

/* ==========================================================================
   🍬 CLASSIFICAÇÃO DM
   ========================================================================== */

function classificarDM() {

    const hba1c =
        parseFloat(
            document.getElementById(
                "dmHbA1c"
            )?.value
        );

    const campo =
        document.getElementById(
            "dmClassif"
        );

    if (!campo) return;

    if (!hba1c) {

        campo.value = "";
        return;
    }

    if (hba1c >= 8) {

        campo.value =
            "Controle Ruim";

        campo.style.color =
            "var(--danger)";
    }

    else if (hba1c >= 7) {

        campo.value =
            "Controle Limítrofe";

        campo.style.color =
            "var(--warning)";
    }

    else {

        campo.value =
            "Excelente Controle";

        campo.style.color =
            "var(--success)";
    }
}

/* ==========================================================================
   🤰 IDADE GESTACIONAL
   ========================================================================== */

function calcIG() {

    const dum =
        document.getElementById(
            "gestDUM"
        )?.value;

    if (!dum) return;

    const dataDum =
        new Date(dum);

    const hoje =
        new Date();

    const diffTime =
        Math.abs(
            hoje - dataDum
        );

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
        `${semanas}s ${dias}d`;

    const dpp =
        new Date(dataDum);

    dpp.setDate(
        dpp.getDate() + 280
    );

    document.getElementById(
        "gestDPP"
    ).value =
        dpp.toLocaleDateString(
            "pt-BR"
        );
}

/* ==========================================================================
   🔎 AUTOCOMPLETE PACIENTE
   ========================================================================== */

let timerBuscaPaciente = null;

function iniciarAutocompletePaciente() {

    const cpfInput =
        document.getElementById(
            "cpfPaciente"
        );

    const cnsInput =
        document.getElementById(
            "cnsPaciente"
        );

    if (cpfInput) {

        cpfInput.addEventListener(
            "input",
            agendarBuscaPacientePorDocumento
        );

        cpfInput.addEventListener(
            "blur",
            buscarPacientePorDocumento
        );
    }

    if (cnsInput) {

        cnsInput.addEventListener(
            "input",
            agendarBuscaPacientePorDocumento
        );

        cnsInput.addEventListener(
            "blur",
            buscarPacientePorDocumento
        );
    }
}

function agendarBuscaPacientePorDocumento() {

    clearTimeout(
        timerBuscaPaciente
    );

    timerBuscaPaciente =
        setTimeout(() => {

            buscarPacientePorDocumento();

        }, 700);
}

async function buscarPacientePorDocumento() {

    if (
        typeof supabaseClient ===
        "undefined"
    ) return;

    const cpf =
        document.getElementById(
            "cpfPaciente"
        )?.value
            ?.replace(/\D/g, "") || "";

    const cns =
        document.getElementById(
            "cnsPaciente"
        )?.value
            ?.replace(/\D/g, "") || "";

    if (
        cpf.length < 11 &&
        cns.length < 15
    ) return;

    let query =
        supabaseClient
            .from("pacientes")
            .select("*")
            .limit(1);

    if (cpf.length >= 11) {

        query =
            query.eq(
                "cpf",
                cpf
            );

    } else {

        query =
            query.eq(
                "cns",
                cns
            );
    }

    const {
        data,
        error
    } = await query;

    if (error) {

        console.error(
            "Erro ao buscar paciente:",
            error
        );

        return;
    }

    if (
        !data ||
        data.length === 0
    ) return;

    preencherPacienteNoFormulario(
        data[0]
    );

    await carregarHistoricoClinicoPaciente(
        data[0].cpf,
        data[0].cns
    );

    mostrarToast?.(
        "✅ Paciente encontrado."
    );
}

function preencherPacienteNoFormulario(p) {

    preencherSeVazio(
        "nomePaciente",
        p.nome
    );

    preencherSeVazio(
        "cpfPaciente",
        p.cpf
    );

    preencherSeVazio(
        "cnsPaciente",
        p.cns
    );

    preencherSeVazio(
        "telPaciente",
        p.telefone
    );

    preencherSeVazio(
        "endPaciente",
        p.endereco
    );

    preencherSeVazio(
        "unidadePaciente",
        p.unidade
    );

    preencherSeVazio(
        "equipePaciente",
        p.equipe
    );
}

function preencherSeVazio(id, valor) {

    const campo =
        document.getElementById(id);

    if (
        !campo ||
        valor === undefined ||
        valor === null
    ) return;

    if (!campo.value) {
        campo.value = valor;
    }
}

/* ==========================================================================
   ⏳ HISTÓRICO CLÍNICO
   ========================================================================== */

async function carregarHistoricoClinicoPaciente(cpf, cns) {

    const container =
        document.getElementById(
            "linhaTempoEvolucoes"
        );

    if (!container) return;

    const filtros = [];

    if (cpf) {
        filtros.push(
            `cpf.eq.${cpf}`
        );
    }

    if (cns) {
        filtros.push(
            `cns.eq.${cns}`
        );
    }

    if (
        filtros.length === 0
    ) return;

    const {
        data,
        error
    } =
    await supabaseClient
        .from("atendimentos")
        .select("*")
        .or(
            filtros.join(",")
        )
        .order(
            "criado_em",
            {
                ascending: false
            }
        );

    if (error) {

        console.error(
            "Erro histórico:",
            error
        );

        return;
    }

    if (
        !data ||
        data.length === 0
    ) {

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

                        <strong>
                            ${formatarDataHistorico(
                                at.criado_em
                            )}
                        </strong>

                        <br>

                        <b>S:</b>
                        ${at.soapSubjetivo || "-"}

                        <br>

                        <b>O:</b>
                        ${at.soapObjetivoAlterado || "-"}

                        <br>

                        <b>A:</b>
                        ${at.inputBuscaCIAPS || "-"}

                        <br>

                        <b>P:</b>
                        ${at.soapPlanoConduta || "-"}

                        <br>

                        <small>
                            ${at.usuario_email || "-"}
                        </small>

                    </div>

                </div>

            `).join("")}

        </div>
    `;
}

function formatarDataHistorico(valor) {

    if (!valor) return "-";

    return new Date(valor)
        .toLocaleString("pt-BR");
}

/* ==========================================================================
   💾 SALVAR PRONTUÁRIO SUPABASE
   ========================================================================== */

async function salvarProntuario() {

    try {

        const auth =
            await supabaseClient
                .auth
                .getUser();

        if (
            auth.error ||
            !auth.data.user
        ) {

            alert(
                "Faça login novamente."
            );

            return;
        }

        const usuario =
            auth.data.user;

        /* ==================================================
           PACIENTE
           ================================================== */

        const paciente = {

            usuario_id:
                usuario.id,

            nome:
                document.getElementById(
                    "nomePaciente"
                )?.value || "",

            cpf:
                document.getElementById(
                    "cpfPaciente"
                )?.value
                    ?.replace(/\D/g, "") || "",

            cns:
                document.getElementById(
                    "cnsPaciente"
                )?.value
                    ?.replace(/\D/g, "") || "",

            telefone:
                document.getElementById(
                    "telPaciente"
                )?.value || "",

            endereco:
                document.getElementById(
                    "endPaciente"
                )?.value || "",

            unidade:
                document.getElementById(
                    "unidadePaciente"
                )?.value || "",

            equipe:
                document.getElementById(
                    "equipePaciente"
                )?.value || ""
        };

        if (
            !paciente.nome ||
            (
                !paciente.cpf &&
                !paciente.cns
            )
        ) {

            alert(
                "Informe nome e CPF/CNS."
            );

            return;
        }

        /* ==================================================
           UPSERT PACIENTE
           ================================================== */

        const {
            error: erroPaciente
        } =
        await supabaseClient
            .from("pacientes")
            .upsert(
                [paciente],
                {
                    onConflict:
                        paciente.cpf
                            ? "cpf"
                            : "cns"
                }
            );

        if (erroPaciente) {

            console.error(
                erroPaciente
            );

            alert(
                "Erro ao salvar paciente."
            );

            return;
        }

        /* ==================================================
           RISCO
           ================================================== */

        const risco =
            calcularRiscoGlobalPaciente?.({

                idadePaciente:
                    document.getElementById(
                        "idadePaciente"
                    )?.value || 0,

                hasSN:
                    document.getElementById(
                        "hasSN"
                    )?.value || "Não",

                dmSN:
                    document.getElementById(
                        "dmSN"
                    )?.value || "Não"

            }) || {};

        /* ==================================================
           ATENDIMENTO
           ================================================== */

        const atendimento = {

            usuario_id:
                usuario.id,

            usuario_email:
                usuario.email,

            cpf:
                paciente.cpf || null,

            cns:
                paciente.cns || null,

            nome_paciente:
                paciente.nome,

            unidade:
                paciente.unidade,

            equipe:
                paciente.equipe,

            soapSubjetivo:
                document.getElementById(
                    "soapSubjetivo"
                )?.value || "",

            soapObjetivoAlterado:
                document.getElementById(
                    "soapObjetivoAlterado"
                )?.value || "",

            inputBuscaCIAPS:
                document.getElementById(
                    "inputBuscaCIAPS"
                )?.value || "",

            soapPlanoConduta:
                document.getElementById(
                    "soapPlanoConduta"
                )?.value || "",

            reavaliacaoDias:
                Number(
                    document.getElementById(
                        "soapReavaliacaoDias"
                    )?.value || 0
                ),

            pa:
                document.getElementById(
                    "objPA"
                )?.value || "",

            fc:
                document.getElementById(
                    "objFC"
                )?.value || "",

            fr:
                document.getElementById(
                    "objFR"
                )?.value || "",

            sat_o2:
                document.getElementById(
                    "objSatO2"
                )?.value || "",

            dor:
                document.getElementById(
                    "objDor"
                )?.value || "",

            peso:
                document.getElementById(
                    "objpeso"
                )?.value || "",

            altura:
                document.getElementById(
                    "objaltura"
                )?.value || "",

            imc:
                document.getElementById(
                    "objIMC"
                )?.value || "",

            has:
                document.getElementById(
                    "hasSN"
                )?.value || "Não",

            has_pas:
                document.getElementById(
                    "hasPAS"
                )?.value || "",

            has_pad:
                document.getElementById(
                    "hasPAD"
                )?.value || "",

            has_classificacao:
                document.getElementById(
                    "hasClassif"
                )?.value || "",

            dm:
                document.getElementById(
                    "dmSN"
                )?.value || "Não",

            dm_hba1c:
                document.getElementById(
                    "dmHbA1c"
                )?.value || "",

            dm_classificacao:
                document.getElementById(
                    "dmClassif"
                )?.value || "",

            gestante:
                document.getElementById(
                    "gestanteSN"
                )?.value || "Não",

            tb:
                document.getElementById(
                    "tbSN"
                )?.checked
                    ? "Sim"
                    : "Não",

            hansen:
                document.getElementById(
                    "hansenSN"
                )?.checked
                    ? "Sim"
                    : "Não",

            risco_global:
                risco.classificacao || null,

            risco_pontos:
                risco.pontos || 0,

            plano_terapeutico:
                document.getElementById(
                    "planoTerapeuticoSingular"
                )?.value || "",

            criado_em:
                new Date().toISOString()
        };

        /* ==================================================
           SALVAR ATENDIMENTO
           ================================================== */

        const {
            error: erroAtendimento
        } =
        await supabaseClient
            .from("atendimentos")
            .insert([
                atendimento
            ]);

        if (erroAtendimento) {

            console.error(
                erroAtendimento
            );

            alert(
                "Erro ao salvar atendimento."
            );

            return;
        }

        mostrarToast?.(
            "✅ Prontuário salvo."
        );

        atualizarIndicatorsDashboard?.();

        atualizarCentralAvisosSininho?.();

        await carregarHistoricoClinicoPaciente(
            paciente.cpf,
            paciente.cns
        );

    } catch (erro) {

        console.error(
            "Erro prontuário:",
            erro
        );

        alert(
            "Erro inesperado."
        );
    }
}

/* ==========================================================================
   🧩 HELPERS
   ========================================================================== */

function mostrarCardsLinhasCuidado() {

    const has =
        document.getElementById("hasSN")?.value === "Sim";

    const dm =
        document.getElementById("dmSN")?.value === "Sim";

    const gest =
        document.getElementById("gestanteSN")?.value === "Sim";

    document.getElementById(
        "cardHAS"
    ).style.display =
        has ? "block" : "none";

    document.getElementById(
        "cardDM"
    ).style.display =
        dm ? "block" : "none";

    document.getElementById(
        "cardGestante"
    ).style.display =
        gest ? "block" : "none";
}

/* ==========================================================================
   🚀 START
   ========================================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        iniciarAutocompletePaciente();

        mostrarCardsLinhasCuidado();
    }
);

/* ==========================================================================
   ❌ FECHAR PRONTUÁRIO ATIVO
   ========================================================================== */

function fecharProntuarioAtivo() {

    window.pacienteAtual = null;
    window.pacienteSelecionado = null;

    const cabecalho =
        document.getElementById(
            "cabecalhoProntuario"
        );

    const cabecalhoNome =
        document.getElementById(
            "cabecalhoNome"
        );

    if (cabecalho) {
        cabecalho.style.display = "none";
    }

    if (cabecalhoNome) {
        cabecalhoNome.innerHTML = "";
    }

    document
        .querySelectorAll(
            "#view-prontuario input, #view-prontuario textarea, #view-prontuario select"
        )
        .forEach(campo => {

            if (
                campo.type === "checkbox"
            ) {
                campo.checked = false;
            } else {
                campo.value = "";
            }

        });

    mostrarToast?.(
        "📋 Prontuário encerrado."
    );
}

window.fecharProntuarioAtivo =
    fecharProntuarioAtivo;

/* ==========================================================================
   🌎 GLOBAL
   ========================================================================== */

window.salvarProntuario =
    salvarProntuario;

window.buscarPacientePorDocumento =
    buscarPacientePorDocumento;

window.carregarHistoricoClinicoPaciente =
    carregarHistoricoClinicoPaciente;

window.limparFormularioProntuario =
    limparFormularioProntuario;

window.calcIdade =
    calcIdade;

window.classificarHAS =
    classificarHAS;

window.classificarDM =
    classificarDM;

window.calcIG =
    calcIG;

window.alternarExameFisico =
    alternarExameFisico;
