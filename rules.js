'use strict'

const MINUTE = 60000
const WINDOW_DAYS = 30
const LATE_AFTER = 15 * MINUTE
const MISSING_AFTER = 2 * 60 * MINUTE

const messages = {
  initial: ['Organize seus horários', 'Veja seus horários na tela de hoje. O histórico mostra o que você registrou.', 'PTCC, seção 4.5'],
  punctual: ['Sua rotina está em dia', 'Que bom que você está acompanhando seus horários. Continue consultando seus lembretes.', 'PTCC, Quadro 5'],
  late: ['Ligue o lembrete à sua rotina', 'Quando o lembrete aparecer, abra a tela de hoje. Assim fica fácil conferir o horário.', 'PTCC, Quadro 5 · Gollwitzer (1999)'],
  missing: ['Você pode continuar', 'Alguns horários ficaram sem registro. Tudo bem. Se tiver dúvida sobre o remédio, fale com seu médico ou farmacêutico.', 'PTCC, Quadro 5'],
  mixed: ['Confira seus lembretes', 'Escolha um momento da rotina para conferir a tela de hoje.', 'PTCC, seção 4.5 · Gollwitzer (1999)']
}

function dateAt(time, shift = 0) {
  const date = new Date(time)
  date.setDate(date.getDate() + shift)
  return date
}

function dateKey(date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map(value => String(value).padStart(2, '0')).join('-')
}

function occurrences(medicines, day) {
  return medicines.flatMap(medicine => medicine.times.map(time => {
    const key = dateKey(day)
    const at = new Date(key + 'T' + time).getTime()
    return { medicine, time, at, id: medicine.id + '/' + key + '/' + time }
  })).filter(event => event.at >= event.medicine.activeSince).sort((a, b) => a.at - b.at)
}

function statusOf(event, records, now) {
  const confirmed = records[event.id]
  if (confirmed !== undefined && confirmed <= now) {
    return confirmed - event.at <= LATE_AFTER ? 'punctual' : 'late'
  }
  if (now >= event.at + MISSING_AFTER) return 'missing'
  return now >= event.at ? 'pending' : 'future'
}

function summarize(events, records, now) {
  const totals = { punctual: 0, late: 0, missing: 0 }
  for (const event of events) {
    const status = statusOf(event, records, now)
    if (Object.hasOwn(totals, status)) totals[status] += 1
  }
  const total = totals.punctual + totals.late + totals.missing
  return { ...totals, total }
}

function classify(events, records, now) {
  const { punctual, late, missing, total } = summarize(events, records, now)
  if (total < 5) return 'initial'
  if (missing / total >= .30) return 'missing'
  if (late / total >= .30) return 'late'
  if (punctual / total >= .80) return 'punctual'
  return 'mixed'
}

function regularity(days, records, now) {
  const complete = events => events.length > 0 && events.every(event => statusOf(event, records, now) === 'punctual')
  const today = days[0]
  const todayOpen = today.some(event => ['pending', 'future'].includes(statusOf(event, records, now)))
  const todayBroken = today.some(event => ['late', 'missing'].includes(statusOf(event, records, now)))
  const start = todayOpen && !todayBroken ? 1 : 0
  let count = 0
  for (const events of days.slice(start)) {
    if (!complete(events)) break
    count += 1
  }
  return count
}

if (typeof module !== 'undefined') module.exports = { MINUTE, LATE_AFTER, MISSING_AFTER, classify, summarize, statusOf, regularity, occurrences, dateAt }
