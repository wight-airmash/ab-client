import axios from "axios";
import { AuthData } from "../app-context/auth-data";
import { BrowserContext } from "./browser-context";

const LOGIN_URL = "https://login.airmash.online";
const SETTINGS_URL = "https://data.airmash.online/settings";
const AUTH_DATA_KEY = "auth-data";

export class ThirdPartyLogin {

    private loginButton: HTMLButtonElement;
    private loginSelector: HTMLDivElement;
    private overlay: HTMLDivElement;

    private loginToken: string;
    private usedProvider: number;

    constructor(private context: BrowserContext) {

        this.loginButton = document.getElementById("loginButton") as HTMLButtonElement;
        this.loginSelector = document.getElementById("loginselector") as HTMLDivElement;
        this.overlay = document.getElementById("overlay") as HTMLDivElement;

        this.loginButton.addEventListener("click", () => {
            this.overlay.style.display = "block";
            this.loginSelector.style.display = "block";
        });

        this.overlay.addEventListener("click", () => this.finish());

        const loginButtons = document.querySelectorAll(".loginbutton");

        for (const btn of loginButtons) {
            const provider = btn.getAttribute("data-provider");
            btn.addEventListener("click", () => this.loginPopup(Number(provider)));
        }

        this.loadPreviousLoginData();
    }

    private async loadPreviousLoginData() {
        try {
            const raw = localStorage.getItem(AUTH_DATA_KEY);
            const data = JSON.parse(raw) as AuthData;
            this.context.auth = data;

            const config = {
                headers: { Authorization: `Bearer ${this.context.auth.tokens.settings}` },
            };
            const response = await axios.get(SETTINGS_URL, config);
            const settings = response.data;

            this.context.logger.warn("Logged in with settings", settings);
        } catch (error) {
            this.context.logger.error("Auth data could not be loaded", error);
        }
    }

    private finish() {
        this.overlay.style.display = "none";
        this.loginSelector.style.display = "none";
    }

    private getRandomToken(length: number) {
        let token = window.crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
        if (length - token.length > 0) {
            token += this.getRandomToken(length - token.length);
        }
        return token.substr(0, length);
    }

    /*
     * The popup window opened on login.airmash.online ends up posting a message
     * back to the main window like so:
     *
     *   <html>
     *     <head>
     *       <script type="text/javascript">
     *         function closePopup(){
     *           window.opener.postMessage({
     *               nonce:       "…",  // randomly generated by client, for CSRF prevention
     *               tokens:      "…",  // tokens used by client to authenticate with settings service and game servers
     *               provider:     …,   // number indicating which identity provider  }- these are for client
     *               loginname:   "…",  // account name or email                      }  display only
     *              }, "https://…"); // expected to match origin of window.opener e.g. https://airmash.online
     *           window.close();
     *         }
     *       </script>
     *     </head>
     *     <body onload="closePopup()"></body>
     *   </html>
     *
     * On the original airma.sh, the login window could call window.opener.loginSuccess()
     * directly as they had the same origin. But now we will want to use the same login
     * flow from multiple domains (airmash.online, starma.sh, test.airmash.online, ...),
     * therefore use Window.postMessage() and Window.addEventListener() for cross-origin
     * communication
     *
     */
    private loginPopup(provider: number) {
        window.addEventListener("message", (e) => this.receiveLoginMessage(e), { once: true });
        this.usedProvider = provider;
        this.loginToken = this.getRandomToken(32);
        const url = `${LOGIN_URL}/login?provider=${provider}&nonce=${this.loginToken}&origin=${window.origin}`;

        const width = provider === 4 ? 900 : 400;
        const height = provider === 5 ? 800 : 600;
        this.openLoginWindow(url, "Login", width, height);
    }

    private openLoginWindow(url: string, windowTitle: string, width: number, height: number) {
        const screenLeft = window.screenLeft ? window.screenLeft : window.screenX;
        const screenTop = window.screenTop ? window.screenTop : window.screenY;
        const left = (window.innerWidth ? window.innerWidth :
            document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width)
            / 2 - width / 2 + screenLeft;
        const top = (window.innerHeight ? window.innerHeight :
            document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height)
            / 2 - height / 2 + screenTop;

        window.open(url, windowTitle, "width=" + width + ", height=" + height + ", top=" + top + ", left=" + left);
    }

    private receiveLoginMessage(e: any) {
        if (e.origin !== LOGIN_URL) {
            this.context.logger.error("bad origin for login message: " + e.origin);
            return;
        }

        if (e.data.provider !== this.usedProvider) {
            this.context.logger.error("identity provider does not match: " + e.data.provider);
            return;
        }

        if (e.data.nonce !== this.loginToken) {
            this.context.logger.error("nonce does not match: " + e.data.nonce);
            return;
        }

        this.loginToken = null;
        this.usedProvider = null;

        this.loginSuccess({
            identityProvider: e.data.provider as number,
            loginName: e.data.loginname as string,
            tokens: e.data.tokens as { game: string, settings: string },
        } as AuthData);
    }

    private loginSuccess(data: AuthData) {
        this.context.logger.warn("auth succesful", data);
        this.context.auth = data;

        localStorage.setItem("auth-data", JSON.stringify(data));

        this.finish();
    }

}
