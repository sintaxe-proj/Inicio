/* ==========================================================================
   🔐 AUTENTICAÇÃO SUPABASE + PERFIL LOCAL
   ========================================================================== */

async function autenticarUsuario() {

    const login =
        document.getElementById("loginUser")
            .value
            .trim();

    const senha =
        document.getElementById("loginSenha")
            .value
            .trim();

    const erro =
        document.getElementById("loginErro");

    erro.style.display = "none";

    if (!login || !senha) {

        erro.innerText =
            "⚠️ Informe usuário e senha.";

        erro.style.display = "block";

        return;
    }

    /* ======================================================
       LOCALIZA USUÁRIO MUNICIPAL
       ====================================================== */

    const usuario =
        USUARIOS_MUNICIPAIS[login];

    if (!usuario) {

        erro.innerText =
            "❌ Usuário não encontrado.";

        erro.style.display = "block";

        return;
    }

    /* ======================================================
       VALIDA SENHA LOCAL
       ====================================================== */

    if (usuario.senha !== senha) {

        erro.innerText =
            "❌ Senha inválida.";

        erro.style.display = "block";

        return;
    }

    /* ======================================================
       EMAIL FAKE PADRÃO SUPABASE
       ====================================================== */

    const emailSupabase =
        `${login}@sintaxe.local`;

    /* ======================================================
       TENTA LOGIN SUPABASE
       ====================================================== */

    let authResult =
        await supabaseClient.auth.signInWithPassword({
            email: emailSupabase,
            password: senha
        });

    /* ======================================================
       SE NÃO EXISTIR → CRIA
       ====================================================== */

    if (authResult.error) {

        const cadastro =
            await supabaseClient.auth.signUp({
                email: emailSupabase,
                password: senha,
                options: {
                    data: {
                        nome: usuario.nome,
                        perfil: usuario.perfil,
                        matricula: login
                    }
                }
            });

        if (cadastro.error) {

            console.error(cadastro.error);

            erro.innerText =
                "❌ Erro Supabase: " +
                cadastro.error.message;

            erro.style.display = "block";

            return;
        }

        /* ==============================================
           LOGIN NOVAMENTE
           ============================================== */

        authResult =
            await supabaseClient.auth.signInWithPassword({
                email: emailSupabase,
                password: senha
            });

        if (authResult.error) {

            console.error(authResult.error);

            erro.innerText =
                "❌ Erro ao autenticar Supabase.";

            erro.style.display = "block";

            return;
        }
    }

    /* ======================================================
       USUÁRIO SUPABASE
       ====================================================== */

    const user =
        authResult.data.user;

    /* ======================================================
       GARANTE TABELA USERS
       ====================================================== */

    await registrarUsuarioPublico(
        user,
        usuario,
        login
    );

    /* ======================================================
       SESSÃO LOCAL
       ====================================================== */

    localStorage.setItem(
        "pep_sessao_ativa",
        JSON.stringify({
            login,
            nome: usuario.nome,
            perfil: usuario.perfil,
            supabase_user_id: user.id,
            email: user.email
        })
    );

    window.usuarioLogado = {
        ...usuario,
        id: user.id,
        email: user.email,
        login
    };

    mostrarToast(
        `✅ Bem-vindo(a), ${usuario.nome}`
    );

    verificarSessao();
}

async function registrarUsuarioPublico(
    user,
    usuario,
    login
) {

    if (!user) return;

    const { error } =
        await supabaseClient
            .from("users")
            .upsert([{

                id: user.id,

                matricula: login,

                nome: usuario.nome,

                email: user.email,

                perfil: usuario.perfil,

                ativo: true,

                criado_em:
                    new Date().toISOString()

            }]);

    if (error) {

        console.error(
            "Erro ao registrar usuário:",
            error
        );
    }
}
