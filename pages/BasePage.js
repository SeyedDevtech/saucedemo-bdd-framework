/** Shared behaviour for all page objects. Locators live in the page classes, never in steps. */
class BasePage {
  constructor(page) {
    this.page = page;
  }

  async open(relativePath = '/') {
    await this.page.goto(relativePath);
  }

  currentUrl() {
    return this.page.url();
  }
}

module.exports = { BasePage };
