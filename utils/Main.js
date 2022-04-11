const colors = require(`colors`);
class Main {
  constructor(name) {
    name = name || "Bot";
    name = `Bot.` + name;
    this.name = name;
    this.cache = [];
    this.config = require("../store/config.json");
    const prs = [];
    const ads = this.config.Ad.servers;
    for (const key in ads) {
      prs.push(`[**key**](${ads[key]})`);
    }
    this.prs = prs;
  }

  get theme() {
    return this.config.Bot.themes.winter;
  }

  InLog(...message) {
    console.log(`[${this.name}]:`.yellow, ...message);
  }
}

module.exports = Main;
