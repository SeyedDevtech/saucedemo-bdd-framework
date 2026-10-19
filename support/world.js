const { World, setWorldConstructor } = require('@cucumber/cucumber');
const { CartPage } = require('../pages/CartPage');
const { CheckoutPage } = require('../pages/CheckoutPage');
const { LoginPage } = require('../pages/LoginPage');
const { ProductsPage } = require('../pages/ProductsPage');

/**
 * One World instance is created per scenario. It carries the browser objects and
 * lazily creates page objects, so step files only ever say `this.loginPage.login(...)`.
 */
class CustomWorld extends World {
  constructor(options) {
    super(options);
    this.browser = undefined;
    this.context = undefined;
    this.page = undefined;
    this._loginPage = undefined;
    this._productsPage = undefined;
    this._cartPage = undefined;
    this._checkoutPage = undefined;
  }

  get loginPage() {
    return (this._loginPage ??= new LoginPage(this.page));
  }
  get productsPage() {
    return (this._productsPage ??= new ProductsPage(this.page));
  }
  get cartPage() {
    return (this._cartPage ??= new CartPage(this.page));
  }
  get checkoutPage() {
    return (this._checkoutPage ??= new CheckoutPage(this.page));
  }
}

setWorldConstructor(CustomWorld);

module.exports = { CustomWorld };
