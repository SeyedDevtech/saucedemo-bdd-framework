// Cucumber runner configuration.
// Load the JavaScript support code and step definitions directly.
module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['support/**/*.js', 'steps/**/*.js'],
    format: [
      'progress-bar',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json',
    ],
    // Retry a failed scenario once in CI to absorb rare network blips.
    // Set to 0 locally so real failures are never hidden.
    retry: process.env.CI ? 1 : 0,
    publishQuiet: true,
  },
};
