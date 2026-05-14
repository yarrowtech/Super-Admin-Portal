const fs = require("fs");
const path = require("path");
const pino = require("pino");

const LOG_DIR = path.join(__dirname, "..", "logs");

const ensureLogDir = () => {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
};

const dateKey = () => new Date().toISOString().slice(0, 10);

const fileTargetPath = () => path.join(LOG_DIR, `${dateKey()}.log`);

const buildTransport = () => {
  ensureLogDir();
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    try {
      return pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          singleLine: true,
        },
      });
    } catch (err) {
      return pino.destination({ dest: fileTargetPath(), mkdir: true, sync: false });
    }
  }

  return pino.destination({ dest: fileTargetPath(), mkdir: true, sync: false });
};

module.exports = {
  buildTransport,
};

