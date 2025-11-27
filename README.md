# 🚀 火山引擎APM性能数据批量导出工具

一个功能强大的Tampermonkey用户脚本，用于从火山引擎控制台批量获取APM性能数据并导出为CSV文件。

## ✨ 功能特性

- ✅ **自动认证**: 自动获取当前登录状态的Cookie和CSRF Token
- ✅ **批量导出**: 支持配置多个AppID，依次发起API请求
- ✅ **灵活时间**: 支持预设时间范围（7天、30天、90天）和自定义时间区间
- ✅ **CSV导出**: 自动将数据转换为CSV格式并下载
- ✅ **应用映射**: 在CSV中添加应用名称映射列
- ✅ **进度显示**: 实时显示导出进度和日志
- ✅ **错误处理**: 完善的错误处理和重试机制
- ✅ **友好界面**: 现代化UI设计，非技术人员也能轻松使用

## 📦 安装步骤

### 1. 安装Tampermonkey

首先需要在浏览器中安装Tampermonkey扩展：

- **Chrome**: [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- **Edge**: [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
- **Firefox**: [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/)
- **Safari**: [Safari Extensions](https://www.tampermonkey.net/?browser=safari)

### 2. 安装脚本

1. 点击Tampermonkey图标
2. 选择"添加新脚本"
3. 将 `volcano-apm-exporter.user.js` 文件中的全部内容复制粘贴到编辑器中
4. 按 `Ctrl+S` (或 `Cmd+S`) 保存

### 3. 访问火山引擎控制台

打开 [火山引擎控制台](https://console.volcengine.com/) 并登录您的账号。

## 🎯 使用说明

### 基础使用流程

1. **打开工具面板**
   - 登录火山引擎控制台后，页面右上方会出现"📊 APM数据导出"按钮
   - 点击按钮打开配置面板

2. **配置应用ID**
   ```
   appid_001
   appid_002
   appid_003
   ```
   在"应用ID列表"文本框中输入需要导出的应用ID，每行一个

3. **配置应用名称映射**（可选但推荐）
   ```json
   {
     "appid_001": "主站Web应用",
     "appid_002": "移动端H5应用",
     "appid_003": "管理后台"
   }
   ```
   使用JSON格式配置应用ID与应用名称的映射关系

4. **选择时间范围**
   - 最近7天
   - 最近30天
   - 最近90天
   - 自定义时间（需选择开始和结束日期）

5. **设置请求间隔**
   - 默认1000毫秒（1秒）
   - 建议不要低于500毫秒，避免请求过于频繁

6. **开始导出**
   - 点击"开始批量导出"按钮
   - 工具会自动：
     - 验证登录状态
     - 依次请求每个应用的数据
     - 转换数据为CSV格式
     - 自动下载CSV文件
     - 显示实时进度和日志

### 配置说明

#### 应用ID列表格式
```
appid_001
appid_002
appid_003
```
- 每行一个应用ID
- 自动过滤空行
- 支持任意数量的应用ID

#### 应用名称映射格式
```json
{
  "appid_001": "应用名称A",
  "appid_002": "应用名称B",
  "appid_003": "应用名称C"
}
```
- 标准JSON格式
- Key为应用ID，Value为应用名称
- 如果某个应用ID没有配置名称，将使用应用ID作为名称

#### 时间范围选项

| 选项 | 说明 | 时间跨度 |
|------|------|----------|
| 最近7天 | 从今天往前推7天 | 7天 |
| 最近30天 | 从今天往前推30天 | 30天 |
| 最近90天 | 从今天往前推90天 | 90天 |
| 自定义时间 | 手动选择开始和结束日期 | 自定义 |

## 📊 导出数据说明

### CSV文件格式

导出的CSV文件包含以下列：

| 列名 | 说明 |
|------|------|
| 应用ID | 应用的唯一标识符 |
| 应用名称 | 应用的显示名称（来自映射配置） |
| pid | 页面ID |
| FCP(ms) | First Contentful Paint - 首次内容绘制时间 |
| LCP(ms) | Largest Contentful Paint - 最大内容绘制时间 |
| FID(ms) | First Input Delay - 首次输入延迟 |
| CLS | Cumulative Layout Shift - 累积布局偏移 |
| TTFB(ms) | Time to First Byte - 首字节时间 |
| PV | Page View - 页面浏览量 |

### 文件命名规则

```
{应用名称}_性能数据_{时间范围}_{开始日期}_{结束日期}.csv
```

示例：
```
主站Web应用_性能数据_最近30天_2024-01-01_2024-01-31.csv
```

## 🔧 高级配置

### 修改API请求体

如果需要自定义API请求的指标，可以修改脚本中的 `buildRequestBody` 函数：

```javascript
function buildRequestBody(startTime, endTime) {
    return {
        graph: {
            type: "table",
            metrics: [
                // 在这里添加或修改指标
                {
                    aggregation: "avg",
                    field: "web_vitals_fcp",
                    alias: "FCP(ms)"
                },
                // ... 更多指标
            ],
            dimensions: ["pid"],
            orders: [
                {
                    field: "PV",
                    order: "desc"
                }
            ],
            limit: 1000,  // 修改返回数据行数限制
            offset: 0
        },
        // ... 其他配置
    };
}
```

### 修改默认应用映射

在脚本开头的 `DEFAULT_APP_MAPPING` 常量中修改：

```javascript
const DEFAULT_APP_MAPPING = {
    "your_appid_1": "你的应用名称1",
    "your_appid_2": "你的应用名称2",
    // ... 更多映射
};
```

## 🛠️ 故障排查

### 问题：认证信息获取失败

**解决方案**：
1. 确保已登录火山引擎控制台
2. 刷新页面重试
3. 检查浏览器Cookie设置是否正常

### 问题：API请求失败

**可能原因**：
- 网络连接问题
- 应用ID不存在
- 权限不足

**解决方案**：
1. 检查网络连接
2. 验证应用ID是否正确
3. 确保账号有相应应用的访问权限
4. 查看浏览器开发者工具的Network面板获取详细错误信息

### 问题：CSV文件中文乱码

**解决方案**：
- 使用Excel打开时选择UTF-8编码
- 或使用其他支持UTF-8的工具（如VSCode、Google Sheets）

### 问题：请求被限流

**解决方案**：
- 增加请求间隔时间（建议2000ms或更高）
- 减少单次导出的应用数量

## 📝 注意事项

1. **请求频率**：建议请求间隔设置在1000ms以上，避免触发API限流
2. **批量数量**：一次性导出大量应用时可能需要较长时间，请耐心等待
3. **浏览器限制**：某些浏览器可能会限制自动下载，请允许多个文件下载
4. **数据准确性**：导出的数据依赖于火山引擎API返回，请以控制台显示为准
5. **隐私安全**：脚本仅在本地浏览器运行，不会上传任何数据到第三方服务器

## 🔒 安全说明

- ✅ 脚本仅在 `console.volcengine.com` 域名下运行
- ✅ 所有数据处理均在本地浏览器完成
- ✅ 不会收集或上传任何用户数据
- ✅ Cookie和Token仅用于API请求，不会存储或传输到其他地方
- ✅ 开源代码，可自行审查

## 🎨 界面预览

工具提供现代化的用户界面：
- 🎯 渐变色按钮和进度条
- 📊 实时进度显示
- 📝 详细的操作日志
- 🔄 可拖拽的配置面板
- ✨ 流畅的动画效果

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进这个工具！

## 📄 许可证

MIT License

## 🔗 相关链接

- [火山引擎控制台](https://console.volcengine.com/)
- [Tampermonkey官网](https://www.tampermonkey.net/)
- [APM文档](https://www.volcengine.com/docs/6431/69255)

## ✅ 验收清单

- ✅ 能够正确获取登录状态信息
- ✅ 支持批量配置多个AppID
- ✅ 可自定义时间范围参数
- ✅ 成功发起API请求并获取数据
- ✅ 数据正确转换为CSV格式
- ✅ CSV文件包含应用名称映射
- ✅ 支持单个和批量文件下载
- ✅ 提供操作进度反馈
- ✅ 完善的错误处理和重试机制
- ✅ 用户友好的界面设计

## 📞 技术支持

如遇到问题，请：
1. 查看本文档的故障排查部分
2. 检查浏览器控制台的错误信息
3. 提交Issue并附上详细的错误信息

---

**祝使用愉快！** 🎉

