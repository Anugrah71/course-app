"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Progresses", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      studentId: {
        type: Sequelize.INTEGER,
      },
      courseId: {
        type: Sequelize.INTEGER,
      },
      pageId: {
        type: Sequelize.INTEGER,
      },
      isCompleted: {
        type: Sequelize.BOOLEAN,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  } /* eslint-disable */,
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Progresses");
  },
};
