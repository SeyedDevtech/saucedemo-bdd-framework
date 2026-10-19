const { waitForVisible } = require('../support/waits');
const { BasePage } = require('./BasePage');

class LoginPage extends BasePage {
  // Centralised locators (data-test attributes are SauceDemo's stable test hooks).
  get usernameInput() {
    return this.page.getByTestId('username');
  }
  get passwordInput() {
    return this.page.getByTestId('password');
  }
  get loginButton() {
    return this.page.getByTestId('login-button');
  }
  get errorMessage() {
    return this.page.getByTestId('error');
  }

  async goto() {
    await this.open('/');
    await waitForVisible(this.loginButton);
  }

  async login(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async getErrorText() {
    await waitForVisible(this.errorMessage);
    return (await this.errorMessage.innerText()).trim();
  }

  /** True when the login form is still showing (i.e. user did not get past login). */
  async isLoginFormVisible() {
    return this.loginButton.isVisible();
  }
}

module.exports = { LoginPage };
