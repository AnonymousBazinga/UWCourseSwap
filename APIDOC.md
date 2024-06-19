# *Course Nebula* API Documentation

*Course Nebula API gives data about course trades that is on going and execute paired trades. It also returns information about specific courses from specific quarters and sections and the trade history.*

---
## *Login/Sign Up*
**Request Format:** */login*

**Request Type:** *POST*

**Returned Data Format**: Plain Text

**Description:** *Verify the UW credentials and return if it logins successfully to Course Registration page of UW*

**Example Request:** */login using FormData, user: **samhobbit**, pass: **OneRing27Pass@@***

**Example Response:**
*Fill in example response in the ticks*

```
Login Successful
```

**Error Handling:**
*500 if the server fails to connect to the database. 400 if the user did not send both the
username and password. 400 if the user entered the incorrect username or password. 400 if the Duo
2 Factor Authentification fails.*

---
## *Create Trade*
**Request Format:** */change-trades/create-trade*

**Request Type:** *POST*

**Returned Data Format**: JSON (if successful) or Plain Text (if it failed).

**Description:** *Performs the actual trade between two users*

**Example Request:** */change-trades/create-trade using FormData,
user: **samhobbit**, pass: **OneRing27Pass@@**,
dropped-section-type: **lecture**, dropped-section-sln: **12222*,
wanted-section-type: **lecture**, wanted-section-sln: **18222***

**Example Response:**

```
Please log in first before creating trade
```

**Error Handling:**
*500 if the server fails to connect to the database. 403 if the user has not logged in when
creating a trade. 400 if the user did not send the required parameters. 400 if the user entered
the incorrect username or password. 400 if the user tries to add a course that they cannot. 400 if
the user tries to drop a course they do not have.*

---
## *User's UW registered Courses.*

**Request Format:** */registered-courses*

**Request Type:** *POST*

**Returned Data Format**: JSON

**Description:** *Performs the actual trade between two users*

**Example Request:** */registered-courses using FormData,
user: **samhobbit**, pass: **OneRing27Pass@@**,

**Example Response:**

```json
[
  {
    "sln": "18452",
    "type": "lecture"
  },
  {
    "sln": "20400",
    "type": "lecture"
  },
  {
    "sln": "20404",
    "type": "quiz-lab"
  },
  {
    "sln": "13448",
    "type": "lecture"
  },
  {
    "sln": "13453",
    "type": "quiz-lab"
  }
]
```

**Error Handling:**
*500 if the server fails to connect to the database. 400 if the user did not send the required
parameters.*

---
## *Logout*

**Request Format:** */logout*

**Request Type:** *POST*

**Returned Data Format**: Plain Text

**Description:** *Updates the database to display that the user is not logged in*

**Example Request:** */logout using FormData, user: **samhobbit**, pass: **OneRing27Pass@@***

**Example Response:**

```
Successfully Logged Out!
```

**Error Handling:**
*500 if the server fails to connect to the database. 400 if the user did not send the required
parameters.*


---
## *Trades*
**Request Format:** */get-trades

**Request Type:** *POST*

**Returned Data Format**: JSON

**Description:** *Returns all the trades from the database that are of the relevant
category mentioned.*

**Example Request:** */get-trades using FormData, user: **samhobbit**, pass: **OneRing27Pass@@**,
category: **all-open-trades***

**Example Response:**

```json
{
  "nodes": [
    {
      "curriculum_abbreviation": "CLAS",
      "course_number": "101",
      "credits": 2,
      "course_description": "Designed to improve and increase English vocabulary through a study of the Latin and Greek elements in English, with emphasis on words in current literary and scientific use. Knowledge of Latin or Greek is not required.",
      "course_id": 14,
      "section_letter": "A",
      "meeting_info": "{\"T Th\":{\"building\":\"DEN 113\",\"meeting_time\":\"8:30 AM - 9:20 AM\"}}",
      "lecture_sln": 12839,
      "available_spots": 0,
      "max_capacity": 120,
      "type": "lecture",
      "section_sln": 12839,
      "trade_role": "dropping",
      "distance": 1
    },
    {
      "curriculum_abbreviation": "MATH",
      "course_number": "300",
      "credits": 3,
      "course_description": "Mathematical arguments and the writing of proofs in an elementary setting. Elementary set theory, elementary examples of functions and operations on functions, the principle of induction, counting, elementary number theory, elementary combinatorics, recurrence relations.",
      "course_id": 6,
      "section_letter": "A",
      "meeting_info": "{\n\t\"M W F\" : {\n\t\t\"meeting_time\": \"8:30 AM - 9:20 AM\",\n\t\t\"building\": \"MLR 316\"\n\t}\n}",
      "lecture_sln": 18468,
      "available_spots": 0,
      "max_capacity": 120,
      "type": "lecture",
      "section_sln": 18468,
      "trade_role": "wanted",
      "distance": 2
    },
    {
      "curriculum_abbreviation": "DESIGN",
      "course_number": "150",
      "credits": 3,
      "course_description": "Explores design activities and perspectives that affect the relationship between people, technology, and the world. Areas of research and practice, approaches, and principles provide an overview of how Design is represented in the field.",
      "course_id": 13,
      "section_letter": "A",
      "meeting_info": "{\n    \"M W F\": {\n        \"building\": \"SIG 134\",\n        \"meeting_time\": \"9:30 AM - 10:20 AM\"\n    }\n}",
      "lecture_sln": 13952,
      "available_spots": 0,
      "max_capacity": 120,
      "type": "lecture",
      "section_sln": 13952,
      "trade_role": "dropping",
      "distance": 1
    }
  ],
  "links": [
    {
      "source": 12839,
      "target": 18468,
      "distance": 1
    },
    {
      "source": 13952,
      "target": 18468,
      "distance": 1
    }
  ]
}
```

**Error Handling:**
*500 if the server fails to connect to the database. 400 if the user did not send the required
parameters. 403 if the user is not logged in when trying to fetch courses.*

---
## *Alert*

**Request Format:** */alert

**Request Type:** *POST*

**Returned Data Format**: JSON

**Description:** *Returns a list of all the courses that the user should be alerted for open
spots regarding. It uses the user's cart as a wishlist of courses to search through*

**Example Request:** */alert using FormData, cart: **[{"sln": 13316, "type": "lecture"}]***

**Example Response:**
```json
[
	13316
]
```

**Error Handling:**
*500 if the server fails to connect to the database.*


---
## *Delete Trade*
**Request Format:** */change-trades/delete-trade*

**Request Type:** *POST*

**Returned Data Format**: Plain Text

**Description:** *Updates the database with the deletion of the course as per the user's
request. It verifies if the user is logged in when sending the request.*

**Example Request:** */change-trades/delete-trade using FormData, user: **hobbitSam**,
trade-id: **67***

**Example Response:**

```
Trade deleted successfully
```

**Error Handling:**
*500 if the endpoint fails to connect to the database.*

---
## *Get Course*
**Request Format:** */course/get-course*

**Request Type:** *GET*

**Returned Data Format**: JSON

**Description:** *It returns the courses/ lectures for a particular specification
of course, sln or curriculum abbreivation.*

**Example Request:** */course/get-course?curriculum_abbreviation=CSE*

**Example Response:**

```json
[
  {
    "curriculum_abbreviation": "CSE",
    "course_number": "154",
    "credits": 5,
    "course_description": "Covers languages, tools, and techniques for developing interactive and dynamic web pages. Topics include page styling, design, and layout; client and server side scripting; web security; and interacting with data sources such as databases.",
    "course_id": 4,
    "lecture_sections": [
      {
        "section_letter": "A",
        "course_id": 4,
        "meeting_info": "{\n\t\"M W F\" : {\n\t\t\"meeting_time\": \"8:30 AM - 9:20 AM\",\n\t\t\"building\": \"HCK 132\"\n\t}\n}",
        "lecture_sln": 13313,
        "available_spots": 0,
        "max_capacity": 120,
        "quiz_lab_sections": [
          {
            "section_letter": "AC",
            "lecture_sln": 13313,
            "meeting_info": "{\n\t\"T Th\": {\n\t\t\"meeting_time\": \"11:30 AM - 12:20 PM\",\n\t\t\"building\": \"SMI 107\"\n\t}\n}",
            "quiz_lab_sln": 13316,
            "type": "quiz",
            "available_spots": 0,
            "max_capacity": 30
          }
        ]
      }
    ]
  }
]
```

**Error Handling:**
*500 if the endpoint fails to connect to the database.*

---
## *Get Section*
**Request Format:** */section/get-section*

**Request Type:** *GET*

**Returned Data Format**: JSON

**Description:** *It returns the sections for a particular specification
of section_sln and section type provided.*

**Example Request:** */section/get-section?section_sln=20400&section_type=lecture*

**Example Response:**

```json
{
  "curriculum_abbreviation": "PHIL",
  "course_number": "102",
  "credits": 5,
  "course_description": "Philosophical consideration of some of the main moral problems of modern society and civilization, such as abortion, euthanasia, war, and capital punishment. Topics vary.Philosophical consideration of some of the main moral problems of modern society and civilization, such as abortion, euthanasia, war, and capital punishment. Topics vary.",
  "course_id": 12,
  "section_letter": "A",
  "meeting_info": "{\"M W F\":{\"building\":\"SIG 134\",\"meeting_time\":\"9:30 AM - 10:20 AM\"}}",
  "lecture_sln": 20400,
  "available_spots": 0,
  "max_capacity": 120
}
```

**Error Handling:**
*500 if the endpoint fails to connect to the database. 400 if the request is missing one or more
of the parameters.*