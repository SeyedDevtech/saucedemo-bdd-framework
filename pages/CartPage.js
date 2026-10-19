const { waitForUrlContaining, waitForVisible } = require('../support/waits');
const { BasePage } = require('./BasePage');

class CartPage extends BasePage {
  get checkoutButton() {
    return this.page.getByTestId('checkout');
  }
  get itemNames() {
    return this.page.getByTestId('inventory-item-name');
  }

  async waitUntilLoaded() {
    await waitForUrlContaining(this.page, '/cart.html');
    await waitForVisible(this.checkoutButton);
  }

  async getItemNames() {
    return (await this.itemNames.allInnerTexts()).map((text) => text.trim());
  }

  async proceedToCheckout() {
    await this.checkoutButton.click();
  }
}

module.exports = { CartPage };
