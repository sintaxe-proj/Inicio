/* ==========================================================================
   📥 IMPORTADOR e-SUS / JSON
   ========================================================================== */

function processarArquivoEsus(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);

            if (!dados.cpf || !dados.nome) {
                mostrarToast("❌ Arquivo inválido: sem CPF ou nome.");
                return;
            }

            dados.reavaliacaoDias =
                dados.reavaliacaoDias !== undefined
                    ? parseInt(dados.reavaliacaoDias)
                    : 30;

            const transaction = db.transaction(["pacientes"], "readwrite");
            const store = transaction.objectStore("pacientes");

            store.put(dados);

            transaction.oncomplete = function() {
                mostrarToast(`📥 ${dados.nome} importado.`);
                atualizarIndicatorsDashboard();
                atualizarCentralAvisosSininho();
                input.value = "";
            };

        } catch (err) {
            mostrarToast("❌ Erro ao ler JSON e-SUS.");
        }
    };

    reader.readAsText(file);
}
