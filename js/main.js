document
  .querySelector(".navbar__menu-button")
  .addEventListener("click", function () {
    document.querySelector("body").classList.toggle("menu-open");
    document
      .querySelector(".navbar__menu-button")
      .classList.toggle("navbar__menu-button--open");
  });
document
  .querySelector(".navbar__links-container")
  .addEventListener("click", function (event) {
    console.log(event.target);
    if (event.target.classList.contains("navbar__links-container")) {
      document.querySelector("body").classList.toggle("menu-open");
      document
        .querySelector(".navbar__menu-button")
        .classList.toggle("navbar__menu-button--open");
    }
  });
