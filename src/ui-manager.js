
async function homePage(req, res) {
  res.render("home", { page: { name: "Home" },
    items: [
      
    ]});
}

module.exports = {
  homePage,
};
