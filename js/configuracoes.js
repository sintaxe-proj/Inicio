function gerarCargaMassaOitoMil() {

    if (!db) {
        mostrarToast("⚠️ Banco ainda não conectado.");
        return;
    }

    if (!confirm("Injetar 8.000 prontuários simulados?")) return;

    mostrarToast("⏳ Inserindo 8.000 prontuários...");

    const nomes = [
        "Ana", "Bruno", "Carlos", "Daniela", "Eduardo",
        "Fernanda", "Gabriel", "Helena", "Igor", "Juliana"
    ];

    const sobrenomes = [
        "Silva", "Santos", "Oliveira", "Souza", "Rodrigues",
        "Ferreira", "Almeida", "Pereira", "Lima", "Costa"
    ];

    const ubs = [
        "UBS Centro Médico",
        "UBS Vila Nova",
        "Clínica da Família Zona Sul",
        "UBS Integrada Norte"
    ];

    const equipes = [
        "Equipe Verde",
        "Equipe Azul",
        "Equipe Esmeralda",
        "Equipe Rubi"
    ];

    const transaction = db.transaction(["pacientes"], "readwrite");
    const store = transaction.objectStore("pacientes");

    transaction.oncomplete = function () {

        mostrarToast("🚀 8.000 prontuários inseridos!");

        if (typeof atualizarIndicatorsDashboard === "function") {
            atualizarIndicatorsDashboard();
        }

        if (typeof atualizarCentralAvisosSininho === "function") {
            atualizarCentralAvisosSininho();
        }

        if (typeof listarTodosBanco === "function") {
            listarTodosBanco();
        }

        // TESTE DE VALIDAÇÃO
        const txTeste = db.transaction(["pacientes"], "readonly");
        const storeTeste = txTeste.objectStore("pacientes");
        const reqTeste = storeTeste.getAll();

        reqTeste.onsuccess = () => {

            const dados = reqTeste.result;

            console.log("📊 TOTAL:", dados.length);

            console.log(
                "🤰 GESTANTES:",
                dados.filter(p => p.gestante === "Sim").length
            );

            console.log(
                "🩺 HAS:",
                dados.filter(p => p.has === "Sim").length
            );

            console.log(
                "🍬 DM:",
                dados.filter(p => p.dm === "Sim").length
            );

            console.log(
                "🫁 TB:",
                dados.filter(p => p.tb === "Sim").length
            );

            console.log(
                "🦠 HANSEN:",
                dados.filter(p => p.hansen === "Sim").length
            );
        };
    };

    transaction.onerror = function (event) {

        console.error("❌ Erro na carga:", event.target.error);

        mostrarToast("❌ Erro ao inserir prontuários.");
    };

    for (let i = 0; i < 8000; i++) {

        const isHAS = i % 2 === 0;
        const isDM = i % 3 === 0;

        // MAIS GESTANTES
        const isGestante = i % 5 === 0;

        const isTB = i % 20 === 0;
        const isHansen = i % 25 === 0;

        let prazo = Math.floor(Math.random() * 120) + 1;

        // CRÍTICOS
        if (i % 15 === 0) {
            prazo = 0;
        }

        // ATENÇÃO HAS/DM (30 dias)
        if (i % 17 === 0) {
            prazo = 20;
        }

        // ATENÇÃO PN/TB/HANSEN (15 dias)
        if (i % 19 === 0) {
            prazo = 10;
        }

        const dataDum = new Date();

        dataDum.setDate(
            dataDum.getDate() - (80 + (i % 120))
        );

        const dpp = new Date(dataDum);

        dpp.setDate(dpp.getDate() + 280);

        const idadeGestacional = `${12 + (i % 24)} semanas`;

        const payload = {

            cpf:
                `999.${String(i).padStart(3, "0")}.778-${String(i % 100).padStart(2, "0")}`,

            nome:
                `${nomes[i % 10]} ${sobrenomes[(i + 3) % 10]} ${sobrenomes[(i + 7) % 10]}`,

            nasc:
                isGestante
                    ? "1998-04-12"
                    : "1985-06-15",

            idade:
                isGestante
                    ? "28"
                    : "41",

            tel: "(21) 98888-7711",

            cep: "20000-000",

            endereco:
                "Avenida Central do Município Simulador",

            numero: String(i),

            complemento: "Lote Acadêmico",

            ubs: ubs[i % 4],

            equipe: equipes[i % 4],

            // HAS
            has: isHAS ? "Sim" : "Não",

            pas: isHAS ? "145" : "",

            pad: isHAS ? "95" : "",

            classifHas:
                isHAS
                    ? "Hipertensão Estágio 1 ou 2"
                    : "",

            // DM
            dm: isDM ? "Sim" : "Não",

            hba1c: isDM ? "7.5" : "",

            classifDm:
                isDM
                    ? "Controle Limítrofe"
                    : "",

            // GESTANTE
            gestante:
                isGestante
                    ? "Sim"
                    : "Não",

            dum:
                isGestante
                    ? dataDum.toISOString().split("T")[0]
                    : "",

            ig:
                isGestante
                    ? idadeGestacional
                    : "",

            dpp:
                isGestante
                    ? dpp.toLocaleDateString("pt-BR")
                    : "",

            // TB
            tb:
                isTB
                    ? "Sim"
                    : "Não",

            // HANSEN
            hansen:
                isHansen
                    ? "Sim"
                    : "Não",

            ampi: "Idoso Robusto",

            // SINAIS VITAIS
            objPA:
                isHAS
                    ? "140x90"
                    : "120x80",

            objFC: "76",

            objFR: "16",

            objSatO2: "98",

            objDor: "0",

            exameFisicoStatus: "Normal",

            soapObjetivoAlterado: "",

            // PRAZO
            reavaliacaoDias: prazo,

            historicoEvolucoes: [

                `--- ATENDIMENTO SIMULADO (${i}) ---
S: Sem queixas.
O: PA 120x80 | FC 76.
A: Simulação APS.
P: Monitoramento em ${prazo} dias.`

            ]
        };

        store.put(payload);
    }
}
