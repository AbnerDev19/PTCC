
    // ==========================================================================
    // UTILITÁRIOS
    // ==========================================================================
    function escapeHtml(v) {
      return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    function fmtTime(d) { return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0'); }
    function parseTimeMs(t) {
      const [h, m, rest] = t.split(':'); const [s, ms = '0'] = rest.split('.');
      return ((+h * 60 + +m) * 60 + +s) * 1000 + +ms.padEnd(3, '0').slice(0, 3);
    }

    // ==========================================================================
    // ESTADO CENTRAL DO PROTÓTIPO
    // ==========================================================================
    const state = {
      activeTab: 'elderly',
      activeMedIndex: 0,
      isElderlyOffline: false,
      isPolypharmacyLocked: false,
      familyAlertsSentToday: 0,
      medications: [
        {
          id: 'MED-01',
          name: 'Losartana Potássica 50mg',
          shortBoxTitle: 'LOSARTANA 50mg',
          dose: 'Tomar 1 comprimido com água',
          pillDesc: '1 comp. redondo branco',
          time: '08:00',
          stock: 8, // Estoque baixo (4 dias) para demonstrar o alerta RF08
          maxBoxStock: 30,
          dailyUsage: 2,
          colorCode: 'blue',
          colorLabel: 'Caixa Branca com Faixa Azul',
          stripeLabel: 'FAIXA AZUL',
          stripeHex: '#0066CC',
          badgeBg: 'rgba(0, 102, 204, 0.12)',
          bulaSimplified: 'Serve para proteger o seu coração e controlar a pressão alta. Tome 1 comprimido inteiro com um copo cheio de água.',
          postDoseTip: 'Muito bem! Levante-se devagar da cama ou do sofá nas próximas horas para evitar tontura. Mesmo que a pressão esteja boa amanhã, continue tomando no horário.',
          status: 'PENDING', // PENDING | CONFIRMED | ESCALATED
          confirmedAt: null,
          snoozeCount: 0,
          maxSnooze: 3,
          escalationSent: false
        },
        {
          id: 'MED-02',
          name: 'Cloridrato de Metformina 850mg',
          shortBoxTitle: 'METFORMINA 850mg',
          dose: 'Tomar 1 comprimido após o almoço',
          pillDesc: '1 comp. oval branco',
          time: '12:00',
          stock: 24,
          maxBoxStock: 30,
          dailyUsage: 2,
          colorCode: 'amber',
          colorLabel: 'Caixa Branca com Faixa Amarela',
          stripeLabel: 'FAIXA AMARELA',
          stripeHex: '#D97706',
          badgeBg: 'rgba(217, 119, 6, 0.14)',
          bulaSimplified: 'Serve para controlar o açúcar no sangue. Tome logo depois do almoço junto com um copo de água.',
          postDoseTip: 'Dose confirmada! Tomar junto com a refeição ajuda a proteger o seu estômago.',
          status: 'PENDING',
          confirmedAt: null,
          snoozeCount: 0,
          maxSnooze: 3,
          escalationSent: false
        },
        {
          id: 'MED-03',
          name: 'Sinvastatina 20mg',
          shortBoxTitle: 'SINVASTATINA 20mg',
          dose: 'Tomar 1 comprimido à noite',
          pillDesc: '1 comp. pequeno revestido',
          time: '20:00',
          stock: 18,
          maxBoxStock: 30,
          dailyUsage: 1,
          colorCode: 'green',
          colorLabel: 'Caixa Branca com Faixa Verde',
          stripeLabel: 'FAIXA VERDE',
          stripeHex: '#15803D',
          badgeBg: 'rgba(21, 128, 61, 0.12)',
          bulaSimplified: 'Serve para limpar a gordura do sangue e proteger as veias. Tome à noite com um copo de água.',
          postDoseTip: 'Excelente! Esse remédio funciona melhor durante a noite enquanto você descansa.',
          status: 'PENDING',
          confirmedAt: null,
          snoozeCount: 0,
          maxSnooze: 3,
          escalationSent: false
        }
      ],
      technicalLogs: [
        { id: 'EV-001', scenario: 'C1_APP_ABERTO', scheduled: '08:00:00', fired: '08:00:00.160', delivered: '08:00:01.340', latencyMs: 1180, channel: 'Local + Push + Telegram', status: 'ENTREGUE' },
        { id: 'EV-002', scenario: 'C2_TELA_BLOQUEADA', scheduled: '08:15:00', fired: '08:15:00.290', delivered: '08:15:01.880', latencyMs: 1590, channel: 'FullScreen + Telegram', status: 'ENTREGUE' },
        { id: 'EV-003', scenario: 'C3_MODO_AVIAO_WATCHDOG', scheduled: '12:00:00', fired: '12:15:00.110', delivered: '12:15:01.530', latencyMs: 1420, channel: 'Watchdog Cloud -> Telegram', status: 'ENTREGUE' },
        { id: 'EV-004', scenario: 'C4_DOZE_MODE_BATERIA', scheduled: '20:00:00', fired: '20:00:00.510', delivered: '20:00:02.100', latencyMs: 1590, channel: 'AllowWhileIdle + Push', status: 'ENTREGUE' }
      ],
      telegramMessages: [
        {
          time: '07:59',
          type: 'INFO',
          title: 'Watchdog em Nuvem Ativo',
          body: 'Monitoramento iniciado para Sr. José Oliveira. Tolerância configurada: 3 adiamentos de 5 min antes do alerta familiar.'
        }
      ]
    };

    // ==========================================================================
    // ÍNDICE DE FACILIDADE DE LEITURA DE FLESCH (ADAPTADO AO PORTUGUÊS)
    // ==========================================================================
    function calculateFleschPtBr(text) {
      if (!text || text.trim().length === 0) return { score: 100, label: 'Muito Fácil' };
      const clean = text.trim();
      const sentences = clean.split(/[.!?]+/).filter(Boolean).length || 1;
      const wordsArray = clean.split(/\s+/).filter(Boolean);
      const words = wordsArray.length || 1;

      let syllables = 0;
      wordsArray.forEach(w => {
        const matches = w.toLowerCase().match(/[aeiouáéíóúâêôãõü]+/gi);
        syllables += matches ? matches.length : 1;
      });

      const asl = words / sentences;
      const asw = syllables / words;
      let score = 248.835 - (1.015 * asl) - (84.6 * asw);
      score = Math.max(15, Math.min(98, Math.round(score * 10) / 10));

      let label = 'Muito Fácil';
      if (score < 50) label = 'Complexo (Simplifique)';
      else if (score < 75) label = 'Fácil';

      return { score, label };
    }

    // ==========================================================================
    // NAVEGAÇÃO ENTRE ABAS (SEGMENTED CONTROL)
    // ==========================================================================
    function switchTab(tabId) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      state.activeTab = tabId;
      ['elderly', 'family', 'lab'].forEach(t => {
        const section = document.getElementById(`view-${t}`);
        const btn = document.getElementById(`tab-${t}`);
        if (t === tabId) {
          section.classList.remove('hidden');
          btn.classList.add('active');
        } else {
          section.classList.add('hidden');
          btn.classList.remove('active');
        }
      });

      if (tabId === 'family') {
        document.getElementById('familyAlertBadge').classList.add('hidden');
        renderFamilyView();
      } else if (tabId === 'lab') {
        renderLabView();
      }
    }

    // ==========================================================================
    // RENDERIZAÇÃO DA VISÃO 1: INTERFACE DO IDOSO
    // ==========================================================================
    function renderElderlyView() {
      const med = state.medications[state.activeMedIndex];

      // Seletor de medicamentos (inclui os cadastrados pelo formulário)
      document.getElementById('medSwitcher').innerHTML = state.medications.map((m, i) => {
        const w = m.shortBoxTitle.split(' ')[0];
        const nome = w.charAt(0) + w.slice(1).toLowerCase();
        const cls = i === state.activeMedIndex
          ? 'bg-[#0066CC] text-white font-semibold shadow-xs'
          : 'bg-black/5 text-[#1D1D1F] font-medium hover:bg-black/10';
        return `<button type="button" aria-pressed="${i === state.activeMedIndex}" class="px-3 py-1.5 rounded-xl text-xs transition ${cls}" onclick="selectActiveMedication(${i})">${m.time} • ${escapeHtml(nome)}</button>`;
      }).join('');

      // Textos principais da dose
      document.getElementById('elderlyDoseTime').textContent = med.time;
      document.getElementById('elderlyMedName').textContent = med.name;
      document.getElementById('elderlyMedDose').textContent = med.dose;
      document.getElementById('elderlyBulaSimplified').textContent = med.bulaSimplified;
      document.getElementById('postDoseTipText').textContent = med.postDoseTip;

      // Selo Flesch
      const flesch = calculateFleschPtBr(med.bulaSimplified);
      document.getElementById('elderlyFleschBadge').textContent = `Leitura Flesch: ${flesch.score} (${flesch.label})`;

      // Ilustração da Caixa e Comprimido
      document.getElementById('visualBoxTitle').textContent = med.shortBoxTitle;
      document.getElementById('visualPillDesc').textContent = med.pillDesc || '1 comprimido';
      const stripe = document.getElementById('visualBoxStripe');
      stripe.style.backgroundColor = med.stripeHex;
      document.getElementById('visualStripeText').textContent = med.stripeLabel;

      const colorLabel = document.getElementById('visualColorLabel');
      colorLabel.style.backgroundColor = med.badgeBg;
      colorLabel.style.color = med.stripeHex;
      colorLabel.textContent = med.colorLabel;

      // Escudo de Proteção Ativo
      const shieldBox = document.getElementById('shieldIconBox');
      const shieldBadge = document.getElementById('shieldStatusBadge');
      const shieldEdu = document.getElementById('shieldEduText');
      const todayStamp = document.getElementById('todayStamp');
      const todayStampIcon = document.getElementById('todayStampIcon');

      if (med.status === 'CONFIRMED') {
        shieldBox.className = 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#E8F8F0] text-[#15803D] flex items-center justify-center shrink-0 shadow-xs';
        shieldBadge.className = 'text-xs font-bold px-3 py-1 rounded-full bg-[#E8F8F0] text-[#15803D]';
        shieldBadge.textContent = 'Escudo de Proteção em 100% • Dose em Dia';
        shieldEdu.textContent = 'Excelente! Você tomou no horário certo e o medicamento continua protegendo seu corpo sem interrupções.';
        todayStamp.className = 'w-14 py-2 rounded-xl bg-[#15803D] text-white text-center shadow-xs';
        todayStampIcon.innerHTML = '<i class="ph-bold ph-check text-sm"></i>';
      } else if (med.status === 'ESCALATED' || state.isPolypharmacyLocked) {
        shieldBox.className = 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0 shadow-xs';
        shieldBadge.className = 'text-xs font-bold px-3 py-1 rounded-full bg-[#FEE2E2] text-[#DC2626]';
        shieldBadge.textContent = 'Atenção • Atraso na Janela de Horário';
        shieldEdu.textContent = 'Atrasar o horário reduz a proteção do medicamento no sangue. Sua família já foi avisada para apoiar você.';
        todayStamp.className = 'w-14 py-2 rounded-xl bg-[#DC2626] text-white text-center shadow-xs';
        todayStampIcon.textContent = 'Atraso';
      } else {
        shieldBox.className = 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#E8F8F0] text-[#15803D] flex items-center justify-center shrink-0 shadow-xs';
        shieldBadge.className = 'text-xs font-bold px-3 py-1 rounded-full bg-[#E8F8F0] text-[#15803D]';
        shieldBadge.textContent = 'Escudo de Proteção Ativo • 100%';
        shieldEdu.textContent = 'Tomar o remédio sempre na mesma hora mantém o efeito protetor estável no seu sangue o dia inteiro.';
        todayStamp.className = 'w-14 py-2 rounded-xl bg-[#0066CC] text-white text-center shadow-xs';
        todayStampIcon.textContent = med.time;
      }

      // Alerta de Polifarmácia
      const polyBox = document.getElementById('polypharmacyWarningBox');
      if (state.isPolypharmacyLocked) {
        const nextT = state.medications.map(m => m.time).sort().find(t => t > med.time) || '—';
        document.getElementById('polyCurrentTime').textContent = med.time;
        document.getElementById('polyNextTime').textContent = nextT;
        polyBox.classList.remove('hidden');
      } else {
        polyBox.classList.add('hidden');
      }

      // Estado do Card Principal e Botões
      const headerBar = document.getElementById('doseHeaderBar');
      const headerStatusText = document.getElementById('doseHeaderStatusText');
      const postCard = document.getElementById('postConfirmationEduCard');
      const btnConfirm = document.getElementById('btnConfirmDose');
      const btnConfirmText = document.getElementById('btnConfirmText');
      const btnSnooze = document.getElementById('btnSnoozeDose');
      const snoozeLabel = document.getElementById('snoozeCounterLabel');
      const mainContainer = document.getElementById('mainDoseContainer');

      const remainingSnoozes = med.maxSnooze - med.snoozeCount;
      snoozeLabel.textContent = `Adiamentos restantes: ${remainingSnoozes} de ${med.maxSnooze}`;

      if (state.isPolypharmacyLocked) {
        headerBar.className = 'bg-[#DC2626] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 transition-colors duration-300';
        headerStatusText.textContent = 'Bloqueio de Segurança • Próximo da Dose Seguinte';
        btnConfirm.disabled = true;
        btnConfirm.className = 'btn-tactile md:col-span-8 min-h-[74px] px-6 py-5 bg-gray-400 text-white text-xl sm:text-2xl';
        btnConfirmText.textContent = 'Tomada Bloqueada • Aguardando Familiar';
        btnSnooze.disabled = true;
        postCard.classList.add('hidden');
        mainContainer.classList.remove('active-dose-glow');
      } else if (med.status === 'CONFIRMED') {
        headerBar.className = 'bg-[#15803D] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 transition-colors duration-300';
        headerStatusText.textContent = `Dose das ${med.time} Confirmada com Segurança`;
        postCard.classList.remove('hidden');
        document.getElementById('confirmedTimestampBadge').textContent = `Confirmado às ${med.confirmedAt} • Restam ${med.stock} comp.`;
        btnConfirm.disabled = true;
        btnConfirm.className = 'btn-tactile md:col-span-8 min-h-[74px] px-6 py-5 bg-[#15803D] text-white text-xl sm:text-2xl';
        btnConfirmText.textContent = `Dose das ${med.time} Já Registrada ✓`;
        btnSnooze.disabled = true;
        mainContainer.classList.remove('active-dose-glow');
      } else if (med.status === 'ESCALATED') {
        headerBar.className = 'bg-[#D97706] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 transition-colors duration-300';
        headerStatusText.textContent = 'Limite de Adiamentos Atingido • Familiar Notificado';
        postCard.classList.add('hidden');
        btnConfirm.disabled = false;
        btnConfirm.className = 'btn-tactile md:col-span-8 min-h-[74px] px-6 py-5 bg-[#15803D] hover:bg-[#126B32] text-white text-xl sm:text-2xl shadow-md';
        btnConfirmText.textContent = `Já Tomei Meu Remédio (${med.time})`;
        btnSnooze.disabled = true;
        mainContainer.classList.add('active-dose-glow');
      } else {
        headerBar.className = 'bg-[#1D1D1F] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 transition-colors duration-300';
        headerStatusText.textContent = state.isElderlyOffline
          ? 'Horário do Medicamento • Alarme Local Offline (RF03)'
          : 'Horário do Medicamento • Lembrete Ativo';
        postCard.classList.add('hidden');
        btnConfirm.disabled = false;
        btnConfirm.className = 'btn-tactile md:col-span-8 min-h-[74px] px-6 py-5 bg-[#15803D] hover:bg-[#126B32] text-white text-xl sm:text-2xl shadow-md';
        btnConfirmText.textContent = `Já Tomei Meu Remédio (${med.time})`;
        btnSnooze.disabled = false;
        mainContainer.classList.add('active-dose-glow');
      }
    }

    // ==========================================================================
    // SÍNTESE DE VOZ NATIVA (WEB SPEECH API COM INDICADOR DE ONDA SONORA)
    // ==========================================================================
    function speakCurrentMedication() {
      const med = state.medications[state.activeMedIndex];
      const textToRead = `Atenção para o horário do seu remédio das ${med.time}. ${med.name}. ${med.colorLabel}. ${med.dose}. ${med.bulaSimplified}`;

      const wave = document.getElementById('ttsWaveform');
      const btnText = document.getElementById('btnSpeakText');

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.92;

        wave.classList.remove('hidden');
        wave.classList.add('inline-flex');
        btnText.textContent = 'Lendo instrução em voz alta...';

        utterance.onend = () => {
          wave.classList.add('hidden');
          wave.classList.remove('inline-flex');
          btnText.textContent = 'Ouvir Instrução em Voz Alta';
        };

        utterance.onerror = () => {
          wave.classList.add('hidden');
          wave.classList.remove('inline-flex');
          btnText.textContent = 'Ouvir Instrução em Voz Alta';
        };

        window.speechSynthesis.speak(utterance);
        showToast('Voz Assistiva (TTS)', 'Reproduzindo orientação da Bula Traduzida em português.');
      } else {
        showToast('Voz Assistiva Simulada', textToRead);
      }
    }

    // ==========================================================================
    // CONFIRMAÇÃO DE DOSE (COM IDEMPOTÊNCIA) E ADIAMENTO (MÁX 3X)
    // ==========================================================================

    // ==========================================================================
    // GAMIFICAÇÃO ACOLHEDORA: pontos por confirmação única, sequência e conquistas
    // Persistência local para o protótipo (não substitui banco/autenticação).
    // ==========================================================================
    const GAME_STORAGE_KEY = 'medassist-care-journey-v1';

    function getGameData() {
      try {
        const saved = JSON.parse(localStorage.getItem(GAME_STORAGE_KEY) || '{}');
        return {
          points: Number(saved.points) || 0,
          confirmations: saved.confirmations && typeof saved.confirmations === 'object' ? saved.confirmations : {},
          completeDays: Array.isArray(saved.completeDays) ? saved.completeDays : []
        };
      } catch (_) {
        return { points: 0, confirmations: {}, completeDays: [] };
      }
    }

    function saveGameData(data) {
      try { localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
    }

    function localDateKey(date = new Date()) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    function registerCareAchievement(med) {
      const data = getGameData();
      const today = localDateKey();
      if (!data.confirmations[today]) data.confirmations[today] = [];
      if (!data.confirmations[today].includes(med.id)) {
        data.confirmations[today].push(med.id);
        data.points += 10;
      }
      if (data.confirmations[today].length >= state.medications.length &&
          !data.completeDays.includes(today)) {
        data.completeDays.push(today);
      }
      saveGameData(data);
      renderCareJourney();
    }

    function getCurrentStreak(completeDays) {
      const completed = new Set(completeDays);
      let cursor = new Date();
      if (!completed.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
      let streak = 0;
      while (completed.has(localDateKey(cursor)) && streak < 3660) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      }
      return streak;
    }

    function renderWeekStrip(data, streak) {
      const strip = document.getElementById('weekStrip');
      if (!strip) return;
      const done = new Set(data.completeDays);
      let html = '';
      for (let i = 4; i >= 1; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const ok = done.has(localDateKey(d));
        const dia = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').slice(0, 3).toUpperCase();
        html += `<div class="w-11 py-2 rounded-xl bg-white text-center shadow-2xs" title="${ok ? 'Dia completo' : 'Sem registro completo'}"><div class="text-[10px] font-bold text-[#6E6E73]">${dia}</div><i class="ph-fill ${ok ? 'ph-check-circle text-[#15803D]' : 'ph-circle text-[#B8C2C7]'} text-base mt-0.5"></i></div>`;
      }
      strip.innerHTML = html;
      const st = document.getElementById('shieldStreakText');
      if (st) st.textContent = `${streak} ${streak === 1 ? 'dia seguido' : 'dias seguidos'} com todos os cuidados`;
    }

    function renderCareJourney() {
      const data = getGameData();
      const todayCount = (data.confirmations[localDateKey()] || []).length;
      const streak = getCurrentStreak(data.completeDays);
      const percent = Math.min(100, Math.round(todayCount / Math.max(1, state.medications.length) * 100));
      const points = document.getElementById('gamePoints');
      if (!points) return;
      points.textContent = data.points;
      document.getElementById('gameTodayCount').textContent = `${todayCount} de ${state.medications.length} cuidados`;
      document.getElementById('gameProgressFill').style.width = `${percent}%`;
      const bar = document.getElementById('gameProgressBar');
      bar.setAttribute('aria-valuenow', String(todayCount));
      bar.setAttribute('aria-valuemax', String(state.medications.length));
      renderWeekStrip(data, streak);
      document.getElementById('gameTodayMessage').textContent = todayCount >= state.medications.length
        ? 'Parabéns! Você registrou todos os cuidados previstos para hoje.'
        : `Você já registrou ${todayCount}. Cada confirmação ajuda a acompanhar sua rotina.`;
      document.getElementById('gameStreak').textContent = `${streak} ${streak === 1 ? 'dia' : 'dias'}`;
      document.getElementById('gameEncouragement').textContent = todayCount >= state.medications.length
        ? 'Dia completo! Parabéns por cuidar de você.'
        : todayCount > 0 ? 'Muito bem! Continue no seu ritmo, um cuidado de cada vez.' : 'Vamos cuidar de você, um horário de cada vez.';
      const unlock = (id, yes) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('locked', !yes);
      };
      unlock('achievement-first', data.points >= 10);
      unlock('achievement-day', todayCount >= state.medications.length);
      unlock('achievement-streak', streak >= 7);
    }

    function confirmMedicationDose() {
      const med = state.medications[state.activeMedIndex];
      if (med.status === 'CONFIRMED' || state.isPolypharmacyLocked) return;

      const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      med.status = 'CONFIRMED';
      med.confirmedAt = nowStr;
      registerCareAchievement(med);
      med.stock = Math.max(0, med.stock - 1);

      appendTechnicalLog(
        state.isElderlyOffline ? 'CONFIRMACAO_OFFLINE_LOCAL' : 'CONFIRMACAO_DOSE_IDOSO',
        med.time + ':00',
        nowStr + '.110',
        nowStr + '.480',
        370,
        state.isElderlyOffline ? 'Storage Local (Sync Pendente)' : 'Firebase Realtime -> Painel Familiar',
        'CONFIRMADO'
      );

      if (state.isElderlyOffline) {
        addTelegramMessage(
          'Confirmação Local (Aparelho Offline)',
          `Sr. José confirmou a tomada de ${med.name} (${med.time}) localmente, mas o aparelho está sem internet no momento.`
        );
      } else {
        addTelegramMessage(
          '✅ Dose Confirmada pelo Idoso',
          `Sr. José confirmou ${med.name} (${med.time}) às ${nowStr}. Estoque atualizado: restam ${med.stock} comprimidos.`
        );
      }

      renderElderlyView();
      renderFamilyView();
      showToast('Dose Confirmada (RF04)', 'Pílula educativa exibida e baixa de estoque (-1) registrada.');
    }

    function snoozeMedicationDose() {
      const med = state.medications[state.activeMedIndex];
      if (med.status === 'CONFIRMED' || state.isPolypharmacyLocked) return;

      med.snoozeCount += 1;

      if (med.snoozeCount >= med.maxSnooze) {
        med.status = 'ESCALATED';
        triggerEscalationToFamily(med, 'Limite de 3 adiamentos excedido sem confirmação');
      } else {
        showToast(
          `Lembrete Adiado (${med.snoozeCount}/${med.maxSnooze})`,
          `O alarme tocará novamente em 5 minutos. Restam ${med.maxSnooze - med.snoozeCount} adiamentos antes de avisar a família.`
        );
      }

      renderElderlyView();
      renderFamilyView();
    }

    // ==========================================================================
    // ESCALONAMENTO AUTOMÁTICO SERVER-SIDE (WATCHDOG -> TELEGRAM)
    // ==========================================================================
    function triggerEscalationToFamily(med, reason) {
      if (med.escalationSent) {
        showToast('Proteção Anti-Sobrecarga (RF07)', 'O familiar já recebeu o alerta crítico para esta dose.');
        return;
      }

      med.escalationSent = true;
      state.familyAlertsSentToday += 1;
      const nowStr = new Date().toLocaleTimeString('pt-BR');

      addTelegramMessage(
        `🚨 Alerta Escalado: ${med.name} (${med.time})`,
        `Motivo: ${reason}. Sr. José não confirmou a dose dentro da janela de tolerância. Recomendamos contato telefônico.`
      );

      appendTechnicalLog(
        state.isElderlyOffline ? 'C3_WATCHDOG_SEM_INTERNET' : 'ESCALONAMENTO_FAMILIAR_RF05',
        med.time + ':00',
        nowStr + '.140',
        nowStr + '.990',
        850,
        'Push FCM + Bot Telegram',
        'ENTREGUE'
      );

      document.getElementById('familyAlertBadge').classList.remove('hidden');
      showToast('Familiar Notificado (RF05)', 'Alerta entregue via Push e Bot do Telegram em 850 ms.');
    }

    function triggerManualEscalationTest() {
      const med = state.medications[state.activeMedIndex];
      med.escalationSent = false;
      triggerEscalationToFamily(med, 'Disparo de teste manual no Painel Familiar');
      renderFamilyView();
    }

    // ==========================================================================
    // CONTROLES DO SIMULADOR DA BANCA (BARRA FLUTUANTE)
    // ==========================================================================
    function selectActiveMedication(index) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      state.activeMedIndex = index;
      renderElderlyView();
    }

    function togglePolypharmacyLock() {
      state.isPolypharmacyLocked = !state.isPolypharmacyLocked;
      const btn = document.getElementById('btnPolyLock');

      if (state.isPolypharmacyLocked) {
        btn.className = 'px-3 py-1.5 rounded-xl font-semibold text-xs bg-[#DC2626] text-white flex items-center gap-1.5 shadow-xs transition';
        addTelegramMessage(
          '⚠️ Bloqueio de Polifarmácia Acionado',
          'A dose atual atrasou excessivamente e encostou na janela da próxima dose. O botão do idoso foi bloqueado para evitar superdosagem.'
        );
        showToast('Trava de Polifarmácia Ativa', 'Confirmação bloqueada por proximidade com a próxima dose.');
      } else {
        btn.className = 'px-3 py-1.5 rounded-xl font-semibold text-xs bg-white border border-black/10 text-[#1D1D1F] hover:bg-[#FEF3C7]/60 flex items-center gap-1.5 transition';
      }

      renderElderlyView();
      renderFamilyView();
    }

    function toggleOfflineMode() {
      state.isElderlyOffline = !state.isElderlyOffline;
      const btn = document.getElementById('btnOfflineSim');
      const dot = document.getElementById('headerConnDot');
      const label = document.getElementById('headerConnLabel');
      const famStatus = document.getElementById('familyPanelConnStatus');

      if (state.isElderlyOffline) {
        btn.className = 'px-3 py-1.5 rounded-xl font-semibold text-xs bg-[#DC2626] text-white flex items-center gap-1.5 shadow-xs transition';
        dot.className = 'w-2.5 h-2.5 rounded-full bg-[#DC2626]';
        label.textContent = 'Idoso: Offline (Modo Avião)';
        famStatus.className = 'font-display text-lg font-extrabold text-[#DC2626] mt-1';
        famStatus.textContent = 'Offline • Watchdog Ativo';

        addTelegramMessage(
          '📡 Watchdog Server: Perda de Sinal Detectada',
          'O celular do Sr. José ficou sem conexão. O alarme local continuará tocando offline no aparelho e o servidor alertará caso não haja confirmação.'
        );
        showToast('Modo Offline Simulado (RF03)', 'Alarme opera localmente; Watchdog monitora na nuvem.');
      } else {
        btn.className = 'px-3 py-1.5 rounded-xl font-semibold text-xs bg-white border border-black/10 text-[#1D1D1F] hover:bg-[#FEE2E2]/60 flex items-center gap-1.5 transition';
        dot.className = 'w-2.5 h-2.5 rounded-full bg-[#15803D] animate-pulse';
        label.textContent = 'Watchdog: Online';
        famStatus.className = 'font-display text-lg font-extrabold text-[#15803D] mt-1';
        famStatus.textContent = 'Online • Sincronizado';
        showToast('Conexão Restabelecida', 'Sincronização em nuvem normalizada.');
      }

      renderElderlyView();
      renderFamilyView();
    }

    function resetCurrentDoseState() {
      const med = state.medications[state.activeMedIndex];
      med.status = 'PENDING';
      med.snoozeCount = 0;
      med.confirmedAt = null;
      med.escalationSent = false;
      state.isPolypharmacyLocked = false;
      document.getElementById('btnPolyLock').className = 'px-3 py-1.5 rounded-xl font-semibold text-xs bg-white border border-black/10 text-[#1D1D1F] hover:bg-[#FEF3C7]/60 flex items-center gap-1.5 transition';
      renderElderlyView();
      renderFamilyView();
      showToast('Dose Restaurada', `O estado do medicamento das ${med.time} foi reiniciado.`);
    }

    // ==========================================================================
    // RENDERIZAÇÃO DA VISÃO 2: PAINEL FAMILIAR (BENTO DASHBOARD)
    // ==========================================================================
    function renderFamilyView() {
      const confirmedCount = state.medications.filter(m => m.status === 'CONFIRMED').length;
      const currentMed = state.medications[state.activeMedIndex];

      document.getElementById('metricConfirmedCount').textContent = `${confirmedCount} de ${state.medications.length}`;
      document.getElementById('metricSnoozeCount').textContent = `${currentMed.snoozeCount}/${currentMed.maxSnooze}`;
      document.getElementById('metricFamilyAlerts').textContent = `${state.familyAlertsSentToday}`;

      // Lista do Cronograma
      const schedEl = document.getElementById('familyScheduleList');
      schedEl.innerHTML = state.medications.map((m, idx) => {
        let statusPill = `<span class="text-xs font-semibold px-3 py-1 rounded-full bg-black/5 text-[#6E6E73]">Aguardando horário</span>`;
        if (m.status === 'CONFIRMED') {
          statusPill = `<span class="text-xs font-bold px-3 py-1 rounded-full bg-[#E8F8F0] text-[#15803D]">✓ Tomado às ${m.confirmedAt}</span>`;
        } else if (m.status === 'ESCALATED') {
          statusPill = `<span class="text-xs font-bold px-3 py-1 rounded-full bg-[#FEE2E2] text-[#DC2626]">! Não confirmado (Escalado)</span>`;
        }

        return `
          <div class="notion-soft-callout p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white transition">
            <div class="flex items-center space-x-3.5">
              <span class="font-mono-tech text-sm font-extrabold px-3 py-1.5 rounded-xl text-white" style="background-color: ${m.stripeHex}">${m.time}</span>
              <div>
                <div class="font-bold text-sm text-[#1D1D1F]">${escapeHtml(m.name)}</div>
                <div class="text-xs text-[#6E6E73]">${escapeHtml(m.dose)} • Adiamentos: ${m.snoozeCount}/${m.maxSnooze}</div>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              ${statusPill}
              <button onclick="selectActiveMedication(${idx}); switchTab('elderly');" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-black/10 hover:border-[#0066CC] text-[#1D1D1F] transition">
                Ver tela
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Previsão de Estoque com Barras de Progresso (RF08)
      const stockEl = document.getElementById('familyStockList');
      stockEl.innerHTML = state.medications.map((m, idx) => {
        const daysLeft = Math.floor(m.stock / (m.dailyUsage || 1));
        const isLow = daysLeft <= 5;
        const pct = Math.min(100, Math.round((m.stock / (m.maxBoxStock || 30)) * 100));

        return `
          <div class="notion-soft-callout p-4 ${isLow ? 'border-[#DC2626]/40 bg-[#FEE2E2]/25' : ''} space-y-2.5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="flex items-center space-x-2">
                <span class="font-bold text-sm text-[#1D1D1F]">${escapeHtml(m.name)}</span>
                ${isLow
                  ? '<span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#DC2626]">Reposição Necessária (RF08)</span>'
                  : '<span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#E8F8F0] text-[#15803D]">Estoque Seguro</span>'}
              </div>
              <button onclick="replenishStock(${idx})" class="btn-tactile px-3 py-1.5 bg-white border border-black/10 hover:bg-[#1D1D1F] hover:text-white text-xs font-semibold self-start sm:self-auto">
                + Repor Caixa (+30)
              </button>
            </div>

            <div class="w-full h-2 bg-black/8 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-300 ${isLow ? 'bg-[#DC2626]' : 'bg-[#15803D]'}" style="width: ${pct}%"></div>
            </div>

            <div class="flex items-center justify-between text-xs text-[#6E6E73]">
              <span>Restam <strong>${m.stock} comprimidos</strong> (${m.dailyUsage}/dia)</span>
              <span>Duração estimada: <strong>~${daysLeft} dias</strong></span>
            </div>
          </div>
        `;
      }).join('');

      // Bolhas do Chat do Telegram
      const feedEl = document.getElementById('telegramFeed');
      feedEl.innerHTML = state.telegramMessages.map(msg => `
        <div class="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-2xs border border-black/5 space-y-1">
          <div class="flex items-center justify-between text-[11px] text-[#6E6E73]">
            <span class="font-bold text-[#0066CC]">MedAssist Bot</span>
            <span class="font-mono-tech">${msg.time}</span>
          </div>
          <div class="font-bold text-xs text-[#1D1D1F]">${escapeHtml(msg.title)}</div>
          <p class="text-xs text-[#6E6E73] leading-relaxed">${escapeHtml(msg.body)}</p>
        </div>
      `).join('');
    }

    function replenishStock(idx) {
      state.medications[idx].stock += 30;
      renderFamilyView();
      renderElderlyView();
      showToast('Estoque Atualizado (RF08)', `+30 comprimidos adicionados a ${state.medications[idx].name}.`);
    }

    function addTelegramMessage(title, body) {
      const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      state.telegramMessages.unshift({ time, title, body });
    }

    function clearTelegramFeed() {
      state.telegramMessages = [];
      renderFamilyView();
    }

    function updateLiveFlesch() {
      const bula = document.getElementById('inputMedBula').value;
      const tip = document.getElementById('inputMedTip').value;
      const res = calculateFleschPtBr(`${bula} ${tip}`);
      const badge = document.getElementById('liveFleschScore');
      badge.textContent = `${res.score} — ${res.label}`;
    }

    function handleAddMedication(e) {
      e.preventDefault();
      const name = document.getElementById('inputMedName').value.trim();
      const dose = document.getElementById('inputMedDose').value.trim();
      const time = document.getElementById('inputMedTime').value;
      const stock = parseInt(document.getElementById('inputMedStock').value, 10) || 10;
      const colorCode = document.getElementById('inputMedColor').value;
      const bula = document.getElementById('inputMedBula').value.trim();
      const tip = document.getElementById('inputMedTip').value.trim();

      const colorMap = {
        blue: { label: 'Caixa Branca com Faixa Azul', stripe: 'FAIXA AZUL', hex: '#0066CC', bg: 'rgba(0, 102, 204, 0.12)' },
        amber: { label: 'Caixa Branca com Faixa Amarela', stripe: 'FAIXA AMARELA', hex: '#D97706', bg: 'rgba(217, 119, 6, 0.14)' },
        green: { label: 'Caixa Branca com Faixa Verde', stripe: 'FAIXA VERDE', hex: '#15803D', bg: 'rgba(21, 128, 61, 0.12)' },
        red: { label: 'Caixa Branca com Faixa Vermelha', stripe: 'FAIXA VERMELHA', hex: '#DC2626', bg: 'rgba(220, 38, 38, 0.12)' }
      };

      const c = colorMap[colorCode] || colorMap.blue;

      state.medications.push({
        id: `MED-0${state.medications.length + 1}`,
        name,
        shortBoxTitle: name.substring(0, 18).toUpperCase(),
        dose,
        pillDesc: '1 comprimido oral',
        time,
        stock,
        maxBoxStock: 30,
        dailyUsage: 1,
        colorCode,
        colorLabel: c.label,
        stripeLabel: c.stripe,
        stripeHex: c.hex,
        badgeBg: c.bg,
        bulaSimplified: bula,
        postDoseTip: tip,
        status: 'PENDING',
        confirmedAt: null,
        snoozeCount: 0,
        maxSnooze: 3,
        escalationSent: false
      });

      addTelegramMessage(
        '💊 Novo Medicamento Cadastrado (RF02)',
        `${name} agendado para ${time}. Leiturabilidade Flesch validada: ${calculateFleschPtBr(bula).score}.`
      );

      renderElderlyView();
      renderFamilyView();
      renderCareJourney();
      showToast('Medicamento Cadastrado', `${name} foi adicionado e sincronizado com o Watchdog.`);
    }

    // ==========================================================================
    // VISÃO 3: LABORATÓRIO DE ENSAIOS E EXPORTAÇÃO CSV (RF09 / RF10)
    // ==========================================================================
    function appendTechnicalLog(scenario, scheduled, fired, delivered, latencyMs, channel, status) {
      const id = `EV-${String(state.technicalLogs.length + 1).padStart(3, '0')}`;
      state.technicalLogs.unshift({ id, scenario, scheduled, fired, delivered, latencyMs, channel, status });
      if (state.activeTab === 'lab') renderLabView();
    }

    function simulateTechnicalScenario(scenarioCode) {
      const start = new Date();
      const profiles = {
        'C1_APP_ABERTO': { driftMs: 130, latencyMs: 1150, channel: 'Local + Push + Telegram' },
        'C2_TELA_BLOQUEADA': { driftMs: 270, latencyMs: 1540, channel: 'FullScreen Intent + Telegram' },
        'C3_MODO_AVIAO_WATCHDOG': { driftMs: 110, latencyMs: 1410, channel: 'Watchdog Cloud -> Telegram' },
        'C4_DOZE_MODE_BATERIA': { driftMs: 520, latencyMs: 1820, channel: 'AllowWhileIdle + Push' }
      };

      const p = profiles[scenarioCode] || profiles['C1_APP_ABERTO'];
      const jitter = Math.floor(Math.random() * 160);
      const finalLatency = p.latencyMs + jitter;
      const firedAt = new Date(start.getTime() + p.driftMs);
      const deliveredAt = new Date(firedAt.getTime() + finalLatency);

      appendTechnicalLog(
        scenarioCode,
        fmtTime(start),
        fmtTime(firedAt),
        fmtTime(deliveredAt),
        finalLatency,
        p.channel,
        'ENTREGUE'
      );

      renderLabView();
      showToast('Ensaio Registrado (RF09)', `Cenário ${scenarioCode} medido com latência de ${finalLatency} ms.`);
    }

    function runBatchScenarioTests() {
      ['C1_APP_ABERTO', 'C2_TELA_BLOQUEADA', 'C3_MODO_AVIAO_WATCHDOG', 'C4_DOZE_MODE_BATERIA'].forEach(sc => {
        simulateTechnicalScenario(sc);
      });
      showToast('Bateria Completa Executada', '4 novos ensaios adicionados à tabela e prontos para exportação.');
    }

    function renderLabView() {
      const tbody = document.getElementById('technicalLogsTableBody');
      tbody.innerHTML = state.technicalLogs.map(log => `
        <tr class="hover:bg-[#F5F5F7]/60 transition">
          <td class="py-3 px-5 font-bold text-[#1D1D1F]">${log.id}</td>
          <td class="py-3 px-5 font-semibold text-[#0066CC]">${log.scenario}</td>
          <td class="py-3 px-5">${log.scheduled}</td>
          <td class="py-3 px-5">${log.fired}</td>
          <td class="py-3 px-5">${log.delivered}</td>
          <td class="py-3 px-5 font-bold text-[#1D1D1F]">${log.latencyMs} ms</td>
          <td class="py-3 px-5 font-sans text-[#6E6E73]">${log.channel}</td>
          <td class="py-3 px-5">
            <span class="px-2.5 py-0.5 rounded-full bg-[#E8F8F0] text-[#15803D] font-bold text-[10px]">${log.status}</span>
          </td>
        </tr>
      `).join('');

      const total = state.technicalLogs.length;
      const avgLat = Math.round(state.technicalLogs.reduce((acc, l) => acc + l.latencyMs, 0) / total);
      document.getElementById('labTotalEvents').textContent = String(total);
      document.getElementById('labAvgLatency').textContent = `${avgLat.toLocaleString('pt-BR')} ms`;
      const ok = state.technicalLogs.filter(l => ['ENTREGUE', 'CONFIRMADO'].includes(l.status)).length;
      document.getElementById('labDeliveryRate').textContent = `${(ok / total * 100).toFixed(1).replace('.', ',')}%`;
      const under = state.technicalLogs.filter(l => l.latencyMs < 30000).length;
      document.getElementById('labUnderLimit').textContent = `✓ ${Math.round(under / total * 100)}% abaixo do limite de 30 s`;
      const drifts = state.technicalLogs.map(l => Math.abs(parseTimeMs(l.fired) - parseTimeMs(l.scheduled))).filter(d => d < 5000);
      document.getElementById('labLocalDrift').textContent = drifts.length ? `± ${Math.round(drifts.reduce((x, y) => x + y, 0) / drifts.length)} ms` : '—';
    }

    function exportLogsToCSV() {
      const headers = ['ID', 'CENARIO', 'HORARIO_PREVISTO', 'DISPARO_REAL', 'CHEGADA_FAMILIAR', 'LATENCIA_MS', 'CANAL', 'STATUS', 'ORIGEM'];
      const rows = state.technicalLogs.map(l => [
        l.id, l.scenario, l.scheduled, l.fired, l.delivered, l.latencyMs, `"${l.channel}"`, l.status, 'SIMULADO'
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medassist_metricas_tcc_abner_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('CSV Exportado (RF10)', 'Planilha gerada para análise estatística do TCC.');
    }

    // ==========================================================================
    // TOAST NOTIFICATION & RELÓGIO EM TEMPO REAL
    // ==========================================================================
    let toastTimeout = null;
    function showToast(title, message) {
      const toast = document.getElementById('appleToast');
      document.getElementById('toastTitle').textContent = title;
      document.getElementById('toastMessage').textContent = message;
      toast.classList.remove('hidden');
      if (toastTimeout) clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        toast.classList.add('hidden');
      }, 4000);
    }

    function hideToast() {
      document.getElementById('appleToast').classList.add('hidden');
    }

    function startClock() {
      setInterval(() => {
        const now = new Date();
        const cl = document.getElementById('liveClock');
        const mcl = document.getElementById('mobileClock');
        if (cl) cl.textContent = now.toLocaleTimeString('pt-BR');
        if (mcl) mcl.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }, 1000);
    }

    window.onload = function () {
      renderElderlyView();
      renderFamilyView();
      renderLabView();
      renderCareJourney();
      startClock();
    };
  