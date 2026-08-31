import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const extensionRoot = fileURLToPath(new URL("./", import.meta.url));
const productionApiOrigin = "https://effervescent-toucan-379.convex.site";
const shippedFiles = ["background.js", "popup.js", "manifest.json"];

for (const file of shippedFiles) {
  const source = readFileSync(`${extensionRoot}${file}`, "utf8");
  assert.equal(
    source.includes("quirky-partridge-485"),
    false,
    `${file} still points at the old Convex deployment`,
  );
}

assert.match(readFileSync(`${extensionRoot}background.js`, "utf8"), new RegExp(productionApiOrigin.replaceAll(".", "\\.")));
assert.match(readFileSync(`${extensionRoot}popup.js`, "utf8"), new RegExp(productionApiOrigin.replaceAll(".", "\\.")));
assert.ok(JSON.parse(readFileSync(`${extensionRoot}manifest.json`, "utf8")).host_permissions.includes(`${productionApiOrigin}/*`));

console.log("Extension production configuration points to", productionApiOrigin);
