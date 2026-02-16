import log from 'electron-log/main';

// 1. 初始化
log.initialize();

// 2. 文件日志配置（保持不变，文件通常不会乱码）
log.transports.file.fileName = 'app.log';
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {scope} {text}';

// 3. 控制台配置优化：
// 移除 %c 占位符，Windows 终端对这种模拟样式的支持非常不稳定
log.transports.console.useStyles = false; 
log.transports.console.format = '[{h}:{i}:{s}.{ms}] [{level}] {scope} {text}';

// 4. 重要：不要全局覆盖 console
// 这样你还可以用原生的 console.log() 来打印中文作为兜底
// Object.assign(console, log.functions); // 建议注释掉

export default log;