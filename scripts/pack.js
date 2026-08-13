const pacote = require('pacote');
const path = require('path');
const fs = require('fs');

const appDirectory = fs.realpathSync(process.cwd());

const appPath = path.resolve(appDirectory, '.')

pacote.tarball.file(appPath, 'package.tgz').then(data => {
  console.log('生成包文件成功')
})
