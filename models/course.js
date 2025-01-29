"use strict";

const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Course extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Course.belongsTo(models.User, {
        foreignKey: "educatorId",
        as: "educator", // alias for the assocation
      });
      Course.hasMany(models.Chapter, {
        foreignKey: "courseId",
        as: "chapters",
      });
      Course.hasMany(models.Enrollment, {
        foreignKey: "courseId",
        as: "enrollments",
      });
      Course.belongsToMany(models.User, {
        through: models.Enrollment,
        foreignKey: "courseId",
        otherKey: "studentId",
        as: "students",
      });
    }
  }

  Course.init(
    {
      name: DataTypes.STRING,
      description: DataTypes.STRING,
      educatorId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Course",
    },
  );
  return Course;
};
