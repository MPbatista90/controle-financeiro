/**
 * Módulo de Exportação (Export)
 * Gerencia exportação/importação CSV, Excel, PDF, JSON
 */
const Exporter = (() => {

  /**
   * Inicializa o módulo
   */
  function init() {
    bindEvents();
  }

  /**
   * Vincula eventos
   */
  function bindEvents() {
    document.getElementById('export-csv').addEventListener('click', exportCSV);
    document.getElementById('export-excel').addEventListener('click', exportExcel);
    document.getElementById('export-pdf').addEventListener('click', exportPDF);
    document.getElementById('export-backup').addEventListener('click', exportBackup);
    document.getElementById('import-backup').addEventListener('change', importBackup);
    document.getElementById('clear-all-data').addEventListener('click', clearAllData);
  }

  /**
   * Exporta CSV
   */
  function exportCSV() {
    const entries = Storage.getFuelEntries();
    if (entries.length === 0) {
      showToast('Nenhum dado para exportar!', 'warning');
      return;
    }

    const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calcular km rodados
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0) {
        sorted[i]._kmDriven = sorted[i].odometer - sorted[i - 1].odometer;
        sorted[i]._consumption = sorted[i].liters > 0 ? sorted[i]._kmDriven / sorted[i].liters : 0;
      } else {
        sorted[i]._kmDriven = 0;
        sorted[i]._consumption = 0;
      }
    }

    const headers = ['Data', 'Odômetro', 'Km Rodados', 'Litros', 'Consumo (km/L)', 'Combustível', 'Posto', 'Preço/L', 'Total', 'Observações'];
    const rows = sorted.map(e => [
      e.date,
      e.odometer,
      e._kmDriven > 0 ? e._kmDriven.toFixed(1) : '',
      e.liters.toFixed(2),
      e._consumption > 0 ? e._consumption.toFixed(1) : '',
      e.type || 'Comum',
      e.station || '',
      e.pricePerLiter ? e.pricePerLiter.toFixed(3) : '',
      e.totalCost ? e.totalCost.toFixed(2) : '',
      e.notes || ''
    ]);

    let csv = '\uFEFF' + headers.join(';') + '\n';
    csv += rows.map(row => row.join(';')).join('\n');

    downloadFile(csv, 'abastecimentos.csv', 'text/csv;charset=utf-8');
    showToast('CSV exportado com sucesso!', 'success');
  }

  /**
   * Exporta Excel usando SheetJS
   */
  function exportExcel() {
    if (typeof XLSX === 'undefined') {
      showToast('Biblioteca SheetJS não carregada. Verifique sua conexão.', 'error');
      return;
    }

    const fuelEntries = Storage.getFuelEntries();
    const oilEntries = Storage.getOilChanges();
    const maintEntries = Storage.getMaintenanceEntries();

    const wb = XLSX.utils.book_new();

    // Aba de abastecimentos
    if (fuelEntries.length > 0) {
      const sorted = [...fuelEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
      for (let i = 0; i < sorted.length; i++) {
        if (i > 0) {
          sorted[i]._kmDriven = sorted[i].odometer - sorted[i - 1].odometer;
          sorted[i]._consumption = sorted[i].liters > 0 ? sorted[i]._kmDriven / sorted[i].liters : 0;
        } else {
          sorted[i]._kmDriven = 0;
          sorted[i]._consumption = 0;
        }
      }

      const fuelData = sorted.map(e => ({
        Data: e.date,
        Odômetro: e.odometer,
        'Km Rodados': e._kmDriven > 0 ? parseFloat(e._kmDriven.toFixed(1)) : '',
        Litros: parseFloat(e.liters.toFixed(2)),
        'Consumo (km/L)': e._consumption > 0 ? parseFloat(e._consumption.toFixed(1)) : '',
        Combustível: e.type || 'Comum',
        Posto: e.station || '',
        'Preço/L': e.pricePerLiter || '',
        'Valor Total': e.totalCost || '',
        Observações: e.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(fuelData);
      XLSX.utils.book_append_sheet(wb, ws, 'Abastecimentos');
    }

    // Aba de óleo
    if (oilEntries.length > 0) {
      const oilData = [...oilEntries].sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => ({
        Data: e.date,
        Quilometragem: e.km,
        Marca: e.brand || '',
        Tipo: e.type || '',
        Viscosidade: e.viscosity || '',
        Quantidade: e.quantity || '',
        Filtro: e.filterChanged || '',
        Observações: e.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(oilData);
      XLSX.utils.book_append_sheet(wb, ws, 'Troca de Óleo');
    }

    // Aba de manutenções
    if (maintEntries.length > 0) {
      const maintData = [...maintEntries].sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => ({
        Data: e.date,
        Quilometragem: e.km || '',
        Tipo: e.type || '',
        Descrição: e.description || '',
        Custo: e.cost || '',
        Observações: e.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(maintData);
      XLSX.utils.book_append_sheet(wb, ws, 'Manutenções');
    }

    XLSX.writeFile(wb, 'controle_da_moto.xlsx');
    showToast('Excel exportado com sucesso!', 'success');
  }

  /**
   * Exporta PDF / Imprimir
   */
  function exportPDF() {
    const settings = Storage.getSettings();
    const fuelEntries = Storage.getFuelEntries();
    const oilEntries = Storage.getOilChanges();

    // Criar janela de impressão
    const win = window.open('', '_blank');
    if (!win) {
      showToast('Permita pop-ups para exportar o PDF.', 'error');
      return;
    }

    const sorted = [...fuelEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0) {
        sorted[i]._kmDriven = sorted[i].odometer - sorted[i - 1].odometer;
        sorted[i]._consumption = sorted[i].liters > 0 ? sorted[i]._kmDriven / sorted[i].liters : 0;
      } else {
        sorted[i]._kmDriven = 0;
        sorted[i]._consumption = 0;
      }
    }

    const consumptions = sorted.filter(e => e._consumption > 0).map(e => e._consumption);
    const avgConsumption = consumptions.length > 0
      ? consumptions.reduce((a, b) => a + b, 0) / consumptions.length : 0;
    const totalSpent = fuelEntries.reduce((sum, e) => sum + (parseFloat(e.totalCost) || 0), 0);
    const totalLiters = fuelEntries.reduce((sum, e) => sum + (parseFloat(e.liters) || 0), 0);
    const firstOdo = sorted.length > 0 ? sorted[0].odometer : 0;
    const lastOdo = sorted.length > 0 ? sorted[sorted.length - 1].odometer : 0;
    const totalKm = lastOdo - firstOdo;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório - ${settings.motoName}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #1a6dff; border-bottom: 2px solid #1a6dff; padding-bottom: 10px; }
          h2 { color: #333; margin-top: 30px; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 20px 0; }
          .summary-item { background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; }
          .summary-item .label { font-size: 0.8rem; color: #6b7280; }
          .summary-item .value { font-size: 1.4rem; font-weight: 700; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background: #f3f4f6; font-weight: 600; }
          .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 0.8rem; }
          @media print { body { padding: 20px; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <h1>${settings.motoName} - Relatório Completo</h1>
        <p>Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}</p>

        <h2>Resumo</h2>
        <div class="summary">
          <div class="summary-item">
            <div class="label">Consumo Médio</div>
            <div class="value">${avgConsumption.toFixed(1)} km/L</div>
          </div>
          <div class="summary-item">
            <div class="label">Total Gasto</div>
            <div class="value">R$ ${totalSpent.toFixed(2)}</div>
          </div>
          <div class="summary-item">
            <div class="label">Total Abastecido</div>
            <div class="value">${totalLiters.toFixed(1)} L</div>
          </div>
          <div class="summary-item">
            <div class="label">Total Percorrido</div>
            <div class="value">${totalKm.toFixed(1)} km</div>
          </div>
        </div>

        <h2>Abastecimentos</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Odômetro</th>
              <th>Km Rodados</th>
              <th>Litros</th>
              <th>Consumo</th>
              <th>Tipo</th>
              <th>Posto</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.reverse().map(e => `
              <tr>
                <td>${e.date}</td>
                <td>${e.odometer.toFixed(1)}</td>
                <td>${e._kmDriven > 0 ? e._kmDriven.toFixed(1) : '-'}</td>
                <td>${e.liters.toFixed(2)}</td>
                <td>${e._consumption > 0 ? e._consumption.toFixed(1) : '-'}</td>
                <td>${e.type || 'Comum'}</td>
                <td>${e.station || '-'}</td>
                <td>${e.totalCost ? 'R$ ' + e.totalCost.toFixed(2) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${oilEntries.length > 0 ? `
          <h2>Trocas de Óleo</h2>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Quilometragem</th>
                <th>Marca</th>
                <th>Tipo</th>
                <th>Quantidade</th>
              </tr>
            </thead>
            <tbody>
              ${[...oilEntries].sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => `
                <tr>
                  <td>${e.date}</td>
                  <td>${e.km.toFixed(1)}</td>
                  <td>${e.brand || '-'}</td>
                  <td>${e.type || '-'}</td>
                  <td>${e.quantity ? e.quantity + ' L' : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="footer">
          <p>Controle da Moto - Relatório gerado automaticamente</p>
        </div>
        <script>
          window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
        <\/script>
      </body>
      </html>
    `;

    win.document.write(html);
    win.document.close();
  }

  /**
   * Exporta backup JSON
   */
  function exportBackup() {
    const data = Storage.exportAllData();
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, `controle_moto_backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    showToast('Backup exportado com sucesso!', 'success');
  }

  /**
   * Importa backup JSON
   */
  function importBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const result = Storage.importAllData(data);

        if (result) {
          const resultDiv = document.getElementById('import-result');
          resultDiv.className = 'import-result success';
          resultDiv.innerHTML = `<i class="fas fa-check-circle"></i> Backup importado com sucesso! ${data.fuel ? data.fuel.length + ' abastecimentos' : '0 abastecimentos'}, ${data.oil ? data.oil.length + ' trocas de óleo' : '0 trocas'}.`;
          App.updateAll();
          showToast('Dados importados com sucesso!', 'success');
        } else {
          throw new Error('Formato inválido');
        }
      } catch (err) {
        document.getElementById('import-result').className = 'import-result error';
        document.getElementById('import-result').innerHTML = `<i class="fas fa-exclamation-circle"></i> Erro ao importar: formato de arquivo inválido.`;
        showToast('Erro ao importar backup!', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  /**
   * Limpa todos os dados
   */
  function clearAllData() {
    showModal(
      'Zerar Todos os Dados',
      'Tem certeza que deseja excluir TODOS os dados? Esta ação não pode ser desfeita. Faça um backup antes!',
      [
        { text: 'Cancelar', class: 'btn btn-outline', action: closeModal },
        { text: 'Sim, Zerar Tudo', class: 'btn btn-danger', action: () => {
          Storage.clearAllData();
          closeModal();
          App.updateAll();
          showToast('Todos os dados foram removidos!', 'info');
        }}
      ]
    );
  }

  /**
   * Faz download de um arquivo
   */
  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return { init };
})();
