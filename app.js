'use strict';

const STORAGE_KEY = 'medassist-routine-v2';
const LEGACY_KEY = 'medassist-care-journey-v1';
const byId = id => document.getElementById(id);
const tabs = ['elderly', 'family', 'lab'];
const dialog = byId('reminder');
const clock = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const calendar = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' });
const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });
const labels = {
  punctual: 'Confirmado no horário',
  late: 'Confirmado com atraso',
  missing: 'Sem confirmação',
  pending: 'Aguardando confirmação',
  future: 'Horário futuro'
};
const colors = {
  blue: ['Azul', '#0055AB'], amber: ['Amarela', '#885004'], green: ['Verde', '#146735']
};

function plan(now, scenario = 'initial') {
  const activeSince = dateAt(now, scenario === 'initial' ? 0 : -29).setHours(0, 0, 0, 0);
  const medicines = [
    ['MED-01', 'A', '08:00', 'blue'],
    ['MED-02', 'B', '12:00', 'amber'],
    ['MED-03', 'C', '20:00', 'green']
  ].map(([id, letter, time, color]) => ({
    id, name: 'Medicamento Exemplo ' + letter, dose: 'Dose de demonstração',
    purpose: 'Exemplo de finalidade.', usage: 'Exemplo de modo de uso.',
    care: 'Exemplo de cuidado registrado.', source: 'Receita e bula fictícias',
    times: [time], color, activeSince
  }));
  const records = {};
  if (scenario !== 'initial') {
    for (let shift = -29; shift < 0; shift++) {
      occurrences(medicines, dateAt(now, shift)).forEach((event, index) => {
        if (scenario === 'missing' && index < 2) return;
        records[event.id] = event.at + (scenario === 'late' && index < 2 ? 45 : 4) * MINUTE;
      });
    }
  }
  return { medicines, records, legacy: {}, authorized: false };
}

function readState() {
  const initial = plan(Date.now());
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (current && Array.isArray(current.medicines) && current.records) return current;
    const previous = JSON.parse(localStorage.getItem(LEGACY_KEY));
    initial.legacy = previous?.confirmations || {};
  } catch {
    // Start with fictitious data when browser storage is unavailable.
  }
  return initial;
}

let personal = readState();
let demonstration = null;
let preferences = { large: false, contrast: false };
try {
  preferences = { ...preferences, ...JSON.parse(localStorage.getItem(STORAGE_KEY + '/accessibility')) };
} catch {
  // Accessibility controls remain available for this session.
}
let activeTab = 'elderly';
let selectedId = '';
let shownReminder = null;
let currentMinute = '';
let seen = new Set();

const state = () => demonstration?.data || personal;
const now = () => Date.now() + (demonstration?.offset || 0);
const dailyEvents = time => occurrences(state().medicines, dateAt(time));

function persist() {
  if (demonstration) return true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(personal));
    return true;
  } catch {
    return false;
  }
}

function announce(message) {
  byId('announcement').textContent = message;
}

function relativeDays(time, data = state()) {
  return Array.from({ length: WINDOW_DAYS }, (_, index) => occurrences(data.medicines, dateAt(time, -index)));
}

function status(event, time, data = state()) {
  if (data.legacy?.[dateKey(dateAt(event.at))]?.includes(event.medicine.id)) return 'legacy';
  return statusOf(event, data.records, time);
}

function statusLabel(event, time) {
  return labels[status(event, time)] || 'Confirmação anterior sem carimbo de hora';
}

function orientation(medicine) {
  return [medicine.purpose, medicine.usage, medicine.care].join(' ');
}

function showPhoto(element, medicine) {
  const valid = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(medicine.photo || '');
  element.classList.toggle('hidden', !valid);
  if (valid) element.src = medicine.photo;
  else element.removeAttribute('src');
  return valid;
}

function educationalText(time, data = state()) {
  const eligible = relativeDays(time, data).flat().filter(event => status(event, time, data) !== 'legacy');
  return messages[classify(eligible, data.records, time)];
}

function renderElderly() {
  const time = now();
  const list = dailyEvents(time);
  const current = list.find(event => event.id === selectedId) ||
    list.find(event => status(event, time) === 'pending') ||
    list.find(event => status(event, time) === 'future') || list[0];
  byId('demoStatus').textContent = demonstration ? 'Relógio simulado · ' + clock.format(time) : calendar.format(time);
  byId('leaveDemo').classList.toggle('hidden', !demonstration);
  byId('consent').disabled = Boolean(demonstration);
  byId('medForm').querySelector('button').disabled = Boolean(demonstration);
  byId('consent').setAttribute('aria-pressed', personal.authorized);
  byId('consent').textContent = personal.authorized ? 'Revogar consulta' : 'Autorizar consulta';
  byId('consentStatus').textContent = personal.authorized
    ? 'Consulta autorizada neste navegador.' : 'Consulta fechada.';
  byId('mainDoseContainer').classList.toggle('hidden', !current);
  const switcher = byId('medSwitcher');
  switcher.replaceChildren(...list.map(event => {
    const button = document.createElement('button');
    button.className = 'control';
    button.dataset.event = event.id;
    button.setAttribute('aria-pressed', String(current?.id === event.id));
    button.textContent = [event.time, event.medicine.name, statusLabel(event, time)].join(' · ');
    return button;
  }));
  if (current) {
    const med = current.medicine;
    const result = status(current, time);
    const confirmed = ['punctual', 'late', 'legacy'].includes(result);
    const [color, hex] = colors[med.color] || colors.blue;
    byId('elderlyDoseTime').textContent = current.time;
    byId('elderlyMedName').textContent = med.name;
    byId('elderlyMedDose').textContent = med.dose;
    byId('elderlyBulaSimplified').textContent = orientation(med);
    byId('medSource').textContent = 'Fonte: ' + med.source;
    byId('visualBoxTitle').textContent = med.name;
    byId('visualStripeText').textContent = 'Faixa ' + color.toLowerCase();
    byId('visualBoxStripe').style.backgroundColor = hex;
    byId('visualColorLabel').textContent = 'Caixa com faixa ' + color.toLowerCase();
    byId('boxIllustration').classList.toggle('hidden', showPhoto(byId('medPhoto'), med));
    byId('doseHeaderStatusText').textContent = statusLabel(current, time);
    byId('btnConfirmDose').disabled = confirmed || result === 'future';
    byId('btnConfirmDose').dataset.event = current.id;
    byId('btnConfirmText').textContent = confirmed ? 'Confirmação registrada' : 'Registrar confirmação';
    byId('postConfirmationEduCard').classList.toggle('hidden', !confirmed);
    byId('confirmedTimestampBadge').textContent = state().records[current.id] === undefined
      ? 'Registro anterior' : 'Registrado às ' + clock.format(state().records[current.id]);
    const [, message, source] = educationalText(time);
    byId('postDoseTipText').textContent = message + ' Fonte: ' + source;
  }

  const count = list.filter(event => ['punctual', 'late', 'legacy'].includes(status(event, time))).length;
  const bar = byId('gameProgressBar');
  bar.setAttribute('aria-valuemax', Math.max(1, list.length));
  bar.setAttribute('aria-valuenow', count);
  byId('gameProgressFill').style.width = (100 * count / Math.max(list.length, 1)) + '%';
  byId('gameTodayCount').textContent = count + ' de ' + list.length + ' registros';
  byId('gameTodayMessage').textContent = 'Cada confirmação ajuda a acompanhar seus horários.';
  const streak = regularity(relativeDays(time), state().records, time);
  byId('gameStreak').textContent = streak + (streak === 1 ? ' dia' : ' dias');

  renderHistory(byId('ownHistory'), false);
}

function renderHistory(container, family) {
  container.replaceChildren();
  if (family && !personal.authorized) {
    container.textContent = 'Consulta fechada. A autorização é feita na aba Idoso.';
    return;
  }

  const time = family ? Date.now() : now();
  const data = family ? personal : state();
  const days = relativeDays(time, data);
  const groups = days.filter(events => events.some(event => event.at <= time));
  const currentKeys = new Map(groups.map(events =>
    [dateKey(dateAt(events[0].at)), new Set(events.map(event => event.medicine.id))]));
  const archived = Object.entries(data.legacy || {}).filter(([key]) =>
    key >= dateKey(dateAt(time, -(WINDOW_DAYS - 1))) && key <= dateKey(dateAt(time)));

  if (!groups.length && !archived.length) {
    container.textContent = 'Nenhum horário registrado neste período.';
    return;
  }

  groups.forEach((events, index) => {
    const detail = document.createElement('details');
    detail.className = 'history-day';
    detail.open = index === 0;
    const heading = document.createElement('summary');
    heading.textContent = calendar.format(events[0].at);
    const list = document.createElement('ul');
    events.filter(event => event.at <= time).forEach(event => {
      const item = document.createElement('li');
      const kind = status(event, time, data);
      const recorded = data.records[event.id];
      item.textContent = [event.time, event.medicine.name, labels[kind] || 'Registro anterior sem horário',
        recorded === undefined ? '' : 'Registro às ' + clock.format(recorded)].filter(Boolean).join(' · ');
      list.append(item);
    });
    detail.append(heading, list);
    container.append(detail);
  });

  const olderRecords = document.createElement('details');
  olderRecords.className = 'history-day';
  const heading = document.createElement('summary');
  heading.textContent = 'Registros da versão anterior';
  const list = document.createElement('ul');
  archived.sort(([a], [b]) => b.localeCompare(a)).forEach(([key, ids]) => {
    ids.filter(id => !currentKeys.get(key)?.has(id)).forEach(id => {
      const item = document.createElement('li');
      const medicine = data.medicines.find(med => med.id === id);
      item.textContent = key.split('-').reverse().join('/') + ' · ' +
        (medicine?.name || 'Medicamento cadastrado na versão anterior') + ' · Confirmação sem carimbo de hora';
      list.append(item);
    });
  });
  if (list.childElementCount) {
    olderRecords.append(heading, list);
    container.append(olderRecords);
  }
}

function renderLab() {
  const time = dateAt(Date.now()).setHours(7, 50, 0, 0);
  const data = plan(time, byId('scenario').value);
  const events = relativeDays(time, data).flat();
  const totals = summarize(events, data.records, time);
  const [title, body, source] = educationalText(time, data);
  const metrics = ['punctual', 'late', 'missing'].map(kind =>
    '<li><strong>' + totals[kind] + '</strong> ' + labels[kind] +
    (totals.total ? ' · ' + percent.format(totals[kind] / totals.total) : '') + '</li>');
  byId('scenarioResult').innerHTML = '<p>' + totals.total +
    ' horários classificados na janela de 30 dias.</p><ul class="scenario-metrics">' + metrics.join('') +
    '</ul><h2 class="text-xl font-extrabold">' + title + '</h2><p>' + body + '</p><small>Fonte: ' + source + '</small>';
}

function switchTab(tab) {
  if (!tabs.includes(tab)) return;
  window.speechSynthesis?.cancel();
  activeTab = tab;
  tabs.forEach(key => {
    byId('view-' + key).classList.toggle('hidden', key !== tab);
    const button = byId('tab-' + key);
    button.classList.toggle('active', key === tab);
    if (key === tab) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (tab === 'elderly') renderElderly();
  if (tab === 'family') renderHistory(byId('familyHistory'), true);
  if (tab === 'lab') renderLab();
}

function speakCurrentMedication(medicine) {
  const med = medicine || dailyEvents(now()).find(event => event.id === byId('btnConfirmDose').dataset.event)?.medicine;
  if (!med) return;
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    announce('Leitura em voz alta indisponível neste navegador.');
    return;
  }
  window.speechSynthesis.cancel();
  const speech = new SpeechSynthesisUtterance([med.name, med.dose, orientation(med)].join('. '));
  speech.lang = 'pt-BR';
  speech.rate = .88;
  speech.onerror = event => {
    if (!['canceled', 'interrupted'].includes(event.error)) announce('A orientação continua disponível em texto.');
  };
  window.speechSynthesis.speak(speech);
}

function confirmMedicationDose(id = byId('btnConfirmDose').dataset.event) {
  const time = now();
  const event = shownReminder?.id === id ? shownReminder : dailyEvents(time).find(item => item.id === id);
  if (!event || activeTab !== 'elderly' || event.at > time) return;
  if (['punctual', 'late', 'legacy'].includes(status(event, time))) return;
  state().records[id] = time;
  selectedId = id;
  const saved = persist();
  renderElderly();
  announce(saved ? 'Confirmação registrada.' : 'Confirmação registrada nesta sessão.');
  if (dialog.open) {
    const [title, body, source] = educationalText(time);
    dialog.innerHTML = '<div class="reminder-content"><h2 id="reminderTitle" tabindex="-1">Confirmação registrada</h2>' +
      '<h3>' + title + '</h3><p>' + body + '</p><p><small>Fonte: ' + source +
      '</small></p><button class="control primary" id="reminderDone">Voltar à rotina</button></div>';
    byId('reminderDone').onclick = () => dialog.close();
    byId('reminderTitle').focus();
  } else {
    byId('postConfirmationEduCard').focus();
  }
}

function openReminder(event) {
  if (!event || dialog.open || activeTab !== 'elderly') return;
  const med = event.medicine;
  seen.add(event.id);
  shownReminder = event;
  dialog.innerHTML = '<div class="reminder-content"><p>Horário cadastrado · ' + event.time +
    '</p><h2 id="reminderTitle"></h2><img id="reminderPhoto" class="hidden med-photo" alt="Foto fictícia">' +
    '<p id="reminderDose"></p><p id="reminderOrientation"></p><p id="reminderSource"></p>' +
    '<div class="access-tools"><button class="control primary" id="reminderConfirm" autofocus>Registrar confirmação</button>' +
    '<button class="control" id="reminderSpeak">Ouvir orientação</button>' +
    '<button class="control" id="reminderClose">Fechar lembrete</button></div></div>';
  byId('reminderTitle').textContent = med.name;
  byId('reminderDose').textContent = med.dose;
  byId('reminderOrientation').textContent = orientation(med);
  byId('reminderSource').textContent = 'Fonte: ' + med.source;
  showPhoto(byId('reminderPhoto'), med);
  byId('reminderConfirm').onclick = () => confirmMedicationDose(event.id);
  byId('reminderSpeak').onclick = () => speakCurrentMedication(med);
  byId('reminderClose').onclick = () => dialog.close();
  dialog.showModal();
}

function startScenario(scenario = 'initial') {
  const start = dateAt(Date.now()).setHours(7, 50, 0, 0);
  demonstration = { data: plan(start, scenario), offset: start - Date.now() };
  selectedId = '';
  seen = new Set();
  switchTab('elderly');
  simulateReminder();
}

function simulateReminder() {
  if (!demonstration) {
    startScenario();
    return;
  }
  const time = now();
  const list = dailyEvents(time);
  const pending = list.find(event => status(event, time) === 'pending');
  const next = pending || list.find(event => event.at > time) ||
    occurrences(state().medicines, dateAt(time, 1))[0];
  if (!next) return;
  if (!pending) demonstration.offset = next.at - Date.now();
  selectedId = next.id;
  renderElderly();
  openReminder(next);
}

async function handleAddMedication(event) {
  event.preventDefault();
  if (activeTab !== 'elderly' || demonstration) return;
  const form = event.currentTarget;
  const fields = new FormData(form);
  const values = Object.fromEntries(['name', 'dose', 'source', 'purpose', 'usage', 'care', 'color']
    .map(key => [key, fields.get(key).trim()]));
  const times = [...new Set(fields.get('times').split(',').map(time => time.trim()))].sort();
  const notice = byId('formStatus');
  if (Object.values(values).some(value => !value) || times.some(time => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) {
    notice.textContent = 'Preencha todos os campos e use horários como 08:00, 20:00.';
    return;
  }
  const file = fields.get('photo');
  if (file.size && (file.size > 500000 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))) {
    notice.textContent = 'Escolha uma foto PNG, JPEG ou WebP de até 500 KB.';
    return;
  }

  const button = form.querySelector('button');
  button.disabled = true;
  try {
    const photo = file.size ? await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }) : '';
    if (demonstration || activeTab !== 'elderly') return;
    const id = globalThis.crypto?.randomUUID?.() || Date.now() + '-' + Math.random().toString(36).slice(2);
    const activeSince = Math.floor(Date.now() / MINUTE) * MINUTE;
    personal.medicines.push({ ...values, id, times, photo, activeSince });
    notice.textContent = persist() ? 'Medicamento fictício cadastrado.' : 'Medicamento cadastrado apenas nesta sessão.';
    form.reset();
    renderElderly();
  } catch {
    notice.textContent = 'Não foi possível ler a foto.';
  } finally {
    button.disabled = Boolean(demonstration);
  }
}

byId('medSwitcher').addEventListener('click', event => {
  const button = event.target.closest('button[data-event]');
  if (!button) return;
  window.speechSynthesis?.cancel();
  selectedId = button.dataset.event;
  renderElderly();
  byId('medSwitcher').querySelector('[aria-pressed="true"]')?.focus();
});
byId('simulateReminder').onclick = simulateReminder;
byId('tryScenario').onclick = () => startScenario(byId('scenario').value);
byId('scenario').onchange = renderLab;
byId('leaveDemo').onclick = () => {
  demonstration = null;
  selectedId = '';
  seen = new Set();
  renderElderly();
  byId('simulateReminder').focus();
};
byId('consent').onclick = () => {
  if (demonstration || activeTab !== 'elderly') return;
  personal.authorized = !personal.authorized;
  const saved = persist();
  renderElderly();
  announce(saved ? byId('consentStatus').textContent : 'A permissão vale apenas nesta sessão.');
};
byId('medForm').addEventListener('submit', handleAddMedication);
dialog.addEventListener('close', () => {
  shownReminder = null;
  window.speechSynthesis?.cancel();
  if (document.activeElement === document.body) byId('mainDoseContainer').focus();
});
byId('mainDoseContainer').tabIndex = -1;
byId('postConfirmationEduCard').tabIndex = -1;

function applyAccessibility() {
  document.documentElement.classList.toggle('large-text', preferences.large);
  document.documentElement.classList.toggle('high-contrast', preferences.contrast);
  byId('large-text').setAttribute('aria-pressed', preferences.large);
  byId('contrast').setAttribute('aria-pressed', preferences.contrast);
}

for (const [id, key] of [['large-text', 'large'], ['contrast', 'contrast']]) {
  byId(id).onclick = () => {
    preferences[key] = !preferences[key];
    applyAccessibility();
    try {
      localStorage.setItem(STORAGE_KEY + '/accessibility', JSON.stringify(preferences));
    } catch {
      // The active preference still applies in this tab.
    }
  };
}

function tick() {
  if (activeTab !== 'elderly' || dialog.open || document.hidden) return;
  const time = now();
  const minute = Math.floor(time / MINUTE);
  if (minute !== currentMinute && !byId('view-elderly').contains(document.activeElement)) {
    currentMinute = minute;
    renderElderly();
  }
  const pending = dailyEvents(time).find(event => !seen.has(event.id) && status(event, time) === 'pending');
  openReminder(pending);
}

window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY) return;
  personal = readState();
  if (activeTab === 'family') renderHistory(byId('familyHistory'), true);
  if (activeTab === 'elderly' && !dialog.open) renderElderly();
});

applyAccessibility();
switchTab('elderly');
setInterval(tick, 1000);
