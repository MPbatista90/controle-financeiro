/**
 * Módulo de Troca de Óleo (Oil)
 * Gerencia o status do óleo, formulário e histórico
 */
const Oil = (() => {

  /**
   * Inicializa o módulo
   */
  function init() {
    bindEvents();
    setDefaultDate();
  }

  /**
   * Define a data atual como padrão
   */
  function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('oil-date').value = today;
    document.getElementById('maint-date').value = today;
  }

  /**
   * Vincula eventos
   */
  function bindEvents() {
    const form = document.getElementById('oil-form');
    form.addEventListener('submit', handleSubmit);

    document.getElementById('oil-cancel-edit').addEventListener('click', cancelEdit);

    const maintForm = document.getElementById('maint-form');
    maintForm.addEventListener('submit', handleMaintSubmit);
    document.getElementById('maint-cancel-edit').addEventListener('click', cancelMaintEdit);
  }

  /**
   * Manipula submit do formulário de óleo
   */
  function handleSubmit(e) {
    e.preventDefault();

    const editId = document.getElementById('oil-edit-id').value;
    const date = document.getElementById('oil-date').value;
    const km = parseFloat(document.getElementById('oil-km').value);
    const type = document.getElementById('oil-type').value;
    const brand = document.getElementById('oil-brand').value.trim();
    const viscosity = document.getElementById('oil-viscosity').value;
    const quantity = parseFloat(document.getElementById('oil-quantity').value) || 1.0;
    const filterChanged = document.getElementById('oil-filter').value;
    const intervalKm = parseInt(document.getElementById('oil-interval-km').value) || 3000;
    const intervalMonths = parseInt(document.getElementById('oil-interval-months').value) || 6;
    const notes = document.getElementById('oil-notes').value.trim();

    if (!date || isNaN(km)) {
      showToast('Preencha todos os campos obrigatórios!', 'error');
      return;
    }

    const entry = { date, km, type, brand, viscosity, quantity, filterChanged, intervalKm, intervalMonths, notes };

    if (editId) {
      Storage.updateOilChange(editId, entry);
      showToast('Troca de óleo atualizada!', 'success');
    } else {
      Storage.addOilChange(entry);
      showToast('Troca de óleo registrada!', 'success');
    }

    document.getElementById('oil-form').reset();
    setDefaultDate();
    cancelEdit();
    renderTable();
    updateOilStatus();
    App.updateAll();
  }

  /**
   * Cancela edição de óleo
   */
  function cancelEdit() {
    document.getElementById('oil-edit-id').value = '';
    document.getElementById('oil-submit-text').textContent = 'Registrar Troca';
    document.getElementById('oil-cancel-edit').style.display = 'none';
  }

  /**
   * Edita uma troca de óleo
   */
  function editEntry(id) {
    const entries = Storage.getOilChanges();
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    document.getElementById('oil-edit-id').value = id;
    document.getElementById('oil-date').value = entry.date;
    document.getElementById('oil-km').value = entry.km;
    document.getElementById('oil-type').value = entry.type || 'Sintético';
    document.getElementById('oil-brand').value = entry.brand || '';
    document.getElementById('oil-viscosity').value = entry.viscosity || '10W-40';
    document.getElementById('oil-quantity').value = entry.quantity || 1.0;
    document.getElementById('oil-filter').value = entry.filterChanged || 'Sim';
    document.getElementById('oil-interval-km').value = entry.intervalKm || 3000;
    document.getElementById('oil-interval-months').value = entry.intervalMonths || 6;
    document.getElementById('oil-notes').value = entry.notes || '';

    document.getElementById('oil-submit-text').textContent = 'Atualizar Troca';
    document.getElementById('oil-cancel-edit').style.display = 'inline-flex';
    document.getElementById('oil-form').scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Exclui uma troca de óleo
   */
  function deleteEntry(id) {
    showModal(
      'Excluir Troca de Óleo',
      'Tem certeza que deseja excluir este registro?',
      [
        { text: 'Cancelar', class: 'btn btn-outline', action: closeModal },
        { text: 'Excluir', class: 'btn btn-danger', action: () => {
          Storage.deleteOilChange(id);
          closeModal();
          renderTable();
          updateOilStatus();
          App.updateAll();
          showToast('Registro excluído!', 'success');
        }}
      ]
    );
  }

  /**
   * Renderiza tabela de trocas de óleo
   */
  function renderTable() {
    const entries = Storage.getOilChanges();
    const tbody = document.getElementById('oil-table-body');
    const empty = document.getElementById('oil-table-empty');

    if (entries.length === 0) {
      tbody.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';
    const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = sorted.map(e => `
      <tr>
        <td>${formatDate(e.date)}</td>
        <td>${formatNumber(e.km, 1)} km</td>
        <td>${e.brand || '-'}</td>
        <td>${e.type || '-'} ${e.viscosity ? '(' + e.viscosity + ')' : ''}</td>
        <td>${formatNumber(e.quantity, 1)} L</td>
        <td>${e.notes || '-'}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn edit" onclick="Oil.editEntry('${e.id}')" title="Editar">
              <i class="fas fa-pen"></i>
            </button>
            <button class="action-btn delete" onclick="Oil.deleteEntry('${e.id}')" title="Excluir">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  /**
   * Atualiza o status do óleo
   */
  function updateOilStatus() {
    const last = Storage.getLastOilChange();
    const settings = Storage.getSettings();
    const fuelEntries = Storage.getFuelEntries();
    const currentKm = fuelEntries.length > 0
      ? Math.max(...fuelEntries.map(e => e.odometer))
      : (last ? last.km : 0);

    document.getElementById('oil-current-km').textContent = formatNumber(currentKm, 1) + ' km';

    if (!last) {
      document.getElementById('oil-last-change').textContent = 'Nenhuma troca';
      document.getElementById('oil-next-change').textContent = 'Configure a troca';
      document.getElementById('oil-warning-msg').innerHTML = '<i class="fas fa-info-circle"></i><span>Configure a primeira troca de óleo</span>';
      drawOilGauge(100);
      document.getElementById('oil-percent-display').textContent = '0%';
      updateOilWarningBanner(null);
      return;
    }

    document.getElementById('oil-last-change').textContent = formatDate(last.date) + ' - ' + formatNumber(last.km, 1) + ' km';

    const intervalKm = last.intervalKm || settings.oilIntervalKm || 3000;
    const intervalMonths = last.intervalMonths || settings.oilIntervalMonths || 6;
    const nextKm = last.km + intervalKm;
    const kmSinceLast = currentKm - last.km;
    const kmRemaining = Math.max(0, nextKm - currentKm);

    // Verificar por tempo
    const lastDate = new Date(last.date);
    const today = new Date();
    const monthsSince = (today.getFullYear() - lastDate.getFullYear()) * 12 + (today.getMonth() - lastDate.getMonth());
    const monthsRemaining = Math.max(0, intervalMonths - monthsSince);

    // Usar o menor valor entre km e meses
    const isOverdueByKm = kmSinceLast >= intervalKm;
    const isOverdueByTime = monthsSince >= intervalMonths;

    if (isOverdueByKm || isOverdueByTime) {
      document.getElementById('oil-next-change').textContent = 'VENCIDA!';
      document.getElementById('oil-next-change').style.color = 'var(--accent-red)';
      document.getElementById('oil-warning-msg').innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span><strong>Troca de óleo vencida!</strong> Já rodou ${formatNumber(kmSinceLast, 0)} km desde a última troca.</span>
      `;
      document.getElementById('oil-warning-msg').className = 'oil-info-item highlight';
      document.getElementById('oil-warning-msg').style.background = 'rgba(239,68,68,0.15)';
      document.getElementById('oil-warning-msg').style.color = 'var(--accent-red)';
    } else {
      document.getElementById('oil-next-change').textContent = `${formatNumber(kmRemaining, 0)} km ou ${monthsRemaining} meses`;
      document.getElementById('oil-next-change').style.color = '';
      document.getElementById('oil-warning-msg').innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>Faltam ${formatNumber(kmRemaining, 0)} km para a próxima troca de óleo.</span>
      `;
      document.getElementById('oil-warning-msg').className = 'oil-info-item highlight';
      document.getElementById('oil-warning-msg').style.background = 'rgba(34,197,94,0.1)';
      document.getElementById('oil-warning-msg').style.color = 'var(--accent-green)';

      // Aviso se faltar menos de 100 km
      if (kmRemaining > 0 && kmRemaining < 100) {
        document.getElementById('oil-warning-msg').innerHTML = `
          <i class="fas fa-exclamation-circle"></i>
          <span><strong>Atenção!</strong> Faltam apenas ${formatNumber(kmRemaining, 0)} km para a troca de óleo.</span>
        `;
        document.getElementById('oil-warning-msg').style.background = 'rgba(245,158,11,0.15)';
        document.getElementById('oil-warning-msg').style.color = 'var(--accent-yellow)';
      }
    }

    // Desenhar gauge
    const percentUsed = Math.min(100, (kmSinceLast / intervalKm) * 100);
    drawOilGauge(percentUsed);
    document.getElementById('oil-percent-display').textContent = Math.round(percentUsed) + '%';

    // Atualizar banner
    updateOilWarningBanner({ isOverdueByKm, isOverdueByTime, kmRemaining, monthsRemaining, kmSinceLast });
  }

  /**
   * Atualiza o banner de aviso de óleo no dashboard
   */
  function updateOilWarningBanner(status) {
    const banner = document.getElementById('oil-warning-banner');
    const text = document.getElementById('oil-warning-text');

    if (!status) {
      banner.style.display = 'none';
      return;
    }

    if (status.isOverdueByKm || status.isOverdueByTime) {
      banner.style.display = 'flex';
      text.textContent = `Troca de óleo vencida! Já rodou ${formatNumber(status.kmSinceLast, 0)} km desde a última troca.`;
      banner.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))';
      banner.style.color = 'var(--accent-red)';
    } else if (status.kmRemaining < 100) {
      banner.style.display = 'flex';
      text.textContent = `Faltam apenas ${formatNumber(status.kmRemaining, 0)} km para a troca de óleo!`;
      banner.style.background = 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))';
      banner.style.color = 'var(--accent-yellow)';
    } else {
      banner.style.display = 'none';
    }
  }

  /**
   * Desenha o gráfico circular do óleo
   */
  function drawOilGauge(percent) {
    const canvas = document.getElementById('oil-gauge-canvas');
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 15;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (percent / 100) * Math.PI * 2;

    // Fundo
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#30363d';
    ctx.lineWidth = 12;
    ctx.stroke();

    // Progresso
    const isLow = percent > 80;
    const color = isLow ? '#ef4444' : (percent > 60 ? '#f59e0b' : '#22c55e');
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Círculo central
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 20, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#1c2333';
    ctx.fill();
  }

  // ===== MANUTENÇÕES =====

  /**
   * Manipula submit do formulário de manutenção
   */
  function handleMaintSubmit(e) {
    e.preventDefault();

    const editId = document.getElementById('maint-edit-id').value;
    const date = document.getElementById('maint-date').value;
    const km = parseFloat(document.getElementById('maint-km').value) || 0;
    const type = document.getElementById('maint-type').value;
    const description = document.getElementById('maint-description').value.trim();
    const cost = parseFloat(document.getElementById('maint-cost').value) || 0;
    const nextKm = parseFloat(document.getElementById('maint-next-km').value) || 0;
    const nextMonths = parseInt(document.getElementById('maint-next-months').value) || 0;
    const notes = document.getElementById('maint-notes').value.trim();

    if (!date) {
      showToast('Preencha a data!', 'error');
      return;
    }

    const entry = { date, km, type, description, cost, nextKm, nextMonths, notes };

    if (editId) {
      Storage.updateMaintenanceEntry(editId, entry);
      showToast('Manutenção atualizada!', 'success');
    } else {
      Storage.addMaintenanceEntry(entry);
      showToast('Manutenção registrada!', 'success');
    }

    document.getElementById('maint-form').reset();
    setDefaultDate();
    cancelMaintEdit();
    renderMaintTable();
    App.updateAll();
  }

  /**
   * Cancela edição de manutenção
   */
  function cancelMaintEdit() {
    document.getElementById('maint-edit-id').value = '';
    document.getElementById('maint-submit-text').textContent = 'Registrar Manutenção';
    document.getElementById('maint-cancel-edit').style.display = 'none';
  }

  /**
   * Edita uma manutenção
   */
  function editMaintEntry(id) {
    const entries = Storage.getMaintenanceEntries();
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    document.getElementById('maint-edit-id').value = id;
    document.getElementById('maint-date').value = entry.date;
    document.getElementById('maint-km').value = entry.km || '';
    document.getElementById('maint-type').value = entry.type || 'Outro';
    document.getElementById('maint-description').value = entry.description || '';
    document.getElementById('maint-cost').value = entry.cost || '';
    document.getElementById('maint-next-km').value = entry.nextKm || '';
    document.getElementById('maint-next-months').value = entry.nextMonths || '';
    document.getElementById('maint-notes').value = entry.notes || '';

    document.getElementById('maint-submit-text').textContent = 'Atualizar Manutenção';
    document.getElementById('maint-cancel-edit').style.display = 'inline-flex';
    document.getElementById('maint-form').scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Exclui uma manutenção
   */
  function deleteMaintEntry(id) {
    showModal(
      'Excluir Manutenção',
      'Tem certeza que deseja excluir este registro?',
      [
        { text: 'Cancelar', class: 'btn btn-outline', action: closeModal },
        { text: 'Excluir', class: 'btn btn-danger', action: () => {
          Storage.deleteMaintenanceEntry(id);
          closeModal();
          renderMaintTable();
          App.updateAll();
          showToast('Registro excluído!', 'success');
        }}
      ]
    );
  }

  /**
   * Renderiza tabela de manutenções
   */
  function renderMaintTable() {
    const entries = Storage.getMaintenanceEntries();
    const tbody = document.getElementById('maint-table-body');
    const empty = document.getElementById('maint-table-empty');

    if (entries.length === 0) {
      tbody.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';
    const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = sorted.map(e => `
      <tr>
        <td>${formatDate(e.date)}</td>
        <td>${e.km ? formatNumber(e.km, 1) + ' km' : '-'}</td>
        <td><span class="badge badge-blue">${e.type || 'Outro'}</span></td>
        <td>${e.description || '-'}</td>
        <td>${e.cost ? 'R$ ' + formatNumber(e.cost, 2) : '-'}</td>
        <td>${e.notes || '-'}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn edit" onclick="Oil.editMaintEntry('${e.id}')" title="Editar">
              <i class="fas fa-pen"></i>
            </button>
            <button class="action-btn delete" onclick="Oil.deleteMaintEntry('${e.id}')" title="Excluir">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  return {
    init,
    renderTable,
    editEntry,
    deleteEntry,
    updateOilStatus,
    editMaintEntry,
    deleteMaintEntry,
    renderMaintTable
  };
})();
