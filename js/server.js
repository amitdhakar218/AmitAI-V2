const fs = require("fs");
const path = require("path");

const storiesFolder = path.join(__dirname, "stories");

const files = fs.readdirSync(storiesFolder);

console.log("📂 Stories Folder:");
console.log(files);

for (const file of files) {
    const filePath = path.join(storiesFolder, file);
    const text = fs.readFileSync(filePath, "utf8");

    console.log("\n==============================");
    console.log("📄 File:", file);
    console.log("==============================");
    console.log(text);
}