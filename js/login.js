/* ==========================================================================
   🔐 LOGIN.JS — COMPATIBILIDADE
   ==========================================================================

   ATENÇÃO:
   Este arquivo não deve duplicar a autenticação principal.

   A autenticação oficial do sistema está em:

       /js/auth.js

   Este login.js existe apenas para compatibilidade caso o index.html ainda
   carregue:

       <script src="./js/login.js"></script>

   Se auth.js já estiver carregado, este arquivo não sobrescreve as funções.
   ========================================================================== */

console.log("🔐 login.js carregado em modo compatibilidade.");

/* ==========================================================================
   ERRO VISUAL DE LOGIN
   ========================================================================== */

function mostrarErroLoginCompat(mensagem) {
    const erro =
        document.getElementById("loginErro");

    if (erro) {
        erro.innerText = mensagem;
        erro.style.display = "block";
    } else {
        alert(mensagem);
    }
}

/* ==========================================================================
   LOGIN SUPABASE — FALLBACK
   Só é registrado se auth.js ainda não criou autenticarUsuario
   ========================================================================== */

if (typeof window.autenticarUsuario !== "function") {

    window.autenticarUsuario = async function autenticarUsuario() {

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
            mostrarErroLoginCompat("⚠️ Informe e-mail e senha.");
            return;
        }

        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient?.auth
        ) {
            mostrarErroLoginCompat("❌ Supabase não carregado.");
            return;
        }

        try {
            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email,
                    password: senha
                });

            if (error) {
                console.error("Erro login:", error);
                mostrarErroLoginCompat("❌ Usuário ou senha inválidos.");
                return;
            }

            let perfil = null;

            if (typeof buscarPerfilUsuarioPorEmail === "function") {
                perfil =
                    await buscarPerfilUsuarioPorEmail(
                        data.user.email
                    );
            } else {
                const resposta =
                    await supabaseClient
                        .from("users")
                        .select("id, login, nome, email, perfil, ativo")
                        .eq("email", data.user.email)
                        .maybeSingle();

                if (resposta.error) {
                    console.error("Erro perfil:", resposta.error);
                    mostrarErroLoginCompat("❌ Erro ao carregar perfil.");
                    return;
                }

                perfil = resposta.data;
            }

            if (!perfil) {
                await supabaseClient.auth.signOut();
                mostrarErroLoginCompat("❌ Usuário sem perfil cadastrado.");
                return;
            }

            if (!perfil.ativo) {
                await supabaseClient.auth.signOut();
                mostrarErroLoginCompat("🚫 Usuário bloqueado.");
                return;
            }

            const usuario = {
                id: data.user.id,
                login: perfil.login || data.user.email,
                nome: perfil.nome || data.user.email,
                email: data.user.email,
                perfil: perfil.perfil || "assistencial",
                logadoEm: new Date().toISOString()
            };

            window.usuarioLogado = usuario;

            localStorage.setItem(
                "pep_sessao_ativa",
                JSON.stringify(usuario)
            );

            localStorage.setItem(
                "sintaxehub_usuario_logado",
                JSON.stringify(usuario)
            );

            localStorage.setItem(
                "usuarioLogado",
                JSON.stringify(usuario)
            );

            if (typeof aplicarPermissoes === "function") {
                aplicarPermissoes(usuario.perfil);
            }

            if (typeof mostrarSistema === "function") {
                mostrarSistema();
            } else {
                const loginScreen =
                    document.getElementById("loginScreen");

                const app =
                    document.getElementById("app");

                if (loginScreen) {
                    loginScreen.style.display = "none";
                }

                if (app) {
                    app.style.display = "block";
                }

                navigate?.("inicio");
                atualizarDadosIniciais?.();
            }

            mostrarToast?.(
                `✅ Bem-vindo(a), ${usuario.nome}`
            );

        } catch (erroGeral) {
            console.error("Erro autenticação:", erroGeral);
            mostrarErroLoginCompat("❌ Falha no login.");
        }
    };
}

/* ==========================================================================
   RESTAURAR SESSÃO — FALLBACK
   Só é registrado se auth.js ainda não criou verificarSessao
   ========================================================================== */

if (typeof window.verificarSessao !== "function") {

    window.verificarSessao = async function verificarSessao() {
        try {
            if (
                typeof supabaseClient === "undefined" ||
                !supabaseClient?.auth
            ) {
                mostrarTelaLogin?.();
                return;
            }

            const { data, error } =
                await supabaseClient.auth.getUser();

            if (error || !data?.user) {
                mostrarTelaLogin?.();
                return;
            }

            let perfil = null;

            if (typeof buscarPerfilUsuarioPorEmail === "function") {
                perfil =
                    await buscarPerfilUsuarioPorEmail(
                        data.user.email
                    );
            } else {
                const resposta =
                    await supabaseClient
                        .from("users")
                        .select("id, login, nome, email, perfil, ativo")
                        .eq("email", data.user.email)
                        .maybeSingle();

                perfil = resposta.data;
            }

            if (!perfil || !perfil.ativo) {
                await supabaseClient.auth.signOut();
                mostrarTelaLogin?.();
                return;
            }

            const usuario = {
                id: data.user.id,
                login: perfil.login || data.user.email,
                nome: perfil.nome || data.user.email,
                email: data.user.email,
                perfil: perfil.perfil || "assistencial",
                logadoEm: new Date().toISOString()
            };

            window.usuarioLogado = usuario;

            localStorage.setItem(
                "pep_sessao_ativa",
                JSON.stringify(usuario)
            );

            localStorage.setItem(
                "sintaxehub_usuario_logado",
                JSON.stringify(usuario)
            );

            localStorage.setItem(
                "usuarioLogado",
                JSON.stringify(usuario)
            );

            aplicarPermissoes?.(usuario.perfil);

            if (typeof mostrarSistema === "function") {
                mostrarSistema();
            } else {
                const loginScreen =
                    document.getElementById("loginScreen");

                const app =
                    document.getElementById("app");

                if (loginScreen) {
                    loginScreen.style.display = "none";
                }

                if (app) {
                    app.style.display = "block";
                }

                navigate?.("inicio");
                atualizarDadosIniciais?.();
            }

        } catch (erro) {
            console.error("Erro sessão:", erro);
            mostrarTelaLogin?.();
        }
    };
}

/* ==========================================================================
   LOGOUT — FALLBACK
   Só é registrado se auth.js ainda não criou efetuarLogout
   ========================================================================== */

if (typeof window.efetuarLogout !== "function") {

    window.efetuarLogout = async function efetuarLogout() {
        const confirmar =
            confirm("Deseja realmente sair do sistema?");

        if (!confirmar) {
            return;
        }

        try {
            if (
                typeof supabaseClient !== "undefined" &&
                supabaseClient?.auth
            ) {
                await supabaseClient.auth.signOut();
            }
        } catch (erro) {
            console.warn("Erro logout:", erro);
        }

        window.usuarioLogado = null;

        localStorage.removeItem("pep_sessao_ativa");
        localStorage.removeItem("sintaxehub_usuario_logado");
        localStorage.removeItem("usuarioLogado");

        mostrarToast?.("👋 Sessão encerrada.");

        if (typeof mostrarTelaLogin === "function") {
            mostrarTelaLogin();
        } else {
            location.reload();
        }
    };
}

/* ==========================================================================
   ENTER PARA LOGIN
   ========================================================================== */

document.addEventListener(
    "keydown",
    function (e) {
        const loginScreen =
            document.getElementById("loginScreen");

        if (
            e.key === "Enter" &&
            loginScreen &&
            loginScreen.style.display !== "none"
        ) {
            window.autenticarUsuario?.();
        }
    }
);
