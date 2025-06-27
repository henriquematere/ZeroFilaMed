document.addEventListener('DOMContentLoaded', () => {
  // --- MAPEAMENTO DE ELEMENTOS DO DOM ---
  const filterButton = document.getElementById('filter-button');
  const filterOptions = document.getElementById('filter-options');
  const pessoasAguardandoEl = document.getElementById('pessoas-aguardando');
  const tempoConsultaEl = document.getElementById('tempo-consulta');
  const medicosPlantaoEl = document.getElementById('medicos-plantao');
  const cardTituloPeriodoEl = document.getElementById('card-titulo-periodo');
  const cardAtendimentosEl = document.getElementById(
    'card-atendimentos-periodo',
  );
  const cardEstimativaEl = document.getElementById('card-estimativa-periodo');
  const updateInfoEl = document.getElementById('update-info');
  const chartCanvas = document.getElementById('atendimentoChart');

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

  // --- LÓGICA DO GRÁFICO (CHART.JS) ---
  const ctx = chartCanvas.getContext('2d');
  const atendimentoChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Atendimentos',
          data: [],
          backgroundColor: '#1351b4',
          yAxisID: 'yAtendimentos',
          order: 2,
        },
        {
          label: 'Tempo Médio (min)',
          data: [],
          backgroundColor: 'transparent',
          borderColor: '#4978c5',
          type: 'line',
          yAxisID: 'yTempoMedio',
          order: 1,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: { grid: { display: false } },
        yAtendimentos: {
          position: 'left',
          beginAtZero: true,
          title: { display: true, text: 'Nº Atendimentos' },
        },
        yTempoMedio: {
          position: 'right',
          beginAtZero: true,
          title: { display: true, text: 'Tempo (min)' },
          grid: { drawOnChartArea: false },
        },
      },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          titleFont: { weight: 'bold' },
          bodyFont: { size: 14 },
        },
      },
    },
  });

  // --- LÓGICA DE DADOS (API E ATUALIZAÇÃO) ---

  async function updateDashboardData() {
    try {
      setLoadingState(true);

      const data = await fetchDataFromAPI(currentPeriodo);

      updateUI(data);
    } catch (error) {
      console.error('Falha ao buscar ou atualizar dados:', error);
      updateInfoEl.textContent = 'Erro ao carregar dados. Tente novamente.';
    } finally {
      setLoadingState(false);
    }
  }

  /**
   * ÁREA DE CONEXÃO COM O BANCO DE DADOS
   */
  async function fetchDataFromAPI(periodo) {
    console.log(`Buscando dados para o período: ${periodo}`);

    await new Promise((resolve) => setTimeout(resolve, 750));

    let labels, numPontos;
    let tituloCard = '';
    const meses = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ];

    switch (periodo) {
      case '24h':
        tituloCard = 'ÚLTIMAS 24 HORAS';
        numPontos = 8;
        labels = Array.from({ length: numPontos }, (_, i) => `${String(i * 3).padStart(2, '0')}:00`);
        break;
      case 'semana':
        tituloCard = 'ÚLTIMA SEMANA';
        numPontos = 7;
        labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        break;
      case 'mes':
        tituloCard = 'ÚLTIMO MÊS';
        numPontos = 4;
        labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
        break;
      case '3m':
        tituloCard = 'ÚLTIMOS 3 MESES';
        numPontos = 3;
        labels = Array.from({ length: numPontos }, (_, i) => meses[(new Date().getMonth() - (numPontos - 1 - i) + 12) % 12]);
        break;
      case '6m':
        tituloCard = 'ÚLTIMOS 6 MESES';
        numPontos = 6;
        labels = Array.from({ length: numPontos }, (_, i) => meses[(new Date().getMonth() - (numPontos - 1 - i) + 12) % 12]);
        break;
      case 'ano':
        tituloCard = 'ÚLTIMO ANO';
        numPontos = 12;
        labels = meses;
        break;
      case '12h':
      default:
        tituloCard = 'ÚLTIMAS 12 HORAS';
        numPontos = 6;
        labels = Array.from({ length: numPontos }, (_, i) => `${String(new Date().getHours() - (numPontos - i - 1) * 2).padStart(2, '0')}:00`);
        break;
    }

    const atendimentosGrafico = Array.from({ length: numPontos }, () => Math.floor(Math.random() * 50) + 10);
    const tempoMedioGrafico = Array.from({ length: numPontos }, () => Math.floor(Math.random() * 40) + 20);
    const totalAtendimentos = atendimentosGrafico.reduce((a, b) => a + b, 0);

    const simulatedData = {
      pessoasAguardando: Math.floor(Math.random() * 30),
      informacoesGerais: {
        tempoConsulta: Math.floor(Math.random() * 20) + 15, // entre 15 e 35 min
        medicosPlantao: Math.floor(Math.random() * 4) + 2, // entre 2 e 5 medicos
      },
      cardPeriodo: {
        titulo: tituloCard,
        atendimentos: totalAtendimentos,
        estimativaMedia: Math.floor(tempoMedioGrafico.reduce((a, b) => a + b, 0) / numPontos),
      },
      grafico: {
        labels: labels,
        atendimentos: atendimentosGrafico,
        tempoMedio: tempoMedioGrafico,
      },
    };
    return simulatedData;
  }

  function updateUI(data) {
    pessoasAguardandoEl.textContent = data.pessoasAguardando;
    tempoConsultaEl.textContent = `${data.informacoesGerais.tempoConsulta} min`;
    medicosPlantaoEl.textContent = data.informacoesGerais.medicosPlantao;
    cardTituloPeriodoEl.textContent = data.cardPeriodo.titulo;
    cardAtendimentosEl.textContent = data.cardPeriodo.atendimentos;
    cardEstimativaEl.textContent = `${data.cardPeriodo.estimativaMedia} min`;
    atendimentoChart.data.labels = data.grafico.labels;
    atendimentoChart.data.datasets[0].data = data.grafico.atendimentos;
    atendimentoChart.data.datasets[1].data = data.grafico.tempoMedio;
    atendimentoChart.update();
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

  // --- INICIALIZAÇÃO ---
  updateDashboardData();

  if (updateInterval) clearInterval(updateInterval);
  updateInterval = setInterval(updateDashboardData, 60000);
});