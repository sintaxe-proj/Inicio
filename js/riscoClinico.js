// ======================================================
// SINTAXEHUB - RISCOCLINICO.JS
// ESCORE GLOBAL + PLANO TERAPÊUTICO SINGULAR
// ======================================================

function calcularRiscoGlobalPaciente(paciente) {
    let pontos = 0;
    let fatores = [];

    if (paciente.hasSN === 'Sim') {
        pontos += 2;
        fatores.push('Hipertensão arterial');
    }

    if (paciente.dmSN === 'Sim') {
        pontos += 3;
        fatores.push('Diabetes mellitus');
    }

    if (paciente.tbSN === true || paciente.tbSN === 'Sim') {
        pontos += 4;
        fatores.push('Tuberculose');
    }

    if (paciente.hansenSN === true || paciente.hansenSN === 'Sim') {
        pontos += 3;
        fatores.push('Hanseníase');
    }

    if (paciente.gestanteSN === 'Sim') {
        pontos += 3;
        fatores.push('Gestação ativa');
    }

    if (paciente.idadePaciente) {
        const idade = parseInt(paciente.idadePaciente);
        if (idade >= 60) {
            pontos += 2;
            fatores.push('Idoso');
        }
        if (idade >= 75) {
            pontos += 2;
            fatores.push('Idoso longevo');
        }
    }

    if (paciente.hasClassif && paciente.hasClassif.toUpperCase().includes('CRÍT')) {
        pontos += 4;
        fatores.push('Pressão arterial crítica');
    }

    if (paciente.dmClassif && paciente.dmClassif.toUpperCase().includes('DESCONTROL')) {
        pontos += 4;
        fatores.push('Diabetes descompensado');
    }

    let classificacao = 'Baixo risco';
    let cor = '#25d366';

    if (pontos >= 5 && pontos <= 8) {
        classificacao = 'Risco moderado';
        cor = '#f59e0b';
    }

    if (pontos >= 9 && pontos <= 13) {
        classificacao = 'Alto risco';
        cor = '#ef4444';
    }

    if (pontos >= 14) {
        classificacao = 'Risco muito alto / prioritário';
        cor = '#a21caf';
    }

    return {
        pontos,
        classificacao,
        cor,
        fatores
    };
}

function gerarPlanoTerapeuticoSingular(paciente) {
    const risco = calcularRiscoGlobalPaciente(paciente);

    const peso = parseFloat(paciente.pesoPaciente || paciente.peso || 0);
    let agua = 'Informar peso para cálculo individualizado.';

    if (peso > 0) {
        const minimo = Math.round(peso * 30);
        const maximo = Math.round(peso * 35);
        agua = `${minimo} a ${maximo} ml/dia, salvo restrição médica.`;
    }

    let plano = `
PLANO TERAPÊUTICO SINGULAR - SINTAXEHUB

Paciente: ${paciente.nomePaciente || paciente.nome || '-'}
CPF: ${paciente.cpfPaciente || paciente.cpf || '-'}
Classificação de risco: ${risco.classificacao}
Escore global: ${risco.pontos} pontos

Fatores identificados:
${risco.fatores.length ? risco.fatores.map(f => '- ' + f).join('\n') : '- Sem fatores relevantes registrados'}

1. ORIENTAÇÕES NUTRICIONAIS
- Priorizar alimentação in natura ou minimamente processada.
- Reduzir ultraprocessados, excesso de sal, açúcar e gorduras saturadas.
- Estimular consumo de verduras, legumes, frutas, feijões e fibras.
- Orientar fracionamento alimentar conforme rotina e condição clínica.
${paciente.dmSN === 'Sim' ? '- Para diabetes: orientar redução de açúcares simples e acompanhamento glicêmico.' : ''}
${paciente.hasSN === 'Sim' ? '- Para hipertensão: orientar redução de sódio e controle do peso corporal.' : ''}

2. HIDRATAÇÃO
- Ingesta hídrica sugerida: ${agua}
- Ajustar em caso de insuficiência cardíaca, renal, edema ou orientação médica específica.

3. SAÚDE OCULAR / OFTALMOLOGIA
${paciente.dmSN === 'Sim' ? '- Encaminhar ou orientar avaliação oftalmológica periódica por risco de retinopatia diabética.' : '- Avaliar necessidade de oftalmologia conforme queixas visuais, idade e comorbidades.'}

4. HIGIENE DO SONO
- Manter horário regular para dormir e acordar.
- Evitar telas próximo ao horário de dormir.
- Evitar cafeína no período da noite.
- Estimular ambiente escuro, silencioso e confortável.
- Investigar roncos, sonolência diurna ou insônia persistente.

5. MINDFULNESS / AUTOCUIDADO
- Estimular respiração consciente por 3 a 5 minutos ao dia.
- Orientar pausas breves durante o dia para redução de estresse.
- Incentivar atividades prazerosas, vínculo comunitário e suporte familiar.
- Considerar grupo de saúde mental, práticas integrativas ou apoio multiprofissional.

6. SEGUIMENTO NA APS
- Risco atual: ${risco.classificacao}.
${risco.pontos >= 9 ? '- Priorizar retorno breve e busca ativa pela equipe.' : '- Manter acompanhamento conforme agenda da equipe.'}
${paciente.hasSN === 'Sim' ? '- Monitorar PA e adesão ao tratamento anti-hipertensivo.' : ''}
${paciente.dmSN === 'Sim' ? '- Monitorar glicemia, HbA1c quando disponível, pés e adesão terapêutica.' : ''}
${paciente.gestanteSN === 'Sim' ? '- Garantir seguimento de pré-natal conforme calendário da APS.' : ''}

Observação: plano gerado automaticamente e deve ser revisado pela equipe responsável.
    `.trim();

    return plano;
}

function exibirPainelRiscoClinico(paciente) {
    const container = document.getElementById('painelRiscoClinico');
    if (!container) return;

    const risco = calcularRiscoGlobalPaciente(paciente);
    const plano = gerarPlanoTerapeuticoSingular(paciente);

    container.innerHTML = `
        <div style="background:#111c2e; border:1px solid var(--border); border-left:5px solid ${risco.cor}; padding:15px; border-radius:8px; margin-bottom:15px;">
            <h4 style="margin:0 0 8px 0; color:${risco.cor};">
                Escore Clínico Global: ${risco.pontos} pontos
            </h4>

            <p style="margin:0 0 8px 0;">
                <strong>Classificação:</strong> ${risco.classificacao}
            </p>

            <p style="margin:0; color:var(--text-muted); font-size:13px;">
                ${risco.fatores.length ? risco.fatores.join(', ') : 'Sem fatores relevantes registrados.'}
            </p>
        </div>

        <label>Plano Terapêutico Singular gerado automaticamente</label>
        <textarea id="planoTerapeuticoSingular" rows="16">${plano}</textarea>

        <div style="display:flex; gap:10px; margin-top:10px;">
            <button onclick="copiarPlanoTerapeutico()" style="background:var(--primary-neon); color:white; border:none; padding:8px 14px; border-radius:6px; cursor:pointer;">
                Copiar PTS
            </button>

            <button onclick="registrarPlanoNoSOAP()" style="background:var(--success-dark); color:white; border:none; padding:8px 14px; border-radius:6px; cursor:pointer;">
                Inserir no Plano SOAP
            </button>
        </div>
    `;
}

function copiarPlanoTerapeutico() {
    const campo = document.getElementById('planoTerapeuticoSingular');
    if (!campo) return;

    campo.select();
    document.execCommand('copy');

    if (typeof mostrarToast === 'function') {
        mostrarToast('Plano terapêutico copiado.');
    }
}

function registrarPlanoNoSOAP() {
    const campoPTS = document.getElementById('planoTerapeuticoSingular');
    const campoPlano = document.getElementById('soapPlanoConduta');

    if (!campoPTS || !campoPlano) return;

    campoPlano.value = campoPlano.value
        ? campoPlano.value + '\n\n' + campoPTS.value
        : campoPTS.value;

    if (typeof mostrarToast === 'function') {
        mostrarToast('Plano inserido no SOAP.');
    }
}

function gerarRiscoDoFormularioAtual() {
    const paciente = {
        nomePaciente: document.getElementById('nomePaciente')?.value || '',
        cpfPaciente: document.getElementById('cpfPaciente')?.value || '',
        idadePaciente: document.getElementById('idadePaciente')?.value || '',
        pesoPaciente: document.getElementById('pesoPaciente')?.value || '',
        hasSN: document.getElementById('hasSN')?.value || 'Não',
        dmSN: document.getElementById('dmSN')?.value || 'Não',
        gestanteSN: document.getElementById('gestanteSN')?.value || 'Não',
        tbSN: document.getElementById('tbSN')?.checked || false,
        hansenSN: document.getElementById('hansenSN')?.checked || false,
        hasClassif: document.getElementById('hasClassif')?.value || '',
        dmClassif: document.getElementById('dmClassif')?.value || ''
    };

    exibirPainelRiscoClinico(paciente);
}

function calcularIMC() {
    const peso = parseFloat(document.getElementById('objpeso')?.value || 0);
    const alturaCm = parseFloat(document.getElementById('objaltura')?.value || 0);
    const campoIMC = document.getElementById('objIMC');

    if (!campoIMC) return;

    if (!peso || !alturaCm) {
        campoIMC.value = '';
        return;
    }

    const alturaM = alturaCm / 100;
    const imc = peso / (alturaM * alturaM);

    campoIMC.value = imc.toFixed(1);
}

function gerarPDFPlanoCuidado() {
    const campoPTS = document.getElementById("planoTerapeuticoSingular");

    if (!campoPTS || !campoPTS.value.trim()) {
        mostrarToast?.("⚠️ Gere o plano antes de criar o PDF.");
        return;
    }

    const nome = document.getElementById("nomePaciente")?.value || "Paciente";
    const cpf = document.getElementById("cpfPaciente")?.value || "-";
    const cns = document.getElementById("cnsPaciente")?.value || "-";

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const margem = 15;
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Plano de Cuidado - SintaxeHub", margem, y);

    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Paciente: ${nome}`, margem, y);
    y += 6;
    doc.text(`CPF: ${cpf} | CNS: ${cns}`, margem, y);
    y += 6;
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, margem, y);

    y += 10;

    const linhas = doc.splitTextToSize(campoPTS.value, 180);

    linhas.forEach(linha => {
        if (y > 280) {
            doc.addPage();
            y = 20;
        }

        doc.text(linha, margem, y);
        y += 6;
    });

    doc.save(`plano_cuidado_${cpf || cns || "paciente"}.pdf`);

    mostrarToast?.("📄 PDF do plano gerado.");
}

window.gerarPDFPlanoCuidado = gerarPDFPlanoCuidado;

window.calcularIMC = calcularIMC;

window.calcularRiscoGlobalPaciente = calcularRiscoGlobalPaciente;
window.gerarPlanoTerapeuticoSingular = gerarPlanoTerapeuticoSingular;
window.exibirPainelRiscoClinico = exibirPainelRiscoClinico;
window.gerarRiscoDoFormularioAtual = gerarRiscoDoFormularioAtual;
window.copiarPlanoTerapeutico = copiarPlanoTerapeutico;
window.registrarPlanoNoSOAP = registrarPlanoNoSOAP;

