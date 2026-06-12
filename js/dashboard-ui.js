// small UI helpers for service-order dashboard
(function () {
  // show placeholder when song list empty
  document.addEventListener("DOMContentLoaded", () => {
    const sel = document.getElementById("songSelect");
    if (sel && sel.options.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Loading songs…";
      sel.appendChild(opt);
    }
    // sync Top N width nicer
    const top = document.getElementById("topN");
    if (top)
      top.addEventListener("input", () => {
        if (top.value === "") top.value = 1;
      });
  });
})();
