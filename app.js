/* eslint-disable no-undef */
const express = require("express");
const bodyParser = require("body-parser");
const passport = require("passport");
const session = require("express-session");
const flash = require("connect-flash");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");

const { User, Course, Chapter, Page } = require("./models");
// const { where } = require("sequelize");
// const chapter = require("./models/chapter");
// const { name } = require("ejs");

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "your_secret_key", // Change this to a secure key
    resave: false,
    saveUninitialized: false,
  }),
);
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");
app.use(express.static("public")); // Serve static files like CSS

// Authentication Middleware
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash("error", "Please log in to access this page.");
  res.redirect("/login");
};

// Passport Configuration
passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ where: { email } });
        if (user && (await bcrypt.compare(password, user.password))) {
          return done(null, user);
        }
        return done(null, false, { message: "Invalid email or password!" });
      } catch (error) {
        return done(error);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Routes
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("login", {
    message: {
      success: req.flash("success"),
      error: req.flash("error"),
    },
  });
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/users", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).send("All fields are required!");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    req.login(user, (error) => {
      if (error) return res.status(500).send("Error during login");

      const redirectPage = user.role === "educator" ? "educator" : "student";
      res.render(redirectPage);
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating user");
  }
});

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (req, res) => {
    req.flash("success", "Login successful!");
    const dashboard = req.user.role === "educator" ? "educator" : "student";
    res.render(dashboard, {
      title: `${dashboard.charAt(0).toUpperCase() + dashboard.slice(1)} Dashboard`,
      user: req.user,
    });
  },
);

app.get("/signout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});

app.get("/newcourse", ensureAuthenticated, (req, res) => {
  res.render("course");
});

app.post("/course", ensureAuthenticated, async (req, res) => {
  try {
    const { name, description } = req.body;
    const newCourse = await Course.create({
      name,
      description,
      educatorId: req.user.id,
    });
    req.session.newCourseId = newCourse.id;
    res.render("chapter", { courseId: newCourse.id });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating course");
  }
});

app.get("/my-course", ensureAuthenticated, async (req, res) => {
  try {
    const courses = await Course.MyCourse(req.user.id);
    res.render("myCourses", { courses });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching courses");
  }
});

app.post("/new-chapter", ensureAuthenticated, async (req, res) => {
  try {
    const { title } = req.body;
    const newCourseId = req.session.newCourseId;
    if (!newCourseId) {
      throw new Error("Course ID not found in session");
    }
    const newChapter = await Chapter.create({ title, courseId: newCourseId });
    req.session.newChapterId = newChapter.id;

    res.render("page", { chapter: newChapter });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating chapter");
  }
});

app.post("/page-save", ensureAuthenticated, async (req, res) => {
  try {
    const newChapterId = req.session.newChapterId;
    if (!newChapterId) {
      throw new Error("Chapter ID not found in session");
    }
    const { title, content } = req.body;
    await Page.create({
      title,
      content,
      chapterId: newChapterId,
    });
    res.status(200).send("Page created successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating page");
  }
});

module.exports = app;
