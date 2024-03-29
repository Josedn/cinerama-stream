import dotenv from "dotenv";
import { ConfigKeys } from "./ConfigKeys";
import Logger, { LogLevel } from "./Logger";

const writeLine = Logger.generateLogger("ConfigManager");

export default class ConfigManager {
    constructor() {
        const result = dotenv.config();
        if (result.error) {
            writeLine("Error loading .env file: " + result.error.message, LogLevel.Warning);
        }
    }

    public getApiPort(): number {
        return this.getInt(ConfigKeys.API_PORT, 1232);
    }

    public getEnabledAccounts(): string[] {
        return this.getString(ConfigKeys.ENABLED_ACCOUNTS, "").split(",").map(str => str.trim());
    }

    public getTorrentMaxIdleTimeMs(): number {
        return this.getInt(ConfigKeys.SPEED_LIMIT_BYTES_PER_SECOND, 150000);
    }

    public getTempFolderLocation(): string {
        return this.getString(ConfigKeys.TEMP_FOLDER_LOCATION, "/tmp");
    }

    public getSpeedLimitEnabled(): boolean {
        return this.getBoolean(ConfigKeys.SPEED_LIMIT_ENABLED, false);
    }

    public getSpeedLimitBytesPerSecond(): number {
        return this.getInt(ConfigKeys.SPEED_LIMIT_BYTES_PER_SECOND, 1000000);
    }

    private getBoolean(key: ConfigKeys, failsafe: boolean): boolean {
        const value = process.env[key];
        if (value != null) {
            return value === "true";
        }
        writeLine("Used failsafe value " + failsafe + " for " + key, LogLevel.Warning);
        return failsafe;
    }

    private getInt(key: ConfigKeys, failsafe: number): number {
        const value = process.env[key];
        if (value != null) {
            return parseInt(value);
        }
        writeLine("Used failsafe value " + failsafe + " for " + key, LogLevel.Warning);
        return failsafe;
    }

    private getString(key: ConfigKeys, failsafe: string): string {
        const value = process.env[key];
        if (value != null) {
            return value;
        }
        writeLine("Used failsafe value " + failsafe + " for " + key, LogLevel.Warning);
        return failsafe;
    }
}