# UW Course Swap

## Introduction

This website is a way for University of Washington students to trade their courses during course registration. As an example, say I initially registered for a 9:30am slot of a class,
but it now has a conflict and I want to switch that to 10:30am instead, I can set up a trade using this website. When someone else comes along
who is willing to do the trade, this website will automatically swap the courses for you.

### The need for this.

Currently, when a UW student wants to register for a course that is full, they have only one (ineffective) choice - to sign up for Notify alert and hope that a slot opens up. So, many of us end up registering for a "second-choice" or "backup" course. However, with this website, if you want a course, you can put that up on the website and we will find a swap match and handle it for you!

### The reason we built it.

This was developed as our final project in the CSE 154 Web Programming class in the Spring quarter, 2024 taught by Tal Wolman. At the end of the quarter, we presented our project in front of 100+ students, TAs and instructors, and we were voted as the best project from over 50 teams. We are extremely grateful for the experience!

## The security and development process (overcoming 2FA).

The entire journey of this project had a lot of roadbumps in terms of security. We were trying to build a project to automatically swap courses between two students (without using any API)
and our main goal throughout this project was to make this seamless. Our main goal was that we wanted the course swap to be automatically completed on MyPlan once a trade was matched.</br>
In building this, we incorporated UW's 2 factor authentification (for security reasons) into our login process, and at the same time maintained browser state in order automatically swap courses
later without prompting another Duo push.

## Next Steps

We plan to pitch this idea to UW IT Connect, and we hope to see this website being presented as a product from the University similar to Notify.
