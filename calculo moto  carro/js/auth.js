/**
 * Módulo de Autenticação (Auth)
 * Gerencia autenticação OAuth 2.0 com Google
 *
 * As credenciais são lidas do arquivo config.js.
 * Siga o guia SETUP-GOOGLE-DRIVE.md para configurar.
 */
const Auth = (() => {
  const CLIENT_ID = CONFIG.GOOGLE_CLIENT_ID;
  const API_KEY = CONFIG.GOOGLE_API_KEY;
  const SCOPES = CONFIG.GOOGLE_SCOPES;

  let tokenClient = null;
  let accessToken = null;
  let isAuthorized = false;

  /**
   * Inicializa o módulo de autenticação
   */
  function init() {
    if (!CLIENT_ID) {
      console.warn('Auth: GOOGLE_CLIENT_ID não configurado. Sincronização com Drive desabilitada.');
      updateUI();
      return;
    }
    loadToken();
    bindEvents();
    updateUI();
  }

  /**
   * Vincula eventos
   */
  function bindEvents() {
    document.getElementById('google-login-btn').addEventListener('click', login);
    document.getElementById('google-logout-btn').addEventListener('click', logout);
  }

  /**
   * Inicia o processo de login
   */
  function login() {
    if (!CLIENT_ID) {
      showToast('Configure o Google Client ID em js/config.js', 'warning');
      return;
    }
    if (typeof google === 'undefined' || typeof google.accounts === 'undefined') {
      showToast('Carregando API do Google...', 'info');
      loadGoogleAPI().then(() => doLogin());
      return;
    }
    doLogin();
  }

  /**
   * Carrega a API do Google dinamicamente
   */
  function loadGoogleAPI() {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.accounts) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        gapi.load('client', async () => {
          try {
            await gapi.client.init({
              apiKey: API_KEY,
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
            });
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      };
      script.onerror = () => reject(new Error('Falha ao carregar Google API'));
      document.head.appendChild(script);
    });
  }

  /**
   * Executa o login
   */
  function doLogin() {
    try {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.error) {
            showToast('Erro de autenticação: ' + response.error, 'error');
            return;
          }
          accessToken = response.access_token;
          isAuthorized = true;
          saveToken(accessToken);
          updateUI();
          showToast('Conectado ao Google Drive!', 'success');

          if (typeof Drive !== 'undefined') {
            Drive.setAccessToken(accessToken);
            Drive.syncNow();
          }
        }
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (e) {
      console.error('Erro no login:', e);
      showToast('Erro ao conectar: ' + e.message, 'error');
    }
  }

  /**
   * Desconecta
   */
  function logout() {
    if (tokenClient && accessToken) {
      google.accounts.oauth2.revoke(accessToken, () => {
        showToast('Desconectado do Google Drive.', 'info');
      });
    }

    accessToken = null;
    isAuthorized = false;
    removeToken();
    updateUI();

    if (typeof Drive !== 'undefined') {
      Drive.setAccessToken(null);
    }
  }

  /**
   * Salva o token no LocalStorage
   */
  function saveToken(token) {
    try {
      localStorage.setItem('moto_google_token', token);
    } catch (e) {
      console.error('Erro ao salvar token:', e);
    }
  }

  /**
   * Carrega o token do LocalStorage
   */
  function loadToken() {
    try {
      const token = localStorage.getItem('moto_google_token');
      if (token) {
        accessToken = token;
        isAuthorized = true;
        if (typeof Drive !== 'undefined') {
          Drive.setAccessToken(token);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar token:', e);
    }
  }

  /**
   * Remove o token
   */
  function removeToken() {
    try {
      localStorage.removeItem('moto_google_token');
    } catch (e) {
      console.error('Erro ao remover token:', e);
    }
  }

  /**
   * Atualiza a interface
   */
  function updateUI() {
    const loginBtn = document.getElementById('google-login-btn');
    const syncBtn = document.getElementById('google-sync-btn');
    const restoreBtn = document.getElementById('google-restore-btn');
    const logoutBtn = document.getElementById('google-logout-btn');
    const mainIcon = document.getElementById('sync-main-icon');
    const mainText = document.getElementById('sync-main-text');
    const mainDetail = document.getElementById('sync-main-detail');
    const timestamp = document.getElementById('sync-timestamp');
    const errorMsg = document.getElementById('sync-error-msg');

    if (!CLIENT_ID) {
      loginBtn.style.display = 'none';
      syncBtn.style.display = 'none';
      restoreBtn.style.display = 'none';
      logoutBtn.style.display = 'none';
      mainIcon.className = 'fas fa-exclamation-triangle error';
      mainText.textContent = 'Google Drive não configurado';
      mainDetail.textContent = 'Configure o GOOGLE_CLIENT_ID no arquivo js/config.js';
      timestamp.style.display = 'none';
      errorMsg.style.display = 'block';
      errorMsg.textContent = 'Siga o guia SETUP-GOOGLE-DRIVE.md para configurar.';
      document.getElementById('sync-text').textContent = 'Não configurado';
      document.getElementById('sync-status').querySelector('i').className = 'fas fa-exclamation-triangle';
      document.getElementById('sync-status').querySelector('i').style.color = 'var(--accent-yellow)';
      return;
    }

    if (isAuthorized) {
      loginBtn.style.display = 'none';
      syncBtn.style.display = 'inline-flex';
      restoreBtn.style.display = 'inline-flex';
      logoutBtn.style.display = 'inline-flex';
      mainIcon.className = 'fas fa-cloud connected';
      mainText.textContent = 'Conectado ao Google Drive';
      mainDetail.textContent = 'Seus dados serão sincronizados automaticamente.';
      errorMsg.style.display = 'none';

      const lastSync = Storage.getLastSyncTime();
      if (lastSync) {
        timestamp.style.display = 'block';
        timestamp.textContent = 'Última sincronização: ' + new Date(lastSync).toLocaleString('pt-BR');
      }

      document.getElementById('sync-text').textContent = 'Sincronizado';
      document.getElementById('sync-status').querySelector('i').className = 'fas fa-cloud';
      document.getElementById('sync-status').querySelector('i').style.color = 'var(--accent-green)';
    } else {
      loginBtn.style.display = 'inline-flex';
      syncBtn.style.display = 'none';
      restoreBtn.style.display = 'none';
      logoutBtn.style.display = 'none';
      mainIcon.className = 'fas fa-cloud';
      mainText.textContent = 'Não conectado';
      mainDetail.textContent = 'Faça login com sua conta Google para sincronizar seus dados.';
      timestamp.style.display = 'none';
      errorMsg.style.display = 'none';
      document.getElementById('sync-text').textContent = 'Offline';
      document.getElementById('sync-status').querySelector('i').className = 'fas fa-cloud';
      document.getElementById('sync-status').querySelector('i').style.color = '';
    }
  }

  /**
   * Verifica se está autorizado
   */
  function isLoggedIn() {
    return isAuthorized && accessToken !== null;
  }

  /**
   * Obtém o token de acesso
   */
  function getAccessToken() {
    return accessToken;
  }

  return {
    init,
    login,
    logout,
    isLoggedIn,
    getAccessToken,
    updateUI
  };
})();
