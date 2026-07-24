/**
 * Módulo do Dashboard
 * Gerencia KPIs, banner da moto e análises inteligentes
 */
const Dashboard = (() => {
  let dashCharts = {};

  /**
   * Inicializa o dashboard
   */
  function init() {
    setupMotoName();
    setupMotoPhoto();
  }

  /**
   * Configura o nome da moto
   */
  function setupMotoName() {
    const settings = Storage.getSettings();
    document.getElementById('moto-name').textContent = settings.motoName;
    document.getElementById('settings-moto-name').value = settings.motoName;

    document.getElementById('edit-moto-name').addEventListener('click', () => {
      const newName = prompt('Nome da motocicleta:', settings.motoName);
      if (newName && newName.trim()) {
        Storage.saveSettings({ motoName: newName.trim() });
        document.getElementById('moto-name').textContent = newName.trim();
        document.getElementById('settings-moto-name').value = newName.trim();
        showToast('Nome atualizado!', 'success');
      }
    });

    document.getElementById('settings-save-name').addEventListener('click', () => {
      const name = document.getElementById('settings-moto-name').value.trim();
      if (name) {
        Storage.saveSettings({ motoName: name });
        document.getElementById('moto-name').textContent = name;
        showToast('Nome salvo!', 'success');
      }
    });
  }

  /**
   * Configura a foto da moto
   */
  function setupMotoPhoto() {
    const photoEl = document.getElementById('moto-photo');
    const imgEl = document.getElementById('moto-photo-img');
    const placeholder = document.querySelector('.moto-photo-placeholder');

    // Carregar foto salva
    const savedPhoto = Storage.getMotoPhoto();
    if (savedPhoto) {
      imgEl.src = savedPhoto;
      imgEl.style.display = 'block';
      placeholder.style.display = 'none';
    }

    photoEl.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target.result;
            imgEl.src = dataUrl;
            imgEl.style.display = 'block';
            placeholder.style.display = 'none';
            Storage.saveMotoPhoto(dataUrl);
            showToast('Foto atualizada!', 'success');
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    });

    // Settings photo
    document.getElementById('settings-moto-photo').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target.result;
          imgEl.src = dataUrl;
          imgEl.style.display = 'block';
          placeholder.style.display = 'none';
          Storage.saveMotoPhoto(dataUrl);
          showToast('Foto atualizada!', 'success');
        };
        reader.readAsDataURL(file);
      }
    });

    document.getElementById('settings-remove-photo').addEventListener('click', () => {
      imgEl.src = '';
      imgEl.style.display = 'none';
      placeholder.style.display = 'flex';
      Storage.removeMotoPhoto();
      showToast('Foto removida!', 'info');
    });
  }

  /**
   * Atualiza todos os KPIs
   */
  function updateKPIs() {
    const entries = Storage.getFuelEntries();
    const settings = Storage.getSettings();

    if (entries.length === 0) {
      document.getElementById('kpi-avg-consumption').textContent = '0,0';
      document.getElementById('kpi-best-consumption').textContent = '0,0';
      document.getElementById('kpi-worst-consumption').textContent = '0,0';
      document.getElementById('kpi-total-spent').textContent = 'R$ 0,00';
      document.getElementById('kpi-total-liters').textContent = '0 L';
      document.getElementById('kpi-total-km').textContent = '0 km';
      document.getElementById('kpi-cost-per-km').textContent = 'R$ 0,00';
      document.getElementById('kpi-total-refuels').textContent = '0';
      document.getElementById('display-odometer').textContent = '0 km';
      document.getElementById('display-avg-consumption').textContent = '0 km/L';
      document.getElementById('display-autonomy').textContent = '0 km';
      return;
    }

    // Ordenar por data
    const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calcular km rodados e consumo por abastecimento
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0) {
        sorted[i]._kmDriven = sorted[i].odometer - sorted[i - 1].odometer;
        sorted[i]._consumption = sorted[i].liters > 0
          ? (sorted[i]._kmDriven / sorted[i].liters)
          : 0;
      } else {
        sorted[i]._kmDriven = 0;
        sorted[i]._consumption = 0;
      }
    }

    // Consumos válidos (ignorar primeiro abastecimento e valores zero)
    const consumptions = sorted
      .filter(e => e._consumption > 0)
      .map(e => e._consumption);

    const avgConsumption = consumptions.length > 0
      ? consumptions.reduce((a, b) => a + b, 0) / consumptions.length
      : 0;
    const bestConsumption = consumptions.length > 0 ? Math.max(...consumptions) : 0;
    const worstConsumption = consumptions.length > 0 ? Math.min(...consumptions) : 0;

    const totalSpent = entries.reduce((sum, e) => sum + (parseFloat(e.totalCost) || 0), 0);
    const totalLiters = entries.reduce((sum, e) => sum + (parseFloat(e.liters) || 0), 0);
    const firstOdometer = sorted[0].odometer;
    const lastOdometer = sorted[sorted.length - 1].odometer;
    const totalKm = lastOdometer - firstOdometer;
    const costPerKm = totalKm > 0 ? totalSpent / totalKm : 0;

    document.getElementById('kpi-avg-consumption').textContent = formatNumber(avgConsumption, 1);
    document.getElementById('kpi-best-consumption').textContent = formatNumber(bestConsumption, 1);
    document.getElementById('kpi-worst-consumption').textContent = formatNumber(worstConsumption, 1);
    document.getElementById('kpi-total-spent').textContent = 'R$ ' + formatNumber(totalSpent, 2);
    document.getElementById('kpi-total-liters').textContent = formatNumber(totalLiters, 1) + ' L';
    document.getElementById('kpi-total-km').textContent = formatNumber(totalKm, 1) + ' km';
    document.getElementById('kpi-cost-per-km').textContent = 'R$ ' + formatNumber(costPerKm, 4);
    document.getElementById('kpi-total-refuels').textContent = entries.length;

    // Banner info
    document.getElementById('display-odometer').textContent = formatNumber(lastOdometer, 1) + ' km';
    document.getElementById('display-avg-consumption').textContent = formatNumber(avgConsumption, 1) + ' km/L';
    const autonomy = avgConsumption > 0 ? avgConsumption * (entries[entries.length - 1]?.liters || 0) : 0;
    document.getElementById('display-autonomy').textContent = formatNumber(autonomy, 1) + ' km';
  }

  /**
   * Gera análises inteligentes
   */
  function generateInsights() {
    const container = document.getElementById('insights-container');
    const entries = Storage.getFuelEntries();
    const oilChanges = Storage.getOilChanges();
    const insights = [];

    if (entries.length < 2) {
      container.innerHTML = '<div class="insight-item"><i class="fas fa-info-circle"></i> Registre pelo menos 2 abastecimentos para receber análises inteligentes.</div>';
      return;
    }

    // Ordenar por data
    const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calcular consumo por abastecimento
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0) {
        sorted[i]._kmDriven = sorted[i].odometer - sorted[i - 1].odometer;
        sorted[i]._consumption = sorted[i].liters > 0 ? sorted[i]._kmDriven / sorted[i].liters : 0;
      } else {
        sorted[i]._kmDriven = 0;
        sorted[i]._consumption = 0;
      }
    }

    const validEntries = sorted.filter(e => e._consumption > 0);
    const consumptions = validEntries.map(e => e._consumption);
    const avgConsumption = consumptions.length > 0
      ? consumptions.reduce((a, b) => a + b, 0) / consumptions.length
      : 0;

    // Análise 1: Comparação com mês anterior
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonth = validEntries.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const lastMonth = validEntries.filter(e => {
      const d = new Date(e.date);
      if (currentMonth === 0) {
        return d.getMonth() === 11 && d.getFullYear() === currentYear - 1;
      }
      return d.getMonth() === currentMonth - 1 && d.getFullYear() === currentYear;
    });

    const avgThisMonth = thisMonth.length > 0
      ? thisMonth.reduce((a, b) => a + b._consumption, 0) / thisMonth.length
      : 0;
    const avgLastMonth = lastMonth.length > 0
      ? lastMonth.reduce((a, b) => a + b._consumption, 0) / lastMonth.length
      : 0;

    if (avgThisMonth > 0 && avgLastMonth > 0) {
      const diff = ((avgThisMonth - avgLastMonth) / avgLastMonth) * 100;
      if (Math.abs(diff) > 1) {
        const direction = diff > 0 ? 'aumentou' : 'diminuiu';
        insights.push({
          icon: diff > 0 ? 'fa-arrow-up' : 'fa-arrow-down',
          color: diff > 0 ? '#22c55e' : '#ef4444',
          text: `Seu consumo ${direction} ${Math.abs(diff).toFixed(1)}% em relação ao mês anterior.`
        });
      }
    }

    // Análise 2: Melhor posto
    const stationStats = {};
    validEntries.forEach(e => {
      if (e.station) {
        if (!stationStats[e.station]) {
          stationStats[e.station] = { consumptions: [], costs: [], count: 0 };
        }
        stationStats[e.station].consumptions.push(e._consumption);
        stationStats[e.station].costs.push(e.pricePerLiter || 0);
        stationStats[e.station].count++;
      }
    });

    let bestStation = null;
    let bestStationAvg = 0;
    Object.entries(stationStats).forEach(([name, stats]) => {
      const avg = stats.consumptions.reduce((a, b) => a + b, 0) / stats.consumptions.length;
      if (avg > bestStationAvg) {
        bestStationAvg = avg;
        bestStation = name;
      }
    });

    if (bestStation) {
      insights.push({
        icon: 'fa-trophy',
        color: '#f59e0b',
        text: `O posto "${bestStation}" apresentou o melhor consumo médio (${formatNumber(bestStationAvg, 1)} km/L).`
      });
    }

    // Análise 3: Combustível aditivada vs comum
    const comumEntries = validEntries.filter(e => e.type === 'Comum');
    const aditivadaEntries = validEntries.filter(e => e.type === 'Aditivada');
    const premiumEntries = validEntries.filter(e => e.type === 'Premium');

    if (comumEntries.length > 0 && aditivadaEntries.length > 0) {
      const avgComum = comumEntries.reduce((a, b) => a + b._consumption, 0) / comumEntries.length;
      const avgAditivada = aditivadaEntries.reduce((a, b) => a + b._consumption, 0) / aditivadaEntries.length;

      if (avgAditivada > avgComum) {
        const diff = ((avgAditivada - avgComum) / avgComum) * 100;
        insights.push({
          icon: 'fa-flask',
          color: '#a855f7',
          text: `A gasolina aditivada apresentou consumo médio superior em ${diff.toFixed(1)}% em comparação à comum.`
        });
      }
    }

    if (aditivadaEntries.length > 0 && premiumEntries.length > 0) {
      const avgAditivada = aditivadaEntries.reduce((a, b) => a + b._consumption, 0) / aditivadaEntries.length;
      const avgPremium = premiumEntries.reduce((a, b) => a + b._consumption, 0) / premiumEntries.length;

      if (avgPremium > avgAditivada) {
        const diff = ((avgPremium - avgAditivada) / avgAditivada) * 100;
        insights.push({
          icon: 'fa-crown',
          color: '#f59e0b',
          text: `A gasolina premium apresentou consumo ${diff.toFixed(1)}% maior que a aditivada.`
        });
      }
    }

    // Análise 4: Quilometragem mensal
    const monthlyKm = {};
    validEntries.forEach(e => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyKm[key]) monthlyKm[key] = 0;
      monthlyKm[key] += e._kmDriven || 0;
    });

    const months = Object.keys(monthlyKm).sort();
    if (months.length >= 2) {
      const lastMonthKm = monthlyKm[months[months.length - 1]] || 0;
      const prevMonthKm = monthlyKm[months[months.length - 2]] || 0;
      if (lastMonthKm > 0 && prevMonthKm > 0) {
        const diff = lastMonthKm - prevMonthKm;
        if (Math.abs(diff) > 10) {
          const direction = diff > 0 ? 'mais' : 'menos';
          insights.push({
            icon: 'fa-road',
            color: '#06b6d4',
            text: `Você percorreu ${Math.abs(diff).toFixed(0)} km ${direction} este mês do que no mês passado.`
          });
        }
      }
    }

    // Análise 5: Próxima troca de óleo
    const lastOil = Storage.getLastOilChange();
    if (lastOil) {
      const settings = Storage.getSettings();
      const intervalKm = lastOil.intervalKm || settings.oilIntervalKm || 3000;
      const currentKm = sorted.length > 0 ? sorted[sorted.length - 1].odometer : 0;
      const kmSinceLast = currentKm - lastOil.km;
      const kmRemaining = Math.max(0, (lastOil.km + intervalKm) - currentKm);

      if (kmRemaining > 0 && kmRemaining < 500) {
        insights.push({
          icon: 'fa-oil-can',
          color: '#ef4444',
          text: `A próxima troca de óleo ocorrerá em aproximadamente ${(kmRemaining / avgConsumption).toFixed(0)} dias (${formatNumber(kmRemaining, 0)} km).`
        });
      }
    }

    if (insights.length === 0) {
      container.innerHTML = '<div class="insight-item"><i class="fas fa-info-circle"></i> Continue registrando para receber mais análises inteligentes.</div>';
      return;
    }

    container.innerHTML = insights.map(insight => `
      <div class="insight-item">
        <i class="fas ${insight.icon}" style="color:${insight.color}"></i>
        ${insight.text}
      </div>
    `).join('');
  }

  /**
   * Atualiza os gráficos do dashboard
   */
  function updateCharts() {
    if (typeof Chart === 'undefined') return;
    const entries = Storage.getFuelEntries();
    if (entries.length < 2) return;

    const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calcular consumo por abastecimento
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0) {
        sorted[i]._kmDriven = sorted[i].odometer - sorted[i - 1].odometer;
        sorted[i]._consumption = sorted[i].liters > 0 ? sorted[i]._kmDriven / sorted[i].liters : 0;
      } else {
        sorted[i]._kmDriven = 0;
        sorted[i]._consumption = 0;
      }
    }

    const valid = sorted.filter(e => e._consumption > 0);
    if (valid.length < 2) return;

    // Gráfico de evolução do consumo
    const ctx1 = document.getElementById('dash-chart-consumption');
    if (ctx1) {
      if (dashCharts.consumption) dashCharts.consumption.destroy();
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      const textColor = isDark ? '#8b949e' : '#6b7280';

      dashCharts.consumption = new Chart(ctx1, {
        type: 'line',
        data: {
          labels: valid.map(e => formatDate(e.date)),
          datasets: [{
            label: 'km/L',
            data: valid.map(e => e._consumption),
            borderColor: '#1a6dff',
            backgroundColor: 'rgba(26,109,255,0.1)',
            fill: false,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#1a6dff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          resizeDelay: 100,
          plugins: {
            legend: {
              labels: { color: textColor, font: { size: window.innerWidth < 768 ? 10 : 12 } }
            }
          },
          scales: {
            x: { ticks: { color: textColor, maxTicksLimit: window.innerWidth < 768 ? 6 : 10, font: { size: window.innerWidth < 768 ? 9 : 11 } }, grid: { color: isDark ? '#30363d' : '#e5e7eb' } },
            y: { ticks: { color: textColor, font: { size: window.innerWidth < 768 ? 9 : 11 } }, grid: { color: isDark ? '#30363d' : '#e5e7eb' } }
          }
        }
      });
    }

    // Gráfico de gastos mensais
    const ctx2 = document.getElementById('dash-chart-monthly');
    if (ctx2) {
      if (dashCharts.monthly) dashCharts.monthly.destroy();

      const monthlyData = {};
      entries.forEach(e => {
        const d = new Date(e.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[key]) monthlyData[key] = 0;
        monthlyData[key] += parseFloat(e.totalCost) || 0;
      });

      const keys = Object.keys(monthlyData).sort();
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      const textColor = isDark ? '#8b949e' : '#6b7280';

      dashCharts.monthly = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: keys,
          datasets: [{
            label: 'Gastos (R$)',
            data: keys.map(k => monthlyData[k]),
            backgroundColor: 'rgba(26,109,255,0.6)',
            borderColor: '#1a6dff',
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          resizeDelay: 100,
          plugins: {
            legend: {
              labels: { color: textColor, font: { size: window.innerWidth < 768 ? 10 : 12 } }
            }
          },
          scales: {
            x: { ticks: { color: textColor, font: { size: window.innerWidth < 768 ? 9 : 11 } }, grid: { color: isDark ? '#30363d' : '#e5e7eb' } },
            y: { ticks: { color: textColor, font: { size: window.innerWidth < 768 ? 9 : 11 }, callback: v => 'R$ ' + v.toFixed(0) }, grid: { color: isDark ? '#30363d' : '#e5e7eb' } }
          }
        }
      });
    }
  }

  /**
   * Atualização completa do dashboard
   */
  function update() {
    updateKPIs();
    generateInsights();
    updateCharts();
  }

  return { init, update };
})();
