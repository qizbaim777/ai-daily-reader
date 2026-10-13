(() => {
  "use strict";
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const content = document.getElementById("content");
  const historySelect = document.getElementById("history");
  const starSVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/></svg>';
  const arrowSVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>';
  const escape = value => String(value ?? "").replace(/[&<>"']/g, ch =>
    ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[ch]));
  function validGithubUrl(raw, fallback) {
    try {
      const url = new URL(raw);
      if (url.protocol === "https:" && url.hostname === "github.com" && !url.username && !url.password) return url.href;
    } catch (_) {}
    return fallback;
  }
  function card(project, index) {
    const pieces = String(project.name).split("/");
    const title = pieces[pieces.length - 1];
    const fallback = "https://github.com/" + pieces.map(encodeURIComponent).join("/");
    const url = validGithubUrl(project.update ? project.release?.url : project.url, fallback);
    const translated = project.description_zh || project.description || "暂无简介";
    const growth = Number.isFinite(project.growth) && project.observed_days > 0
      ? '<div class="growth">距上次观察 ' + escape(project.observed_days) + ' 天，Star 变化 ' +
        (project.growth >= 0 ? "+" : "") + escape(project.growth) + '</div>' : "";
    return '<article class="card" data-project-id="' + escape(project.id) + '">' +
      '<div class="topline"><span class="number">' + String(index + 1).padStart(2, "0") + '</span>' +
      '<span class="tag">' + escape(project.category) + '</span><span class="stars">' + starSVG +
      Number(project.stars || 0).toLocaleString("en-US") + '</span></div>' +
      '<h2>' + escape(title) + '</h2><div class="owner">' + escape(project.name) + '</div>' +
      '<p class="desc">' + escape(translated) + '</p>' +
      (project.release_note_zh ? '<p class="release-note">' + escape(project.release_note_zh) + '</p>' : "") +
      '<div class="why"><span class="dot"></span>' + escape(project.reason || "值得关注的 AI 项目") + '</div>' + growth +
      (project.description && translated !== project.description ?
        '<details class="original"><summary>查看简介原文</summary><p>' + escape(project.description) + '</p></details>' : "") +
      '<div class="bottom"><span class="recency">' +
      (project.update ? escape(project.release?.tag || "重要更新") : project.new_project ? "近期新项目" : "近期活跃") +
      '</span><a class="visit" target="_blank" rel="noopener noreferrer" href="' + escape(url) + '">' +
      (project.update ? "查看更新" : "查看项目") + arrowSVG + '</a></div></article>';
  }
  async function getJSON(path) {
    const response = await fetch(path, {cache: "no-store"});
    if (!response.ok) throw new Error("Unable to load digest");
    return response.json();
  }
  async function load(date) {
    content.innerHTML = '<div class="status">正在加载日报…</div>';
    try {
      const data = await getJSON(date ? "daily/" + date + ".json" : "latest.json");
      if (!datePattern.test(data.date) || !Array.isArray(data.projects)) throw new Error("Invalid digest");
      const projects = data.projects, updates = data.updates || [];
      document.getElementById("date").textContent = data.date.replaceAll("-", ".");
      document.getElementById("count").textContent = (projects.length + updates.length) + " 项精选 · 中文阅读";
      document.title = "AI 开源日报 · " + data.date;
      let view = '<div class="list">';
      if (projects.length) view += '<div class="sectionlabel">今日发现</div>' + projects.map(card).join("");
      if (updates.length) view += '<div class="sectionlabel">重要更新</div>' +
        updates.map((project, i) => card(project, projects.length + i)).join("");
      if (!projects.length && !updates.length) view += '<div class="status">今天没有新增推荐，稍后再来看看。</div>';
      content.innerHTML = view + '</div>';
      historySelect.value = data.date;
    } catch (_) {
      content.innerHTML = '<div class="status">这份日报暂时无法加载。<br>请稍后重试，或选择其他日期。<br><br><button class="reload" id="retry">重新加载</button></div>';
      document.getElementById("retry").onclick = () => load(date);
    }
  }
  async function start() {
    const requested = new URLSearchParams(location.search).get("date");
    const date = requested && datePattern.test(requested) ? requested : "";
    try {
      const archive = await getJSON("archive.json");
      historySelect.innerHTML = (archive.dates || []).filter(d => datePattern.test(d))
        .map(d => '<option value="' + d + '">' + d + '</option>').join("");
    } catch (_) {
      historySelect.innerHTML = '<option value="">最新日报</option>';
    }
    historySelect.onchange = () => {
      const date = historySelect.value;
      const url = new URL(location.href);
      if (date) url.searchParams.set("date", date); else url.searchParams.delete("date");
      window.history.replaceState({}, "", url);
      load(date);
    };
    await load(date);
  }
  start();
})();
