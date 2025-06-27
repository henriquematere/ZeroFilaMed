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
      updateInfoEl.textContent = 'Erro ao carregar dados. Tente novamente.';
    } finally {
      setLoadingState(false);
    }
  }

  async function fetchDataFromAPI(periodo) {
    await new Promise((resolve) => setTimeout(resolve, 750));

    let labels, numPontos;
    const meses = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ];

    let atendimentosBase = 50;
    let tempoBase = 40;

    switch (periodo) {
      case '24h':
        labels = Array.from({ length: 8 }, (_, i) => `${String(i * 3).padStart(2, '0')}:00`);
        break;
      case 'semana':
        labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        atendimentosBase = 400;
        break;
      case 'mes':
        labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
        atendimentosBase = 2000;
        tempoBase = 60;
        break;
      case '3m':
        labels = Array.from({ length: 3 }, (_, i) => meses[(new Date().getMonth() - (2 - i) + 12) % 12]);
        atendimentosBase = 8000;
        tempoBase = 80;
        break;
      case '6m':
        labels = Array.from({ length: 6 }, (_, i) => meses[(new Date().getMonth() - (5 - i) + 12) % 12]);
        atendimentosBase = 8500;
        tempoBase = 90;
        break;
      case 'ano':
        labels = meses;
        atendimentosBase = 9000;
        tempoBase = 145;
        break;
      case '12h':
      default:
        labels = Array.from({ length: 6 }, (_, i) => `${String(new Date().getHours() - (5 - i) * 2).padStart(2, '0')}:00`);
        break;
    }
    numPontos = labels.length;

    const atendimentosGrafico = Array.from({ length: numPontos }, () => Math.floor(Math.random() * (atendimentosBase * 0.5)) + (atendimentosBase * 0.8));
    const tempoMedioGrafico = Array.from({ length: numPontos }, () => Math.floor(Math.random() * 20) + (tempoBase - 10));
    
    const totalAtendimentos = atendimentosGrafico.reduce((a, b) => a + b, 0);

    const simulatedData = {
      pessoasAguardando: Math.floor(Math.random() * 30),
      informacoesGerais: {
        tempoConsulta: Math.floor(Math.random() * 20) + 15,
        medicosPlantao: Math.floor(Math.random() * 4) + 2,
      },
      cardPeriodo: {
        titulo: `ÚLTIMAS ${periodo === 'semana' || periodo === 'mes' ? '' : ' '}${periodo.replace('h', ' HORAS').replace('m', ' MESES').toUpperCase()}`,
        atendimentos: totalAtendimentos.toLocaleString('pt-BR'),
        estimativaMedia: Math.floor(tempoMedioGrafico.reduce((a, b) => a + b, 0) / numPontos),
      },
      grafico: {
        labels: labels,
        atendimentos: atendimentosGrafico,
        tempoMedio: tempoMedioGrafico,
      },
    };
    if (periodo === 'semana') simulatedData.cardPeriodo.titulo = 'ÚLTIMA SEMANA';
    if (periodo === 'mes') simulatedData.cardPeriodo.titulo = 'ÚLTIMO MÊS';
    if (periodo === 'ano') simulatedData.cardPeriodo.titulo = 'ÚLTIMO ANO';

    return simulatedData;
  }

  function updateUI(data) {
    pessoasAguardandoEl.textContent = data.pessoasAguardando;
    tempoConsultaEl.textContent = `${data.informacoesGerais.tempoConsulta} min`;
    medicosPlantaoEl.textContent = data.informacoesGerais.medicosPlantao;
    cardTituloPeriodoEl.textContent = data.cardPeriodo.titulo;
    cardAtendimentosEl.textContent = data.cardPeriodo.atendimentos;
    cardEstimativaEl.textContent = `${data.cardPeriodo.estimativaMedia} min`;

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

  updateDashboardData();
  if (updateInterval) clearInterval(updateInterval);
  updateInterval = setInterval(updateDashboardData, 60000);
});