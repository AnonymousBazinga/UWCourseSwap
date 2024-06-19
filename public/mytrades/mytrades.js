/*
 * Name: Oscar Shijie Song and Pranav Madhukar
 * Date: Jun 3, 2024
 * Section: CSE 154 AC
 * TAs: Kathryn Koehler & Rasmus Makiniemi
 *
 * Code to fetch the current created and concluded trades from the backend and display on the main
 * view. Allows user to delete the created trades.
 */

"use strict";

(function() {
  window.addEventListener("load", init);

  /**
   * Setup the interactive elements on the page
   */
  function init() {
    _showCurrentTrades();

    id("current-trade-button").addEventListener("click", () => {
      if (!id("current-trade-button").classList.contains("active-tab")) {
        _showCurrentTrades();
      }
    });

    id("concluded-trade-button").addEventListener("click", () => {
      if (!id("concluded-trade-button").classList.contains("active-tab")) {
        _showConcludedTrades();
      }
    });
  }

  /**
   * Show the concluded trades on the list view
   */
  async function _showConcludedTrades() {
    _switchTab("concluded-trade-list", "concluded-trade-button");

    try {
      id("concluded-trade-list").replaceChildren();
      let postBody = new FormData();
      postBody.append("user", window.sessionStorage.getItem("user"));
      postBody.append("category", "concluded-trades");

      let pastTrades = await fetch("/get-trades", {
        method: "POST",
        body: postBody
      });
      await statusCheck(pastTrades);
      pastTrades = await pastTrades.json();

      let pastTradeElements = generatePastTradeItemFromData(pastTrades);

      pastTradeElements.forEach((pastTradeElement) => {
        let htmlElement = generateHTMLElementFromJson(pastTradeElement);
        id("concluded-trade-list").appendChild(htmlElement);
      });
    } catch (err) {
      _handleError(err);
    }
  }

  /**
   * show the trades that the user created
   */
  async function _showCurrentTrades() {
    _switchTab("current-trade-list", "current-trade-button");

    try {
      id("current-trade-list").replaceChildren();
      let postBody = new FormData();
      postBody.append("user", window.sessionStorage.getItem("user"));
      postBody.append("category", "current-trades");

      let currentTrades = await fetch("/get-trades", {
        method: "POST",
        body: postBody
      });
      await statusCheck(currentTrades);
      currentTrades = await currentTrades.json();

      let currentTradeElements = generateCurrentTradeItemFromData(currentTrades);

      currentTradeElements.forEach((currentTradeElement) => {
        let htmlElement = generateHTMLElementFromJson(currentTradeElement);
        id("current-trade-list").appendChild(htmlElement);
        htmlElement.querySelector(".cancel-trade-button").addEventListener(
          "click",
          _deleteThisTrade
        );
      });
    } catch (err) {
      _handleError(err);
    }
  }

  /**
   * Delete the trade the user clicked
   */
  async function _deleteThisTrade() {
    let postBody = new FormData();
    let user = window.sessionStorage.getItem("user");

    try {
      postBody.append("trade-id", this.id);
      postBody.append("user", user);
      let deleteStatus = await fetch("/change-trades/delete-trade", {
        method: "POST",
        body: postBody
      });
      await statusCheck(deleteStatus);

      _showCurrentTrades();
    } catch (err) {
      _handleError(err);
    }
  }

  /**
   * Switch the active tab to the tab that the clicked button is referencing
   * @param {String} contentId id of the container of the view to display
   * @param {String} buttonId id of the button clicked
   */
  function _switchTab(contentId, buttonId) {
    let content = id("page-content").children;
    let menuButtons = id("left-side-menu").children;

    for (let i = 0; i < content.length; i++) {
      if (content[i].id !== contentId && content[i].id !== "left-side-menu") {
        content[i].classList.add("invisible");
        content[i].classList.remove("flex");
      }
    }
    id(contentId).classList.remove("invisible");
    id(contentId).classList.add("flex");

    for (let i = 0; i < menuButtons.length; i++) {
      if (menuButtons[i].id !== buttonId && menuButtons[i].id !== "left-side-menu") {
        menuButtons[i].classList.remove("active-tab");
        menuButtons[i].classList.add("normal-tab");
      }
    }
    id(buttonId).classList.add("active-tab");
    id(buttonId).classList.remove("normal-tab");
  }

  /**
   * Generate the html trade item from the data retrieved from the backend
   * @param {Array<Object>} pastTrades list of the concluded trades
   * @returns {htmlElement} list of html elements in json format
   */
  function generatePastTradeItemFromData(pastTrades) {
    let allPastTrades = [];

    for (let i = 0; i < pastTrades.length; i++) {
      let droppedSection = JSON.parse(pastTrades[i]["dropped_section_info"]);
      let receivedSection = JSON.parse(pastTrades[i]["received_section_info"]);
      let data = [
        droppedSection["curriculum_abbreviation"] + droppedSection["course_number"] +
          droppedSection["section"],
        receivedSection["curriculum_abbreviation"] + receivedSection["course_number"] +
          receivedSection["section"],
        (new Date(pastTrades[i]["trade_time"])).toLocaleString(),
        pastTrades[i]["transaction_id"]
      ];

      let tradeTable = [
        {"th": ["Dropped Course", "Added Course", "Transaction Date", "Transaction id"]},
        {"td": data.map(content => {
          return [{"tag": "span", "attributes": {"class": "info-tag"}, "textContent": content}];
        })}
      ];

      tradeTable = tableJsonToElementJson(tradeTable);

      allPastTrades.push({"tag": "li", "childs": [tradeTable]});
    }

    return allPastTrades;
  }

  /**
   * Generate the html trade item of the current trades from the data retrieved from the backend
   * @param {Array<Object>} currentTrades list of the current trades the user has
   * @returns {htmlElement} list of html elements in json format
   */
  function generateCurrentTradeItemFromData(currentTrades) {
    let allCurrentTrades = [];
    for (let i = 0; i < currentTrades.length; i++) {
      let droppedSection = JSON.parse(currentTrades[i]["dropped_section_info"]);
      let receivedSection = JSON.parse(currentTrades[i]["wanted_section_info"]);
      let data = [
        droppedSection["curriculum_abbreviation"] + droppedSection["course_number"] +
          droppedSection["section_letter"],
        {"tag": "img", "attributes": {"class": "trade-icon", "src": "/mytrades/img/trade-icon.svg",
          "alt": "Trade Icon"}},
        receivedSection["curriculum_abbreviation"] + receivedSection["course_number"] +
          receivedSection["section_letter"]
      ];
      let tradeTable = [{"th": ["Dropping Course", "", "Wanted Course"]},
        {"td": [
          [{"tag": "span", "attributes": {"class": "info-tag"}, "textContent": data[0]}],
          [data[1]],
          [{"tag": "span", "attributes": {"class": "info-tag"}, "textContent": data[2]}]
        ]}];
      tradeTable = tableJsonToElementJson(tradeTable);
      allCurrentTrades.push({"tag": "li", "childs": [
        tradeTable, {"tag": "button", "attributes":
          {"class": "cancel-trade-button", "id": currentTrades[i]["trade_id"]},
        "childs": [{"tag": "img", "attributes": {"alt": "Trash Icon", "title": "Delete Trade"}}]}
      ]});
    }
    return allCurrentTrades;
  }

  /**
   * Given the error message, display it on the view.
   * @param {String} errorMessage the error message returned
   */
  function _handleError(errorMessage) {
    id("alert-panel").classList.remove("invisible");
    id("alert-panel").replaceChildren();
    let error = {
      "tag": "li",
      "attributes": {"class": "alert-panel-message"},
      "childs": [{"tag": "h2", "attributes": {"id": "error-message"}, "textContent": errorMessage}]
    };

    id("alert-panel").appendChild(generateHTMLElementFromJson(error));

    setTimeout(() => {
      id("alert-panel").classList.add("invisible");
    }, 3000);
  }

  /**
   * Check if the API response from the server is OK status or had an error. If OK, then the content
   * is returned. Otherwise, an error is thrown.
   * @param {JSON} response the response in JSON received from the API
   * @returns {JSON} or {Error} entire response object returned by the server
   */
  async function statusCheck(response) {
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return response;
  }
})();

/**
 * Given a json formated table, generate the corresponding table in html
 * Example table:
 * [
 *   {"th": [[{}], "", ""]},
 *   {"td": ["", "", ""]},
 *   {"td": ["", "", ""]},
 *   {"td": ["", "", ""]},
 *   {"td": ["", "", ""]},
 * ]
 * @param {Object} tableJson json table
 * @returns {HTMLElement} table in html
 */
function tableJsonToElementJson(tableJson) {
  let tableHeadElementJson = {"tag": "thead", "childs": []};
  let tableBodyElementJson = {"tag": "tbody", "childs": []};

  tableJson.forEach(row => {
    let tableRowJson = {"tag": "tr", "childs": []};

    for (let [rowType, columns] of Object.entries(row)) {
      columns.forEach(column => {
        let columnElement = {"tag": rowType, "childs": []};

        columnElement[typeof (column) !== "object" ? "textContent" : "childs"] = column;

        tableRowJson["childs"].push(columnElement);
      });
    }

    if (row["th"] === undefined) {
      tableBodyElementJson["childs"].push(tableRowJson);
    } else {
      tableHeadElementJson["childs"].push(tableRowJson);
    }
  });

  return {"tag": "table", "childs": [tableHeadElementJson, tableBodyElementJson]};
}

/**
 * Shorthand function for document.createElement(), generate a new HTML element with the given
 * tag
 * @param {String} tag HTML tag of the element to be created
 * @returns {HTMLElement} HTML element created
 */
function gen(tag) {
  return document.createElement(tag);
}

/**
 * Shorthand function for document.getElementById(), select a HTML element by its id
 * @param {String} id the id of the HTML element to be selected
 * @returns {HTMLElement} element selected with document.getElementById() function
 */
function id(id) {
  return document.getElementById(id);
}

/**
 * Generate the html element from a json formated html object
 * @param {Object} json the json formated html object
 * @returns {htmlElement} html element corresponding to the json formated html object
 */
function generateHTMLElementFromJson(json) {
  if (!json || json === undefined || json === null) {
    return null;
  }

  let htmlElement = gen(json["tag"]);
  htmlElement.textContent = json["textContent"] ? json["textContent"] : "";

  if (json["attributes"]) {
    for (let [attr, value] of Object.entries(json["attributes"])) {
      htmlElement.setAttribute(attr, value);
    }
  }

  if (json["childs"]) {
    json["childs"].forEach((obj) => {
      let childElement = generateHTMLElementFromJson(obj);

      if (childElement !== null) {
        htmlElement.appendChild(childElement);
      }
    });
  }

  return htmlElement;
}