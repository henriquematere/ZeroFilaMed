document.addEventListener('DOMContentLoaded', () => {
  // --- MAPEAMENTO DE ELEMENTOS DO DOM ---
  const filterButton = document.getElementById('filter-button');
  const filterOptions = document.getElementById('filter-options');
  const pessoasAguardandoEl = document.getElementById('pessoas-aguardando');
  const tempoConsultaEl = document.getElementById('tempo-consulta');
  const medicosPlantaoEl = document.getElementById('medicos-plantao');
  const cardTituloPeriodoEl = document.getElementById('card-titulo-periodo');
  const cardAtendimentosEl = document.getElementById('card-atendimentos-periodo');
  const cardEstimativaEl = document.getElementById('card-estimativa-periodo');
  const projecaoPicoEl = document.getElementById('projecao-pico');
  const projecaoFluxoEl = document.getElementById('projecao-fluxo');
  const updateInfoEl = document.getElementById('update-info');
  const atendimentosChartCanvas = document.getElementById('atendimentosChart');
  const tempoMedioChartCanvas = document.getElementById('tempoMedioChart');

  let currentPeriodo = '12h';
  let updateInterval;

  // --- LÓGICA DO MENU DE FILTRO ---
  filterButton.addEventListener('click', (event) => {
    event.stopPropagation();
    filterOptions.classList.toggle('show');
  });

  window.addEventListener('click', () => {
    if (filterOptions.classList.contains('show')) {
      filterOptions.classList.remove('show');
    }
  });

  filterOptions.addEventListener('click', (event) => {
    if (event.target.tagName === 'LI') {
      currentPeriodo = event.target.dataset.filter;
      updateDashboardData();
    }
  });

  // --- LÓGICA DOS GRÁFICOS (CHART.JS) ---
  const createBarChart = (canvas) => {
    return new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: '',
          data: [],
          backgroundColor: '#1351b4',
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  };
  
  const atendimentosChart = createBarChart(atendimentosChartCanvas);
  const tempoMedioChart = createBarChart(tempoMedioChartCanvas);

  // --- LÓGICA DE DADOS (API E ATUALIZAÇÃO) ---
  async function updateDashboardData() {
    try {
      setLoadingState(true);
      const data = await fetchDataFromAPI(currentPeriodo);
      updateUI(data);
    } catch (error) {
      console.error('Falha ao buscar ou atualizar dados:', error);
      updateInfoEl.textContent = 'Erro ao conectar com o servidor.';
      updateUI(getEmptyDataStructure());
    } finally {
      setLoadingState(false);
    }
  }

  async function fetchDataFromAPI(periodo) {
    const apiUrl = `/api/dashboard-data?periodo=${periodo}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Dados recebidos da API:', data);
      return data;
    } catch (error) {
      console.error("Não foi possível buscar dados da API:", error);
      return getSimulatedData(periodo);
    }
  }

// Função de simulação para desenvolvimento e fallback
  function getSimulatedData(periodo) {
    let labels, numPontos;
    let tituloCard = '';
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    let atendimentosBase = 50;
    let tempoBase = 40;
    switch (periodo) {
        case '24h': tituloCard = 'ÚLTIMAS 24 HORAS'; numPontos = 8; labels = Array.from({ length: numPontos }, (_, i) => `${String(i * 3).padStart(2, '0')}:00`); break;
        case 'semana': tituloCard = 'ÚLTIMA SEMANA'; numPontos = 7; labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']; atendimentosBase = 400; break;
        case 'mes': tituloCard = 'ÚLTIMO MÊS'; numPontos = 4; labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4']; atendimentosBase = 2000; tempoBase = 60; break;
        case '3m': tituloCard = 'ÚLTIMOS 3 MESES'; numPontos = 3; labels = Array.from({ length: numPontos }, (_, i) => meses[(new Date().getMonth() - (numPontos - 1 - i) + 12) % 12]); atendimentosBase = 8000; tempoBase = 80; break;
        case '6m': tituloCard = 'ÚLTIMOS 6 MESES'; numPontos = 6; labels = Array.from({ length: numPontos }, (_, i) => meses[(new Date().getMonth() - (numPontos - 1 - i) + 12) % 12]); atendimentosBase = 8500; tempoBase = 90; break;
        case 'ano': tituloCard = 'ÚLTIMO ANO'; numPontos = 12; labels = meses; atendimentosBase = 9000; tempoBase = 145; break;
        case '12h': default: tituloCard = 'ÚLTIMAS 12 HORAS'; numPontos = 6; labels = Array.from({ length: numPontos }, (_, i) => `${String(new Date().getHours() - (numPontos - i - 1) * 2).padStart(2, '0')}:00`); break;
    }
    const atendimentosGrafico = Array.from({ length: numPontos }, () => Math.floor(Math.random() * (atendimentosBase * 0.5)) + (atendimentosBase * 0.8));
    const tempoMedioGrafico = Array.from({ length: numPontos }, () => Math.floor(Math.random() * 20) + (tempoBase - 10));
    const totalAtendimentos = atendimentosGrafico.reduce((a, b) => a + b, 0);

    const fluxos = ['Baixo', 'Moderado', 'Alto'];
    const picos = ['18:00', '19:00', '20:00', '21:00'];

    return {
      pessoasAguardando: Math.floor(Math.random() * 30),
      informacoesGerais: {
        duracaoMediaConsulta: Math.floor(Math.random() * 20) + 15,
        medicosPlantao: Math.floor(Math.random() * 4) + 2,
      },
      cardPeriodo: {
        titulo: tituloCard,
        totalAtendimentos: totalAtendimentos.toLocaleString('pt-BR'),
        tempoMedioEspera: Math.floor(tempoMedioGrafico.reduce((a, b) => a + b, 0) / numPontos),
      },
      projecao: {
        horarioPico: picos[Math.floor(Math.random() * picos.length)],
        fluxoEsperado: fluxos[Math.floor(Math.random() * fluxos.length)],
      },
      grafico: {
        labels: labels,
        atendimentos: atendimentosGrafico,
        tempoMedio: tempoMedioGrafico,
      },
    };
  }
  
  function updateUI(data) {
    // Atualiza os cards de informação
    pessoasAguardandoEl.textContent = data.informacoesGerais.pessoasAguardando;
    tempoConsultaEl.textContent = `${data.informacoesGerais.duracaoMediaConsulta} min`;
    medicosPlantaoEl.textContent = data.informacoesGerais.medicosPlantao;
    cardTituloPeriodoEl.textContent = data.cardPeriodo.titulo;
    cardAtendimentosEl.textContent = data.cardPeriodo.totalAtendimentos;
    cardEstimativaEl.textContent = `${data.cardPeriodo.tempoMedioEspera} min`;
    projecaoPicoEl.textContent = data.projecao.horarioPico;
    projecaoFluxoEl.textContent = data.projecao.fluxoEsperado;

    // Atualiza os dados dos gráficos
    const labels = data.grafico.labels;
    atendimentosChart.data.labels = labels;
    atendimentosChart.data.datasets[0].data = data.grafico.atendimentos;
    atendimentosChart.data.datasets[0].label = 'Nº de Atendimentos';
    atendimentosChart.update();
    tempoMedioChart.data.labels = labels;
    tempoMedioChart.data.datasets[0].data = data.grafico.tempoMedio;
    tempoMedioChart.data.datasets[0].label = 'Minutos';
    tempoMedioChart.update();

    const now = new Date();
    updateInfoEl.textContent = `Dados atualizados às ${now.toLocaleTimeString('pt-BR')}.`;
  }

  function setLoadingState(isLoading) {
    if (isLoading) {
      updateInfoEl.textContent = 'Buscando dados atualizados...';
      document.querySelector('.projection-panel').style.opacity = '0.7';
    } else {
      const now = new Date();
      updateInfoEl.textContent = `Dados atualizados às ${now.toLocaleTimeString('pt-BR')}.`;
      document.querySelector('.projection-panel').style.opacity = '1';
    }
  }

  function getEmptyDataStructure() {
      return {
          informacoesGerais: { pessoasAguardando: '--', duracaoMediaConsulta: '--', medicosPlantao: '--' },
          cardPeriodo: { titulo: "Erro de conexão", totalAtendimentos: '--', tempoMedioEspera: '--' },
          projecao: { horarioPico: '--', fluxoEsperado: '--' },
          grafico: { labels: [], atendimentos: [], tempoMedio: [] }
      };
  }

  // --- INICIALIZAÇÃO ---
  updateDashboardData();
  if (updateInterval) clearInterval(updateInterval);
  updateInterval = setInterval(updateDashboardData, 60000);
});