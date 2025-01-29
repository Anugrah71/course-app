/* eslint-disable no-undef */
const { Sequelize } = require("sequelize");
const express = require("express");
const bodyParser = require("body-parser");
const passport = require("passport");
const session = require("express-session");
const flash = require("connect-flash");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");

const { User, Course, Chapter, Page, Enrollment } = require("./models");
// const user = require("./models/user");
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
    cookie: {
      maxAge: 30 * 60 * 1000, //30m
    },
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
  if (req.isAuthenticated()) {
    res.render("login");
  } else {
    res.render("index");
  }
});

app.get("/home", ensureAuthenticated, async (req, res) => {
  try {
    const allCourses = await Course.findAll({
      include: [
        {
          model: User,
          as: "educator",
          attributes: ["name"],
        },
        {
          model: Enrollment,
          as: "enrollments",
          attributes: [],
        },
      ],
      attributes: {
        include: [
          [
            Sequelize.fn("COUNT", Sequelize.col("enrollments.id")),
            "enrollmentCount",
          ],
        ],
      },
      group: ["Course.id", "educator.id"],
    });
    res.render("educator", { user: req.user, allCourses });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching courses");
  }
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

app.get("/course/:id", ensureAuthenticated, async (req, res) => {
  try {
    const courseId = req.params.id;
    const course = await Course.findByPk(courseId, {
      include: [
        {
          model: User,
          as: "educator",
          attributes: ["name"],
        },
        {
          model: Enrollment,
          as: "enrollments",
        },
        {
          model: Chapter,
          as: "chapters",
          include: [
            {
              model: Page,
              as: "pages",
            },
          ],
        },
      ],
    });

    if (!course) {
      return res.status(404).send("Course not found");
    }
    res.render("chapterView", { course });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching course details");
  }
});

// app.get(
//   "/chapterView/:courseId/:chapterId",
//   ensureAuthenticated,
//   async (req, res) => {
//     try {
//       const course = await Course.findByPk(req.params.courseId, {
//         include: [
//           {
//             model: Chapter,
//             as: "chapters",
//             include: [
//               {
//                 model: Page,
//                 as: "pages",
//               },
//             ],
//           },
//         ],
//       });

//       const chapter = course.chapters.find(
//         (ch) => ch.id === parseInt(req.params.chapterId)
//       );

//       if (!course || !chapter) {
//         return res.status(404).send("Course or Chapter not found");
//       }

//       res.render("chapterView", { course, chapter });
//     } catch (error) {
//       console.error(error);
//       res.status(500).send("Error fetching course or chapter");
//     }
//   }
// );

app.get("/page/:id", ensureAuthenticated, async (req, res) => {
  try {
    const pageId = req.params.id;
    const page = await Page.findByPk(pageId, {
      include: [
        {
          model: Chapter,
          as: "chapter",
          include: [
            {
              model: Course,
              as: "course",
              include: [
                {
                  model: User,
                  as: "educator",
                  attributes: ["name"],
                },
                {
                  model: Enrollment,
                  as: "enrollments",
                },
              ],
            },
          ],
        },
      ],
    });

    if (!page) {
      return res.status(404).send("Page not found");
    }

    const course = page.chapter.course;

    res.render("viewPage", { course, page });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching page details");
  }
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
      if (redirectPage === "educator") {
        res.redirect("/home");
      } else {
        res.render("student");
      }
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
    if (req.user.role === "educator") {
      res.redirect("/home");
    } else {
      res.render("student", {
        title: "Student Dashboard",
        user: req.user,
      });
    }
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
    const courses = await Course.findAll({
      where: { educatorId: req.user.id },
      include: [
        {
          model: User,
          as: "educator",
          attributes: ["name"],
        },
      ],
    });
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

    const course = await Course.findByPk(newCourseId, {
      include: [
        {
          model: User,
          as: "educator",
          attributes: ["name"],
        },
        {
          model: Enrollment,
          as: "enrollments",
        },
      ],
    });

    if (!course) {
      return res.status(404).send("Course not found");
    }

    res.render("page", { chapter: newChapter, course });
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

app.get("/newchapter", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const courses = await Course.findAll({
      where: { educatorId: userId },
    });
    res.render("newChapter", { courses });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating page");
  }
});

app.post("/saveChapter", ensureAuthenticated, async (req, res) => {
  try {
    const { CourseId, title } = req.body;
    await Chapter.create({
      title: title,
      courseId: CourseId,
    });

    res.redirect(`/course/${CourseId}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating chapter");
  }
});
//
app.get("/newpage", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const courses = await Course.findAll({
      where: { educatorId: userId },
      include: [
        {
          model: Chapter,
          as: "chapters",
        },
      ],
    });

    res.render("newPage", { courses });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error rendering new page form");
  }
});

app.post("/savepage", ensureAuthenticated, async (req, res) => {
  try {
    const { chapId, title, content } = req.body;

    // Ensure the chapter exists
    const chapter = await Chapter.findByPk(chapId);
    if (!chapter) {
      return res.status(404).send("Chapter not found");
    }

    // Create the new page
    await Page.create({
      title: title,
      chapterId: chapId,
      content: content,
    });

    res.redirect(`/chapter/${chapId}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating page");
  }
});

app.post("/newpagesave", ensureAuthenticated, async (req, res) => {
  try {
    const { chapId, title, content } = req.body;

    // Ensure the chapter exists
    const chapter = await Chapter.findByPk(chapId);
    if (!chapter) {
      return res.status(404).send("Chapter not found");
    }

    // Create the new page
    await Page.create({
      title: title,
      chapterId: chapId,
      content: content,
    });

    res.status(202).send("Page create successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating page");
  }
});
module.exports = app;
