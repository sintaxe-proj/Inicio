/* ==========================================================================
   🔐 LOGIN SUPABASE PURO
   ========================================================================== */

async function autenticarUsuario() {

    const email =
        document.getElementById("loginUser")
            ?.value
            ?.trim()
            ?.toLowerCase();

    const senha =
        document.getElementById("loginSenha")
            ?.value
            ?.trim();

    const erro =
        document.getElementById("loginErro");

    if (erro) {
        erro.style.display = "none";
        erro.innerText = "";
    }

    if (!email || !senha) {

        if (erro) {

            erro.innerText =
                "⚠️ Informe e-mail e senha.";

            erro.style.display =
                "block";
        }

        return;
    }

    try {

        /* ==================================================
           LOGIN SUPABASE AUTH
           ================================================== */

        const {
            data,
            error
        } =
        await supabaseClient.auth.signInWithPassword({

            email,
            password: senha

        });

        if (error) {

            console.error(
                "Erro login:",
                error
            );

            if (erro) {

                erro.innerText =
                    "❌ Usuário ou senha inválidos.";

                erro.style.display =
                    "block";
            }

            return;
        }

        const user =
            data.user;

        /* ==================================================
           PERFIL PUBLIC.users
           ================================================== */

        const {
            data: perfil,
            error: erroPerfil
        } =
        await supabaseClient
            .from("users")
            .select(`
                id,
                nome,
                email,
                perfil,
                ativo
            `)
            .eq("id", user.id)
            .maybeSingle();

        if (erroPerfil) {

            console.error(
                "Erro perfil:",
                erroPerfil
            );

            if (erro) {

                erro.innerText =
                    "❌ Erro ao carregar perfil.";

                erro.style.display =
                    "block";
            }

            return;
        }

        if (!perfil) {

            if (erro) {

                erro.innerText =
                    "❌ Usuário sem perfil cadastrado.";

                erro.style.display =
                    "block";
            }

            return;
        }

        if (!perfil.ativo) {

            if (erro) {

                erro.innerText =
                    "🚫 Usuário bloqueado.";

                erro.style.display =
                    "block";
            }

            return;
        }

        /* ==================================================
           SESSÃO LOCAL
           ================================================== */

        const sessao = {

            id:
                user.id,

            nome:
                perfil.nome,

            email:
                perfil.email,

            perfil:
                perfil.perfil,

            login_em:
                new Date().toISOString()
        };

        localStorage.setItem(
            "pep_sessao_ativa",
            JSON.stringify(sessao)
        );

        window.usuarioLogado =
            sessao;

        /* ==================================================
           HEADER
           ================================================== */

        const nomeUsuario =
            document.getElementById(
                "nomeUsuarioLogado"
            );

        if (nomeUsuario) {

            nomeUsuario.innerText =
                "👤 " + perfil.nome;
        }

        /* ==================================================
           SISTEMA
           ================================================== */

        document.getElementById(
            "loginScreen"
        ).style.display = "none";

        document.getElementById(
            "app"
        ).style.display = "block";

        aplicarPermissoes?.(
            perfil.perfil
        );

        atualizarIndicatorsDashboard?.();

        atualizarCentralAvisosSininho?.();

        navigate?.("inicio");

        mostrarToast?.(
            `✅ Bem-vindo(a), ${perfil.nome}`
        );

        console.log(
            "✅ Login Supabase realizado."
        );

    } catch (e) {

        console.error(
            "Erro autenticação:",
            e
        );

        if (erro) {

            erro.innerText =
                "❌ Falha no login.";

            erro.style.display =
                "block";
        }
    }
}

/* ==========================================================================
   RESTAURAR SESSÃO
   ========================================================================== */

async function verificarSessao() {

    try {

        const {
            data
        } =
        await supabaseClient.auth.getUser();

        if (!data?.user) {

            mostrarTelaLogin?.();
            return;
        }

        const user =
            data.user;

        const {
            data: perfil
        } =
        await supabaseClient
            .from("users")
            .select(`
                id,
                nome,
                email,
                perfil,
                ativo
            `)
            .eq("id", user.id)
            .maybeSingle();

        if (!perfil || !perfil.ativo) {

            await supabaseClient.auth.signOut();

            mostrarTelaLogin?.();

            return;
        }

        window.usuarioLogado = {

            id:
                user.id,

            nome:
                perfil.nome,

            email:
                perfil.email,

            perfil:
                perfil.perfil
        };

        document.getElementById(
            "loginScreen"
        ).style.display = "none";

        document.getElementById(
            "app"
        ).style.display = "block";

        aplicarPermissoes?.(
            perfil.perfil
        );

        atualizarIndicatorsDashboard?.();

        atualizarCentralAvisosSininho?.();

        navigate?.("inicio");

    } catch (e) {

        console.error(
            "Erro sessão:",
            e
        );
    }
}

/* ==========================================================================
   LOGOUT
   ========================================================================== */

async function efetuarLogout() {

    await supabaseClient.auth.signOut();

    localStorage.removeItem(
        "pep_sessao_ativa"
    );

    window.usuarioLogado = null;

    location.reload();
}

/* ==========================================================================
   GLOBAL
   ========================================================================== */

window.autenticarUsuario =
    autenticarUsuario;

window.verificarSessao =
    verificarSessao;

window.efetuarLogout =
    efetuarLogout;
