CREATE TABLE "courses" (
	"curriculum_abbreviation"	TEXT NOT NULL,
	"course_number"	TEXT NOT NULL,
	"credits"	INTEGER,
	"course_description"	TEXT,
	"course_id"	INTEGER NOT NULL,
	PRIMARY KEY("course_id" AUTOINCREMENT)
)

CREATE TABLE "lecture_sections" (
	"section_letter"	TEXT NOT NULL,
	"course_id"	INTEGER NOT NULL,
	"meeting_info"	TEXT,
	"lecture_sln"	INTEGER NOT NULL,
	"available_spots"	INTEGER NOT NULL DEFAULT 0,
	"max_capacity"	INTEGER NOT NULL DEFAULT 120,
	FOREIGN KEY("course_id") REFERENCES "courses"("course_id"),
	PRIMARY KEY("lecture_sln")
)

CREATE TABLE "open_trades" (
	"dropped_section_info"	TEXT NOT NULL,
	"dropped_lecture_sln"	INTEGER NOT NULL,
	"dropped_quiz_lab_sln"	INTEGER,
	"wanted_section_info"	TEXT NOT NULL,
	"wanted_lecture_sln"	INTEGER NOT NULL,
	"wanted_quiz_lab_sln"	INTEGER,
	"user_id"	TEXT NOT NULL,
	"encypted_user_pswd"	TEXT NOT NULL,
	"trade_id"	INTEGER NOT NULL,
	FOREIGN KEY("dropped_quiz_lab_sln") REFERENCES "quiz_lab_sections"("quiz_lab_sln"),
	PRIMARY KEY("trade_id" AUTOINCREMENT),
	FOREIGN KEY("wanted_lecture_sln") REFERENCES "lecture_sections"("lecture_sln"),
	FOREIGN KEY("user_id") REFERENCES "users"("net_id"),
	FOREIGN KEY("wanted_quiz_lab_sln") REFERENCES "quiz_lab_sections"("quiz_lab_sln"),
	FOREIGN KEY("dropped_lecture_sln") REFERENCES "lecture_sections"("lecture_sln")
)

CREATE TABLE "quiz_lab_sections" (
	"section_letter"	TEXT,
	"lecture_sln"	INTEGER NOT NULL,
	"meeting_info"	TEXT NOT NULL,
	"quiz_lab_sln"	INTEGER NOT NULL,
	"type"	TEXT NOT NULL DEFAULT 'N/A',
	"available_spots"	INTEGER NOT NULL DEFAULT 0,
	"max_capacity"	INTEGER NOT NULL DEFAULT 30,
	PRIMARY KEY("quiz_lab_sln")
)

CREATE TABLE "trade_history" (
	"net_id"	TEXT NOT NULL,
	"dropped_section_info"	TEXT NOT NULL,
	"received_section_info"	TEXT NOT NULL,
	"trade_time"	TIMESTAMP DATE NOT NULL DEFAULT (datetime('now', 'localtime')),
	"transaction_id"	INTEGER NOT NULL,
	FOREIGN KEY("net_id") REFERENCES "users"("net_id"),
	PRIMARY KEY("transaction_id")
)

CREATE TABLE "users" (
	"net_id"	TEXT NOT NULL UNIQUE,
	"encrypted_pswd"	TEXT NOT NULL,
	"alert_message"	TEXT,
	"logged_in"	INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY("net_id")
)