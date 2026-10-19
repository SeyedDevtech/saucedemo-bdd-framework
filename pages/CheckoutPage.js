const { waitForUrlContaining, waitForVisible } = require('../support/waits');
const { BasePage } = require('./BasePage');

class CheckoutPage extends BasePage {
  // Step one: customer information
  get firstNameInput() {
    return this.page.getByTestId('firstName');
  }
  get lastNameInput() {
    return this.page.getByTestId('lastName');
  }
  get postalCodeInput() {
    return this.page.getByTestId('postalCode');
  }
  get continueButton() {
    return this.page.getByTestId('continue');
  }
  // Step two: overview
  get finishButton() {
    return this.page.getByTestId('finish');
  }
  // Complete page
  get completeHeader() {
    return this.page.getByTestId('complete-header');
  }

  /** @param {{firstName: string, lastName: string, postalCode: string}} details */
  async fillCustomerDetails(details) {
    await waitForUrlContaining(this.page, '/checkout-step-one.html');
    await this.firstNameInput.fill(details.firstName);
    await this.lastNameInput.fill(details.lastName);
    await this.postalCodeInput.fill(details.postalCode);
    await this.continueButton.click();
  }

  async finishOrder() {
    await waitForUrlContaining(this.page, '/checkout-step-two.html');
    await this.finishButton.click();
  }

  async waitForOrderComplete() {
    await waitForUrlContaining(this.page, '/checkout-complete.html');
    await waitForVisible(this.completeHeader);
  }

  async getCompleteHeaderText() {
    return (await this.completeHeader.innerText()).trim();
  }
}

module.exports = { CheckoutPage };
