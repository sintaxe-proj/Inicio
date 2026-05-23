<!-- BIBLIOTECAS DO IMPORTADOR -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>

<!-- CARD DO IMPORTADOR -->
<div style="background:#111c2e; padding:15px; border:1px solid var(--border); border-radius:8px;">
    <h4 style="margin:0 0 10px 0; color:var(--primary-neon);">
        📥 Interoperabilidade de Arquivos e-SUS PEC
    </h4>

    <p style="font-size:12px; color:var(--text-muted); margin:0 0 10px 0;">
        Importa JSON, XML, Excel, PDF textual ou PDF escaneado com OCR.
    </p>

    <input
        type="file"
        id="arquivoEsus"
        accept=".json,.xml,.xlsx,.xls,.pdf,.png,.jpg,.jpeg"
        onchange="processarArquivoEsus(this)"
        style="background:var(--bg-input); padding:5px; color:var(--text-main);"
    >

    <div id="statusImportadorEsus"
         style="margin-top:12px; font-size:12px; color:var(--text-muted);">
        Nenhum arquivo importado.
    </div>
</div>

<script>
/* ==========================================================
   📥 IMPORTADOR COMPLETO e-SUS PEC
   Suporta: JSON, XML, XLSX, XLS, PDF textual, PDF escaneado e imagem
   ========================================================== */

async function processarArquivoEsus(input) {
    const arquivo = input.files && input.files[0];

    if (!arquivo) return;

    const status = document.getElementById("statusImportadorEsus");

    try {
        atualizarStatusImportador("⏳ Lendo arquivo...");

        const nome = arquivo.name.toLowerCase();
        let registros = [];

        if (nome.endsWith(".json")) {
            registros = await importarJsonEsus(arquivo);
        } else if (nome.endsWith(".xml")) {
            registros = await importarXmlEsus(arquivo);
        } else if (nome.endsWith(".xlsx") || nome.endsWith(".xls")) {
            registros = await importarExcelEsus(arquivo);
        } else if (nome.endsWith(".pdf")) {
            registros = await importarPdfEsus(arquivo);
        } else if (
            nome.endsWith(".png") ||
            nome.endsWith(".jpg") ||
            nome.endsWith(".jpeg")
        ) {
            registros = await importarImagemOcrEsus(arquivo);
        } else {
            throw new Error("Formato não suportado.");
        }

        if (!Array.isArray(registros) || registros.length === 0) {
            throw new Error("Nenhum registro válido encontrado.");
        }

        atualizarStatusImportador(`💾 Gravando ${registros.length} registro(s)...`);

        const total = await gravarRegistrosImportados(registros);

        atualizarStatusImportador(`✅ Importação concluída: ${total} cidadão(s) gravado(s).`);

        mostrarToast?.(`✅ Importação concluída: ${total} registro(s).`);

        atualizarIndicatorsDashboard?.();
        atualizarCentralAvisosSininho?.();
        carregarTabelaBanco?.();

    } catch (erro) {
        console.error("Erro no importador e-SUS:", erro);
        atualizarStatusImportador("❌ Erro: " + erro.message);
        mostrarToast?.("❌ Erro ao importar arquivo.");
    } finally {
        input.value = "";
    }
}

function atualizarStatusImportador(msg) {
    const el = document.getElementById("statusImportadorEsus");
    if (el) el.innerHTML = msg;
}

/* ==========================================================
   JSON
   ========================================================== */

async function importarJsonEsus(arquivo) {
    const texto = await arquivo.text();
    const json = JSON.parse(texto);

    let lista = [];

    if (Array.isArray(json)) {
        lista = json;
    } else if (Array.isArray(json.cidadaos)) {
        lista = json.cidadaos;
    } else if (Array.isArray(json.pacientes)) {
        lista = json.pacientes;
    } else if (Array.isArray(json.registros)) {
        lista = json.registros;
    } else {
        lista = [json];
    }

    return lista.map(normalizarRegistroEsus).filter(Boolean);
}

/* ==========================================================
   XML
   ========================================================== */

async function importarXmlEsus(arquivo) {
    const texto = await arquivo.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(texto, "application/xml");

    const erroXml = xml.querySelector("parsererror");
    if (erroXml) throw new Error("XML inválido.");

    const possiveisNos = [
        ...xml.querySelectorAll("cidadao"),
        ...xml.querySelectorAll("paciente"),
        ...xml.querySelectorAll("registro"),
        ...xml.querySelectorAll("CadastroIndividual"),
        ...xml.querySelectorAll("cadastroIndividual")
    ];

    if (possiveisNos.length === 0) {
        return [normalizarRegistroEsus(extrairObjetoXml(xml.documentElement))].filter(Boolean);
    }

    return possiveisNos
        .map(no => normalizarRegistroEsus(extrairObjetoXml(no)))
        .filter(Boolean);
}

function extrairObjetoXml(no) {
    const obj = {};

    no.childNodes.forEach(child => {
        if (child.nodeType === 1) {
            obj[child.nodeName] = child.textContent.trim();
        }
    });

    return obj;
}

/* ==========================================================
   EXCEL
   ========================================================== */

async function importarExcelEsus(arquivo) {
    const buffer = await arquivo.arrayBuffer();

    const workbook = XLSX.read(buffer, { type: "array" });
    const primeiraAba = workbook.SheetNames[0];
    const planilha = workbook.Sheets[primeiraAba];

    const linhas = XLSX.utils.sheet_to_json(planilha, {
        defval: "",
        raw: false
    });

    return linhas.map(normalizarRegistroEsus).filter(Boolean);
}

/* ==========================================================
   PDF TEXTUAL + OCR AUTOMÁTICO
   ========================================================== */

async function importarPdfEsus(arquivo) {
    const buffer = await arquivo.arrayBuffer();

    pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    let textoFinal = "";

    for (let pagina = 1; pagina <= pdf.numPages; pagina++) {
        atualizarStatusImportador(`📄 Lendo PDF página ${pagina}/${pdf.numPages}...`);

        const page = await pdf.getPage(pagina);
        const content = await page.getTextContent();

        const textoPagina = content.items
            .map(item => item.str)
            .join(" ")
            .trim();

        textoFinal += "\n" + textoPagina;
    }

    textoFinal = textoFinal.trim();

    if (textoFinal.length < 30) {
        atualizarStatusImportador("🔎 PDF parece escaneado. Iniciando OCR...");
        textoFinal = await executarOcrPdf(buffer);
    }

    return extrairRegistrosDeTextoLivre(textoFinal);
}

async function executarOcrPdf(buffer) {
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let texto = "";

    for (let pagina = 1; pagina <= pdf.numPages; pagina++) {
        atualizarStatusImportador(`🔎 OCR página ${pagina}/${pdf.numPages}...`);

        const page = await pdf.getPage(pagina);
        const viewport = page.getViewport({ scale: 2 });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
            canvasContext: ctx,
            viewport: viewport
        }).promise;

        const resultado = await Tesseract.recognize(
            canvas,
            "por",
            {
                logger: m => {
                    if (m.status === "recognizing text") {
                        atualizarStatusImportador(
                            `🔎 OCR página ${pagina}/${pdf.numPages}: ${Math.round(m.progress * 100)}%`
                        );
                    }
                }
            }
        );

        texto += "\n" + resultado.data.text;
    }

    return texto.trim();
}

/* ==========================================================
   IMAGEM OCR
   ========================================================== */

async function importarImagemOcrEsus(arquivo) {
    atualizarStatusImportador("🔎 Executando OCR da imagem...");

    const resultado = await Tesseract.recognize(
        arquivo,
        "por",
        {
            logger: m => {
                if (m.status === "recognizing text") {
                    atualizarStatusImportador(
                        `🔎 OCR imagem: ${Math.round(m.progress * 100)}%`
                    );
                }
            }
        }
    );

    return extrairRegistrosDeTextoLivre(resultado.data.text);
}

/* ==========================================================
   TEXTO LIVRE / OCR
   ========================================================== */

function extrairRegistrosDeTextoLivre(texto) {
    if (!texto || texto.trim().length < 5) return [];

    const blocos = texto
        .split(/\n\s*\n|(?=Nome\s*:)|(?=Cidad[aã]o\s*:)/gi)
        .map(b => b.trim())
        .filter(b => b.length > 10);

    const registros = blocos.map(bloco => {
        return normalizarRegistroEsus({
            nome: capturarCampo(bloco, /nome\s*:?\s*([^\n\r]+)/i),
            cpf: capturarCampo(bloco, /cpf\s*:?\s*([\d.\-]+)/i),
            cns: capturarCampo(bloco, /cns\s*:?\s*(\d+)/i),
            nascimento: capturarCampo(bloco, /(data de nascimento|nascimento)\s*:?\s*([\d\/\-]+)/i, 2),
            sexo: capturarCampo(bloco, /sexo\s*:?\s*([^\n\r]+)/i),
            telefone: capturarCampo(bloco, /(telefone|celular)\s*:?\s*([\d\s().\-]+)/i, 2),
            endereco: capturarCampo(bloco, /(endere[cç]o)\s*:?\s*([^\n\r]+)/i, 2),
            microarea: capturarCampo(bloco, /(micro.?área|microarea)\s*:?\s*([^\n\r]+)/i, 2),
            equipe: capturarCampo(bloco, /equipe\s*:?\s*([^\n\r]+)/i),
            condicoes: bloco
        });
    }).filter(r => r && r.nome !== "SEM NOME IDENTIFICADO");

    if (registros.length > 0) return registros;

    return [
        normalizarRegistroEsus({
            nome: "IMPORTAÇÃO OCR SEM NOME IDENTIFICADO",
            observacoes: texto
        })
    ];
}

function capturarCampo(texto, regex, grupo = 1) {
    const match = texto.match(regex);
    return match ? String(match[grupo] || "").trim() : "";
}

/* ==========================================================
   NORMALIZAÇÃO PARA O SEU IndexedDB
   ========================================================== */

function normalizarRegistroEsus(item) {
    if (!item || typeof item !== "object") return null;

    const nome =
        pegarCampo(item, [
            "nome",
            "nomeCidadao",
            "nome_cidadao",
            "cidadao",
            "paciente",
            "nomePaciente",
            "NOME",
            "Nome"
        ]) || "SEM NOME IDENTIFICADO";

    const cpf = limparNumero(pegarCampo(item, ["cpf", "CPF", "numeroCpfCidadao"]));
    const cns = limparNumero(pegarCampo(item, ["cns", "CNS", "cartaoSus", "numeroCns"]));

    const nascimento =
        pegarCampo(item, [
            "nascimento",
            "dataNascimento",
            "data_nascimento",
            "dtNascimento",
            "DATA_NASCIMENTO"
        ]) || "";

    const sexo =
        pegarCampo(item, ["sexo", "SEXO", "genero"]) || "";

    const telefone =
        pegarCampo(item, [
            "telefone",
            "celular",
            "fone",
            "telefoneCelular",
            "TELEFONE"
        ]) || "";

    const endereco =
        pegarCampo(item, [
            "endereco",
            "logradouro",
            "rua",
            "ENDERECO"
        ]) || "";

    const microarea =
        pegarCampo(item, [
            "microarea",
            "micro_area",
            "microÁrea",
            "MICROAREA"
        ]) || "";

    const equipe =
        pegarCampo(item, [
            "equipe",
            "nomeEquipe",
            "EQUIPE"
        ]) || "";

    const condicoesTexto = JSON.stringify(item).toLowerCase();

    const hipertenso = /hipertens|has|press[aã]o alta/.test(condicoesTexto);
    const diabetico = /diabet|dm\b|diabetes/.test(condicoesTexto);
    const gestante = /gestante|gravidez|pré.?natal|pre.?natal/.test(condicoesTexto);
    const tuberculose = /tuberculose|\btb\b/.test(condicoesTexto);
    const hanseniase = /hansen|hanseníase|hanseniase/.test(condicoesTexto);

    const idSeguro =
        cpf ||
        cns ||
        "IMP-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);

    return {
        id: idSeguro,
        origem: "IMPORTADOR_ESUS",
        dataImportacao: new Date().toISOString(),

        nome: String(nome).trim(),
        cpf: cpf,
        cns: cns,
        nascimento: nascimento,
        sexo: sexo,
        telefone: telefone,
        endereco: endereco,
        microarea: microarea,
        equipe: equipe,

        hipertenso: hipertenso,
        diabetico: diabetico,
        gestante: gestante,
        tuberculose: tuberculose,
        hanseniase: hanseniase,

        risco: detectarRisco(condicoesTexto),

        soapSubjetivo: "Registro importado do e-SUS PEC.",
        soapObjetivo: "",
        soapAvaliacao: montarAvaliacaoImportada({
            hipertenso,
            diabetico,
            gestante,
            tuberculose,
            hanseniase
        }),
        soapPlanoConduta: "Avaliar cadastro importado e validar dados clínicos.",
        historicoEvolucoes: [
            `--- IMPORTAÇÃO e-SUS (${new Date().toLocaleString("pt-BR")}) ---
Registro importado automaticamente.

Nome: ${nome}
CPF: ${cpf || "não informado"}
CNS: ${cns || "não informado"}
Telefone: ${telefone || "não informado"}
Equipe: ${equipe || "não informado"}
Microárea: ${microarea || "não informado"}`
        ],

        brutoImportado: item
    };
}

function pegarCampo(obj, campos) {
    for (const campo of campos) {
        if (
            obj[campo] !== undefined &&
            obj[campo] !== null &&
            String(obj[campo]).trim() !== ""
        ) {
            return obj[campo];
        }
    }
    return "";
}

function limparNumero(valor) {
    return String(valor || "").replace(/\D/g, "");
}

function detectarRisco(texto) {
    if (/alto risco|risco alto|urgente|grave|cr[ií]tico/.test(texto)) {
        return "critico";
    }

    if (/gestante|tuberculose|hansen|idoso|acamado/.test(texto)) {
        return "alto";
    }

    if (/hipertens|diabet/.test(texto)) {
        return "moderado";
    }

    return "habitual";
}

function montarAvaliacaoImportada(flags) {
    const achados = [];

    if (flags.hipertenso) achados.push("HAS");
    if (flags.diabetico) achados.push("DM");
    if (flags.gestante) achados.push("Gestante");
    if (flags.tuberculose) achados.push("Tuberculose");
    if (flags.hanseniase) achados.push("Hanseníase");

    return achados.length
        ? "Condições identificadas na importação: " + achados.join(", ")
        : "Sem condição prioritária identificada automaticamente.";
}

/* ==========================================================
   GRAVAÇÃO NO INDEXEDDB
   Usa db global se já existir.
   ========================================================== */

async function gravarRegistrosImportados(registros) {
    const banco = await obterBancoPacientes();

    return new Promise((resolve, reject) => {
        const tx = banco.transaction(["pacientes"], "readwrite");
        const store = tx.objectStore("pacientes");

        let total = 0;

        registros.forEach(registro => {
            store.put(registro);
            total++;
        });

        tx.oncomplete = () => resolve(total);
        tx.onerror = () => reject(tx.error || new Error("Erro ao gravar no IndexedDB."));
    });
}

function obterBancoPacientes() {
    if (window.db) {
        return Promise.resolve(window.db);
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open("PEP_CBEFC_DB", 1);

        request.onupgradeneeded = function (event) {
            const banco = event.target.result;

            if (!banco.objectStoreNames.contains("pacientes")) {
                banco.createObjectStore("pacientes", { keyPath: "id" });
            }
        };

        request.onsuccess = function (event) {
            window.db = event.target.result;
            resolve(window.db);
        };

        request.onerror = function () {
            reject(new Error("Não foi possível abrir o IndexedDB."));
        };
    });
}
</script>
