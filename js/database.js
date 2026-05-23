// ==========================================================================
// 🗄️ BANCO DE DADOS LOCAL (INDEXEDDB)
// ==========================================================================

let db;
const DB_NAME = "SintaxeHubDB";
const DB_VERSION = 2;

function configurarIndexedDB() {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = function(event) {
        console.error("Erro crítico ao abrir IndexedDB:", event.target.error);
        mostrarToast("❌ Erro ao carregar banco local.");
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        console.log("🗄️ IndexedDB conectado.");

        if (localStorage.getItem("pep_sessao_ativa")) {
            atualizarIndicatorsDashboard();
            atualizarCentralAvisosSininho();
            listarTodosBanco();
        }
    };

    request.onupgradeneeded = function(event) {
        const dbInstance = event.target.result;

        if (!dbInstance.objectStoreNames.contains("pacientes")) {
            const store = dbInstance.createObjectStore(
                "pacientes",
                { keyPath: "cpf" }
            );

            store.createIndex("nome","nome",{unique:false});
            store.createIndex("ubs","ubs",{unique:false});
            store.createIndex("equipe","equipe",{unique:false});

            console.log("ObjectStore pacientes criada");
        }
    };
}

function removerPacienteDoTerritorio(cpf) {

    if (!confirm(
        "Tem certeza que deseja remover este registro?"
    )) return;

    const transaction=db.transaction(
        ["pacientes"],
        "readwrite"
    );

    const store=transaction.objectStore("pacientes");

    const request=store.delete(cpf);

    request.onsuccess=function(){

        mostrarToast(
            "🗑️ Registro removido."
        );

        listarTodosBanco();
        atualizarIndicatorsDashboard();
        atualizarCentralAvisosSininho();

    };
}

function listarTodosBanco() {

    if (!db) return;

    const transaction=db.transaction(
        ["pacientes"],
        "readonly"
    );

    const store=transaction.objectStore(
        "pacientes"
    );

    const request=store.getAll();

    request.onsuccess=function(){

        console.log(
            "Pacientes:",
            request.result
        );

    };

}
