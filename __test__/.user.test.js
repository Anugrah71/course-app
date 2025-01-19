const { sequelize, User, Course, Enrollment } = require("../models");

describe("User-Course Association", () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  test("should enroll a user in a course", async () => {
    const educator = await User.create({ name: "Educator", email: "educator@test.com", role: "educator" });
    const course = await Course.create({ name: "JavaScript Basics", educatorId: educator.id });
    const student = await User.create({ name: "Student", email: "student@test.com", role: "student" });

    await Enrollment.create({ studentId: student.id, courseId: course.id });

    const enrolledCourses = await student.getEnrolledCourses();
    expect(enrolledCourses.length).toBe(1);
    expect(enrolledCourses[0].name).toBe("JavaScript Basics");
  });
});
