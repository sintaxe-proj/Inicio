function configurarIndexedDB() {

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = function(event) {

        console.error(
            "Erro crítico ao abrir o IndexedDB:",
            event.target.error
        );

        mostrarToast("❌ Erro ao carregar banco de dados local.");
    };

    request.onsuccess = function(event) {

        db = event.target.result;

        console.log("🗄️ IndexedDB conectado.");

        // Verifica se existe sessão ativa
        if (localStorage.getItem("pep_sessao_ativa")) {

            // Inicializa autocomplete CIAP
            if (typeof inicializarAutocompleteCIAP === "function") {

                inicializarAutocompleteCIAP();
            }

            // Atualiza indicadores do dashboard
            if (typeof atualizarIndicatorsDashboard === "function") {

                atualizarIndicatorsDashboard();
            }

            // Atualiza sininho de avisos
            if (typeof atualizarCentralAvisosSininho === "function") {

                atualizarCentralAvisosSininho();
            }

            // Lista banco de pacientes
            if (typeof listarTodosBanco === "function") {

                listarTodosBanco();
            }
        }
    };

    request.onupgradeneeded = function(event) {

        const dbInstance = event.target.result;

        // Cria tabela pacientes
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

            console.log(
                "🗄️ ObjectStore 'pacientes' criada."
            );
        }
    };
}
