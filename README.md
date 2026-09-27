# 诗境 · 全唐诗意象图谱

古典水墨意境，现代交互。基于训练营提供的《全唐诗》正文，以 Python 预处理数据，以 D3 **5.16.0** 绘制联动柱状图。

[在线访问](https://yukiasunaaa.github.io/shijing-tang-poetry/)

- 四时、花木、山水、天象、色彩五组意象。
- 出现次数 / 涉及篇目、升降序排序、CSV 下载。
- 点击意象阅读原文诗句、切换选读篇目、展开全诗。
- 原创水墨画背景、场景过渡、花瓣/雨雪/水纹动态。
- 移动端适配、键盘操作、减弱动态偏好、手动暂停、加载失败重试。

## 本地运行

```sh
npm ci
npm run dev
```

## 生产构建

```sh
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
npm run build
```

`dist/` 可部署至任何静态托管。项目使用相对资源路径，兼容 GitHub Pages 仓库子路径。`.github/workflows/pages.yml` 在 main 更新时自动构建并部署；仓库 Settings → Pages 选择 GitHub Actions。

## 数据复现

```sh
python3 scripts/build_data.py /path/to/全唐诗.txt
```

统计仅使用原文件正文，排除目录、卷号、诗题、作者及括注。按源文件篇目边界处理，组诗不拆分。出现次数为单字字面频次；涉及篇目统计包含该字的记录数。各分类可能有语义歧义，例如“白”不一定表示颜色，“荷”不一定表示莲荷；本项目不将字面频次宣称为经过人工标注的语义结果。

源文件存在空篇目、无标题篇目和粘连的标题；解析器以卷号记录标记划分边界。没有标题/作者时明确标为原文未题/未署名，不推断出处。页面每字最多选择 30 条原诗供阅读，统计仍覆盖所有有效记录。`public/data/poetry.json` 记录源文件 SHA-256，以供核对。原始训练营文件不随网站分发。

## 检查

`npm test` 校验全部展示诗句与意象匹配、数据引用完整性。Python 单测覆盖异常篇目边界。`node tests/browser.mjs` 用 Playwright 检查桌面与手机交互，并保存本地截图；可设置 `CHROMIUM_PATH` 指定测试浏览器。

`node tests/transition.test.mjs` 自动启动并关闭测试服务器，验证分类切换期间退出的柱形不会误触发旧选项。`node tests/published.mjs` 检查已发布的 HTTPS 网站，可用 `TEST_URL` 和 `TEST_PROXY` 指定地址及网络代理。

## 素材与依赖

水墨画使用内置 ImageGen 生成，原始提示词见 `public/assets/PROVENANCE.md`。Noto Serif SC 随网站托管，字体授权见 `public/assets/FONT-LICENSE.txt`。图标为 Lucide。为保留作业规定的 D3 v5 同时修复其旧版颜色解析依赖，`d3-color` 固定覆盖为 3.1.0。
