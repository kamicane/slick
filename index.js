/*
slick
*/"use strict"

module.exports = "document" in global ? require("./finder") : require("./parser")
