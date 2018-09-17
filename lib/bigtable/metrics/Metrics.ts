import Debug from "debug";
import promClient from "prom-client";

const debug = Debug("yildiz:http:metrics");
const promDefaultMetrics = promClient.collectDefaultMetrics;
const promRegistry = promClient.Registry;

export class Metrics {

    private prefix: string;
    private register: promClient.Registry;
    private defaultMetricsIntv!: number | NodeJS.Timer;
    private metrics: {
        [key: string]: promClient.Counter | promClient.Gauge;
    };

    constructor(prefix: string) {

        this.prefix = prefix;
        this.register = new promRegistry();
        this.metrics = {}; // Stores metric objects
    }

    public exportType() {
        return this.register.contentType;
    }

    public exportMetrics() {
        return this.register.metrics();
    }

    public getRegister() {
        return this.register;
    }

    private getCounter(key: string): promClient.Counter {

        if (this.metrics[key]) {
            return this.metrics[key];
        }

        this.metrics[key] = new promClient.Counter({
            name: `${key}`,
            help: `${key}_help`,
            registers: [this.register],
            labelNames: ["na", "prefix"],
        });

        return this.metrics[key];
    }

    private getGauge(key: string): promClient.Gauge {

        // prefix
        key = `gauge_${key}`;

        if (this.metrics[key]) {
            return this.metrics[key] as promClient.Gauge;
        }

        this.metrics[key] = new promClient.Gauge({
            name: `${key}`,
            help: `${key}_help`,
            registers: [this.register],
            labelNames: ["na", "prefix"], // Gauges require fixed prefixes
        });

        return this.metrics[key] as promClient.Gauge;
    }

    public inc(key: string, val: number = 1) {

        const prefix = this.prefix;
        const fullKey = prefix ? `${prefix}_${key}` : key;
        const counter = this.getCounter(fullKey);

        counter.inc(
            { prefix },
            val,
            Date.now(),
        );

    }

    public set(key: string, val: number) {

        if (val === null || val === undefined) {
            throw new Error(`Please provide value on set ${key}`);
        }

        const prefix = this.prefix;
        const fullKey = prefix ? `${prefix}_${key}` : key;
        const gauge = this.getGauge(fullKey);

        gauge.set(
            { prefix },
            val,
            Date.now(),
        );
    }

    public registerDefault() {

        // It means it is from the factory and not from yildiz instance
        this.defaultMetricsIntv = promDefaultMetrics({
            register: this.register,
            timeout: 5000,
        });

        debug("metrics active.");
    }

    public close() {

        if (this.defaultMetricsIntv) {
            clearInterval(this.defaultMetricsIntv as NodeJS.Timer);
        }

        this.metrics = {};
        this.register.clear();
    }
}
