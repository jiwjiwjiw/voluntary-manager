// Copies the example VS Code workspace file to its real name if the latter
// does not exist yet. The real file is ignored by git, so every developer
// gets a starting point after `yarn install` and can then customise it.
const fs = require('fs')
const path = require('path')

const root = process.argv[2] || path.join(__dirname, '..')
const example = path.join(root, 'voluntary-manager.code-workspace.example')
const target = path.join(root, 'voluntary-manager.code-workspace')

if (!fs.existsSync(target)) {
  fs.copyFileSync(example, target)
  console.log('Created voluntary-manager.code-workspace from the example file.')
}
