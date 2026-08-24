import { createGuidanceState, makeTrainerDecision, submitClientEvent } from './state.js';

const $ = selector => document.querySelector(selector);
let state = createGuidanceState();

const executionLabels = { done: 'Wykonane', partial: 'Częściowo', not_done: 'Niewykonane' };

function showView(view) {
  const client = view === 'client';
  $('#client-view').hidden = !client;
  $('#trainer-view').hidden = client;
  $('#show-client').classList.toggle('active', client);
  $('#show-trainer').classList.toggle('active', !client);
  $('#show-client').setAttribute('aria-pressed', String(client));
  $('#show-trainer').setAttribute('aria-pressed', String(!client));
}

function describeEvent(event) {
  if (!event) return 'Brak zgłoszenia. Plan nadal obowiązuje.';
  if (event.type === 'execution') return `Sygnał wykonania: ${executionLabels[event.value]}.`;
  if (event.type === 'question') return `Pytanie klientki: „${event.text}”`;
  return `Niepokój / brak pewności: „${event.text}” — wymagany kontakt z Damianem.`;
}

function render() {
  const { guidance } = state;
  $('#guidance-action').textContent = guidance.action;
  $('#guidance-purpose').textContent = guidance.purpose;
  $('#guidance-dose').textContent = guidance.dose;
  $('#guidance-boundary').textContent = guidance.boundary;
  $('#guidance-channel').textContent = guidance.channel === 'paper'
    ? 'Prowadzenie: papier + uzgodniona komunikacja z Damianem.'
    : 'Prowadzenie: aplikacja.';
  $('#trainer-guidance').textContent = guidance.action;
  $('#trainer-guidance-meta').textContent = `Wersja ${guidance.version} · ${guidance.dose}`;
  $('#latest-event').textContent = describeEvent(state.latestEvent);
  $('#client-message').textContent = state.clientMessage || '';
  $('#trainer-message').textContent = state.trainerConfirmation || '';
}

function submit(event) {
  state = submitClientEvent(state, event);
  render();
}

document.querySelectorAll('[data-execution]').forEach(button => button.addEventListener('click', () => submit({
  type: 'execution', value: button.dataset.execution
})));

$('#send-question').addEventListener('click', () => {
  const text = $('#question').value.trim();
  if (!text) { $('#client-message').textContent = 'Wpisz pytanie albo wróć do aktualnej wskazówki.'; return; }
  submit({ type: 'question', text });
  $('#question').value = '';
});

$('#send-concern').addEventListener('click', () => submit({
  type: 'concern', text: 'Klientka nie wie, czy może kontynuować.'
}));

document.querySelectorAll('[data-decision]').forEach(button => button.addEventListener('click', () => {
  state = makeTrainerDecision(state, button.dataset.decision, { channel: $('#guidance-channel-choice').value });
  render();
}));

$('#show-client').addEventListener('click', () => showView('client'));
$('#show-trainer').addEventListener('click', () => showView('trainer'));
render();
