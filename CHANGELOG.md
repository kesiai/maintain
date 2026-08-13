## 1.1.5 (2024-08-13)


### Bug Fixes

* 解决跳转注册页问题 0a08f9e

## 1.1.4 (2024-07-22)


### Performance Improvements

* 官网地址改为  airiot.tech 35692c1

## 1.1.3 (2024-07-15)


### Bug Fixes

* 运维打包 c3571b6

## 1.1.2 (2024-07-12)


### Bug Fixes

* 日志服务判断linux和windows 121a5f2


### Performance Improvements

* 修复已知bug bbb227b

## 1.1.1 (2024-07-03)


### Bug Fixes

* 运维日志接口地址修改 243ab31

# 1.1.0 (2024-07-03)


### Bug Fixes

* 发版运维日志 a636fb2
* 暂无数据图标修改 a784b20
* 解决已知BUG f90021d


### Features

* 新增服务诊断、pm2日志、运维日志及一些bug修复 d6af8fb
* 新增服务诊断及运维、pm2日止 239e76d


### Performance Improvements

* win增加创建启动按钮 8770c77
* 增加操作日志 255e982
* 部署文件整理格式为yaml的格式 8c12864
* 部署文件格式化修改 359be84

## 1.0.16 (2024-05-16)


### Bug Fixes

* 解决已知BUG 3f9afda


### Performance Improvements

* 增加操作日志 8ac9419

## 1.0.15 (2024-03-29)


### Bug Fixes

* 解决已知BUG 172fb52

## 1.0.14 (2024-03-29)


### Bug Fixes

* 解决已知问题 a3090f3

## 1.0.13 (2024-03-29)


### Bug Fixes

* 解决已知BUG 33fdb59
* 解决已知问题 ce65d16
* 解决已知问题 1f53db3
* 解决已知问题 a801fc4

## 1.0.12 (2024-03-20)


### Bug Fixes

* 解决服务批量升级，没有包问题 1cee765


### Performance Improvements

* 一键升级功能调整，解决版本依赖显示问题 2fe557d

## 1.0.11 (2024-03-04)


### Bug Fixes

* 资源统计样式修改 dec6242


### Performance Improvements

* 增加一键在线升级，批量升级按钮 05314fc

## 1.0.10 (2024-01-23)


### Bug Fixes

* 解决包版本依赖问题，登陆密码增加查看 292f1ed
* 资源管理 5ad7399


### Performance Improvements

* 加loading 083313a
* 在线升级成功只刷新当条数据 38fd2de
* 服务修改，运营命令字段改为数组 1b37a83

## 1.0.9 (2023-10-20)


### Performance Improvements

* 增加更新运维项目，在线和离线 6d93b0d

## 1.0.8 (2023-10-18)


### Performance Improvements

* 服务管理日志，默认滚动到最下方 c17d986

## 1.0.7 (2023-10-08)


### Performance Improvements

* 登陆提示文字调整，历史版本跳转调整 5403d95

## 1.0.6 (2023-09-27)


### Performance Improvements

* 自动发布 4a0aa33

## 1.0.5 (2023-09-25)


### Performance Improvements

* 自动打包 8712a4f

## 1.0.4 (2023-09-25)


### Performance Improvements

* 自动发布 e8b14f8
* 自动发布 da196e9
* 自动发版 511cf03
* 自动打包 f8da783
* 自动打包 fb0424d
* 自动打包 0473b8c
* 自动打包 5727b84
* 自动打包 6d68d80
* 自动打包 76d5d17
* 自动打包 fda3ae0

## 1.0.3 (2023-09-25)


### Performance Improvements

* 自动发版 95bfeee

## 1.0.2 (2023-09-25)


### Performance Improvements

* 自动打包 c515902

## 1.0.1 (2023-09-25)


### Bug Fixes

* apps引用错误修改 6aaa249
* 修改历史版本按钮跳转的官网地址 78da727
* 修改域名 4f59d3b
* 最新版本信息过长隐藏，上传镜像提到列表页   [#3449](https://git.airiot.tech/core/front/iot-maintain/issues/3449) 32e45b0
* 去除airiot 5d6cdab
* 服务高级添加上传镜像，修改接口地址 ae1bc96
* 校验错误后输入失去焦点问题 cc395ba
* 解决接口地址问题，服务安装问题 2660d30
* 解决服务在线添加功能失效问题 410ce23


### Performance Improvements

* linux下新增arm类型 df78f1c
* windows环境下的离线上传驱动 f472eef
* 一键升级 b7db500
* 增加各模块版本依赖 af72470
* 增加离线上传驱动 b16cff4
* 增加部分服务和模块不可删除 47c64d4
* 安装服务页增加名称查询，安装提示汉化 16c759f
* 完全删除3031环境下运维的前端模块 aa38ba5
* 换logo，创建时间排序，模块名搜索 e67747f
* 服务管理，在线添加，搜索优化 bc16a70

# 1.0.0 (2021-08-27)


### Bug Fixes

* 3.0空间版，解决服务删除name问题 2365a0d
* windows下服务管理去掉图表，日志去掉查询条件 8c2eb33
* ws接口地址问题 88c9f32
* ws接口地址问题，日志刷新问题 b520b9b
* 上传接口添加token，删除按钮添加二次确认 f97a167
* 加日志自动刷新，加LOGO，解决模块删除上传失败 0f2bf1f
* 图标跳转首页 41c1199
* 工作表新需求 02e85c2
* 提取linux下服务更新日志的更新版本字段 579c61c
* 服务最新版本字段，改为用repo属性匹配 e48e429
* 服务和模块管理新增前端名称查询 84ba506
* 服务图表加返回，解决服务列表白屏 fa80292
* 服务模块管理最新版本提示信息优化 1fd11e2
* 注册功能开发，解决接口地址问题 9ad4753
* 登陆和注册页居中，每次刷新校验是否注册 1f7829a
* 补充需求开发，解决剩BUG 2e4bd30
* 解决window和linux版切换的问题 f7fac1b
* 解决修改密码页，首页，模块管理报错问题 0e5ba54
* 解决内网打不开注册页面问题 658a8c8
* 解决最新BUG c975645
* 解决最新BUG 802821d
* 解决官网接口返回数据改变，导致白屏问题，及其他若干问题 b94bee6
* 解决开始报错问题 da185f4
* 解决服务模块在线更新问题 5072aa7
* 解决模块管理报错问题 4918764
* 调整优化若干问题 e7facfe
* 调整首页面板图标大小 ead3ae6
* 首页卡片新增跳转，服务管理新增修改 eea9f61


### Features

* 初始化项目 cf2cf4a
* 增加登陆鉴权 edf427e
* 实现api模块 8a17d81
* 开发api模块 57b850b
* 服务管理控制台功能 899f398
* 模块管理上传 e03631f
* 管理员检测/登录/注册/退出/修改密码 6849a74
* 重新初始化项目 7a411ad


### Performance Improvements

* 新需求，增加windows服务器，多类型添加等 f7c25fd
* 服务容器检查 260aeb8
* 模块管理页面更新 8cab892
* 首页 d8ccc9f
