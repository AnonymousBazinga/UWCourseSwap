/*
 * Name: Oscar Shijie Song and Pranav Madhukar
 * Date: Jun 3, 2024
 * Section: CSE 154 AC
 * TAs: Kathryn Koehler & Rasmus Makiniemi
 *
 * Code for the home page of Course Nebula. Contains functions to search for courses and display
 * the results in the search panel, display available trades as connection graphs, navigate to
 * other pages, and handle interactive cursor events.
 */
"use strict";

(function() {
  window.addEventListener("load", _init);

  let simulation;
  let draggedSection;

  /**
   * Initialize the page to handle interactive events and display the open trades in the database
   * through D3
   */
  function _init() {
    let currentLayout = window.localStorage.getItem("course-result-layout");

    if (!currentLayout) {
      window.localStorage.setItem("course-result-layout", "full-information");
    } else if (currentLayout === "two-grid-columns") {
      _switchCourseDisplayLayout();
    }

    _alertAboutWantedSections();

    _d3Setup();
    _shoppingCartAreaSetup();
    _pageViewButtonSetup();
  }

  /**
   * setup the general interactive buttons in the page view
   */
  async function _pageViewButtonSetup() {
    let resultPanel = id("course-search-result-panel");

    qs("#course-search-container").addEventListener("submit", evt => {
      evt.preventDefault();
      _courseSearchHandler(qs("#search-input").value);
    });

    id("search-input").addEventListener("click", () => {
      resultPanel.classList.remove("invisible");
      resultPanel.classList.add("flex");
    });

    id("close-panel-button").addEventListener("click", () => {
      resultPanel.classList.add("invisible");
      resultPanel.classList.remove("flex");
    });

    let courseLayoutSwitch = qsa(".course-layout-switch-button");
    for (let i = 0; i < courseLayoutSwitch.length; i++) {
      courseLayoutSwitch[i].addEventListener("click", _switchCourseDisplayLayout);
    }

    id("menu-icon").addEventListener("click", () => {
      id("menu").classList.toggle("invisible");
      id("menu").classList.toggle("flex");
    });

    id("logout-button").addEventListener("click", await _logout);
  }

  /**
   * Check if any of the sections in the user's cart opened up a spot. If it does, notify the
   * user
   */
  async function _alertAboutWantedSections() {
    let user = window.sessionStorage.getItem("user");
    let wantedSections = window.localStorage.getItem(user + "-shopping-cart");
    let postBody = new FormData();
    postBody.append("cart", wantedSections ? wantedSections : "[]");

    try {
      let openSections = await fetch("/alert", {
        method: "POST",
        body: postBody
      });
      await statusCheck(openSections);
      openSections = await openSections.json();

      if (openSections.length !== 0) {
        _alertUserAboutOpenSpot(openSections);
      }
    } catch (err) {
      _handleError(err);
    }
  }

  /**
   * Given the sections the user wanted that opened, display them in the alert panel
   * @param {Array<JSON>} openSections array of all the sections the user wanted that opened up
   */
  function _alertUserAboutOpenSpot(openSections) {
    id("alert-panel").classList.remove("invisible");
    id("alert-panel").replaceChildren();

    for (let i = 0; i < openSections.length; i++) {
      let openSection = {
        "tag": "li",
        "childs": [
          {
            "tag": "h2",
            "textContent": openSections[i] + " is open!"
          }
        ]
      };
      id("alert-panel").appendChild(generateHTMLElementFromJson(openSection));
    }

    setTimeout(() => {
      id("alert-panel").classList.add("invisible");
    }, 3000);
  }

  /**
   * log the user out and return to the home page after it
   */
  async function _logout() {
    let credentials = new FormData();
    let user = window.sessionStorage.getItem("user");
    let password = window.sessionStorage.getItem("pass");

    credentials.append("user", user);
    credentials.append("pass", password);

    try {
      let result = await fetch("/logout ", {
        method: "POST",
        body: credentials
      });
      await statusCheck(result);

      window.location.href = "/index.html";
    } catch (err) {
      _handleError(err);
    }

    window.sessionStorage.clear();
  }

  /**
   * Setup the d3 to display the open trades retrieved from the database in the main view
   */
  async function _d3Setup() {
    try {
      let postBody = new FormData();
      postBody.append("category", "all-open-trades");
      let openTrades = await fetch("/get-trades", {method: "POST", body: postBody});
      await statusCheck(openTrades);
      openTrades = await openTrades.json();
      simulation = createSimulationWithData(openTrades);
      const svg = d3.create("svg")
        .attr("width", window.innerWidth)
        .attr("height", window.innerHeight)
        .attr("viewBox", [-window.innerWidth / 2, -window.innerHeight / 2,
          window.innerWidth, window.innerHeight]);
      let links = generateLinksWithData(svg, openTrades.links);
      let nodes = generateNodesWithData(svg, openTrades.nodes);
      simulation.on("tick", () => _tickD3(nodes, links));
      nodes.call(
        d3.drag()
          .on("start", _dragstarted)
          .on("drag", _dragged)
          .on("end", _dragended)
      );
      _d3SetExpandedLayout(nodes);
      id("d3-layout-switch-button").addEventListener("click", () => {
        _switchD3DisplayLayout(nodes);
      });
      qs("body").appendChild(svg.node());
    } catch (err) {
      _handleError(err);
    }
  }

  /**
   * Given the array of node objects, toggle between the compact and full view of the nodes
   * @param {Object} nodes array of d3 node objects
   */
  function _switchD3DisplayLayout(nodes) {
    let text = qs("#d3-layout-switch-button > span").textContent;
    text = text === "Compact" ? "Expanded" : "Compact";

    if (text === "Compact") {
      _d3SetCompactLayout(nodes);
    } else {
      _d3SetExpandedLayout(nodes);
    }

    qs("#d3-layout-switch-button > span").textContent = text;
  }

  /**
   * Given the array of node objects, change the display layout to compacted mode
   * @param {Object} nodes array of d3 node objects
   */
  function _d3SetCompactLayout(nodes) {
    nodes.selectAll(".course-text-in-node").remove();
    nodes.selectAll(".section-text-in-node").remove();

    nodes.selectAll("circle").attr("r", "0.8rem");
    nodes.append("text")
      .attr("class", "text-under-node")
      .attr("dy", "2rem")
      .text(nod => nod["curriculum_abbreviation"] + nod["course_number"] + nod["section_letter"]);
  }

  /**
   * Given the array of node objects, change the display layout to full information mode
   * @param {Object} nodes array of d3 node objects
   */
  function _d3SetExpandedLayout(nodes) {
    nodes.selectAll("circle").attr("r", "2.2rem");
    nodes.selectAll(".text-under-node").remove();

    nodes.append("text")
      .attr("class", "course-text-in-node")
      .attr("text-anchor", "middle")
      .text(nod => nod["curriculum_abbreviation"] + nod["course_number"]);

    nodes.append("text")
      .attr("class", "section-text-in-node")
      .attr("dy", "1.1em")
      .text(nod => nod["section_letter"]);
  }

  /**
   * toggle the view of the course search result between two columns and full information and save
   * the configuration to the local machine
   */
  function _switchCourseDisplayLayout() {
    _hideNonEssentialInformationOfSections();
    let courseList = id("course-search-result-list");

    courseList.classList.toggle("two-grid-columns");
    courseList.classList.toggle("full-information");
    id("list-display-button").classList.toggle("invisible");
    id("columns-display-button").classList.toggle("invisible");

    window.localStorage.setItem("course-result-layout", courseList.classList[0]);
  }

  /**
   * hide the non essential data cells of the section information table
   */
  function _hideNonEssentialInformationOfSections() {
    let tableCells = qsa(".non-essential:first-child");
    let tableHeads = qsa(".lecture-info-section th");

    for (let i = 0; i < tableCells.length; i++) {
      tableCells[i].parentElement.classList.toggle("invisible");
    }

    for (let i = 0; i < tableHeads.length; i++) {
      tableHeads[i].classList.toggle("invisible");
    }
  }

  /**
   * Given the typed in search query, search for the typed section, course, or the lecture and
   * display the list of result found in the search panel.
   * @param {String} searchQuery the search query typed by the user into the search bar
   */
  async function _courseSearchHandler(searchQuery) {
    if (searchQuery.trim().length > 0) {
      let courseObject = splitSearchQueryIntoCourseObject(searchQuery);
      let url = "/course/get-course?" + concatenateObjectKeyEqualsToValue(courseObject, '&');

      try {
        let courseSearchResult = await fetch(url);
        await statusCheck(courseSearchResult);
        courseSearchResult = await courseSearchResult.json();

        _displayCourseInformation(courseSearchResult);
        _showSpecificSectionThroughSln(courseObject["section_sln"]);

        if (window.localStorage.getItem("course-result-layout") === "two-grid-columns") {
          _hideNonEssentialInformationOfSections();
        }

        qs("#course-search-result-panel-header span").textContent = courseSearchResult.length;

        let courseListLeafs = qsa(".course-list-leaf");
        courseListLeafs.forEach(leaf => _setupDragToAddBehaviour(leaf));
      } catch (err) {
        _handleError(err);
      }
    }
  }

  /**
   * Given the specific section sln, toggle the drop down in the course result list to show the its
   * section if it were found
   * @param {String} sectionSln the sln of the section to show in the course search result list
   */
  function _showSpecificSectionThroughSln(sectionSln) {
    let resultList = qs("#course-search-result-list > li");
    if (sectionSln && resultList) {
      resultList.querySelector("ul").classList.remove("invisible");
      resultList.querySelector("span").classList.add("caret-down");
      let results = resultList.querySelector("ul").children;

      for (let i = 0; i < results.length; i++) {
        if (results[i].classList.contains(sectionSln)) {
          results[i].classList.add("highlight-section");
        }

        let quizSections = results[i].querySelectorAll(".nested li");

        if (quizSections !== null) {
          for (let j = 0; j < quizSections.length; j++) {
            if (quizSections[j].classList.contains(sectionSln)) {
              results[i].querySelector(".caret").classList.add("caret-down");
              results[i].querySelector(".nested").classList.remove("invisible");
              quizSections[j].classList.add("highlight-section");
            }
          }
        }
      }
    }
  }

  /**
   * Setup the shoppingc cart drop to add area to handle to drag and drop events
   */
  function _shoppingCartAreaSetup() {
    let shoppingCart = id("add-section-to-cart-area");

    shoppingCart.addEventListener("dragover", evt => {
      evt.preventDefault();
    }, false);

    shoppingCart.addEventListener("dragenter", () => {
      shoppingCart.classList.remove("cart-section-light");
      shoppingCart.classList.add("cart-section-darker");
    });

    shoppingCart.addEventListener("dragleave", () => {
      shoppingCart.classList.remove("cart-section-darker");
      shoppingCart.classList.add("cart-section-light");
    });

    shoppingCart.addEventListener("drop", (event) => {
      event.preventDefault();
      _addSectionToShoppingCart(draggedSection);
      shoppingCart.classList.remove("cart-section-darker");
      shoppingCart.classList.add("cart-section-light");
    });
  }

  /**
   * Given the section, add the drag to add section to cart behaviour handler
   * @param {Object} section the section to add drag behaviour handler
   */
  function _setupDragToAddBehaviour(section) {
    let shoppingCart = id("add-section-to-cart-area");

    section.setAttribute("draggable", true);

    section.addEventListener("dragstart", (evt) => {
      id("menu").classList.add("invisible");
      id("menu").classList.remove("flex");
      shoppingCart.classList.remove("invisible");
      shoppingCart.classList.add("flex");
      draggedSection = {
        "sln": evt.target.classList[0],
        "type": evt.target.classList[1]
      };
    });

    section.addEventListener("dragend", () => {
      shoppingCart.classList.add("invisible");
      shoppingCart.classList.remove("flex");
    });

    section.addEventListener("mouseover", () => {
      qs("body").style.cursor = "grab";
    });

    section.addEventListener("mouseout", () => {
      qs("body").style.cursor = "auto";
    });
  }

  /**
   * Add the given section to the shopping cart
   * @param {Object} section section object to add to cart
   */
  function _addSectionToShoppingCart(section) {
    let currentUser = window.sessionStorage.getItem("user");
    let userCartName = currentUser + "-shopping-cart";
    let shoppingCart = window.localStorage.getItem(userCartName);

    if (shoppingCart === null) {
      window.localStorage.setItem(userCartName, "[]");
      shoppingCart = window.localStorage.getItem(userCartName);
    }

    shoppingCart = JSON.parse(shoppingCart);
    shoppingCart.push(section);
    window.localStorage.setItem(userCartName, JSON.stringify(shoppingCart));
  }

  /**
   * Display the coursesData in the course search panel
   * @param {Array<JSON>} coursesData list of courses found from the course search
   */
  function _displayCourseInformation(coursesData) {
    let courseList = id("course-search-result-list");
    courseList.replaceChildren();
    let courses = generateJHtmlCourseItemsFromData(coursesData);

    courses.forEach((course) => {
      courseList.appendChild(generateHTMLElementFromJson(course));
    });

    let carets = qsa(".caret");
    carets.forEach(caret => caret.addEventListener("click", toggleDropdownList));
  }

  /**
   * Creates the d3 simulation and return the simulation object
   * @param {JSON} data the formated data of with the nodes and link/the nodes' connections
   * @returns {d3Simulation} the d3 simulation object
   */
  function createSimulationWithData(data) {
    const links = data.links;
    const nodes = data.nodes;

    simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links)
        .distance(nod => nod["distance"] * 200)
        .strength(0.3)
        .id(nod => nod["section_sln"]))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("x", d3.forceX().strength(0.01))
      .force("y", d3.forceY().strength(0.01));

    return simulation;
  }

  /**
   * Draw the links of the d3 graph on main view
   * @param {HTMLElement} svg svg element in the html page
   * @param {Array<JSON>} links arrray of json objects with the relationships of the nodes
   * @returns {d3LinkObject} d3 link object
   */
  function generateLinksWithData(svg, links) {
    const link = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", "0.15rem");

    return link;
  }

  /**
   * Draw the nodes of the d3 graph on main view
   * @param {HTMLElement} svg svg element in the html page
   * @param {Array<JSON>} nodes array of json objects with nodes
   * @returns {d3NodeObject} d3 node object
   */
  function generateNodesWithData(svg, nodes) {
    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", nod => nod["trade_role"])
      .attr("id", nod => nod["section_sln"])
      .on("click", _searchForClickedCourse);

    node.append("circle")
      .attr("id", nod => nod["curriculum_abbreviation"] +
        nod["course_number"] + nod["section_letter"])
      .attr("class", nod => nod["trade_role"]);

    return node;
  }

  /**
   * Displays an error message in the alert panel and hides it after a delay.
   * @param {string} errorMessage - The error message to display.
   */
  function _handleError(errorMessage) {
    id("alert-panel").classList.remove("invisible");
    id("alert-panel").replaceChildren();
    let error = {
      "tag": "li",
      "childs": [
        {"tag": "h2", "attributes": {"id": "error-message"}, "textContent": errorMessage}
      ]
    };

    id("alert-panel").appendChild(generateHTMLElementFromJson(error));

    setTimeout(() => {
      id("alert-panel").classList.add("invisible");
    }, 3000);
  }

  /**
   * Handles the event when a course is clicked, setting the search input value
   * to the clicked course's ID and submitting the search form.
   * @param {Event} evt - The event object from the click event.
   */
  function _searchForClickedCourse(evt) {
    qs("#search-input").value = evt.currentTarget.id;
    qs("#course-search-container").requestSubmit();
    id("course-search-result-panel").classList.remove("invisible");
    id("course-search-result-panel").classList.add("flex");
  }

  /**
   * Restart the d3 forces simulation positioning
   * @param {Event} event d3 drag event
   */
  function _dragstarted(event) {
    if (!event.active) {
      simulation.alphaTarget(0.3).restart();
    }
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  /**
   * Update the dragged node's position
   * @param {Event} event d3 drag event
   */
  function _dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  /**
   * Fix the dragged node's position at the end of the drag event
   * @param {Event} event d3 drag event
   */
  function _dragended(event) {
    if (!event.active) {
      simulation.alphaTarget(0);
    }
    event.subject.fx = null;
    event.subject.fy = null;
  }

  /**
   * Update the d3 force simulation state
   * @param {d3NodeObject} nodes d3 Node objects to update
   * @param {d3LinkObject} links d3 Link objects to update
   */
  function _tickD3(nodes, links) {
    links.attr("x1", nod => nod.source.x)
      .attr("y1", nod => nod.source.y)
      .attr("x2", nod => nod.target.x)
      .attr("y2", nod => nod.target.y);
    nodes.attr("transform", nod => "translate(" + nod.x + "," + nod.y + ")");
  }

  /**
   * Toggles the visibility of a dropdown list.
   * @param {HTMLElement} The element that was clicked to trigger this function.
   */
  function toggleDropdownList() {
    this.parentElement.querySelector(".nested").classList.toggle("active");
    this.parentElement.querySelector(".nested").classList.toggle("invisible");
    this.classList.toggle("caret-down");
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
 * Concatenate all the values of an object into one String
 * @param {JSON} object the object to have only its values concatenated
 * @param {Character} divider the character used to divide each value of the object after concate-
 *                            nation
 * @returns {String} the concatenated string
 */
function concatenateObjectKeyEqualsToValue(object, divider = '') {
  let concatenatedString = "";
  let concatenateDividerStarted = false;

  for (let [key, value] of Object.entries(object)) {
    concatenatedString += (concatenateDividerStarted === true ? divider : '') + key + '=' + value;
    concatenateDividerStarted = true;
  }

  return concatenatedString;
}

/**
 * Split the user inputed query string into a course object with the information separated
 * @param {String} searchQuery the search query inputed by the user
 * @returns {Object} course object with the information separated
 */
function splitSearchQueryIntoCourseObject(searchQuery) {
  let courseSearchObject = {};
  let lowerCaseQuery = (searchQuery.toUpperCase()).trim();
  let courseNumber = lowerCaseQuery.match(/\d+/);
  let courseNumberIndex = lowerCaseQuery.indexOf(courseNumber);

  if (courseNumberIndex > 0) {
    courseSearchObject["curriculum_abbreviation"] = lowerCaseQuery.substring(0, courseNumberIndex);
    courseSearchObject["course_number"] = courseNumber[0];
  } else if (courseNumberIndex === 0) {
    courseSearchObject["section_sln"] = courseNumber[0];
  } else {
    courseSearchObject["curriculum_abbreviation"] = lowerCaseQuery;
  }

  return courseSearchObject;
}

/**
 * Generate the all the course list item for the course search result list
 * @param {Array<JSON>} courses array containing all the courses found from the course search
 * @returns {Array<JSON>} the html of courses elements represented in JSON format
 */
function generateJHtmlCourseItemsFromData(courses) {
  let allCourses = [];
  for (let i = 0; i < courses.length; i++) {
    let course = {
      "tag": "li",
      "childs": [
        {
          "tag": "span", "attributes": {"class": "caret"},
          "childs": [
            {"tag": "h2",
              "textContent": courses[i]["curriculum_abbreviation"] + courses[i]["course_number"]},
            {"tag": "small", "textContent": courses[i]["credits"] + " credits"}
          ]
        },
        {
          "tag": "ul", "attributes": {"class": "nested invisible"},
          "childs": [
            {"tag": "h3", "textContent": "Description"},
            {"tag": "p", "textContent": courses[i]["course_description"]},
            {"tag": "h3", "textContent": "Sections"},
            ...generateJHtmlLectureSectionsOfCourse(courses[i])
          ]
        }
      ]
    };
    allCourses.push(course);
  }
  return allCourses;
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