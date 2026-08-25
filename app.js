const data = window.QUIZ_DATA;
const saved = JSON.parse(localStorage.getItem("estudo-focado-progress") || "{}");
const state = { book: 0, filter: "all", visible: [], index: 0, selected: null, progress: saved };
const $ = (id) => document.getElementById(id);

function save() { localStorage.setItem("estudo-focado-progress", JSON.stringify(state.progress)); }
function currentBook() { return data.books[state.book]; }
function currentQuestion() { return state.visible[state.index]; }
function answerFor(q) { return state.progress[q.id]; }
function paragraphs(text) { return text.replaceAll("\n\n", "<br><br>"); }

function buildMenu() {
  $("book-menu").innerHTML = data.books.map((b, i) => `<button class="book-button ${i === state.book ? "active" : ""}" data-book="${i}"><span>${b.title}</span><small>${b.questions.length}</small></button>`).join("");
  document.querySelectorAll("[data-book]").forEach(btn => btn.onclick = () => selectBook(+btn.dataset.book));
}

function selectBook(i) {
  state.book = i; state.index = 0; state.selected = null;
  applyFilter(); buildMenu(); closeMenu();
}

function applyFilter() {
  const book = currentBook();
  state.visible = book.questions.filter(q => state.filter === "all" || (state.filter === "hot" && q.hot) || (state.filter === "emphasis" && q.emphasis) || (state.filter === "unanswered" && !answerFor(q)));
  if (state.index >= state.visible.length) state.index = Math.max(0, state.visible.length - 1);
  renderBook(); renderQuestion();
}

function renderBook() {
  const book = currentBook();
  const done = book.questions.filter(answerFor).length;
  const correct = book.questions.filter(q => answerFor(q)?.choice === q.answer).length;
  const pct = done ? Math.round(correct / done * 100) : 0;
  $("book-title").textContent = book.title;
  $("book-kicker").textContent = `${book.questions.length} questões · ${new Set(book.questions.map(q => q.section)).size} blocos temáticos`;
  $("book-summary").textContent = "Responda no seu ritmo. O gabarito comentado permanece oculto até a confirmação.";
  $("score-value").textContent = `${pct}%`;
  $("score-ring").style.setProperty("--score", `${pct * 3.6}deg`);
  $("score-label").textContent = done ? `${correct} acerto${correct === 1 ? "" : "s"}` : "Comece agora";
  $("score-detail").textContent = done ? `${done} de ${book.questions.length} respondidas` : "Nenhuma resposta confirmada";
  const globalDone = Object.keys(state.progress).length;
  $("global-progress").textContent = globalDone;
  $("global-total").textContent = data.total;
  $("question-select").innerHTML = state.visible.map((q, i) => `<option value="${i}" ${i === state.index ? "selected" : ""}>${q.number}. ${q.title}</option>`).join("");
}

function renderQuestion() {
  const q = currentQuestion();
  $("question-card").hidden = !q; $("empty-state").hidden = !!q;
  if (!q) return;
  const answered = answerFor(q); state.selected = answered?.choice || null;
  $("question-number").textContent = `Questão ${q.number} de ${currentBook().questions.length}`;
  $("question-section").textContent = q.section;
  $("question-title").textContent = q.title;
  $("question-prompt").innerHTML = paragraphs(q.prompt);
  $("source-note").textContent = q.source;
  $("badges").innerHTML = `${q.hot ? '<span class="badge hot">⚠ Quente</span>' : ""}${q.emphasis ? '<span class="badge emphasis">Ênfase em sala</span>' : ""}`;
  $("options").innerHTML = '<legend>Selecione uma alternativa</legend>' + Object.entries(q.options).map(([letter, text]) => {
    const cls = ["option", state.selected === letter ? "selected" : "", answered ? "locked" : "", answered && letter === q.answer ? "correct" : "", answered && letter === answered.choice && letter !== q.answer ? "wrong" : ""].filter(Boolean).join(" ");
    return `<label class="${cls}"><input type="radio" name="answer" value="${letter}" ${state.selected === letter ? "checked" : ""} ${answered ? "disabled" : ""}><span class="option-letter">${letter}</span><span>${text}</span></label>`;
  }).join("");
  document.querySelectorAll('input[name="answer"]').forEach(input => input.onchange = () => { state.selected = input.value; $("confirm-button").disabled = false; renderOptionSelection(); });
  $("confirm-button").disabled = !!answered || !state.selected;
  $("confirm-button").textContent = answered ? "Resposta confirmada" : "Confirmar resposta";
  $("prev-button").disabled = state.index === 0;
  $("next-button").disabled = state.index === state.visible.length - 1;
  renderFeedback(q, answered);
  $("question-select").value = state.index;
}

function renderOptionSelection() {
  document.querySelectorAll(".option").forEach(label => label.classList.toggle("selected", label.querySelector("input").value === state.selected));
}

function renderFeedback(q, answered) {
  const box = $("feedback"); box.hidden = !answered;
  if (!answered) { box.innerHTML = ""; return; }
  const correct = answered.choice === q.answer;
  box.className = `feedback ${correct ? "" : "wrong"}`;
  box.innerHTML = `<h3>${correct ? "Resposta correta" : `Resposta incorreta · Gabarito: ${q.answer}`}</h3>
    <figure class="answer-visual"><img src="${q.visual}" alt="Composição gráfica original da resposta comentada da questão ${q.number}" loading="lazy"><figcaption>Resposta no formato original do material</figcaption></figure>
    <details class="answer-transcript"><summary>Ver transcrição acessível</summary><p>${paragraphs(q.commentary)}</p></details>`;
}

function confirmAnswer() {
  const q = currentQuestion(); if (!q || !state.selected || answerFor(q)) return;
  state.progress[q.id] = { choice: state.selected, at: Date.now() }; save(); renderBook(); renderQuestion();
  setTimeout(() => $("feedback").scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
}

function move(delta) { state.index += delta; state.selected = null; renderBook(); renderQuestion(); window.scrollTo({ top: 0, behavior: "smooth" }); }
function closeMenu(){ $("sidebar").classList.remove("open"); $("scrim").classList.remove("open"); }

document.querySelectorAll("[data-filter]").forEach(btn => btn.onclick = () => { state.filter = btn.dataset.filter; state.index = 0; document.querySelectorAll("[data-filter]").forEach(b => b.classList.toggle("active", b === btn)); applyFilter(); });
$("confirm-button").onclick = confirmAnswer;
$("prev-button").onclick = () => move(-1); $("next-button").onclick = () => move(1);
$("question-select").onchange = e => { state.index = +e.target.value; renderQuestion(); };
$("reset-button").onclick = () => { if (confirm(`Apagar o progresso de ${currentBook().title}?`)) { currentBook().questions.forEach(q => delete state.progress[q.id]); save(); applyFilter(); } };
$("menu-toggle").onclick = () => { $("sidebar").classList.add("open"); $("scrim").classList.add("open"); }; $("scrim").onclick = closeMenu;
buildMenu(); applyFilter();
