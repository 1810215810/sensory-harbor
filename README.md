# 感官地图 · 海港区公共环境观察

给出门前想提前了解感官环境的家庭：看具体区域、观察时段、声音、灯光、人流和可休息的位置。静态站，无需注册、无后端、无分析追踪。网站、数据结构和采集工具已搭建；**示例不是实测，不是出行建议**。

## 运行与发布

- 本地：双击 `index.html` 即可浏览、手填观察和导出。麦克风以目标设备实测为准，建议用 HTTPS 页面测试。离线演示用本地文件，不依赖第三方资源。
- GitHub Pages：设置为从 `main` 分支的根目录部署。所有资源是相对路径，支持 Pages 项目子路径。
- 运行接口检查：`node --test tests/core.test.cjs`（Node.js 22 或以上，无需安装依赖）。

## 后续接入标准、底图和真实点位

1. **定标准：** `data/config.js` 中每个维度的 `criteria` 填入 1–5 的明确观察依据；`policy` 填已确认的版本、最低推荐分 `recommendedMin`、不公开上限 `rejectMax`、允许缺项的数量 `maxMissing` 和不可缺维度列表 `required`，然后将 `state` 改为 `approved`。这是短板评分接口：先排除命中低分的记录，其次查缺项；只有六项齐全且达推荐线才推荐。未批准或缺字段时，只导出待定级记录。若最终改为另一套聚合或采样方式，替换 `assets/core.js` 的 `classify()`，页面与发布脚本共用该函数。
2. **换底图：** 将有权公开使用的图放到 `data/`；配置 `study.publicMap = {src, label, attribution}`，坐标用底图左上为原点的 `[横向百分比, 纵向百分比]`。底图容器目前按 800:540 展示；替换时应保持同一画幅或同步调整 `mapframe` 比例。更新 `study.name` 和 `study.dataLicense`。原型底图仅是自绘示意，不能当作海港区地图。
3. **采集：** 评估表导出的 `kind: sensory-observation` JSON 含 `schemaVersion`、`pointId`、`name`、`type`、`scenario`、`location`、ISO 8601 `observedAt`、`durationMinutes`、`scores`、`evidence`、`toolReadings`、`level`、`policyVersion` 等。未测维度不写入 `scores`，不以 0 代替。同一编号可以记录多个工具观察窗；换一次独立观察前先导出再清空对应工具记录。内部文件应放在仓库外；不要把任何身份信息、原始录音、照片或未公开等级提交到公开仓库。
4. **审核、生成：** 人工复核报告，对照规则版本，选出允许公开且可以追溯的一条记录。工具不会凭观测值自动给分。审核清单放在仓库外，JSON 格式如下，`observation` 相对该清单所在目录：

```json
[{"observation":"raw/HGG-01-observation.json","reviewed":true,"position":[31,45],"finding":"本次看到的情况","advice":"与这次观察对应的具体建议"}]
```

运行 `node scripts/publish-data.cjs <审核清单.json>`；脚本检查规则、版本、坐标、时间与发布资格，并只生成白名单公开字段。草案记录不能直接升级为正式结果：须人工按已定规则复核或重新导出。原型每个点位只公开一条时段明确的记录；多时段展示策略未定前，保留其余记录但不把它们合成一个全时段结论。

5. **验收：** 对上清单、地图与 JSON/CSV 的同一条记录，确认只有已核验且允许发布的数据；之后只把 `data/public.js`、许可与所需资源提交到仓库。候选提名现为浏览器导出文件，由项目组接收、核验；没有自动上传入口。

## 工具接入

`Sensory.attachTool(pointId, toolId, payload)` 可接入后续工具，`Sensory.readTools(pointId)` 返回按类型分组的观察数组。当前工具：`noise`（短时采样 dBFS，与环境声压级不同）、`soundEvents`、`crowd`、`light`（人工自查）。需要上摄像头或校准设备时先定方法、授权和留存范围；不在浏览器里保留原始音频或视频。手机没有权限时，可以全程手工填表。
