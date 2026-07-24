/**
 * Módulo Principal (App)
 * Inicialização, navegação, tema, modais, utilitários
 */
const App = (() => {

  /**
   * Inicializa o sistema
   */
  function init() {
    // Aplicar tema salvo
    applyTheme();

    // Inicializar módulos
    Storage.getSettings(); // Garantir configurações padrão
    Fuel.init();
    Oil.init();
    Dashboard.init();
    Charts.init();
    Exporter.init();
    Auth.init();
    Drive.init();
    Notifications.init();

    // Configurar navegação e eventos
    setupNavigation();
    setupThemeToggle();
    setupSettings();
    setupAutoBackup();
    setupHistoryFilters();

    // Renderizar dados
    updateAll();

    // Esconder splash screen
    setTimeout(() => {
      document.getElementById('splash-screen').classList.add('hidden');
    }, 800);

    // Registrar Service Worker
    registerSW();

    // Resize handler for charts
    setupResizeHandler();

    console.log('Controle da Moto v2.0 - Sistema iniciado!');
  }

  /**
   * Registra o Service Worker
   */
  function registerSW() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
          .then(reg => {
            console.log('Service Worker registrado!', reg.scope);

            // Verificar atualizações
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  showToast('Nova versão disponível! Atualize a página.', 'info', 10000);
                }
              });
            });
          })
          .catch(err => console.error('Erro ao registrar SW:', err));
      });
    }
  }

  /**
   * Atualiza todos os componentes
   */
  function updateAll() {
    Fuel.renderTable();
    Oil.renderTable();
    Oil.renderMaintTable();
    Oil.updateOilStatus();
    Dashboard.update();
    Charts.renderAllCharts();
    Charts.updateStationFilter();
    updateHistoryTable();
    updatePageTitle();
  }

  /**
   * Configura a navegação entre páginas
   */
  function setupNavigation() {
    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        navigateTo(page);
      });
    });

    // Sidebar toggle
    document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-close').addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-overlay').addEventListener('click', toggleSidebar);

    // Botão add leva para página relevante
    document.getElementById('add-btn').addEventListener('click', () => {
      const currentPage = getCurrentPage();
      if (currentPage === 'dashboard') navigateTo('fuel');
      else if (currentPage === 'fuel') document.getElementById('fuel-form').scrollIntoView({ behavior: 'smooth' });
      else if (currentPage === 'oil') document.getElementById('oil-form').scrollIntoView({ behavior: 'smooth' });
      else if (currentPage === 'maintenance') document.getElementById('maint-form').scrollIntoView({ behavior: 'smooth' });
      else navigateTo('fuel');
    });
  }

  /**
   * Navega para uma página
   */
  function navigateTo(page) {
    // Esconder todas as páginas
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Mostrar página alvo
    const target = document.getElementById('page-' + page);
    if (target) {
      target.classList.add('active');
    }

    // Atualizar nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // Atualizar título
    const titles = {
      dashboard: 'Dashboard',
      fuel: 'Abastecimentos',
      oil: 'Troca de Óleo',
      maintenance: 'Manutenções',
      charts: 'Gráficos',
      history: 'Histórico',
      export: 'Exportar / Importar',
      sync: 'Sincronizar',
      settings: 'Configurações'
    };
    document.getElementById('page-title').textContent = titles[page] || 'Dashboard';

    // Fechar sidebar em mobile
    if (window.innerWidth <= 768) {
      closeSidebar();
    }

    // Renderizar gráficos se página de gráficos
    if (page === 'charts') {
      Charts.renderAllCharts();
    }

    // Atualizar tabela de histórico
    if (page === 'history') {
      updateHistoryTable();
    }
  }

  /**
   * Alterna sidebar
   */
  function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('show');
  }

  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('show');
  }

  /**
   * Retorna a página atual
   */
  function getCurrentPage() {
    const active = document.querySelector('.nav-item.active');
    return active ? active.dataset.page : 'dashboard';
  }

  /**
   * Configura alternância de tema
   */
  function setupThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    const settingsToggle = document.getElementById('settings-theme-toggle');
    const themeText = document.getElementById('settings-theme-text');

    function toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme');
      const newTheme = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      Storage.saveSettings({ theme: newTheme });

      const icon = toggleBtn.querySelector('i');
      icon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
      themeText.textContent = newTheme === 'dark' ? 'Modo Escuro' : 'Modo Claro';
    }

    toggleBtn.addEventListener('click', toggleTheme);
    settingsToggle.addEventListener('click', toggleTheme);
  }

  /**
   * Aplica o tema salvo
   */
  function applyTheme() {
    const settings = Storage.getSettings();
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark');

    const icon = document.getElementById('theme-toggle').querySelector('i');
    icon.className = settings.theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
  }

  /**
   * Configura as configurações
   */
  function setupSettings() {
    const settings = Storage.getSettings();

    document.getElementById('settings-oil-interval').value = settings.oilIntervalKm || 3000;
    document.getElementById('settings-oil-months').value = settings.oilIntervalMonths || 6;
    document.getElementById('settings-unit').value = settings.unit || 'km';

    document.getElementById('settings-oil-interval').addEventListener('change', function() {
      Storage.saveSettings({ oilIntervalKm: parseInt(this.value) || 3000 });
      Oil.updateOilStatus();
    });

    document.getElementById('settings-oil-months').addEventListener('change', function() {
      Storage.saveSettings({ oilIntervalMonths: parseInt(this.value) || 6 });
      Oil.updateOilStatus();
    });

    document.getElementById('settings-unit').addEventListener('change', function() {
      Storage.saveSettings({ unit: this.value });
      updateAll();
    });
  }

  /**
   * Configura backup automático (a cada 5 minutos)
   */
  function setupAutoBackup() {
    // Backup automático para JSON local a cada 5 min
    setInterval(() => {
      try {
        const data = Storage.exportAllData();
        Storage.saveSyncData({ autoBackup: data, lastBackup: new Date().toISOString() });
      } catch (e) {
        // Silent fail
      }
    }, 300000);

    // Verificar se precisa notificar sobre óleo a cada hora
    setInterval(() => {
      Notifications.scheduleOilReminder();
    }, 3600000);
  }

  /**
   * Atualiza a página de histórico completo
   */
  function updateHistoryTable() {
    const tbody = document.getElementById('history-table-body');
    const empty = document.getElementById('history-table-empty');
    const search = document.getElementById('history-search')?.value?.toLowerCase() || '';
    const dateStart = document.getElementById('history-date-start')?.value || '';
    const dateEnd = document.getElementById('history-date-end')?.value || '';
    const typeFilter = document.getElementById('history-type')?.value || 'all';
    const fuelFilter = document.getElementById('history-fuel-type')?.value || 'all';

    // Coletar todos os registros
    const fuelEntries = Storage.getFuelEntries().map(e => ({ ...e, _type: 'fuel', _typeLabel: 'Abastecimento' }));
    const oilEntries = Storage.getOilChanges().map(e => ({ ...e, _type: 'oil', _typeLabel: 'Troca de Óleo' }));
    const maintEntries = Storage.getMaintenanceEntries().map(e => ({ ...e, _type: 'maintenance', _typeLabel: 'Manutenção' }));

    let allEntries = [...fuelEntries, ...oilEntries, ...maintEntries];

    // Aplicar filtros
    if (typeFilter !== 'all') {
      allEntries = allEntries.filter(e => e._type === typeFilter);
    }

    if (fuelFilter !== 'all') {
      allEntries = allEntries.filter(e => e._type !== 'fuel' || e.type === fuelFilter);
    }

    if (dateStart) {
      allEntries = allEntries.filter(e => e.date >= dateStart);
    }
    if (dateEnd) {
      allEntries = allEntries.filter(e => e.date <= dateEnd);
    }

    if (search) {
      allEntries = allEntries.filter(e => {
        const searchStr = JSON.stringify(e).toLowerCase();
        return searchStr.includes(search);
      });
    }

    // Ordenar por data (mais recente primeiro)
    allEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (allEntries.length === 0) {
      tbody.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';

    tbody.innerHTML = allEntries.map(e => {
      let details = '';
      let typeBadge = '';

      if (e._type === 'fuel') {
        typeBadge = '<span class="badge badge-blue">Abastecimento</span>';
        details = `${e.liters}L - ${e.type || 'Comum'}${e.station ? ' - ' + e.station : ''}`;
      } else if (e._type === 'oil') {
        typeBadge = '<span class="badge badge-yellow">Troca de Óleo</span>';
        details = `${e.brand || ''} ${e.type || ''} ${e.viscosity || ''}`.trim() || '-';
      } else {
        typeBadge = '<span class="badge badge-purple">Manutenção</span>';
        details = `${e.type || ''}${e.description ? ' - ' + e.description : ''}`;
      }

      const value = e.totalCost || e.cost || 0;

      return `
        <tr>
          <td>${typeBadge}</td>
          <td>${formatDate(e.date)}</td>
          <td>${e.odometer || e.km || '-'}</td>
          <td>${details}</td>
          <td>${value ? 'R$ ' + formatNumber(value, 2) : '-'}</td>
          <td>
            <div class="action-btns">
              ${e._type === 'fuel' ? `<button class="action-btn edit" onclick="App.navigateTo('fuel'); Fuel.editEntry('${e.id}')" title="Editar"><i class="fas fa-pen"></i></button>` : ''}
              ${e._type === 'oil' ? `<button class="action-btn edit" onclick="App.navigateTo('oil'); Oil.editEntry('${e.id}')" title="Editar"><i class="fas fa-pen"></i></button>` : ''}
              ${e._type === 'maintenance' ? `<button class="action-btn edit" onclick="App.navigateTo('maintenance'); Oil.editMaintEntry('${e.id}')" title="Editar"><i class="fas fa-pen"></i></button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

  }

  /**
   * Configura os filtros da página de histórico
   */
  function setupHistoryFilters() {
    ['history-search', 'history-date-start', 'history-date-end', 'history-type', 'history-fuel-type'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', updateHistoryTable);
        el.addEventListener('change', updateHistoryTable);
      }
    });
  }

  /**
   * Atualiza o título da página baseado nos dados
   */
  function updatePageTitle() {
    const settings = Storage.getSettings();
    const entries = Storage.getFuelEntries();
    const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;

    if (lastEntry) {
      document.title = `${settings.motoName} - ${formatNumber(lastEntry.odometer, 0)} km`;
    } else {
      document.title = `${settings.motoName} - Controle da Moto`;
    }
  }

  /**
   * Configura handler de redimensionamento para gráficos
   */
  function setupResizeHandler() {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        Dashboard.updateCharts();
        Charts.renderAllCharts();
      }, 250);
    });

    // Observer para redimensionamento de elementos
    if (window.ResizeObserver) {
      const chartContainers = document.querySelectorAll('.chart-card canvas');
      chartContainers.forEach(canvas => {
        const observer = new ResizeObserver(() => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            Dashboard.updateCharts();
            Charts.renderAllCharts();
          }, 300);
        });
        observer.observe(canvas.parentElement);
      });
    }
  }

  /**
   * Fecha sidebar ao navegar em mobile
   */
  function closeSidebarOnNavigate() {
    if (window.innerWidth <= 768) {
      closeSidebar();
    }
  }

  return { init, updateAll, navigateTo, closeSidebarOnNavigate };
})();

// ===== UTILITÁRIOS GLOBAIS =====

/**
 * Formata data no padrão brasileiro
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR');
}

/**
 * Formata número
 */
function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return Number(value).toFixed(decimals).replace('.', ',');
}

/**
 * Mostra toast notification
 */
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Mostra modal
 */
function showModal(title, bodyHTML, buttons = []) {
  const overlay = document.getElementById('modal-overlay');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalFooter = document.getElementById('modal-footer');

  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHTML;
  modalFooter.innerHTML = '';

  buttons.forEach(btn => {
    const el = document.createElement('button');
    el.innerHTML = btn.text;
    el.className = btn.class;
    el.addEventListener('click', btn.action);
    modalFooter.appendChild(el);
  });

  overlay.style.display = 'flex';
  document.getElementById('modal-close').addEventListener('click', closeModal);
}

/**
 * Fecha modal
 */
function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

// Iniciar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
