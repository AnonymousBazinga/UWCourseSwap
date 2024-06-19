/*
 * Name: Oscar Shijie Song and Pranav Madhukar
 * Date: Jun 3, 2024
 * Section: CSE 154 AC
 * TAs: Kathryn Koehler & Rasmus Makiniemi
 *
 * Code for the users cart page of Course Nebula. Contains functions to retrieve users registered
 * sections and courses put in the cart ready to create a trade.
 */

"use strict";

(function() {
  window.addEventListener("load", _init);

  /**
   * Initialize the states of the page to show the user's registered sections and prepare the inte-
   * ractive elements to handle actions
   */
  async function _init() {
    _populateCart();
    id("create-trade-button").addEventListener("click", _createTrade);
    id("clear-cart-button").addEventListener("click", _clearCart);
    await _populateMySections();
    qs(".loading-spinner").classList.add("invisible");
  }

  /**
   * Creates a trade with the selected courses in the cart page and verify if the trade already
   * exist. If it does, execute the trade.
   */
  async function _createTrade() {
    let registeredSections = qsa("#my-sections .selected");
    let sectionsInCart = qsa("#cart .selected");
    let user = window.sessionStorage.getItem("user");
    let pass = window.sessionStorage.getItem("pass");

    for (let i = 0; i < registeredSections.length; i++) {
      for (let j = 0; j < sectionsInCart.length; j++) {
        let trade = new FormData();

        trade.append("dropped-section-sln", registeredSections[i].classList[0]);
        trade.append("dropped-section-type", registeredSections[i].classList[1]);
        trade.append("wanted-section-sln", sectionsInCart[j].classList[0]);
        trade.append("wanted-section-type", sectionsInCart[j].classList[1]);
        trade.append("user", user);
        trade.append("pass", pass);

        try {
          await fetch("/change-trades/create-trade", {
            method: "POST",
            body: trade
          });
          registeredSections[i].classList.remove("selected");
        } catch (err) {
          _handleError(err);
        }
      }
    }
    sectionsInCart.forEach(section => section.classList.remove("selected"));
  }

  /**
   * List all the sections that the user is registered on the left side list
   */
  async function _populateMySections() {
    let credentials = new FormData();
    let user = window.sessionStorage.getItem("user");
    let password = window.sessionStorage.getItem("pass");
    if (user && password) {
      credentials.append("user", user);
      credentials.append("pass", password);
      try {
        let registeredSections = await fetch("/registered-courses", {
          method: "POST",
          body: credentials
        });
        await statusCheck(registeredSections);
        registeredSections = await registeredSections.json();
        registeredSections.forEach(async section => {
          await _generateRegisteredSection(section);
        });
      } catch (err) {
        _handleError(err);
      }
    }
  }

  async function _generateRegisteredSection(section) {
    try {
      let sectionJHtmlElement = await generateSectionJHtmlFromStoredInfo(section);
      let sectionElement = generateHTMLElementFromJson(sectionJHtmlElement);
      sectionElement.querySelector("li > li").addEventListener("click", evt => {
        if (!evt.currentTarget.classList.contains("quiz-lab")) {
          evt.currentTarget.querySelector("section").classList.toggle("selected");
        } else {
          evt.currentTarget.classList.toggle("selected");
        }
      });
      qs("#my-sections ul").appendChild(sectionElement);
    } catch (err) {
      _handleError(err);
    }
  }

  /**
   * List all the sections that the user put in the shopping cart used to create trades
   */
  function _populateCart() {
    let sectionsInCart = getUserShoppingCart();

    sectionsInCart.forEach(async section => {
      try {
        let sectionJHtml = await generateSectionJHtmlFromStoredInfo(section);

        let sectionElement = generateHTMLElementFromJson(sectionJHtml);
        sectionElement.querySelector("li > li").addEventListener("click", evt => {
          if (!evt.currentTarget.classList.contains("quiz-lab")) {
            evt.currentTarget.querySelector("section").classList.toggle("selected");
          } else {
            evt.currentTarget.classList.toggle("selected");
          }
        });
        qs("#cart ul").appendChild(sectionElement);
      } catch (err) {
        _handleError(err);
      }
    });
  }

  /**
   * Get the sections in the users shopping cart
   * @returns {Array<Object>} the sections' sln and their type
   */
  function getUserShoppingCart() {
    let user = window.sessionStorage.getItem("user");
    let userCartName = user + "-shopping-cart";
    let sectionsInCart = window.localStorage.getItem(userCartName);

    if (!sectionsInCart) {
      window.localStorage.setItem(userCartName, "[]");
      sectionsInCart = "[]";
    }

    sectionsInCart = JSON.parse(sectionsInCart);

    return sectionsInCart;
  }

  /**
   * Given the sections with sln and type format, get information from the backend about the courses
   * and format the information into Json/html
   * @param {Array<JSON>} section array of sections in {sln, type} format
   * @returns {JSON} the json representation of the html tree of the element
   */
  async function generateSectionJHtmlFromStoredInfo(section) {
    let url = "/section/get-section?";
    let sectionJHtml;

    try {
      let sectionInfo = await fetch(url + "section_sln=" + section["sln"] + "&section_type=" +
        section["type"]);
      await statusCheck(sectionInfo);
      sectionInfo = await sectionInfo.json();

      if (section["type"] === "lecture") {
        sectionInfo["quiz_lab_sections"] = [];
        sectionJHtml = generateJHtmlLectureSectionsOfCourse({"lecture_sections": [sectionInfo]});
      } else {
        sectionJHtml = generateJHtmlQuizLabSectionsFromData([sectionInfo]);
      }

      return {
        "tag": "li",
        "childs": [
          {"tag": "h3",
            "textContent": sectionInfo["curriculum_abbreviation"] + sectionInfo["course_number"]},
          ...sectionJHtml
        ]
      };
    } catch (err) {
      _handleError(err);
    }
  }

  /**
   * Empty the user's shopping cart
   */
  function _clearCart() {
    let currentUser = window.sessionStorage.getItem("user");
    let userCartName = currentUser + "-shopping-cart";

    window.localStorage.setItem(userCartName, "[]");
    qs("#cart ul").replaceChildren();
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
      "childs": [
        {
          "tag": "h2",
          "attributes": {"id": "error-message"},
          "textContent": errorMessage
        }
      ]
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
 * Shorthand function for document.querySelector(), select a HTML element through reference
 * @param {String} query the reference to the HTML element to be selected
 * @returns {HTMLElement} element selected with document.querySelector() function
 */
function qs(query) {
  return document.querySelector(query);
}

/**
 * Shorthand function for document.querySelectorAll(), select all the HTML element that match to
 * the given query
 * @param {String} query the reference to the HTML elements to be selected
 * @returns {Array} a list of HTML element selected with document.querySelectorAll() function
 */
function qsa(query) {
  return document.querySelectorAll(query);
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

/**
 * Generate the all the lecture items for the course
 * @param {Array<JSON>} course json object of the course
 * @returns {Array<JSON>} the html of lecture elements represented in JSON format
 */
function generateJHtmlLectureSectionsOfCourse(course) {
  let lectureSections = course["lecture_sections"];
  let allLectureSections = [];
  for (let i = 0; i < lectureSections.length; i++) {
    let lectureSection = {
      "tag": "li", "attributes": {"class": lectureSections[i]["lecture_sln"]},
      "childs": [
        {"tag": "section", "attributes": {"class":
          lectureSections[i]["quiz_lab_sections"].length > 0 ?
            "caret" : lectureSections[i]["lecture_sln"] + " lecture course-list-leaf"},
        "childs": [
            {"tag": "span", "attributes": {"class": "section-letter"},
              "textContent": lectureSections[i]["section_letter"]},
            {"tag": "section", "attributes": {"class": "lecture-info-section"},
              "childs": [generateJHtmlSectionInfoTableFromData(lectureSections[i])]}
        ]},
        {"tag": "ul", "attributes": {"class": "nested invisible"},
          "childs": generateJHtmlQuizLabSectionsFromData(lectureSections[i]["quiz_lab_sections"])}
      ]
    };
    allLectureSections.push(lectureSection);
  }
  return allLectureSections;
}

/**
 * generate a table containing all the information about the section
 * @param {Array<JSON>} section json object of the section
 * @returns {Array<JSON>} the html of the table element represented in JSON format
 */
function generateJHtmlSectionInfoTableFromData(section) {
  let parsedMeetingInfo = JSON.parse(section["meeting_info"]);
  let slnType = "lecture_sln";

  if (section["type"] !== undefined) {
    slnType = "quiz_lab_sln";
  }

  let lectureSectionInfoTable = [
    {"th": ["Day", "Time", "Building", "Status", "SLN"]},
    {"td": [
      groupMeetingInfoByCategory(parsedMeetingInfo, "key"),
      groupMeetingInfoByCategory(parsedMeetingInfo, "meeting_time"),
      groupMeetingInfoByCategory(parsedMeetingInfo, "building"),
      [{"tag": "section", "textContent": section["max_capacity"] - section["available_spots"] +
        '/' + section["max_capacity"]}],
      [{"tag": "section", "attributes": {"class": "non-essential"},
        "textContent": section[slnType]}]
    ]}
  ];

  return tableJsonToElementJson(lectureSectionInfoTable);
}

/**
 * Generate the all the quiz section items for the lecture section
 * @param {Array<JSON>} quizLabSections array containing all the quiz sections of the lecture
 * @returns {Array<JSON>} the html of quiz section elements represented in JSON format
 */
function generateJHtmlQuizLabSectionsFromData(quizLabSections) {
  let allQuizLabSections = [];

  for (let i = 0; i < quizLabSections.length; i++) {
    let quizSection = {
      "tag": "li",
      "attributes": {"class": quizLabSections[i]["quiz_lab_sln"] + " quiz-lab course-list-leaf"},
      "childs": [
        {"tag": "span", "attributes": {"class": "section-letter"},
          "textContent": quizLabSections[i]["section_letter"]},
        {"tag": "span", "attributes": {"class": "section-type"},
          "textContent": "(" + quizLabSections[i]["type"] + ')'},
        {"tag": "section", "attributes": {"class": "lecture-info-section"},
          "childs": [generateJHtmlSectionInfoTableFromData(quizLabSections[i])]}
      ]
    };

    allQuizLabSections.push(quizSection);
  }

  return allQuizLabSections;
}

/**
 * Given the meeting info of the section, group the information through the category given
 * @param {JSON} meetingInfo meeting information of the section
 * @param {String} category category to group the information in
 * @returns {Array<String>} array of information grouped by the category given
 */
function groupMeetingInfoByCategory(meetingInfo, category) {
  let keys = Object.keys(meetingInfo);
  let groupedMeetingInfo = [];

  keys.forEach((key) => {
    let object = {
      "tag": "section",
      "attributes": {
        "class": "non-essential"
      }
    };

    if (category === "key") {
      object["textContent"] = key;
    } else if (meetingInfo[key][category] === undefined) {
      object["textContent"] = '-';
    } else {
      object["textContent"] = meetingInfo[key][category];
    }

    groupedMeetingInfo.push(object);
  });

  return groupedMeetingInfo;
}

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