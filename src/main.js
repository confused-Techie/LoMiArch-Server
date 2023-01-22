const express = require("express");

module.exports = ({
  downloadManager,
  uiManager,
}) => {
  const app = express();

  app.set("views", "./views/pages");
  app.set("view engine", "ejs");

  app.use("/tw-elements", express.static("./node_modules/tw-elements/dist/js")); // TODO
  app.use("/public", express.static("./public"));

  app.use((req, res, next) => {
    req.start = Date.now();
    next();
  });

  app.get("/", async (req, res) => {
    //res.status(200).json({ message: "Hello world" });
    await uiManager.homePage(req, res);
  });

  app.get("/download", async (req, res) => {
    // Initiates a download of items sent.
    let params = {
      loc: req.query.loc ?? "",
    };

    if (params.loc === "") {
      res.status(500).json({ message: "No Data Location Provided" });
      return;
    }

    // Otherwise we have valid data, and lets go to download it.
    let status = downloadManager.get(params.loc);

    if (!status.ok) {
      res.status(status.code).json({ message: status.details });
      return;
    }

    res.status(200).json({ message: "Item is queued for download" });
  });

  // 404 Handler, keep at last position
  app.use((req, res) => {
    res.status(404).json({ message: "Not Found" });
  });

  return app;
};
