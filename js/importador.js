<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>

<div style="background:#111c2e; padding:15px; border:1px solid var(--border); border-radius:8px;">
    <h4 style="margin:0 0 10px 0; color:var(--primary-neon);">
        📥 Interoperabilidade de Arquivos e-SUS PEC
    </h4>

    <p style="font-size:12px; color:var(--text-muted); margin:0 0 10px 0;">
        Importa JSON, XML, Excel, PDF textual ou OCR.
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
