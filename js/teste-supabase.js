async function testarLoginSupabase() {
    const email = prompt("Digite o email:");
    const senha = prompt("Digite a senha:");

    const resultado = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: senha
    });

    if (resultado.error) {
        alert("Erro no login: " + resultado.error.message);
        return;
    }

    alert("Login Supabase realizado com sucesso!");
}

async function testarSalvarPacienteSupabase() {
    const usuarioAtual = await supabaseClient.auth.getUser();

    if (usuarioAtual.error || !usuarioAtual.data.user) {
        alert("Faca login primeiro.");
        return;
    }

    const resultado = await supabaseClient
        .from("pacientes")
        .insert([{
            usuario_id: usuarioAtual.data.user.id,
            nome: "Paciente Teste",
            cpf: "00000000000",
            cns: "000000000000000",
            telefone: "(00)00000-0000",
            endereco: "Rua Teste"
        }])
        .select();

    if (resultado.error) {
        alert("Erro ao salvar paciente: " + resultado.error.message);
        return;
    }

    alert("Paciente salvo online com sucesso!");
}
