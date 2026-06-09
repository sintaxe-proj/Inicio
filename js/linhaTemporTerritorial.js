/* ==========================================================
   🧬 LINHA DO TEMPO TERRITORIAL 3.0 — SINTAXEHUB
   ========================================================== */

let linhaTempoTerritorialAtual = [];

function abrirLinhaTempoTerritorial(cpf = "", cns = "") {

    if (typeof navigate === "function") {
        navigate("linha-tempo-territorial");
    }

    setTimeout(() => {

        const campoCPF =
            document.getElementById("linhaTempoCPF");

        const campoCNS =
            document.getElementById("linhaTempoCNS");

        if (campoCPF) {
            campoCPF.value =
                cpf || "";
        }

        if (campoCNS) {
            campoCNS.value =
                cns || "";
        }

        carregarLinhaTempoTerritorialAPS(
            cpf,
            cns
        );

    }, 250);
}

async function carregarLinhaTempoTerritorialAPS(
    cpfParam = "",
    cnsParam = ""
) {

    const container =
        document.getElementById(
            "conteudoLinhaTempoTerritorial"
        );

    if (!container) return;

    container.innerHTML =
        `<p>Consultando histórico territorial...</p>`;

    try {

        const cpf =
            limparDocumentoLinhaTempo(
                cpfParam ||
                document.getElementById(
                    "linhaTempoCPF"
                )?.value ||
                ""
            );

        const cns =
            (
                cnsParam ||
                document.getElementById(
                    "linhaTempoCNS"
                )?.value ||
                ""
            ).trim();

        const paciente =
            await buscarPacienteLinhaTempo(
                cpf,
                cns
            );

        const [
            atendimentos,
            interacoes,
            reunioes,
            materiais
        ] = await Promise.all([

            buscarRegistrosLinhaTempo(
                "atendimentos",
                cpf,
                cns
            ),

            buscarRegistrosLinhaTempo(
                "interacoes_busca_ativa",
                cpf,
                cns
            ),

            buscarRegistrosLinhaTempo(
                "reunioes",
                cpf,
                cns
            ),

            buscarRegistrosLinhaTempo(
                "solicitacoes_materiais",
                cpf,
                cns
            )

        ]);

        linhaTempoTerritorialAtual =
            montarEventosLinhaTempoTerritorial(
                paciente,
                atendimentos,
                interacoes,
                reunioes,
                materiais
            );

        renderizarLinhaTempoTerritorial(
            paciente,
            linhaTempoTerritorialAtual
        );

    } catch (erro) {

        console.error(erro);

        container.innerHTML =
            `<p style="color:red;">
                Erro ao carregar linha do tempo.
            </p>`;
    }
}

async function buscarPacienteLinhaTempo(
    cpf,
    cns
) {

    let query =
        supabaseClient
            .from("pacientes")
            .select("*")
            .limit(1);

    if (cpf && cns) {

        query =
            query.or(
                `cpf.eq.${cpf},cns.eq.${cns}`
            );

    } else if (cpf) {

        query =
            query.eq(
                "cpf",
                cpf
            );

    } else {

        query =
            query.eq(
                "cns",
                cns
            );

    }

    const {
        data,
        error
    } = await query;

    if (error) {

        console.error(error);

        return null;
    }

    return data?.[0] || null;
}

function montarEventosLinhaTempoTerritorial(
    paciente,
    atendimentos,
    interacoes,
    reunioes,
    materiais
) {

    const eventos = [];

    atendimentos.forEach(a => {

        eventos.push({

            data:
                a.data_atendimento ||
                a.created_at,

            tipo:
                "🩺 Atendimento",

            titulo:
                a.ciapSelecionado ||
                "SOAP",

            resumo:
                a.soapSubjetivo ||
                "",

            origem:
                "atendimentos"

        });

    });

    interacoes.forEach(i => {

        eventos.push({

            data:
                i.created_at,

            tipo:
                "📞 Busca Ativa",

            titulo:
                i.resultado ||
                "Contato",

            resumo:
                i.observacao ||
                "",

            origem:
                "interacoes"

        });

    });

    reunioes.forEach(r => {

        eventos.push({

            data:
                r.created_at,

            tipo:
                "👥 Reunião",

            titulo:
                "Discussão de caso",

            resumo:
                r.discussao ||
                "",

            origem:
                "reunioes"

        });

    });

    materiais.forEach(m => {

        eventos.push({

            data:
                m.created_at,

            tipo:
                "📦 Material",

            titulo:
                m.descricao_item,

            resumo:
                m.status,

            origem:
                "materiais"

        });

    });

    return eventos.sort(
        (a, b) =>
            new Date(b.data) -
            new Date(a.data)
    );
}
