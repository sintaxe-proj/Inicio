/* ==========================================================================
   🗄️ DATABASE
   Arquivo: js/database.js
   ========================================================================== */

let db;

const DB_NAME = "SintaxeHubDB";
const DB_VERSION = 2;

function configurarIndexedDB() {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = function (event) {
        console.error("Erro ao abrir IndexedDB:", event.target.error);
        mostrarToast?.("❌ Erro ao abrir banco local.");
    };

    request.onupgradeneeded = function (event) {
        const dbInstance = event.target.result;

        if (!dbInstance.objectStoreNames.contains("pacientes")) {
            const store = dbInstance.createObjectStore("pacientes", {
                keyPath: "cpf"
            });

            store.createIndex("nome", "nome", { unique: false });
            store.createIndex("cns", "cns", { unique: false });
            store.createIndex("ubs", "ubs", { unique: false });
            store.createIndex("equipe", "equipe", { unique: false });
        }
    };

    request.onsuccess = function (event) {
        db = event.target.result;

        console.log("🗄️ IndexedDB conectado.");

        if (typeof atualizarIndicatorsDashboard === "function") {
            atualizarIndicatorsDashboard();
        }

        if (typeof atualizarCentralAvisosSininho === "function") {
            atualizarCentralAvisosSininho();
        }

        if (typeof listarTodosBanco === "function") {
            listarTodosBanco();
        }
    };
}
