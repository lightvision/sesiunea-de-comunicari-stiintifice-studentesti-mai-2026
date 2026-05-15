(() => {
  const ensureDeckHeader = () => {
    if (document.querySelector(".deck-header")) return;
    const header = document.createElement("header");
    header.className = "deck-header";
    header.innerHTML = `
      <div class="deck-header__institution">
        <img class="deck-header__logo" src="assets/logo-UTM.webp" alt="Sigla Universitatea Titu Maiorescu" />
        <div class="deck-header__lockup">
          <strong>Universitatea Titu Maiorescu</strong>
          <span>București, România</span>
        </div>
      </div>
      <div class="deck-header__event">Sesiunea de Comunicări Științifice Studențești</div>
    `;
    document.body.appendChild(header);
  };

  const syncCoverFooter = () => {
    if (!window.Reveal || typeof window.Reveal.getCurrentSlide !== "function") {
      return false;
    }

    const currentSlide = window.Reveal.getCurrentSlide();
    document.body.classList.toggle(
      "cover-slide-active",
      currentSlide?.classList.contains("utm-cover") === true
    );
    return true;
  };

  const boot = () => {
    ensureDeckHeader();
    if (!syncCoverFooter()) {
      window.setTimeout(boot, 60);
      return;
    }

    window.Reveal.on("ready", syncCoverFooter);
    window.Reveal.on("slidechanged", syncCoverFooter);
  };

  window.addEventListener("load", boot);
})();
