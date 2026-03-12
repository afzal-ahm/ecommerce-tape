/**
 * Clean production-ready logger
 */

const isProd = process.env.NODE_ENV === "production";

const COLORS = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    cyan: "\x1b[36m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
};

const getTimeStamp = () =>
    new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

export const logger = (type, ...messages) => {
    const time = getTimeStamp();
    const upperType = type.toUpperCase();
    const prefix = `[${time}] [${upperType}]`;

    // 🚫 production me OPTIONS spam band
    if (isProd && upperType === "REQUEST") {
        if (messages.join(" ").includes("OPTIONS")) return;
    }

    switch (upperType) {
        case "ERROR":
            console.error(`${COLORS.red}${prefix}${COLORS.reset}`, ...messages);
            break;

        case "SUCCESS":
            if (!isProd)
                console.log(`${COLORS.green}${prefix}${COLORS.reset}`, ...messages);
            break;

        case "WARN":
        case "WARNING":
            console.warn(`${COLORS.yellow}${prefix}${COLORS.reset}`, ...messages);
            break;

        case "INFO":
            if (!isProd)
                console.log(`${COLORS.cyan}${prefix}${COLORS.reset}`, ...messages);
            break;

        case "REQUEST":
            if (!isProd)
                console.log(`${COLORS.yellow}${prefix}${COLORS.reset}`, ...messages);
            break;

        case "404":
            console.log(`${COLORS.red}${prefix}${COLORS.reset}`, ...messages);
            break;

        default:
            if (!isProd) console.log(prefix, ...messages);
    }
};

export default logger;
