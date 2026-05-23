/* ==========================================================================
   ⚙️ CONFIGURAÇÕES E CARGA DE TESTE
   ========================================================================== */

function gerarCargaMassaOitoMil() {
    if (!confirm("Esta ação injetará 8.000 cadastros simulados. Continuar?")) return;

    mostrarToast("⏳ Gerando 8.000 prontuários...");

    const nomes = ["Ana", "Bruno", "Carlos", "Daniela", "Eduardo", "Fernanda", "Gabriel", "Helena", "Igor", "Juliana"];
    const sobrenomes = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Almeida", "Pereira", "Lima", "Costa"];
    const ubs = ["UBS Centro Médico", "UBS Vila Nova", "Clínica da Família Zona Sul", "UBS Integrada Norte"];
    const equipes = ["Equipe Verde", "Equipe Azul", "Equipe Esmeralda", "Equipe Rubi"];

    const transaction = db.transaction(["pacientes"], "readwrite");
    const store = transaction.objectStore("pacientes");

    for (let i = 0; i < 8000; i++) {
        const prazo = i % 15 === 0 ? 0 : Math.floor(Math.random() * 90) + 1;

        store.put({
            cpf: `999.${String(i).padStart(3, "0")}.778-${String(i % 100).padStart(2, "0")}`,
            nome: `${nomes[i % 10]} ${sobrenomes[(i + 3) % 10]} ${sobrenomes[(i + 7) % 10]}`,
            nasc: "1985-06-15",
            idade: "41",
            tel: "(21) 98888-7711",
            cep: "20000-000",
            endereco: "Avenida Central do Município Simulador",
            numero: String(i),
            complemento: "Lote Acadêmico",
            ubs: ubs[i % 4],
            equipe: equipes[i % 4],
            has: i % 2 === 0 ? "Sim" : "Não",
            pas: i % 2 === 0 ? "145" : "",
            pad: i % 2 === 0 ? "95" : "",
            classifHas: i % 2 === 0 ? "Hipertensão Estágio 1 ou 2" : "",
            dm: i % 3 === 0 ? "Sim" : "Não",
            hba1c: i % 3 === 0 ? "7.5" : "",
            classifDm: i % 3 === 0 ? "Controle Limítrofe" : "",
            gestante: "Não",
            tb: "Não",
            hansen: "Não",
            ampi: "Idoso Robusto",
            objPA: i % 2 === 0 ? "140x90" : "120x80",
            objFC: "76",
            objFR: "16",
            objSatO2: "98",
            objDor: "0",
            exameFisicoStatus: "Normal",
            soapObjetivoAlterado: "",
            reavaliacaoDias: prazo,
            historicoEvolucoes: [
                `--- ATENDIMENTO SIMULADO (${i}) ---\nS: Sem queixas.\nO: PA 120x80 | FC 76.\nA: Simulação.\nP: Monitoramento em ${prazo} dias.`
            ]
        });
    }

    transaction.oncomplete = function() {
        mostrarToast("🚀 8.000 prontuários inseridos!");
        atualizarIndicatorsDashboard();
        atualizarCentralAvisosSininho();

        if (document.getElementById("view-banco").style.display === "block") {
            listarTodosBanco();
        }
    };
}
