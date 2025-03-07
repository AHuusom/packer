const fs = require("fs");
const path = require("path");
const fetchPluginDocs = require("../../website/components/remote-plugin-docs/utils/fetch-plugin-docs");

const COLOR_RESET = "\x1b[0m";
const COLOR_GREEN = "\x1b[32m";
const COLOR_BLUE = "\x1b[34m";
const COLOR_RED = "\x1b[31m";

async function checkPluginDocs() {
  const failureMessages = [];
  const pluginsPath = "website/data/docs-remote-plugins.json";
  const pluginsFile = fs.readFileSync(path.join(process.cwd(), pluginsPath));
  const pluginEntries = JSON.parse(pluginsFile);
  const entriesCount = pluginEntries.length;
  console.log(`\nResolving plugin docs from ${entriesCount} repositories …`);
  for (var i = 0; i < entriesCount; i++) {
    const pluginEntry = pluginEntries[i];
    const { title, repo, version } = pluginEntry;
    console.log(`\n${COLOR_BLUE}${repo}${COLOR_RESET} | ${title}`);
    console.log(`Fetching docs from release "${version}" …`);
    try {
      const undefinedProps = ["title", "repo", "version", "path"].filter(
        (key) => typeof pluginEntry[key] == "undefined"
      );
      if (undefinedProps.length > 0) {
        throw new Error(
          `Failed to validate plugin docs config. Undefined configuration properties ${JSON.stringify(
            undefinedProps
          )} found for "${
            title || pluginEntry.path || repo
          }". In "website/data/docs-remote-plugins.json", please ensure the missing properties ${JSON.stringify(
            undefinedProps
          )} are defined. Additional information on this configuration can be found in "website/README.md".`
        );
      }
      const docsMdxFiles = await fetchPluginDocs({ repo, tag: version });
      const mdxFilesByComponent = docsMdxFiles.reduce((acc, mdxFile) => {
        const componentType = mdxFile.filePath.split("/")[1];
        if (!acc[componentType]) acc[componentType] = [];
        acc[componentType].push(mdxFile);
        return acc;
      }, {});
      console.log(`${COLOR_GREEN}Found valid docs:${COLOR_RESET}`);
      Object.keys(mdxFilesByComponent).forEach((component) => {
        const componentFiles = mdxFilesByComponent[component];
        console.log(`  ${component}`);
        componentFiles.forEach(({ filePath }) => {
          const pathFromComponent = filePath.split("/").slice(2).join("/");
          console.log(`  ├── ${pathFromComponent}`);
        });
      });
    } catch (err) {
      console.log(`${COLOR_RED}${err}${COLOR_RESET}`);
      failureMessages.push(`\n${COLOR_RED}× ${repo}: ${COLOR_RESET}${err}`);
    }
  }

  if (failureMessages.length === 0) {
    console.log(
      `\n---\n\n${COLOR_GREEN}Summary: Successfully resolved all plugin docs.`
    );
    pluginEntries.forEach((e) =>
      console.log(`${COLOR_GREEN}✓ ${e.repo}${COLOR_RESET}`)
    );
    console.log("");
  } else {
    console.log(
      `\n---\n\n${COLOR_RED}Summary: Failed to fetch docs for ${failureMessages.length} plugin(s):`
    );
    failureMessages.forEach((err) => console.log(err));
    console.log("");
    process.exit(1);
  }
}

checkPluginDocs();
