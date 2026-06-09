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
   ASSISTENTE CLÍNICO INTELIGENTE APS V2
   IA SIMBÓLICA / SISTEMA ESPECIALISTA EXPLICÁVEL
   ====================================================== */

function gerarAssistenteClinicoInteligenteAPS(paciente) {
    const risco =
        calcularRiscoGlobalPaciente(paciente);

    const cardiovascular =
        calcularRiscoCardiovascular10AnosSimples(paciente);

    const inferencias =
        gerarInferenciasClinicasAPS(paciente, risco);

    const prioridade =
        classificarPrioridadeAssistencialAPS(
            paciente,
            risco,
            inferencias
        );

    const confianca =
        calcularConfiancaInferenciaAPS(paciente);

    const retorno =
        sugerirRetornoClinicoAPS(
            paciente,
            risco,
            prioridade,
            inferencias
        );

    const plano =
        gerarPlanoAdaptativoAPS(
            paciente,
            risco,
            cardiovascular,
            inferencias,
            prioridade,
            confianca,
            retorno
        );

    return {
        risco,
        cardiovascular,
        inferencias,
        prioridade,
        confianca,
        retorno,
        plano
    };
}

function gerarInferenciasClinicasAPS(paciente, risco) {
    const inferencias = [];

    const has =
        valorSimRisco(
            pegarCampoRisco(paciente, ["has", "hasSN"])
        );

    const dm =
        valorSimRisco(
            pegarCampoRisco(paciente, ["dm", "dmSN"])
        );

    const gestante =
        valorSimRisco(
            pegarCampoRisco(paciente, ["gestante", "gestanteSN"])
        );

    const tb =
        valorSimRisco(
            pegarCampoRisco(paciente, ["tb", "tbSN"])
        );

    const hansen =
        valorSimRisco(
            pegarCampoRisco(paciente, ["hansen", "hansenSN"])
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

    const hba1c =
        numeroRisco(
            pegarCampoRisco(paciente, [
                "dm_hba1c",
                "dmHbA1c",
                "hba1c"
            ])
        );

    const idade =
        parseInt(
            pegarCampoRisco(paciente, [
                "idade",
                "idadePaciente",
                "idade_atual"
            ], 0)
        ) || 0;

    const retinoHAS =
        textoRisco(
            pegarCampoRisco(paciente, [
                "has_retinopatia",
                "hasRetinopatia"
            ])
        );

    const retinoDM =
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

    if (pas >= 180 || pad >= 110) {
        inferencias.push({
            tipo: "alerta",
            gravidade: "muito_alta",
            titulo: "Pressão arterial em faixa crítica",
            justificativa: `PA registrada em ${pas || "-"}x${pad || "-"}, compatível com necessidade de avaliação prioritária.`,
            conduta: "Priorizar avaliação clínica, confirmar medida, investigar sinais de alarme e definir conduta conforme protocolo local."
        });
    } else if (pas >= 140 || pad >= 90) {
        inferencias.push({
            tipo: "risco",
            gravidade: "moderada",
            titulo: "Pressão arterial elevada",
            justificativa: `PA registrada em ${pas || "-"}x${pad || "-"}, sugerindo controle pressórico inadequado.`,
            conduta: "Reforçar adesão, orientar medidas não farmacológicas, revisar seguimento e programar nova aferição."
        });
    }

    if (dm && hba1c >= 9) {
        inferencias.push({
            tipo: "alerta",
            gravidade: "alta",
            titulo: "Diabetes com forte indício de descompensação",
            justificativa: `HbA1c registrada em ${hba1c}%, acima do alvo usual de controle.`,
            conduta: "Priorizar retorno, avaliar adesão, sintomas de hiperglicemia, complicações e necessidade de intensificação terapêutica pela equipe."
        });
    } else if (dm && hba1c >= 7) {
        inferencias.push({
            tipo: "risco",
            gravidade: "moderada",
            titulo: "Diabetes em controle limítrofe",
            justificativa: `HbA1c registrada em ${hba1c}%, indicando necessidade de acompanhamento.`,
            conduta: "Reforçar educação em saúde, alimentação, atividade física, autocuidado e seguimento programado."
        });
    }

    if (dm && !hba1c) {
        inferencias.push({
            tipo: "pendencia",
            gravidade: "moderada",
            titulo: "Diabetes sem HbA1c registrada",
            justificativa: "Paciente com DM sem valor de HbA1c informado no formulário.",
            conduta: "Solicitar ou atualizar HbA1c conforme protocolo local."
        });
    }

    if (has && (!pas || !pad)) {
        inferencias.push({
            tipo: "pendencia",
            gravidade: "moderada",
            titulo: "HAS sem PA registrada",
            justificativa: "Paciente hipertenso sem PA completa registrada.",
            conduta: "Registrar PA sistólica e diastólica para estratificação adequada."
        });
    }

    if (retinoHAS) {
        inferencias.push({
            tipo: "complicacao",
            gravidade: "alta",
            titulo: "Retinopatia hipertensiva registrada",
            justificativa: `Registro informado: ${retinoHAS}.`,
            conduta: "Acompanhar dano de órgão-alvo, revisar controle pressórico e garantir seguimento oftalmológico."
        });
    }

    if (retinoDM) {
        inferencias.push({
            tipo: "complicacao",
            gravidade: "alta",
            titulo: "Retinopatia diabética registrada",
            justificativa: `Registro informado: ${retinoDM}.`,
            conduta: "Garantir acompanhamento oftalmológico e controle metabólico intensificado."
        });
    }

    if (peDiabetico) {
        inferencias.push({
            tipo: "complicacao",
            gravidade: "alta",
            titulo: "Risco relacionado ao pé diabético",
            justificativa: `Grau informado: ${peDiabetico}.`,
            conduta: "Avaliar pés, sensibilidade, pulsos, calçados, lesões e necessidade de encaminhamento."
        });
    }

    if (tb) {
        inferencias.push({
            tipo: "vigilancia",
            gravidade: "alta",
            titulo: "Tuberculose exige vigilância ativa",
            justificativa: "Paciente marcado com linha de cuidado TB.",
            conduta: "Monitorar adesão, baciloscopia quando aplicável, contatos e risco de abandono."
        });
    }

    if (hansen) {
        inferencias.push({
            tipo: "vigilancia",
            gravidade: "alta",
            titulo: "Hanseníase exige seguimento longitudinal",
            justificativa: "Paciente marcado com linha de cuidado hanseníase.",
            conduta: "Monitorar tratamento, avaliação neurológica simplificada, incapacidades e contatos."
        });
    }

    if (gestante) {
        inferencias.push({
            tipo: "linha_cuidado",
            gravidade: "moderada",
            titulo: "Gestação ativa",
            justificativa: "Paciente marcada como gestante.",
            conduta: "Garantir calendário de pré-natal, estratificação de risco gestacional e busca ativa se atraso."
        });
    }

    if (idade >= 75) {
        inferencias.push({
            tipo: "vulnerabilidade",
            gravidade: "moderada",
            titulo: "Pessoa idosa longeva",
            justificativa: `Idade registrada: ${idade} anos.`,
            conduta: "Avaliar funcionalidade, quedas, polifarmácia, cognição, rede de apoio e necessidade de visita domiciliar."
        });
    } else if (idade >= 60) {
        inferencias.push({
            tipo: "vulnerabilidade",
            gravidade: "leve",
            titulo: "Pessoa idosa",
            justificativa: `Idade registrada: ${idade} anos.`,
            conduta: "Considerar avaliação multidimensional e plano de cuidado longitudinal."
        });
    }

    if (risco.pontos >= 14) {
        inferencias.push({
            tipo: "priorizacao",
            gravidade: "muito_alta",
            titulo: "Risco global muito alto",
            justificativa: `Escore global de ${risco.pontos} pontos.`,
            conduta: "Priorizar na agenda da equipe e manter busca ativa até resolução das pendências."
        });
    } else if (risco.pontos >= 9) {
        inferencias.push({
            tipo: "priorizacao",
            gravidade: "alta",
            titulo: "Alto risco global",
            justificativa: `Escore global de ${risco.pontos} pontos.`,
            conduta: "Programar retorno breve e revisar plano terapêutico."
        });
    }

    return inferencias;
}

function classificarPrioridadeAssistencialAPS(paciente, risco, inferencias) {
    const muitoAlta =
        inferencias.filter(i => i.gravidade === "muito_alta").length;

    const alta =
        inferencias.filter(i => i.gravidade === "alta").length;

    if (risco.pontos >= 14 || muitoAlta > 0) {
        return {
            nivel: "Prioridade máxima",
            cor: "#a21caf",
            icone: "🔴",
            descricao: "Necessita avaliação e acompanhamento prioritário pela equipe."
        };
    }

    if (risco.pontos >= 9 || alta >= 2) {
        return {
            nivel: "Alta prioridade",
            cor: "#ef4444",
            icone: "🟠",
            descricao: "Necessita retorno breve e busca ativa conforme organização local."
        };
    }

    if (risco.pontos >= 5 || alta === 1) {
        return {
            nivel: "Prioridade moderada",
            cor: "#f59e0b",
            icone: "🟡",
            descricao: "Necessita acompanhamento programado e revisão de pendências."
        };
    }

    return {
        nivel: "Prioridade habitual",
        cor: "#25d366",
        icone: "🟢",
        descricao: "Manter seguimento conforme rotina da APS."
    };
}

function calcularConfiancaInferenciaAPS(paciente) {
    const camposEssenciais = [
        "idade",
        "has",
        "dm",
        "gestante",
        "tb",
        "hansen"
    ];

    const camposClinicos = [
        "obj_pas",
        "objPAD",
        "has_pas",
        "has_pad",
        "dm_hba1c",
        "dmHbA1c"
    ];

    let preenchidos = 0;
    let total = camposEssenciais.length + 4;

    camposEssenciais.forEach(campo => {
        const valor =
            pegarCampoRisco(paciente, [
                campo,
                campo + "SN"
            ]);

        if (String(valor || "").trim()) {
            preenchidos++;
        }
    });

    const pas =
        pegarCampoRisco(paciente, ["obj_pas", "objPAS", "has_pas", "hasPAS"]);

    const pad =
        pegarCampoRisco(paciente, ["obj_pad", "objPAD", "has_pad", "hasPAD"]);

    const hba1c =
        pegarCampoRisco(paciente, ["dm_hba1c", "dmHbA1c", "hba1c"]);

    const peso =
        pegarCampoRisco(paciente, ["peso", "pesoPaciente", "objpeso"]);

    if (pas) preenchidos++;
    if (pad) preenchidos++;
    if (hba1c) preenchidos++;
    if (peso) preenchidos++;

    const percentual =
        Math.round((preenchidos / total) * 100);

    let nivel = "Baixa";
    if (percentual >= 75) nivel = "Alta";
    else if (percentual >= 45) nivel = "Moderada";

    return {
        percentual,
        nivel,
        preenchidos,
        total,
        justificativa:
            `Confiança ${nivel.toLowerCase()} baseada em ${preenchidos}/${total} campos clínicos essenciais preenchidos.`
    };
}

function sugerirRetornoClinicoAPS(paciente, risco, prioridade, inferencias) {
    const temMuitoAlta =
        inferencias.some(i => i.gravidade === "muito_alta");

    const temAlta =
        inferencias.some(i => i.gravidade === "alta");

    if (temMuitoAlta || risco.pontos >= 14) {
        return {
            dias: 0,
            texto: "Avaliação imediata / hoje",
            justificativa: "Há fator de gravidade muito alta ou risco global muito alto."
        };
    }

    if (temAlta || risco.pontos >= 9) {
        return {
            dias: 7,
            texto: "Retorno em até 7 dias",
            justificativa: "Há alto risco clínico ou complicações relevantes."
        };
    }

    if (risco.pontos >= 5) {
        return {
            dias: 30,
            texto: "Retorno em até 30 dias",
            justificativa: "Risco moderado com necessidade de seguimento programado."
        };
    }

    return {
        dias: 90,
        texto: "Retorno de rotina em até 90 dias",
        justificativa: "Risco habitual, sem alertas prioritários detectados."
    };
}

function gerarPlanoAdaptativoAPS(
    paciente,
    risco,
    cardiovascular,
    inferencias,
    prioridade,
    confianca,
    retorno
) {
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

    const planoBase =
        gerarPlanoTerapeuticoSingular(paciente);

    const problemas =
        inferencias.length
            ? inferencias.map((i, idx) =>
                `${idx + 1}. ${i.titulo}\n   Justificativa: ${i.justificativa}\n   Conduta sugerida: ${i.conduta}`
            ).join("\n\n")
            : "Nenhum problema prioritário identificado pelas regras atuais.";

    const metas =
        gerarMetasAssistenciaisAPS(paciente, risco, inferencias);

    const buscaAtiva =
        prioridade.nivel.includes("máxima") ||
        prioridade.nivel.includes("Alta")
            ? "SIM — manter busca ativa até confirmação do cuidado e retorno."
            : risco.pontos >= 5
                ? "CONSIDERAR — conforme vulnerabilidade, adesão e organização da equipe."
                : "NÃO prioritária no momento, salvo avaliação da equipe.";

    return `
ASSISTENTE CLÍNICO INTELIGENTE APS — SINTAXEHUB

Paciente: ${nome || "-"}
CPF: ${cpf || "-"}
Classificação de risco: ${risco.classificacao}
Escore global: ${risco.pontos} pontos
Risco cardiovascular estimado: ${cardiovascular}

Prioridade assistencial:
${prioridade.icone} ${prioridade.nivel}
${prioridade.descricao}

Confiança da inferência:
${confianca.nivel} (${confianca.percentual}%)
${confianca.justificativa}

Retorno sugerido:
${retorno.texto}
Justificativa: ${retorno.justificativa}

Busca ativa:
${buscaAtiva}

PROBLEMAS E INFERÊNCIAS IDENTIFICADAS
${problemas}

METAS ASSISTENCIAIS SUGERIDAS
${metas}

PLANO DE CUIDADO BASE
${planoBase}

NOTA DE SEGURANÇA
Este assistente utiliza regras clínicas explícitas e inferência simbólica. As recomendações são apoio à decisão e devem ser revisadas por profissional habilitado, considerando protocolos locais, contexto clínico e avaliação presencial quando necessária.
    `.trim();
}

function gerarMetasAssistenciaisAPS(paciente, risco, inferencias) {
    const metas = [];

    const has =
        valorSimRisco(pegarCampoRisco(paciente, ["has", "hasSN"]));

    const dm =
        valorSimRisco(pegarCampoRisco(paciente, ["dm", "dmSN"]));

    const gestante =
        valorSimRisco(pegarCampoRisco(paciente, ["gestante", "gestanteSN"]));

    const tb =
        valorSimRisco(pegarCampoRisco(paciente, ["tb", "tbSN"]));

    const hansen =
        valorSimRisco(pegarCampoRisco(paciente, ["hansen", "hansenSN"]));

    if (has) {
        metas.push("- HAS: registrar PA em todos os contatos, revisar adesão e reduzir risco cardiovascular.");
    }

    if (dm) {
        metas.push("- DM: atualizar HbA1c, avaliar pés, adesão terapêutica e sinais de complicações.");
    }

    if (gestante) {
        metas.push("- Gestante: manter calendário de pré-natal, vacinas, exames e estratificação de risco.");
    }

    if (tb) {
        metas.push("- TB: monitorar adesão, efeitos adversos, baciloscopia quando aplicável e contatos.");
    }

    if (hansen) {
        metas.push("- Hanseníase: acompanhar tratamento, avaliação neurológica e prevenção de incapacidades.");
    }

    if (risco.pontos >= 9) {
        metas.push("- Alto risco: garantir retorno breve, contato ativo e revisão multiprofissional.");
    }

    if (!metas.length) {
        metas.push("- Manter promoção da saúde, prevenção, vacinação e acompanhamento longitudinal.");
    }

    return metas.join("\n");
}

function gerarAssistenteClinicoDoFormularioAtual() {
    const paciente =
        montarPacienteDoFormularioRisco();

    exibirPainelAssistenteClinicoAPS(paciente);
}

function exibirPainelAssistenteClinicoAPS(paciente) {
    const container =
        document.getElementById("painelRiscoClinico");

    if (!container) return;

    const assistente =
        gerarAssistenteClinicoInteligenteAPS(paciente);

    container.innerHTML = `
        <div style="
            background:#111c2e;
            border:1px solid var(--border);
            border-left:5px solid ${assistente.prioridade.cor};
            padding:15px;
            border-radius:8px;
            margin-bottom:15px;
        ">

            <h4 style="
                margin:0 0 8px 0;
                color:${assistente.prioridade.cor};
            ">
                ${assistente.prioridade.icone}
                Assistente Clínico Inteligente APS
            </h4>

            <p style="margin:0 0 8px 0;">
                <strong>Prioridade:</strong>
                ${assistente.prioridade.nivel}
            </p>

            <p style="margin:0 0 8px 0;">
                <strong>Risco global:</strong>
                ${assistente.risco.classificacao}
                (${assistente.risco.pontos} pontos)
            </p>

            <p style="margin:0 0 8px 0;">
                <strong>Retorno sugerido:</strong>
                ${assistente.retorno.texto}
            </p>

            <p style="margin:0 0 8px 0;">
                <strong>Confiança:</strong>
                ${assistente.confianca.nivel}
                (${assistente.confianca.percentual}%)
            </p>

            <p style="
                margin:0;
                color:var(--text-muted);
                font-size:13px;
            ">
                ${assistente.prioridade.descricao}
            </p>

        </div>

        <div class="form-section" style="background:#111c2e;">
            <h4 style="margin-top:0;">🧠 Inferências explicáveis</h4>

            ${
                assistente.inferencias.length
                    ? assistente.inferencias.map(i => `
                        <div style="
                            border:1px solid var(--border);
                            border-radius:8px;
                            padding:10px;
                            margin-bottom:8px;
                            background:#0f172a;
                        ">
                            <strong>${i.titulo}</strong>
                            <p style="margin:5px 0; color:var(--text-muted);">
                                ${i.justificativa}
                            </p>
                            <small>${i.conduta}</small>
                        </div>
                    `).join("")
                    : `<p style="color:var(--text-muted);">Sem inferências prioritárias.</p>`
            }
        </div>

        <label>
            Plano adaptativo gerado pelo Assistente Clínico APS
        </label>

        <textarea
            id="planoTerapeuticoSingular"
            rows="24"
            style="
                width:100%;
                background:#0f172a;
                color:white;
                border:1px solid var(--border);
                border-radius:8px;
                padding:10px;
            "
        >${assistente.plano}</textarea>

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
                📋 Copiar Plano
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
                onclick="aplicarRetornoSugeridoAPS(${assistente.retorno.dias})"
                style="
                    background:#f59e0b;
                    color:white;
                    border:none;
                    padding:8px 14px;
                    border-radius:6px;
                    cursor:pointer;
                ">
                ⏱️ Aplicar retorno sugerido
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

function aplicarRetornoSugeridoAPS(dias) {
    const campo =
        document.getElementById("soapReavaliacaoDias");

    if (campo) {
        campo.value =
            Number(dias || 0);
    }

    mostrarToast?.("⏱️ Retorno sugerido aplicado.");
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

    if (typeof exibirPainelAssistenteClinicoAPS === "function") {
        exibirPainelAssistenteClinicoAPS(paciente);
        return;
    }

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

window.gerarAssistenteClinicoInteligenteAPS =
    gerarAssistenteClinicoInteligenteAPS;

window.gerarAssistenteClinicoDoFormularioAtual =
    gerarAssistenteClinicoDoFormularioAtual;

window.exibirPainelAssistenteClinicoAPS =
    exibirPainelAssistenteClinicoAPS;

window.aplicarRetornoSugeridoAPS =
    aplicarRetornoSugeridoAPS;

