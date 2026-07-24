/**
 * Módulo de Integração com Google Drive (Drive)
 * Gerencia backup e sincronização com Google Drive
 */
const Drive = (() => {
  const APP_FOLDER_NAME = CONFIG.DRIVE_FOLDER_NAME || 'Controle da Moto';
  const BACKUP_FILE_NAME = CONFIG.BACKUP_FILE_NAME || 'moto_data_backup.json';
  let accessToken = null;

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
    document.getElementById('google-sync-btn').addEventListener('click', syncNow);
    document.getElementById('google-restore-btn').addEventListener('click', restoreFromDrive);
    document.getElementById('sync-now-btn').addEventListener('click', syncNow);
  }

  /**
   * Define o token de acesso
   */
  function setAccessToken(token) {
    accessToken = token;
  }

  /**
   * Sincroniza agora
   */
  async function syncNow() {
    if (!accessToken) {
      showToast('Faça login primeiro!', 'warning');
      return;
    }

    showSyncProgress(true);
    updateSyncStatus('syncing', 'Sincronizando...');

    try {
      // Verificar/conectar se a pasta existe
      const folderId = await findOrCreateFolder();

      // Exportar dados
      const data = Storage.exportAllData();
      const content = JSON.stringify(data, null, 2);

      // Verificar se já existe arquivo de backup
      const fileId = await findFile(folderId, BACKUP_FILE_NAME);

      if (fileId) {
        // Verificar conflito
        const remoteData = await downloadFile(fileId);
        if (remoteData) {
          const conflict = detectConflict(data, remoteData);
          if (conflict) {
            showSyncProgress(false);
            resolveConflict(conflict, fileId, content, data);
            return;
          }
        }

        // Atualizar arquivo existente
        await updateFile(fileId, content);
      } else {
        // Criar novo arquivo
        await createFile(folderId, BACKUP_FILE_NAME, content);
      }

      Storage.saveLastSyncTime();
      updateSyncStatus('connected', 'Sincronizado com sucesso!');
      showToast('Sincronização concluída!', 'success');
    } catch (e) {
      console.error('Erro na sincronização:', e);
      updateSyncStatus('error', 'Erro na sincronização: ' + e.message);
      showToast('Erro ao sincronizar: ' + e.message, 'error');
    }

    showSyncProgress(false);
  }

  /**
   * Restaura backup do Google Drive
   */
  async function restoreFromDrive() {
    if (!accessToken) {
      showToast('Faça login primeiro!', 'warning');
      return;
    }

    showModal(
      'Restaurar Backup',
      'Isso substituirá todos os dados locais pelos dados salvos no Google Drive. Tem certeza?',
      [
        { text: 'Cancelar', class: 'btn btn-outline', action: closeModal },
        {
          text: 'Restaurar',
          class: 'btn btn-warning',
          action: async () => {
            closeModal();
            showSyncProgress(true);
            updateSyncStatus('syncing', 'Restaurando...');

            try {
              const folderId = await findOrCreateFolder();
              const fileId = await findFile(folderId, BACKUP_FILE_NAME);

              if (!fileId) {
                throw new Error('Nenhum backup encontrado no Google Drive.');
              }

              const remoteData = await downloadFile(fileId);
              if (!remoteData) {
                throw new Error('Erro ao ler backup do Google Drive.');
              }

              const result = Storage.importAllData(remoteData);
              if (result) {
                Storage.saveLastSyncTime();
                updateSyncStatus('connected', 'Backup restaurado com sucesso!');
                showToast('Dados restaurados do Google Drive!', 'success');
                App.updateAll();
              } else {
                throw new Error('Formato de dados inválido.');
              }
            } catch (e) {
              updateSyncStatus('error', 'Erro ao restaurar: ' + e.message);
              showToast('Erro ao restaurar: ' + e.message, 'error');
            }

            showSyncProgress(false);
          }
        }
      ]
    );
  }

  /**
   * Encontra ou cria a pasta do aplicativo
   */
  async function findOrCreateFolder() {
    // Procurar pasta
    const response = await gapiCall(
      `https://www.googleapis.com/drive/v3/files`,
      'GET',
      {
        q: `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)'
      }
    );

    if (response.files && response.files.length > 0) {
      return response.files[0].id;
    }

    // Criar pasta
    const createResponse = await gapiCall(
      'https://www.googleapis.com/drive/v3/files',
      'POST',
      {
        name: APP_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder'
      }
    );

    return createResponse.id;
  }

  /**
   * Procura um arquivo na pasta
   */
  async function findFile(folderId, fileName) {
    const response = await gapiCall(
      'https://www.googleapis.com/drive/v3/files',
      'GET',
      {
        q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
        fields: 'files(id, name)'
      }
    );

    if (response.files && response.files.length > 0) {
      return response.files[0].id;
    }
    return null;
  }

  /**
   * Cria um arquivo
   */
  async function createFile(folderId, fileName, content) {
    const boundary = 'boundary_' + Date.now();
    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify({
        name: fileName,
        parents: [folderId],
        mimeType: 'application/json'
      }),
      `--${boundary}`,
      'Content-Type: application/json',
      '',
      content,
      `--${boundary}--`
    ].join('\r\n');

    return await gapiCall(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      'POST',
      body,
      {
        'Content-Type': `multipart/related; boundary=${boundary}`
      }
    );
  }

  /**
   * Atualiza um arquivo existente
   */
  async function updateFile(fileId, content) {
    return await gapiCall(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      'PATCH',
      content,
      { 'Content-Type': 'application/json' }
    );
  }

  /**
   * Baixa um arquivo
   */
  async function downloadFile(fileId) {
    try {
      const response = await gapiCall(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        'GET',
        null
      );
      return response;
    } catch (e) {
      console.error('Erro ao baixar arquivo:', e);
      return null;
    }
  }

  /**
   * Detecta conflito entre versões
   */
  function detectConflict(localData, remoteData) {
    if (!localData || !remoteData) return null;

    const localTime = new Date(localData.exportedAt || 0).getTime();
    const remoteTime = new Date(remoteData.exportedAt || 0).getTime();

    if (Math.abs(localTime - remoteTime) < 60000) return null; // Mesma versão

    const localCount = (localData.fuel ? localData.fuel.length : 0) +
                      (localData.oil ? localData.oil.length : 0);
    const remoteCount = (remoteData.fuel ? remoteData.fuel.length : 0) +
                       (remoteData.oil ? remoteData.oil.length : 0);

    if (localCount === remoteCount) return null;

    return {
      localEntries: localCount,
      remoteEntries: remoteCount,
      localTime: localData.exportedAt,
      remoteTime: remoteData.exportedAt
    };
  }

  /**
   * Resolve conflito perguntando ao usuário
   */
  function resolveConflict(conflict, fileId, content, localData) {
    showModal(
      'Conflito Detectado',
      `Foram encontradas duas versões diferentes dos dados:

      <div style="margin:16px 0;padding:12px;background:var(--bg-hover);border-radius:8px;">
        <p><strong>Versão Local:</strong> ${conflict.localEntries} registros (${new Date(conflict.localTime).toLocaleString('pt-BR')})</p>
        <p><strong>Versão Cloud:</strong> ${conflict.remoteEntries} registros (${new Date(conflict.remoteTime).toLocaleString('pt-BR')})</p>
      </div>

      Qual versão deseja manter?`,
      [
        { text: 'Manter Local', class: 'btn btn-outline', action: async () => {
          closeModal();
          try {
            await updateFile(fileId, content);
            Storage.saveLastSyncTime();
            showToast('Versão local enviada para a nuvem!', 'success');
            updateSyncStatus('connected', 'Sincronizado (versão local)');
          } catch (e) {
            showToast('Erro ao sincronizar: ' + e.message, 'error');
          }
        }},
        { text: 'Manter Cloud', class: 'btn btn-primary', action: async () => {
          closeModal();
          try {
            const remoteData = await downloadFile(fileId);
            if (remoteData) {
              Storage.importAllData(remoteData);
              Storage.saveLastSyncTime();
              App.updateAll();
              showToast('Dados da nuvem restaurados localmente!', 'success');
              updateSyncStatus('connected', 'Sincronizado (versão cloud)');
            }
          } catch (e) {
            showToast('Erro: ' + e.message, 'error');
          }
        }},
        { text: 'Mesclar', class: 'btn btn-outline', action: async () => {
          closeModal();
          showToast('Função de mesclagem disponível em breve!', 'info');
        }}
      ]
    );
  }

  /**
   * Realiza chamada à API do Google
   */
  async function gapiCall(url, method, body, extraHeaders = {}) {
    if (!accessToken) throw new Error('Não autenticado');

    const options = {
      method,
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        ...extraHeaders
      }
    };

    if (body && method !== 'GET') {
      if (typeof body === 'string') {
        options.body = body;
      } else {
        options.body = JSON.stringify(body);
        options.headers['Content-Type'] = 'application/json';
      }
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    // Se for download, retorna como JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    // Para uploads que retornam JSON
    try {
      return await response.json();
    } catch (e) {
      return await response.text();
    }
  }

  /**
   * Atualiza o status da sincronização na UI
   */
  function updateSyncStatus(type, message) {
    const mainIcon = document.getElementById('sync-main-icon');
    const mainText = document.getElementById('sync-main-text');
    const mainDetail = document.getElementById('sync-main-detail');
    const errorMsg = document.getElementById('sync-error-msg');

    switch (type) {
      case 'connected':
        mainIcon.className = 'fas fa-cloud connected';
        mainText.textContent = 'Sincronizado';
        mainDetail.textContent = message;
        errorMsg.style.display = 'none';
        document.getElementById('sync-text').textContent = 'Sincronizado';
        document.getElementById('sync-status').querySelector('i').className = 'fas fa-cloud';
        document.getElementById('sync-status').querySelector('i').style.color = 'var(--accent-green)';
        break;

      case 'syncing':
        mainIcon.className = 'fas fa-sync-alt syncing';
        mainIcon.style.animation = 'spin 1s linear infinite';
        mainText.textContent = 'Sincronizando...';
        mainDetail.textContent = message;
        errorMsg.style.display = 'none';
        document.getElementById('sync-text').textContent = 'Sincronizando...';
        break;

      case 'error':
        mainIcon.className = 'fas fa-exclamation-triangle error';
        mainIcon.style.animation = '';
        mainText.textContent = 'Erro na sincronização';
        mainDetail.textContent = '';
        errorMsg.style.display = 'block';
        errorMsg.textContent = message;
        document.getElementById('sync-text').textContent = 'Erro';
        document.getElementById('sync-status').querySelector('i').className = 'fas fa-exclamation-triangle';
        document.getElementById('sync-status').querySelector('i').style.color = 'var(--accent-red)';
        break;

      default:
        mainIcon.className = 'fas fa-cloud';
        mainText.textContent = 'Não conectado';
        mainDetail.textContent = message || 'Faça login com sua conta Google.';
        errorMsg.style.display = 'none';
    }

    const lastSync = Storage.getLastSyncTime();
    const timestamp = document.getElementById('sync-timestamp');
    if (lastSync && type !== 'syncing') {
      timestamp.style.display = 'block';
      timestamp.textContent = 'Última sincronização: ' + new Date(lastSync).toLocaleString('pt-BR');
    }
  }

  /**
   * Mostra/esconde barra de progresso
   */
  function showSyncProgress(show) {
    document.getElementById('sync-progress').style.display = show ? 'block' : 'none';
  }

  return { init, setAccessToken, syncNow, restoreFromDrive };
})();
