const express = require("express");
const app = express();

const { User } = require("./models");

const passport = require("passport");

const session = require("express-session");

const flash = require("connect-flash");

const LocalStrategy = require("passport-local").Strategy;

const bcrypt = require("bcrypt");

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
  res.render("adminView");
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
    res.status(201).send({ message: "User created successfully!", user });
  } catch (error) {
    console.error("Error creating user:", error.message);

    // Send error response
    res
      .status(500)
      .send({ error: "Internal Server Error", details: error.message });
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
    res.redirect("/"); // Redirect to a protected page
  },
);

module.exports = app;
