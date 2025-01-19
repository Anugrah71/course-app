const express = require("express");
const app = express();

const { User , Course ,Chapter , Page } = require("./models");

const passport = require("passport");

const session = require("express-session");

const flash = require("connect-flash");

const LocalStrategy = require("passport-local").Strategy;

const bcrypt = require("bcrypt");
const chapter = require("./models/chapter");

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash("error", "Please log in to access this page.");
  res.redirect("/login");
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "your_secret_key", // Change this to something secret
    resave: false,
    saveUninitialized: false,
  }),
);
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");

// Serve static files like CSS
app.use(express.static("public"));

passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ where: { email } });
        if (user && (await bcrypt.compare(password, user.password))) {
          return done(null, user); // Authentication success
        } else {
          return done(null, false, { message: "Invalid email or password!" }); // Authentication failure
        }
      } catch (error) {
        return done(error); // Error handling
      }
    },
  ),
);

// Serialize user info into session
passport.serializeUser((user, done) => {
  done(null, user.id); // Store only the user id
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Route to render the page
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
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });
    req.login(user, (error) => {
      if (error) return res.status(500).send("Error during login");
      if (req.user.role === "educator") {
        res.render("educator");
      } else {
        res.render("student");
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Error creating user");
  }
});

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login", // Redirect to login page on failure
    failureFlash: true, // Show flash message on failure
  }),
  (req, res) => {
    req.flash("success", "Login successful!"); // Flash message on success
    if (req.user.role === "educator") {
      res.render("educator", {
        title: "Educator Dashboard",
        user: req.user,
      });
    } else if (req.user.role === "student") {
      res.render("student", {
        title: "Student Dashboard",
        user: req.user,
      });
    } else {
      res.redirect("/"); // Redirect to a different page for other users
    }
  },
);

app.get("/signout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err); // Handle logout error
    res.redirect("/"); // Redirect to the home page
  });
});

app.get("/newcourse", (req, res) => {
  res.render("course");
});
app.get("/my-course", async (req, res) => {
  try {
    const courses = await Course.MyCourse(req.user.id);
    res.render("myCourses", { courses });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching courses");
  }
});
app.post("/course", ensureAuthenticated, async (req, res) => {
  if (!req.user) {
    req.flash("error", "User not authenticated.");
    return res.redirect("/login");
  }

  try {
    const newCourse = await Course.addcourse({
      title: req.body.title,
      description: req.body.description,
      educatorId: req.user.id, // Accessing educatorId from the authenticated user
    });
    res.render("chapter");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating course");
  }
});

app.post("/new-chapter", ensureAuthenticated, async (req, res) => {
  if (!req.user) {
    req.flash("error", "User not authenticated.");
    return res.redirect("/login");
  }

  try {
    const newChapter = await Chapter.addChapter({
      title: req.body.title,
      courseId: req.user.id, // Accessing educatorId from the authenticated user
    });
    res.render("page");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating course");
  }
});

module.exports = app;
