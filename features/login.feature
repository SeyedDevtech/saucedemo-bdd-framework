@login
Feature: Login
  As a shopper
  I want to be told when my credentials are wrong
  So that I know I have not been signed in

  @smoke @negative
  Scenario: Invalid login shows error
    Given I attempt login with invalid credentials
    Then I should see an authentication error message
    And I should remain on the login page
