const app = require("./main.js");
const DownloadManager = require("./download-manager.js");
const uiManager = require("./ui-manager.js");
const { Level } = require("level");

const { exec, spawn } = require("node:child_process");

class Server {
  constructor(opts) {
    this.port = opts.PORT;
    this.url_whitelist = opts.URL_WHITELIST;
    this.url_blacklist = opts.URL_BLACKLIST;
    this.url_knownlist = opts.URL_KNOWNLIST;
    this.url_whitelist_only = opts.URL_WHITELIST_ONLY;

    this.ytdlpPath = opts.YTDLP_PATH;

    // Class Scope Declared Services (Used to Shutdown those needed.)
    this.downloadManager = null;
    this.db = null;
  }

  async start() {
    this.db = new Level("./data/config/level.db", { valueEncoding: "json"});

    const setupLocal = async (err) => {
      if (err) {
        console.error(err);
        process.exit(100);
      }

      this.downloadManager = new DownloadManager({
        url_whitelist: this.url_whitelist,
        url_blacklist: this.url_blacklist,
        url_knownlist: this.url_knownlist,
        url_whitelist_only: this.url_whitelist_only
      });

      const http = app({
        downloadManager: this.downloadManager,
        uiManager: uiManager,
      });


      //exec("node -v", (error, stdout, stderr) => {
      //  if (error) {
      //    console.error(error);
      //    process.exit(1);
      //  }
      //  if (stderr) {
      //    console.error(stderr);
      //    process.exit(2);
      //  }
      //  console.log(stdout);
      //});

      //this.downloadManager.queue.push("");
      //let test = await this.downloadManager.processQueue();

      return new Promise((resolve) => {
        console.log(`LoMiArch Server Listening on: ${this.port}`);
        this.server = http.listen(this.port, resolve);
      });

    };

    this.db.open(setupLocal);
  }

  async stop(reason) {
    console.log(`${reason} Called Server Shutdown`);
    return new Promise(async (resolve) => {
      this.server.close(resolve);
      await this.downloadManager.close();
      //if (!this.db.supports.permanence) {
        await this.db.close();
      //} else {
        //console.log("LevelDB Doesn't support persistant storage!");
      //}
      // This check always fails
    });
  }
}

module.exports = Server;
