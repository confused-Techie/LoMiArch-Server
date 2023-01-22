const fs = require("fs");

class DownloadManager {
  constructor(opts) {

    // The queue is used to track everything that should be downloaded.
    this.queue = [];

    this.url = {
      whitelist: [],
      blacklist: [],
      knownlist: []
    };

    this.url_whitelist_only = opts.url_whitelist_only;

    // Lets check if we need to append data into our blacklist and whitelist
    if (typeof opts.url_whitelist !== "undefined" && opts.url_whitelist !== "") {
      readURLList(opts.url_whitelist, this.url.whitelist);
    }
    if (typeof opts.url_blacklist !== "undefined" && opts.url_blacklist !== "") {
      readURLList(opts.url_blacklist, this.url.blacklist);
    }
    if (typeof opts.url_knownlist !== "undefined" && opts.url_knownlist !== "") {
      readURLList(opts.url_knownlist, this.url.knownlist);
    }
  }

  readURLList(loc, obj) {
    try {
      let data = fs.readFileSync(loc, "utf8");

      const lines = data.split("\n");
      for (let line = 0; line < lines.length; line++) {
        obj.push(lines[line]);
      }
    } catch(err) {
      console.log(`There was an error reading and filling the whitelist: ${err}`);
      console.log(err);
    }
  }

  verifyURL(value) {
    // Used to check if the value provided is an actual URL
    // Returns true if it is, false otherwise
    return true;
  }

  get(loc) {
    // First lets ensure this is actually a URL
    if (!this.verifyURL(loc)) {
      return {
        ok: false,
        code: 500,
        details: "Was not provided a valid URL or resource"
      };
    }

    // Now lets ensure it's not in the blacklist.
    if (this.url.blacklist.includes(loc)) {
      return {
        ok: false,
        code: 500,
        details: "This item is in the blacklist. And is being ignored"
      };
    }

    // Now lets ensure it's in the whitelist if we are using whitelist only
    if (this.url_whitelist_only && !this.url.whitelist.includes(loc)) {
      return {
        ok: false,
        code: 500,
        details: "This item is not in the whitelist while in whitelist only mode"
      };
    }

    // This item has passed all tests. Now we can add it to our download queue.

    this.queue.push(loc);
    return {
      ok: true
    };

  }

  processQueue() {
    // This is in charge of processing items in the queue of available downloads.

    while(this.queue.length > 0) {

    }

  }
}

module.exports = DownloadManager;
