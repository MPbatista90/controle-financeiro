/**
 * Módulo de Notificações (Notifications)
 * Gerencia notificações locais e lembretes
 */
const Notifications = (() => {

  /**
   * Inicializa o módulo
   */
  function init() {
    checkPermission();
    scheduleOilReminder();
  }

  /**
   * Verifica permissão para notificações
   */
  function checkPermission() {
    if (!('Notification' in window)) {
      console.log('Notificações não suportadas neste navegador.');
      return;
    }

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  /**
   * Envia uma notificação
   */
  function sendNotification(title, body, icon = 'icons/icon-192.png') {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      const notif = new Notification(title, {
        body,
        icon,
        badge: 'icons/icon-192.png',
        vibrate: [200, 100, 200],
        tag: 'moto-reminder'
      });

      setTimeout(() => notif.close(), 10000);
    } catch (e) {
      console.error('Erro ao enviar notificação:', e);
    }
  }

  /**
   * Agenda lembrete de troca de óleo
   */
  function scheduleOilReminder() {
    const lastOil = Storage.getLastOilChange();
    if (!lastOil) return;

    const settings = Storage.getSettings();
    const intervalKm = lastOil.intervalKm || settings.oilIntervalKm || 3000;
    const fuelEntries = Storage.getFuelEntries();
    const currentKm = fuelEntries.length > 0
      ? Math.max(...fuelEntries.map(e => e.odometer))
      : lastOil.km;

    const kmSinceLast = currentKm - lastOil.km;
    const kmRemaining = Math.max(0, (lastOil.km + intervalKm) - currentKm);

    // Verificar se precisa notificar (quando faltar menos de 100 km)
    if (kmRemaining > 0 && kmRemaining < 100) {
      sendNotification(
        '🛵 Troca de Óleo em Breve',
        `Faltam apenas ${Math.round(kmRemaining)} km para a troca de óleo da sua moto!`
      );
    }

    // Se venceu
    if (kmSinceLast >= intervalKm) {
      sendNotification(
        '🛵 Troca de Óleo Vencida!',
        `Você já rodou ${Math.round(kmSinceLast)} km desde a última troca de óleo. Providencie a troca!`
      );
    }

    // Verificar por tempo
    const lastDate = new Date(lastOil.date);
    const today = new Date();
    const monthsSince = (today.getFullYear() - lastDate.getFullYear()) * 12 +
                        (today.getMonth() - lastDate.getMonth());
    const intervalMonths = lastOil.intervalMonths || settings.oilIntervalMonths || 6;

    if (monthsSince >= intervalMonths) {
      sendNotification(
        '🛵 Troca de Óleo por Tempo',
        `Já se passaram ${monthsSince} meses desde a última troca de óleo.`
      );
    }
  }

  /**
   * Notifica quando dados são alterados
   */
  function notifyDataChange(type) {
    const messages = {
      fuel_add: 'Novo abastecimento registrado!',
      fuel_update: 'Abastecimento atualizado.',
      fuel_delete: 'Abastecimento removido.',
      oil_add: 'Troca de óleo registrada!',
      oil_update: 'Troca de óleo atualizada.',
      oil_delete: 'Registro de óleo removido.',
      maint_add: 'Nova manutenção registrada!',
      maint_update: 'Manutenção atualizada.',
      maint_delete: 'Manutenção removida.'
    };

    const message = messages[type] || 'Dados atualizados.';
    // Toast notification already handled by the respective module
    // This is for system notifications when in background
  }

  return {
    init,
    sendNotification,
    scheduleOilReminder,
    notifyDataChange
  };
})();
