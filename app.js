/*
 * Name: Oscar Shijie Song and Pranav Madhukar
 * Date: Jun 3, 2024
 * Section: CSE 154 AC
 * TAs: Kathryn Koehler & Rasmus Makiniemi
 *
 * This is the backend API which implements endpoints to connect database with the frontend
 * to allow users to login, swap their courses and see their trade history. It also offers informat-
 * ion to about courses, sections, and lecture sections for the search feature.
 */

"use strict";

const express = require('express');
const multer = require("multer");
const app = express();
const puppeteer = require('puppeteer');
let browser;

/**
 * This function essentially creates an instance of the browser using puppeteer
 * which is processed in later stages - by opening, closing new tabs.
 */
async function launchBrowser() {
  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  } catch (error) {
    console.error('Error launching Puppeteer browser:', error);
  }
}

launchBrowser();

app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(multer().none());

const sqlite3 = require("sqlite3");
const sqlite = require("sqlite");

/**
 * This endpoint creates, verifies and performs a trade of courses. It first checks
 * to see if there are any matches in the database. And then, it either adds it into the
 * database as a new open trade if there are no matches; or it performs the course swap
 * if there is a swap.
 * @param {object} req - request object used for the API input
 * @param {object} res - request object used for the API sending back output
 * Sends a positive status code if the trade action is successful.
 */
app.post("/change-trades/create-trade", async (req, res) => {
  let user = req.body.user;
  let pass = req.body.pass;
  let sectionQry = getSectionQueries();
  let tradesQry = getTradesQueries();

  if (!(await isLoggedIn(user))) {
    res.status(403).send("Please log in first before creating trade");
  }

  try {
    let db = await getDBConnection();
    let droppedSectionInfo = await db.get(sectionQry[req.body["dropped-section-type"] +
      "-from-sln"], req.body["dropped-section-sln"]);
    let wantedSectionInfo = await db.get(sectionQry[req.body["wanted-section-type"] +
      "-from-sln"], req.body["wanted-section-sln"]);

    if (!droppedSectionInfo["type"]) {
      droppedSectionInfo["type"] = "lecture";
    }
    if (!wantedSectionInfo["type"]) {
      wantedSectionInfo["type"] = "lecture";
    }

    if (!helperAlert(wantedSectionInfo["quiz_lab_sln"])) {
      throw new Error("The section you want is open");
    }

    let queryResults = await db.get(tradesQry["opposite-trade"], [wantedSectionInfo["lecture_sln"],
      wantedSectionInfo["quiz_lab_sln"] ? wantedSectionInfo["quiz_lab_sln"] : "",
      droppedSectionInfo["lecture_sln"],
      droppedSectionInfo["quiz_lab_sln"] ? droppedSectionInfo["quiz_lab_sln"] : ""]);

    if (!queryResults) {
      let result = await db.run(
        tradesQry["create-trade"],
        [JSON.stringify(droppedSectionInfo), droppedSectionInfo["lecture_sln"],
          droppedSectionInfo["quiz_lab_sln"] ? droppedSectionInfo["quiz_lab_sln"] : '',
          JSON.stringify(wantedSectionInfo), wantedSectionInfo["lecture_sln"],
          wantedSectionInfo["quiz_lab_sln"] ? wantedSectionInfo["quiz_lab_sln"] : '',
          req.body["user"], req.body["pass"]]
      );
      await db.close();
      res.json(result);
    } else {
      let wanted = [wantedSectionInfo["lecture_sln"], wantedSectionInfo["quiz_lab_sln"] ?
        wantedSectionInfo["quiz_lab_sln"] : ""];
      let dropped = [droppedSectionInfo["lecture_sln"], droppedSectionInfo["quiz_lab_sln"] ?
        droppedSectionInfo["quiz_lab_sln"] : ""];
      let otherUser = queryResults["user_id"];
      let otherPass = queryResults["encypted_user_pswd"];
      await tradingOnPage(otherUser, otherPass, checkCourse, false, wanted);
      await tradingOnPage(otherUser, otherPass, logout, true);
      let thisRegistered = await tradingOnPage(user, pass, checkCourse, false, dropped);
      await tradingOnPage(user, pass, dropCourse, true, dropped, thisRegistered);
      await tradingOnPage(user, pass, logout, true);
      let otherRegistered = await tradingOnPage(otherUser, otherPass, checkCourse, false, wanted);
      await tradingOnPage(otherUser, otherPass, dropCourse, true, wanted, otherRegistered);
      await tradingOnPage(otherUser, otherPass, addCourse, true, dropped);
      await tradingOnPage(otherUser, otherPass, logout, true);
      await tradingOnPage(user, pass, addCourse, false, wanted);
      await db.run("DELETE FROM open_trades WHERE trade_id = ?", queryResults["trade_id"]);
      await db.close();
      res.json(queryResults);
    }
  } catch (err) {
    res.type('text').status(500);
    res.send("Second server error occurredddddddd.");
  }
});

/**
 * This function checks the user's registered course to see if they have
 * registered for a list of courses that will be used for further trades.
 * @param {object} page - It is the browser's page
 * @param {array} courseSln - It is the list of course slns to check the user's
 * registration status for.
 */
async function checkCourse(page, courseSln) {
  let registered = [];
  try {
    let allInputs = await page.$$("#regform .sps_table tr td:nth-child(6) tt");
    let promises = allInputs.map((input) => {
      return page.evaluate(el => el.textContent, input)
        .then((text) => {
          registered.push(text.substring(0, 5));
        });
    });
    await Promise.all(promises);
  } catch (err) {
    return [500, "Server Error Occurred."];
  }

  for (let j = 0; j < courseSln.length; j++) {
    if (!String(registered).includes(courseSln[j])) {
      return [400, "Trade Unsuccessful because of " + courseSln[j]];
    }
  }

  return registered;
}

/**
 * This function helps returns all registered course of any user.
 * @param {object} page - It is the browser's page
 */
async function registeredCourses(page) {
  const lookup = {"QZ ": "quiz-lab", "LB ": "quiz-lab", "LC ": "lecture", "SM ": "lecture"};
  let slnTexts;
  let typeTexts;
  let registered = [];
  try {
    let allSlns = await page.$$("#regform .sps_table tr td:nth-child(6) tt");
    let allTypes = await page.$$("#regform .sps_table tr td:nth-child(8) tt");
    let slnPromises = allSlns.map(sln => page.evaluate(el => el.textContent, sln));
    let typePromises = allTypes.map(type => page.evaluate(el => el.textContent, type));
    slnTexts = await Promise.all(slnPromises);
    typeTexts = await Promise.all(typePromises);
  } catch (err) {
    return [500, "Server error occurred"];
  }
  for (let i = 0; i < slnTexts.length; i++) {
    registered.push({
      "sln": slnTexts[i].substring(0, 5),
      "type": lookup[typeTexts[i]]
    });
  }
  return registered;
}

/**
 * This function adds a course to the user's page and submits the
 * form on the UW registration page to send the registration.
 * @param {object} page - It is the browser's page
 * @param {String} addsSln Sln of the course to add
 */
async function addCourse(page, addsSln) {
  try {
    let allInputs = await page.$$("#regform .sps_table tr td:nth-child(2) input");
    for (let i = 0; i < addsSln.length; i++) {
      await allInputs[i].type(String(addsSln[i]));
    }

    await page.click("input[value=' Update Schedule ']");

    await page.waitForNavigation();
    await page.waitForSelector(".screenBlurb3");
    let result = await page.$(".screenBlurb3");
    let textRes = await page.evaluate(el => el.textContent, result);
    if (textRes.indexOf("Schedule Updated") === -1) {
      return [400, textRes];
    }
  } catch (err) {
    return [500, "Course cannot be added"];
  }
}

/**
 * This function selects the course to be dropped on the user's page and
 * submits the form on the UW registration page to send the registration.
 * @param {object} page - It is the browser's page
 * @param {String} dropsSln - Sln to be dropped
 * @param {String} registered - The registered section to switch
 */
async function dropCourse(page, dropsSln, registered) {
  let dropIndex = [];

  for (let i = 0; i < dropsSln.length; i++) {
    if (Boolean(dropsSln[i]) === true) {
      if (registered.includes(String(dropsSln[i]))) {
        dropIndex.push(registered.indexOf(String(dropsSln[i])));
      }
    }
  }

  for (let j = 0; j < dropIndex.length; j++) {
    let val = dropIndex[j] + 1;
    let valPoint = "#regform .sps_table tr td:nth-child(1) input[name = 'action" + val + "']";
    await page.click(valPoint);
  }
  await page.click("input[value=' Update Schedule ']");
}

/**
 * This function logs the user out of their UW registration page.
 * @param {object} page - It is the browser's page
 */
async function logout(page) {
  await page.waitForSelector('#doneDiv table tbody tr td table span span a');
  await page.click('#doneDiv table tbody tr td table span span a');
  await page.waitForNavigation();
}

/**
 * This endpoint retrieves the UW courses the user has currently registered for.
 * @param {object} req - request object used for the API input
 * @param {object} res - request object used for the API sending back output
 * Sends a positive status code if the courses could be fetched.
 */
app.post("/registered-courses", async (req, res) => {
  if (req.body.user && req.body.pass) {
    const page = await browser.newPage();
    await page.goto("https://sdb.admin.uw.edu/students/uwnetid/register.asp");
    try {
      await page.type('#weblogin_netid', req.body.user);
      await page.type('#weblogin_password', req.body.pass);
      await page.click('#submit_button');
      await page.waitForSelector('#doneDiv table tbody tr td table span span a', {timeout: 20000});
      let reg = await registeredCourses(page);
      res.json(reg);
    } catch (err) {
      try {
        await page.waitForSelector(
          '#doneDiv table tbody tr td table span span a',
          {timeout: 10000}
        );
        let reg = await registeredCourses(page);
        res.json(reg);
      } catch (error) {
        res.status(500).type("text");
        res.send("Unable to get user's registered courses due to server error");
      }
    }
    await page.click('#doneDiv table tbody tr td table span span a');
  } else {
    res.status(400).type("text");
    res.send("Missing one or more of the parameters.");
  }
});

/**
 * This endpoint is used to keep track of the logged in status of a user.
 * When the user logs out of their account, this endpoint updates this in the db
 * @param {object} req - request object used for the API input
 * @param {object} res - request object used for the API sending back output
 * Sends a positive status code if the logged in status was successfully updated.
 */
app.post("/logout", async (req, res) => {
  let user = req.body.user;
  let pass = req.body.pass;
  if (user && pass) {
    try {
      const query = "UPDATE users SET logged_in = 0 WHERE net_id = ? AND encrypted_pswd = ?";
      let db = await getDBConnection();
      await db.run(query, [user, pass]);
      await db.close();

      res.type("text");
      res.send("Successfully Logged Out!");
    } catch (err) {
      res.status(500).type("text");
      res.send("Server Error Occurred.");
    }
  } else {
    res.type("text").status(400);
    res.send("Missing one or more required parameter.");
  }
});

/**
 * This function helps add a user into the database when signing up a new user.
 * @param {string} user - It is the user's net id
 * @param {string} pass - It is the user's password
 * @return {array} - It is the response array indicating the status code, response type
 * and the response message.
 */
async function helperLoginRes(user, pass) {
  let db = await getDBConnection();
  let resp = await openUWPage(
    false,
    user,
    pass,
    "https://sdb.admin.uw.edu/students/uwnetid/register.asp"
  );
  if (resp[0] === 200) {
    try {
      const query = "INSERT INTO users (net_id, encrypted_pswd, alert_message, logged_in)" +
      " VALUES (?, ?, ?, ?)";
      await db.run(query, [user, pass, null, 1]);
      await db.close();
      return [200, "json", {"user": user, "pass": pass, "alert": null}];
    } catch (err) {
      return [500, "text", "Server Error Occurred - 1"];
    }
  } else {
    return [resp[0], "text", resp[1]];
  }
}

/**
 * Authenticates a user login which has been sent in and signs them in if it is
 * a valid ogin password. It verifies the user credentials with our database
 * and UW's official credentials.
 * @param {object} req - request object used for the API input
 * @param {object} res - request object used for the API sending back output
 * Sends a positive status code if the login is authorized.
 */
app.post("/login", async (req, res) => {
  let {user, pass} = req.body;
  if (user && pass) {
    try {
      const query = "SELECT * FROM users WHERE net_id LIKE ? AND encrypted_pswd LIKE ?";
      let db = await getDBConnection();
      let queryResults = await db.all(query, user, pass);
      if (queryResults.length === 0) {
        let subResp = await helperLoginRes(user, pass);
        res.status(subResp[0]).type(subResp[1]);
        res.send(subResp[2]);
      } else {
        let alert = queryResults[0]["alert_message"];
        await openUWPage(
          true,
          user,
          pass,
          "https://sdb.admin.uw.edu/students/uwnetid/register.asp"
        );
        await loginHelper(user, pass);
        res.json({"user": user, "pass": pass, "alert": alert});
      }
    } catch (err) {
      res.type('text').status(500);
      res.send("Second server error occurredddddddd.");
    }
  } else {
    res.type("text");
    res.status(400).send("Missing parameters in request.");
  }
});

/**
 * This helper function updates the logged in status of the user when they log into
 * their account. It updates this information in the database.
 * @param {string} user - It is the user's net id
 * @param {string} pass - It is the user's password
 * @return {array} - It is the response array indicating the status code, response type
 * and the response message.
 */
async function loginHelper(user, pass) {
  try {
    const query = "UPDATE users SET logged_in = 1 WHERE net_id = ? AND encrypted_pswd = ?";
    let db = await getDBConnection();
    await db.run(query, [user, pass]);
    await db.close();
    return [200, "Successfully Logged you in"];
  } catch (err) {
    return [500, "Server Error Occurred"];
  }
}

/**
 * This function performs any specified action or function on the given
 * user's UW registration page.
 * @param {string} user - This is the username
 * @param {string} pass - This is the password
 * @param {function} func - This is the particular function to be executed in the page.
 * It could be functionality like drop course, add course, logout, check registered courses
 * @param {boolean} sameAsPrev - This represents whether the user needs to be logged in
 * or if they have already been logged into their account.
 * @param {...any} args - This contains all the unique arguments which need to
 * be passed into the func
 * @returns {Promise} - It returns a promise which resolves to the
 * return value of the specified func
 */
async function tradingOnPage(user, pass, func, sameAsPrev, ...args) {
  const expectedArgs = func.length - 1; // -1 because page is sent manually
  const actualArgs = args.slice(0, expectedArgs);
  const page = await browser.newPage();
  await page.goto("https://sdb.admin.uw.edu/students/uwnetid/register.asp");
  if (!sameAsPrev) {
    try {
      await page.type('#weblogin_netid', user);
      await page.type('#weblogin_password', pass);
      await page.click('#submit_button');
      await page.waitForNavigation();
    } catch (err) {
      return [400, "Incorrect Username or Password"];
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  return func(page, ...actualArgs);
}

/**
 * This function opens a new page on the headless browser, logs the user in
 * and sends an appropriate response back based on the login success.
 * If the user is not previously signed in, then this will trigger
 * a Duo push as well (i.e Sign Up) rather than seamlessly (i.e Login).
 * @param {string} flag - It is used to check a truth or false value to indicate
 * whether to login or sign up a user respectively.
 * @param {string} user - This is the username
 * @param {string} pass - This is the password
 * @param {string} link - This is the particular UW link to be directing the login to
 * @returns {object} - It returns a list containing the status code and the appropriate
 * response message for the code.
 */
async function openUWPage(flag, user, pass, link) {
  const page = await browser.newPage();
  await page.goto(link);
  try {
    await page.type('#weblogin_netid', user);
    await page.type('#weblogin_password', pass);
    await page.click('#submit_button');
    await page.waitForNavigation();
  } catch (err) {
    return [400, "Incorrect Username or Password"];
  }
  if (!flag) {
    try {
      await page.waitForNavigation();
      await page.waitForSelector("#trust-browser-button"); // this defaults to 30 seconds
      await page.click("#trust-browser-button");
      await page.waitForNavigation();
      await page.waitForSelector("#doneDiv table tbody tr td table span span a");
      await page.click('#doneDiv table tbody tr td table span span a');
      return [200, "Successful Sign Up I think."];
    } catch (err) {
      return [500, "Server timed out"];
    }
  } else {
    await page.waitForSelector("#doneDiv table tbody tr td table span span a");
    await page.click('#doneDiv table tbody tr td table span span a');
    return [200, "Successful Login I think"];
  }
}

/**
 * This endpoint displays all the given trades in a particular category such as
 * "all open trades", "concluded trades", or "current trades", along with the
 * relevant information for each trade (like SLN, name, etc.);
 * @param {object} req - request object used for the API input
 * @param {object} res - request object used for the API sending back output
 * Sends a positive status code if the trades were successfully retrieved
 */
app.post("/get-trades", async (req, res) => {
  let qry = getTradesQueries();

  try {
    let response = "";
    let db = await getDBConnection();

    if (req.body["category"] === "all-open-trades") {
      response = await getAllOpenTradesFromDatabaseForD3(db);

      await db.close();
      res.json(response);
    } else if (await isLoggedIn(req.body["user"] ? req.body["user"] : "")) {
      response = await db.all(qry[req.body["category"]], req.body["user"]);

      await db.close();
      res.json(response);
    } else {
      await db.close();
      res.status(403).send("Please log in first");
    }

  } catch (err) {
    res.status(500).send("A black hole swallowed your trades, cannot get trades");
  }
});

/**
 * This endpoint searches for any alerts that a user may have. For a given cart/ wanted
 * list of courses, this endpoint will check to see if any of them are available, and
 * will send a list of all the courses which have open slots in them.
 * @param {object} req - request object used for the API input
 * @param {object} res - request object used for the API sending back output
 * Sends a list of the courses that are available slots and wanted by the user.
 */
app.post("/alert", async (req, res) => {
  if (req.body.cart) {
    let cart = JSON.parse(req.body.cart);
    let alertClasses = [];
    for (let i = 0; i < cart.length; i++) {
      let boolCheck = await helperAlert(cart[i]["sln"]);
      if (boolCheck) {
        alertClasses.push(cart[i]["sln"]);
      }
    }
    res.json(alertClasses);
  } else {
    res.type("text").status(400);
    res.send("Missing one or more required parameter.");
  }
});

/**
 * This helper function checks to see if the given a given class (SLN) has any empty slots
 * or not.
 * @param {Number} sln - It is the target SLN we are checking to see if it is free.
 * @returns {Boolean} - It returns a boolean based on whether or not the course is available
 */
async function helperAlert(sln) {
  try {
    let db = await getDBConnection();
    const query1 = "SELECT lecture_sln from lecture_sections WHERE available_spots <> 0 AND \
      lecture_sln = ?";
    const query2 = "SELECT quiz_lab_sln from quiz_lab_sections WHERE available_spots <> 0 AND \
      quiz_lab_sln = ?";
    let lectures = await db.get(query1, sln);
    let quizzes = await db.get(query2, sln);
    await db.close();
    return lectures || quizzes;
  } catch (err) {
    return [500, "server error occurred."];
  }
}

/**
 * This endpoint is used to delete the trade if the user wants to cancel it.
 * @param {object} req - request object used for the API input
 * @param {object} res - request object used for the API sending back output
 * Sends a response indicating the success of the deletion.
 */
app.post("/change-trades/delete-trade", async (req, res) => {
  if (req.body["trade-id"] && req.body["user"]) {
    let deleteQry = getTradesQueries()["delete-trade"];
    if (await isLoggedIn(req.body["user"])) {
      try {
        let db = await getDBConnection();
        await db.run(deleteQry, [req.body["trade-id"]]);
        await db.close();
        res.type("text")
          .send("Trade deleted successfully");
      } catch (err) {
        res.status(500).send("A black hole swallowed your trades");
      }
    }
  } else {
    res.type("text").status(400);
    res.send("Missing one or more required parameter.");
  }
});

/**
 * This retrieves the course lecture and quiz section information for the given department name
 * (ex. CSE) or class (ex. CSE and 154); used by the search bar for section search
 * @param {object} req - request object used for the API input
 * @param {object} res - request object used for the API sending back output
 */
app.get("/course/get-course", async (req, res) => {
  let curriculumAbbreviation = req.query["curriculum_abbreviation"];
  let courseNumber = req.query["course_number"];
  let courseSln = req.query["section_sln"];
  let courseQry = getCourseQueries();
  let sectionQry = getSectionQueries();
  try {
    let db = await getDBConnection();
    let courses = [];
    if (courseSln) {
      let courseFound = await db.get(courseQry["course-from-sln"], [courseSln, courseSln]);
      !courseFound ? courseFound = await db.get(sectionQry["lecture-from-sln"], courseSln) : "";
      courseFound ? courses.push(courseFound) : "";
    } else if (courseNumber) {
      courses = await db.all(
        courseQry["courses"] += "AND course_number = ?",
        [curriculumAbbreviation, courseNumber]
      );
    } else {
      courses = await db.all(courseQry["courses"], curriculumAbbreviation);
    }
    for (let i = 0; i < courses.length; i++) {
      courses[i]["lecture_sections"] = await db.all(
        courseQry["lecture-sections"],
        courses[i]["course_id"]
      );
      for (let j = 0; j < courses[i]["lecture_sections"].length; j++) {
        courses[i]["lecture_sections"][j]["quiz_lab_sections"] = await db.all(
          courseQry["quiz-sections"],
          courses[i]["lecture_sections"][j]["lecture_sln"]
        );
      }
    }
    await db.close();
    res.json(courses);
  } catch (err) {
    res.status(500).type("text").send("Cannot fetch course or section, try again later.");
  }
});

/**
 * This defines some commonly used SQL queries for retrieving data from the courses,
 * lecture sections, and quiz section information.
 * @returns {object} - It is the JSON object containing all the appropriate queries.
 */
app.get("/section/get-section", async (req, res) => {
  let qry = getSectionQueries();

  let sectionSln = req.query["section_sln"];
  let sectionType = req.query["section_type"];

  try {
    let db = await getDBConnection();

    if (sectionSln && sectionType) {
      let result = await db.get(qry[sectionType + "-from-sln"], sectionSln);

      await db.close();
      res.json(result);
    } else {
      res.status(400).type("text");
      res.send("Missing query parameters");
    }
  } catch (err) {
    res.status(500).send("A black hole swallowed the sections");
  }
});

/**
 * This helper function checks to see if a given user is logged in or not based on the backend state
 * @param {String} username - It is the username that we want to verify whether is logged in
 * @returns {Boolean} - It returns a boolean based on whether or not the user is logged in.
 */
async function isLoggedIn(username) {
  try {
    let db = await getDBConnection();
    let result = await db.all("SELECT logged_in FROM users WHERE net_id = ?", username);
    await db.close();

    if (parseInt(result[0]["logged_in"]) === 1) {
      return true;
    }

    return false;
  } catch (err) {
    throw new Error("Cannot check user log in state");
  }
}

/**
 * This helper function defines a dictionary of SQL requests used in the code in order
 * to reduce redundancy when retrieving section information.
 * @returns {JSON} - It returns the SQL dictionary JSON object.
 */
function getSectionQueries() {
  let sqlQueryDictionary = {
    "quiz-lab-from-sln": "\
      SELECT c.*, q.* \
      FROM quiz_lab_sections q \
      JOIN lecture_sections l ON q.lecture_sln = l.lecture_sln \
      JOIN courses c ON c.course_id = l.course_id \
      WHERE q.quiz_lab_sln = ? \
    ",
    "lecture-from-sln": " \
      SELECT c.*, l.* \
      FROM lecture_sections l \
      JOIN courses c ON c.course_id = l.course_id \
      WHERE l.lecture_sln = ? \
    "
  };
  return sqlQueryDictionary;
}

/**
 * This helper function defines a dictionary of SQL requests used in the code in order
 * to reduce redundancy when retrieving trade information.
 * @returns {JSON} - It returns the SQL dictionary JSON object.
 */
function getTradesQueries() {
  const sqlQueryDictionary = {
    "concluded-trades": "SELECT * FROM trade_history WHERE net_id = ?",
    "current-trades": "SELECT * FROM open_trades WHERE user_id = ?",
    "all-trades": "SELECT * FROM open_trades",
    "delete-trade": "DELETE FROM open_trades WHERE trade_id = ?",
    "create-trade": " \
      INSERT INTO open_trades ( \
        dropped_section_info, \
        dropped_lecture_sln, \
        dropped_quiz_lab_sln, \
        wanted_section_info, \
        wanted_lecture_sln, \
        wanted_quiz_lab_sln, \
        user_id, \
        encypted_user_pswd \
      ) \
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) \
    ",
    "opposite-trade": "\
      SELECT * FROM open_trades \
      WHERE dropped_lecture_sln = ? AND dropped_quiz_lab_sln = ? \
      AND wanted_lecture_sln = ? AND wanted_quiz_lab_sln = ?; \
    "
  };
  return sqlQueryDictionary;
}

/**
 * This helper function defines a dictionary of SQL requests used in the code in order
 * to reduce redundancy when retrieving lecture/ course information.
 * @returns {JSON} - It returns the SQL dictionary JSON object.
 */
function getCourseQueries() {
  const sqlQueryDictionary = {
    "courses": "\
      SELECT * \
      FROM courses \
      WHERE curriculum_abbreviation = ? \
    ",
    "lecture-sections": "\
      SELECT * \
      FROM lecture_sections \
      WHERE course_id = ? \
    ",
    "quiz-sections": "\
      SELECT * \
      FROM quiz_lab_sections \
      WHERE lecture_sln = ? \
    ",
    "course-from-sln": "\
      SELECT c.*, l.lecture_sln, q.quiz_lab_sln \
      FROM quiz_lab_sections q \
      JOIN lecture_sections l ON q.lecture_sln = l.lecture_sln \
      JOIN courses c ON l.course_id = c.course_id \
      WHERE l.lecture_sln = ? OR q.quiz_lab_sln = ? \
    "
  };
  return sqlQueryDictionary;
}

/**
 * This function retrieves all the open trades existing in the database in a formatted
 * JSON object containing the nodes (lectures) and the links (trades).
 * @param {object} database - It is the database that the information is being retrieved from.
 * @returns {JSON} - It returns the SQL dictionary JSON object.
 */
async function getAllOpenTradesFromDatabaseForD3(database) {
  let openTrades = {"nodes": [], "links": []};
  let qry = getTradesQueries();

  try {
    let response = await database.all(qry["all-trades"]);

    for (let i = 0; i < response.length; i++) {
      let droppedSection = JSON.parse(response[i]["dropped_section_info"]);
      let wantedSection = JSON.parse(response[i]["wanted_section_info"]);
      droppedSection["section_sln"] = response[i]["dropped_quiz_lab_sln"] !== "" ?
        response[i]["dropped_quiz_lab_sln"] : response[i]["dropped_lecture_sln"];
      droppedSection["trade_role"] = "dropping";
      wantedSection["section_sln"] = response[i]["wanted_quiz_lab_sln"] !== "" ?
        response[i]["wanted_quiz_lab_sln"] : response[i]["wanted_lecture_sln"];
      wantedSection["trade_role"] = "wanted";

      _addSectionToNodeArrayIfDoesntContain(openTrades, droppedSection);
      _addSectionToNodeArrayIfDoesntContain(openTrades, wantedSection);
      _addLinkToLinkArrayIfDoesntContain(openTrades, droppedSection, wantedSection);
    }

    return openTrades;
  } catch (err) {
    throw new Error(err);
  }
}

/**
 * This function helps consider the edge case of the display menu in case of repeated
 * course trades occuring in the database.
 * @param {JSON} courses - It is the course JSON containing information such as its SLN, name etc.
 * @param {JSON} section - It is the section JSON containing informatin such as its SLN, name etc.
 */
function _addSectionToNodeArrayIfDoesntContain(courses, section) {
  let sectionSln = section["section_sln"];

  if (!courses["nodes"].some(existingNode => existingNode["section_sln"] === sectionSln)) {
    section["distance"] = 1;
    courses["nodes"].push(section);
  } else {
    courses["nodes"].forEach(existingNode => {
      if (existingNode["section_sln"] === sectionSln) {
        if (existingNode["trade_role"] !== section["trade_role"]) {
          existingNode["trade_role"] = "dropping-wanted";
        }
        existingNode["distance"]++;
      }
    })
  }
}

/**
 * This function helps consider the edge case of the display menu in case of repeated
 * course trades when displaying the menu.
 * @param {JSON} courses - It is the course JSON containing information such as its SLN, name etc.
 * @param {JSON} section1 - It is the section details of the initial node.
 * @param {JSON} section2 - It is the section details of the target node.
 */
function _addLinkToLinkArrayIfDoesntContain(courses, section1, section2) {
  let sln1 = section1["section_sln"];
  let sln2 = section2["section_sln"];

  if (!courses["links"].some(link => link["source"] === sln1 && link["target"] === sln2)) {
    courses["links"].push({"source": sln1, "target": sln2, "distance": 1});
  }
  else {
    courses["links"].forEach(existingLink => {
      if(existingLink["section_sln"] === sln1 || existingLink["section_sln"] === sln2) {
        existingLink["distance"]++;
      }
    })
  };
}

/**
 * Establishes a database connection to the database and returns the database object.
 * Any errors that occur should be caught in the function that calls this one.
 * @returns {sqlite3.Database} - The database object for the connection.
 */
async function getDBConnection() {
  const db = await sqlite.open({
    filename: "course_universe.db",
    driver: sqlite3.Database
  });

  return db;
}

app.use(express.static("public"));
const PORT = process.env.PORT || 8000;
app.listen(PORT);

/*
 * Dear TA, if you actually read all of this codes and comments, thank you for your dedication and
 * attention :)
 */