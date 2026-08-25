import fs from "fs";
import path from "path";
import zlib from "zlib";
import { pathToFileURL } from "url";

// CRC-32 查表实现（Node 内置模块未提供，需自行实现）
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)) >>> 0;
  }
  return (c ^ 0xffffffff) >>> 0;
};

// 时间戳转为 ZIP 使用的 DOS 日期/时间格式
const toDosDateTime = (d) => {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
};

// 将目录递归打包为 zip，仅使用 Node 内置模块（zlib + 手工构造 ZIP 结构）
export const packDirectoryToZip = (dirPath) => {
  const files = [];
  const walk = (dir, prefix) => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, item.name);
      const zipPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.isDirectory()) {
        walk(fullPath, zipPath);
      } else if (item.isFile()) {
        files.push({ zipPath, fullPath });
      }
    }
  };
  walk(dirPath, "");

  const chunks = []; // 各文件的 local header + 压缩数据
  const central = []; // 中央目录记录
  let offset = 0;

  for (const { zipPath, fullPath } of files) {
    const stat = fs.statSync(fullPath);
    const data = fs.readFileSync(fullPath);
    const compressed = zlib.deflateRawSync(data);
    const crc = crc32(data);
    const { time, date } = toDosDateTime(stat.mtime);

    // 文件名按 UTF-8 写入，并置位 EFS 标志 (bit 11)
    const nameBuf = Buffer.from(zipPath, "utf-8");

    // 本地文件头
    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
    local.writeUInt16LE(20, 4); // 需要的解压版本
    local.writeUInt16LE(0x0800, 6); // 通用标志: 文件名 UTF-8
    local.writeUInt16LE(8, 8); // 压缩方式: deflate
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra 长度
    nameBuf.copy(local, 30);

    chunks.push(local, compressed);
    offset += local.length + compressed.length;

    // 中央目录记录
    const centralRec = Buffer.alloc(46 + nameBuf.length);
    centralRec.writeUInt32LE(0x02014b50, 0); // PK\x01\x02
    centralRec.writeUInt16LE((3 << 8) | 20, 4); // 版本由 Unix 创建
    centralRec.writeUInt16LE(20, 6); // 需要的解压版本
    centralRec.writeUInt16LE(0x0800, 8); // 通用标志
    centralRec.writeUInt16LE(8, 10); // deflate
    centralRec.writeUInt16LE(time, 12);
    centralRec.writeUInt16LE(date, 14);
    centralRec.writeUInt32LE(crc, 16);
    centralRec.writeUInt32LE(compressed.length, 20);
    centralRec.writeUInt32LE(data.length, 24);
    centralRec.writeUInt16LE(nameBuf.length, 28);
    centralRec.writeUInt16LE(0, 30); // extra 长度
    centralRec.writeUInt16LE(0, 32); // 注释长度
    centralRec.writeUInt16LE(0, 34); // 起始磁盘号
    centralRec.writeUInt16LE(0, 36); // 内部属性
    centralRec.writeUInt32LE((stat.mode & 0o777) << 16, 38); // 外部属性: unix 权限
    centralRec.writeUInt32LE(offset - local.length - compressed.length, 42); // local header 偏移
    nameBuf.copy(centralRec, 46);

    central.push(centralRec);
  }

  const centralSize = central.reduce((sum, buf) => sum + buf.length, 0);

  // 中央目录结尾记录 (EOCD)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // PK\x05\x06
  eocd.writeUInt16LE(0, 4); // 当前磁盘号
  eocd.writeUInt16LE(0, 6); // 中央目录起始磁盘号
  eocd.writeUInt16LE(central.length, 8); // 本磁盘中央目录记录数
  eocd.writeUInt16LE(central.length, 10); // 中央目录记录总数
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20); // 注释长度

  return Buffer.concat([...chunks, ...central, eocd]);
};

// 仅当直接运行本脚本（node scripts/pack.js）时才执行打包；
// 被其他包 import（如 deploy.js）时不会触发
const isMain =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) {
  const appDirectory = fs.realpathSync(process.cwd());
  const packageJson = JSON.parse(fs.readFileSync(appDirectory + "/package.json", "utf-8"));

  const packageName = packageJson.name.replace("/", "_");
  const fileName = `${packageName}_v${packageJson.version}.zip`;

  const data = packDirectoryToZip(appDirectory + "/dist");
  fs.writeFileSync(appDirectory + "/" + fileName, data);
  console.log(`生成包文件成功: ${fileName}`);
}
