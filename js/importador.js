/* ==========================================================================
   📥 IMPORTADOR e-SUS / JSON / XLSX / XML / PDF
   Supabase puro
   Pacientes = identificação
   Atendimentos = dados clínicos
   ========================================================================== */

console.log("📥 importador.js carregado");

if (typeof pdfjsLib !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

/* ==========================================================================
   PROCESSAR ARQUIVO
   ========================================================================== */

async function processarArquivoEsus(input) {
    const arquivo = input.files?.[0];

    if (!arquivo) {
        mostrarToast?.("⚠️ Nenhum arquivo selecionado.");
        return;
    }

    if (typeof supabaseClient === "undefined") {
        mostrarToast?.("❌ Supabase não carregado.");
        return;
    }

    const nomeArquivo = arquivo.name.toLowerCase();

    try {
        mostrarToast?.("📥 Processando arquivo...");

        let registros = [];

        if (nomeArquivo.endsWith(".json")) {
            registros = await lerJSON(arquivo);
        } else if (
            nomeArquivo.endsWith(".xlsx") ||
            nomeArquivo.endsWith(".xls")
        ) {
            registros = await lerXLSX(arquivo);
        } else if (nomeArquivo.endsWith(".xml")) {
            registros = await lerXML(arquivo);
        } else if (nomeArquivo.endsWith(".pdf")) {
            registros = await lerPDF(arquivo);
        } else {
            mostrarToast?.("⚠️ Formato não suportado.");
            return;
        }

        const normalizados =
            normalizarRegistrosImportados(registros);

        if (normalizados.pacientes.length === 0) {
            mostrarToast?.("⚠️ Nenhum paciente válido encontrado.");
            return;
        }

        await salvarImportacaoSupabase(
            normalizados.pacientes,
            normalizados.atendimentos
        );

        mostrarToast?.(
            `✅ Importação concluída: ${normalizados.pacientes.length} paciente(s).`
        );

        atualizarIndicatorsDashboard?.();
        atualizarCentralAvisosSininho?.();

    } catch (e) {
        console.error("Erro no importador:", e);
        mostrarToast?.("❌ Erro ao importar arquivo.");
    } finally {
        input.value = "";
    }
}

/* ==========================================================================
   LEITORES DE ARQUIVO
   ========================================================================== */

async function lerJSON(arquivo) {
    const texto = await arquivo.text();
    const json = JSON.parse(texto);

    if (Array.isArray(json)) return json;

    if (Array.isArray(json.pacientes)) return json.pacientes;
    if (Array.isArray(json.registros)) return json.registros;
    if (Array.isArray(json.dados)) return json.dados;
    if (Array.isArray(json.items)) return json.items;

    return [json];
}

async function lerXLSX(arquivo) {
    if (typeof XLSX === "undefined") {
        throw new Error("Biblioteca XLSX não carregada.");
    }

    const buffer = await arquivo.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    const primeiraAba = workbook.SheetNames[0];
    const planilha = workbook.Sheets[primeiraAba];

    return XLSX.utils.sheet_to_json(planilha, {
        defval: ""
    });
}

async function lerXML(arquivo) {
    const texto = await arquivo.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(texto, "text/xml");

    const registros = [];

    const pessoas =
        xml.querySelectorAll(
            "paciente, cidadao, cidadão, pessoa, registro"
        );

    pessoas.forEach(node => {
        const obj = {};

        node.childNodes.forEach(child => {
            if (child.nodeType === 1) {
                obj[child.nodeName] =
                    child.textContent?.trim() || "";
            }
        });

        registros.push(obj);
    });

    if (registros.length > 0) {
        return registros;
    }

    return [{
        texto_extraido: texto
    }];
}

async function lerPDF(arquivo) {
    if (typeof pdfjsLib === "undefined") {
        throw new Error("PDF.js não carregado.");
    }

    const buffer = await arquivo.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    let textoCompleto = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const pagina = await pdf.getPage(i);
        const conteudo = await pagina.getTextContent();

        textoCompleto +=
            conteudo.items
                .map(item => item.str)
                .join(" ") + "\n";
    }

    return extrairRegistrosDeTextoLivre(textoCompleto);
}

/* ==========================================================================
   EXTRAÇÃO TEXTO LIVRE PDF
   ========================================================================== */

function extrairRegistrosDeTextoLivre(texto) {
    const registros = [];

    const blocos = texto
        .split(/\n|(?=Nome[:\s])/i)
        .map(x => x.trim())
        .filter(Boolean);

    blocos.forEach(bloco => {
        const nome =
            capturarValor(bloco, /nome[:\s]+([A-ZÀ-Úa-zà-ú\s]+)/i);

        const cpf =
            capturarValor(bloco, /cpf[:\s]*(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/i);

        const cns =
            capturarValor(bloco, /cns[:\s]*(\d{15})/i);

        if (nome || cpf || cns) {
            registros.push({
                nome,
                cpf,
                cns,
                texto_extraido: bloco
            });
        }
    });

    return registros;
}

function capturarValor(texto, regex) {
    const match = texto.match(regex);
    return match ? match[1].trim() : "";
}

/* ==========================================================================
   NORMALIZAÇÃO
   ========================================================================== */

function normalizarRegistrosImportados(registros) {
    const pacientes = [];
    const atendimentos = [];
    const auditoria = getAuditoriaImportador();

    registros.forEach(reg => {
        const nome =
            pegarCampo(reg, [
                "nome",
                "nomeCompleto",
                "nome_completo",
                "cidadao",
                "cidadão",
                "paciente",
                "nome_paciente"
            ]);

        const cpf = limparNumeros(
            pegarCampo(reg, ["cpf", "CPF", "nu_cpf", "numeroCPF"])
        );

        const cns = limparNumeros(
            pegarCampo(reg, ["cns", "CNS", "cartao_sus", "cartaoSUS", "nu_cns"])
        );

        if (!nome && !cpf && !cns) return;

        const endereco =
            pegarCampo(reg, ["endereco", "endereço", "logradouro", "rua"]);

        const ubs =
            pegarCampo(reg, [
                "ubs",
                "unidade",
                "unidade_saude",
                "ubs_vinculacao"
            ]);

        const equipe =
            pegarCampo(reg, [
                "equipe",
                "esf",
                "microarea",
                "equipe_esf"
            ]);

        const pas =
            pegarNumeroOuNull(
                pegarCampo(reg, [
                    "has_pas",
                    "hasPAS",
                    "pas",
                    "pressao_sistolica",
                    "pa_sistolica",
                    "obj_pas"
                ])
            );

        const pad =
            pegarNumeroOuNull(
                pegarCampo(reg, [
                    "has_pad",
                    "hasPAD",
                    "pad",
                    "pressao_diastolica",
                    "pa_diastolica",
                    "obj_pad"
                ])
            );

        const hba1c =
            pegarNumeroDecimalOuNull(
                pegarCampo(reg, [
                    "dm_hba1c",
                    "dmHbA1c",
                    "hba1c",
                    "hemoglobina_glicada"
                ])
            );

        const paciente = {
            nome: nome || "Sem nome",
            cpf: cpf || null,
            cns: cns || null,

            telefone:
                pegarCampo(reg, [
                    "telefone",
                    "celular",
                    "fone",
                    "contato"
                ]) || null,

            endereco: endereco || null,
            numero: pegarCampo(reg, ["numero", "número", "num"]) || null,
            complemento: pegarCampo(reg, ["complemento"]) || null,
            cep: limparNumeros(pegarCampo(reg, ["cep", "CEP"])) || null,

            ubs_vinculacao: ubs || null,
            equipe_esf: equipe || null,

            // compatibilidade com código antigo
            ubs: ubs || null,
            equipe: equipe || null,

            ...auditoria
        };

        pacientes.push(paciente);

        const atendimento = {
            paciente_cpf: cpf || null,
            cpf: cpf || null,
            cns: cns || null,
            nome_paciente: nome || "Sem nome",

            ubs_vinculacao: ubs || null,
            equipe_esf: equipe || null,

            has:
                simNao(
                    pegarCampo(reg, [
                        "has",
                        "hipertensao",
                        "hipertensão"
                    ])
                ),

            has_pas: pas,
            has_pad: pad,

            has_classificacao:
                pegarCampo(reg, [
                    "has_classificacao",
                    "hasClassif",
                    "classificacao_has"
                ]),

            dm:
                simNao(
                    pegarCampo(reg, [
                        "dm",
                        "diabetes"
                    ])
                ),

            dm_hba1c: hba1c,

            dm_classificacao:
                pegarCampo(reg, [
                    "dm_classificacao",
                    "dmClassif",
                    "classificacao_dm"
                ]),

            gestante:
                simNao(
                    pegarCampo(reg, [
                        "gestante",
                        "prenatal",
                        "pre_natal"
                    ])
                ),

            gestDUM:
                dataOuNull(
                    pegarCampo(reg, [
                        "gestDUM",
                        "dum",
                        "gest_dum"
                    ])
                ),

            gestIG:
                pegarCampo(reg, [
                    "gestIG",
                    "idade_gestacional",
                    "ig",
                    "gest_ig"
                ]),

            gestDPP:
                pegarCampo(reg, [
                    "gestDPP",
                    "dpp",
                    "gest_dpp"
                ]),

            tb:
                simNao(
                    pegarCampo(reg, [
                        "tb",
                        "tuberculose"
                    ])
                ),

            hansen:
                simNao(
                    pegarCampo(reg, [
                        "hansen",
                        "hanseniase",
                        "hanseníase"
                    ])
                ),

            obj_pas: pas,
            obj_pad: pad,

            pa:
                pas || pad
                    ? `${pas || ""}x${pad || ""}`
                    : pegarCampo(reg, ["pa", "objPA"]),

            fc:
                pegarCampo(reg, [
                    "fc",
                    "objFC",
                    "frequencia_cardiaca"
                ]),

            fr:
                pegarCampo(reg, [
                    "fr",
                    "objFR",
                    "frequencia_respiratoria"
                ]),

            sat_o2:
                pegarCampo(reg, [
                    "sat_o2",
                    "objSatO2",
                    "sato2",
                    "saturacao"
                ]),

            dor:
                pegarCampo(reg, [
                    "dor",
                    "objDor"
                ]),

            peso:
                pegarCampo(reg, [
                    "peso",
                    "objpeso"
                ]),

            altura:
                pegarCampo(reg, [
                    "altura",
                    "objaltura"
                ]),

            imc:
                pegarCampo(reg, [
                    "imc",
                    "objIMC"
                ]),

            subjetivo:
                pegarCampo(reg, [
                    "subjetivo",
                    "soapSubjetivo",
                    "s"
                ]),

            objetivo:
                pegarCampo(reg, [
                    "objetivo",
                    "soapObjetivoAlterado",
                    "o"
                ]),

            avaliacao:
                pegarCampo(reg, [
                    "avaliacao",
                    "avaliação",
                    "inputBuscaCIAPS",
                    "ciap",
                    "ciap2"
                ]),

            plano:
                pegarCampo(reg, [
                    "plano",
                    "soapPlanoConduta",
                    "p"
                ]),

            soapSubjetivo:
                pegarCampo(reg, [
                    "soapSubjetivo",
                    "subjetivo",
                    "s"
                ]),

            soapObjetivoAlterado:
                pegarCampo(reg, [
                    "soapObjetivoAlterado",
                    "objetivo",
                    "o"
                ]),

            inputBuscaCIAPS:
                pegarCampo(reg, [
                    "inputBuscaCIAPS",
                    "ciap",
                    "ciap2"
                ]),

            soapPlanoConduta:
                pegarCampo(reg, [
                    "soapPlanoConduta",
                    "plano",
                    "p"
                ]),

            reavaliacaoDias:
                parseInt(
                    pegarCampo(reg, [
                        "reavaliacaoDias",
                        "retorno_dias",
                        "prazo",
                        "dias"
                    ])
                ) || null,

            retorno_dias:
                parseInt(
                    pegarCampo(reg, [
                        "retorno_dias",
                        "reavaliacaoDias",
                        "prazo",
                        "dias"
                    ])
                ) || null,

            nota_monitoramento:
                pegarCampo(reg, [
                    "nota_monitoramento",
                    "nota",
                    "observacao",
                    "observação"
                ]),

            texto_importado:
                reg.texto_extraido || null,

            criado_em:
                new Date().toISOString(),

            data_atendimento:
                new Date().toISOString(),

            ...auditoria
        };

        const temClinico =
            atendimento.has === "Sim" ||
            atendimento.dm === "Sim" ||
            atendimento.gestante === "Sim" ||
            atendimento.tb === "Sim" ||
            atendimento.hansen === "Sim" ||
            atendimento.soapSubjetivo ||
            atendimento.soapPlanoConduta ||
            atendimento.texto_importado ||
            atendimento.obj_pas ||
            atendimento.obj_pad;

        if (temClinico) {
            atendimentos.push(atendimento);
        }
    });

    return {
        pacientes,
        atendimentos
    };
}

/* ==========================================================================
   SALVAR NO SUPABASE
   ========================================================================== */

async function salvarImportacaoSupabase(pacientes, atendimentos) {
    const pacientesComChave = pacientes.filter(p => p.cpf || p.cns);

    if (pacientesComChave.length > 0) {
        const comCpf = pacientesComChave.filter(p => p.cpf);
        const semCpfComCns = pacientesComChave.filter(p => !p.cpf && p.cns);

        if (comCpf.length > 0) {
            await salvarEmLotesImportador(
                "pacientes",
                comCpf,
                500,
                "cpf"
            );
        }

        if (semCpfComCns.length > 0) {
            await salvarEmLotesImportador(
                "pacientes",
                semCpfComCns,
                500,
                "cns"
            );
        }
    }

    if (atendimentos.length > 0) {
        await inserirEmLotesImportador(
            "atendimentos",
            atendimentos,
            500
        );
    }
}

async function salvarEmLotesImportador(tabela, dados, tamanhoLote, conflito) {
    for (let i = 0; i < dados.length; i += tamanhoLote) {
        const lote = dados.slice(i, i + tamanhoLote);

        const { error } = await supabaseClient
            .from(tabela)
            .upsert(lote, {
                onConflict: conflito
            });

        if (error) {
            console.error(`Erro upsert ${tabela}:`, error);
            throw error;
        }
    }
}

async function inserirEmLotesImportador(tabela, dados, tamanhoLote) {
    for (let i = 0; i < dados.length; i += tamanhoLote) {
        const lote = dados.slice(i, i + tamanhoLote);

        const { error } = await supabaseClient
            .from(tabela)
            .insert(lote);

        if (error) {
            console.error(`Erro insert ${tabela}:`, error);
            throw error;
        }
    }
}

/* ==========================================================================
   UTILITÁRIOS
   ========================================================================== */

function getAuditoriaImportador() {
    const usuario = window.usuarioLogado || {};

    return {
        usuario_id: usuario?.id || null,
        usuario_nome: usuario?.nome || usuario?.email || null,
        usuario_perfil: usuario?.perfil || null
    };
}

function pegarCampo(obj, nomes) {
    for (const nome of nomes) {
        if (
            obj[nome] !== undefined &&
            obj[nome] !== null &&
            String(obj[nome]).trim() !== ""
        ) {
            return String(obj[nome]).trim();
        }
    }

    return "";
}

function limparNumeros(valor) {
    return String(valor || "").replace(/\D/g, "");
}

function pegarNumeroOuNull(valor) {
    const limpo = limparNumeros(valor);

    if (!limpo) return null;

    const numero = parseInt(limpo);

    return Number.isNaN(numero) ? null : numero;
}

function pegarNumeroDecimalOuNull(valor) {
    if (!valor) return null;

    const normalizado =
        String(valor)
            .replace(",", ".")
            .replace(/[^\d.]/g, "");

    if (!normalizado) return null;

    const numero = parseFloat(normalizado);

    return Number.isNaN(numero) ? null : numero;
}

function simNao(valor) {
    const v = String(valor || "").toLowerCase().trim();

    if (
        v === "sim" ||
        v === "s" ||
        v === "true" ||
        v === "1" ||
        v === "positivo" ||
        v === "presente" ||
        v === "ativo"
    ) {
        return "Sim";
    }

    return "Não";
}

function dataOuNull(valor) {
    if (!valor) return null;

    const v = String(valor).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        return v;
    }

    const match = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (match) {
        return `${match[3]}-${match[2]}-${match[1]}`;
    }

    return null;
}

/* ==========================================================================
   GLOBAL
   ========================================================================== */

window.processarArquivoEsus = processarArquivoEsus;
window.normalizarRegistrosImportados = normalizarRegistrosImportados;
window.salvarImportacaoSupabase = salvarImportacaoSupabase;
