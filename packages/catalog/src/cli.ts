import { generateCatalog, validateCatalog } from "./index.js";

const command = process.argv[2];

try {
  if (command === "validate") {
    const tools = await validateCatalog();
    console.log(`Validated ${tools.length} tool(s).`);
  } else if (command === "generate") {
    await generateCatalog();
    console.log("Generated generated/catalog.json.");
  } else {
    throw new Error("Usage: tsx src/cli.ts <validate|generate>");
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
