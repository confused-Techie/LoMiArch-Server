const fs = require("fs");
const yaml = require("js-yaml");

function getConfig() {
  try {
    let fileContent = fs.readFileSync("./data/config/.env.yaml", "utf8");
    let data = yaml.load(fileContent);

    return data;

  } catch(err) {
    throw err;
  }
}

module.exports = getConfig;
