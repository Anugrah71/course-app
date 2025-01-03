const express = require("express");
const app = express();

app.set("view engine", "ejs");

// Serve static files like CSS
app.use(express.static("public"));

// Dummy data for user and courses
const userData = {
  name: "Jane Doe",
  courses: [
    {
      title: "Introduction to JavaScript",
      educator: "John Doe",
      students: 279,
      progress: 0, // Completion percentage
    },
  ],
};

// Route to render the page
app.get("/", (req, res) => {
  res.render("index", { user: userData });
});

module.exports = app;
