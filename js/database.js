/* ==========================================================================
   🗄️ CONFIGURAÇÃO GLOBAL DO INDEXEDDB
   ========================================================================== */

let db;

const DB_NAME = "SintaxeHubDB";

const DB_VERSION = 2;

function configurarIndexedDB() {

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = function(event) {

        console.error(
            "Erro crítico ao abrir o IndexedDB:",
            event.target.error
        );

        mostrarToast("❌ Erro ao carregar banco.");
    };

    request.onsuccess = function(event) {

        db = event.target.result;

        console.log("🗄️ IndexedDB conectado.");

        if (localStorage.getItem("pep_sessao_ativa")) {

            if (typeof inicializarAutocompleteCIAP === "function") {
                inicializarAutocompleteCIAP();
            }

            if (typeof atualizarIndicatorsDashboard === "function") {
                atualizarIndicatorsDashboard();
            }

            if (typeof atualizarCentralAvisosSininho === "function") {
                atualizarCentralAvisosSininho();
            }

            if (typeof listarTodosBanco === "function") {
                listarTodosBanco();
            }
        }
    };

    request.onupgradeneeded = function(event) {

        const dbInstance = event.target.result;

        if (!dbInstance.objectStoreNames.contains("pacientes")) {

            const store = dbInstance.createObjectStore(
                "pacientes",
                { keyPath: "cpf" }
            );

            store.createIndex(
                "nome",
                "nome",
                { unique: false }
            );

            store.createIndex(
                "ubs",
                "ubs",
                { unique: false }
            );

            store.createIndex(
                "equipe",
                "equipe",
                { unique: false }
            );

            console.log("🗄️ Store pacientes criada.");
        }
    };
}
