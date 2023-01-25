const fs = require("fs");
const request = require("superagent");
const { v4: uuidv4 } = require("uuid");

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

    reviveQueues();
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

    let queue = fs.readFileSync("./data/config/download_queue.json");

    this.queue = JSON.parse(queue);

    let lts = fs.readFileSync("./data/config/download_longTermStorage.json");

    this.longTermStorage = JSON.parse(queue);

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
      fs.writeFileSync("./data/config/download_longTermStorage.json", JSON.stringify(this.queue, null, 2));
      console.log("DownloadManager saved the current LongTermStorage Queue");
    }
    return;
  }

  async processQueue() {
    // This is in charge of processing items in the queue of available downloads.

    while(this.queue.length > 0) {

      let item = this.queue[this.queue.length-1]; // Get last element

      let type = await this.determineContentType(item);

      switch(type) {
        case "image/jpeg": {
          const res = await this.getPhoto(item, "jpeg");

          if (!res.ok) {
            console.log(`Unable to Downloading ${item}!`);
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

  async determineContentType(url) {
    try {
      const res = await request.get(url);

      if (res.statusCode === 200) {
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

  async getPhoto(url, type) {
    return new Promise(async (resolve, reject) => {
      try {
        let id = uuidv4();

        const stream = fs.createWriteStream(`./data/data/${id}.${type}`);

        stream.on("finish", function() {
          //console.log(fs.statSync("./data/data/file.jpeg"));
          console.log(`Finished Downloading: ${url}`);

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

}

module.exports = DownloadManager;
