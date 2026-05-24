/* ==========================================================
   AUTH SUPABASE — LOGIN REAL DO SINTAXE
   ========================================================== */

let usuarioLogado = null;

/* ==========================================================
   VERIFICAR SESSÃO AO ABRIR O SISTEMA
   ========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    await verificarSessaoSupabase();
});

async function verificarSessaoSupabase() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        console.error("Erro ao verificar sessão:", error);
        mostrarTelaLogin();
        return;
    }

    if (data?.session?.user) {
        usuarioLogado = data.session.user;
        window.usuarioLogado = usuarioLogado;

        mostrarSistema();
    } else {
        mostrarTelaLogin();
    }
}

/* ==========================================================
   LOGIN
   ========================================================== */

async function fazerLoginSintaxe() {
    const email = document.getElementById("loginEmail")?.value.trim();
    const senha = document.getElementById("loginSenha")?.value;

    if (!email || !senha) {
        alert("Informe e-mail e senha.");
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password: senha
    });

    if (error) {
        console.error("Erro no login:", error);
        alert("Login inválido: " + error.message);
        return;
    }

    usuarioLogado = data.user;
    window.usuarioLogado = data.user;

    mostrarToast?.("✅ Login realizado com Supabase.");
    mostrarSistema();
}

/* ==========================================================
   CRIAR USUÁRIO
   ========================================================== */

async function criarUsuarioSintaxe() {
    const nome = document.getElementById("novoUsuarioNome")?.value.trim();
    const email = document.getElementById("novoUsuarioEmail")?.value.trim();
    const senha = document.getElementById("novoUsuarioSenha")?.value;

    if (!nome || !email || !senha) {
        alert("Preencha nome, e-mail e senha.");
        return;
    }

    if (senha.length < 6) {
        alert("A senha precisa ter pelo menos 6 caracteres.");
        return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password: senha,
        options: {
            data: {
                nome: nome
            }
        }
    });

    if (error) {
        console.error("Erro ao criar usuário:", error);
        alert("Erro ao criar usuário: " + error.message);
        return;
    }

    await criarRegistroUsuarioPublico(data.user, nome);

    alert("Usuário criado. Agora faça login.");
}

/* ==========================================================
   CRIAR REGISTRO NA TABELA users
   ========================================================== */

async function criarRegistroUsuarioPublico(user, nome) {
    if (!user) return;

    const { error } = await supabaseClient
        .from("users")
        .upsert([{
            id: user.id,
            nome: nome,
            email: user.email,
            role: "usuario",
            ativo: true,
            criado_em: new Date().toISOString()
        }]);

    if (error) {
        console.error("Erro ao criar registro público do usuário:", error);
    }
}

/* ==========================================================
   LOGOUT
   ========================================================== */

async function sairSintaxe() {
    await supabaseClient.auth.signOut();

    usuarioLogado = null;
    window.usuarioLogado = null;

    mostrarTelaLogin();
}

/* ==========================================================
   PEGAR USUÁRIO ATUAL
   ========================================================== */

async function obterUsuarioAtualSupabase() {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data?.user) {
        return null;
    }

    return data.user;
}

/* ==========================================================
   CONTROLE DE TELA
   Ajuste os IDs conforme seu HTML
   ========================================================== */

function mostrarTelaLogin() {
    const telaLogin = document.getElementById("telaLogin");
    const app = document.getElementById("app");

    if (telaLogin) telaLogin.style.display = "flex";
    if (app) app.style.display = "none";
}

function mostrarSistema() {
    const telaLogin = document.getElementById("telaLogin");
    const app = document.getElementById("app");

    if (telaLogin) telaLogin.style.display = "none";
    if (app) app.style.display = "block";
}
