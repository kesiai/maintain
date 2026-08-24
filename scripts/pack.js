import pacote from 'pacote';
import fs from 'fs';
import Arborist from '@npmcli/arborist';

const appDirectory = fs.realpathSync(process.cwd());

pacote.tarball.file("file:" + appDirectory, 'package.tgz', { Arborist }).then(data => {
  console.log('生成包文件成功')
})
