const { waitForUrlContaining, waitForVisible } = require('../support/waits');
const { BasePage } = require('./BasePage');

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class ProductsPage extends BasePage {
  get pageTitle() {
    return this.page.getByTestId('title');
  }
  get cartLink() {
    return this.page.getByTestId('shopping-cart-link');
  }
  get cartBadge() {
    return this.page.getByTestId('shopping-cart-badge');
  }

  async waitUntilLoaded() {
    await waitForUrlContaining(this.page, '/inventory.html');
    await waitForVisible(this.pageTitle);
  }

  async isLoaded() {
    return this.pageTitle.isVisible();
  }

  async getTitleText() {
    return (await this.pageTitle.innerText()).trim();
  }

  // ---------------------------------------------------------------------------
  // LOCATOR STRATEGY: adding "Sauce Labs Backpack" (see README for the full write-up)
  // ---------------------------------------------------------------------------

  /**
   * PRIMARY (robust): find the product CARD by its visible NAME, then find the
   * "Add to cart" button INSIDE that card by its accessible role + name.
   * - No index, no long XPath, no hard-coded product id.
   * - Works for any product name passed in, so it is reusable.
   * - Survives re-ordering/sorting of products and added/removed products.
   */
  productCard(productName) {
    const exactName = new RegExp(`^${escapeRegExp(productName)}$`);
    return this.page
      .getByTestId('inventory-item')
      .filter({ has: this.page.getByTestId('inventory-item-name').filter({ hasText: exactName }) });
  }

  addButtonInCard(productName) {
    return this.productCard(productName).getByRole('button', { name: /add to cart/i });
  }

  /**
   * FALLBACK (acceptable, less ideal): SauceDemo builds each button's data-test
   * from the product name ("add-to-cart-sauce-labs-backpack"). Direct and fast,
   * but it depends on that naming convention staying the same.
   */
  addButtonByDataTest(productName) {
    const slug = productName.toLowerCase().trim().replace(/\s+/g, '-');
    return this.page.getByTestId(`add-to-cart-${slug}`);
  }

  async addToCart(productName) {
    await this.addButtonInCard(productName).click(); // primary strategy
  }

  async addToCartUsingFallback(productName) {
    await this.addButtonByDataTest(productName).click(); // fallback strategy
  }

  async isRemoveButtonVisibleFor(productName) {
    return this.productCard(productName).getByRole('button', { name: /remove/i }).isVisible();
  }

  /** Returns the badge count, or 0 when the badge is not shown (empty cart). */
  async getCartBadgeCount() {
    if (!(await this.cartBadge.isVisible())) return 0;
    return Number((await this.cartBadge.innerText()).trim());
  }

  /** Waits until the badge shows the expected count (it updates after the click). */
  async waitForCartBadgeCount(expected) {
    await this.cartBadge
      .filter({ hasText: new RegExp(`^${expected}$`) })
      .waitFor({ state: 'visible' });
  }

  async openCart() {
    await this.cartLink.click();
  }
}

module.exports = { ProductsPage };
