/*
  Sample data used only when the real API endpoint (config.apiEndpoint) is
  unreachable, e.g. while testing this package on a laptop before the
  backend sync service exists. Replace/remove once the real API is live.

  Shape matches what the app expects back from GET {apiEndpoint}:
  [{ "room": "Rm 1", "tokens": ["A-101", "A-104", ...] }, ...]
*/
window.MOCK_ROOMS = (function () {
  var counts = [3, 5, 12, 1, 17, 10, 0, 2, 6, 23, 4, 11, 8, 15, 2, 9];
  return counts.map(function (count, i) {
    var tokens = [];
    for (var j = 0; j < count; j++) {
      tokens.push("A-" + (100 + i * 5 + j));
    }
    return { room: "Rm " + (i + 1), tokens: tokens };
  });
})();
