import WebSocket from "ws";
/** We try to (re)connect to the WS during 5 min before giving up */
const MAX_CONNECTION_DURATION = 5 * 60 * 1000;
function deferredPromise() {
    const deferred = {};
    deferred.promise = new Promise((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });
    // @ts-expect-error it's ok, the properties are here
    return deferred;
}
export class WebSocketClient {
    #url;
    #configuration;
    #listeners;
    #socket = null;
    #status = "initializing";
    #readyPromise = null;
    #pendingMessages = [];
    #pendingPromise = null;
    #currentTimeout = undefined;
    constructor(url, configuration, listeners) {
        this.#url = url;
        this.#configuration = configuration;
        this.#listeners = listeners;
        this.#init();
    }
    ready() {
        if (this.#status === "ready") {
            return Promise.resolve(true);
        }
        else if (this.#status === "closed") {
            return Promise.reject(new Error("closed"));
        }
        else {
            if (!this.#readyPromise) {
                this.#readyPromise = deferredPromise();
            }
            return this.#readyPromise.promise;
        }
    }
    sendMessage(message) {
        if (this.#status === "closed") {
            return this.ready();
        }
        this.#pendingMessages.push(message);
        if (!this.#pendingPromise) {
            this.#pendingPromise = this.ready()
                .then(() => {
                try {
                    while (this.#pendingMessages.length) {
                        const message = this.#pendingMessages.shift();
                        if (message) {
                            this.#socket?.send(message, {
                                binary: this.#configuration.frames_format === "bytes",
                            });
                        }
                    }
                    return true;
                }
                catch (err) {
                    console.error("Error while sending a message", err);
                    return false;
                }
            })
                .finally(() => {
                this.#pendingPromise = null;
            });
        }
        return this.#pendingPromise;
    }
    close() {
        if (this.#status === "closed")
            return;
        this.#doClose();
    }
    #init() {
        this.#clearSocket();
        if (this.#status !== "initializing") {
            this.#readyPromise = deferredPromise();
            this.#status = "initializing";
        }
        const startTime = Date.now();
        let retries = 0;
        const connect = () => {
            const reject = (err) => {
                clearTimeout(this.#currentTimeout);
                this.#clearSocket();
                if (this.#status === "closed")
                    return;
                if ((err.code >= 4000 && err.code < 4500) ||
                    Date.now() - startTime > MAX_CONNECTION_DURATION) {
                    // No need to retry
                    this.#doClose(err);
                }
                else {
                    this.#currentTimeout = setTimeout(() => {
                        if (this.#status === "closed")
                            return;
                        connect();
                    }, Math.min(20000, 500 * Math.pow(2, ++retries)));
                }
            };
            const resolve = (requestId) => {
                clearTimeout(this.#currentTimeout);
                if (this.#status === "closed")
                    return;
                if (!this.#socket) {
                    // should never happen
                    reject({ code: 4500, reason: "No socket" });
                    return;
                }
                console.log(`Connected to WebSocket and ready to send frames. request_id: ${requestId}`);
                this.#socket.removeAllListeners();
                this.#socket.addEventListener("message", this.#onMessage);
                this.#socket.addEventListener("close", this.#onClose);
                this.#status = "ready";
                this.#readyPromise?.resolve(true);
            };
            this.#socket = new WebSocket(this.#url);
            this.#socket.addEventListener("open", () => {
                this.#socket?.send(JSON.stringify(this.#configuration));
            });
            this.#socket.addEventListener("error", () => {
                reject({ code: 1012, reason: `Couldn't connect to the server` });
            });
            this.#socket.addEventListener("close", (event) => {
                reject(event);
            });
            this.#socket.addEventListener("message", (event) => {
                let data;
                try {
                    data = JSON.parse(event.data.toString());
                }
                catch (err) {
                    reject({
                        code: 4500,
                        reason: `Cannot parse the message: ${event.data}`,
                    });
                }
                if (data?.event === "connected") {
                    this.#listeners.onMessage?.(data);
                    // Since we can't know exactly when the server is ready, we wait a bit
                    this.#currentTimeout = setTimeout(() => {
                        resolve(data.request_id);
                    }, 1000);
                }
                else {
                    reject({
                        code: 4500,
                        reason: `Server sent an unexpected message: ${event.data}`,
                    });
                }
            });
        };
        connect();
    }
    #clearSocket() {
        if (this.#socket) {
            this.#socket.removeAllListeners();
            if (this.#socket.readyState === WebSocket.CONNECTING ||
                this.#socket.readyState === WebSocket.OPEN) {
                try {
                    this.#socket.close();
                }
                catch (err) {
                    console.error("Error closing the websocket", err);
                }
            }
            this.#socket = null;
        }
    }
    #onMessage = (event) => {
        let message;
        try {
            message = JSON.parse(event.data);
        }
        catch (err) {
            try {
                this.#listeners.onError?.({
                    event: "error",
                    code: 4500,
                    reason: `Cannot parse the received api-key: ${event.data}`,
                    closed: false,
                });
            }
            catch (error) {
                console.error("Error caught on error callback", error);
            }
            return;
        }
        try {
            this.#listeners.onMessage?.(message);
        }
        catch (error) {
            console.error("Error caught on message callback", error);
        }
        switch (message.event) {
            case "transcript":
                try {
                    this.#listeners.onTranscript?.(message);
                }
                catch (error) {
                    console.error("Error caught on transcript callback", error);
                }
                break;
            case "error":
                try {
                    this.#listeners.onError?.({
                        ...message,
                        closed: false,
                    });
                }
                catch (error) {
                    console.error("Error caught on error callback", error);
                }
                break;
            default:
                console.log("Received an unknown message type", message);
        }
    };
    #onClose = (event) => {
        const code = event.code || 1005;
        const reason = event.reason || "Connection closed";
        if (code >= 4000 && code < 4500) {
            // Client error, something wrong with the configuration or the frames sent
            try {
                this.#listeners.onError?.({
                    event: "error",
                    code: code,
                    reason: reason,
                    closed: true,
                });
            }
            catch (error) {
                console.error("Error caught on error callback", error);
            }
        }
        else {
            console.error(`[${code}] ${reason}. Reconnecting...`);
            this.#init();
        }
    };
    #doClose(err) {
        this.#status = "closed";
        this.#pendingMessages = [];
        clearTimeout(this.#currentTimeout);
        this.#clearSocket();
        if (err) {
            try {
                this.#listeners.onError?.({
                    event: "error",
                    code: err.code,
                    reason: err.reason,
                    closed: true,
                });
            }
            catch (error) {
                console.error("Error caught on error callback", error);
            }
        }
        if (this.#readyPromise) {
            this.#readyPromise.reject(new Error(err ? `[${err.code}] ${err.reason}` : "Closed by user"));
        }
    }
}
