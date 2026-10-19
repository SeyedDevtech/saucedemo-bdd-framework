const { Then, When } = require('@cucumber/cucumber');
const assert = require('assert');
const checkoutData = require('../testdata/checkout.json');

// Steps contain NO selectors. They call page-object methods and assert on the results.
// Note: use `function () {}` (not arrow functions) so Cucumber can bind `this` to the World.

Then('I should see the products page', async function () {
  await this.productsPage.waitUntilLoaded();
  assert.strictEqual(await this.productsPage.getTitleText(), 'Products');
});

When('I add {string} to the cart', async function (productName) {
  await this.productsPage.addToCart(productName);
});

Then('the cart badge should show {int}', async function (expected) {
  await this.productsPage.waitForCartBadgeCount(expected);
  assert.strictEqual(await this.productsPage.getCartBadgeCount(), expected);
});

When('I open the cart', async function () {
  await this.productsPage.openCart();
  await this.cartPage.waitUntilLoaded();
});

Then('the cart should contain {string}', async function (productName) {
  const items = await this.cartPage.getItemNames();
  assert.ok(items.includes(productName), `Cart items were [${items.join(', ')}]`);
});

When('I checkout with valid customer details', async function () {
  await this.cartPage.proceedToCheckout();
  await this.checkoutPage.fillCustomerDetails(checkoutData.valid);
  await this.checkoutPage.finishOrder();
});

Then('I should see the order confirmation page', async function () {
  await this.checkoutPage.waitForOrderComplete();
  assert.strictEqual(
    await this.checkoutPage.getCompleteHeaderText(),
    checkoutData.messages.orderComplete,
  );
});
