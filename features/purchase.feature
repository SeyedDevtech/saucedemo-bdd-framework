@purchase
Feature: Purchase flow
  As a shopper
  I want to buy a product from the store
  So that I receive an order confirmation

  @smoke @happy-path
  Scenario: Successful purchase of a single product
    Given I login as a standard user
    Then I should see the products page
    When I add "Sauce Labs Backpack" to the cart
    Then the cart badge should show 1
    When I open the cart
    Then the cart should contain "Sauce Labs Backpack"
    When I checkout with valid customer details
    Then I should see the order confirmation page
