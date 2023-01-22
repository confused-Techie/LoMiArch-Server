const app = require("./main.js");
const DownloadManager = require("./download-manager.js");
const uiManager = require("./ui-manager.js");

class Server {
  constructor(opts) {
    this.port = opts.PORT;
    this.url_whitelist = opts.URL_WHITELIST;
    this.url_blacklist = opts.URL_BLACKLIST;
    this.url_knownlist = opts.URL_KNOWNLIST;
    this.url_whitelist_only = opts.URL_WHITELIST_ONLY;

  }

  async start() {
    const downloadManager = new DownloadManager({
      url_whitelist: this.url_whitelist,
      url_blacklist: this.url_blacklist,
      url_knownlist: this.url_knownlist,
      url_whitelist_only: this.url_whitelist_only
    });

    const http = app({
      downloadManager,
      uiManager,
    });

    return new Promise((resolve) => {
      console.log(`LoMiArch Server Listening on: ${this.port}`);
      this.server = http.listen(this.port, resolve);
    });
  }

  async stop(reason) {
    console.log(`${reason} Called Server Shutdown`);
    return new Promise((resolve) => {
      this.server.close(resolve);
    });
  }
}

module.exports = Server;