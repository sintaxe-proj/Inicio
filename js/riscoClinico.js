// ======================================================
// SINTAXEHUB - RISCOCLINICO.JS
// ESCORE GLOBAL + PLANO TERAPÊUTICO SINGULAR
// Compatível com SOAP + Supabase padronizado
// ======================================================

/* ======================================================
   HELPERS
   ====================================================== */

function valorSimRisco(valor) {
    const v = String(valor ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    return (
        valor === true ||
        valor === 1 ||
        v === "sim" ||
        v === "s" ||
        v === "true" ||
        v === "1" ||
        v === "positivo" ||
        v === "presente" ||
        v === "ativo"
    );
}

function numeroRisco(valor) {
    if (valor === null || valor === undefined) return 0;

    const limpo = String(valor)
        .replace(",", ".")
        .replace(/[^\d.]/g, "");

    const n = parseFloat(limpo);

    return Number.isNaN(n) ? 0 : n;
}

function textoRisco(valor) {
    return String(valor || "").trim();
}

function pegarCampoRisco(obj, campos, padrao = "") {
    for (const campo of campos) {
        if (
            obj &&
            obj[campo] !== undefined &&
            obj[campo] !== null &&
            String(obj[campo]).trim() !== ""
        ) {
            return obj[campo];
        }
    }

    return padrao;
}

function montarPacienteDoFormularioRisco() {
    return {
        nome:
            document.getElementById("nomePaciente")?.value || "",

        cpf:
            document.getElementById("cpfPaciente")?.value || "",

        cns:
            document.getElementById("cnsPaciente")?.value || "",

        idade:
            document.getElementById("idadePaciente")?.value || "",

        peso:
            document.getElementById("objpeso")?.value ||
            document.getElementById("pesoPaciente")?.value ||
            "",

        altura:
            document.getElementById("objaltura")?.value || "",

        has:
            document.getElementById("hasSN")?.value || "Não",

        dm:
            document.getElementById("dmSN")?.value || "Não",

        gestante:
            document.getElementById("gestanteSN")?.value || "Não",

        tb:
            document.getElementById("tbSN")?.value || "Não",

        hansen:
            document.getElementById("hansenSN")?.value || "Não",

        has_classificacao:
            document.getElementById("hasClassif")?.value || "",

        dm_classificacao:
            document.getElementById("dmClassif")?.value || "",

        has_pas:
            document.getElementById("hasPAS")?.value ||
            document.getElementById("objPAS")?.value ||
            "",

        has_pad:
            document.getElementById("hasPAD")?.value ||
            document.getElementById("objPAD")?.value ||
            "",

        obj_pas:
            document.getElementById("objPAS")?.value ||
            document.getElementById("hasPAS")?.value ||
            "",

        obj_pad:
            document.getElementById("objPAD")?.value ||
            document.getElementById("hasPAD")?.value ||
            "",

        has_retinopatia:
            document.getElementById("hasRetinopatia")?.value || "",

        dm_retinopatia:
            document.getElementById("dmRetinopatia")?.value || "",

        dm_pe_diabetico_grau:
            document.getElementById("dmPeDiabeticoGrau")?.value || "",

        dm_hba1c:
            document.getElementById("dmHbA1c")?.value || ""
    };
}

/* ======================================================
   CÁLCULO DE RISCO GLOBAL
   ====================================================== */

function calcularRiscoGlobalPaciente(paciente) {
    let pontos = 0;
    let fatores = [];

    const has =
        valorSimRisco(
            pegarCampoRisco(paciente, [
                "has",
                "hasSN",
                "hipertensao",
                "hipertensão"
            ])
        );

    const dm =
        valorSimRisco(
            pegarCampoRisco(paciente, [
                "dm",
                "dmSN",
                "diabetes"
            ])
        );

    const tb =
        valorSimRisco(
            pegarCampoRisco(paciente, [
                "tb",
                "tbSN",
                "tuberculose"
            ])
        );

    const hansen =
        valorSimRisco(
            pegarCampoRisco(paciente, [
                "hansen",
                "hansenSN",
                "hanseniase",
                "hanseníase"
            ])
        );

    const gestante =
        valorSimRisco(
            pegarCampoRisco(paciente, [
                "gestante",
                "gestanteSN",
                "prenatal",
                "pre_natal"
            ])
        );

    const idade =
        parseInt(
            pegarCampoRisco(paciente, [
                "idadePaciente",
                "idade",
                "idade_atual"
            ], 0)
        ) || 0;

    const hasClassif =
        textoRisco(
            pegarCampoRisco(paciente, [
                "has_classificacao",
                "hasClassif",
                "classificacao_has"
            ])
        ).toUpperCase();

    const dmClassif =
        textoRisco(
            pegarCampoRisco(paciente, [
                "dm_classificacao",
                "dmClassif",
                "classificacao_dm"
            ])
        ).toUpperCase();

    const pas =
        numeroRisco(
            pegarCampoRisco(paciente, [
                "obj_pas",
                "objPAS",
                "has_pas",
                "hasPAS",
                "pas"
            ])
        );

    const pad =
        numeroRisco(
            pegarCampoRisco(paciente, [
                "obj_pad",
                "objPAD",
                "has_pad",
                "hasPAD",
                "pad"
            ])
        );

    const hba1c =
        numeroRisco(
            pegarCampoRisco(paciente, [
                "dm_hba1c",
                "dmHbA1c",
                "hba1c"
            ])
        );

    const hasRetinopatia =
        textoRisco(
            pegarCampoRisco(paciente, [
                "has_retinopatia",
                "hasRetinopatia"
            ])
        );

    const dmRetinopatia =
        textoRisco(
            pegarCampoRisco(paciente, [
                "dm_retinopatia",
                "dmRetinopatia"
            ])
        );

    const peDiabetico =
        textoRisco(
            pegarCampoRisco(paciente, [
                "dm_pe_diabetico_grau",
                "dmPeDiabeticoGrau"
            ])
        );

    if (has) {
        pontos += 2;
        fatores.push("Hipertensão arterial");
    }

    if (dm) {
        pontos += 3;
        fatores.push("Diabetes mellitus");
    }

    if (tb) {
        pontos += 4;
        fatores.push("Tuberculose");
    }

    if (hansen) {
        pontos += 3;
        fatores.push("Hanseníase");
    }

    if (gestante) {
        pontos += 3;
        fatores.push("Gestação ativa");
    }

    if (idade >= 60) {
        pontos += 2;
        fatores.push("Idoso");
    }

    if (idade >= 75) {
        pontos += 2;
        fatores.push("Idoso longevo");
    }

    if (
        hasClassif.includes("CRIT") ||
        hasClassif.includes("CRÍT") ||
        pas >= 180 ||
        pad >= 110
    ) {
        pontos += 4;
        fatores.push("Pressão arterial crítica");
    } else if (pas >= 140 || pad >= 90) {
        pontos += 2;
        fatores.push("Pressão arterial elevada");
    }

    if (
        dmClassif.includes("DESCONTROL") ||
        hba1c >= 9
    ) {
        pontos += 4;
        fatores.push("Diabetes descompensado");
    } else if (hba1c >= 7) {
        pontos += 2;
        fatores.push("Diabetes em controle limítrofe");
    }

    if (hasRetinopatia) {
        pontos += 2;
        fatores.push("Retinopatia hipertensiva registrada");
    }

    if (dmRetinopatia) {
        pontos += 2;
        fatores.push("Retinopatia diabética registrada");
    }

    if (peDiabetico) {
        pontos += 3;
        fatores.push("Comprometimento de pé diabético");
    }

    let classificacao = "Baixo risco";
    let cor = "#25d366";

    if (pontos >= 5 && pontos <= 8) {
        classificacao = "Risco moderado";
        cor = "#f59e0b";
    }

    if (pontos >= 9 && pontos <= 13) {
        classificacao = "Alto risco";
        cor = "#ef4444";
    }

    if (pontos >= 14) {
        classificacao = "Risco muito alto / prioritário";
        cor = "#a21caf";
    }

    return {
        pontos,
        classificacao,
        cor,
        fatores
    };
}

/* ======================================================
   RISCO CARDIOVASCULAR SIMPLES
   ====================================================== */

function calcularRiscoCardiovascular10AnosSimples(paciente) {
    let pontos = 0;

    const idade =
        parseInt(
            pegarCampoRisco(paciente, [
                "idadePaciente",
                "idade",
                "idade_atual"
            ], 0)
        ) || 0;

    const has =
        valorSimRisco(
            pegarCampoRisco(paciente, [
                "has",
                "hasSN"
            ])
        );

    const dm =
        valorSimRisco(
            pegarCampoRisco(paciente, [
                "dm",
                "dmSN"
            ])
        );

    const pas =
        numeroRisco(
            pegarCampoRisco(paciente, [
                "obj_pas",
                "objPAS",
                "has_pas",
                "hasPAS",
                "pas"
            ])
        );

    const pad =
        numeroRisco(
            pegarCampoRisco(paciente, [
                "obj_pad",
                "objPAD",
                "has_pad",
                "hasPAD",
                "pad"
            ])
        );

    if (idade >= 45) pontos += 1;
    if (idade >= 60) pontos += 2;
    if (idade >= 75) pontos += 2;

    if (has) pontos += 2;
    if (dm) pontos += 3;

    if (pas >= 140 || pad >= 90) pontos += 2;
    if (pas >= 180 || pad >= 110) pontos += 3;

    if (pontos <= 2) return "Baixo";
    if (pontos <= 5) return "Moderado";
    if (pontos <= 8) return "Alto";

    return "Muito alto";
}

/* ======================================================
   PLANO TERAPÊUTICO SINGULAR
   ====================================================== */

function gerarPlanoTerapeuticoSingular(paciente) {
    const risco =
        calcularRiscoGlobalPaciente(paciente);

    const peso =
        numeroRisco(
            pegarCampoRisco(paciente, [
                "pesoPaciente",
                "peso",
                "objpeso"
            ])
        );

    const has =
        valorSimRisco(
            pegarCampoRisco(paciente, [
                "has",
                "hasSN"
            ])
        );

    const dm =
        valorSimRisco(
            pegarCampoRisco(paciente, [
                "dm",
                "dmSN"
            ])
        );

    const gestante =
        valorSimRisco(
            pegarCampoRisco(paciente, [
                "gestante",
                "gestanteSN"
            ])
        );

    const nome =
        pegarCampoRisco(paciente, [
            "nomePaciente",
            "nome",
            "nome_paciente"
        ], "-");

    const cpf =
        pegarCampoRisco(paciente, [
            "cpfPaciente",
            "cpf",
            "paciente_cpf"
        ], "-");

    let agua =
        "Informar peso para cálculo individualizado.";

    if (peso > 0) {
        const minimo = Math.round(peso * 30);
        const maximo = Math.round(peso * 35);
        agua =
            `${minimo} a ${maximo} ml/dia, salvo restrição médica.`;
    }

    let plano = `
PLANO TERAPÊUTICO SINGULAR - SINTAXEHUB

Paciente: ${nome || "-"}
CPF: ${cpf || "-"}
Classificação de risco: ${risco.classificacao}
Escore global: ${risco.pontos} pontos

Fatores identificados:
${risco.fatores.length ? risco.fatores.map(f => "- " + f).join("\n") : "- Sem fatores relevantes registrados"}

1. ORIENTAÇÕES NUTRICIONAIS
- Priorizar alimentação in natura ou minimamente processada.
- Reduzir ultraprocessados, excesso de sal, açúcar e gorduras saturadas.
- Estimular consumo de verduras, legumes, frutas, feijões e fibras.
- Orientar fracionamento alimentar conforme rotina e condição clínica.
${dm ? "- Para diabetes: orientar redução de açúcares simples e acompanhamento glicêmico." : ""}
${has ? "- Para hipertensão: orientar redução de sódio e controle do peso corporal." : ""}

2. HIDRATAÇÃO
- Ingesta hídrica sugerida: ${agua}
- Ajustar em caso de insuficiência cardíaca, renal, edema ou orientação médica específica.

3. SAÚDE OCULAR / OFTALMOLOGIA
${dm ? "- Encaminhar ou orientar avaliação oftalmológica periódica por risco de retinopatia diabética." : "- Avaliar necessidade de oftalmologia conforme queixas visuais, idade e comorbidades."}
${has ? "- Considerar avaliação de fundo de olho/retinopatia hipertensiva conforme protocolo local." : ""}

4. PÉ DIABÉTICO / CUIDADO COM EXTREMIDADES
${dm ? "- Realizar avaliação periódica dos pés, sensibilidade, pulsos, calçados e integridade da pele." : "- Avaliar pés e integridade cutânea conforme risco clínico."}

5. HIGIENE DO SONO
- Manter horário regular para dormir e acordar.
- Evitar telas próximo ao horário de dormir.
- Evitar cafeína no período da noite.
- Estimular ambiente escuro, silencioso e confortável.
- Investigar roncos, sonolência diurna ou insônia persistente.

6. MINDFULNESS / AUTOCUIDADO
- Estimular respiração consciente por 3 a 5 minutos ao dia.
- Orientar pausas breves durante o dia para redução de estresse.
- Incentivar atividades prazerosas, vínculo comunitário e suporte familiar.
- Considerar grupo de saúde mental, práticas integrativas ou apoio multiprofissional.

7. SEGUIMENTO NA APS
- Risco atual: ${risco.classificacao}.
${risco.pontos >= 9 ? "- Priorizar retorno breve e busca ativa pela equipe." : "- Manter acompanhamento conforme agenda da equipe."}
${has ? "- Monitorar PA e adesão ao tratamento anti-hipertensivo." : ""}
${dm ? "- Monitorar glicemia, HbA1c quando disponível, pés e adesão terapêutica." : ""}
${gestante ? "- Garantir seguimento de pré-natal conforme calendário da APS." : ""}

Observação: plano gerado automaticamente e deve ser revisado pela equipe responsável.
    `.trim();

    return plano;
}

/* ======================================================
   EXIBIR PAINEL
   ====================================================== */

function exibirPainelRiscoClinico(paciente) {
    const container =
        document.getElementById("painelRiscoClinico");

    if (!container) return;

    const risco =
        calcularRiscoGlobalPaciente(paciente);

    const plano =
        gerarPlanoTerapeuticoSingular(paciente);

    const riscoCV10 =
        calcularRiscoCardiovascular10AnosSimples(paciente);

    container.innerHTML = `
        <div style="
            background:#111c2e;
            border:1px solid var(--border);
            border-left:5px solid ${risco.cor};
            padding:15px;
            border-radius:8px;
            margin-bottom:15px;
        ">

            <h4 style="
                margin:0 0 8px 0;
                color:${risco.cor};
            ">
                Escore Clínico Global: ${risco.pontos} pontos
            </h4>

            <p style="margin:0 0 8px 0;">
                <strong>Classificação:</strong>
                ${risco.classificacao}
            </p>

            <p style="margin:0 0 8px 0;">
                <strong>Risco cardiovascular estimado em 10 anos:</strong>
                ${riscoCV10}
            </p>

            <p style="
                margin:0;
                color:var(--text-muted);
                font-size:13px;
            ">
                ${
                    risco.fatores.length
                        ? risco.fatores.join(", ")
                        : "Sem fatores relevantes registrados."
                }
            </p>

        </div>

        <label>
            Plano Terapêutico Singular gerado automaticamente
        </label>

        <textarea
            id="planoTerapeuticoSingular"
            rows="18"
            style="
                width:100%;
                background:#0f172a;
                color:white;
                border:1px solid var(--border);
                border-radius:8px;
                padding:10px;
            "
        >${plano}</textarea>

        <div style="
            display:flex;
            gap:10px;
            margin-top:10px;
            flex-wrap:wrap;
        ">

            <button
                onclick="copiarPlanoTerapeutico()"
                style="
                    background:var(--primary-neon);
                    color:white;
                    border:none;
                    padding:8px 14px;
                    border-radius:6px;
                    cursor:pointer;
                ">
                📋 Copiar PTS
            </button>

            <button
                onclick="registrarPlanoNoSOAP()"
                style="
                    background:var(--success-dark);
                    color:white;
                    border:none;
                    padding:8px 14px;
                    border-radius:6px;
                    cursor:pointer;
                ">
                🩺 Inserir no SOAP
            </button>

            <button
                onclick="salvarPlanoCuidadoSupabase()"
                style="
                    background:#7c3aed;
                    color:white;
                    border:none;
                    padding:8px 14px;
                    border-radius:6px;
                    cursor:pointer;
                ">
                ☁️ Salvar no Supabase
            </button>

            <button
                onclick="gerarPDFPlanoCuidado()"
                style="
                    background:#dc2626;
                    color:white;
                    border:none;
                    padding:8px 14px;
                    border-radius:6px;
                    cursor:pointer;
                ">
                📄 Gerar PDF
            </button>

        </div>
    `;
}

/* ======================================================
   AÇÕES DO PAINEL
   ====================================================== */

function copiarPlanoTerapeutico() {
    const campo =
        document.getElementById("planoTerapeuticoSingular");

    if (!campo) return;

    campo.select();
    document.execCommand("copy");

    mostrarToast?.("Plano terapêutico copiado.");
}

function registrarPlanoNoSOAP() {
    const campoPTS =
        document.getElementById("planoTerapeuticoSingular");

    const campoPlano =
        document.getElementById("soapPlanoConduta");

    if (!campoPTS || !campoPlano) return;

    campoPlano.value =
        campoPlano.value
            ? campoPlano.value + "\n\n" + campoPTS.value
            : campoPTS.value;

    mostrarToast?.("Plano inserido no SOAP.");
}

function gerarRiscoDoFormularioAtual() {
    const paciente =
        montarPacienteDoFormularioRisco();

    exibirPainelRiscoClinico(paciente);
}

function calcularIMC() {
    const peso =
        parseFloat(
            document.getElementById("objpeso")?.value || 0
        );

    const alturaCm =
        parseFloat(
            document.getElementById("objaltura")?.value || 0
        );

    const campoIMC =
        document.getElementById("objIMC");

    if (!campoIMC) return;

    if (!peso || !alturaCm) {
        campoIMC.value = "";
        return;
    }

    const alturaM = alturaCm / 100;
    const imc = peso / (alturaM * alturaM);

    campoIMC.value = imc.toFixed(1);
}

/* ======================================================
   PDF
   ====================================================== */

function gerarPDFPlanoCuidado() {
    const campoPTS =
        document.getElementById("planoTerapeuticoSingular");

    if (!campoPTS || !campoPTS.value.trim()) {
        mostrarToast?.("⚠️ Gere o plano antes de criar o PDF.");
        return;
    }

    if (!window.jspdf?.jsPDF) {
        mostrarToast?.("❌ jsPDF não carregado.");
        return;
    }

    const nome =
        document.getElementById("nomePaciente")?.value || "Paciente";

    const cpf =
        document.getElementById("cpfPaciente")?.value || "-";

    const cns =
        document.getElementById("cnsPaciente")?.value || "-";

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const margem = 15;
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Plano de Cuidado - SintaxeHub", margem, y);

    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Paciente: ${nome}`, margem, y);
    y += 6;
    doc.text(`CPF: ${cpf} | CNS: ${cns}`, margem, y);
    y += 6;
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, margem, y);

    y += 10;

    const linhas = doc.splitTextToSize(campoPTS.value, 180);

    linhas.forEach(linha => {
        if (y > 280) {
            doc.addPage();
            y = 20;
        }

        doc.text(linha, margem, y);
        y += 6;
    });

    doc.save(`plano_cuidado_${cpf || cns || "paciente"}.pdf`);

    mostrarToast?.("📄 PDF do plano gerado.");
}

/* ======================================================
   SALVAR PLANO + RISCO NO SUPABASE
   Atualiza apenas o último atendimento do paciente
   ====================================================== */

async function salvarPlanoCuidadoSupabase() {
    try {
        if (typeof supabaseClient === "undefined") {
            mostrarToast?.("❌ Supabase não carregado.");
            return;
        }

        const cpf =
            String(
                document.getElementById("cpfPaciente")?.value || ""
            ).replace(/\D/g, "");

        const cns =
            String(
                document.getElementById("cnsPaciente")?.value || ""
            ).replace(/\D/g, "");

        const plano =
            document.getElementById("planoTerapeuticoSingular")?.value || "";

        if (!plano.trim()) {
            mostrarToast?.("⚠️ Gere o plano antes de salvar.");
            return;
        }

        if (!cpf && !cns) {
            mostrarToast?.("⚠️ Paciente sem CPF ou CNS.");
            return;
        }

        const paciente =
            montarPacienteDoFormularioRisco();

        const risco =
            calcularRiscoGlobalPaciente(paciente);

        let busca = supabaseClient
            .from("atendimentos")
            .select("id")
            .order("data_atendimento", {
                ascending: false,
                nullsFirst: false
            })
            .limit(1);

        if (cpf) {
            busca = busca.or(
                `paciente_cpf.eq.${cpf},cpf.eq.${cpf}`
            );
        } else {
            busca = busca.eq("cns", cns);
        }

        const { data: ultimo, error: erroBusca } =
            await busca;

        if (erroBusca) {
            console.error("Erro ao localizar último atendimento:", erroBusca);
            mostrarToast?.("❌ Erro ao localizar atendimento.");
            return;
        }

        if (!ultimo || ultimo.length === 0) {
            mostrarToast?.("⚠️ Nenhum atendimento encontrado para salvar o plano.");
            return;
        }

        const idAtendimento =
            ultimo[0].id;

        const { error } = await supabaseClient
            .from("atendimentos")
            .update({
                plano_terapeutico: plano,
                risco_global: risco.classificacao,
                risco_pontos: risco.pontos
            })
            .eq("id", idAtendimento);

        if (error) {
            console.error("Erro ao salvar plano:", error);
            mostrarToast?.("❌ Erro ao salvar plano.");
            return;
        }

        mostrarToast?.("☁️ Plano e risco salvos no último atendimento.");

        if (typeof carregarHistoricoClinicoPaciente === "function") {
            carregarHistoricoClinicoPaciente(cpf, cns);
        }

    } catch (erro) {
        console.error("Erro geral ao salvar plano:", erro);
        mostrarToast?.("❌ Falha ao salvar plano.");
    }
}

/* ======================================================
   GLOBAL
   ====================================================== */

window.valorSimRisco =
    valorSimRisco;

window.numeroRisco =
    numeroRisco;

window.calcularRiscoCardiovascular10AnosSimples =
    calcularRiscoCardiovascular10AnosSimples;

window.gerarPDFPlanoCuidado =
    gerarPDFPlanoCuidado;

window.calcularIMC =
    calcularIMC;

window.calcularRiscoGlobalPaciente =
    calcularRiscoGlobalPaciente;

window.gerarPlanoTerapeuticoSingular =
    gerarPlanoTerapeuticoSingular;

window.exibirPainelRiscoClinico =
    exibirPainelRiscoClinico;

window.gerarRiscoDoFormularioAtual =
    gerarRiscoDoFormularioAtual;

window.copiarPlanoTerapeutico =
    copiarPlanoTerapeutico;

window.registrarPlanoNoSOAP =
    registrarPlanoNoSOAP;

window.salvarPlanoCuidadoSupabase =
    salvarPlanoCuidadoSupabase;
