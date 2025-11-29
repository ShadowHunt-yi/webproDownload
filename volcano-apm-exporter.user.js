function main() {
  "use strict";

  // ==================== 配置区域 ====================

  // 默认应用ID映射配置
  const DEFAULT_APP_MAPPING = {
    591025: "国内酒店H5",
    602838: "商家系统H5",
    629003: "国内机票H5",
    640325: "网约车",
    640327: "国内火车票H5",
    640328: "国内火车票PC",
    651844: "商家系统PC",
    671354: "表单引擎",
    677896: "用户H5网站",
    678246: "用户网站",
    678248: "平台PC网站",
    680184: "国内机票PC",
    698915: "审批",
    702271: "国际机票H5",
    1000844: "国际机票PC",
  };

  // API配置
  const API_CONFIG = {
    endpoint:
      "https://console.volcengine.com/api/top/apmplus/cn-beijing/2023-01-12/DashboardCustomGraphDraw",
    region: "cn-beijing",
    os: "webpro",
  };

  // 时间范围预设
  const TIME_RANGES = {
    "7days": { label: "最近7天", days: 7 },
    "30days": { label: "最近30天", days: 30 },
    "90days": { label: "最近90天", days: 90 },
    custom: { label: "自定义时间", days: 0 },
  };

  // 数据类型配置
  const DATA_TYPES = {
    page_performance: {
      name: "页面性能",
      requestBody: buildPagePerformanceRequestBody,
      convertToJSON: convertPagePerformanceToJSON,
    },
    api_performance: {
      name: "接口性能",
      requestBody: buildApiPerformanceRequestBody,
      convertToJSON: convertApiPerformanceToJSON,
    },
  };

  // ==================== SheetJS工具函数 ====================

  /**
   * 动态加载SheetJS库
   */
  function loadSheetJS() {
    return new Promise((resolve, reject) => {
      if (window.XLSX) {
        resolve(window.XLSX);
        return;
      }

      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      script.onload = () => {
        console.log("✅ SheetJS库加载成功");
        resolve(window.XLSX);
      };
      script.onerror = () => {
        reject(new Error("❌ SheetJS库加载失败"));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * 创建Excel工作簿
   */
  function createWorkbook() {
    return {
      SheetNames: [],
      Sheets: {},
    };
  }

  /**
   * 将数据转换为工作表格式
   */
  function jsonToSheet(data, options = {}) {
    const {
      precision = {
        TTFB: 2,
        LCP: 2,
        INP: 2,
        CLS: 6,
      },
    } = options;

    if (!data || data.length === 0) {
      return null;
    }

    // 获取所有列名
    const headers = Object.keys(data[0]);

    // 准备工作表数据
    const sheetData = [headers]; // 第一行为表头

    // 添加数据行
    data.forEach((row) => {
      const rowData = headers.map((header) => {
        let value = row[header];

        // 对于已经是字符串的值（包含单位的），直接使用
        // 对于数值，根据列名进行格式化
        if (typeof value === "number") {
          if (header.includes("CLS") || header.includes("累计布局偏移")) {
            value = Number(value.toFixed(precision.CLS || 6));
          } else if (header.includes("TTFB") || header.includes("首字节")) {
            value = Number(value.toFixed(precision.TTFB || 2));
          } else if (
            header.includes("LCP") ||
            header.includes("最大内容绘制")
          ) {
            value = Number(value.toFixed(precision.LCP || 2));
          } else if (
            header.includes("INP") ||
            header.includes("交互到下次绘制")
          ) {
            value = Number(value.toFixed(precision.INP || 2));
          } else {
            value = Number(value.toFixed(2));
          }
        }

        return value;
      });
      sheetData.push(rowData);
    });

    return XLSX.utils.aoa_to_sheet(sheetData);
  }

  /**
   * 下载Excel文件
   */
  function downloadExcel(workbook, filename) {
    // 添加BOM头以支持中文
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
      bookSST: false,
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ==================== 工具函数 ====================

  /**
   * 获取Cookie值
   */
  function getCookie(name) {
    const cookieString = document.cookie;
    const nameEQ = name + "=";
    const cookies = cookieString.split(";");

    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i];
      while (cookie.charAt(0) === " ") {
        cookie = cookie.substring(1);
      }
      if (cookie.indexOf(nameEQ) === 0) {
        const value = cookie.substring(nameEQ.length, cookie.length);
        console.log(`✅ 找到Cookie ${name}:`, value);
        return decodeURIComponent(value);
      }
    }

    console.warn(`❌ 未找到Cookie: ${name}`);
    return null;
  }

  /**
   * 获取CSRF Token
   */
  function getCSRFToken() {
    const metaToken = document.querySelector('meta[name="csrfToken"]');
    console.log(
      metaToken,
      "metaToken",
      document.cookie,
      "document.cookie",
      document
    );

    if (metaToken) return metaToken.getAttribute("content");

    const cookieToken = getCookie("x-csrf-token") || getCookie("csrfToken");
    if (cookieToken) return cookieToken;

    try {
      const stored = localStorage.getItem("x-csrf-token");
      if (stored) return stored;
    } catch (e) {}
    return null;
  }

  /**
   * 计算时间戳
   */
  function calculateTimestamps(rangeType, customStart, customEnd) {
    const now = new Date();
    const endTime = Math.floor(now.getTime() / 1000);

    if (rangeType === "custom") {
      return {
        startTime: customStart
          ? Math.floor(new Date(customStart).getTime() / 1000)
          : endTime - 7 * 86400,
        endTime: customEnd
          ? Math.floor(new Date(customEnd).getTime() / 1000)
          : endTime,
      };
    }

    const days = TIME_RANGES[rangeType]?.days || 7;
    const startTime = endTime - days * 86400;

    return { startTime, endTime };
  }

  /**
   * 构建页面性能API请求体
   */
  function buildPagePerformanceRequestBody(startTime, endTime) {
    return {
      graph: {
        id: "0550085992-1762305438776",
        graph_type: "table",
        name: "页面性能",
        compare_config: {
          cmp_n: 1,
          unit: 0,
        },
        time_series_conf: {
          simple_queries: [
            {
              id: "2027192090-1762305438776",
              metric: "",
              metric_category: "",
              metric_category_name: "",
              filters: [],
              aggregator: "",
              downsample_interval: "0",
              downsample_aggregator: "AVG",
              group_by_fields: [],
              alias: "",
              unit: "",
              rate: false,
              hide: false,
              point_fill_type: "linear",
              alphabet: "a",
            },
          ],
          formula_queries: [],
          precision: 2,
          marker: [],
          legend: ["MIN", "MAX", "AVG", "CURRENT"],
          show_legend: true,
          y_axis_conf: {},
        },
        table_conf: {
          simple_queries: [
            {
              id: "1864640797-1762305438776",
              metric: "webpro_perf.ttfb",
              alphabet: "a",
              metric_category: "webpro_performance",
              metric_category_name: "性能",
              filters: [],
              filter_condition: {
                type: "",
              },
              aggregator: "PCT90",
              rollup_timeframe_by_aggregator: "AVG",
              alias: "",
              unit: "ms",
              rate: false,
              hide: false,
            },
            {
              id: "1759260590-1762305501957",
              metric: "webpro_perf.lcp",
              alphabet: "b",
              metric_category: "webpro_performance",
              metric_category_name: "性能",
              filters: [],
              filter_condition: {
                type: "",
              },
              aggregator: "PCT75",
              rollup_timeframe_by_aggregator: "AVG",
              alias: "",
              unit: "ms",
              rate: false,
              hide: false,
            },
            {
              id: "6275316820-1762305519832",
              metric: "webpro_perf.inp",
              alphabet: "c",
              metric_category: "webpro_performance",
              metric_category_name: "性能",
              filters: [],
              filter_condition: {
                type: "",
              },
              aggregator: "PCT75",
              rollup_timeframe_by_aggregator: "AVG",
              alias: "",
              unit: "ms",
              rate: false,
              hide: false,
            },
            {
              id: "0722081768-1762305534523",
              metric: "webpro_perf.cls",
              alphabet: "d",
              metric_category: "webpro_performance",
              metric_category_name: "性能",
              filters: [],
              filter_condition: {
                type: "",
              },
              aggregator: "PCT75",
              rollup_timeframe_by_aggregator: "AVG",
              alias: "",
              unit: "",
              rate: false,
              hide: false,
            },
          ],
          formula_queries: [],
          precision: 2,
          group_by_fields: ["pid"],
          order_by: "",
          asc: false,
          limit: 0,
        },
        single_value_conf: {
          simple_queries: [
            {
              id: "3156696490-1762305438776",
              alphabet: "a",
              metric: "webpro_perf.lcp",
              metric_category: "webpro_performance",
              metric_category_name: "性能",
              filters: [],
              filter_condition: {
                type: "",
              },
              aggregator: "PCT75",
              rollup_timeframe_by_aggregator: "TOTAL",
              unit: "ms",
              rate: false,
            },
          ],
          formula_queries: [],
          precision: 2,
        },
        pie_conf: {
          simple_queries: [
            {
              id: "2172569885-1762305438776",
              metric: "",
              alphabet: "a",
              metric_category: "",
              metric_category_name: "",
              filters: [],
              aggregator: "",
              rollup_timeframe_by_aggregator: "TOTAL",
              alias: "",
              unit: "",
              rate: false,
              hide: false,
            },
          ],
          formula_queries: [],
          group_by_fields: null,
          precision: 2,
        },
      },
      current_varibale_values: [],
      start_time: startTime,
      end_time: endTime,
      granularity: 1,
      granularity_unit: "d",
      filter_condition: {
        type: "and",
        children: [],
      },
      os: "webpro",
    };
  }

  /**
   * 构建接口性能API请求体
   */
  function buildApiPerformanceRequestBody(startTime, endTime) {
    return {
      graph: {
        id: "0264878889-1756883945199",
        graph_type: "table",
        name: "接口性能",
        time_series_conf: {
          simple_queries: [
            {
              id: "2388206407-1756883945199",
              metric: "",
              metric_category: "",
              metric_category_name: "",
              filters: [],
              aggregator: "",
              downsample_interval: "0",
              downsample_aggregator: "AVG",
              group_by_fields: [],
              alias: "",
              unit: "",
              rate: false,
              hide: false,
              point_fill_type: "linear",
              alphabet: "a",
            },
          ],
          formula_queries: [],
          precision: 0,
          marker: [],
          legend: ["MIN", "MAX", "AVG", "CURRENT"],
          show_legend: true,
          y_axis_conf: {},
        },
        table_conf: {
          simple_queries: [
            {
              id: "6249610949-1756883945199",
              metric: "slow_request_count",
              alphabet: "a",
              metric_category: "webpro_http",
              metric_category_name: "请求",
              filters: [],
              filter_condition: {
                type: "and",
                children: [
                  {
                    type: "expression",
                    values: ["20000"],
                    op: "gt",
                    dimension: "timing{'duration'}",
                  },
                  {
                    type: "expression",
                    values: ["200"],
                    op: "eq",
                    dimension: "res_status",
                  },
                ],
              },
              aggregator: "",
              rollup_timeframe_by_aggregator: "SUM",
              alias: "",
              unit: "",
              rate: false,
              hide: false,
            },
            {
              id: "6114568763-1756883988221",
              metric: "webpro_http.request_total",
              alphabet: "b",
              metric_category: "webpro_http",
              metric_category_name: "请求",
              filters: [],
              filter_condition: {
                type: "expression",
                values: ["20000"],
                op: "gt",
                dimension: "timing{'duration'}",
              },
              aggregator: "PCT95",
              rollup_timeframe_by_aggregator: "AVG",
              alias: "",
              unit: "",
              rate: false,
              hide: false,
            },
          ],
          formula_queries: [],
          precision: 0,
          group_by_fields: ["req_path"],
          order_by: "a",
          asc: false,
          limit: 0,
        },
        single_value_conf: {
          simple_queries: [
            {
              id: "1782298756-1756883945199",
              alphabet: "a",
              metric: "",
              metric_category: "",
              metric_category_name: "",
              filters: [],
              aggregator: "",
              rollup_timeframe_by_aggregator: "TOTAL",
              unit: "",
              rate: false,
            },
          ],
          formula_queries: [],
          precision: 2,
        },
        pie_conf: {
          simple_queries: [
            {
              id: "6650064105-1756883945199",
              metric: "",
              alphabet: "a",
              metric_category: "",
              metric_category_name: "",
              filters: [],
              aggregator: "",
              rollup_timeframe_by_aggregator: "TOTAL",
              alias: "",
              unit: "",
              rate: false,
              hide: false,
            },
          ],
          formula_queries: [],
          group_by_fields: null,
          precision: 2,
        },
      },
      current_varibale_values: [],
      start_time: startTime,
      end_time: endTime,
      granularity: 1,
      granularity_unit: "d",
      filter_condition: {
        type: "and",
        children: [],
      },
      os: "webpro",
    };
  }

  /**
   * 发起API请求
   */
  function makeAPIRequest(appId, requestBody, csrfToken, retryCount = 0) {
    return new Promise((resolve, reject) => {
      const allCookies = document.cookie;

      GM_xmlhttpRequest({
        method: "POST",
        url: API_CONFIG.endpoint,
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken || "",
          "x-app-ids": appId,
          Cookie: allCookies,
          Accept: "application/json",
        },
        data: JSON.stringify(requestBody),
        timeout: 30000,
        onload: function (response) {
          try {
            const data = JSON.parse(response.responseText);
            if (data.error_no === 0) {
              resolve(data);
            } else {
              reject(
                new Error(
                  `API错误: ${data.error_msg || "未知错误"} (错误码: ${
                    data.error_no
                  })`
                )
              );
            }
          } catch (e) {
            reject(new Error(`解析响应失败: ${e.message}`));
          }
        },
        onerror: function (error) {
          if (retryCount < 3) {
            const delay = Math.pow(2, retryCount) * 1000;
            setTimeout(() => {
              makeAPIRequest(appId, requestBody, csrfToken, retryCount + 1)
                .then(resolve)
                .catch(reject);
            }, delay);
          } else {
            reject(new Error(`网络请求失败: ${error.error || "未知错误"}`));
          }
        },
        ontimeout: function () {
          reject(new Error("请求超时，请检查网络连接"));
        },
      });
    });
  }

  /**
   * 转换页面性能数据为JSON格式
   */
  function convertPagePerformanceToJSON(data, appId, appName, options = {}) {
    if (!data?.data?.table) {
      throw new Error("响应数据格式错误");
    }

    const {
      maxZeroThreshold = 3,
      performanceColumnStart = 1,
      debug = false,
      precision = {
        TTFB: 2,
        LCP: 2,
        INP: 2,
        CLS: 6,
      },
    } = options;

    const table = data.data.table;
    const columns = table.columns || [];
    const units = table.units || [];
    const rows = table.rows || [];

    if (debug) {
      console.log(`📊 处理页面性能数据: ${rows.length} 行原始数据`);
      console.log(`⚙️ 过滤阈值: ${maxZeroThreshold} 个零值`);
    }

    // 构建表头
    const headers = [
      "应用ID",
      "应用名称",
      "pid",
      ...columns.slice(1).map((col) => {
        return col
          .replace(/\(AVG\)/g, "")
          .replace(/\(ms\)/g, "")
          .trim();
      }),
    ];

    // 构建JSON数据
    const jsonData = [];
    let filteredCount = 0;

    // 过滤和转换数据行
    rows.forEach((row, rowIndex) => {
      const pid = row[0];

      // 计算性能参数中0的数量
      const performanceValues = row.slice(performanceColumnStart);
      const zeroCount = performanceValues.filter((value) => {
        const numValue = parseFloat(value);
        return !isNaN(numValue) && numValue === 0;
      }).length;

      // 如果零值数量超过阈值，则跳过该行
      if (zeroCount >= maxZeroThreshold) {
        filteredCount++;
        if (debug) {
          console.log(
            `🚫 过滤行 ${rowIndex + 1}: ${pid} (${zeroCount} 个零值)`
          );
        }
        return;
      }

      // 构建数据对象
      const rowData = {
        应用ID: appId,
        应用名称: appName,
        pid: `${appName}-${pid}`,
      };

      // 处理性能数据列
      columns.slice(1).forEach((col, colIndex) => {
        const cellIndex = colIndex + 1;
        const cell = row[cellIndex];
        const unit = units[cellIndex] || "";
        const numericValue = parseFloat(cell);
        const columnName = columns[cellIndex] || "";

        let displayValue = cell;

        // 数值列处理
        if (!isNaN(numericValue)) {
          if (numericValue === 0) {
            displayValue = 0;
          } else {
            // 根据列名确定精度
            let decimalPlaces = 2;

            if (
              columnName.includes("CLS") ||
              columnName.includes("累计布局偏移")
            ) {
              decimalPlaces = precision.CLS || 6;
              displayValue = Number(numericValue.toFixed(decimalPlaces));
            } else {
              // TTFB, LCP, INP 保留单位
              decimalPlaces = precision.TTFB || 2;
              const formattedValue = Number(
                numericValue.toFixed(decimalPlaces)
              );

              // 对于有单位的指标，在值后面添加单位
              if (unit && unit !== "") {
                displayValue = `${formattedValue}${unit}`;
              } else {
                displayValue = formattedValue;
              }
            }
          }
        }

        // 构建列名（不含单位信息）
        const cleanColName = col
          .replace(/\(AVG\)/g, "")
          .replace(/\(ms\)/g, "")
          .replace(/TTFB/, "TTFB")
          .replace(/LCP/, "LCP")
          .replace(/INP/, "INP")
          .replace(/CLS/, "CLS")
          .trim();

        rowData[cleanColName] = displayValue;
      });

      jsonData.push(rowData);

      if (debug) {
        console.log(`✅ 保留行 ${rowIndex + 1}: ${pid} (${zeroCount} 个零值)`);
      }
    });

    if (debug) {
      console.log(
        `📈 过滤结果: 保留 ${
          rows.length - filteredCount
        } 行，过滤 ${filteredCount} 行`
      );
    }

    return jsonData;
  }

  /**
   * 转换接口性能数据为JSON格式
   */
  function convertApiPerformanceToJSON(data, appId, appName, options = {}) {
    if (!data?.data?.table) {
      throw new Error("接口性能响应数据格式错误");
    }

    const {
      debug = false,
      minSlowRequestCount = 30, // 慢请求次数阈值
    } = options;

    const table = data.data.table;
    const columns = table.columns || [];
    const units = table.units || [];
    const rows = table.rows || [];

    if (debug) {
      console.log(`📊 处理接口性能数据: ${rows.length} 行原始数据`);
      console.log("接口性能列名:", columns);
      console.log("接口性能单位:", units);
    }

    // 构建JSON数据
    const jsonData = [];

    /**
     * 转换科学计数法为普通数字
     */
    function convertScientificNotation(value) {
      if (typeof value === "string" && value.includes("e+")) {
        const num = parseFloat(value);
        return isNaN(num) ? value : num;
      }
      return value;
    }

    /**
     * 格式化数值，保留2位小数，不使用科学计数法
     */
    function formatNumber(value) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        // 对于极大或极小的数值，使用toFixed确保不使用科学计数法
        if (Math.abs(numValue) < 0.001 || Math.abs(numValue) > 1000000) {
          return Number(numValue.toFixed(2));
        } else {
          return Number(numValue.toFixed(2));
        }
      }
      return value;
    }

    // 处理数据行
    rows.forEach((row, rowIndex) => {
      // 查找慢请求次数列
      let slowRequestCount = 0;
      let slowRequestCountIndex = -1;

      columns.forEach((col, colIndex) => {
        if (col.includes("慢请求次数")) {
          slowRequestCountIndex = colIndex;
          let cell = row[colIndex];

          // 转换科学计数法
          if (typeof cell === "string") {
            cell = convertScientificNotation(cell);
          }

          slowRequestCount = parseFloat(cell) || 0;
        }
      });

      // 过滤慢请求次数低于阈值的数据
      if (slowRequestCount < minSlowRequestCount) {
        if (debug) {
          console.log(
            `🚫 过滤接口性能行 ${
              rowIndex + 1
            }: 慢请求次数 ${slowRequestCount} < ${minSlowRequestCount}`
          );
        }
        return; // 跳过此行
      }

      // 构建数据对象
      const rowData = {
        应用ID: appId,
        应用名称: appName,
      };

      // 处理数据列
      columns.forEach((col, colIndex) => {
        let cell = row[colIndex];
        const columnName = columns[colIndex] || "";

        let displayValue = cell;

        // 转换科学计数法
        if (typeof cell === "string") {
          displayValue = convertScientificNotation(cell);
        }

        // 数值列处理
        const numericValue = parseFloat(displayValue);
        if (!isNaN(numericValue)) {
          if (numericValue === 0) {
            displayValue = 0;
          } else {
            // 对于所有数值列，直接格式化数值，不添加单位
            displayValue = formatNumber(displayValue);
          }
        }

        // 构建列名（清理聚合器信息）
        const cleanColName = col
          .replace(/\(SUM\)/g, "")
          .replace(/\(AVG\)/g, "")
          .replace(/\(PCT95\)/g, "")
          .replace(/请求-/g, "")
          .trim();

        rowData[cleanColName] = displayValue;
      });

      jsonData.push(rowData);

      if (debug) {
        console.log(`✅ 保留接口性能行 ${rowIndex + 1}:`, rowData);
      }
    });

    if (debug) {
      console.log(
        `📈 接口性能数据: 保留 ${jsonData.length} 行，过滤 ${
          rows.length - jsonData.length
        } 行`
      );
    }

    return jsonData;
  }

  /**
   * 格式化日期
   */
  function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toISOString().split("T")[0];
  }

  /**
   * 延迟函数
   */
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==================== UI组件 ====================

  /**
   * 创建UI样式
   */
  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
                /* 触发按钮样式 */
                #apm-exporter-trigger {
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    z-index: 10000;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                    transition: all 0.3s ease;
                }
                
                #apm-exporter-trigger:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
                }
                
                /* 主面板样式 */
                #apm-exporter-panel {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 10001;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    width: 680px;
                    max-height: 85vh;
                    overflow: hidden;
                    display: none;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                }
                
                #apm-exporter-panel.show {
                    display: block;
                    animation: slideIn 0.3s ease;
                }
                
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -45%);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%);
                    }
                }
                
                /* 面板头部 */
                .apm-panel-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 16px 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: move;
                }
                
                .apm-panel-title {
                    font-size: 18px;
                    font-weight: 600;
                    margin: 0;
                }
                
                .apm-panel-close {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 18px;
                    line-height: 1;
                    transition: background 0.2s;
                }
                
                .apm-panel-close:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
                
                /* 面板内容 */
                .apm-panel-content {
                    padding: 24px;
                    max-height: calc(85vh - 120px);
                    overflow-y: auto;
                }
                
                /* 表单组样式 */
                .apm-form-group {
                    margin-bottom: 20px;
                }
                
                .apm-form-label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: #333;
                    font-size: 14px;
                }
                
                .apm-form-hint {
                    display: block;
                    margin-top: 4px;
                    font-size: 12px;
                    color: #666;
                }
                
                .apm-input,
                .apm-textarea,
                .apm-select {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 14px;
                    transition: border-color 0.2s;
                    box-sizing: border-box;
                }
                
                .apm-input:focus,
                .apm-textarea:focus,
                .apm-select:focus {
                    outline: none;
                    border-color: #667eea;
                }
                
                .apm-textarea {
                    resize: vertical;
                    min-height: 80px;
                    font-family: monospace;
                }
                
                .apm-row {
                    display: flex;
                    gap: 12px;
                }
                
                .apm-row .apm-form-group {
                    flex: 1;
                }
                
                /* 复选框组样式 */
                .apm-checkbox-group {
                    display: flex;
                    gap: 16px;
                    margin-top: 8px;
                }
                
                .apm-checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    font-size: 14px;
                }
                
                .apm-checkbox {
                    width: 16px;
                    height: 16px;
                    margin: 0;
                }
                
                /* 按钮样式 */
                .apm-btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .apm-btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                
                .apm-btn-primary:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                }
                
                .apm-btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                .apm-btn-secondary {
                    background: #f0f0f0;
                    color: #333;
                }
                
                .apm-btn-secondary:hover {
                    background: #e0e0e0;
                }
                
                /* 进度条 */
                .apm-progress-container {
                    margin-top: 20px;
                    display: none;
                }
                
                .apm-progress-container.show {
                    display: block;
                }
                
                .apm-progress-bar-bg {
                    background: #f0f0f0;
                    border-radius: 10px;
                    height: 20px;
                    overflow: hidden;
                    margin-bottom: 12px;
                }
                
                .apm-progress-bar {
                    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                    height: 100%;
                    transition: width 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 12px;
                    font-weight: 600;
                }
                
                /* 日志区域 */
                .apm-log-container {
                    background: #f8f9fa;
                    border: 1px solid #e0e0e0;
                    border-radius: 6px;
                    padding: 12px;
                    max-height: 200px;
                    overflow-y: auto;
                    font-size: 13px;
                    font-family: monospace;
                }
                
                .apm-log-item {
                    padding: 4px 0;
                    border-bottom: 1px solid #e8e8e8;
                }
                
                .apm-log-item:last-child {
                    border-bottom: none;
                }
                
                .apm-log-item.success {
                    color: #28a745;
                }
                
                .apm-log-item.error {
                    color: #dc3545;
                }
                
                .apm-log-item.info {
                    color: #17a2b8;
                }
                
                /* 认证状态指示器 */
                .apm-auth-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                    margin-bottom: 16px;
                }
                
                .apm-auth-status.success {
                    background: #d4edda;
                    color: #155724;
                }
                
                .apm-auth-status.error {
                    background: #f8d7da;
                    color: #721c24;
                }
                
                .apm-auth-status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: currentColor;
                }
                
                /* 遮罩层 */
                #apm-exporter-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 10000;
                    display: none;
                }
                
                #apm-exporter-overlay.show {
                    display: block;
                }
                
                /* 滚动条样式 */
                .apm-panel-content::-webkit-scrollbar,
                .apm-log-container::-webkit-scrollbar {
                    width: 8px;
                }
                
                .apm-panel-content::-webkit-scrollbar-track,
                .apm-log-container::-webkit-scrollbar-track {
                    background: #f1f1f1;
                }
                
                .apm-panel-content::-webkit-scrollbar-thumb,
                .apm-log-container::-webkit-scrollbar-thumb {
                    background: #888;
                    border-radius: 4px;
                }
                
                .apm-panel-content::-webkit-scrollbar-thumb:hover,
                .apm-log-container::-webkit-scrollbar-thumb:hover {
                    background: #555;
                }
            `;
    document.head.appendChild(style);
  }

  /**
   * 创建UI面板
   */
  function createUI() {
    // 创建触发按钮
    const trigger = document.createElement("button");
    trigger.id = "apm-exporter-trigger";
    trigger.textContent = "📊 APM数据导出";
    document.body.appendChild(trigger);

    // 创建遮罩层
    const overlay = document.createElement("div");
    overlay.id = "apm-exporter-overlay";
    document.body.appendChild(overlay);

    // 创建主面板
    const panel = document.createElement("div");
    panel.id = "apm-exporter-panel";
    panel.innerHTML = `
                <div class="apm-panel-header" id="apm-panel-header">
                    <h2 class="apm-panel-title">🚀 火山引擎APM性能数据批量导出工具</h2>
                    <button class="apm-panel-close" id="apm-panel-close">×</button>
                </div>
                <div class="apm-panel-content">
                    <div id="apm-auth-status"></div>
                    
                    <div class="apm-form-group">
                        <label class="apm-form-label">应用ID列表（每行一个）</label>
                        <textarea class="apm-textarea" id="apm-app-ids" placeholder="591025&#10;602838"></textarea>
                        <span class="apm-form-hint">请输入需要导出的应用ID，每行一个</span>
                    </div>
                    
                    <div class="apm-form-group">
                        <label class="apm-form-label">应用名称映射（JSON格式）</label>
                        <textarea class="apm-textarea" id="apm-app-mapping" placeholder='{"591025": "国内酒店H5", "602838": "商家平台H5"}'></textarea>
                        <span class="apm-form-hint">JSON格式: {"应用ID": "应用名称"}</span>
                    </div>
                    
                    <div class="apm-form-group">
                        <label class="apm-form-label">导出数据类型</label>
                        <div class="apm-checkbox-group">
                            <label class="apm-checkbox-label">
                                <input type="checkbox" class="apm-checkbox" id="apm-data-type-page" value="page_performance" checked>
                                <span>页面性能</span>
                            </label>
                            <label class="apm-checkbox-label">
                                <input type="checkbox" class="apm-checkbox" id="apm-data-type-api" value="api_performance" checked>
                                <span>接口性能</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="apm-form-group">
                        <label class="apm-form-label">时间范围</label>
                        <select class="apm-select" id="apm-time-range">
                            <option value="7days">最近7天</option>
                            <option value="30days">最近30天</option>
                            <option value="90days">最近90天</option>
                            <option value="custom">自定义时间</option>
                        </select>
                    </div>
                    
                    <div class="apm-row" id="apm-custom-time" style="display: none;">
                        <div class="apm-form-group">
                            <label class="apm-form-label">开始日期</label>
                            <input type="date" class="apm-input" id="apm-start-date">
                        </div>
                        <div class="apm-form-group">
                            <label class="apm-form-label">结束日期</label>
                            <input type="date" class="apm-input" id="apm-end-date">
                        </div>
                    </div>
                    
                    <div class="apm-form-group">
                        <label class="apm-form-label">请求间隔（毫秒）</label>
                        <input type="number" class="apm-input" id="apm-request-interval" value="1000" min="500" step="100">
                        <span class="apm-form-hint">建议设置1000ms以上，避免请求过于频繁</span>
                    </div>
                    
                    <div class="apm-form-group">
                        <button class="apm-btn apm-btn-primary" id="apm-export-btn" style="width: 100%;">
                            开始批量导出
                        </button>
                    </div>
                    
                    <div class="apm-progress-container" id="apm-progress-container">
                        <div class="apm-progress-bar-bg">
                            <div class="apm-progress-bar" id="apm-progress-bar">0%</div>
                        </div>
                        <div class="apm-log-container" id="apm-log-container"></div>
                    </div>
                </div>
            `;
    document.body.appendChild(panel);

    return { trigger, overlay, panel };
  }

  /**
   * 更新认证状态显示
   */
  function updateAuthStatus(isValid, message) {
    const statusEl = document.getElementById("apm-auth-status");
    const className = isValid ? "success" : "error";
    statusEl.innerHTML = `
                <div class="apm-auth-status ${className}">
                    <span class="apm-auth-status-dot"></span>
                    ${message}
                </div>
            `;
  }

  /**
   * 添加日志
   */
  function addLog(message, type = "info") {
    const logContainer = document.getElementById("apm-log-container");
    const logItem = document.createElement("div");
    logItem.className = `apm-log-item ${type}`;
    const timestamp = new Date().toLocaleTimeString();
    logItem.textContent = `[${timestamp}] ${message}`;
    logContainer.appendChild(logItem);
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  /**
   * 更新进度条
   */
  function updateProgress(current, total) {
    const percentage = Math.round((current / total) * 100);
    const progressBar = document.getElementById("apm-progress-bar");
    progressBar.style.width = percentage + "%";
    progressBar.textContent = `${percentage}% (${current}/${total})`;
  }

  /**
   * 显示/隐藏进度容器
   */
  function toggleProgress(show) {
    const container = document.getElementById("apm-progress-container");
    if (show) {
      container.classList.add("show");
    } else {
      container.classList.remove("show");
    }
  }

  // ==================== 主要逻辑 ====================

  /**
   * 验证认证信息
   */
  function validateAuth() {
    const csrfToken = getCSRFToken();
    const hasCookies = document.cookie.length > 0;

    if (csrfToken && hasCookies) {
      updateAuthStatus(true, "✓ 认证信息获取成功");
      return true;
    } else {
      updateAuthStatus(false, "✗ 认证信息获取失败，请确保已登录");
      return false;
    }
  }

  /**
   * 获取选中的数据类型
   */
  function getSelectedDataTypes() {
    const selectedTypes = [];
    const pageCheckbox = document.getElementById("apm-data-type-page");
    const apiCheckbox = document.getElementById("apm-data-type-api");

    if (pageCheckbox.checked) {
      selectedTypes.push("page_performance");
    }
    if (apiCheckbox.checked) {
      selectedTypes.push("api_performance");
    }

    return selectedTypes;
  }

  /**
   * 批量导出数据
   */
  async function batchExport() {
    // 首先加载SheetJS库
    try {
      addLog("正在加载Excel处理库...", "info");
      await loadSheetJS();
      addLog("✅ Excel处理库加载成功", "success");
    } catch (error) {
      addLog(`❌ Excel处理库加载失败: ${error.message}`, "error");
      alert("Excel处理库加载失败，请检查网络连接");
      return;
    }

    // 获取配置
    const appIdsText = document.getElementById("apm-app-ids").value.trim();
    const appMappingText = document
      .getElementById("apm-app-mapping")
      .value.trim();
    const timeRange = document.getElementById("apm-time-range").value;
    const requestInterval =
      parseInt(document.getElementById("apm-request-interval").value) || 1000;
    const customStartDate = document.getElementById("apm-start-date").value;
    const customEndDate = document.getElementById("apm-end-date").value;

    // 获取选中的数据类型
    const selectedDataTypes = getSelectedDataTypes();
    if (selectedDataTypes.length === 0) {
      alert("请至少选择一种数据类型");
      return;
    }

    // 验证输入
    if (!appIdsText) {
      alert("请输入至少一个应用ID");
      return;
    }

    // 解析应用ID列表
    const appIds = appIdsText
      .split("\n")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (appIds.length === 0) {
      alert("未找到有效的应用ID");
      return;
    }

    // 解析应用名称映射
    let appMapping = {};
    try {
      if (appMappingText) {
        appMapping = JSON.parse(appMappingText);
      }
    } catch (e) {
      alert("应用名称映射JSON格式错误，请检查");
      return;
    }

    // 验证认证
    if (!validateAuth()) {
      alert("认证信息无效，请刷新页面后重试");
      return;
    }

    const csrfToken = getCSRFToken();

    // 计算时间戳
    const { startTime, endTime } = calculateTimestamps(
      timeRange,
      customStartDate,
      customEndDate
    );

    // 准备导出
    const exportBtn = document.getElementById("apm-export-btn");
    exportBtn.disabled = true;
    exportBtn.textContent = "导出中...";

    toggleProgress(true);
    document.getElementById("apm-log-container").innerHTML = "";

    // 计算总任务数
    const totalTasks = appIds.length * selectedDataTypes.length;
    let completedTasks = 0;
    updateProgress(0, totalTasks);

    addLog(
      `开始批量导出，共 ${appIds.length} 个应用，${selectedDataTypes.length} 种数据类型`,
      "info"
    );
    addLog(
      `时间范围: ${formatDate(startTime)} ~ ${formatDate(endTime)}`,
      "info"
    );
    addLog(
      `数据类型: ${selectedDataTypes
        .map((type) => DATA_TYPES[type].name)
        .join(", ")}`,
      "info"
    );

    // 收集所有应用的数据
    const allData = {
      page_performance: {}, // 页面性能数据
      api_performance: {}, // 接口性能数据
    };

    const allCombinedData = {
      page_performance: [], // 页面性能全量数据
      api_performance: [], // 接口性能全量数据
    };

    let successCount = 0;
    let failCount = 0;

    // 批量处理 - 按应用和数据类型的双重循环
    for (let i = 0; i < appIds.length; i++) {
      const appId = appIds[i];
      const appName = appMapping[appId] || appId;

      // 为每个数据类型获取数据
      for (let j = 0; j < selectedDataTypes.length; j++) {
        const dataType = selectedDataTypes[j];
        const dataTypeConfig = DATA_TYPES[dataType];

        try {
          addLog(
            `[${
              completedTasks + 1
            }/${totalTasks}] 正在获取 ${appName} (${appId}) 的${
              dataTypeConfig.name
            }数据...`,
            "info"
          );

          // 构建对应数据类型的请求体
          const requestBody = dataTypeConfig.requestBody(startTime, endTime);

          const response = await makeAPIRequest(appId, requestBody, csrfToken);

          // 转换为JSON格式
          const jsonData = dataTypeConfig.convertToJSON(
            response,
            appId,
            appName
          );

          // 保存到数据类型数据
          if (!allData[dataType][appId]) {
            allData[dataType][appId] = {
              name: appName,
              data: jsonData,
            };
          }

          // 添加到全量数据
          allCombinedData[dataType].push(...jsonData);

          addLog(`✅ ${appName} ${dataTypeConfig.name}数据获取成功`, "success");
          successCount++;
        } catch (error) {
          addLog(
            `❌ ${appName} ${dataTypeConfig.name}数据获取失败: ${error.message}`,
            "error"
          );
          failCount++;
        }

        completedTasks++;
        updateProgress(completedTasks, totalTasks);

        // 延迟下一个请求
        if (completedTasks < totalTasks) {
          await delay(requestInterval);
        }
      }
    }

    // 生成Excel文件
    try {
      addLog("正在生成Excel文件...", "info");

      const workbook = createWorkbook();

      // 为每种数据类型和应用创建sheet
      selectedDataTypes.forEach((dataType) => {
        const dataTypeConfig = DATA_TYPES[dataType];
        const dataForType = allData[dataType];

        // 为每个应用创建sheet
        Object.keys(dataForType).forEach((appId) => {
          const appInfo = dataForType[appId];
          const sheetName = `${dataTypeConfig.name}_${appInfo.name}`.substring(
            0,
            31
          ); // Excel sheet名称最大31字符

          if (appInfo.data && appInfo.data.length > 0) {
            const sheet = jsonToSheet(appInfo.data);
            if (sheet) {
              workbook.SheetNames.push(sheetName);
              workbook.Sheets[sheetName] = sheet;
              addLog(
                `✅ 创建${dataTypeConfig.name}应用sheet: ${sheetName}`,
                "success"
              );
            }
          } else {
            addLog(
              `⚠️ 应用 ${appInfo.name} 无${dataTypeConfig.name}数据，跳过创建sheet`,
              "info"
            );
          }
        });

        // 创建全量数据sheet
        const combinedData = allCombinedData[dataType];
        if (combinedData.length > 0) {
          const allDataSheetName = `${dataTypeConfig.name}_全量数据`.substring(
            0,
            31
          );
          const allDataSheet = jsonToSheet(combinedData);
          if (allDataSheet) {
            workbook.SheetNames.push(allDataSheetName);
            workbook.Sheets[allDataSheetName] = allDataSheet;
            addLog(`✅ 创建${dataTypeConfig.name}全量数据sheet`, "success");
          }
        } else {
          addLog(
            `⚠️ 无有效${dataTypeConfig.name}数据，跳过创建全量数据sheet`,
            "info"
          );
        }
      });

      // 生成文件名并下载
      const timeLabel = TIME_RANGES[timeRange]?.label || "自定义时间";
      const dataTypesLabel = selectedDataTypes
        .map((type) => DATA_TYPES[type].name)
        .join("+");
      const filename = `APM${dataTypesLabel}数据_${timeLabel}_${formatDate(
        startTime
      )}_${formatDate(endTime)}.xlsx`;

      downloadExcel(workbook, filename);
      addLog(`🎉 Excel文件生成成功: ${filename}`, "success");
    } catch (error) {
      addLog(`❌ Excel文件生成失败: ${error.message}`, "error");
    }

    // 完成
    addLog(
      `批量导出完成！成功: ${successCount}, 失败: ${failCount}`,
      successCount > 0 ? "success" : "error"
    );
    exportBtn.disabled = false;
    exportBtn.textContent = "开始批量导出";

    // 保存配置到localStorage
    try {
      GM_setValue("apm_app_ids", appIdsText);
      GM_setValue("apm_app_mapping", appMappingText);
    } catch (e) {
      console.warn("保存配置失败:", e);
    }
  }

  /**
   * 初始化应用
   */
  function initApp() {
    // 注入样式
    injectStyles();

    // 创建UI
    const { trigger, overlay, panel } = createUI();

    // 加载保存的配置
    try {
      const savedAppIds = GM_getValue("apm_app_ids", "");
      const savedMapping = GM_getValue(
        "apm_app_mapping",
        JSON.stringify(DEFAULT_APP_MAPPING, null, 2)
      );

      if (savedAppIds) {
        document.getElementById("apm-app-ids").value = savedAppIds;
      }
      document.getElementById("apm-app-mapping").value = savedMapping;
    } catch (e) {
      console.warn("加载配置失败:", e);
      document.getElementById("apm-app-mapping").value = JSON.stringify(
        DEFAULT_APP_MAPPING,
        null,
        2
      );
    }

    // 设置默认日期
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000);
    document.getElementById("apm-end-date").value = today
      .toISOString()
      .split("T")[0];
    document.getElementById("apm-start-date").value = sevenDaysAgo
      .toISOString()
      .split("T")[0];

    // 事件监听：打开面板
    trigger.addEventListener("click", () => {
      panel.classList.add("show");
      overlay.classList.add("show");
      validateAuth();
    });

    // 事件监听：关闭面板
    const closePanel = () => {
      panel.classList.remove("show");
      overlay.classList.remove("show");
    };

    document
      .getElementById("apm-panel-close")
      .addEventListener("click", closePanel);
    overlay.addEventListener("click", closePanel);

    // 事件监听：时间范围选择
    document
      .getElementById("apm-time-range")
      .addEventListener("change", (e) => {
        const customTimeDiv = document.getElementById("apm-custom-time");
        if (e.target.value === "custom") {
          customTimeDiv.style.display = "flex";
        } else {
          customTimeDiv.style.display = "none";
        }
      });

    // 事件监听：导出按钮
    document
      .getElementById("apm-export-btn")
      .addEventListener("click", batchExport);

    // 支持拖拽面板
    let isDragging = false;
    let currentX, currentY, initialX, initialY;

    const header = document.getElementById("apm-panel-header");

    header.addEventListener("mousedown", (e) => {
      isDragging = true;
      initialX = e.clientX - panel.offsetLeft;
      initialY = e.clientY - panel.offsetTop;
    });

    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        panel.style.left = currentX + "px";
        panel.style.top = currentY + "px";
        panel.style.transform = "none";
      }
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });

    console.log("🚀 火山引擎APM数据导出工具已加载");
  }

  // ==================== 入口 ====================

  // 等待页面加载完成后初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
}
