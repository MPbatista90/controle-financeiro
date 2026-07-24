/**
 * Módulo de Gráficos (Charts)
 * Gerencia todos os gráficos do sistema usando Chart.js
 */
const Charts = (() => {
  let charts = {};
  let currentFilters = {
    period: 'all',
    year: 'all',
    fuelType: 'all',
    station: 'all'
  };

  /**
   * Inicializa o módulo
   */
  function init() {
    setupFilters();
    bindExportButtons();
  }

  /**
   * Configura os filtros
   */
  function setupFilters() {
    // Preencher anos
    const yearSelect = document.getElementById('chart-year');
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 10; y--) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    }

    // Preencher postos
    const stationSelect = document.getElementById('chart-station');
    const entries = Storage.getFuelEntries();
    const stations = [...new Set(entries.filter(e => e.station).map(e => e.station))];
    stations.sort().forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      stationSelect.appendChild(opt);
    });

    // Eventos dos filtros
    ['chart-period', 'chart-year', 'chart-fuel-type', 'chart-station'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        applyFilters();
        renderAllCharts();
      });
    });
  }

  /**
   * Aplica os filtros
   */
  function applyFilters() {
    currentFilters = {
      period: document.getElementById('chart-period').value,
      year: document.getElementById('chart-year').value,
      fuelType: document.getElementById('chart-fuel-type').value,
      station: document.getElementById('chart-station').value
    };
  }

  /**
   * Filtra os dados conforme os filtros atuais
   */
  function getFilteredData() {
    let entries = Storage.getFuelEntries();

    // Período
    if (currentFilters.period !== 'all') {
      const now = new Date();
      let startDate;
      switch (currentFilters.period) {
        case 'year': startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()); break;
        case '6months': startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()); break;
        case '3months': startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()); break;
        case 'month': startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()); break;
      }
      if (startDate) {
        entries = entries.filter(e => new Date(e.date) >= startDate);
      }
    }

    // Ano
    if (currentFilters.year !== 'all') {
      entries = entries.filter(e => new Date(e.date).getFullYear() === parseInt(currentFilters.year));
    }

    // Tipo de combustível
    if (currentFilters.fuelType !== 'all') {
      entries = entries.filter(e => e.type === currentFilters.fuelType);
    }

    // Posto
    if (currentFilters.station !== 'all') {
      entries = entries.filter(e => e.station === currentFilters.station);
    }

    return entries;
  }

  /**
   * Processa os dados (km rodados, consumo)
   */
  function processEntries(entries) {
    const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0) {
        sorted[i]._kmDriven = sorted[i].odometer - sorted[i - 1].odometer;
        sorted[i]._consumption = sorted[i].liters > 0 ? sorted[i]._kmDriven / sorted[i].liters : 0;
      } else {
        sorted[i]._kmDriven = 0;
        sorted[i]._consumption = 0;
      }
    }
    return sorted;
  }

  /**
   * Renderiza todos os gráficos
   */
  function renderAllCharts() {
    if (typeof Chart === 'undefined') return;

    const entries = getFilteredData();
    const processed = processEntries(entries);
    const valid = processed.filter(e => e._consumption > 0);

    if (valid.length < 2) {
      return;
    }

    renderConsumptionEvolution(valid, processed);
    renderMovingAverage(valid);
    renderFuelComparison(valid, entries);
    renderMonthlySpending(entries);
    renderStationSpending(entries);
    renderStationConsumption(valid);
    renderAvgPrice(entries);
    renderKmMonthly(processed);
    renderKmProjection(processed);
    renderOilLife();
    renderOilInterval();
    renderRanking(valid);
  }

  /**
   * Obtém configurações de cor do tema
   */
  function getThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    return {
      text: isDark ? '#8b949e' : '#6b7280',
      grid: isDark ? '#30363d' : '#e5e7eb',
      card: isDark ? '#1c2333' : '#ffffff'
    };
  }

  /**
   * Gráfico: Evolução do km/L
   */
  function renderConsumptionEvolution(valid) {
    const ctx = document.getElementById('chart-consumption-evolution');
    if (!ctx) return;
    if (charts['consumption-evolution']) charts['consumption-evolution'].destroy();
    const colors = getThemeColors();

    charts['consumption-evolution'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: valid.map(e => formatDate(e.date)),
        datasets: [{
          label: 'km/L',
          data: valid.map(e => e._consumption),
          borderColor: '#1a6dff',
          backgroundColor: 'rgba(26,109,255,0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#1a6dff'
        }]
      },
      options: getDefaultChartOptions('Evolução do km/L', colors)
    });
  }

  /**
   * Gráfico: Média móvel do consumo
   */
  function renderMovingAverage(valid) {
    const ctx = document.getElementById('chart-moving-average');
    if (!ctx) return;
    if (charts['moving-average']) charts['moving-average'].destroy();
    const colors = getThemeColors();

    // Calcular média móvel (3 períodos)
    const movingAvg = [];
    for (let i = 0; i < valid.length; i++) {
      if (i < 2) {
        movingAvg.push(null);
      } else {
        const avg = (valid[i]._consumption + valid[i - 1]._consumption + valid[i - 2]._consumption) / 3;
        movingAvg.push(avg);
      }
    }

    charts['moving-average'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: valid.map(e => formatDate(e.date)),
        datasets: [
          {
            label: 'km/L',
            data: valid.map(e => e._consumption),
            borderColor: 'rgba(26,109,255,0.3)',
            backgroundColor: 'rgba(26,109,255,0.05)',
            fill: false,
            tension: 0.3,
            pointRadius: 2,
            borderDash: [5, 5]
          },
          {
            label: 'Média Móvel (3)',
            data: movingAvg,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245,158,11,0.1)',
            fill: false,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: '#f59e0b'
          }
        ]
      },
      options: getDefaultChartOptions('Média Móvel do Consumo', colors)
    });
  }

  /**
   * Gráfico: Comparação por tipo de combustível
   */
  function renderFuelComparison(valid, entries) {
    const ctx = document.getElementById('chart-fuel-comparison');
    if (!ctx) return;
    if (charts['fuel-comparison']) charts['fuel-comparison'].destroy();
    const colors = getThemeColors();

    const types = ['Comum', 'Aditivada', 'Premium'];
    const data = types.map(type => {
      const filtered = valid.filter(e => e.type === type);
      if (filtered.length === 0) return 0;
      return filtered.reduce((a, b) => a + b._consumption, 0) / filtered.length;
    });

    charts['fuel-comparison'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: types,
        datasets: [{
          label: 'Média km/L',
          data,
          backgroundColor: ['rgba(26,109,255,0.6)', 'rgba(34,197,94,0.6)', 'rgba(168,85,247,0.6)'],
          borderColor: ['#1a6dff', '#22c55e', '#a855f7'],
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: getDefaultChartOptions('Consumo por Tipo de Combustível', colors)
    });
  }

  /**
   * Gráfico: Gastos mensais
   */
  function renderMonthlySpending(entries) {
    const ctx = document.getElementById('chart-monthly-spending');
    if (!ctx) return;
    if (charts['monthly-spending']) charts['monthly-spending'].destroy();
    const colors = getThemeColors();

    const monthly = {};
    entries.forEach(e => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[key]) monthly[key] = 0;
      monthly[key] += parseFloat(e.totalCost) || 0;
    });

    const keys = Object.keys(monthly).sort();

    charts['monthly-spending'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: keys,
        datasets: [{
          label: 'Gastos (R$)',
          data: keys.map(k => monthly[k]),
          backgroundColor: 'rgba(239,68,68,0.6)',
          borderColor: '#ef4444',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: getDefaultChartOptions('Gastos Mensais', colors)
    });
  }

  /**
   * Gráfico: Gastos por posto
   */
  function renderStationSpending(entries) {
    const ctx = document.getElementById('chart-station-spending');
    if (!ctx) return;
    if (charts['station-spending']) charts['station-spending'].destroy();
    const colors = getThemeColors();

    const stations = {};
    entries.forEach(e => {
      if (e.station) {
        if (!stations[e.station]) stations[e.station] = 0;
        stations[e.station] += parseFloat(e.totalCost) || 0;
      }
    });

    const labels = Object.keys(stations);
    const data = labels.map(k => stations[k]);

    charts['station-spending'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Gastos (R$)',
          data,
          backgroundColor: 'rgba(168,85,247,0.6)',
          borderColor: '#a855f7',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: getDefaultChartOptions('Gastos por Posto', colors)
    });
  }

  /**
   * Gráfico: Consumo por posto
   */
  function renderStationConsumption(valid) {
    const ctx = document.getElementById('chart-station-consumption');
    if (!ctx) return;
    if (charts['station-consumption']) charts['station-consumption'].destroy();
    const colors = getThemeColors();

    const stations = {};
    valid.forEach(e => {
      if (e.station) {
        if (!stations[e.station]) stations[e.station] = [];
        stations[e.station].push(e._consumption);
      }
    });

    const labels = Object.keys(stations);
    const data = labels.map(k => {
      const vals = stations[k];
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    });

    charts['station-consumption'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Média km/L',
          data,
          backgroundColor: 'rgba(6,182,212,0.6)',
          borderColor: '#06b6d4',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: getDefaultChartOptions('Consumo por Posto', colors)
    });
  }

  /**
   * Gráfico: Preço médio do litro
   */
  function renderAvgPrice(entries) {
    const ctx = document.getElementById('chart-avg-price');
    if (!ctx) return;
    if (charts['avg-price']) charts['avg-price'].destroy();
    const colors = getThemeColors();

    const withPrice = entries.filter(e => e.pricePerLiter > 0).sort((a, b) => new Date(a.date) - new Date(b.date));

    if (withPrice.length < 2) return;

    charts['avg-price'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: withPrice.map(e => formatDate(e.date)),
        datasets: [{
          label: 'Preço/L (R$)',
          data: withPrice.map(e => e.pricePerLiter),
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34,197,94,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#22c55e'
        }]
      },
      options: getDefaultChartOptions('Preço Médio do Litro', colors)
    });
  }

  /**
   * Gráfico: Km rodados por mês
   */
  function renderKmMonthly(processed) {
    const ctx = document.getElementById('chart-km-monthly');
    if (!ctx) return;
    if (charts['km-monthly']) charts['km-monthly'].destroy();
    const colors = getThemeColors();

    const monthly = {};
    processed.forEach(e => {
      if (e._kmDriven > 0) {
        const d = new Date(e.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthly[key]) monthly[key] = 0;
        monthly[key] += e._kmDriven;
      }
    });

    const keys = Object.keys(monthly).sort();

    charts['km-monthly'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: keys,
        datasets: [{
          label: 'Km',
          data: keys.map(k => monthly[k]),
          backgroundColor: 'rgba(6,182,212,0.6)',
          borderColor: '#06b6d4',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: getDefaultChartOptions('Quilômetros Rodados por Mês', colors)
    });
  }

  /**
   * Gráfico: Projeção de quilometragem
   */
  function renderKmProjection(processed) {
    const ctx = document.getElementById('chart-km-projection');
    if (!ctx) return;
    if (charts['km-projection']) charts['km-projection'].destroy();
    const colors = getThemeColors();

    // Calcular média mensal
    const monthlyKm = {};
    processed.forEach(e => {
      if (e._kmDriven > 0) {
        const d = new Date(e.date);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        if (!monthlyKm[key]) monthlyKm[key] = 0;
        monthlyKm[key] += e._kmDriven;
      }
    });

    const values = Object.values(monthlyKm);
    if (values.length === 0) return;

    const avgMonthlyKm = values.reduce((a, b) => a + b, 0) / values.length;
    const lastOdometer = processed.length > 0 ? processed[processed.length - 1].odometer : 0;

    const now = new Date();
    const labels = ['Atual', '+6 meses', '+12 meses'];
    const projections = [lastOdometer, lastOdometer + avgMonthlyKm * 6, lastOdometer + avgMonthlyKm * 12];

    charts['km-projection'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Quilometragem',
          data: projections,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245,158,11,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: '#f59e0b'
        }]
      },
      options: getDefaultChartOptions('Projeção de Quilometragem', colors)
    });
  }

  /**
   * Gráfico: Vida útil do óleo (pizza)
   */
  function renderOilLife() {
    const ctx = document.getElementById('chart-oil-life');
    if (!ctx) return;
    if (charts['oil-life']) charts['oil-life'].destroy();
    const colors = getThemeColors();

    const lastOil = Storage.getLastOilChange();
    if (!lastOil) return;

    const settings = Storage.getSettings();
    const intervalKm = lastOil.intervalKm || settings.oilIntervalKm || 3000;
    const fuelEntries = Storage.getFuelEntries();
    const currentKm = fuelEntries.length > 0
      ? Math.max(...fuelEntries.map(e => e.odometer))
      : lastOil.km;

    const kmSinceLast = currentKm - lastOil.km;
    const percentUsed = Math.min(100, (kmSinceLast / intervalKm) * 100);
    const percentRemaining = Math.max(0, 100 - percentUsed);

    charts['oil-life'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Utilizado', 'Restante'],
        datasets: [{
          data: [percentUsed, percentRemaining],
          backgroundColor: [percentUsed > 80 ? '#ef4444' : (percentUsed > 60 ? '#f59e0b' : '#22c55e'), '#30363d'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: colors.text }
          }
        },
        cutout: '65%'
      }
    });
  }

  /**
   * Gráfico: Km entre trocas de óleo
   */
  function renderOilInterval() {
    const ctx = document.getElementById('chart-oil-interval');
    if (!ctx) return;
    if (charts['oil-interval']) charts['oil-interval'].destroy();
    const colors = getThemeColors();

    const changes = Storage.getOilChanges();
    if (changes.length < 2) return;

    const sorted = [...changes].sort((a, b) => new Date(a.date) - new Date(b.date));
    const intervals = [];
    const labels = [];

    for (let i = 1; i < sorted.length; i++) {
      const kmDiff = sorted[i].km - sorted[i - 1].km;
      intervals.push(kmDiff);
      labels.push(`${i - 1}→${i}`);
    }

    charts['oil-interval'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Km entre trocas',
          data: intervals,
          backgroundColor: 'rgba(59,130,246,0.6)',
          borderColor: '#3b82f6',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: getDefaultChartOptions('Quilômetros entre Trocas de Óleo', colors)
    });
  }

  /**
   * Gráfico: Ranking de abastecimentos
   */
  function renderRanking(valid) {
    const ctx = document.getElementById('chart-ranking');
    if (!ctx) return;
    if (charts['ranking']) charts['ranking'].destroy();
    const colors = getThemeColors();

    // Top 10 melhores e piores
    const sorted = [...valid].sort((a, b) => b._consumption - a._consumption);
    const top10 = sorted.slice(0, 10);
    const bottom10 = sorted.slice(-10).reverse();

    const labels = top10.map(e => formatDate(e.date) + ' - ' + (e.station || '?'));
    const data = top10.map(e => e._consumption);

    charts['ranking'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'km/L',
          data,
          backgroundColor: data.map(v =>
            v > (valid.reduce((a, b) => a + b._consumption, 0) / valid.length)
              ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)'
          ),
          borderColor: data.map(v =>
            v > (valid.reduce((a, b) => a + b._consumption, 0) / valid.length)
              ? '#22c55e' : '#ef4444'
          ),
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        ...getDefaultChartOptions('Ranking - Melhores Abastecimentos', colors),
        indexAxis: 'y',
        scales: {
          x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
          y: { ticks: { color: colors.text, font: { size: 10 } }, grid: { color: colors.grid } }
        }
      }
    });
  }

  /**
   * Opções padrão para gráficos
   */
  function getDefaultChartOptions(title, colors) {
    const isMobile = window.innerWidth < 768;
    return {
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 100,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          position: isMobile ? 'bottom' : 'top',
          labels: {
            color: colors.text,
            boxWidth: isMobile ? 10 : 14,
            font: { size: isMobile ? 10 : 12 }
          }
        },
        zoom: {
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'xy'
          },
          pan: {
            enabled: true,
            mode: 'xy'
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: colors.text,
            maxTicksLimit: isMobile ? 6 : 15,
            font: { size: isMobile ? 9 : 11 }
          },
          grid: { color: colors.grid }
        },
        y: {
          ticks: {
            color: colors.text,
            font: { size: isMobile ? 9 : 11 }
          },
          grid: { color: colors.grid }
        }
      }
    };
  }

  /**
   * Vincula botões de exportação de gráficos
   */
  function bindExportButtons() {
    document.querySelectorAll('.chart-export-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const chartId = this.dataset.chart;
        const chart = charts[chartId];
        if (!chart) return;

        const link = document.createElement('a');
        link.download = `${chartId}.png`;
        link.href = chart.canvas.toDataURL('image/png');
        link.click();
        showToast('Gráfico exportado como PNG!', 'success');
      });
    });
  }

  /**
   * Atualiza a lista de postos nos filtros
   */
  function updateStationFilter() {
    const select = document.getElementById('chart-station');
    const currentVal = select.value;
    select.innerHTML = '<option value="all">Todos</option>';

    const entries = Storage.getFuelEntries();
    const stations = [...new Set(entries.filter(e => e.station).map(e => e.station))];
    stations.sort().forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      select.appendChild(opt);
    });
    select.value = currentVal;
  }

  return { init, renderAllCharts, updateStationFilter };
})();
