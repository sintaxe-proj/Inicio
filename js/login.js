/* ============================================================
   login.js 
   Controle de login, hash com SHA-256 e sessão
=========================================================== */

/* ----------- Função de hash SHA-256 ----------- */
async function sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

/* ----------- Criar usuário admin padrão ----------- */
async function initLoginSystem() {
    let usuarios = JSON.parse(localStorage.getItem("usuarios"));

    if (!usuarios) {
        const admin = {
            user: "admin",
            pass: await sha256("1234") // senha padrão
        };
        usuarios = [admin];
        localStorage.setItem("usuarios", JSON.stringify(usuarios));
    }
}

/* Executa criação do admin ao iniciar */
initLoginSystem();

/* ----------- Função de Login ----------- */
async function login() {
    const u = loginUser.value.trim();
    const p = loginPass.value.trim();

    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    const hash = await sha256(p);

    const existe = usuarios.find(x => x.user === u && x.pass === hash);

    if (!existe) {
        loginErro.style.display = "block";
        return;
    }

    // Login válido → salvar sessão
    localStorage.setItem("logado", "sim");

    // Exibir sistema
    loginScreen.style.display = "none";
    app.style.display = "block";

    // Chama inicialização do app.js
    if (typeof initApp === "function") initApp();
}

/* ----------- Logout ----------- */
function logout() {
    localStorage.removeItem("logado");
    location.reload();
}

/* ----------- Manter login persistente ----------- */
window.addEventListener("load", () => {
    if (localStorage.getItem("logado") === "sim") {
        loginScreen.style.display = "none";
        app.style.display = "block";

        if (typeof initApp === "function") initApp();
    }
});
