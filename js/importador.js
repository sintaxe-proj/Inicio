let dadosImportadosTemp = [];

// ======================================================
// IMPORTADOR UNIVERSAL
// JSON, XML, XLSX, XLS, PDF textual e PDF com OCR
// ======================================================

async function processarArquivoEsus(input) {
    const file = input.files[0];
    if (!file) return;

    const nome = file.name.toLowerCase();

    try {
        mostrarToast('📥 Processando arquivo...');

        if (nome.endsWith('.json')) {
            dadosImportadosTemp = await lerJSON(file);
        } else if (nome.endsWith('.xml')) {
            dadosImportadosTemp = await lerXML(file);
        } else if (nome.endsWith('.xlsx') || nome.endsWith('.xls')) {
            dadosImportadosTemp = await lerXLSX(file);
        } else if (nome.endsWith('.pdf')) {
            dadosImportadosTemp = await lerPDF(file);
        } else {
            mostrarToast('❌ Formato não suportado.');
            return;
        }

        abrirModalConferenciaImportacao();
        input.value = '';

    } catch (err) {
        console.error(err);
        mostrarToast('❌ Erro ao processar arquivo.');
    }
}

// ======================================================
// JSON
// ======================================================

async function lerJSON(file) {
    const texto = await file.text();
    const json = JSON.parse(texto);
    const lista = Array.isArray(json) ? json : [json];

    return lista.map(normalizarPaciente);
}

// ======================================================
// XML
// ======================================================

async function lerXML(file) {
    const texto = await file.text();

    const xml = new DOMParser().parseFromString(
        texto,
        'text/xml'
    );

    const registros = Array.from(
        xml.querySelectorAll(
            'paciente, cidadao, cidadão, cadastro, registro, ficha'
        )
    );

    if (!registros.length) {
        return [];
    }

    return registros.map(reg => normalizarPaciente({
        nome:
            reg.querySelector('nome, nomePaciente, nomeCompleto')?.textContent || '',
        cpf:
            reg.querySelector('cpf, cpfPaciente, numeroCpf')?.textContent || '',
        telefone:
            reg.querySelector('telefone, celular, telPaciente')?.textContent || '',
        unidade:
            reg.querySelector('ubs, unidade, unidadePaciente, cnes')?.textContent || '',
        equipe:
            reg.querySelector('equipe, equipePaciente, ine')?.textContent || ''
    }));
}

// ======================================================
// XLSX / XLS
// ======================================================

async function lerXLSX(file) {
    if (typeof XLSX === 'undefined') {
        mostrarToast('❌ Biblioteca XLSX não carregada.');
        return [];
    }

    const buffer = await file.arrayBuffer();

    const workbook = XLSX.read(buffer, {
        type: 'array'
    });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const linhas = XLSX.utils.sheet_to_json(sheet, {
        defval: ''
    });

    return linhas.map(normalizarPaciente);
}

// ======================================================
// PDF COM TEXTO + OCR
// ======================================================

async function lerPDF(file) {
    if (typeof pdfjsLib === 'undefined') {
        mostrarToast('❌ Biblioteca PDF.js não carregada.');
        return [];
    }

    const buffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
        data: buffer
    }).promise;

    let texto = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);

        const content = await page.getTextContent();

        const textoPagina = content.items
            .map(item => item.str)
            .join(' ');

        if (textoPagina.trim().length > 20) {
            texto += textoPagina + '\n';
        } else {
            if (typeof Tesseract === 'undefined') {
                mostrarToast(
                    '⚠️ PDF escaneado detectado, mas OCR não carregado.'
                );
                continue;
            }

            mostrarToast(`🔎 Aplicando OCR na página ${i}...`);

            const viewport = page.getViewport({
                scale: 2
            });

            const canvas = document.createElement('canvas');

            const ctx = canvas.getContext('2d');

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: ctx,
                viewport: viewport
            }).promise;

            const resultado = await Tesseract.recognize(
                canvas,
                'por'
            );

            texto += resultado.data.text + '\n';
        }
    }

    return extrairPacientesTextoPDF
