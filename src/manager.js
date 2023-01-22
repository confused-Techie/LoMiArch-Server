const config = require("./config.js")();
const Server = require("./server.js");

(async() => {
  const server = new Server(config);

  await server.start();

  process.on("SIGINT", async () => {
    await server.stop("SIGNIT");
  });

  process.on("SIGTERM", async () => {
    await server.stop("SIGTERM");
  });

  process.on("unhandledRejection", async (error) => {
    console.error(err);
    await server.stop("unhandledRejection");
  });
  
})();
