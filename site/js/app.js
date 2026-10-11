(function () {
  const catalog = window.KILRKROW_CATALOG || [];
  const grid = document.getElementById("tool-grid");
  const preview = document.getElementById("script-preview");
  const scriptActions = document.getElementById("script-actions");
  const downloadLink = document.getElementById("download-script");
  const hint = document.getElementById("install-hint");

  function selectedIds() {
    return [...document.querySelectorAll('input[data-tool]:checked')].map((el) => el.getAttribute("data-tool"));
  }

  function selectedTools() {
    const ids = new Set(selectedIds());
    return catalog.filter((t) => ids.has(t.id));
  }

  function buildScript(tools) {
    const lines = [
      "# Kilrkrow one-shot installer",
      "# Run in elevated PowerShell (Run as administrator).",
      "# Prefers winget, then Chocolatey, then GitHub Release download.",
      "$ErrorActionPreference = 'Stop'",
      "$Root = Join-Path $env:LOCALAPPDATA 'Kilrkrow\\apps'",
      "New-Item -ItemType Directory -Force -Path $Root | Out-Null",
      "function Test-Admin { ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator) }",
      "if (-not (Test-Admin)) { Write-Warning 'Not elevated - MSI/setup installs may prompt or fail. Re-run as Administrator for best results.' }",
      "function Install-Winget([string]$Id) { if (Get-Command winget -ErrorAction SilentlyContinue) { winget install --id $Id -e --accept-package-agreements --accept-source-agreements; return $true }; return $false }",
      "function Install-Choco([string]$Id) { if (Get-Command choco -ErrorAction SilentlyContinue) { choco install $Id -y; return $true }; return $false }",
      "function Install-Url([string]$Name, [string]$Url, [string]$Kind) {",
      "  $destDir = Join-Path $Root $Name",
      "  New-Item -ItemType Directory -Force -Path $destDir | Out-Null",
      "  $file = Join-Path $destDir ([IO.Path]::GetFileName(($Url -split '\\?')[0]))",
      "  Write-Host \"Downloading $Name ...\" -ForegroundColor Cyan",
      "  Invoke-WebRequest -Uri $Url -OutFile $file",
      "  if ($Kind -eq 'zip') { Expand-Archive -Path $file -DestinationPath $destDir -Force; Write-Host \"Extracted to $destDir\" }",
      "  else { Write-Host \"Saved $file\" }",
      "}",
      ""
    ];
    for (const t of tools) {
      lines.push(`Write-Host '==> ${t.name}' -ForegroundColor Green`);
      if (t.wingetId) {
        lines.push(`if (-not (Install-Winget '${t.wingetId}')) {`);
        if (t.chocoId) lines.push(`  if (-not (Install-Choco '${t.chocoId}')) { Install-Url '${t.id}' '${t.downloadUrl}' '${t.installKind}' }`);
        else lines.push(`  Install-Url '${t.id}' '${t.downloadUrl}' '${t.installKind}'`);
        lines.push(`}`);
      } else if (t.chocoId) {
        lines.push(`if (-not (Install-Choco '${t.chocoId}')) { Install-Url '${t.id}' '${t.downloadUrl}' '${t.installKind}' }`);
      } else {
        lines.push(`Install-Url '${t.id}' '${t.downloadUrl}' '${t.installKind}'`);
      }
      lines.push("");
    }
    lines.push("Write-Host 'Done.' -ForegroundColor Cyan");
    return lines.join("\r\n");
  }

  function ensureLightbox() {
    let lb = document.getElementById("screenshot-lightbox");
    if (lb) return lb;
    lb = document.createElement("div");
    lb.id = "screenshot-lightbox";
    lb.className = "lightbox";
    lb.hidden = true;
    lb.innerHTML = `
      <button type="button" class="lightbox-close" aria-label="Close screenshot">Close</button>
      <img class="lightbox-img" alt="" />`;
    document.body.appendChild(lb);

    function close() {
      lb.hidden = true;
      lb.querySelector(".lightbox-img").removeAttribute("src");
      document.body.classList.remove("lightbox-open");
    }

    lb.addEventListener("click", (e) => {
      if (e.target === lb || e.target.classList.contains("lightbox-close")) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !lb.hidden) close();
    });
    return lb;
  }

  function openLightbox(src, alt) {
    const lb = ensureLightbox();
    const img = lb.querySelector(".lightbox-img");
    img.src = src;
    img.alt = alt || "Screenshot";
    lb.hidden = false;
    document.body.classList.add("lightbox-open");
  }

  function render() {
    grid.innerHTML = "";
    for (const t of catalog) {
      const card = document.createElement("article");
      card.className = "card";
      const pkgs = [];
      if (t.wingetId) pkgs.push("winget: " + t.wingetId);
      if (t.chocoId) pkgs.push("choco: " + t.chocoId);
      if (!pkgs.length) pkgs.push("GitHub Release download");

      const shot = (typeof t.screenshot === "string" && t.screenshot.trim())
        ? `<button type="button" class="card-shot" data-shot="${t.screenshot.replace(/"/g, "&quot;")}" aria-label="View ${t.name} screenshot">
            <img src="${t.screenshot.replace(/"/g, "&quot;")}" alt="${t.name} screenshot" loading="lazy" />
          </button>`
        : "";

      card.innerHTML = `
        ${shot}
        <label><input type="checkbox" data-tool="${t.id}" checked /> Install</label>
        <h3>${t.name}</h3>
        <p>${t.blurb}</p>
        <div class="meta">${t.tag} · ${pkgs.join(" · ")}</div>
        <div class="card-actions">
          <a class="primary" href="${t.downloadUrl}">Download</a>
          <a class="ghost" href="${t.repo}" target="_blank" rel="noopener">Repo</a>
        </div>`;

      const shotBtn = card.querySelector(".card-shot");
      if (shotBtn) {
        shotBtn.addEventListener("click", () => {
          openLightbox(shotBtn.getAttribute("data-shot"), t.name + " screenshot");
        });
      }
      grid.appendChild(card);
    }
  }

  function showScript() {
    const tools = selectedTools();
    if (!tools.length) {
      hint.textContent = "Pick at least one tool.";
      preview.hidden = true;
      scriptActions.hidden = true;
      return;
    }
    const script = buildScript(tools);
    preview.textContent = script;
    preview.hidden = false;
    scriptActions.hidden = false;
    const blob = new Blob([script], { type: "text/plain" });
    downloadLink.href = URL.createObjectURL(blob);
    hint.textContent = "Copy or download the script, then run it in an elevated PowerShell window.";
  }

  document.getElementById("select-all").addEventListener("click", () => {
    document.querySelectorAll("input[data-tool]").forEach((el) => { el.checked = true; });
  });
  document.getElementById("select-none").addEventListener("click", () => {
    document.querySelectorAll("input[data-tool]").forEach((el) => { el.checked = false; });
  });
  document.getElementById("install-selected").addEventListener("click", showScript);
  document.getElementById("copy-script").addEventListener("click", async () => {
    await navigator.clipboard.writeText(preview.textContent);
    hint.textContent = "Script copied. Paste into elevated PowerShell.";
  });

  render();
})();
