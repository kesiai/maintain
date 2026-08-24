import chalk from "chalk";
import inquirer from "inquirer";
import pacote from "pacote";
import Arborist from '@npmcli/arborist';
import os from "os";
import fs from "fs";
import fetch from "node-fetch";
import FormData from "form-data";

const appDirectory = fs.realpathSync(process.cwd());
const jsonData = fs.readFileSync(appDirectory + '/package.json', 'utf-8');
const packageJson = JSON.parse(jsonData);

const envs = process.env;
const args = process.argv;
let packageName = packageJson.name;
const developOpsConfig = {};

const getOption = (name, envName) => {
  let value;
  const optionArgs = args.filter((arg) => arg.startsWith(`--${name}=`));
  if (optionArgs.length != 0) {
    value = optionArgs[0].replace(`--${name}=`, "");
  } else if (developOpsConfig && developOpsConfig[name]) {
    value = developOpsConfig[name];
  } else if (envs[envName]) {
    value = envs[envName];
  }

  if (value && value.endsWith("/")) {
    value = value.substring(0, value.length - 1);
  }

  return value;
};

const questions = [];
const forceQuestion = args.filter((arg) => arg.startsWith("-f")).length != 0;
const options = {
  host: getOption("ophost", "IOT_OPHOST"),
  username: getOption("username", "IOT_OP_USER"),
  password: getOption("password", "IOT_OP_PASSWORD"),
  branch: getOption("branch", "IOT_BRANCH"),
};

if (forceQuestion || !options.host) {
  questions.push({ name: "host", message: "[iot] 运维网址:" });
}
if (forceQuestion || !options.username) {
  questions.push({ name: "username", message: "[iot] 管理员用户:" });
}
if (forceQuestion || !options.password) {
  questions.push({ name: "password", message: "[iot] 管理员密码:", type: "password" });
}
if (forceQuestion || !options.branch) {
  questions.push({ name: "branch", message: "[iot] 部署版本(可跳过):" });
}

inquirer
  .prompt(questions)
  .then(async (answers) => {
    let host = answers.host || options.host;
    let username = answers.username || options.username;
    let password = answers.password || options.password;

    console.log(chalk.yellow("[iot:install] 请确认以下参数:"));
    console.log(chalk.yellow(`  host: ${host || "(未提供)"}`));
    console.log(chalk.yellow(`  username: ${username || "(未提供)"}`));
    console.log(chalk.yellow(`  password: ${password ? "********" : "(未提供)"}`));

    const { confirmProceed } = await inquirer.prompt([
      {
        name: "confirmProceed",
        type: "confirm",
        message: "确认以上参数并继续安装吗？",
        default: true,
      },
    ]);

    if (!confirmProceed) {
      console.log(chalk.red("[iot:install] 操作已取消"));
      return;
    }

    host = host.endsWith("/") ? host : host + "/";

    try {
      // get user token from environment
      const res = await fetch(host + "api/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
        headers: { "Content-Type": "application/json", "Request-Type": "service" },
      });

      if (res.status != 200) {
        throw new Error(await res.text());
      }

      const json = await res.json();
      if (!json.accessToken) {
        throw new Error(json);
      }
      const token = `Bearer ${json.accessToken}`;

      const data = await pacote.tarball("file:" + appDirectory, { Arborist });

      const form = new FormData();

      const fileKey = Math.ceil(Math.random() * 10000);
      const fileName = os.tmpdir() + "/package_" + fileKey + ".tgz";
      fs.writeFileSync(fileName, data);

      form.append("file", fs.createReadStream(fileName));

      console.log(chalk.yellow("[iot:install] 上传中 ...... "));

      const installRes = await fetch(host + "api/front/installOperation", {
        method: "POST",
        body: form,
        headers: { ...form.getHeaders(), Authorization: token, "Request-Type": "service" },
      });

      if (installRes.status != 200) {
        const text = await installRes.text();
        console.log(chalk.red("[iot:install] 接口错误" + "\n" + text));
      } else {
        console.log(chalk.green("[iot:install] " + `成功安装 ${packageName} 到 ${host}`));
      }
    } catch (err) {
      console.error(chalk.red("\n" + err.toString()));
    }
  })
  .catch((err) => {
    console.error(chalk.red("[iot:install] 用户验证失败" + "\n" + err.toString()));
  });
