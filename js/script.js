document.addEventListener('DOMContentLoaded', () => {
  // --- MAPEAMENTO DE ELEMENTOS DO DOM ---
  const filterButton = document.getElementById('filter-button');
  const filterOptions = document.getElementById('filter-options');
  const pessoasAguardandoEl = document.getElementById('pessoas-aguardando');
  const cardTituloPeriodoEl = document.getElementById('card-titulo-periodo');
  const cardAtendimentosEl = document.getElementById(
    'card-atendimentos-periodo',
  );
  const cardEstimativaEl = document.getElementById('card-estimativa-periodo');
  const updateInfoEl = document.getElementById('update-info');
  const chartCanvas = document.getElementById('atendimentoChart');

  // Variável para guardar o estado atual do filtro e do timer
  let currentPeriodo = '12h';
  let updateInterval;

  // --- LÓGICA DO MENU DE FILTRO ---
  filterButton.addEventListener('click', (event) => {
    event.stopPropagation(); // Impede que o clique feche o menu imediatamente
    filterOptions.classList.toggle('show');
  });

  // Fecha o dropdown se o usuário clicar fora dele
  window.addEventListener('click', () => {
    if (filterOptions.classList.contains('show')) {
      filterOptions.classList.remove('show');
    }
  });

  // Adiciona evento de clique para cada opção do filtro
  filterOptions.addEventListener('click', (event) => {
    if (event.target.tagName === 'LI') {
      currentPeriodo = event.target.dataset.filter;
      updateDashboardData(); // Busca e atualiza os dados com o novo filtro
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

  /**
   * Ponto Central para buscar os dados e atualizar a UI.
   */
  async function updateDashboardData() {
    try {
      setLoadingState(true); // Ativa o estado de carregamento

      // A chamada à função isolada que busca os dados.
      const data = await fetchDataFromAPI(currentPeriodo);

      // Atualiza todos os elementos da página com os novos dados
      updateUI(data);
    } catch (error) {
      console.error('Falha ao buscar ou atualizar dados:', error);
      updateInfoEl.textContent = 'Erro ao carregar dados. Tente novamente.';
    } finally {
      setLoadingState(false); // Desativa o estado de carregamento
    }
  }

  /**
   * ÁREA DE CONEXÃO COM O BANCO DE DADOS
   */
  async function fetchDataFromAPI(periodo) {
    console.log(`Buscando dados para o período: ${periodo}`);

    // ----- INÍCIO DO CÓDIGO DE SIMULAÇÃO (SUBSTITUIR ESTE BLOCO) -----

    // Simula um atraso de rede
    await new Promise((resolve) => setTimeout(resolve, 750));

    let labels, numPontos;
    let tituloCard = '';

    switch (periodo) {
      case '24h':
        tituloCard = 'ÚLTIMAS 24 HORAS';
        numPontos = 8;
        labels = Array.from(
          { length: numPontos },
          (_, i) => `${String(i * 3).padStart(2, '0')}:00`,
        );
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
      case '12h':
      default:
        tituloCard = 'ÚLTIMAS 12 HORAS';
        numPontos = 6;
        labels = Array.from(
          { length: numPontos },
          (_, i) =>
            `${String(new Date().getHours() - (numPontos - i - 1) * 2).padStart(
              2,
              '0',
            )}:00`,
        );
        break;
    }

    const atendimentosGrafico = Array.from(
      { length: numPontos },
      () => Math.floor(Math.random() * 50) + 10,
    );
    const tempoMedioGrafico = Array.from(
      { length: numPontos },
      () => Math.floor(Math.random() * 40) + 20,
    );
    const totalAtendimentos = atendimentosGrafico.reduce((a, b) => a + b, 0);

    const simulatedData = {
      pessoasAguardando: Math.floor(Math.random() * 30),
      cardPeriodo: {
        titulo: tituloCard,
        atendimentos: totalAtendimentos,
        estimativaMedia: Math.floor(
          tempoMedioGrafico.reduce((a, b) => a + b, 0) / numPontos,
        ),
      },
      grafico: {
        labels: labels,
        atendimentos: atendimentosGrafico,
        tempoMedio: tempoMedioGrafico,
      },
    };
    return simulatedData;
    // ----- FIM DO CÓDIGO DE SIMULAÇÃO -----

    /*
     * Exemplo de como seria com uma API real:
     * * try {
     * const response = await fetch(`https://sua-api.com/dados?periodo=${periodo}`);
     * if (!response.ok) {
     * throw new Error(`Erro na API: ${response.statusText}`);
     * }
     * const data = await response.json();
     * return data;
     * } catch (error) {
     * console.error("Não foi possível conectar à API:", error);
     * throw error; // Propaga o erro para ser tratado pela função que chamou
     * }
     */
  }

  /**
   * Atualiza todos os elementos visuais com os dados recebidos.
   */
  function updateUI(data) {
    pessoasAguardandoEl.textContent = data.pessoasAguardando;
    cardTituloPeriodoEl.textContent = data.cardPeriodo.titulo;
    cardAtendimentosEl.textContent = data.cardPeriodo.atendimentos;
    cardEstimativaEl.textContent = `${data.cardPeriodo.estimativaMedia} min`;
    atendimentoChart.data.labels = data.grafico.labels;
    atendimentoChart.data.datasets[0].data = data.grafico.atendimentos;
    atendimentoChart.data.datasets[1].data = data.grafico.tempoMedio;
    atendimentoChart.update();
  }

  /**
   * Controla o estado de carregamento da UI
   */
  function setLoadingState(isLoading) {
    if (isLoading) {
      updateInfoEl.textContent = 'Buscando dados atualizados...';
      // Poderia adicionar uma classe para "embaçar" os dados antigos
      document.querySelector('.projection-panel').style.opacity = '0.7';
    } else {
      const now = new Date();
      updateInfoEl.textContent = `Dados atualizados às ${now.toLocaleTimeString(
        'pt-BR',
      )}.`;
      document.querySelector('.projection-panel').style.opacity = '1';
    }
  }

  // --- INICIALIZAÇÃO ---
  updateDashboardData(); // Carga inicial dos dados

  // Limpa o intervalo anterior antes de criar um novo
  if (updateInterval) clearInterval(updateInterval);
  // Atualiza a cada 60 segundos
  updateInterval = setInterval(updateDashboardData, 60000);
});
