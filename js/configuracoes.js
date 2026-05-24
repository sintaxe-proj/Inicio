/* ==========================================================
   CONFIGURAÇÕES — SUPABASE PURO
   Pacientes = identificação
   Atendimentos = dados clínicos
   Com auditoria do usuário logado
   ========================================================== */

function getUsuarioAuditoria() {
    const usuario = window.usuarioLogado || {};

    return {
        usuario_id: usuario?.id || null,
        usuario_nome: usuario?.nome || usuario?.email || null,
        usuario_perfil: usuario?.perfil || null
    };
}

/* ==========================================================
   USUÁRIOS
   ========================================================== */

async function salvarNovoUsuario() {
    const nome = document.getElementById("novoUsuarioNome")?.value.trim();
    const email = document.getElementById("novoUsuarioLogin")?.value.trim();
    const perfil = document.getElementById("novoUsuarioPerfil")?.value;

    if (!nome || !email || !perfil) {
        mostrarToast?.("⚠️ Informe nome, e-mail e perfil.");
        return;
    }

    const auditoria = getUsuarioAuditoria();

    const { error } = await supabaseClient
        .from("users")
        .upsert(
            {
                nome,
                email,
                perfil,
                ativo: true,
                ...auditoria
            },
            { onConflict: "email" }
        );

    if (error) {
        console.error("Erro ao salvar usuário:", error);
        mostrarToast?.("❌ Erro ao salvar usuário.");
        return;
    }

    mostrarToast?.("✅ Usuário salvo.");

    document.getElementById("novoUsuarioNome").value = "";
    document.getElementById("novoUsuarioLogin").value = "";
    document.getElementById("novoUsuarioSenha").value = "";

    listarUsuariosSistema();
}

async function listarUsuariosSistema() {
    const container = document.getElementById("listaUsuariosSistema");
    if (!container) return;

    const { data, error } = await supabaseClient
        .from("users")
        .select("id, nome, email, perfil, ativo")
        .order("nome", { ascending: true });

    if (error) {
        console.error("Erro ao listar usuários:", error);
        container.innerHTML = `<p style="color:var(--danger);">Erro ao carregar usuários.</p>`;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted);">Nenhum usuário cadastrado.</p>`;
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

    html += `</tbody></table>`;
    container.innerHTML = html;
}

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

    mostrarToast?.(ativo ? "✅ Usuário ativado." : "🚫 Usuário bloqueado.");
    listarUsuariosSistema();
}

/* ==========================================================
   CARGA DE MASSA — SUPABASE
   pacientes = identificação
   atendimentos = registro clínico
   ========================================================== */

async function gerarCargaMassaOitoMil() {
    if (typeof supabaseClient === "undefined") {
        mostrarToast?.("❌ Supabase não carregado.");
        return;
    }

    if (!confirm("Injetar 8.000 pacientes e atendimentos simulados no Supabase?")) {
        return;
    }

    mostrarToast?.("⏳ Gerando dados...");

    const auditoria = getUsuarioAuditoria();

    const pacientes = [];
    const atendimentos = [];

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
        const cpf = `999${String(i).padStart(6, "0")}${String(i % 100).padStart(2, "0")}`;
        const cns = `700${String(i).padStart(12, "0")}`;
        const nome = `${nomes[i % 10]} ${sobrenomes[(i + 3) % 10]} ${sobrenomes[(i + 7) % 10]}`;

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
            nome,
            cpf,
            cns,
            endereco: "Avenida Central do Município Simulador",
            numero: String(i),
            complemento: "Lote Acadêmico",
            cep: "20000-000",
            ubs: ubs[i % 4],
            equipe: equipes[i % 4],
            ...auditoria
        });

        atendimentos.push({
            cpf,
            cns,
            nome_paciente: nome,

            has: isHAS ? "Sim" : "Não",
            hasPAS: isHAS ? "145" : null,
            hasPAD: isHAS ? "95" : null,
            hasClassif: isHAS ? "Hipertensão Estágio 1 ou 2" : null,

            dm: isDM ? "Sim" : "Não",
            dmHbA1c: isDM ? "7.5" : null,
            dmClassif: isDM ? "Controle Limítrofe" : null,

            gestante: isGestante ? "Sim" : "Não",
            gestDUM: isGestante ? dataDum.toISOString().split("T")[0] : null,
            gestIG: isGestante ? `${12 + (i % 24)} semanas` : null,
            gestDPP: isGestante ? dpp.toLocaleDateString("pt-BR") : null,

            tb: isTB ? "Sim" : "Não",
            hansen: isHansen ? "Sim" : "Não",
            ampi: "Idoso Robusto",

            objPA: isHAS ? "140x90" : "120x80",
            objFC: "76",
            objFR: "16",
            objSatO2: "98",
            objDor: "0",
            objpeso: "70",
            objaltura: "170",
            objIMC: "24.2",

            soapSubjetivo: "Sem queixas.",
            soapObjetivoAlterado: "",
            inputBuscaCIAPS: "A98 - Medicina preventiva/manutenção da saúde",
            soapPlanoConduta: `Monitoramento em ${prazo} dias.`,
            reavaliacaoDias: prazo,

            ...auditoria
        });
    }

    await salvarEmLotes("pacientes", pacientes, 500, { upsert: true, conflito: "cpf" });
    await salvarEmLotes("atendimentos", atendimentos, 500, { upsert: false });

    mostrarToast?.("✅ 8.000 pacientes e atendimentos enviados ao Supabase.");

    atualizarIndicatorsDashboard?.();
    atualizarCentralAvisosSininho?.();
}

async function salvarEmLotes(tabela, dados, tamanhoLote = 500, opcoes = {}) {
    for (let i = 0; i < dados.length; i += tamanhoLote) {
        const lote = dados.slice(i, i + tamanhoLote);

        let resposta;

        if (opcoes.upsert) {
            resposta = await supabaseClient
                .from(tabela)
                .upsert(lote, { onConflict: opcoes.conflito });
        } else {
            resposta = await supabaseClient
                .from(tabela)
                .insert(lote);
        }

        if (resposta.error) {
            console.error(`Erro ao salvar lote em ${tabela}:`, resposta.error);
            mostrarToast?.(`❌ Erro ao salvar ${tabela}.`);
            throw resposta.error;
        }

        mostrarToast?.(`⏳ ${tabela}: ${Math.min(i + tamanhoLote, dados.length)} de ${dados.length}`);
    }
}

/* ==========================================================
   IMPORTADOR e-SUS
   Recebe lista já tratada e salva identificação em pacientes
   ========================================================== */

async function salvarPacientesImportadosSupabase(lista) {
    if (!lista || lista.length === 0) {
        mostrarToast?.("⚠️ Nenhum paciente para importar.");
        return;
    }

    const auditoria = getUsuarioAuditoria();

    const pacientes = lista.map(p => ({
        nome: p.nome || p.nome_paciente || null,
        cpf: p.cpf || null,
        cns: p.cns || null,
        endereco: p.endereco || null,
        numero: p.numero || null,
        complemento: p.complemento || null,
        cep: p.cep || null,
        ubs: p.ubs || p.unidade || null,
        equipe: p.equipe || null,
        ...auditoria
    }));

    await salvarEmLotes("pacientes", pacientes, 500, {
        upsert: true,
        conflito: "cpf"
    });

    mostrarToast?.("✅ Pacientes importados para o Supabase.");
}

/* ==========================================================
   GLOBAL
   ========================================================== */

window.salvarNovoUsuario = salvarNovoUsuario;
window.listarUsuariosSistema = listarUsuariosSistema;
window.alternarUsuarioAtivo = alternarUsuarioAtivo;
window.gerarCargaMassaOitoMil = gerarCargaMassaOitoMil;
window.salvarPacientesImportadosSupabase = salvarPacientesImportadosSupabase;
