async function testarLoginSupabase() {
  const email = prompt("Digite o e-mail:");
  const senha = prompt("Digite a senha:");

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: josimarkapps10@gmail.com,
    password: F@milia1604.
  });

  if (error) {
    console.error(error);
    alert("Erro no login: " + error.message);
    return;
  }

  console.log("Usuário logado:", data.user);
  alert("Login realizado com sucesso!");
}

async function testarSalvarPacienteSupabase() {
  const { data: userData, error: userError } = await supabaseClient.auth.getUser();

  if (userError || !userData.user) {
    alert("Você precisa fazer login primeiro.");
    return;
  }

  const pacienteTeste = {
    usuario_id: userData.user.id,
    nome: "Paciente Teste",
    cpf: "00000000000",
    cns: "000000000000000",
    telefone: "(00) 00000-0000",
    endereco: "Endereço teste"
  };

  const { data, error } = await supabaseClient
    .from("pacientes")
    .insert([pacienteTeste])
    .select();

  if (error) {
    console.error(error);
    alert("Erro ao salvar paciente: " + error.message);
    return;
  }

  console.log("Paciente salvo:", data);
  alert("Paciente teste salvo com sucesso!");
}
