const log4js = require("log4js");
const path = require('path');

log4js.configure({
    appenders: {
        file: { type: "file", filename: path.join(require('os').homedir(),'AppData','Roaming','.cauldron','packwiz_js_logs','logs.log'), maxLogSize: 10485760, backups: 3, compress: true},
    },
    categories: { default: { appenders: ["file"], level: "debug" } },
});

const packwizLogger = log4js.getLogger('packwiz_js')




module.exports = { packwizLogger }