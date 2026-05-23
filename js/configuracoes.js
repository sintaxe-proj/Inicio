function gerarCargaMassaOitoMil() {
    if (!db) {
        mostrarToast("⚠️ Banco ainda não conectado.");
        return;
    }

    if (!confirm("Injetar 8.000 prontuários simulados?")) return;

    mostrarToast("⏳ Inserindo 8.000 prontuários...");

    const nomes = ["Ana", "Bruno", "Carlos", "Daniela", "Eduardo", "Fernanda", "Gabriel", "Helena", "Igor", "Juliana"];
    const sobrenomes = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Almeida", "Pereira", "Lima", "Costa"];
    const ubs = ["UBS Centro Médico", "UBS Vila Nova", "Clínica da Família Zona Sul", "UBS Integrada Norte"];
    const equipes = ["Equipe Verde", "Equipe Azul", "Equipe Esmeralda", "Equipe Rubi"];

    const transaction = db.transaction(["pacientes"], "readwrite");
    const store = transaction.objectStore("pacientes");

    transaction.oncomplete = function() {
        mostrarToast("🚀 8.000 prontuários inseridos!");

        if (typeof atualizarIndicatorsDashboard === "function") atualizarIndicatorsDashboard();
        if (typeof atualizarCentralAvisosSininho === "function") atualizarCentralAvisosSininho();
        if (typeof listarTodosBanco === "function") listarTodosBanco();
    };

    transaction.onerror = function(event) {
        console.error("Erro na carga:", event.target.error);
        mostrarToast("❌ Erro ao inserir prontuários.");
    };

    for (let i = 0; i < 8000; i++) {
        const isHAS = i % 2 === 0;
        const isDM = i % 3 === 0;
        const isGestante = i % 11 === 0;
        const isTB = i % 20 === 0;
        const isHansen = i % 25 === 0;

        let prazo = Math.floor(Math.random() * 120) + 1;

        if (i % 15 === 0) prazo = 0;

        // Força alguns casos em "atenção"
        if (i % 17 === 0) prazo = 20; // HAS/DM perto de 30 dias
        if (i % 19 === 0) prazo = 10; // PN/TB/Hansen perto de 15 dias

        const dataDum = new Date();
        dataDum.setDate(dataDum.getDate() - (80 + (i % 120)));

        const dpp = new Date(dataDum);
        dpp.setDate(dpp.getDate() + 280);

        store.put({
            cpf: `999.${String(i).padStart(3, "0")}.778-${String(i % 100).padStart(2, "0")}`,
            nome: `${nomes[i % 10]} ${sobrenomes[(i + 3) % 10]} ${sobrenomes[(i + 7) % 10]}`,
            nasc: isGestante ? "1998-04-12" : "1985-06-15",
            idade: isGestante ? "28" : "41",
            tel: "(21) 98888-7711",
            cep: "20000-000",
            endereco: "Avenida Central do Município Simulador",
            numero: String(i),
            complemento: "Lote Acadêmico",
            ubs: ubs[i % 4],
            equipe: equipes[i % 4],

            has: isHAS ? "Sim" : "Não",
            pas: isHAS ? "145" : "",
            pad: isHAS ? "95" : "",
            classifHas: isHAS ? "Hipertensão Estágio 1 ou 2" : "",

            dm: isDM ? "Sim" : "Não",
            hba1c: isDM ? "7.5" : "",
            classifDm: isDM ? "Controle Limítrofe" : "",

            gestante: isGestante ? "Sim" : "Não",
            dum: isGestante ? dataDum.toISOString().split("T")[0] : "",
            ig: isGestante ? "Pré-natal ativo" : "",
            dpp: isGestante ? dpp.toLocaleDateString("pt-BR") : "",

            tb: isTB ? "Sim" : "Não",
            hansen: isHansen ? "Sim" : "Não",
            ampi: "Idoso Robusto",

            objPA: isHAS ? "140x90" : "120x80",
            objFC: "76",
            objFR: "16",
            objSatO2: "98",
            objDor: "0",
            exameFisicoStatus: "Normal",
            soapObjetivoAlterado: "",
            reavaliacaoDias: prazo,

            historicoEvolucoes: [
                `--- ATENDIMENTO SIMULADO (${i}) ---\nS: Sem queixas.\nO: PA 120x80 | FC 76.\nA: Simulação APS.\nP: Monitoramento em ${prazo} dias.`
            ]
        });
    }
}
