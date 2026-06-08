/* ==========================================================================
   🗂️ BASE TERRITORIAL
   Arquivo: js/banco.js
   Supabase puro
   ========================================================================== */

async function carregarTabelaBanco() {

    const container =
        document.getElementById(
            "tabelaBancoContainer"
        );

    const termo =
        document.getElementById(
            "buscaBaseTerritorial"
        )?.value?.trim() || "";

    if (!container) return;

    if (typeof supabaseClient === "undefined") {

        container.innerHTML = `
            <p style="color:var(--danger);">
                Supabase não carregado.
            </p>
        `;

        return;
    }

    container.innerHTML = `
        <p style="color:var(--text-muted);">
            Carregando dados do Supabase...
        </p>
    `;

    try {

        let query =
            supabaseClient
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
                .order(
                    "nome",
                    {
                        ascending: true
                    }
                )
                .limit(500);

        if (termo) {

            const numeros =
                termo.replace(/\D/g, "");

            if (numeros.length >= 3) {

                query = query.or(
                    `
                    cpf.ilike.%${numeros}%,
                    cns.ilike.%${numeros}%,
                    telefone.ilike.%${numeros}%
                    `
                    .replace(/\s+/g, "")
                );

            } else {

                query = query.or(
                    `
                    nome.ilike.%${termo}%,
                    ubs.ilike.%${termo}%,
                    equipe.ilike.%${termo}%,
                    ubs_vinculacao.ilike.%${termo}%,
                    equipe_esf.ilike.%${termo}%
                    `
                    .replace(/\s+/g, "")
                );
            }
        }

        const {
            data,
            error
        } = await query;

        if (error) {

            console.error(
                "Erro ao carregar Base Territorial:",
                error
            );

            container.innerHTML = `
                <p style="color:var(--danger);">
                    Erro ao carregar Base Territorial.
                </p>
            `;

            return;
        }

        if (!data || data.length === 0) {

            container.innerHTML = `
                <p style="color:var(--text-muted);">
                    Nenhum paciente encontrado.
                </p>
            `;

            return;
        }

        let html = `
            <table class="table-sintaxe">
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

                    <td>
                        <strong>
                            ${p.nome || "-"}
                        </strong>
                    </td>

                    <td>
                        ${p.cpf || "-"}
                    </td>

                    <td>
                        ${p.cns || "-"}
                    </td>

                    <td>
                        ${p.telefone || "-"}
                    </td>

                    <td>
                        ${
                            p.ubs_vinculacao ||
                            p.ubs ||
                            "-"
                        }
                    </td>

                    <td>
                        ${
                            p.equipe_esf ||
                            p.equipe ||
                            "-"
                        }
                    </td>

                    <td>

                        <button
                            class="btn-table-action btn-edit"
                            onclick="
                                abrirAtendimentoExistente(
                                    '${p.cpf || ""}',
                                    '${p.cns || ""}'
                                )
                            "
                        >
                            📋 Abrir
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

        console.log(
            `✅ Base Territorial carregada: ${data.length} registros`
        );

    } catch (erro) {

        console.error(
            "Erro geral Base Territorial:",
            erro
        );

        container.innerHTML = `
            <p style="color:var(--danger);">
                Falha ao carregar Base Territorial.
            </p>
        `;
    }
}

/* ==========================================================================
   🔎 BUSCA RÁPIDA
   ========================================================================== */

function limparBuscaBaseTerritorial() {

    const campo =
        document.getElementById(
            "buscaBaseTerritorial"
        );

    if (!campo) return;

    campo.value = "";

    carregarTabelaBanco();
}

/* ==========================================================================
   🚀 START
   ========================================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const busca =
            document.getElementById(
                "buscaBaseTerritorial"
            );

        if (busca) {

            busca.addEventListener(
                "keyup",
                () => {

                    clearTimeout(
                        window.timerBuscaBase
                    );

                    window.timerBuscaBase =
                        setTimeout(
                            carregarTabelaBanco,
                            400
                        );
                }
            );
        }
    }
);

/* ==========================================================================
   🌎 GLOBAL
   ========================================================================== */

window.carregarTabelaBanco =
    carregarTabelaBanco;

window.limparBuscaBaseTerritorial =
    limparBuscaBaseTerritorial;
