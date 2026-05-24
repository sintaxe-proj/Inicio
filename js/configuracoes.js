/* ==========================================================
   CONFIGURAÇÕES — SUPABASE PURO
   Sem IndexedDB
   ========================================================== */

/* ==========================================================
   CRIAR USUÁRIO NA TABELA users
   Observação: o usuário também precisa existir no Supabase Auth.
   ========================================================== */

async function salvarNovoUsuario() {
    const nome = document.getElementById("novoUsuarioNome")?.value.trim();
    const email = document.getElementById("novoUsuarioLogin")?.value.trim();
    const perfil = document.getElementById("novoUsuarioPerfil")?.value;

    if (!nome || !email || !perfil) {
        mostrarToast?.("⚠️ Informe nome, e-mail e perfil.");
        return;
    }

    const { error } = await supabaseClient
        .from("users")
        .upsert(
            {
                nome,
                email,
                perfil,
                ativo: true
            },
            {
                onConflict: "email"
            }
        );

    if (error) {
        console.error("Erro ao salvar usuário:", error);
        mostrarToast?.("❌ Erro ao salvar usuário.");
        return;
    }

    mostrarToast?.("✅ Usuário salvo na tabela users.");

    document.getElementById("novoUsuarioNome").value = "";
    document.getElementById("novoUsuarioLogin").value = "";

    listarUsuariosSistema();
}

/* ==========================================================
   LISTAR USUÁRIOS
   ========================================================== */

async function listarUsuariosSistema() {
    const container = document.getElementById("listaUsuariosSistema");

    if (!container) return;

    const { data, error } = await supabaseClient
        .from("users")
        .select("id, nome, email, perfil, ativo")
        .order("nome", { ascending: true });

    if (error) {
        console.error("Erro ao listar usuários:", error);
        container.innerHTML =
            `<p style="color:var(--danger);">Erro ao carregar usuários.</p>`;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML =
            `<p style="color:var(--text-muted);">Nenhum usuário cadastrado.</p>`;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Perfil</th>
                    <th>Status</th>
                    <th>Ação</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(u => {
        html += `
            <tr>
                <td>${u.nome || "-"}</td>
                <td>${u.email || "-"}</td>
                <td>${u.perfil || "-"}</td>
                <td>${u.ativo ? "Ativo" : "Bloqueado"}</td>
                <td>
                    <button onclick="alternarUsuarioAtivo('${u.id}', ${!u.ativo})">
                        ${u.ativo ? "Bloquear" : "Ativar"}
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

/* ==========================================================
   ATIVAR / BLOQUEAR USUÁRIO
   ========================================================== */

async function alternarUsuarioAtivo(id, ativo) {
    const { error } = await supabaseClient
        .from("users")
        .update({ ativo })
        .eq("id", id);

    if (error) {
        console.error("Erro ao atualizar usuário:", error);
        mostrarToast?.("❌ Erro ao atualizar usuário.");
        return;
    }

    mostrarToast?.(
        ativo
            ? "✅ Usuário ativado."
            : "🚫 Usuário bloqueado."
    );

    listarUsuariosSistema();
}

/* ==========================================================
   CARGA DE MASSA — 8.000 PACIENTES NO SUPABASE
   ========================================================== */

async function gerarCargaMassaOitoMil() {
    if (typeof supabaseClient === "undefined") {
        mostrarToast?.("❌ Supabase não carregado.");
        return;
    }

    if (!confirm("Injetar 8.000 prontuários simulados no Supabase?")) {
        return;
    }

    mostrarToast?.("⏳ Gerando pacientes...");

    const pacientes = [];

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

    for (let i = 0; i < 8000; i++) {
        const isHAS = i % 2 === 0;
        const isDM = i % 3 === 0;
        const isGestante = i % 5 === 0;
        const isTB = i % 20 === 0;
        const isHansen = i % 25 === 0;

        let prazo = Math.floor(Math.random() * 120) + 1;

        if (i % 15 === 0) prazo = 0;
        if (i % 17 === 0) prazo = 20;
        if (i % 19 === 0) prazo = 10;

        const dataDum = new Date();
        dataDum.setDate(dataDum.getDate() - (80 + (i % 120)));

        const dpp = new Date(dataDum);
        dpp.setDate(dpp.getDate() + 280);

        pacientes.push({
            cpf: `999${String(i).padStart(6, "0")}${String(i % 100).padStart(2, "0")}`,
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
            hasPAS: isHAS ? "145" : "",
            hasPAD: isHAS ? "95" : "",
            hasClassif: isHAS ? "Hipertensão Estágio 1 ou 2" : "",

            dm: isDM ? "Sim" : "Não",
            dmHbA1c: isDM ? "7.5" : "",
            dmClassif: isDM ? "Controle Limítrofe" : "",

            gestante: isGestante ? "Sim" : "Não",
            gestDUM: isGestante ? dataDum.toISOString().split("T")[0] : "",
            gestIG: isGestante ? `${12 + (i % 24)} semanas` : "",
            gestDPP: isGestante ? dpp.toLocaleDateString("pt-BR") : "",

            tb: isTB ? "Sim" : "Não",
            hansen: isHansen ? "Sim" : "Não",

            objPA: isHAS ? "140x90" : "120x80",
            objFC: "76",
            objFR: "16",
            objSatO2: "98",
            objDor: "0",
            objpeso: "70",
            objaltura: "170",
            objIMC: "24.2",

            exameFisicoStatus: "Normal",
            soapObjetivoAlterado: "",
            reavaliacaoDias: prazo,

            historicoEvolucoes: [
                `--- ATENDIMENTO SIMULADO (${i}) ---
S: Sem queixas.
O: PA 120x80 | FC 76.
A: Simulação APS.
P: Monitoramento em ${prazo} dias.`
            ]
        });
    }

    await salvarPacientesEmLotesSupabase(pacientes);
}

/* ==========================================================
   SALVAR PACIENTES EM LOTES
   ========================================================== */

async function salvarPacientesEmLotesSupabase(pacientes) {
    const tamanhoLote = 500;

    for (let i = 0; i < pacientes.length; i += tamanhoLote) {
        const lote = pacientes.slice(i, i + tamanhoLote);

        const { error } = await supabaseClient
            .from("pacientes")
            .upsert(lote, {
                onConflict: "cpf"
            });

        if (error) {
            console.error("Erro no lote Supabase:", error);
            mostrarToast?.("❌ Erro ao salvar lote no Supabase.");
            return;
        }

        mostrarToast?.(`⏳ Enviado ${Math.min(i + tamanhoLote, pacientes.length)} de ${pacientes.length}`);
    }

    mostrarToast?.("✅ 8.000 pacientes enviados ao Supabase.");

    atualizarIndicatorsDashboard?.();
    atualizarCentralAvisosSininho?.();
}

/* ==========================================================
   IMPORTADOR e-SUS
   ========================================================== */

async function salvarPacientesImportadosSupabase(pacientes) {
    if (!pacientes || pacientes.length === 0) {
        mostrarToast?.("⚠️ Nenhum paciente para importar.");
        return;
    }

    await salvarPacientesEmLotesSupabase(pacientes);
}

/* ==========================================================
   GLOBAL
   ========================================================== */

window.salvarNovoUsuario = salvarNovoUsuario;
window.listarUsuariosSistema = listarUsuariosSistema;
window.alternarUsuarioAtivo = alternarUsuarioAtivo;
window.gerarCargaMassaOitoMil = gerarCargaMassaOitoMil;
window.salvarPacientesImportadosSupabase = salvarPacientesImportadosSupabase;
