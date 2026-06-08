async function carregarTabelaBanco() {
    const container = document.getElementById("tabelaBancoContainer");

    if (!container) return;

    if (typeof supabaseClient === "undefined") {
        container.innerHTML = `<p style="color:var(--danger);">Supabase não carregado.</p>`;
        return;
    }

    container.innerHTML = `<p style="color:var(--text-muted);">Carregando dados do Supabase...</p>`;

    const { data, error } = await supabaseClient
        .from("pacientes")
        .select(`
            id,
            nome,
            cpf,
            cns,
            telefone,
            cep,
            endereco,
            numero,
            complemento,
            ubs,
            equipe,
            ubs_vinculacao,
            equipe_esf
        `)
        .order("nome", { ascending: true })
        .limit(500);

    if (error) {
        console.error("Erro ao carregar Base Territorial:", error);
        container.innerHTML = `<p style="color:var(--danger);">Erro ao carregar Base Territorial.</p>`;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted);">Nenhum paciente encontrado.</p>`;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>CPF</th>
                    <th>CNS</th>
                    <th>Telefone</th>
                    <th>UBS</th>
                    <th>Equipe</th>
                    <th>Ação</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(p => {
        html += `
            <tr>
                <td><b>${p.nome || "-"}</b></td>
                <td>${p.cpf || "-"}</td>
                <td>${p.cns || "-"}</td>
                <td>${p.telefone || "-"}</td>
                <td>${p.ubs_vinculacao || p.ubs || "-"}</td>
                <td>${p.equipe_esf || p.equipe || "-"}</td>
                <td>
                    <button
                        class="btn-table-action btn-edit"
                        onclick="abrirAtendimentoExistente('${p.cpf || ""}', '${p.cns || ""}')">
                        Abrir
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

window.carregarTabelaBanco = carregarTabelaBanco;
