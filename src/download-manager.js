const fs = require("fs");
const request = require("superagent");
const { v4: uuidv4 } = require("uuid");
const { URL } = require("node:url");

class DownloadManager {
  constructor(opts) {

    // The queue is used to track everything that should be downloaded.
    this.queue = [];
    this.longTermStorage = []; // Used for failed media

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

    this.reviveQueues();
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

  reviveQueues() {
    // This function will read any queues from disk and inject them into our instances
    // queues.

    if (fs.existsSync("./data/config/download_queue.json")) {
      let queue = fs.readFileSync("./data/config/download_queue.json");

      this.queue = JSON.parse(queue);
    }

    if (fs.existsSync("./data/config/download_longTermStorage.json")) {
      let lts = fs.readFileSync("./data/config/download_longTermStorage.json");

      this.longTermStorage = JSON.parse(lts);
    }

    return;
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

  async close() {
    console.log("DownloadManager is saving any open Download Queue");
    // This will be called during the shutdown event.
    // In which case we want to quickly save our queued items.
    if (this.queue.length > 0) {
      fs.writeFileSync("./data/config/download_queue.json", JSON.stringify(this.queue, null, 2));
      console.log("DownloadManager saved the current Download Queue.");
    }

    if (this.longTermStorage.length > 0) {
      fs.writeFileSync("./data/config/download_longTermStorage.json", JSON.stringify(this.longTermStorage, null, 2));
      console.log("DownloadManager saved the current LongTermStorage Queue");
    }
    return;
  }

  async processQueue() {
    console.log("Processing Download Queue...");
    // This is in charge of processing items in the queue of available downloads.

    while(this.queue.length > 0) {

      let item = this.queue[this.queue.length-1]; // Get last element

      const special = await this.handleSpecials(item);

      if (special.ok) {
        this.queue.pop();
        break;
      }

      // There will be several items that need or should have special handling.
      // This either means it's an item that we know will be needed to grab with another
      // tool, or that we know will fail our content type check.
      // If we are able to get it this way then we don't need to handle it here.
      // Whereas if we can't then we will continue it's handling here.

      let type = await this.determineContentTypeLight(item);

      if (type === "unknown") {
        // Lets try to find the type one more time
        type = await this.determineContentTypeHeavy(item);
      }

      switch(type) {
        case "text/html; charset=utf-8":
        case "text/html": {
          // The link is just to a standard webpage.
          // But we will have some specific exclusions in handling based on known behavior.
          const uniqueCases = await this.handleHTMLExclusions(item);

          if (uniqueCases.ok) {
            // This was handled as an exclusion and lets remove it from the queue
            this.queue.pop();
            break;
          }

          console.log(`Unable to Download: ${item}!`);
          this.longTermStorage.push(item);
          this.queue.pop();
          break;
        }
        case "image/jpeg": {
          await this.handleHTMLExclusions(item);
          const res = await this.getPhoto(item, "jpeg");

          if (!res.ok) {
            console.log(`Unable to Download ${item}!`);
            console.error(res.content);
            this.longTermStorage.push(item);
            this.queue.pop();
            break;
          }

          console.log(`Successfully Downloaded ${item}`);

          // Add to DB
          this.queue.pop();
          break;
        }
        case "unknown":
        default: {
          // We can't handle this. Lets notate that. Put it into long term storage
          // and remove from queue.
          console.log(`Unable to identify content: ${item}`);
          console.log("Removing from queue.");
          this.longTermStorage.push(item);
          this.queue.pop();
          break;
        }
      }

    }

  }

  async determineContentTypeLight(url) {
    console.log(`Beginning check on: ${url}`);
    try {
      const res = await request.head(url)
          .set("Accept", "*/*")
          .set("Connection", "keep-alive")
          .set("User-Agent", "LoMiArch-Bot")
          .timeout(10000);
          // All of these values should be configurable

      if (res.statusCode === 200) {
        console.log(`Returning Content Type: ${res.header["content-type"]}`);
        return res.header["content-type"];
      } else {
        console.log(`Failed to Download: ${url} - Status: ${res.statusCode}`);
        return "unknown";
      }
    } catch(err) {
      console.log(`Failed to Download: ${url} - Error: ${err}`);
      return "unknown";
    }
  }

  async determineContentTypeHeavy(url) {
    console.log(`Beginning Heavy Check on: ${url}`);
    try {
      const res = await request.get(url)
          .set("Accept", "*/*")
          .set("Connection", "keep-alive")
          .set("User-Agent", "LoMiArch-Bot")
          .timeout(10000);
          // All of these values should be configurable

      if (res.statusCode === 200) {
        console.log(`Returning Content Type: ${res.header["content-type"]}`);
        return res.header["content-type"];
      } else {
        console.log(`Failed to Download: ${url} During Heavy Content Type Check - Status: ${res.statusCode}`);
        return "unknown";
      }
    } catch(err) {
      console.log(`Failed Heavy Content Type Check: ${url} - Error: ${err}`);
      return "unknown";
    }
  }

  async getPhoto(url, type) {
    return new Promise(async (resolve, reject) => {
      try {
        let id = uuidv4();

        const stream = fs.createWriteStream(`./data/data/${id}.${type}`);

        stream.on("finish", function() {
          console.log(`Finished Downloading: ${url} to './data/data/${id}.${type}'`);

          resolve({
            ok: true,
            content: `${id}.${type}`
          });
        });

        await request.get(url).pipe(stream);
      } catch(err) {
        reject({
          ok: false,
          content: err
        });
      }
    });
  }

  async handleHTMLExclusions(url) {
    const parsedURL = new URL(url);
    console.log(parsedURL.hostname);
    if (parsedURL.hostname.endsWith("tiktok.com")) {
      console.log("Special TikTok");
    }

    // Any specific handling that's needed can be entered here following this pattern.
    return {
      ok: false,
      short: "No Available Exclusion Handlers"
    };
  }

  async handleSpecials(item) {
    return {
      ok: false
    };
  }

}

module.exports = DownloadManager;
