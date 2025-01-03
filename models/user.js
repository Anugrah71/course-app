"use strict";

const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      User.hasMany(models.Course, {
        foreignKey: "educatorId",
        as: "courses",
      });
      User.hasMany(models.Enrollment, {
        foreignKey: "studentId",
        as: "enrollments",
      });
      User.belongsToMany(models.Course, {
        through: models.Enrollment,
        foreignKey: "studentId",
        otherKey: "courseId",
        as: "enrolledCourses",
      });
    }
  }
  User.init(
    {
      name: DataTypes.STRING,
      email: DataTypes.STRING,
      password: DataTypes.STRING,
      role: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "User",
    },
  );
  return User;
};
