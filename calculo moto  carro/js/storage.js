/**
 * Módulo de Armazenamento (Storage)
 * Gerencia todas as operações de LocalStorage e dados do sistema
 */
const Storage = (() => {
  const KEYS = {
    FUEL: 'moto_fuel',
    OIL: 'moto_oil',
    MAINT: 'moto_maintenance',
    SETTINGS: 'moto_settings',
    SYNC: 'moto_sync',
    LAST_SYNC: 'moto_last_sync',
    MOTO_PHOTO: 'moto_photo'
  };

  /**
   * Obtém dados do LocalStorage
   */
  function getData(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Erro ao ler ${key}:`, e);
      return null;
    }
  }

  /**
   * Salva dados no LocalStorage
   */
  function setData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error(`Erro ao salvar ${key}:`, e);
      return false;
    }
  }

  /**
   * Remove dados do LocalStorage
   */
  function removeData(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error(`Erro ao remover ${key}:`, e);
      return false;
    }
  }

  /**
   * Configurações padrão
   */
  function getDefaultSettings() {
    return {
      motoName: 'Minha Moto',
      theme: 'dark',
      unit: 'km',
      oilIntervalKm: 3000,
      oilIntervalMonths: 6
    };
  }

  /**
   * Obtém as configurações
   */
  function getSettings() {
    const settings = getData(KEYS.SETTINGS);
    return settings ? { ...getDefaultSettings(), ...settings } : getDefaultSettings();
  }

  /**
   * Salva as configurações
   */
  function saveSettings(settings) {
    const current = getSettings();
    const updated = { ...current, ...settings };
    return setData(KEYS.SETTINGS, updated);
  }

  /**
   * Obtém todos os abastecimentos
   */
  function getFuelEntries() {
    return getData(KEYS.FUEL) || [];
  }

  /**
   * Salva todos os abastecimentos
   */
  function saveFuelEntries(entries) {
    return setData(KEYS.FUEL, entries);
  }

  /**
   * Adiciona um abastecimento
   */
  function addFuelEntry(entry) {
    const entries = getFuelEntries();
    entry.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    entry.createdAt = new Date().toISOString();
    entries.push(entry);
    saveFuelEntries(entries);
    return entry;
  }

  /**
   * Atualiza um abastecimento
   */
  function updateFuelEntry(id, data) {
    const entries = getFuelEntries();
    const idx = entries.findIndex(e => e.id === id);
    if (idx === -1) return null;
    entries[idx] = { ...entries[idx], ...data, updatedAt: new Date().toISOString() };
    saveFuelEntries(entries);
    return entries[idx];
  }

  /**
   * Remove um abastecimento
   */
  function deleteFuelEntry(id) {
    let entries = getFuelEntries();
    entries = entries.filter(e => e.id !== id);
    saveFuelEntries(entries);
  }

  /**
   * Obtém todas as trocas de óleo
   */
  function getOilChanges() {
    return getData(KEYS.OIL) || [];
  }

  /**
   * Salva todas as trocas de óleo
   */
  function saveOilChanges(entries) {
    return setData(KEYS.OIL, entries);
  }

  /**
   * Adiciona uma troca de óleo
   */
  function addOilChange(entry) {
    const entries = getOilChanges();
    entry.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    entry.createdAt = new Date().toISOString();
    entries.push(entry);
    saveOilChanges(entries);
    return entry;
  }

  /**
   * Atualiza uma troca de óleo
   */
  function updateOilChange(id, data) {
    const entries = getOilChanges();
    const idx = entries.findIndex(e => e.id === id);
    if (idx === -1) return null;
    entries[idx] = { ...entries[idx], ...data, updatedAt: new Date().toISOString() };
    saveOilChanges(entries);
    return entries[idx];
  }

  /**
   * Remove uma troca de óleo
   */
  function deleteOilChange(id) {
    let entries = getOilChanges();
    entries = entries.filter(e => e.id !== id);
    saveOilChanges(entries);
  }

  /**
   * Obtém a última troca de óleo
   */
  function getLastOilChange() {
    const entries = getOilChanges();
    if (entries.length === 0) return null;
    return entries.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  }

  /**
   * Obtém todas as manutenções
   */
  function getMaintenanceEntries() {
    return getData(KEYS.MAINT) || [];
  }

  /**
   * Salva todas as manutenções
   */
  function saveMaintenanceEntries(entries) {
    return setData(KEYS.MAINT, entries);
  }

  /**
   * Adiciona uma manutenção
   */
  function addMaintenanceEntry(entry) {
    const entries = getMaintenanceEntries();
    entry.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    entry.createdAt = new Date().toISOString();
    entries.push(entry);
    saveMaintenanceEntries(entries);
    return entry;
  }

  /**
   * Atualiza uma manutenção
   */
  function updateMaintenanceEntry(id, data) {
    const entries = getMaintenanceEntries();
    const idx = entries.findIndex(e => e.id === id);
    if (idx === -1) return null;
    entries[idx] = { ...entries[idx], ...data, updatedAt: new Date().toISOString() };
    saveMaintenanceEntries(entries);
    return entries[idx];
  }

  /**
   * Remove uma manutenção
   */
  function deleteMaintenanceEntry(id) {
    let entries = getMaintenanceEntries();
    entries = entries.filter(e => e.id !== id);
    saveMaintenanceEntries(entries);
  }

  /**
   * Salva a foto da moto como base64
   */
  function saveMotoPhoto(base64) {
    return setData(KEYS.MOTO_PHOTO, base64);
  }

  /**
   * Obtém a foto da moto
   */
  function getMotoPhoto() {
    return getData(KEYS.MOTO_PHOTO);
  }

  /**
   * Remove a foto da moto
   */
  function removeMotoPhoto() {
    return removeData(KEYS.MOTO_PHOTO);
  }

  /**
   * Salva dados de sincronização
   */
  function saveSyncData(data) {
    return setData(KEYS.SYNC, data);
  }

  /**
   * Obtém dados de sincronização
   */
  function getSyncData() {
    return getData(KEYS.SYNC) || {};
  }

  /**
   * Salva timestamp da última sincronização
   */
  function saveLastSyncTime() {
    return setData(KEYS.LAST_SYNC, new Date().toISOString());
  }

  /**
   * Obtém timestamp da última sincronização
   */
  function getLastSyncTime() {
    return getData(KEYS.LAST_SYNC);
  }

  /**
   * Exporta todos os dados como objeto
   */
  function exportAllData() {
    return {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      settings: getSettings(),
      fuel: getFuelEntries(),
      oil: getOilChanges(),
      maintenance: getMaintenanceEntries(),
      motoPhoto: getMotoPhoto()
    };
  }

  /**
   * Importa todos os dados de um objeto
   */
  function importAllData(data) {
    if (!data || !data.version) return false;
    if (data.settings) saveSettings(data.settings);
    if (data.fuel) saveFuelEntries(data.fuel);
    if (data.oil) saveOilChanges(data.oil);
    if (data.maintenance) saveMaintenanceEntries(data.maintenance);
    if (data.motoPhoto) saveMotoPhoto(data.motoPhoto);
    return true;
  }

  /**
   * Limpa todos os dados
   */
  function clearAllData() {
    removeData(KEYS.FUEL);
    removeData(KEYS.OIL);
    removeData(KEYS.MAINT);
    removeData(KEYS.MOTO_PHOTO);
    saveSettings(getDefaultSettings());
  }

  /**
   * Obtém o tamanho usado no LocalStorage
   */
  function getStorageSize() {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length * 2; // UTF-16
      }
    }
    return total;
  }

  return {
    // Abastecimentos
    getFuelEntries,
    saveFuelEntries,
    addFuelEntry,
    updateFuelEntry,
    deleteFuelEntry,
    // Óleo
    getOilChanges,
    saveOilChanges,
    addOilChange,
    updateOilChange,
    deleteOilChange,
    getLastOilChange,
    // Manutenções
    getMaintenanceEntries,
    saveMaintenanceEntries,
    addMaintenanceEntry,
    updateMaintenanceEntry,
    deleteMaintenanceEntry,
    // Configurações
    getSettings,
    saveSettings,
    // Foto
    saveMotoPhoto,
    getMotoPhoto,
    removeMotoPhoto,
    // Sincronização
    saveSyncData,
    getSyncData,
    saveLastSyncTime,
    getLastSyncTime,
    // Utilitários
    exportAllData,
    importAllData,
    clearAllData,
    getStorageSize
  };
})();
