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
  const projecaoPicoLabelEl = document.getElementById('projecao-pico-label');
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
      updateInfoEl.textContent = 'Erro ao conectar com o servidor.';
      return getEmptyDataStructure();
    }
  }

  function updateUI(data) {
    // Atualiza os cards de informação
    pessoasAguardandoEl.textContent = data.informacoesGerais.pessoasAguardando;
    tempoConsultaEl.textContent = `${data.informacoesGerais.duracaoMediaConsulta} min`;
    medicosPlantaoEl.textContent = data.informacoesGerais.medicosPlantao;
    cardTituloPeriodoEl.textContent = data.cardPeriodo.titulo;
    cardAtendimentosEl.textContent = data.cardPeriodo.totalAtendimentos;
    cardEstimativaEl.textContent = `${data.cardPeriodo.tempoMedioEspera} min`;
    projecaoPicoEl.textContent = data.projecao.horarioPico || "--";
    projecaoFluxoEl.textContent = data.projecao.fluxoEsperado;

    // Atualiza o label do pico de acordo com o filtro
    let picoLabel = "";
    if (currentPeriodo === "12h" || currentPeriodo === "24h") {
      picoLabel = "Horário de Pico Estimado";
    } else if (currentPeriodo === "semana") {
      picoLabel = "Dia de Pico Estimado";
    } else {
      picoLabel = "Mês de Pico Estimado";
    }
    projecaoPicoLabelEl.textContent = picoLabel;

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
