const { Given, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const checkoutData = require('../testdata/checkout.json');
const users = require('../testdata/users.json');

// Steps contain NO selectors. They call page-object methods and assert on the results.
// Note: use `function () {}` (not arrow functions) so Cucumber can bind `this` to the World.

Given('I login as a standard user', async function () {
  await this.loginPage.goto();
  await this.loginPage.login(users.standard.username, users.standard.password);
});

Given('I attempt login with invalid credentials', async function () {
  await this.loginPage.goto();
  await this.loginPage.login(users.invalid.username, users.invalid.password);
});

Then('I should see an authentication error message', async function () {
  const text = await this.loginPage.getErrorText();
  assert.ok(
    text.includes(checkoutData.messages.invalidLogin),
    `Expected error to contain "${checkoutData.messages.invalidLogin}" but got "${text}"`,
  );
});

Then('I should remain on the login page', async function () {
  assert.ok(await this.loginPage.isLoginFormVisible(), 'Login form should still be visible');
  const url = new URL(this.loginPage.currentUrl());
  assert.strictEqual(url.pathname, '/', `Expected to stay on "/" but was on "${url.pathname}"`);
});
