/* ==========================================================================
   🩺 SOAP.JS — PRONTUÁRIO DIGITAL SUPABASE + AUTOCOMPLETE + TERRITÓRIO INTELIGENTE
   pacientes = identificação
   atendimentos = dados clínicos
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

    ["hasSN", "dmSN", "gestanteSN", "tbSN", "hansenSN"].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        if (el.type === "checkbox") {
            el.checked = false;
        } else {
            el.value = "Não";
        }
    });

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
    const hba1c = parseFloat(
        String(document.getElementById("dmHbA1c")?.value || "")
            .replace(",", ".")
    );

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
   HELPERS DE VALOR
   ========================================================================== */

function valorSimNaoCampo(id) {
    const el = document.getElementById(id);
    if (!el) return "Não";

    if (el.type === "checkbox") {
        return el.checked ? "Sim" : "Não";
    }

    return el.value || "Não";
}

function numeroOuNull(valor) {
    if (valor === null || valor === undefined || valor === "") return null;

    const normalizado = String(valor)
        .replace(",", ".")
        .replace(/[^\d.]/g, "");

    if (!normalizado) return null;

    const numero = Number(normalizado);

    return Number.isNaN(numero) ? null : numero;
}

function inteiroOuNull(valor) {
    if (valor === null || valor === undefined || valor === "") return null;

    const numero = parseInt(String(valor).replace(/\D/g, ""));

    return Number.isNaN(numero) ? null : numero;
}

function dataOuNullSOAP(valor) {
    return valor ? valor : null;
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
    preencherSeVazio("nascPaciente", p.data_nascimento);
    preencherSeVazio("idadePaciente", p.idade_atual);
    preencherSeVazio("telPaciente", p.telefone);
    preencherSeVazio("CEP", p.cep);
    preencherSeVazio("endPaciente", p.endereco);
    preencherSeVazio("endNumero", p.numero);
    preencherSeVazio("endComplemento", p.complemento);

    preencherSeVazio(
        "unidadePaciente",
        p.ubs_vinculacao || p.unidade || p.ubs
    );

    preencherSeVazio(
        "equipePaciente",
        p.equipe_esf || p.equipe
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

    const cpfLimpo = String(cpf || "").replace(/\D/g, "");
    const cnsLimpo = String(cns || "").replace(/\D/g, "");

    if (cpfLimpo) {
        filtros.push(`paciente_cpf.eq.${cpfLimpo}`);
        filtros.push(`cpf.eq.${cpfLimpo}`);
    }

    if (cnsLimpo) {
        filtros.push(`cns.eq.${cnsLimpo}`);
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
            ${data.map(at => {
                const subjetivo = at.soapSubjetivo || at.subjetivo || "-";
                const objetivo =
                    at.soapObjetivoAlterado ||
                    at.objetivo ||
                    [
                        at.obj_pas ? `PAS ${at.obj_pas}` : "",
                        at.obj_pad ? `PAD ${at.obj_pad}` : "",
                        at.fc ? `FC ${at.fc}` : "",
                        at.fr ? `FR ${at.fr}` : "",
                        at.sat_o2 ? `SatO2 ${at.sat_o2}` : ""
                    ].filter(Boolean).join(" / ") ||
                    "-";

                const avaliacao = at.inputBuscaCIAPS || at.avaliacao || at.ciap || "-";
                const plano = at.soapPlanoConduta || at.plano || "-";

                return `
                    <div class="timeline-item">
                        <div class="timeline-body">
                            <strong>${formatarDataHistorico(at.criado_em || at.data_atendimento)}</strong>

                            <br>
                            <b>S:</b> ${subjetivo}

                            <br>
                            <b>O:</b> ${objetivo}

                            <br>
                            <b>A:</b> ${avaliacao}

                            <br>
                            <b>P:</b> ${plano}

                            ${at.risco_global ? `
                                <br>
                                <b>Risco:</b> ${at.risco_global}
                                ${at.risco_pontos !== null && at.risco_pontos !== undefined ? ` (${at.risco_pontos} pts)` : ""}
                            ` : ""}

                            ${at.plano_terapeutico ? `
                                <br>
                                <b>PTS:</b> registrado
                            ` : ""}

                            ${at.nota_monitoramento ? `
                                <br>
                                <b>Nota:</b> ${at.nota_monitoramento}
                            ` : ""}

                            <br>
                            <small>${at.usuario_email || at.usuario_nome || "-"}</small>
                        </div>
                    </div>
                `;
            }).join("")}
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
        const usuarioSessao = window.usuarioLogado || {};

        const cpfLimpo =
            document.getElementById("cpfPaciente")?.value?.replace(/\D/g, "") || "";

        const cnsLimpo =
            document.getElementById("cnsPaciente")?.value?.replace(/\D/g, "") || "";

        /* ==================================================
           PACIENTE
           ================================================== */

        const paciente = {
            usuario_id: usuario.id,

            nome:
                document.getElementById("nomePaciente")?.value || "",

            cpf:
                cpfLimpo || null,

            cns:
                cnsLimpo || null,

            data_nascimento:
                dataOuNullSOAP(document.getElementById("nascPaciente")?.value),

            idade_atual:
                inteiroOuNull(document.getElementById("idadePaciente")?.value),

            telefone:
                document.getElementById("telPaciente")?.value || "",

            cep:
                document.getElementById("CEP")?.value?.replace(/\D/g, "") || "",

            endereco:
                document.getElementById("endPaciente")?.value || "",

            numero:
                document.getElementById("endNumero")?.value || "",

            complemento:
                document.getElementById("endComplemento")?.value || "",

            ubs_vinculacao:
                document.getElementById("unidadePaciente")?.value || "",

            equipe_esf:
                document.getElementById("equipePaciente")?.value || "",

            // compatibilidade com módulos antigos
            ubs:
                document.getElementById("unidadePaciente")?.value || "",

            equipe:
                document.getElementById("equipePaciente")?.value || ""
        };

        if (!paciente.nome || (!paciente.cpf && !paciente.cns)) {
            alert("Informe nome e CPF/CNS.");
            return;
        }

        /* ==================================================
           UPSERT PACIENTE
           ================================================== */

        const {
            data: pacienteSalvo,
            error: erroPaciente
        } = await supabaseClient
            .from("pacientes")
            .upsert([paciente], {
                onConflict: paciente.cpf ? "cpf" : "cns"
            })
            .select()
            .single();

        if (erroPaciente) {
            console.error("Erro paciente:", erroPaciente);
            alert(
                "Erro ao salvar paciente: " +
                (erroPaciente.message || "verifique permissões e colunas da tabela pacientes.")
            );
            return;
        }

        const pacienteIdSalvo =
            pacienteSalvo?.id || null;

        /* ==================================================
           DADOS CLÍNICOS
           ================================================== */

        const hasValor = valorSimNaoCampo("hasSN");
        const dmValor = valorSimNaoCampo("dmSN");
        const gestanteValor = valorSimNaoCampo("gestanteSN");
        const tbValor = valorSimNaoCampo("tbSN");
        const hansenValor = valorSimNaoCampo("hansenSN");

        const objPAS =
            document.getElementById("objPAS")?.value ||
            document.getElementById("hasPAS")?.value ||
            "";

        const objPAD =
            document.getElementById("objPAD")?.value ||
            document.getElementById("hasPAD")?.value ||
            "";

        const hasPAS =
            document.getElementById("hasPAS")?.value ||
            objPAS ||
            "";

        const hasPAD =
            document.getElementById("hasPAD")?.value ||
            objPAD ||
            "";

        const risco =
            calcularRiscoGlobalPaciente?.({
                idade: paciente.idade_atual || 0,
                has: hasValor,
                dm: dmValor,
                tb: tbValor,
                hansen: hansenValor,
                gestante: gestanteValor,
                has_classificacao: document.getElementById("hasClassif")?.value || "",
                dm_classificacao: document.getElementById("dmClassif")?.value || "",
                has_pas: hasPAS,
                has_pad: hasPAD,
                obj_pas: objPAS,
                obj_pad: objPAD,
                dm_hba1c: document.getElementById("dmHbA1c")?.value || "",
                has_retinopatia: document.getElementById("hasRetinopatia")?.value || "",
                dm_retinopatia: document.getElementById("dmRetinopatia")?.value || "",
                dm_pe_diabetico_grau: document.getElementById("dmPeDiabeticoGrau")?.value || ""
            }) || {};

        /* ==================================================
           ATENDIMENTO
           Nomes padronizados conforme Supabase
           ================================================== */

        const reavaliacao =
            Number(document.getElementById("soapReavaliacaoDias")?.value || 0);

        const atendimento = {
            usuario_id: usuario.id,
            paciente_id: pacienteIdSalvo,
            usuario_email: usuario.email,
            usuario_nome: usuarioSessao.nome || usuario.email,
            usuario_perfil: usuarioSessao.perfil || null,

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

            retorno_dias: reavaliacao,
            reavaliacaoDias: reavaliacao,

            pa:
                objPAS || objPAD
                    ? `${objPAS || ""}x${objPAD || ""}`
                    : "",

            obj_pas: numeroOuNull(objPAS),
            obj_pad: numeroOuNull(objPAD),

            fc: document.getElementById("objFC")?.value || "",
            fr: document.getElementById("objFR")?.value || "",
            sat_o2: document.getElementById("objSatO2")?.value || "",
            dor: document.getElementById("objDor")?.value || "",
            peso: document.getElementById("objpeso")?.value || "",
            altura: document.getElementById("objaltura")?.value || "",
            imc: document.getElementById("objIMC")?.value || "",

            has: hasValor,
            has_pas: numeroOuNull(hasPAS),
            has_pad: numeroOuNull(hasPAD),
            has_classificacao: document.getElementById("hasClassif")?.value || "",
            has_data_retinopatia: dataOuNullSOAP(document.getElementById("hasDataRetinopatia")?.value),
            has_retinopatia: document.getElementById("hasRetinopatia")?.value || "",

            dm: dmValor,
            dm_hba1c: numeroOuNull(document.getElementById("dmHbA1c")?.value),
            dm_classificacao: document.getElementById("dmClassif")?.value || "",
            dm_data_retinopatia: dataOuNullSOAP(document.getElementById("dmDataRetinopatia")?.value),
            dm_retinopatia: document.getElementById("dmRetinopatia")?.value || "",
            dm_pe_diabetico_grau: document.getElementById("dmPeDiabeticoGrau")?.value || "",

            gestante: gestanteValor,
            gestDUM: dataOuNullSOAP(document.getElementById("gestDUM")?.value),
            gestIG: document.getElementById("gestIG")?.value || "",
            gestDPP: document.getElementById("gestDPP")?.value || "",

            tb: tbValor,
            tb_data_diagnostico: dataOuNullSOAP(document.getElementById("tbDataDiagnostico")?.value),
            tb_fase_tratamento: document.getElementById("tbFaseTratamento")?.value || "",
            tb_data_baciloscopia: dataOuNullSOAP(document.getElementById("tbDataBaciloscopia")?.value),
            tb_resultado_baciloscopia: document.getElementById("tbResultadoBaciloscopia")?.value || "",

            hansen: hansenValor,
            hansen_data_diagnostico: dataOuNullSOAP(document.getElementById("hansenDataDiagnostico")?.value),
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

        const {
            data: atendimentoSalvo,
            error: erroAtendimento
        } = await supabaseClient
            .from("atendimentos")
            .insert([atendimento])
            .select()
            .single();

        if (erroAtendimento) {
            console.error("Erro atendimento:", erroAtendimento);
            alert(
                "Erro ao salvar atendimento: " +
                (erroAtendimento.message || "verifique permissões e colunas da tabela atendimentos.")
            );
            return;
        }

        /* ==================================================
           TERRITÓRIO INTELIGENTE
           Atualiza o cérebro territorial sem interromper o salvamento.
           ================================================== */

        try {
            const identificadorTI =
                paciente.cpf ||
                paciente.cns ||
                atendimentoSalvo?.paciente_cpf ||
                atendimentoSalvo?.cns ||
                "";

            if (
                identificadorTI &&
                typeof atualizarTerritorioInteligente === "function"
            ) {
                await atualizarTerritorioInteligente(identificadorTI);
                console.log("🧠 Território Inteligente atualizado:", identificadorTI);
            }

        } catch (erroTI) {
            console.warn(
                "Prontuário salvo, mas não foi possível atualizar Território Inteligente:",
                erroTI
            );
        }

        mostrarToast?.("✅ Prontuário salvo.");

        atualizarIndicatorsDashboard?.();
        atualizarCentralAvisosSininho?.();

        if (typeof carregarDashboardInicialSintaxeHub === "function") {
            carregarDashboardInicialSintaxeHub();
        }

        if (typeof carregarResumoTerritorioInteligente === "function") {
            carregarResumoTerritorioInteligente().catch(console.warn);
        }

        await carregarHistoricoClinicoPaciente(
            paciente.cpf,
            paciente.cns
        );

        window.pacienteAtual = pacienteSalvo || paciente;
        window.pacienteSelecionado = pacienteSalvo || paciente;

    } catch (erro) {
        console.error("Erro prontuário:", erro);
        alert("Erro inesperado.");
    }
}


/* ==========================================================================
   🧠 TERRITÓRIO INTELIGENTE — ATUALIZAÇÃO MANUAL DO PACIENTE ATUAL
   ========================================================================== */

async function atualizarTerritorioInteligenteDoFormulario() {
    const cpf =
        document.getElementById("cpfPaciente")?.value?.replace(/\D/g, "") || "";

    const cns =
        document.getElementById("cnsPaciente")?.value?.replace(/\D/g, "") || "";

    const identificador =
        cpf || cns;

    if (!identificador) {
        mostrarToast?.("⚠️ Informe CPF ou CNS para atualizar o Território Inteligente.");
        return null;
    }

    if (typeof atualizarTerritorioInteligente !== "function") {
        mostrarToast?.("⚠️ Módulo territorioInteligente.js não carregado.");
        return null;
    }

    const resultado =
        await atualizarTerritorioInteligente(identificador);

    if (resultado) {
        mostrarToast?.("🧠 Território Inteligente atualizado.");
    }

    return resultado;
}

/* ==========================================================================
   🧩 HELPERS VISUAIS
   ========================================================================== */

function mostrarCard(id, valor) {
    const card = document.getElementById(id);
    if (!card) return;

    card.style.display = valor === "Sim" ? "block" : "none";
}

function mostrarCardsLinhasCuidado() {
    const has = valorSimNaoCampo("hasSN") === "Sim";
    const dm = valorSimNaoCampo("dmSN") === "Sim";
    const gest = valorSimNaoCampo("gestanteSN") === "Sim";
    const tb = valorSimNaoCampo("tbSN") === "Sim";
    const hansen = valorSimNaoCampo("hansenSN") === "Sim";

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

    ["hasSN", "dmSN", "gestanteSN", "tbSN", "hansenSN"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", mostrarCardsLinhasCuidado);
        }
    });

    const objPAS = document.getElementById("objPAS");
    const objPAD = document.getElementById("objPAD");
    const hasPAS = document.getElementById("hasPAS");
    const hasPAD = document.getElementById("hasPAD");

    if (objPAS) objPAS.addEventListener("input", sincronizarPAObjetivoParaHAS);
    if (objPAD) objPAD.addEventListener("input", sincronizarPAObjetivoParaHAS);
    if (hasPAS) hasPAS.addEventListener("input", sincronizarPAHASParaObjetivo);
    if (hasPAD) hasPAD.addEventListener("input", sincronizarPAHASParaObjetivo);
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
window.valorSimNaoCampo = valorSimNaoCampo;

window.atualizarTerritorioInteligenteDoFormulario = atualizarTerritorioInteligenteDoFormulario;
