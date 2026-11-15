/* RSVP form for Minh & Mindy. Mounts into #rsvp-form-root. */
(function () {
  'use strict';
  var root = document.getElementById('rsvp-form-root');
  if (!root) return;

  var DRAFT_KEY = 'rsvp-draft-vi-v5';
  var PLACEHOLDER = 'PASTE_APPS_SCRIPT_URL_HERE';
  var EVENTS = [
    ['Intimate Ceremony', 'Intimate Ceremony'],
    ['Reception', 'Reception'],
    ['Both', 'Both']
  ];
  // Reception-only invite: the event question is skipped and this value is sent instead.
  var FIXED_EVENT = (window.RSVP_CONFIG || {}).fixedEvent || '';

  var state = { attending: '', fullName: '', group: '', joiningFor: '', vegetarian: '' };
  var submissionId = newId();
  var sending = false;

  function newId() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }
  function store(fn) { try { return fn(window.localStorage); } catch (e) { return null; } }
  function saveDraft() { store(function (s) { s.setItem(DRAFT_KEY, JSON.stringify(state)); }); }
  function clearDraft() { store(function (s) { s.removeItem(DRAFT_KEY); }); }
  function loadDraft() {
    var raw = store(function (s) { return s.getItem(DRAFT_KEY); });
    if (!raw) return;
    try {
      var d = JSON.parse(raw);
      // Never restore the Có/Không answer: the form always opens with nothing selected.
      Object.keys(state).forEach(function (k) { if (k !== 'attending' && typeof d[k] === 'string') state[k] = d[k]; });
    } catch (e) {}
  }

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) el.appendChild(c); });
    return el;
  }

  // ---------- build DOM ----------
  var title = h('h2', { class: 'rsvp-title', id: 'rsvp-title', text: 'Để gia đình chuẩn bị chu đáo cho việc đón tiếp, xin Quý Khách vui lòng xác nhận tham dự:' });
  var btnYes = h('button', { type: 'button', class: 'rsvp-pill', 'aria-pressed': 'false', text: 'CÓ' });
  var btnNo = h('button', { type: 'button', class: 'rsvp-pill', 'aria-pressed': 'false', text: 'KHÔNG' });
  var choice = h('div', { class: 'rsvp-choice', role: 'group', 'aria-labelledby': 'rsvp-title' }, [btnYes, btnNo]);

  function errEl(id) { return h('p', { class: 'rsvp-error', id: id }); }
  function collapse(content) {
    return h('div', { class: 'rsvp-collapse' }, [h('div', { class: 'rsvp-inner' }, [content])]);
  }

  // name
  var nameIn = h('input', { type: 'text', class: 'rsvp-input', id: 'rsvp-name', name: 'name', autocomplete: 'name', 'aria-describedby': 'rsvp-name-err', maxlength: '200' });
  var nameErr = errEl('rsvp-name-err');
  var nameField = h('div', { class: 'rsvp-field' }, [
    h('label', { class: 'rsvp-label', for: 'rsvp-name', text: 'Họ và Tên' }), nameIn, nameErr]);

  // group (attending guests only, optional)
  var groupIn = h('input', { type: 'text', class: 'rsvp-input', id: 'rsvp-group', name: 'group', autocomplete: 'off', maxlength: '200' });
  var groupRow = collapse(h('div', { class: 'rsvp-field' }, [
    h('label', { class: 'rsvp-label', for: 'rsvp-group', text: 'Quý Khách vui lòng cho biết mình thuộc nhóm nào (vd: Đồng nghiệp + tên công ty, Bạn ĐH, Bạn phổ thông + tên trường...)' }), groupIn]));

  // event
  var radios = EVENTS.map(function (ev, i) {
    var inp = h('input', { type: 'radio', name: 'joiningFor', value: ev[0], id: 'rsvp-ev-' + i });
    return { input: inp, el: h('label', { class: 'rsvp-radio', for: 'rsvp-ev-' + i }, [inp, h('span', { text: ev[1] })]) };
  });
  var eventErr = errEl('rsvp-event-err');
  var eventFieldset = h('fieldset', { class: 'rsvp-field', 'aria-describedby': 'rsvp-event-err' }, [
    h('legend', { text: 'Bạn sẽ tham dự phần nào của buổi lễ?' }),
    h('div', { class: 'rsvp-radios' }, radios.map(function (r) { return r.el; })), eventErr]);
  var eventRow = collapse(eventFieldset);

  // dietary

  // note
  var vegRadios = [['Có', 'Có'], ['Không', 'Không']].map(function (v, i) {
    var inp = h('input', { type: 'radio', name: 'vegetarian', value: v[0], id: 'rsvp-veg-' + i });
    return { input: inp, el: h('label', { class: 'rsvp-radio', for: 'rsvp-veg-' + i }, [inp, h('span', { text: v[1] })]) };
  });
  var vegRow = collapse(h('fieldset', { class: 'rsvp-field' }, [
    h('legend', { text: 'Quý Khách có dùng chay hay không?' }),
    h('div', { class: 'rsvp-radios rsvp-radios-2' }, vegRadios.map(function (r) { return r.el; }))]));

  // honeypot
  var hpIn = h('input', { type: 'text', name: 'website', id: 'rsvp-website', tabindex: '-1', autocomplete: 'off' });
  var hp = h('div', { class: 'rsvp-hp', 'aria-hidden': 'true' }, [h('label', { for: 'rsvp-website', text: 'Để trống ô này' }), hpIn]);

  var nameWrap = h('div', { class: 'rsvp-collapse-static' }, [nameField]);
  nameWrap.style.marginBottom = '22px';

  var card = h('div', { class: 'rsvp-card', hidden: '' }, [nameWrap, groupRow, eventRow, vegRow, hp]);

  var submitBtn = h('button', { type: 'submit', class: 'rsvp-submit', text: 'Xác nhận' });
  var resetBtn = h('button', { type: 'button', class: 'rsvp-link', text: 'Làm lại' });
  var status = h('p', { class: 'rsvp-status', role: 'status', 'aria-live': 'polite' });
  var actions = h('div', { class: 'rsvp-actions', hidden: '' }, [submitBtn, h('br'), resetBtn, status]);

  var form = h('form', { class: 'rsvp-form', novalidate: '', 'aria-labelledby': 'rsvp-title' }, [card, actions]);

  var thanks = h('div', { class: 'rsvp-thanks', hidden: '', tabindex: '-1' });

  root.textContent = '';
  [title, choice, form, thanks].forEach(function (n) { root.appendChild(n); });

  // ---------- rendering ----------
  function setHidden(row, hidden) {
    row.classList.toggle('is-hidden', hidden);
    if (hidden) { row.setAttribute('inert', ''); row.setAttribute('aria-hidden', 'true'); }
    else { row.removeAttribute('inert'); row.removeAttribute('aria-hidden'); }
  }

  function render() {
    var yes = state.attending === 'Yes', no = state.attending === 'No';
    btnYes.setAttribute('aria-pressed', yes);
    btnNo.setAttribute('aria-pressed', no);
    var picked = yes || no;
    card.hidden = !picked; actions.hidden = !picked;
    setHidden(eventRow, !yes || !!FIXED_EVENT);
    setHidden(vegRow, !yes);
    setHidden(groupRow, !yes);
    radios.forEach(function (r) { r.input.checked = r.input.value === state.joiningFor; });
    nameIn.value = state.fullName; groupIn.value = state.group;
    vegRadios.forEach(function (r) { r.input.checked = r.input.value === state.vegetarian; });
  }

  function setErr(input, errNode, msg) {
    errNode.textContent = msg || '';
    if (input) { if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); }
  }
  function clearErrors() {
    setErr(nameIn, nameErr); setErr(null, eventErr);
    status.textContent = ''; status.classList.remove('is-error');
  }

  // ---------- events ----------
  function setStatus(msg, isErr) { status.textContent = msg; status.classList.toggle('is-error', !!isErr); }

  function choose(v) { state.attending = v; clearErrors(); render(); saveDraft(); }
  btnYes.addEventListener('click', function () { choose('Yes'); });
  btnNo.addEventListener('click', function () { choose('No'); });

  radios.forEach(function (r) {
    r.input.addEventListener('change', function () { state.joiningFor = r.input.value; setErr(null, eventErr); saveDraft(); });
  });
  nameIn.addEventListener('input', function () { state.fullName = nameIn.value; if (nameIn.value.trim()) setErr(nameIn, nameErr); saveDraft(); });
  groupIn.addEventListener('input', function () { state.group = groupIn.value; saveDraft(); });
  vegRadios.forEach(function (r) {
    r.input.addEventListener('change', function () { state.vegetarian = r.input.value; saveDraft(); });
  });

  resetBtn.addEventListener('click', function () {
    if (sending) return;
    resetAll();
  });
  function resetAll() {
    Object.keys(state).forEach(function (k) { state[k] = ''; });
    hpIn.value = ''; submissionId = newId();
    clearDraft(); clearErrors(); render();
    thanks.hidden = true; form.hidden = false; choice.hidden = false; title.hidden = false;
  }

  // ---------- validation ----------
  function validate() {
    clearErrors();
    var yes = state.attending === 'Yes';
    var first = null;
    function bad(el, node, msg, input) { setErr(input, node, msg); if (!first) first = el; }
    if (!state.fullName.trim()) bad(nameIn, nameErr, 'Cho chúng mình biết tên bạn nhé.', nameIn);
    if (yes && !FIXED_EVENT && !state.joiningFor) bad(radios[0].input, eventErr, 'Vui lòng chọn phần bạn sẽ tham dự.', null);
    if (first) first.focus();
    return !first;
  }

  // ---------- submit ----------
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending || !state.attending) return;
    if (!validate()) return;
    var cfg = window.RSVP_CONFIG || {};
    var endpoint = cfg.endpoint;
    if (!endpoint || endpoint.indexOf(PLACEHOLDER) !== -1) {
      console.warn('[RSVP] config.js still has the placeholder endpoint. Deploy the Apps Script (see apps-script/SETUP.md) and paste its /exec URL into site/config.js.');
      setStatus('Xin lỗi, biểu mẫu chưa được kết nối. Vui lòng thử lại sau hoặc liên hệ trực tiếp với chúng mình.', true);
      return;
    }
    var yes = state.attending === 'Yes';
    var payload = {
      attending: state.attending,
      fullName: state.fullName.trim(),
      group: yes ? state.group.trim() : '',
      joiningFor: yes ? (FIXED_EVENT || state.joiningFor) : '',
      vegetarian: yes ? state.vegetarian : '',
      submissionId: submissionId,
      website: hpIn.value
    };
    sending = true;
    submitBtn.disabled = true; submitBtn.textContent = 'Đang gửi…';
    resetBtn.disabled = true;
    setStatus('Đang gửi phản hồi của bạn…', false);

    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 25000);
    fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || j.ok !== true) throw new Error((j && j.error) || 'Unexpected response');
      success(payload);
    }).catch(function (err) {
      console.error('[RSVP] submit failed', err);
      setStatus('Ôi, có lỗi khi gửi phản hồi. Câu trả lời của bạn vẫn còn đây, vui lòng thử lại sau giây lát nhé.', true);
    }).then(function () {
      clearTimeout(timer);
      sending = false; submitBtn.disabled = false; submitBtn.textContent = 'Xác nhận'; resetBtn.disabled = false;
    });
  });

  function success(p) {
    clearDraft();
    thanks.textContent = '';
    thanks.appendChild(h('h3', { text: 'Xin Chân Thành Cảm Ơn' }));
    form.hidden = true; choice.hidden = true; title.hidden = true; thanks.hidden = false;
    thanks.focus();
  }

  loadDraft();
  render();
})();
