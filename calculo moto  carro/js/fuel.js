/**
 * Módulo de Abastecimentos (Fuel)
 * Gerencia formulário, cálculos e tabela de abastecimentos
 */
const Fuel = (() => {
  let currentSort = { field: 'date', dir: 'desc' };
  let currentFilter = '';

  /**
   * Inicializa o módulo
   */
  function init() {
    bindEvents();
    setDefaultDate();
    calculateTotal();
  }

  /**
   * Define a data atual como padrão
   */
  function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fuel-date').value = today;
  }

  /**
   * Vincula eventos do formulário
   */
  function bindEvents() {
    const form = document.getElementById('fuel-form');
    form.addEventListener('submit', handleSubmit);

    document.getElementById('fuel-cancel-edit').addEventListener('click', cancelEdit);

    // Calcular valor total automaticamente
    document.getElementById('fuel-liters').addEventListener('input', calculateTotal);
    document.getElementById('fuel-price').addEventListener('input', calculateTotal);
    document.getElementById('fuel-total').addEventListener('input', function() {
      const liters = parseFloat(document.getElementById('fuel-liters').value) || 0;
      const total = parseFloat(this.value) || 0;
      if (liters > 0 && total > 0) {
        const price = total / liters;
        document.getElementById('fuel-price').value = price.toFixed(3);
      }
    });

    // Busca por posto
    document.getElementById('fuel-search').addEventListener('input', function() {
      currentFilter = this.value.toLowerCase();
      renderTable();
    });

    // Ordenação da tabela
    document.querySelectorAll('#fuel-table th.sortable').forEach(th => {
      th.addEventListener('click', function() {
        const field = this.dataset.sort;
        if (currentSort.field === field) {
          currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
          currentSort.field = field;
          currentSort.dir = 'desc';
        }
        renderTable();
      });
    });
  }

  /**
   * Calcula o valor total automaticamente
   */
  function calculateTotal() {
    const liters = parseFloat(document.getElementById('fuel-liters').value) || 0;
    const price = parseFloat(document.getElementById('fuel-price').value) || 0;
    if (liters > 0 && price > 0) {
      const total = liters * price;
      document.getElementById('fuel-total').value = total.toFixed(2);
    }
  }

  /**
   * Manipula o submit do formulário
   */
  function handleSubmit(e) {
    e.preventDefault();

    const editId = document.getElementById('fuel-edit-id').value;
    const date = document.getElementById('fuel-date').value;
    const odometer = parseFloat(document.getElementById('fuel-odometer').value);
    const liters = parseFloat(document.getElementById('fuel-liters').value);
    const type = document.getElementById('fuel-type').value;
    const station = document.getElementById('fuel-station').value.trim();
    const price = parseFloat(document.getElementById('fuel-price').value) || 0;
    const total = parseFloat(document.getElementById('fuel-total').value) || 0;
    const notes = document.getElementById('fuel-notes').value.trim();

    if (!date || isNaN(odometer) || isNaN(liters)) {
      showToast('Preencha todos os campos obrigatórios!', 'error');
      return;
    }

    // Foto do comprovante
    const receiptFile = document.getElementById('fuel-receipt').files[0];
    const processEntry = (receiptBase64) => {
      const entry = {
        date,
        odometer,
        liters,
        type,
        station,
        pricePerLiter: price,
        totalCost: total || liters * price,
        notes,
        receipt: receiptBase64 || null
      };

      if (editId) {
        Storage.updateFuelEntry(editId, entry);
        showToast('Abastecimento atualizado com sucesso!', 'success');
      } else {
        Storage.addFuelEntry(entry);
        showToast('Abastecimento registrado com sucesso!', 'success');
      }

      document.getElementById('fuel-form').reset();
      setDefaultDate();
      cancelEdit();
      renderTable();
      App.updateAll();
    };

    if (receiptFile) {
      const reader = new FileReader();
      reader.onload = (ev) => processEntry(ev.target.result);
      reader.readAsDataURL(receiptFile);
    } else {
      processEntry(null);
    }
  }

  /**
   * Cancela a edição
   */
  function cancelEdit() {
    document.getElementById('fuel-edit-id').value = '';
    document.getElementById('fuel-submit-text').textContent = 'Registrar Abastecimento';
    document.getElementById('fuel-cancel-edit').style.display = 'none';
    document.getElementById('fuel-receipt-preview').innerHTML = '';
  }

  /**
   * Carrega dados para edição
   */
  function editEntry(id) {
    const entries = Storage.getFuelEntries();
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    document.getElementById('fuel-edit-id').value = id;
    document.getElementById('fuel-date').value = entry.date;
    document.getElementById('fuel-odometer').value = entry.odometer;
    document.getElementById('fuel-liters').value = entry.liters;
    document.getElementById('fuel-type').value = entry.type || 'Comum';
    document.getElementById('fuel-station').value = entry.station || '';
    document.getElementById('fuel-price').value = entry.pricePerLiter || 0;
    document.getElementById('fuel-total').value = entry.totalCost || 0;
    document.getElementById('fuel-notes').value = entry.notes || '';

    if (entry.receipt) {
      document.getElementById('fuel-receipt-preview').innerHTML = `<img src="${entry.receipt}" alt="Comprovante">`;
    }

    document.getElementById('fuel-submit-text').textContent = 'Atualizar Abastecimento';
    document.getElementById('fuel-cancel-edit').style.display = 'inline-flex';

    document.getElementById('fuel-form').scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Exclui um abastecimento
   */
  function deleteEntry(id) {
    showModal(
      'Excluir Abastecimento',
      'Tem certeza que deseja excluir este abastecimento? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', class: 'btn btn-outline', action: closeModal },
        { text: 'Excluir', class: 'btn btn-danger', action: () => {
          Storage.deleteFuelEntry(id);
          closeModal();
          renderTable();
          App.updateAll();
          showToast('Abastecimento excluído!', 'success');
        }}
      ]
    );
  }

  /**
   * Renderiza a tabela de abastecimentos
   */
  function renderTable() {
    let entries = Storage.getFuelEntries();
    const tbody = document.getElementById('fuel-table-body');
    const empty = document.getElementById('fuel-table-empty');

    // Filtro por posto
    if (currentFilter) {
      entries = entries.filter(e =>
        (e.station && e.station.toLowerCase().includes(currentFilter))
      );
    }

    // Ordenação
    entries.sort((a, b) => {
      let valA, valB;
      switch (currentSort.field) {
        case 'date': valA = a.date; valB = b.date; break;
        case 'odometer': valA = a.odometer; valB = b.odometer; break;
        case 'liters': valA = a.liters; valB = b.liters; break;
        case 'kmDriven': valA = a._kmDriven || 0; valB = b._kmDriven || 0; break;
        case 'consumption': valA = a._consumption || 0; valB = b._consumption || 0; break;
        case 'totalCost': valA = a.totalCost || 0; valB = b.totalCost || 0; break;
        default: valA = a.date; valB = b.date;
      }
      if (currentSort.dir === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

    // Calcular km rodados e consumo para cada entrada
    for (let i = 0; i < entries.length; i++) {
      if (i < entries.length - 1) {
        entries[i]._kmDriven = entries[i].odometer - entries[i + 1].odometer;
        entries[i]._consumption = entries[i].liters > 0
          ? (entries[i]._kmDriven / entries[i].liters)
          : 0;
      } else {
        entries[i]._kmDriven = 0;
        entries[i]._consumption = 0;
      }
    }

    if (entries.length === 0) {
      tbody.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';
    tbody.innerHTML = entries.map(e => {
      const consumo = e._consumption || 0;
      const kmRodados = e._kmDriven || 0;
      return `
        <tr>
          <td>${formatDate(e.date)}</td>
          <td>${formatNumber(e.odometer, 1)} km</td>
          <td>${kmRodados > 0 ? formatNumber(kmRodados, 1) + ' km' : '-'}</td>
          <td>${formatNumber(e.liters, 2)} L</td>
          <td>${consumo > 0 ? formatNumber(consumo, 1) + ' km/L' : '-'}</td>
          <td><span class="badge ${getFuelBadgeClass(e.type)}">${e.type || 'Comum'}</span></td>
          <td>${e.totalCost ? 'R$ ' + formatNumber(e.totalCost, 2) : '-'}</td>
          <td>${e.station || '-'}</td>
          <td>
            <div class="action-btns">
              <button class="action-btn edit" onclick="Fuel.editEntry('${e.id}')" title="Editar">
                <i class="fas fa-pen"></i>
              </button>
              <button class="action-btn delete" onclick="Fuel.deleteEntry('${e.id}')" title="Excluir">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Retorna a classe do badge para o tipo de combustível
   */
  function getFuelBadgeClass(type) {
    switch (type) {
      case 'Premium': return 'badge-purple';
      case 'Aditivada': return 'badge-green';
      default: return 'badge-blue';
    }
  }

  return { init, renderTable, editEntry, deleteEntry };
})();
