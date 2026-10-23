/**
 * Internationalization (i18n) for X-ray Client (webOS TV)
 * Supported languages: Russian (RU), English (EN), Chinese (ZH - with English fallback)
 */

var I18n = (function() {
  var currentLang = 'ru';

  var translations = {
    ru: {
      // Sidebar
      nav_servers: 'Серверы',
      nav_dashboard: 'Подключение',
      nav_subs: 'Подписки',
      nav_routing: 'Маршрутизация',
      nav_settings: 'Настройки',
      nav_logs: 'Журнал',
      status_ready: 'Готов к работе',
      status_connected: 'Туннель tun0 активен',
      status_disconnected: 'Туннель остановлен',

      // Header
      title_servers: 'Серверы',
      title_dashboard: 'Подключение',
      title_subs: 'Подписки',
      title_routing: 'Маршрутизация',
      title_settings: 'Настройки',
      title_logs: 'Журнал работы',
      no_server_selected: 'Сервер не выбран',
      mode_bypass_ru: 'Обход РФ',
      mode_youtube_only: 'Только YouTube',
      mode_global: 'Полный VPN',

      // Dashboard
      btn_connect: 'ПОДКЛЮЧИТЬ',
      btn_disconnect: 'ОТКЛЮЧИТЬ',
      btn_connecting: 'ПОДКЛЮЧЕНИЕ...',
      btn_disconnecting: 'ОТКЛЮЧЕНИЕ...',
      state_connected: 'ПОДКЛЮЧЕНО (ЗАЩИЩЕНО)',
      state_disconnected: 'ОТКЛЮЧЕНО',
      state_starting: 'ПОДНЯТИЕ ТУННЕЛЯ...',
      conn_hint: 'Нажмите клавишу OK для управления туннелем',
      active_server_title: 'АКТИВНЫЙ СЕРВЕР',
      btn_change_server: 'Сменить сервер',
      stat_latency: 'Задержка',
      stat_routing: 'Маршрутизация',
      stat_session_time: 'Время сессии',
      btn_test_conn: 'Проверить соединение',

      // Servers tab
      servers_title: 'Доступные серверы',
      active_sub_title: 'АКТИВНАЯ ПОДПИСКА',
      no_active_sub: 'Нет активной подписки',
      sub_status_active: 'Активна',
      sub_status_inactive: 'Неактивна',
      btn_refresh_sub: 'Обновить подписку',
      btn_ping_all: 'Замер задержки всех',
      valid_until: 'Действует до:',
      nodes_count: 'узлов',
      node_one: 'узел',
      node_few: 'узла',
      node_many: 'узлов',
      server_connected_badge: 'Подключен',
      empty_servers_title: 'Подписка не добавлена',
      empty_servers_desc: 'Список серверов пуст. Добавьте подписку во вкладке «Подписки», чтобы загрузить серверы.',
      btn_goto_subs: 'Перейти в Подписки',

      // Subscriptions tab
      subs_title: 'Управление подписками',
      add_sub_title: 'Добавить новую подписку',
      add_sub_label: 'URL-адрес подписки (VLESS / VMess):',
      add_sub_placeholder: 'https://...',
      btn_add_sub: 'Добавить подписку',
      your_subs_title: 'Ваши подписки',
      sub_badge_active: 'Активна',
      sub_badge_inactive: 'Неактивна',
      btn_make_active: 'Сделать активной',
      btn_refresh_single: 'Обновить',
      btn_delete_sub: 'Удалить',
      sub_updated: 'Обновлено:',
      sub_expires: 'Срок:',
      no_subs_placeholder_title: 'Нет добавленных подписок',
      no_subs_placeholder_desc: 'Введите ссылку на подписку в поле выше и нажмите «Добавить подписку».',
      confirm_delete_sub: 'Удалить эту подписку?',
      sub_activated_toast: 'Активная подписка: ',
      sub_added_toast: 'Подписка успешно добавлена: ',
      sub_deleted_toast: 'Подписка удалена',

      // Routing tab
      route_bypass_title: 'Обход блокировок (Рекомендуется)',
      route_bypass_desc: 'Российские сервисы (Кинопоиск, Иви, Wink, Госуслуги, Сбер, сайты .RU) идут напрямую без задержек. Заблокированные ресурсы, YouTube, Instagram, X идут через VPN.',
      route_bypass_badge: 'Умный туннель',
      route_yt_title: 'Только YouTube и Google',
      route_yt_desc: 'Максимальная производительность для видео. В туннель направляются исключительно IP-подсети Google и YouTube. Все остальные сайты работают напрямую.',
      route_yt_badge: 'Турбо-видео',
      route_global_title: 'Полный VPN (Global Proxy)',
      route_global_desc: 'Весь интернет-трафик операционной системы телевизора и приложений направляется через выбранный сервер X-ray.',
      route_global_badge: 'Полная анонимность',

      // Settings tab
      settings_group_appearance: 'Внешний вид и язык',
      setting_theme_name: 'Тема интерфейса',
      setting_theme_hint: 'Стиль оформления и цветовая схема',
      theme_dark: 'Темная',
      theme_light: 'Светлая',
      theme_oled: 'OLED (Черная)',
      setting_lang_name: 'Язык интерфейса',
      setting_lang_hint: 'Выберите язык отображения приложения',
      lang_ru: 'Русский',
      lang_en: 'English',
      lang_zh: '中文 (ZH)',
      settings_group_network: 'Параметры запуска и сети',
      setting_autostart_name: 'Автозапуск при включении телевизора',
      setting_autostart_hint: 'Автоматически запускать службу Xray и поднимать туннель tun0 при старте webOS',
      setting_ipv6_name: 'Блокировка IPv6',
      setting_ipv6_hint: 'Предотвращает утечки DNS и зависания YouTube на сетях без нативной поддержки IPv6',
      setting_dns_name: 'DNS-провайдер',
      setting_dns_hint: 'Безопасный DNS для резолва доменов в туннеле',
      dns_custom_btn: 'Свой DNS',
      setting_custom_dns_name: 'Пользовательский DNS-сервер',
      setting_custom_dns_hint: 'IP-адрес DNS (например, 77.88.8.8, 1.1.1.1, 8.8.8.8, 9.9.9.9)',
      setting_ping_name: 'Режим проверки пинга',
      setting_ping_hint: 'Способ измерения задержки: TCP к порту сервера или реальный HTTPS-запрос',
      ping_tcp_btn: 'Пинг по TCP (к порту)',
      ping_https_btn: 'Пинг по HTTPS (запрос)',
      setting_autoupdate_name: 'Автообновление подписки',
      setting_autoupdate_hint: 'Период фоновой синхронизации списка серверов',
      interval_1h: 'Каждый 1 ч',
      interval_3h: 'Каждые 3 ч',
      interval_6h: 'Каждые 6 ч',
      interval_12h: 'Каждые 12 ч',
      interval_24h: 'Каждые 24 ч',
      interval_manual: 'Только вручную',
      settings_group_system: 'О системе',
      sys_app_version: 'Версия приложения:',
      sys_core_version: 'Ядро прокси:',
      sys_net_iface: 'Сетевой интерфейс:',
      sys_tv_control: 'Управление ТВ:',
      btn_restart_service: 'Перезапустить службу Xray',

      // Logs tab
      logs_title: 'Журнал работы ядра Xray',
      btn_refresh_logs: 'Обновить',
      btn_clear_logs: 'Очистить',
      logs_loading: 'Загрузка журнала...',
      logs_empty: '(Журнал пока пуст)',

      // Toasts
      dns_sub_btn: 'Из подписки',
      shortcut_power: 'Вкл/Выкл VPN',
      shortcut_ping: 'Тест задержки',
      shortcut_servers: 'Серверы',
      shortcut_settings: 'Настройки',
      ping_in_progress: 'Идет замер задержки, пожалуйста подождите',
      toast_zh_notice: 'Поддержка китайского языка появится в следующем обновлении (используется English)',
      toast_server_selected: 'Выбран сервер: ',
      toast_tunnel_switched: 'Туннель переключен на ',
      toast_tunnel_connected: 'LGRay успешно подключен!',
      toast_tunnel_disconnected: 'LGRay отключен',
      toast_tunnel_error: 'Ошибка запуска службы Xray',
      toast_refreshing_sub: 'Обновление подписки...',
      toast_sub_refreshed: 'Подписка обновлена. Серверов: ',
      toast_pinging_all: 'Проверка задержки всех серверов...',
      toast_pinging_all_done: 'Проверка всех серверов завершена',
      toast_theme_changed: 'Тема оформления изменена: ',
      toast_lang_changed: 'Язык интерфейса изменен: '
    },

    en: {
      // Sidebar
      nav_servers: 'Servers',
      nav_dashboard: 'Connection',
      nav_subs: 'Subscriptions',
      nav_routing: 'Routing',
      nav_settings: 'Settings',
      nav_logs: 'Logs',
      status_ready: 'Ready',
      status_connected: 'Tunnel tun0 active',
      status_disconnected: 'Tunnel stopped',

      // Header
      title_servers: 'Servers',
      title_dashboard: 'Connection',
      title_subs: 'Subscriptions',
      title_routing: 'Routing',
      title_settings: 'Settings',
      title_logs: 'System Logs',
      no_server_selected: 'No server selected',
      mode_bypass_ru: 'Bypass RU',
      mode_youtube_only: 'YouTube Only',
      mode_global: 'Full VPN',

      // Dashboard
      btn_connect: 'CONNECT',
      btn_disconnect: 'DISCONNECT',
      btn_connecting: 'CONNECTING...',
      btn_disconnecting: 'DISCONNECTING...',
      state_connected: 'CONNECTED (PROTECTED)',
      state_disconnected: 'DISCONNECTED',
      state_starting: 'STARTING TUNNEL...',
      conn_hint: 'Press OK button to toggle tunnel',
      active_server_title: 'ACTIVE SERVER',
      btn_change_server: 'Change server',
      stat_latency: 'Latency',
      stat_routing: 'Routing',
      stat_session_time: 'Session time',
      btn_test_conn: 'Test connection',

      // Servers tab
      servers_title: 'Available Servers',
      active_sub_title: 'ACTIVE SUBSCRIPTION',
      no_active_sub: 'No active subscription',
      sub_status_active: 'Active',
      sub_status_inactive: 'Inactive',
      btn_refresh_sub: 'Refresh subscription',
      btn_ping_all: 'Ping all servers',
      valid_until: 'Valid until:',
      nodes_count: 'nodes',
      node_one: 'node',
      node_few: 'nodes',
      node_many: 'nodes',
      server_connected_badge: 'Connected',
      empty_servers_title: 'No subscription added',
      empty_servers_desc: 'Server list is empty. Add a subscription in the Subscriptions tab to load servers.',
      btn_goto_subs: 'Go to Subscriptions',

      // Subscriptions tab
      subs_title: 'Subscription Management',
      add_sub_title: 'Add New Subscription',
      add_sub_label: 'Subscription URL (VLESS / VMess):',
      add_sub_placeholder: 'https://...',
      btn_add_sub: 'Add Subscription',
      your_subs_title: 'Your Subscriptions',
      sub_badge_active: 'Active',
      sub_badge_inactive: 'Inactive',
      btn_make_active: 'Make Active',
      btn_refresh_single: 'Refresh',
      btn_delete_sub: 'Delete',
      sub_updated: 'Updated:',
      sub_expires: 'Expires:',
      no_subs_placeholder_title: 'No subscriptions added yet',
      no_subs_placeholder_desc: 'Enter a subscription URL in the field above and click "Add Subscription".',
      confirm_delete_sub: 'Delete this subscription?',
      sub_activated_toast: 'Active subscription: ',
      sub_added_toast: 'Subscription added: ',
      sub_deleted_toast: 'Subscription deleted',

      // Routing tab
      route_bypass_title: 'Bypass Restrictions (Recommended)',
      route_bypass_desc: 'Local services go directly without extra latency. Blocked resources, YouTube, Instagram, X route via VPN.',
      route_bypass_badge: 'Smart Tunnel',
      route_yt_title: 'YouTube & Google Only',
      route_yt_desc: 'Maximum performance for video. Only Google and YouTube subnets are routed via tunnel. Everything else is direct.',
      route_yt_badge: 'Turbo Video',
      route_global_title: 'Full VPN (Global Proxy)',
      route_global_desc: 'All Internet traffic from TV OS and installed apps is routed through the selected X-ray server.',
      route_global_badge: 'Full Anonymity',

      // Settings tab
      settings_group_appearance: 'Appearance & Language',
      setting_theme_name: 'Interface Theme',
      setting_theme_hint: 'Visual design style and color palette',
      theme_dark: 'Dark',
      theme_light: 'Light',
      theme_oled: 'OLED (Black)',
      setting_lang_name: 'Interface Language',
      setting_lang_hint: 'Select display language for application',
      lang_ru: 'Русский',
      lang_en: 'English',
      lang_zh: '中文 (ZH)',
      settings_group_network: 'Startup & Network Settings',
      setting_autostart_name: 'Autostart on TV boot',
      setting_autostart_hint: 'Automatically start Xray daemon and bring up tun0 tunnel on webOS boot',
      setting_ipv6_name: 'Block IPv6',
      setting_ipv6_hint: 'Prevents DNS leaks and YouTube buffering issues on networks without native IPv6',
      setting_dns_name: 'DNS Provider',
      setting_dns_hint: 'Secure DNS resolver for domains routed via tunnel',
      dns_custom_btn: 'Custom DNS',
      setting_custom_dns_name: 'Custom DNS Server IP',
      setting_custom_dns_hint: 'DNS IP address (e.g. 77.88.8.8, 1.1.1.1, 8.8.8.8, 9.9.9.9)',
      setting_ping_name: 'Ping Measurement Mode',
      setting_ping_hint: 'Latency test method: TCP to server port or real HTTPS request',
      ping_tcp_btn: 'TCP Ping (to port)',
      ping_https_btn: 'HTTPS Ping (request)',
      setting_autoupdate_name: 'Subscription Auto-Update',
      setting_autoupdate_hint: 'Background sync frequency for server list',
      interval_1h: 'Every 1 hr',
      interval_3h: 'Every 3 hrs',
      interval_6h: 'Every 6 hrs',
      interval_12h: 'Every 12 hrs',
      interval_24h: 'Every 24 hrs',
      interval_manual: 'Manual only',
      settings_group_system: 'System Information',
      sys_app_version: 'Application Version:',
      sys_core_version: 'Proxy Core:',
      sys_net_iface: 'Network Interface:',
      sys_tv_control: 'TV Control Bridge:',
      btn_restart_service: 'Restart Xray Service',

      // Logs tab
      logs_title: 'Xray Core Execution Log',
      btn_refresh_logs: 'Refresh',
      btn_clear_logs: 'Clear',
      logs_loading: 'Loading log...',
      logs_empty: '(Log is empty)',

      // Toasts
      dns_sub_btn: 'From subscription',
      shortcut_power: 'Toggle VPN',
      shortcut_ping: 'Ping Test',
      shortcut_servers: 'Servers',
      shortcut_settings: 'Settings',
      ping_in_progress: 'Ping test in progress, please wait',
      toast_zh_notice: 'Chinese language support will be available soon (English fallback active)',
      toast_server_selected: 'Selected server: ',
      toast_tunnel_switched: 'Tunnel switched to ',
      toast_tunnel_connected: 'LGRay connected successfully!',
      toast_tunnel_disconnected: 'LGRay disconnected',
      toast_tunnel_error: 'Error starting Xray service',
      toast_refreshing_sub: 'Updating subscription...',
      toast_sub_refreshed: 'Subscription updated. Servers: ',
      toast_pinging_all: 'Checking ping for all servers...',
      toast_pinging_all_done: 'Finished checking all servers',
      toast_theme_changed: 'Theme changed to: ',
      toast_lang_changed: 'Language changed to: '
    }
  };

  // Chinese falls back to English with custom markers if needed
  translations.zh = Object.assign({}, translations.en, {
    lang_zh: '中文 (ZH)'
  });

  function t(key) {
    var dict = translations[currentLang] || translations.ru;
    if (dict[key] !== undefined) return dict[key];
    if (translations.ru[key] !== undefined) return translations.ru[key];
    return key;
  }

  function formatPluralNodes(count) {
    if (currentLang === 'en' || currentLang === 'zh') {
      return count + ' ' + (count === 1 ? t('node_one') : t('node_many'));
    }
    // Russian pluralization
    var n = Math.abs(count) % 100;
    var n1 = n % 10;
    if (n > 10 && n < 20) return count + ' ' + t('node_many');
    if (n1 > 1 && n1 < 5) return count + ' ' + t('node_few');
    if (n1 === 1) return count + ' ' + t('node_one');
    return count + ' ' + t('node_many');
  }

  function setLanguage(lang) {
    if (!translations[lang]) lang = 'ru';
    currentLang = lang;

    // Update all static DOM elements with data-i18n
    var elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = t(key);
      }
    });

    // Update placeholders
    var inputs = document.querySelectorAll('[data-i18n-placeholder]');
    inputs.forEach(function(input) {
      var key = input.getAttribute('data-i18n-placeholder');
      if (key) {
        input.placeholder = t(key);
      }
    });
  }

  return {
    t: t,
    formatPluralNodes: formatPluralNodes,
    setLanguage: setLanguage,
    getLanguage: function() { return currentLang; }
  };
})();

window.I18n = I18n;
