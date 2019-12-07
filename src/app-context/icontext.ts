import { EventQueue } from "../events/event-queue";
import { IMessageHandler } from "../handlers/imessage-handler";
import { EventQueueProcessor } from "./eventqueue-processor";
import { ILogger } from "./ilogger";
import { IWebSocketFactory } from "./iwebsocket-factory";
import { Settings } from "./settings";
import { State } from "./state";
import { TimerManager } from "./timer-manager";

export interface IContext {

    settings: Settings;
    logger: ILogger;
    eventQueue: EventQueue;
    tm: TimerManager;
    processor: EventQueueProcessor;
    state: State;
    webSocketFactory: IWebSocketFactory;

    handlers: IMessageHandler[];
}