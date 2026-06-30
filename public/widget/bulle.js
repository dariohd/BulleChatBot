(function () {
  "use strict";

  var origin =
    document.currentScript ||
    document.querySelector('script[data-site-key][src*="bulle"]');
  if (!origin || origin.getAttribute("data-bulle-boot")) return;

  var widgetBase = (function () {
    try {
      var parsed = new URL(origin.src);
      return parsed.origin + parsed.pathname.replace(/\/[^/]+$/, "");
    } catch (e) {
      return "https://bulle-chatbot.vercel.app/widget";
    }
  })();

  function inject(file, version) {
    origin.setAttribute("data-bulle-boot", "1");
    var node = document.createElement("script");
    node.src =
      widgetBase + "/" + file + "?v=" + encodeURIComponent(version);
    node.defer = true;
    Array.prototype.forEach.call(origin.attributes, function (attr) {
      if (attr.name === "src" || attr.name === "data-bulle-boot") return;
      node.setAttribute(attr.name, attr.value);
    });
    origin.parentNode.insertBefore(node, origin.nextSibling);
  }

  fetch(widgetBase + "/manifest.json", { cache: "no-store" })
    .then(function (res) {
      return res.ok ? res.json() : null;
    })
    .then(function (manifest) {
      if (manifest && manifest.file && manifest.version) {
        inject(manifest.file, manifest.version);
        return;
      }
      throw new Error("manifest invalid");
    })
    .catch(function () {
      inject("bulle.v031.js", "0.3.1");
    });
})();
