/* eslint-disable no-undef */
const { sequelize, Chapter, Course } = require("../models");
const { exec } = require("child_process");

// Create the test database before running tests
// eslint-disable-next-line no-undef
beforeAll((done) => {
  // Create the database using sequelize-cli
  exec("npx sequelize-cli db:create --env test", (err, stdout, stderr) => {
    if (err) {
      console.error(`Error creating database: ${stderr}`);
      done(err);
      return;
    }
    console.log(`Database created: ${stdout}`);
    done();
  });
});
// eslint-disable-next-line no-undef
describe("Chapter Model", () => {
  // eslint-disable-next-line no-undef
  beforeAll(async () => {
    await sequelize.sync({ force: true }); // Reset database
  });
  // eslint-disable-next-line no-undef
  test("should create a chapter", async () => {
    const course = await Course.create({
      name: "Test Course",
      description: "A test course",
    });
    const chapter = await Chapter.create({
      title: "Test Chapter",
      courseId: course.id,
    });
    // eslint-disable-next-line no-undef
    expect(chapter.title).toBe("Test Chapter");
    expect(chapter.courseId).toBe(course.id);
  });

  test("should fetch chapters associated with a course", async () => {
    const course = await Course.findOne({ where: { name: "Test Course" } });
    const chapters = await course.getChapters();

    expect(chapters.length).toBe(1);
    expect(chapters[0].title).toBe("Test Chapter");
  });
});
