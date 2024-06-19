/*
 * Name: Pranav Madhukar
 * Date: May 17, 2024
 * Section: CSE 154 AC
 *
 * This is the JS to implement a simple interactive login game. It allows
 * users to login and see their standing.
 */

"use strict";

(function() {

  window.addEventListener("load", init);

  /**
   * This function is used to allow the user to choose between logging in (if they
   * have an account) or signing up, and then directs them to the appropriate
   * interface. It servers as a home screen.
   */
  function init() {
    let login = id("login-form");
    let storedUser = localStorage.getItem("user");
    let storedPass = localStorage.getItem("pass");
    if (storedUser && storedPass) {
      let sers = qsa("#login-form input");
      sers[0].value = storedUser;
      sers[1].value = storedPass;
    }
    login.addEventListener("click", toLogin);
  }

  /**
   * This function is used to allow the user to log into their page. It connects
   * to a form with the username and password which it confirms and logs you in.
   */
  function toLogin() {
    let login = id("login-form");
    login.addEventListener("submit", helpToLogin);
  }

  /**
   * This helper function is used to allow the user to log into their page. It
   * connects to an API which contains the database of users and cross checks the
   * details of the log in attempt.
   * @param {object} evt This is the event listener object which is used to prevent
   * the default refreshing of the form.
   */
  function helpToLogin(evt) {
    id("submit-btn").setAttribute("disabled", true);
    document.querySelector(".loading-spinner").classList.remove("invisible");
    evt.preventDefault();
    let vals = qsa("#login-form input");
    if (id("remember-me").checked) {
      localStorage.setItem("user", vals[0].value);
      localStorage.setItem("pass", vals[1].value);
    }
    let cart = window.localStorage.getItem(vals[0].value + "-shopping-cart");
    cart = cart ? cart : "[]";
    let data = new FormData();
    data.append("user", vals[0].value);
    data.append('pass', vals[1].value);
    data.append('cart', cart);
    fetch("/login", {method: 'POST', body: data})
      .then(statusCheck)
      .then(res => res.json())
      .then(res => {
        window.sessionStorage.setItem("user", res["user"]);
        window.sessionStorage.setItem("pass", res["pass"]);
        window.sessionStorage.setItem("alert", res["alert"]);
        window.location.href = "./home/home.html";
      })
      .catch((err) => {
        errorHandle(err, id("login-form"));
      });
  }

  /**
   * This is the function that responds to any error. It displays an appropriate
   * error message on the form for 3 seconds after which the text is removed.
   * @param {object} err This is the error being handled
   * @param {object} parent This is the parent node for which the error message is
   * being made/ displayed.
   */
  function errorHandle(err, parent) {
    id("submit-btn").setAttribute("disabled", false);
    let text = gen("p");
    text.textContent = "ERROR: " + err.message;
    parent.appendChild(text);
    setTimeout(() => {
      parent.removeChild(text);
    }, 3000);
  }

  /**
   * This function is used to check the status of a API request's response. If it
   * is okay, then it does not change the response object. If it has an incorrect status,
   * then it throws an error.
   * @param {object} res This is the API response object.
   * @returns {object} The same (unmodified) API response object.
   */
  async function statusCheck(res) {
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res;
  }

  /** ------------------------------ Helper Functions  ------------------------------ */

  /**
   * Returns the element that has the ID attribute with the specified value.
   * @param {string} idName - element ID
   * @returns {object} DOM object associated with id.
   */
  function id(idName) {
    return document.getElementById(idName);
  }

  /**
   * Returns all elements that matches the given CSS selector.
   * @param {string} selector - CSS query selector.
   * @returns {object} The first DOM object matching the query.
   */
  function qsa(selector) {
    return document.querySelectorAll(selector);
  }

  /**
   * Returns a new element with the given tag name.
   * @param {string} tagName - HTML tag name for new DOM element.
   * @returns {object} New DOM object for given HTML tag.
   */
  function gen(tagName) {
    return document.createElement(tagName);
  }

})();