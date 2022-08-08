import Logger, { LogLevel } from "./misc/Logger";
import ConfigManager from "./misc/ConfigManager";

const writeLine = Logger.generateLogger("ApiEnvironment");

export default class CineramaStreamApp {
    private static initialized = false;
    public static configManager: ConfigManager;

    static async initialize() {
        if (this.initialized) {
            writeLine("Environment already initialized!", LogLevel.Warning);
            return;
        }
        this.initialized = true;
        this.printSplash();
        this.configManager = new ConfigManager();
        
    }

    private static printSplash() {
        console.log("cinerama-stream 1.0.0 alpha");
        console.log("Copyright (c) 2022 - filmstock.tv");
        console.log();
    }
}